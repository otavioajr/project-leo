# Dificuldade em Texto Livre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o admin descreva a dificuldade da aventura em texto livre e opcional, exibindo badge neutro no site apenas quando houver conteúdo.

**Architecture:** Migração Postgres torna `difficulty` nullable; o admin troca `Select`+enum por `Input` com Zod que normaliza vazio para `null`; tipos e UI pública passam a tratar `string | null` com renderização condicional e estilo neutro único.

**Tech Stack:** Next.js 15, TypeScript, Supabase Postgres, React Hook Form, Zod, Tailwind, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-06-03-adventure-difficulty-free-text-design.md`

---

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `supabase/migrations/010_adventure_difficulty_optional.sql` | Coluna nullable, sem default |
| `src/lib/types.ts` | Tipo `difficulty: string \| null` |
| `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` | Input, schema, default, payload |
| `src/components/adventure-card.tsx` | Badge condicional + clamp |
| `src/app/(main)/adventures/[slug]/page.tsx` | Remover variant map; bloco condicional |
| `docs/backend.json` | Schema documental |

---

## Task 1: Migração Supabase

**Files:**
- Create: `supabase/migrations/010_adventure_difficulty_optional.sql`

- [ ] **Step 1: Criar a migration**

```sql
-- Dificuldade opcional e texto livre (sem enum no banco)
ALTER TABLE adventures
  ALTER COLUMN difficulty DROP NOT NULL,
  ALTER COLUMN difficulty DROP DEFAULT;
```

- [ ] **Step 2: Aplicar localmente (se usar Supabase CLI)**

Run:

```bash
npx supabase db push
# ou: npx supabase migration up
```

Expected: migration `010_adventure_difficulty_optional` aplicada sem erro.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_adventure_difficulty_optional.sql
git commit -m "feat(db): tornar difficulty opcional e sem default fixo"
```

---

## Task 2: Tipos TypeScript

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Atualizar o tipo `Adventure`**

Em `src/lib/types.ts`, linha ~49, substituir:

```ts
difficulty: 'Fácil' | 'Moderado' | 'Desafiador';
```

por:

```ts
difficulty: string | null;
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`

Expected: erros apenas nos arquivos ainda não ajustados (admin + página detalhe) — corrigidos nas tasks seguintes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): difficulty como string opcional"
```

---

## Task 3: Formulário admin

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

- [ ] **Step 1: Atualizar schema Zod (~linha 169)**

Substituir:

```ts
difficulty: z.enum(["Fácil", "Moderado", "Desafiador"]),
```

por:

```ts
difficulty: z
  .string()
  .max(500, "A dificuldade deve ter no máximo 500 caracteres.")
  .transform((v) => {
    const t = v.trim();
    return t === "" ? null : t;
  }),
```

O tipo inferido de `difficulty` no form passa a ser `string | null` após transform no output — para defaultValues use `string` vazia; no submit `values.difficulty` já será `null` ou string.

- [ ] **Step 2: Atualizar defaultValues (~linha 260)**

Substituir:

```ts
difficulty: adventure?.difficulty || "Moderado",
```

por:

```ts
difficulty: adventure?.difficulty ?? "",
```

- [ ] **Step 3: Garantir payload (~linha 406)**

Manter:

```ts
difficulty: values.difficulty,
```

(Zod já envia `null` quando vazio.)

- [ ] **Step 4: Trocar UI Select por Input (~linhas 671-691)**

Substituir o `FormField` de `difficulty` inteiro por:

```tsx
<FormField
  control={form.control}
  name="difficulty"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Dificuldade</FormLabel>
      <FormControl>
        <Input
          placeholder="ex: Aberto para todos, Difícil com possibilidade para iniciantes"
          {...field}
          value={field.value ?? ""}
        />
      </FormControl>
      <FormDescription>Opcional. Deixe em branco para não exibir no site.</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

Remover apenas os `SelectItem` deste campo; não remover imports de `Select` se outros campos ainda usam.

- [ ] **Step 5: Verificar**

Run: `npm run typecheck && npm run lint`

Expected: PASS (ou corrigir imports não usados de Select apenas se o linter acusar e nenhum outro campo usar Select neste arquivo).

