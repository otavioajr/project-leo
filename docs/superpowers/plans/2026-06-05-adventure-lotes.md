# Lotes (precificação escalonada) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o admin venda uma aventura em lotes sequenciais (vagas + preço + PIX por lote), com transição automática para o próximo lote ao esgotar o atual, inscrição de 1 pessoa e PIX/preço congelados na inscrição.

**Architecture:** Nova tabela `adventure_lotes` ligada à `adventures` por FK; flag `adventures.has_lotes` (mutuamente exclusiva com `has_baterias` via constraint CHECK); coluna `registrations.lote_id` congela o lote no cadastro. Quatro RPCs novos (`get_adventure_lotes_with_availability`, `get_active_lote`, `save_adventure_lotes`, extensão de `create_registration_with_capacity`) garantem atomicidade e validação server-side.

**Tech Stack:** Next.js 15 (App Router, TS strict), Supabase (PostgreSQL + RLS), Tailwind/shadcn, React Hook Form + Zod, `qrcode`.

**Spec:** `docs/superpowers/specs/2026-06-05-adventure-lotes-design.md`

> **Sobre testes:** O projeto não tem framework de testes (CLAUDE.md). Validação via `npm run typecheck`, `npm run lint` e teste manual no dev server (`npm run dev`, porta 9002). Para SQL, usar Supabase MCP `apply_migration` no projeto `iyvtoeoeytueoeromdwi`.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/012_adventure_lotes_schema.sql` | Criar | Schema: `has_lotes`, `adventure_lotes`, `registrations.lote_id`, RLS |
| `supabase/migrations/013_adventure_lotes_rpcs.sql` | Criar | RPCs de leitura, save admin e extensão do RPC de inscrição |
| `src/lib/types.ts` | Modificar | Tipos `Lote`, `LoteAvailability`, `ActiveLote`; campos em `Adventure` e `Registration` |
| `src/app/(admin)/admin/adventures/_components/lote-pix-field.tsx` | Criar | Textarea + preview QR para PIX de um lote |
| `src/app/(admin)/admin/adventures/_components/pix-config-dialog.tsx` | Modificar | Modo lote: só toggle + instruções (sem 4 slots) |
| `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` | Modificar | Toggle lotes, tabela, validação, save via RPC |
| `src/app/(main)/adventures/[slug]/page.tsx` | Modificar | Buscar lote ativo, exibir preço/badge, passar props ao form |
| `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` | Modificar | Modo 1 pessoa, erros de lote, realtime de vagas |
| `src/app/(main)/adventures/[slug]/pagamento/page.tsx` | Modificar | PIX via `lote_id` congelado na inscrição |
| `src/components/adventure-card.tsx` | Modificar | Aceitar `displayPrice` opcional e estado esgotado |
| `src/app/(main)/page.tsx` | Modificar | Enriquecer cards com preço do lote ativo |
| `src/app/(admin)/admin/adventures/page.tsx` | Modificar | Exibir preço do lote ativo na listagem admin |

---

## Task 1: Migração de schema (`012_adventure_lotes_schema.sql`)

**Files:**
- Create: `supabase/migrations/012_adventure_lotes_schema.sql`

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- supabase/migrations/012_adventure_lotes_schema.sql

ALTER TABLE adventures
  ADD COLUMN has_lotes boolean NOT NULL DEFAULT false;

ALTER TABLE adventures
  ADD CONSTRAINT adventure_mode_exclusive
  CHECK (NOT (has_lotes AND has_baterias));

CREATE TABLE adventure_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id uuid NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  capacity integer NOT NULL CHECK (capacity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  pix_copia_cola text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX adventure_lotes_adventure_idx
  ON adventure_lotes(adventure_id, sort_order);

ALTER TABLE registrations
  ADD COLUMN lote_id uuid REFERENCES adventure_lotes(id) ON DELETE RESTRICT;

ALTER TABLE adventure_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adventure_lotes_select_public"
  ON adventure_lotes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "adventure_lotes_admin_write"
  ON adventure_lotes FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

- [ ] **Step 2: Aplicar migração no projeto remoto**

Chamar MCP `apply_migration` com:
- `project_id`: `iyvtoeoeytueoeromdwi`
- `name`: `012_adventure_lotes_schema`
- `query`: conteúdo SQL do Step 1

Esperado: sucesso sem erros.

- [ ] **Step 3: Verificar schema**

Chamar `list_tables` com `verbose: true`.

Esperado:
- `adventures.has_lotes` (boolean, default false, NOT NULL)
- `adventure_lotes` com FK, RLS enabled
- `registrations.lote_id` (uuid, nullable, FK RESTRICT)
- Constraint `adventure_mode_exclusive` presente

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/012_adventure_lotes_schema.sql
git commit -m "feat(lotes): add schema for adventure_lotes and registrations.lote_id

Adiciona flag has_lotes, tabela adventure_lotes, constraint de exclusividade
com baterias e coluna lote_id em registrations."
```

