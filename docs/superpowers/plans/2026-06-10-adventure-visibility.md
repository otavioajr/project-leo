# Visibilidade de Aventura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toggle "Aventura habilitada" no admin que controla se a aventura aparece na homepage e se as páginas públicas de detalhe e pagamento ficam acessíveis.

**Architecture:** Nova coluna `is_enabled` em `adventures` (migration 015) com default `true`. A policy RLS `adventures_select` passa a retornar apenas aventuras habilitadas para visitantes (`is_enabled = true OR is_admin()`). O admin liga/desliga via `Switch` no `AdventureForm`. Páginas públicas de detalhe e pagamento exibem componente compartilhado `AdventureUnavailable` quando a query não retorna a aventura (bloqueio por RLS). A homepage não precisa de filtro no cliente.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, React Hook Form + Zod, shadcn/ui (`Switch`, `Card`, `Badge`), Supabase (PostgreSQL, RLS, migration SQL).

**Spec:** `docs/superpowers/specs/2026-06-10-adventure-visibility-design.md`

> **Sobre testes:** O projeto não tem framework de testes (CLAUDE.md). Validação via `npm run typecheck`, `npm run lint` e teste manual no dev server (`npm run dev`, porta 9002). Para SQL, usar Supabase MCP `apply_migration` no projeto `iyvtoeoeytueoeromdwi`.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/015_adventure_visibility.sql` | Criar | Coluna `is_enabled` + policy RLS |
| `src/lib/types.ts` | Modificar | Campo `is_enabled` no type `Adventure` |
| `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` | Modificar | Toggle no schema Zod, defaultValues, `adventureData` e JSX |
| `src/app/(admin)/admin/adventures/page.tsx` | Modificar | Badge "Ativa" / "Desabilitada" na listagem |
| `src/app/(main)/adventures/_components/adventure-unavailable.tsx` | Criar | Tela compartilhada "Aventura indisponível" |
| `src/app/(main)/adventures/[slug]/page.tsx` | Modificar | Substituir `notFound()` por `AdventureUnavailable` |
| `src/app/(main)/adventures/[slug]/pagamento/page.tsx` | Modificar | Checagem de visibilidade antes do fluxo de pagamento |

---

### Task 1: Migration, RLS e tipo `Adventure`

**Files:**
- Create: `supabase/migrations/015_adventure_visibility.sql`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- supabase/migrations/015_adventure_visibility.sql
-- Visibilidade pública da aventura: quando desabilitada, visitantes não
-- conseguem ler a linha (RLS). Admins continuam vendo todas.

ALTER TABLE adventures
  ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "adventures_select" ON adventures;
CREATE POLICY "adventures_select" ON adventures
  FOR SELECT
  USING (is_enabled = true OR is_admin());
```

- [ ] **Step 2: Aplicar a migração no Supabase**

Chamar MCP `apply_migration` com:
- `project_id`: `iyvtoeoeytueoeromdwi`
- `name`: `015_adventure_visibility`
- `query`: conteúdo SQL do Step 1

Esperado: sucesso sem erros. (Se o MCP não estiver disponível, avisar o usuário para aplicar o SQL no SQL Editor do projeto cloud.)

- [ ] **Step 3: Verificar coluna e policy**

Chamar MCP `execute_sql`:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'adventures' AND column_name = 'is_enabled';

SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
WHERE polrelid = 'adventures'::regclass AND polname = 'adventures_select';
```

Esperado: coluna `boolean` com default `true`; policy com expressão contendo `is_enabled` e `is_admin()`.

- [ ] **Step 4: Adicionar o campo ao type `Adventure`**

Em `src/lib/types.ts`, no type `Adventure`, adicionar `is_enabled` após `registrations_enabled`:

```ts
export type Adventure = {
  id: string;
  slug: string;
  title: string;
  description: string;
  long_description: string;
  max_participants: number | null;
  price: number;
  duration: string;
  location: string;
  difficulty: string | null;
  image_url: string;
  image_description: string;
  registrations_enabled: boolean;
  is_enabled: boolean;
  has_baterias: boolean;
  has_lotes: boolean;
  image_rights_enabled: boolean;
  custom_fields?: CustomField[];
  pix_config?: PixConfig | null;
  created_at: string;
};
```

- [ ] **Step 5: Rodar typecheck**

Run: `npm run typecheck`

Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/015_adventure_visibility.sql src/lib/types.ts
git commit -m "feat: migration is_enabled e RLS de visibilidade de aventura"
```

