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

### Provider

- `FirebaseProvider` substituído por `SupabaseProvider`
- Inicializa o cliente Supabase e expõe `user`, `loading`, `isAdmin` via React Context
- Hooks `useAuth()`, `useUser()`, `useIsAdmin()` mantêm a mesma interface externa

---

## 2. Banco de Dados — Firestore → PostgreSQL

### Schema

| Firestore Collection | Tabela Supabase | Notas |
|---|---|---|
| `adventures` | `adventures` | Campos diretos. `customFields` vira coluna `jsonb` |
| `registrations` | `registrations` | `participants` vira `jsonb`. `registrationDate` usa `timestamptz` nativo |
| `content` (homepage, pix) | `content` | Uma linha por tipo (ex: `id = 'homepage'`, `id = 'pix'`). Dados no campo `data jsonb` |
| `pages` | `pages` | Campos diretos. Índice em `(show_in_header, nav_order)` |
| `roles_admin` | Eliminada | Movido para `app_metadata` do Auth |

### Real-time

- `useCollection()` e `useDoc()` que hoje usam `onSnapshot` do Firestore serão substituídos por `supabase.channel().on('postgres_changes', ...)` para manter a mesma funcionalidade real-time

### RLS (Row Level Security)

Substitui as Firestore Security Rules:

- `adventures`, `pages`, `content`: leitura pública, escrita só admin
- `registrations`: criação pública, leitura/update só admin
- Admin verificado via `auth.jwt() -> 'app_metadata' ->> 'is_admin'`

### Queries

Queries com `where` (ex: buscar adventure por slug) viram queries do Supabase client: `.from('adventures').select().eq('slug', value)`

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

### Políticas do bucket

- Leitura pública
- Upload/delete só admin (via RLS no storage, verificando `app_metadata.is_admin`)

---

## 4. Deploy e Configuração

### Firebase App Hosting → Vercel

- Remover `apphosting.yaml`
- Next.js 15 com App Router — Vercel suporta nativamente
- Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Limpeza final do Firebase

- Desinstalar pacote `firebase` do `package.json`
- Deletar `src/firebase/` (config, provider, hooks)
- Deletar `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- Deletar `firebase.json` (se existir)
- Remover remote patterns do Firebase Storage no `next.config`
- Remover qualquer referência restante ao Firebase no código

---

## Resultado Final

- Zero dependências do Firebase
- Auth, banco, storage e deploy 100% no Supabase + Vercel
- Mesmas funcionalidades do app original