---

## Task 2: Migração de RPCs (`013_adventure_lotes_rpcs.sql`)

**Files:**
- Create: `supabase/migrations/013_adventure_lotes_rpcs.sql`

- [ ] **Step 1: Criar RPC `get_adventure_lotes_with_availability`**

```sql
-- supabase/migrations/013_adventure_lotes_rpcs.sql

CREATE OR REPLACE FUNCTION get_adventure_lotes_with_availability(
  p_adventure_id uuid
)
RETURNS TABLE (
  id uuid,
  label text,
  sort_order integer,
  capacity integer,
  price numeric,
  reserved integer
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH lote_counts AS (
    SELECT r.lote_id, COUNT(*)::integer AS reserved
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND r.lote_id IS NOT NULL
      AND is_registration_capacity_active(r.payment_status)
    GROUP BY r.lote_id
  )
  SELECT
    l.id,
    l.label,
    l.sort_order,
    l.capacity,
    l.price,
    COALESCE(lc.reserved, 0) AS reserved
  FROM adventure_lotes l
  LEFT JOIN lote_counts lc ON lc.lote_id = l.id
  WHERE l.adventure_id = p_adventure_id
  ORDER BY l.sort_order, l.created_at;
$$;

REVOKE EXECUTE ON FUNCTION get_adventure_lotes_with_availability(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_adventure_lotes_with_availability(uuid) TO anon, authenticated;
```

- [ ] **Step 2: Adicionar RPC `get_active_lote`**

```sql
CREATE OR REPLACE FUNCTION get_active_lote(p_adventure_id uuid)
RETURNS TABLE (
  id uuid,
  label text,
  sort_order integer,
  capacity integer,
  price numeric,
  reserved integer,
  remaining integer
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH lote_counts AS (
    SELECT r.lote_id, COUNT(*)::integer AS reserved
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND r.lote_id IS NOT NULL
      AND is_registration_capacity_active(r.payment_status)
    GROUP BY r.lote_id
  )
  SELECT
    l.id,
    l.label,
    l.sort_order,
    l.capacity,
    l.price,
    COALESCE(lc.reserved, 0) AS reserved,
    (l.capacity - COALESCE(lc.reserved, 0)) AS remaining
  FROM adventure_lotes l
  LEFT JOIN lote_counts lc ON lc.lote_id = l.id
  WHERE l.adventure_id = p_adventure_id
    AND COALESCE(lc.reserved, 0) < l.capacity
  ORDER BY l.sort_order, l.created_at
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION get_active_lote(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_active_lote(uuid) TO anon, authenticated;
```

- [ ] **Step 3: Adicionar RPC `save_adventure_lotes`**

