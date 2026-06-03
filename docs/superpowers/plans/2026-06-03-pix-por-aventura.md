# PIX por aventura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover a configuração de PIX de uma config global única para dentro de cada aventura (códigos copia-e-cola por tamanho de grupo, toggle de ativação e instruções), via coluna JSONB `pix_config`.

**Architecture:** Adiciona-se uma coluna `pix_config jsonb` em `adventures` guardando a mesma estrutura do tipo `PixConfig` já existente. O form de aventura ganha uma seção PIX (reusando um `PixSlotCard` extraído da antiga página global), salvando `pix_config` no mesmo `update`/`insert` da aventura. A tela de pagamento passa a ler a config da aventura por slug. A página global de configuração e seu item de menu são removidos. Migração "começar vazio": aventuras existentes ficam com PIX desligado.

**Tech Stack:** Next.js 15 (App Router) + TypeScript strict, Supabase (PostgreSQL + RLS), React Hook Form + Zod, shadcn/ui, `qrcode`.

> **Sobre testes:** O projeto **não tem framework de testes** (CLAUDE.md: "No test framework is configured. There are no tests."). Em vez do ciclo TDD com testes automatizados, cada tarefa é verificada com `npm run typecheck`, `npm run lint` e, onde indicado, checagem manual no app (`npm run dev`, porta 9002). Commits frequentes — um por tarefa.

> **Spec de referência:** `docs/superpowers/specs/2026-06-03-pix-por-aventura-design.md`

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/011_pix_per_adventure.sql` | Criar | Coluna `pix_config` + remoção da config global |
| `src/lib/types.ts` | Modificar | Campo `pix_config` no tipo `Adventure` |
| `src/app/(admin)/admin/adventures/_components/pix-slot-card.tsx` | Criar | Componente reutilizável (textarea + preview QR) |
| `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` | Modificar | Seção PIX no form (schema, defaultValues, JSX, onSubmit) |
| `src/app/(main)/adventures/[slug]/pagamento/page.tsx` | Modificar | Buscar `pix_config` da aventura por slug |
| `src/app/(main)/adventures/[slug]/page.tsx` | Modificar | `select` explícito que exclui `pix_config` |
| `src/app/(admin)/admin/layout.tsx` | Modificar | Remover item de menu + import `QrCode` |
| `src/app/(admin)/admin/configuracao-pix/` | Deletar | Página global de PIX (não mais usada) |

`src/lib/pix-config.ts` (`normalizePixConfig`) é **reusado sem alteração**.

---

### Task 1: Migration — coluna `pix_config` e remoção da config global

**Files:**
- Create: `supabase/migrations/011_pix_per_adventure.sql`

- [ ] **Step 1: Confirmar o próximo número de migration**

Run: `ls -1 supabase/migrations/`
Expected: o último arquivo é `010_adventure_difficulty_optional.sql`. Portanto o próximo livre é `011`. (Se houver um `011_*` já presente, usar o próximo número livre e ajustar o nome do arquivo.)

- [ ] **Step 2: Criar a migration**

Create `supabase/migrations/011_pix_per_adventure.sql`:

```sql
-- 011_pix_per_adventure.sql
-- PIX deixa de ser global e passa a pertencer a cada aventura.
-- Estrutura do JSONB espelha o tipo PixConfig:
--   { pixEnabled: bool, pixCopiaECola: { "1","2","3","4": text }, instructions: text }

-- 1) Coluna que guarda a config de PIX de cada aventura.
ALTER TABLE adventures
  ADD COLUMN IF NOT EXISTS pix_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Remove a config global de PIX (decisão de produto: começar vazio).
--    Aventuras existentes ficam com pix_config = '{}' -> PIX desligado.
DELETE FROM content WHERE id = 'pix';
```

Notas:
- **RLS:** nenhuma policy nova. `adventures_select` já é `USING (true)` (leitura pública usada pela tela de pagamento); `adventures_insert`/`adventures_update` já exigem `is_admin()`.
- A coluna é apenas dados; nenhum RPC novo é necessário.

- [ ] **Step 3: Aplicar a migration no banco de desenvolvimento**

Aplique a migration conforme o fluxo do projeto (Supabase CLI `supabase db push`, ou colar o SQL no SQL Editor do dashboard do projeto de desenvolvimento).
Expected: coluna `pix_config` existe em `adventures` e a linha `content` com `id = 'pix'` não existe mais.

Verificação opcional via SQL:
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'adventures' and column_name = 'pix_config';
-- esperado: pix_config | jsonb | '{}'::jsonb

select count(*) from content where id = 'pix';
-- esperado: 0
```

