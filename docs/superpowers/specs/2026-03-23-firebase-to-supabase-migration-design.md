# Firebase to Supabase Migration Design

## Overview

Migrar completamente o projeto CHAVES Adventure de Firebase para Supabase, eliminando toda dependência do Firebase. Migração 1:1 — mesmas funcionalidades, sem mudanças de comportamento.

**Abordagem:** Migração por camada (Auth → Banco → Storage → Deploy), cada camada completamente migrada antes da próxima.

**Deploy:** Vercel (substituindo Firebase App Hosting).

**Dados:** Banco começa vazio. Imagens existentes serão migradas do Firebase Storage para o Supabase Storage.

---

## 1. Auth — Firebase Auth → Supabase Auth

### Mapeamento de APIs

| Firebase | Supabase |
|----------|----------|
| `signInWithEmailAndPassword` | `supabase.auth.signInWithPassword` |
| `createUserWithEmailAndPassword` | `supabase.auth.signUp` |
| `onAuthStateChanged` | `supabase.auth.onAuthStateChange` |
| `signOut` | `supabase.auth.signOut` |

### Admin

- A collection `roles_admin` é eliminada
- `is_admin` armazenado no `app_metadata` do usuário no Supabase (editável apenas via API server-side ou painel do Supabase)
- O hook `useIsAdmin()` passa a ler `user.app_metadata.is_admin`
- Variável `SUPABASE_SERVICE_ROLE_KEY` necessária no servidor para operações de admin provisioning (nunca exposta no client)

### Provider

- `FirebaseProvider` substituído por `SupabaseProvider`
- Inicializa o cliente Supabase e expõe `user`, `loading`, `isAdmin` via React Context
- Hooks `useAuth()`, `useUser()`, `useIsAdmin()` mantêm a mesma interface externa

### Login anônimo

- O arquivo `non-blocking-login.tsx` exporta `initiateAnonymousSignIn` — verificar se é usado. Se não for, remover. Se for, mapear para `supabase.auth.signInAnonymously()`

---

## 2. Banco de Dados — Firestore → PostgreSQL

### Schema

| Firestore Collection | Tabela Supabase | Notas |
|---|---|---|
| `adventures` | `adventures` | Campos diretos. `customFields` vira coluna `jsonb` |
| `registrations` | `registrations` | `participants` vira `jsonb`. `registration_date timestamptz DEFAULT now()` — cliente omite o campo no insert, o banco define automaticamente |
| `content` (homepage, pix) | `content` | Uma linha por tipo (ex: `id = 'homepage'`, `id = 'pix'`). Dados no campo `data jsonb` |
| `pages` | `pages` | Campos diretos. Índice em `(show_in_header, nav_order)` |
| `roles_admin` | Eliminada | Movido para `app_metadata` do Auth |

### Timestamps

- Firestore usa `serverTimestamp()` para definir `registrationDate` no servidor. No Supabase, usar `DEFAULT now()` na coluna — o cliente omite o campo e o banco preenche automaticamente
- Campos `Timestamp` do Firestore (que usam `.toDate()`) viram `timestamptz` no PostgreSQL e chegam como strings ISO. Substituir `.toDate()` por `new Date(isoString)`

### Transações

- O fluxo de pagamento usa `runTransaction` do Firestore para ler e atualizar atomicamente o `paymentStatus` de uma registration
- No Supabase, substituir por um `UPDATE ... WHERE` condicional: `supabase.from('registrations').update({ payment_status: 'awaiting_confirmation' }).eq('id', id).not('payment_status', 'in', '("confirmed","cancelled","refunded")')` — a cláusula WHERE garante atomicidade sem transação explícita

### Real-time

- `useCollection()` e `useDoc()` que hoje usam `onSnapshot` do Firestore serão substituídos por `supabase.channel().on('postgres_changes', ...)` para manter a mesma funcionalidade real-time

### Queries

Dois padrões distintos:

- **One-shot (leitura única):** `getDocs(query(...))` e `getDoc(docRef)` viram `supabase.from('table').select().eq(...)` — retorna dados uma vez
- **Real-time (assinatura):** `onSnapshot` vira `supabase.channel().on('postgres_changes', ...)` — recebe atualizações contínuas
- **Insert com retorno:** `addDoc` seguido de `getDoc` (para obter `registrationToken`) vira `supabase.from('registrations').insert(data).select()` — retorna os dados inseridos diretamente

### RLS (Row Level Security)

Substitui as Firestore Security Rules:

- `adventures`, `pages`, `content`: leitura pública (`SELECT` para todos), escrita só admin
- `registrations`:
  - `INSERT`: público (qualquer pessoa pode se registrar, sem exigir autenticação)
  - `SELECT`: admin pode ler todas; visitante pode ler a própria registration pelo `registration_token` (via query parameter ou RPC)
  - `UPDATE`: admin pode atualizar qualquer uma; visitante pode atualizar `payment_status` da própria registration (para o fluxo de pagamento), validado pelo `registration_token`
  - `DELETE`: só admin
- Admin verificado via `auth.jwt() -> 'app_metadata' ->> 'is_admin'`

---

## 3. Storage — Firebase Storage → Supabase Storage

### Estrutura

- Um único bucket `images` com pastas: `adventures/`, `homepage/`, `general/`
- Espelha a estrutura atual do Firebase Storage

### Migração de imagens existentes

- Download das imagens do Firebase Storage e re-upload para o Supabase Storage
- Atualização das URLs de imagem salvas no banco (`imageUrl` nas adventures, `heroImageUrl` no content homepage)

### Funcionalidades

| Funcionalidade | Implementação |
|---|---|
| Upload com progresso | `XMLHttpRequest` com `onprogress` (Supabase não tem tracking nativo como Firebase) |
| Deleção | `supabase.storage.from('images').remove([path])` |
| URL pública | `supabase.storage.from('images').getPublicUrl(path)` |

### Detecção de URL para deleção

- O `image-upload.tsx` hoje verifica `firebasestorage.googleapis.com` ou `firebasestorage.app` na URL para decidir se deleta do Storage. Atualizar para verificar o padrão de URL do Supabase Storage

### Políticas do bucket

- Leitura pública
- Upload/delete só admin (via RLS no storage, verificando `app_metadata.is_admin`)

---

## 4. Infraestrutura de Erros

### Migração do sistema de erros

- `FirestorePermissionError` → `SupabasePermissionError` (adaptar para o shape de `PostgrestError`)
- `errorEmitter` → manter o padrão de event emitter, adaptar os listeners para erros do Supabase
- `FirebaseErrorListener` → `SupabaseErrorListener` (mesma lógica, tipos diferentes)
- `non-blocking-updates.tsx` → adaptar wrappers fire-and-forget para usar o client do Supabase

---

## 5. Deploy e Configuração

### Firebase App Hosting → Vercel

- Remover `apphosting.yaml`
- Next.js 15 com App Router — Vercel suporta nativamente
- Variáveis de ambiente:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, para admin provisioning)

### Texto da página de login

- Atualizar instruções na página `/login` que hoje referenciam o Firebase Console para refletir o processo de admin no Supabase

### next.config.ts

- Remover remote patterns do Firebase Storage
- Manter/atualizar remote pattern do Supabase (já existe parcialmente: `yzsgoxrrhjiiulmnwrfo.supabase.co`)

### Genkit AI

- Permanece inalterado — é independente do Firebase e funciona com Vercel

### Limpeza final do Firebase

- Desinstalar pacote `firebase` do `package.json`
- Deletar `src/firebase/` (config, provider, hooks, errors, non-blocking-login, non-blocking-updates)
- Deletar `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- Deletar `firebase.json`
- Deletar `apphosting.yaml`
- Remover qualquer referência restante ao Firebase no código

---

## Resultado Final

- Zero dependências do Firebase
- Auth, banco, storage e deploy 100% no Supabase + Vercel
- Mesmas funcionalidades do app original