```sql
CREATE OR REPLACE FUNCTION save_adventure_lotes(
  p_adventure_id uuid,
  p_has_lotes boolean,
  p_lotes jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_has_lotes boolean;
  v_has_baterias boolean;
  v_active_count integer;
  v_active_with_lote integer;
  v_kept_ids uuid[];
  v_lote jsonb;
  v_lote_id uuid;
  v_reserved integer;
  v_new_capacity integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'NOT_AUTHORIZED';
  END IF;

  IF p_lotes IS NULL OR jsonb_typeof(p_lotes) <> 'array' THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_LOTE_PAYLOAD';
  END IF;

  SELECT has_lotes, has_baterias
  INTO v_current_has_lotes, v_has_baterias
  FROM adventures
  WHERE id = p_adventure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ADVENTURE_NOT_FOUND';
  END IF;

  IF p_has_lotes AND v_has_baterias THEN
    RAISE EXCEPTION USING MESSAGE = 'CANNOT_ENABLE_LOTES_WITH_BATERIAS';
  END IF;

  IF v_current_has_lotes = false AND p_has_lotes = true THEN
    SELECT COUNT(*) INTO v_active_count
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND is_registration_capacity_active(r.payment_status);

    IF v_active_count > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'CANNOT_ENABLE_LOTES_WITH_REGISTRATIONS';
    END IF;
  END IF;

  IF v_current_has_lotes = true AND p_has_lotes = false THEN
    SELECT COUNT(*) INTO v_active_with_lote
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND r.lote_id IS NOT NULL
      AND is_registration_capacity_active(r.payment_status);

    IF v_active_with_lote > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'CANNOT_DISABLE_LOTES_WITH_REGISTRATIONS';
    END IF;
  END IF;

  UPDATE adventures SET has_lotes = p_has_lotes WHERE id = p_adventure_id;

  v_kept_ids := ARRAY[]::uuid[];

  FOR v_lote IN SELECT * FROM jsonb_array_elements(p_lotes)
  LOOP
    v_lote_id := NULLIF(v_lote->>'id', '')::uuid;
    v_new_capacity := (v_lote->>'capacity')::integer;

    IF v_lote_id IS NOT NULL THEN
      SELECT COUNT(*)::integer INTO v_reserved
      FROM registrations r
      WHERE r.lote_id = v_lote_id
        AND is_registration_capacity_active(r.payment_status);

      IF v_new_capacity < v_reserved THEN
        RAISE EXCEPTION USING MESSAGE = 'LOTE_CAPACITY_BELOW_RESERVED';
      END IF;

      UPDATE adventure_lotes
      SET
        label = COALESCE(v_lote->>'label', label),
        sort_order = COALESCE((v_lote->>'sort_order')::integer, sort_order),
        capacity = v_new_capacity,
        price = COALESCE((v_lote->>'price')::numeric, price),
        pix_copia_cola = COALESCE(v_lote->>'pix_copia_cola', pix_copia_cola)
      WHERE id = v_lote_id AND adventure_id = p_adventure_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'LOTE_NOT_FOUND';
      END IF;

      v_kept_ids := array_append(v_kept_ids, v_lote_id);
    ELSE
      INSERT INTO adventure_lotes (
        adventure_id, label, sort_order, capacity, price, pix_copia_cola
      )
      VALUES (
        p_adventure_id,
        COALESCE(v_lote->>'label', 'Lote'),
        COALESCE((v_lote->>'sort_order')::integer, 0),
        v_new_capacity,
        COALESCE((v_lote->>'price')::numeric, 0),
        COALESCE(v_lote->>'pix_copia_cola', '')
      )
      RETURNING id INTO v_lote_id;

      v_kept_ids := array_append(v_kept_ids, v_lote_id);
    END IF;
  END LOOP;

  FOR v_lote_id IN
    SELECT l.id
    FROM adventure_lotes l
    WHERE l.adventure_id = p_adventure_id
      AND NOT (l.id = ANY (v_kept_ids))
  LOOP
    SELECT COUNT(*)::integer INTO v_reserved
    FROM registrations r
    WHERE r.lote_id = v_lote_id
      AND is_registration_capacity_active(r.payment_status);

    IF v_reserved > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'LOTE_HAS_REGISTRATIONS';
    END IF;

    DELETE FROM adventure_lotes WHERE id = v_lote_id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_adventure_lotes(uuid, boolean, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION save_adventure_lotes(uuid, boolean, jsonb) TO authenticated;
```

- [ ] **Step 4: Estender `create_registration_with_capacity` com branch `has_lotes`**

Substituir a função inteira (manter assinatura de 8 args). Mudanças principais:

1. Declarar `v_has_lotes boolean`, `v_active_lote_id uuid`, `v_lote_price numeric`, `v_lote_reserved integer`, `v_lote_capacity integer`.
2. No `SELECT ... FROM adventures`, incluir `has_lotes`.
3. Após checar `registrations_enabled`, inserir branch **antes** de `has_baterias`:

