# Dificuldade da aventura em texto livre

## Visão geral

Substituir o seletor fixo de dificuldade (`Fácil`, `Moderado`, `Desafiador`) no admin por um campo de texto livre e opcional. O cliente deve poder descrever a dificuldade em linguagem natural (ex.: “Aberto para todos”, “Difícil mas com possibilidade para iniciantes”). No site público, a dificuldade só aparece quando houver texto; o badge usa sempre estilo neutro.

Decisões aprovadas na brainstorm:

- Exibição pública: badge neutro uniforme (sem cores por valor legado)
- Campo opcional: vazio → não exibir badge nem linha de dificuldade
- Sem limite rígido de negócio; teto técnico de 500 caracteres no admin
- Abordagem: `Input` simples no admin (opção 1), sem datalist nem segundo campo

---

## Problema atual

| Camada | Situação |
|--------|----------|
| Banco | `difficulty text NOT NULL DEFAULT 'Fácil'` |
| Admin | `Select` + Zod `enum(["Fácil", "Moderado", "Desafiador"])` |
| Tipos | `difficulty: 'Fácil' \| 'Moderado' \| 'Desafiador'` |
| Público (card) | Texto no badge neutro |
| Público (detalhe) | `Badge` com variant por valor fixo (`default` / `secondary` / `destructive`) |

O enum no app impede descrições customizadas. O default “Fácil” força valor mesmo quando o admin não quer destacar dificuldade.

---

## Requisitos funcionais

### Admin (`/admin/adventures`)

- Campo **Dificuldade**: `Input` de texto livre
- Placeholder sugerido: `ex: Aberto para todos, Difícil com possibilidade para iniciantes`
- Valor inicial no formulário: string vazia (criação e edição sem valor legado)
- Opcional: pode salvar sem preencher
- Se preenchido: após `trim`, deve ter pelo menos 1 caractere (rejeitar só espaços)
- Teto técnico: máximo 500 caracteres (proteção contra payloads absurdos, não regra de negócio de copy)

### Banco

- Coluna `adventures.difficulty`: nullable, default `NULL`
- Registros existentes com `Fácil`, `Moderado` ou `Desafiador` permanecem inalterados na migração
- Novo vazio no app persiste como `NULL` (tratar `''` como ausente na leitura/escrita se necessário)

### Site público

- **Card** (`adventure-card.tsx`): renderizar badge no canto superior direito somente se `difficulty?.trim()`; estilo neutro atual; `line-clamp-1` (ou equivalente) para não estourar layout em textos longos
- **Detalhe** (`adventures/[slug]/page.tsx`): remover mapa `difficultyVariant`; mesma condição de exibição; badge neutro consistente com o card
- Sem seção ou label “Dificuldade” quando ausente

### Tipos e documentação

- `src/lib/types.ts`: `difficulty: string | null`
- `docs/backend.json`: remover `enum` de `difficulty`; documentar `string | null` opcional

---

## Abordagem escolhida

Texto livre com `Input` no admin, validação leve no Zod, migração para nullable, exibição condicional no público.

### Alternativas consideradas

| Opção | Motivo de rejeição |
|-------|-------------------|
| Datalist com sugestões dos 3 valores | Não solicitado; complexidade extra |
| Dois campos (nível + descrição) | Contradiz campo aberto; YAGNI |
| Textarea obrigatório | Campo opcional aprovado |

---

## Modelo de dados

```sql
-- Nova migração (ex.: 00N_adventure_difficulty_optional.sql)
ALTER TABLE adventures
  ALTER COLUMN difficulty DROP NOT NULL,
  ALTER COLUMN difficulty DROP DEFAULT;

-- Opcional: normalizar strings só-espaço existentes (improvável hoje)
-- UPDATE adventures SET difficulty = NULL WHERE trim(difficulty) = '';
```

Sem alteração de RLS. Sem índice em `difficulty` (não há filtro no site).

---

## Alterações por arquivo

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/00N_*.sql` | `difficulty` nullable, sem default |
| `src/lib/types.ts` | `string \| null` |
| `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` | `Input` + schema Zod; default `''`; persistir `null` se vazio |
| `src/components/adventure-card.tsx` | Badge condicional + `line-clamp-1` |
| `src/app/(main)/adventures/[slug]/page.tsx` | Remover `difficultyVariant`; badge condicional neutro |
| `docs/backend.json` | Schema de `difficulty` atualizado |

---

## Validação (Zod, admin)

```ts
difficulty: z
  .string()
  .max(500)
  .optional()
  .transform((v) => {
    const t = (v ?? '').trim();
    return t === '' ? null : t;
  })
```

Ou equivalente que produza `null` no submit quando vazio.

---

## Compatibilidade

- Aventuras com `Fácil` / `Moderado` / `Desafiador` continuam exibindo o texto no badge neutro
- Admin pode limpar o campo e salvar → `NULL` → deixa de aparecer no site
- Não há migração em massa dos valores antigos para textos novos

---

## Fora do escopo

- Filtro ou ordenação por dificuldade
- Cores ou variantes automáticas por palavra-chave
- Sugestões/datalist no admin
- Limite de caracteres visível ao usuário (além do teto 500 no servidor/form)
- i18n dos placeholders (site já é pt-BR)

---

## Testes manuais sugeridos

1. Criar aventura sem dificuldade → card e detalhe sem badge
2. Criar com “Aberto para todos” → badge neutro nos dois lugares
3. Editar aventura legada “Desafiador” → texto permanece; badge neutro (sem vermelho)
4. Limpar dificuldade em aventura legada → salvar → badge some
5. Tentar salvar só espaços → erro de validação
6. Texto longo (~200 chars) → card com clamp; detalhe legível

---

## Verificação pós-implementação

- `npm run typecheck`
- `npm run lint`
- Aplicar migração no Supabase (local/prod conforme fluxo do projeto)