---

### Task 2: Toggle no formulário admin

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

- [ ] **Step 1: Adicionar ao schema Zod**

No `adventureFormSchema`, adicionar o campo após `imageDescription` e antes de `registrationsEnabled`:

```ts
isEnabled: z.boolean(),
registrationsEnabled: z.boolean(),
```

- [ ] **Step 2: Adicionar defaultValues**

No bloco `defaultValues` do `useForm`, adicionar:

```ts
isEnabled: adventure?.is_enabled ?? true,
```

(posicionar antes de `registrationsEnabled`)

- [ ] **Step 3: Persistir no adventureData**

No objeto `adventureData` dentro de `onSubmit`, adicionar:

```ts
is_enabled: values.isEnabled,
```

(junto com `registrations_enabled`)

- [ ] **Step 4: Adicionar o Switch no JSX**

Inserir um `FormField` **imediatamente antes** do bloco `registrationsEnabled` (~linha 944):

```tsx
<FormField
  control={form.control}
  name="isEnabled"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel>Aventura habilitada</FormLabel>
        <FormDescription>
          Quando desabilitada, a aventura não aparece no site e fica indisponível para visitantes.
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

- [ ] **Step 5: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`

Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/(admin)/admin/adventures/_components/adventure-form.tsx
git commit -m "feat: toggle aventura habilitada no formulário admin"
```

---

### Task 3: Badge na listagem admin

**Files:**
- Modify: `src/app/(admin)/admin/adventures/page.tsx`

- [ ] **Step 1: Atualizar cabeçalho da tabela**

Renomear coluna "Status" para "Inscrições" e adicionar coluna "Visibilidade":

```tsx
<TableHead>Título</TableHead>
<TableHead>Visibilidade</TableHead>
<TableHead>Inscrições</TableHead>
<TableHead>Preço</TableHead>
<TableHead>Localização</TableHead>
```

- [ ] **Step 2: Adicionar badge de visibilidade**

Na `TableRow` de cada aventura, adicionar célula **antes** do badge de inscrições:

```tsx
<TableCell>
  <Badge variant={adventure.is_enabled ? "default" : "secondary"}>
    {adventure.is_enabled ? "Ativa" : "Desabilitada"}
  </Badge>
</TableCell>
<TableCell>
  <Badge variant={adventure.registrations_enabled ? "default" : "outline"}>
    {adventure.registrations_enabled ? "Abertas" : "Fechadas"}
  </Badge>
</TableCell>
```

- [ ] **Step 3: Ajustar colspan do empty state**

Alterar `colSpan={5}` para `colSpan={6}` na linha "Nenhuma aventura encontrada."

- [ ] **Step 4: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/admin/adventures/page.tsx
git commit -m "feat: badge de visibilidade na listagem admin de aventuras"
```

---

### Task 4: Componente `AdventureUnavailable`

**Files:**
- Create: `src/app/(main)/adventures/_components/adventure-unavailable.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import Link from "next/link";
import { Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdventureUnavailable() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-primary">Aventura indisponível</CardTitle>
          <CardDescription className="text-center">
            Esta aventura não está disponível no momento. Confira outras atividades na nossa página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Mountain className="mx-auto mb-4 h-20 w-20 text-muted-foreground/40" />
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/">Voltar para Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`

Esperado: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/adventures/_components/adventure-unavailable.tsx
git commit -m "feat: componente AdventureUnavailable para aventuras desabilitadas"
```

---

### Task 5: Página de detalhe pública

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/page.tsx`