```sql
  IF v_has_lotes THEN
    IF p_group_size <> 1 THEN
      RAISE EXCEPTION USING MESSAGE = 'INVALID_GROUP_SIZE';
    END IF;

    IF p_bateria_assignments IS NOT NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_ASSIGNMENTS_MISMATCH';
    END IF;

    SELECT l.id, l.price, l.capacity
    INTO v_active_lote_id, v_lote_price, v_lote_capacity
    FROM get_active_lote(p_adventure_id) l
    LIMIT 1;

    IF v_active_lote_id IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'NO_ACTIVE_LOTE';
    END IF;

    SELECT COUNT(*)::integer INTO v_lote_reserved
    FROM registrations r
    WHERE r.lote_id = v_active_lote_id
      AND is_registration_capacity_active(r.payment_status);

    IF v_lote_reserved >= v_lote_capacity THEN
      RAISE EXCEPTION USING MESSAGE = 'LOTE_CAPACITY_EXCEEDED';
    END IF;

    INSERT INTO registrations (
      adventure_id, adventure_title, name, email, phone,
      group_size, participants, custom_data, bateria_assignments,
      lote_id, payment_status, total_amount
    )
    VALUES (
      p_adventure_id, v_adventure_title, p_name, p_email, p_phone,
      1, p_participants, p_custom_data, NULL,
      v_active_lote_id, 'pending', v_lote_price
    )
    RETURNING * INTO v_registration;

    RETURN v_registration;
  END IF;
```

4. Nos branches `has_baterias` e modo simples, incluir `lote_id` no INSERT como `NULL` (adicionar coluna ao INSERT existente).

- [ ] **Step 5: Aplicar migração e testar RPCs via SQL**

```sql
-- Smoke test (substituir UUID real após criar aventura de teste):
SELECT * FROM get_adventure_lotes_with_availability('<adventure-id>');
SELECT * FROM get_active_lote('<adventure-id>');
```

Esperado: zero rows em aventura sem lotes; após save, retorna lotes com `reserved = 0`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/013_adventure_lotes_rpcs.sql
git commit -m "feat(lotes): add RPCs for lote availability, save and registration

Inclui get_active_lote, save_adventure_lotes e extensão de
create_registration_with_capacity para atribuição atômica do lote ativo."
```

---

## Task 3: Tipos TypeScript

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Adicionar tipos de lote após `BateriaAssignments`**

```ts
export type Lote = {
  id: string;
  adventure_id: string;
  label: string;
  sort_order: number;
  capacity: number;
  price: number;
  pix_copia_cola: string;
  created_at: string;
};

export type LoteAvailability = {
  id: string;
  label: string;
  sort_order: number;
  capacity: number;
  price: number;
  reserved: number;
};

export type ActiveLote = LoteAvailability & {
  remaining: number;
};
```

- [ ] **Step 2: Estender `Adventure` e `Registration`**

Em `Adventure`, adicionar:
```ts
  has_lotes: boolean;
```

Em `Registration`, adicionar:
```ts
    lote_id?: string | null;
```

- [ ] **Step 3: Verificar tipos**

```bash
npm run typecheck
```

Esperado: PASS (erros apenas nos arquivos que ainda referenciam os campos novos — corrigidos nas tasks seguintes).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(lotes): add Lote, LoteAvailability and ActiveLote types"
```

---

## Task 4: Componente `LotePixField`

**Files:**
- Create: `src/app/(admin)/admin/adventures/_components/lote-pix-field.tsx`

- [ ] **Step 1: Criar componente (espelha `pix-slot-card.tsx` com label customizável)**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import QRCode from "qrcode";
import Image from "next/image";

type LotePixFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