> **Lembrete:** esta migration também precisará ser aplicada no banco de **produção** no deploy. Não esquecer.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_pix_per_adventure.sql
git commit -m "feat(pix): add pix_config column to adventures and drop global pix config"
```

---

### Task 2: Tipo `Adventure` ganha `pix_config`

**Files:**
- Modify: `src/lib/types.ts` (tipo `Adventure`, ~linhas 35-53)

- [ ] **Step 1: Adicionar o campo ao tipo `Adventure`**

Em `src/lib/types.ts`, no tipo `Adventure`, adicionar `pix_config` logo antes de `created_at`. O tipo `PixConfig` já está definido neste mesmo arquivo (mais abaixo) e pode ser referenciado.

Trocar:
```ts
  has_baterias: boolean;
  custom_fields?: CustomField[];
  created_at: string;
};
```
Por:
```ts
  has_baterias: boolean;
  custom_fields?: CustomField[];
  pix_config?: PixConfig | null;
  created_at: string;
};
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS (sem erros). `PixConfig` é resolvido mesmo estando declarado mais abaixo no arquivo (type aliases não dependem de ordem).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(pix): add pix_config to Adventure type"
```

---

### Task 3: Componente reutilizável `PixSlotCard`

Extrai o card de slot PIX (textarea do código + preview de QR Code) para um componente próprio, que será usado pela seção PIX do form de aventura. A implementação espelha a que hoje vive embutida em `configuracao-pix/_components/pix-config-form.tsx` (essa pasta será removida na Task 7).

**Files:**
- Create: `src/app/(admin)/admin/adventures/_components/pix-slot-card.tsx`

- [ ] **Step 1: Criar o componente**

Create `src/app/(admin)/admin/adventures/_components/pix-slot-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PixGroupSize } from "@/lib/types";

export function pixGroupSizeLabel(size: PixGroupSize) {
  return size === 1 ? "PIX para 1 pessoa" : `PIX para ${size} pessoas`;
}

export function PixSlotCard({
  size,
  value,
  onChange,
}: {
  size: PixGroupSize;
  value: string;
  onChange: (next: string) => void;
}) {
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value && value.trim()) {
      QRCode.toDataURL(value, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
        .then((url) => setQrPreview(url))
        .catch(() => setQrPreview(null));
    } else {
      setQrPreview(null);
    }
  }, [value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{pixGroupSizeLabel(size)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Textarea
          placeholder={`Cole aqui o código PIX copia e cola para ${size} ${
            size === 1 ? "pessoa" : "pessoas"
          }...`}
          className="min-h-[120px] font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex items-center justify-center">
          {qrPreview ? (
            <Image
              src={qrPreview}
              alt={`QR Code PIX ${size}`}
              width={160}
              height={160}
              className="rounded-lg border"
            />
          ) : (
            <div className="flex h-[160px] w-[160px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              Sem chave cadastrada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. O componente é novo e ainda não importado por ninguém — não deve quebrar nada.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(admin)/admin/adventures/_components/pix-slot-card.tsx"
git commit -m "feat(pix): add reusable PixSlotCard component"
```

---

### Task 4: Seção "Pagamento PIX" no form de aventura

Adiciona os campos PIX ao schema/defaultValues, a seção visual e a persistência no `onSubmit`.

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

- [ ] **Step 1: Adicionar imports**

No topo do arquivo:

1. No import de `react-hook-form` (linha 4), adicionar `Controller`:
```ts
import { useForm, useFieldArray, Controller, type FieldErrors } from "react-hook-form";
```

2. Adicionar dois novos imports logo após o import de `@/supabase/hooks` (linha 10):
```ts
import { normalizePixConfig } from "@/lib/pix-config";
import { PixSlotCard } from "./pix-slot-card";
```

(Não é preciso importar `PixGroupSize` aqui: no JSX abaixo, `size` já é inferido como `1 | 2 | 3 | 4` pelo `as const`, que é exatamente o tipo `PixGroupSize` esperado por `PixSlotCard`.)

- [ ] **Step 2: Adicionar campos PIX ao schema Zod**

O `adventureSchema` atual (linhas ~107-137) é um `z.object({...})` sem refine. Adicionar os 3 campos PIX e envolver com `.refine(...)`.

Trocar:
```ts
  hasBaterias: z.boolean(),
  baterias: z.array(bateriaSchema).optional(),
  customFields: z.array(customFieldSchema).optional(),
});

type AdventureFormValues = z.infer<typeof adventureSchema>;
```
Por:
```ts
  hasBaterias: z.boolean(),
  baterias: z.array(bateriaSchema).optional(),
  customFields: z.array(customFieldSchema).optional(),
  pixEnabled: z.boolean(),
  pixCopiaECola: z.object({
    1: z.string().default(""),
    2: z.string().default(""),
    3: z.string().default(""),
    4: z.string().default(""),
  }),
  pixInstructions: z.string().optional(),
})
  .refine(
    (v) =>
      !v.pixEnabled ||
      Object.values(v.pixCopiaECola).some((s) => s.trim().length > 0),
    {
      message: "Cadastre ao menos uma chave PIX para ativar o pagamento.",
      path: ["pixEnabled"],
    }
  );