- [ ] **Step 1: Importar o componente**

Adicionar import:

```tsx
import { AdventureUnavailable } from "../_components/adventure-unavailable";
```

- [ ] **Step 2: Substituir `notFound()` por `AdventureUnavailable`**

Trocar o bloco (~linha 156-158):

```tsx
if (!adventure) {
  return notFound();
}
```

Por:

```tsx
if (!adventure) {
  return <AdventureUnavailable />;
}
```

- [ ] **Step 3: Remover import não usado**

Se `notFound` não for mais usado em nenhum lugar do arquivo, remover:

```tsx
import { notFound, useParams } from 'next/navigation';
```

→

```tsx
import { useParams } from 'next/navigation';
```

- [ ] **Step 4: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(main)/adventures/[slug]/page.tsx
git commit -m "feat: exibir Aventura indisponível na página de detalhe"
```

---

### Task 6: Página de pagamento pública

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/pagamento/page.tsx`

- [ ] **Step 1: Importar o componente**

```tsx
import { AdventureUnavailable } from "../../_components/adventure-unavailable";
```

- [ ] **Step 2: Adicionar estado de disponibilidade da aventura**

Após os estados existentes (~linha 52), adicionar:

```tsx
const [isAdventureAvailable, setIsAdventureAvailable] = useState<boolean | null>(null);
```

- [ ] **Step 3: Adicionar useEffect para checar visibilidade**

Substituir o `useEffect` que busca `pix_config` (~linhas 54-68) por um que primeiro verifica se a aventura existe para o público:

```tsx
useEffect(() => {
  if (!slug) {
    setIsAdventureAvailable(false);
    setIsLoadingPixConfig(false);
    return;
  }

  supabase
    .from('adventures')
    .select('id, pix_config')
    .eq('slug', slug)
    .maybeSingle()
    .then(({ data }) => {
      if (!data) {
        setIsAdventureAvailable(false);
        setPixConfig(null);
      } else {
        setIsAdventureAvailable(true);
        setPixConfig(normalizePixConfig(data.pix_config));
      }
      setIsLoadingPixConfig(false);
    });
}, [supabase, slug]);
```

- [ ] **Step 4: Bloquear renderização quando aventura indisponível**

No início do bloco de retornos condicionais (após `isLoading`), adicionar:

```tsx
if (isAdventureAvailable === false) {
  return <AdventureUnavailable />;
}
```

(posicionar depois do loading spinner e antes de `!registrationId || !registration`)

- [ ] **Step 5: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`

Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/(main)/adventures/[slug]/pagamento/page.tsx
git commit -m "feat: bloquear pagamento para aventuras desabilitadas"
```

---

### Task 7: Verificação manual end-to-end

**Files:** nenhum

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`

Esperado: servidor em `http://localhost:9002`.

- [ ] **Step 2: Testar aventura habilitada (padrão)**

1. Login admin → `/admin/adventures`
2. Criar ou editar uma aventura com toggle **habilitado**
3. Em aba anônima: homepage lista a aventura; `/adventures/[slug]` abre normalmente

- [ ] **Step 3: Testar aventura desabilitada**

1. Desabilitar o toggle e salvar
2. Admin: badge "Desabilitada" na listagem; aventura ainda editável
3. Aba anônima: aventura **não** aparece na homepage
4. `/adventures/[slug]` → "Aventura indisponível"
5. Link de pagamento pendente (`/adventures/[slug]/pagamento?registrationId=...&token=...`) → "Aventura indisponível"

- [ ] **Step 4: Testar reabilitação**

1. Reabilitar toggle e salvar
2. Aventura volta à homepage e páginas públicas funcionam

- [ ] **Step 5: Verificação final**

Run: `npm run typecheck && npm run lint && npm run build`

Esperado: todos PASS.

- [ ] **Step 6: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: ajustes finais na visibilidade de aventura"
```