export function LotePixField({ label, value, onChange }: LotePixFieldProps) {
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value.trim()) {
      QRCode.toDataURL(value, {
        width: 120,
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
    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
      <Textarea
        placeholder={`Cole o PIX copia-e-cola do ${label}...`}
        className="min-h-[80px] font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-center justify-center">
        {qrPreview ? (
          <Image
            src={qrPreview}
            alt={`QR Code ${label}`}
            width={96}
            height={96}
            className="rounded border"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground">
            Sem PIX
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/adventures/_components/lote-pix-field.tsx
git commit -m "feat(lotes): add LotePixField admin component"
```

---

## Task 5: Formulário admin de aventura

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`
- Modify: `src/app/(admin)/admin/adventures/_components/pix-config-dialog.tsx`

- [ ] **Step 1: Adicionar `loteSchema` e campos ao `adventureSchema`**

Após `bateriaSchema`, adicionar:

```ts
const loteSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1, "Nome do lote é obrigatório."),
  sort_order: z.coerce.number().int().min(0),
  capacity: z.coerce.number().int().min(1, "Capacidade mínima é 1."),
  price: z.coerce.number().min(0, "O preço não pode ser negativo."),
  pixCopiaECola: z.string().default(""),
});
```

No `adventureSchema`, adicionar:
```ts
    hasLotes: z.boolean(),
    lotes: z.array(loteSchema).optional(),
```

No `.superRefine` existente, adicionar:

```ts
    if (data.hasLotes && (!data.lotes || data.lotes.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adicione pelo menos um lote.",
        path: ["lotes"],
      });
    }
    if (data.hasLotes && data.hasBaterias) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lotes e baterias não podem estar ativos ao mesmo tempo.",
        path: ["hasLotes"],
      });
    }
    if (
      data.pixEnabled &&
      data.hasLotes &&
      data.lotes?.some((l) => !l.pixCopiaECola.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cadastre o PIX de todos os lotes para ativar o pagamento.",
        path: ["pixEnabled"],
      });
    }
    if (
      data.pixEnabled &&
      !data.hasLotes &&
      !Object.values(data.pixCopiaECola).some((s) => s.trim().length > 0)
    ) {
      // manter validação existente dos 4 slots
    }
```

Ajustar a validação PIX existente para **não** rodar quando `hasLotes = true`.

- [ ] **Step 2: Estado e carregamento de lotes**

Importar `LoteAvailability` e `LotePixField`.

Adicionar estado:
```ts
const [lotesAvailability, setLotesAvailability] = useState<LoteAvailability[]>([]);
```

`useFieldArray({ name: "lotes" })`.

No `useEffect` de carga (paralelo ao de baterias), quando `adventure?.has_lotes`:

```ts
const { data, error } = await supabase
  .rpc("get_adventure_lotes_with_availability", { p_adventure_id: adventure.id });
// mapear para form.resetField / setValue("lotes", ...)
```

Cada item do form:
```ts
{ id, label, sort_order, capacity, price, pixCopiaECola: <from DB pix_copia_cola> }
```

`defaultValues`:
```ts
hasLotes: adventure?.has_lotes ?? false,
lotes: [],
```

- [ ] **Step 3: Função `getSaveLotesErrorMessage`**

Espelhar `getSaveBateriasErrorMessage` mapeando:
- `CANNOT_DISABLE_LOTES_WITH_REGISTRATIONS`
- `CANNOT_ENABLE_LOTES_WITH_REGISTRATIONS`
- `CANNOT_ENABLE_LOTES_WITH_BATERIAS`
- `LOTE_HAS_REGISTRATIONS`
- `LOTE_CAPACITY_BELOW_RESERVED`
- `INVALID_LOTE_PAYLOAD`
- `NOT_AUTHORIZED`

- [ ] **Step 4: Toggle e seção visual de lotes**

Após o bloco de baterias, adicionar:

```tsx
<FormField
  control={form.control}
  name="hasLotes"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel>Vender por lote</FormLabel>
        <FormDescription>
          Precificação escalonada com vagas e PIX por lote. Uma pessoa por inscrição.
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
          disabled={form.watch("hasBaterias")}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

Quando `hasLotes`:
- Desabilitar campo `price` com nota: "Definido por lote."
- Desabilitar `maxParticipants` com nota: "Capacidade definida pela soma das vagas dos lotes."
- Desabilitar toggle `hasBaterias`.
- Ocultar seção de baterias.
- Exibir tabela de lotes (Nome, Vagas, Preço, PIX, Remover).
- Botão "Adicionar lote" com label padrão `Lote ${n}`.

Antes de remover lote com `id`, checar `lotesAvailability.find(l => l.id === id)?.reserved > 0` → toast de bloqueio (UX igual baterias).

Antes de submit, se `capacity < reserved` para lote existente → `AlertDialog` de confirmação (igual baterias) **mas** o RPC bloqueia com `LOTE_CAPACITY_BELOW_RESERVED` — o dialog é só para tentativas; na prática o RPC impede redução abaixo do ocupado (diferente de baterias que permite excedente). **Implementar bloqueio direto** sem dialog "salvar mesmo assim": toast "Este lote tem X inscrições. Reduza cancelando inscrições primeiro."

- [ ] **Step 5: Persistência no `onSubmit`**

Após `save_adventure_baterias`, adicionar chamada:

```ts
const lotesPayload = (values.lotes ?? []).map((l, index) => ({
  id: l.id,
  label: l.label,
  sort_order: index,
  capacity: l.capacity,
  price: l.price,
  pix_copia_cola: l.pixCopiaECola,
}));

const { error: loteError } = await supabase.rpc("save_adventure_lotes", {
  p_adventure_id: adventureId,
  p_has_lotes: values.hasLotes,
  p_lotes: lotesPayload,
});
```

No `insert` de aventura nova:
```ts
.insert({ ...adventureData, has_baterias: false, has_lotes: false })
```

Quando `hasLotes`, enviar `pix_config` com slots vazios:
```ts
pix_config: {
  pixEnabled: values.pixEnabled,
  pixCopiaECola: values.hasLotes
    ? { 1: "", 2: "", 3: "", 4: "" }
    : values.pixCopiaECola,
  instructions: values.pixInstructions ?? "",
},
```

- [ ] **Step 6: Adaptar `PixConfigDialog`**

Adicionar prop `hasLotes: boolean`.

Quando `hasLotes`:
- Badge mostra "PIX por lote" em vez de "X de 4 chaves".
- Dialog mostra só `pixEnabled` + `pixInstructions` (sem `PixSlotCard` dos 4 slots).
- Descrição: "Os códigos PIX são configurados em cada lote na tabela acima."

- [ ] **Step 7: Verificar**

```bash
npm run typecheck && npm run lint
```

Teste manual: criar aventura com 3 lotes, salvar, reabrir e confirmar persistência.

- [ ] **Step 8: Commit**

```bash
git add src/app/(admin)/admin/adventures/_components/adventure-form.tsx \
        src/app/(admin)/admin/adventures/_components/pix-config-dialog.tsx
git commit -m "feat(lotes): add admin form for sequential pricing tiers"
```

---

## Task 6: Página pública da aventura

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/page.tsx`

- [ ] **Step 1: Estender fetch com `has_lotes` e lote ativo**

No `select`, adicionar `has_lotes`.

Adicionar estado:
```ts
const [activeLote, setActiveLote] = useState<ActiveLote | null>(null);
```

Após carregar aventura:

```ts
if (typedAdventure.has_lotes) {
  const { data, error } = await supabase.rpc("get_active_lote", {
    p_adventure_id: typedAdventure.id,
  });
  if (!error && data && data.length > 0) {
    setActiveLote(data[0] as ActiveLote);
  } else {
    setActiveLote(null);
  }
}
```

- [ ] **Step 2: Calcular `remainingSpots` e `isSoldOut`**

```ts
const usesLotes = adventure?.has_lotes ?? false;

const remainingSpots = usesLotes
  ? (activeLote?.remaining ?? 0)
  : usesBaterias
    ? null
    : adventure?.max_participants != null
      ? Math.max(0, adventure.max_participants - reservedParticipants)
      : null;

const isSoldOut = usesLotes
  ? activeLote === null || activeLote.remaining <= 0
  : /* lógica existente */;
```

- [ ] **Step 3: Exibir preço e badge do lote ativo**

Substituir `adventure.price` por:

```tsx
const displayPrice = usesLotes ? (activeLote?.price ?? adventure.price) : adventure.price;
```

No card de detalhes:
```tsx
{usesLotes && activeLote ? (
  <p className="text-sm text-muted-foreground">
    {activeLote.label} — Restam {activeLote.remaining}{" "}
    {activeLote.remaining === 1 ? "vaga" : "vagas"}
  </p>
) : null}
```

- [ ] **Step 4: Passar props ao `RegistrationForm`**

```tsx
<RegistrationForm
  ...
  hasLotes={usesLotes}
  activeLotePrice={activeLote?.price}
  ...
/>
```

- [ ] **Step 5: Realtime para atualizar lote ativo**

Subscription em `registrations` e `adventure_lotes` (filtrado por `adventure_id`) → re-fetch `get_active_lote`.

- [ ] **Step 6: Verificar manualmente**

Abrir `/adventures/<slug>` com aventura em modo lote; confirmar preço e badge.

- [ ] **Step 7: Commit**

```bash
git add src/app/(main)/adventures/[slug]/page.tsx
git commit -m "feat(lotes): show active lote price and remaining spots on adventure page"
```

---

## Task 7: Formulário de inscrição

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

- [ ] **Step 1: Adicionar props**

```ts
type RegistrationFormProps = {
  // ...existentes
  hasLotes?: boolean;
  activeLotePrice?: number;
};
```

- [ ] **Step 2: Ajustar schema quando `hasLotes`**

Em `createRegistrationSchema`, adicionar parâmetro `hasLotes: boolean`:

```ts
function createRegistrationSchema(
  remainingSpots: number | null,
  hasBaterias: boolean,
  hasLotes: boolean
) {
  let groupSizeSchema = hasLotes
    ? z.literal(1)
    : z.coerce.number().int().min(1).max(PIX_MAX_GROUP_SIZE);
  // ... restante igual
}
```

- [ ] **Step 3: Ocultar UI de grupo quando `hasLotes`**

Não renderizar:
- Seletor de quantidade de pessoas
- Campos de participantes extras
- Seção de baterias (já mutuamente exclusivo)

No `onSubmit`, forçar `group_size: 1` na chamada RPC.

- [ ] **Step 4: Mapear erros novos**

Em `normalizeRegistrationRpcError` e mensagens toast:

```ts
if (matchesIdentifier("NO_ACTIVE_LOTE")) return "NO_ACTIVE_LOTE";
if (matchesIdentifier("LOTE_CAPACITY_EXCEEDED")) return "LOTE_CAPACITY_EXCEEDED";
```

Mensagens pt-BR:
- `NO_ACTIVE_LOTE`: "Todos os lotes estão esgotados."
- `LOTE_CAPACITY_EXCEEDED`: "As vagas deste lote acabaram de ser preenchidas. Tente novamente."

- [ ] **Step 5: Realtime de vagas (modo lote)**

Quando `hasLotes`, subscription em `registrations` → callback que o parent pode usar, ou emitir via prop `onLoteChange`. **Preferência:** manter lógica de refresh no `page.tsx` (já no Task 6) — o form só usa `remainingSpots` atualizado pelo parent.

- [ ] **Step 6: Verificar**

Inscrição em aventura com lotes: form sem seletor de pessoas; redirect para pagamento com valor correto.

- [ ] **Step 7: Commit**

```bash
git add src/app/(main)/adventures/[slug]/_components/registration-form.tsx
git commit -m "feat(lotes): single-person registration when adventure uses lotes"
```

---

## Task 8: Página de pagamento

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/pagamento/page.tsx`

- [ ] **Step 1: Buscar PIX do lote quando `registration.lote_id` presente**

Adicionar estado:
```ts
const [lotePixCopiaECola, setLotePixCopiaECola] = useState<string>("");
```

Após carregar registration:

```ts
if (registration?.lote_id) {
  const { data } = await supabase
    .from("adventure_lotes")
    .select("pix_copia_cola")
    .eq("id", registration.lote_id)
    .single();
  setLotePixCopiaECola(data?.pix_copia_cola ?? "");
}
```

- [ ] **Step 2: Resolver `pixCopiaECola` final**

```ts
const pixCopiaECola = registration?.lote_id
  ? lotePixCopiaECola
  : pixConfig && groupSizeSlot
    ? pixConfig.pixCopiaECola[groupSizeSlot]
    : "";
```

Valor exibido: sempre `registration.total_amount` (já congelado).

- [ ] **Step 3: Verificar cenário crítico**

1. Inscrever no Lote 1.
2. Esgotar Lote 1 com outras inscrições.
3. Abrir pagamento da primeira inscrição → PIX do Lote 1, valor R$ do Lote 1.

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/adventures/[slug]/pagamento/page.tsx
git commit -m "feat(lotes): use frozen lote PIX on payment page"
```

---

## Task 9: Preço em cards e listagens

**Files:**
- Modify: `src/components/adventure-card.tsx`
- Modify: `src/app/(main)/page.tsx`
- Modify: `src/app/(admin)/admin/adventures/page.tsx`

- [ ] **Step 1: Estender `AdventureCard`**

```ts
type AdventureCardProps = {
  adventure: Adventure;
  displayPrice?: number | null;
  priceLabel?: string;
};
```

Render:
```tsx
const price = displayPrice ?? adventure.price;
// se displayPrice === null → mostrar "Esgotado" em vez de preço
```

- [ ] **Step 2: Enriquecer homepage**

Em `page.tsx`, após `useCollection<Adventure>`:

```tsx
const [priceByAdventureId, setPriceByAdventureId] = useState<Record<string, number | null>>({});

useEffect(() => {
  if (!adventures?.length) return;
  let cancelled = false;

  async function loadPrices() {
    const entries = await Promise.all(
      adventures.map(async (adv) => {
        if (!adv.has_lotes) return [adv.id, adv.price] as const;
        const { data } = await supabase.rpc("get_active_lote", { p_adventure_id: adv.id });
        const lote = data?.[0] as ActiveLote | undefined;
        return [adv.id, lote ? lote.price : null] as const;
      })
    );
    if (!cancelled) setPriceByAdventureId(Object.fromEntries(entries));
  }

  void loadPrices();
  return () => { cancelled = true; };
}, [adventures, supabase]);
```

Passar ao card:
```tsx
<AdventureCard
  adventure={adventure}
  displayPrice={priceByAdventureId[adventure.id]}
/>
```

- [ ] **Step 3: Listagem admin**

Mesmo padrão: para `has_lotes`, fetch `get_active_lote` e mostrar preço ativo ou "Esgotado".

- [ ] **Step 4: Verificar**

Homepage e `/admin/adventures` mostram preço do lote ativo.

- [ ] **Step 5: Commit**

```bash
git add src/components/adventure-card.tsx src/app/(main)/page.tsx src/app/(admin)/admin/adventures/page.tsx
git commit -m "feat(lotes): display active lote price on cards and admin list"
```

---

## Task 10: Verificação final

- [ ] **Step 1: Typecheck e lint**

```bash
npm run typecheck && npm run lint
```

Esperado: PASS sem erros.

- [ ] **Step 2: Checklist manual (spec)**

1. Aventura com 3 lotes (30/40/30) — salvar e reabrir admin.
2. 30 inscrições → página mostra Lote 2.
3. Inscrição pendente do Lote 1 → pagamento com PIX do Lote 1.
4. Desligar lotes com inscrições → bloqueado.
5. Apagar Lote 1 com inscrições → bloqueado.
6. Lotes + baterias simultâneos → bloqueado no admin e no banco.
7. Formulário: 1 pessoa apenas, sem seletor de grupo.

- [ ] **Step 3: Atualizar status da spec**

Em `docs/superpowers/specs/2026-06-05-adventure-lotes-design.md`, alterar status para:
`Aprovado — plano em docs/superpowers/plans/2026-06-05-adventure-lotes.md`

- [ ] **Step 4: Commit final (se houver alteração na spec)**

```bash
git add docs/superpowers/specs/2026-06-05-adventure-lotes-design.md
git commit -m "docs(lotes): mark spec as ready for implementation"
```

---

## Cobertura spec → tasks (self-review)

| Requisito da spec | Task |
|---|---|
| Schema `adventure_lotes` + `has_lotes` + exclusividade | Task 1 |
| `registrations.lote_id` congelado | Task 1, 2, 8 |
| RPCs leitura/save/inscrição | Task 2 |
| Tipos TS | Task 3 |
| Admin: toggle, tabela, PIX por lote | Task 4, 5 |
| Público: lote ativo + vagas | Task 6 |
| Inscrição 1 pessoa | Task 7 |
| Pagamento com PIX do lote | Task 8 |
| Cards/listagem com preço ativo | Task 9 |
| Instruções PIX globais | Task 5 (PixConfigDialog) |
| Regras de edição igual baterias | Task 2 (RPC), Task 5 (UX) |