- [ ] **Step 6: Commit**

```bash
git add src/app/(admin)/admin/adventures/_components/adventure-form.tsx
git commit -m "feat(admin): dificuldade em texto livre e opcional"
```

---

## Task 4: Card público

**Files:**
- Modify: `src/components/adventure-card.tsx`

- [ ] **Step 1: Badge condicional com clamp**

Substituir o bloco do badge (~linhas 32-35):

```tsx
{adventure.difficulty?.trim() ? (
  <span className="absolute top-3 right-3 max-w-[85%] px-3 py-1 text-xs font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full line-clamp-1">
    {adventure.difficulty.trim()}
  </span>
) : null}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/adventure-card.tsx
git commit -m "feat(ui): exibir badge de dificuldade apenas quando preenchida"
```

---

## Task 5: Página de detalhe da aventura

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/page.tsx`

- [ ] **Step 1: Remover `difficultyVariant` (~linhas 145-149)**

Apagar o objeto:

```ts
const difficultyVariant = {
  'Fácil': 'default',
  'Moderado': 'secondary',
  'Desafiador': 'destructive',
} as const;
```

- [ ] **Step 2: Renderizar bloco de dificuldade só quando houver texto (~linhas 270-277)**

Substituir o `<div className="flex items-center gap-3">` que contém `BarChart` + `Badge` por:

```tsx
{adventure.difficulty?.trim() ? (
  <div className="flex items-center gap-3">
    <div className="bg-primary/10 rounded-full p-2">
      <BarChart className="h-5 w-5 text-primary" />
    </div>
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
      {adventure.difficulty.trim()}
    </span>
  </div>
) : null}
```

(Equivalente a badge neutro; evita dependência de variant por valor fixo.)

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm run lint`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/adventures/[slug]/page.tsx
git commit -m "feat(ui): dificuldade neutra e opcional na página da aventura"
```

---

## Task 6: Documentação `backend.json`

**Files:**
- Modify: `docs/backend.json`

- [ ] **Step 1: Atualizar propriedade `difficulty`**

Substituir:

```json
"difficulty": { "type": "string", "enum": ["Fácil", "Moderado", "Desafiador"] },
```

por:

```json
"difficulty": { "type": ["string", "null"], "description": "Texto livre opcional; null = não exibir no site" },
```

- [ ] **Step 2: Remover `difficulty` de `required`**

No array `required` da entidade `Adventure`, remover `"difficulty"`.

- [ ] **Step 3: Commit**

```bash
git add docs/backend.json
git commit -m "docs: alinhar schema de difficulty com texto livre opcional"
```

---

## Task 7: Verificação final

- [ ] **Step 1: Typecheck e lint**

```bash
npm run typecheck && npm run lint
```

Expected: exit code 0

- [ ] **Step 2: Testes manuais (dev server)**

```bash
npm run dev
```

| # | Ação | Resultado esperado |
|---|------|-------------------|
| 1 | Nova aventura, dificuldade vazia | Card e `/adventures/[slug]` sem badge/linha |
| 2 | Salvar com "Aberto para todos" | Badge neutro no card e detalhe |
| 3 | Aventura legada "Desafiador" | Texto visível, sem cor vermelha/destructive |
| 4 | Editar legada, limpar campo, salvar | Badge some |
| 5 | Admin: só espaços no campo | Erro Zod ou campo normalizado para vazio → null |

- [ ] **Step 3: Commit do spec/plan (opcional, se ainda não commitados)**

```bash
git add docs/superpowers/specs/2026-06-03-adventure-difficulty-free-text-design.md \
        docs/superpowers/plans/2026-06-03-adventure-difficulty-free-text.md
git commit -m "docs: spec e plano de dificuldade em texto livre"
```

---

## Spec coverage (self-review)

| Requisito spec | Task |
|----------------|------|
| Migração nullable | Task 1 |
| `types.ts` string \| null | Task 2 |
| Admin Input + Zod + opcional | Task 3 |
| Card condicional + clamp | Task 4 |
| Detalhe sem variant map | Task 5 |
| `backend.json` | Task 6 |
| typecheck/lint + testes manuais | Task 7 |

Sem placeholders. Projeto sem framework de testes — validação manual conforme spec.