type AdventureFormValues = z.infer<typeof adventureSchema>;
```

(Note: o `});` original do `z.object` passa a ser `})` seguido do `.refine(...)`.)

- [ ] **Step 3: Adicionar defaultValues do PIX (mapeamento de ENTRADA)**

Logo antes de `const form = useForm<AdventureFormValues>({` (linha ~261), calcular a config normalizada:
```ts
  const pixDefaults = normalizePixConfig(adventure?.pix_config);
```

Depois, dentro de `defaultValues`, adicionar três campos logo após a linha `customFields: (adventure?.custom_fields ?? []).map(...)` (antes do `},` que fecha o objeto defaultValues, linha ~288). Mapear `instructions` (JSONB) → `pixInstructions` (form):
```ts
      pixEnabled: pixDefaults.pixEnabled,
      pixCopiaECola: pixDefaults.pixCopiaECola,
      pixInstructions: pixDefaults.instructions ?? "",
```

`normalizePixConfig` cobre `null`/`undefined`/`{}`, retornando os 4 slots vazios e `pixEnabled = false` — não há caso vazio a tratar à parte.

- [ ] **Step 4: Adicionar `pix_config` ao payload do `onSubmit` (mapeamento de SAÍDA)**

No objeto `adventureData` (linhas ~397-413), adicionar `pix_config` logo após `custom_fields: normalizedCustomFields,`. Mapear `pixInstructions` (form) → `instructions` (JSONB):
```ts
      custom_fields: normalizedCustomFields,
      pix_config: {
        pixEnabled: values.pixEnabled,
        pixCopiaECola: values.pixCopiaECola,
        instructions: values.pixInstructions ?? "",
      },
```

`pix_config` entra no `adventureData`, que é persistido pelo `update`/`insert` direto em `adventures` (linhas ~417-431) **antes** da chamada ao RPC `save_adventure_baterias`. O RPC permanece **inalterado** e não toca em `pix_config`.

- [ ] **Step 5: Adicionar a seção visual "Pagamento PIX"**

No JSX, inserir o bloco abaixo **imediatamente antes** de `<div className="flex justify-between items-center mt-8">` (o bloco final com os botões Excluir/Salvar, linha ~1084):

```tsx
        <div className="space-y-4 rounded-md border p-4 bg-muted/20">
          <div>
            <h4 className="text-sm font-semibold">Pagamento PIX</h4>
            <p className="text-sm text-muted-foreground">
              Configure os códigos PIX copia e cola desta aventura, um para cada
              tamanho de grupo (1 a 4 pessoas).
            </p>
          </div>

          <FormField
            control={form.control}
            name="pixEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Ativar Pagamento PIX</FormLabel>
                  <FormDescription>
                    Quando ativado, os clientes serão direcionados para a página
                    de pagamento após a inscrição.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            {([1, 2, 3, 4] as const).map((size) => (
              <Controller
                key={size}
                control={form.control}
                name={`pixCopiaECola.${size}` as const}
                render={({ field }) => (
                  <PixSlotCard
                    size={size}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            ))}
          </div>

          <FormField
            control={form.control}
            name="pixInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instruções Adicionais (Opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Após realizar o pagamento, aguarde a confirmação por e-mail..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Texto adicional exibido na página de pagamento desta aventura.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

```

(`Switch`, `Textarea`, `FormField`, `FormItem`, `FormControl`, `FormLabel`, `FormDescription`, `FormMessage` já estão importados no arquivo. O padrão `name={...as const}` segue o já usado no form para `customFields.${index}...`.)

- [ ] **Step 6: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Verificação manual**

Run: `npm run dev` (porta 9002). Abrir `http://localhost:9002/admin/adventures/new` (ou editar uma aventura existente).
Verificar:
- A seção "Pagamento PIX" aparece com o toggle, 4 cards (cada um gera preview de QR ao colar um código) e o campo de instruções.
- Ligar o toggle sem nenhum código e tentar salvar → mensagem "Cadastre ao menos uma chave PIX para ativar o pagamento." no toggle.
- Preencher ao menos 1 código, salvar → aventura salva sem erro.
- Reabrir a aventura para edição → os códigos e as instruções voltam preenchidos (mapeamento de entrada OK).

- [ ] **Step 8: Commit**

```bash
git add "src/app/(admin)/admin/adventures/_components/adventure-form.tsx"
git commit -m "feat(pix): add per-adventure PIX section to adventure form"
```

---

### Task 5: Tela de pagamento lê a config da aventura

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/pagamento/page.tsx` (useEffect de fetch da config, ~linhas 53-63)

- [ ] **Step 1: Trocar a busca da config global pela busca por aventura**

Trocar:
```tsx
  useEffect(() => {
    supabase
      .from('content')
      .select('data')
      .eq('id', 'pix')
      .single()
      .then(({ data }) => {
        setPixConfig(normalizePixConfig(data?.data));
        setIsLoadingPixConfig(false);
      });
  }, [supabase]);
```
Por:
```tsx
  useEffect(() => {
    if (!slug) {
      setIsLoadingPixConfig(false);
      return;
    }
    supabase
      .from('adventures')
      .select('pix_config')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        setPixConfig(normalizePixConfig(data?.pix_config));
        setIsLoadingPixConfig(false);
      });
  }, [supabase, slug]);
```

O `slug` já está disponível (`const slug = params.slug as string;`, linha 21). O `import QRCode from "qrcode"` (linha 12) e toda a lógica de seleção por `group_size`, geração do QR, copia-e-cola, instruções e telas de erro permanecem **inalterados** — só a query muda.

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Se o TypeScript reclamar do acesso a `data?.pix_config`, usar `normalizePixConfig((data as { pix_config?: unknown } | null)?.pix_config)`.

- [ ] **Step 3: Verificação manual**

Com `npm run dev`: criar uma aventura com PIX ativado e ao menos o código de 1 pessoa; inscrever-se nela como visitante; na tela de pagamento, confirmar QR Code, valor e copia-e-cola corretos. Repetir com PIX desligado → deve cair na tela "Inscrição Realizada, entraremos em contato". Inscrever um grupo cujo tamanho não tem código → tela "PIX Indisponível".

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/adventures/[slug]/pagamento/page.tsx"
git commit -m "feat(pix): payment page reads pix_config from the adventure by slug"
```

---

### Task 6: Não expor `pix_config` na página pública da aventura

A página pública da aventura usa `.select()` sem colunas e passaria a trazer `pix_config` para o público. Restringir às colunas necessárias.

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/page.tsx` (~linhas 41-45)

- [ ] **Step 1: Trocar `.select()` por lista explícita de colunas (sem `pix_config`)**

Trocar:
```tsx
      const { data, error: fetchError } = await supabase
        .from('adventures')
        .select()
        .eq('slug', slug)
        .maybeSingle();
```
Por:
```tsx
      const { data, error: fetchError } = await supabase
        .from('adventures')
        .select(
          'id, slug, title, description, long_description, max_participants, price, duration, location, difficulty, image_url, image_description, registrations_enabled, has_baterias, custom_fields, created_at'
        )
        .eq('slug', slug)
        .maybeSingle();
```

`data as Adventure` (linha ~60) continua válido — `pix_config` é opcional no tipo e não é usado nesta página.

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Verificação manual**

Com `npm run dev`, abrir a página pública de uma aventura (`/adventures/<slug>`) e confirmar que carrega normalmente (título, descrição, inscrição, baterias quando houver).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/adventures/[slug]/page.tsx"
git commit -m "refactor(pix): exclude pix_config from public adventure page query"
```

---

### Task 7: Remover a página global de configuração de PIX

**Files:**
- Delete: `src/app/(admin)/admin/configuracao-pix/` (pasta inteira: `page.tsx` + `_components/pix-config-form.tsx`)
- Modify: `src/app/(admin)/admin/layout.tsx` (import linha 18 + navItem linha 29)

- [ ] **Step 1: Remover o item de menu e o ícone órfão em `layout.tsx`**

Trocar (linha 18):
```ts
import { Mountain, LayoutDashboard, Compass, ListChecks, Home, FileText, LoaderCircle, LogOut, QrCode } from "lucide-react";
```
Por:
```ts
import { Mountain, LayoutDashboard, Compass, ListChecks, Home, FileText, LoaderCircle, LogOut } from "lucide-react";
```

Remover a linha do navItem (linha 29) inteira:
```ts
  { href: "/admin/configuracao-pix", label: "Configuração PIX", icon: QrCode },
```
O array `navItems` fica com os 5 itens restantes (Painel, Aventuras, Inscrições, Página Principal, Páginas).

- [ ] **Step 2: Deletar a pasta da página global**

Run:
```bash
rm -rf "src/app/(admin)/admin/configuracao-pix"
```

- [ ] **Step 3: Garantir que não restou nenhuma referência órfã**

Run:
```bash
grep -rn "configuracao-pix\|PixConfigForm" src/ || echo "limpo"
```
Expected: `limpo` (nenhuma referência restante). Se aparecer algo, remover a referência antes de prosseguir.

- [ ] **Step 4: Verificar tipos, lint e build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS nos três. O `build` confirma que nenhuma rota/import quebrou com a remoção.

- [ ] **Step 5: Verificação manual**

Com `npm run dev`, abrir o admin: a sidebar não mostra mais "Configuração PIX", e acessar `/admin/configuracao-pix` diretamente retorna 404.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/admin/layout.tsx" "src/app/(admin)/admin/configuracao-pix"
git commit -m "feat(pix): remove global PIX config page and menu item"
```

---

## Verificação final (após todas as tarefas)

- [ ] `npm run typecheck` → PASS
- [ ] `npm run lint` → PASS
- [ ] `npm run build` → PASS
- [ ] Fluxo ponta a ponta manual:
  - Aventura A: PIX ativado, 4 códigos preenchidos → inscrição de 1, 2, 3 e 4 pessoas mostra o código/QR correto de cada slot.
  - Aventura B: PIX desligado → inscrição cai em "Inscrição Realizada".
  - Editar uma aventura: códigos e instruções persistem corretamente.
  - Sidebar do admin sem "Configuração PIX"; `/admin/configuracao-pix` retorna 404.
- [ ] Migration `011` aplicada nos bancos de dev e (no deploy) de produção.

## Notas de cobertura do spec

- Seção 1 (migration) → Task 1. Seção 2 (tipo) → Task 2. Seção 3 (normalize reusado) → usado nas Tasks 4 e 5. Seção 4 (PixSlotCard) → Task 3. Seção 5 (form) → Task 4. Seção 6 (remover global) → Task 7. Seção 7 (tela de pagamento) → Task 5. Seção 8 (não expor pix_config) → Task 6.
- Edge cases do spec (pix vazio / desligado / grupo sem código / aventuras antigas) são cobertos pela UI já existente da tela de pagamento, validados no Step de verificação manual das Tasks 4 e 5.
