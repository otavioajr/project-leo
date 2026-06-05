# Campo "Tamanho de camiseta" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o admin configure campos dedicados de tamanho de camiseta (opções + imagem de ajuda opcional) e que cada pessoa da inscrição escolha o tamanho no formulário público, com botão `?` abrindo modal quando houver imagem.

**Architecture:** Estende `CustomField` com `type: "tshirt_size"`, `options` e `helpImageUrl` opcional, persistindo em `adventures.custom_fields` (JSONB). O admin reutiliza o construtor existente; o público usa um componente `TshirtSizeField` compartilhado entre titular (`custom_data`) e participantes (`participants`). Sem migration.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, React Hook Form, Zod, shadcn/ui (`Select`, `Dialog`), `ImageUpload`, Supabase JSONB.

**Spec:** `docs/superpowers/specs/2026-06-05-adventure-tshirt-size-field-design.md`

---

## File map

- Modify: `src/lib/types.ts`
  Responsabilidade: adicionar `tshirt_size` ao union de `type` e `helpImageUrl?: string`.

- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`
  Responsabilidade: novo tipo no seletor, editor de opções + imagem, validação Zod, normalização ao salvar, textos de ajuda.

- Create: `src/app/(main)/adventures/[slug]/_components/tshirt-size-field.tsx`
  Responsabilidade: seletor de tamanho, botão `?` condicional e modal com imagem.

- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`
  Responsabilidade: incluir `tshirt_size` no titular e participantes, estado inicial, validação e payload.

- Verify if needed: `src/app/(main)/adventures/[slug]/page.tsx`
  Responsabilidade: confirmar que `customFields` chega sem cast que remova `helpImageUrl`.

- Verify if needed: `src/app/(admin)/admin/registrations/_lib/export-registrations.ts`
  Responsabilidade: confirmar que chaves de `participants` incluem tamanho de camiseta na exportação.

Observação: o projeto não possui framework de testes automatizados. Verificações formais: `npm run typecheck`, `npm run lint` e teste manual no navegador.

---

### Task 1: Tipos compartilhados

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Ampliar `CustomField`**

```ts
export type CustomField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "multiselect" | "tshirt_size";
  required: boolean;
  options?: string[];
  helpImageUrl?: string;
};
```

- [ ] **Step 2: Rodar typecheck**

Run: `npm run typecheck`

Expected: PASS (campo novo é opcional; sem quebra imediata).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: adiciona tipo tshirt_size em CustomField"
```

---

### Task 2: Schema e editor do admin

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

- [ ] **Step 1: Ampliar constantes e helpers de tipo**

```ts
const customFieldTypes = [
  "text", "email", "tel", "number", "select", "multiselect", "tshirt_size",
] as const;

function isOptionsFieldType(type: CustomFieldType) {
  return type === "select" || type === "multiselect" || type === "tshirt_size";
}

function isTshirtSizeFieldType(type: CustomFieldType) {
  return type === "tshirt_size";
}
```

Substituir usos de `isSelectionFieldType` por `isOptionsFieldType` onde a regra for "precisa de options" (schema, editor de opções, normalização). Manter lógica separada onde `multiselect` difere (ex.: não aplicar a `tshirt_size`).

- [ ] **Step 2: Ampliar `customFieldSchema`**

Adicionar `helpImageUrl` opcional:

```ts
helpImageUrl: z.union([z.literal(""), z.string().url("URL da imagem inválida.")]).optional(),
```

No `superRefine`:
- trocar `isSelectionFieldType` por `isOptionsFieldType` para validação de `options`
- para `tshirt_size`, `helpImageUrl` permanece opcional (string vazia permitida)

- [ ] **Step 3: Ajustar `handleCustomFieldTypeChange`**

```ts
function handleCustomFieldTypeChange(fieldIndex: number, type: CustomFieldType) {
  const optionsPath = `customFields.${fieldIndex}.options` as const;
  const helpImagePath = `customFields.${fieldIndex}.helpImageUrl` as const;
  const labelPath = `customFields.${fieldIndex}.label` as const;

  if (isOptionsFieldType(type)) {
    const currentOptions = form.getValues(optionsPath);
    if (!currentOptions || currentOptions.length === 0) {
      form.setValue(optionsPath, [""], { shouldDirty: true });
    }
    if (isTshirtSizeFieldType(type)) {
      const currentLabel = form.getValues(labelPath);
      if (!currentLabel?.trim()) {
        form.setValue(labelPath, "Tamanho de camiseta", { shouldDirty: true });
      }
      if (form.getValues(helpImagePath) === undefined) {
        form.setValue(helpImagePath, "", { shouldDirty: true });
      }
    }
    return;
  }

  form.setValue(optionsPath, undefined, { shouldDirty: true, shouldValidate: true });
  form.setValue(helpImagePath, undefined, { shouldDirty: true, shouldValidate: true });
}
```

- [ ] **Step 4: Ajustar normalização em `onSubmit`**

```ts
const normalizedCustomFields =
  values.customFields?.map((customField) => {
    if (isOptionsFieldType(customField.type)) {
      const normalized = {
        ...customField,
        options: normalizeSelectionOptions(customField.options),
      };
      if (isTshirtSizeFieldType(customField.type)) {
        const trimmedHelp = customField.helpImageUrl?.trim() ?? "";
        return {
          ...normalized,
          helpImageUrl: trimmedHelp === "" ? undefined : trimmedHelp,
        };
      }
      const { helpImageUrl: _help, ...withoutHelp } = normalized;
      return withoutHelp;
    }
    const { options: _options, helpImageUrl: _help, ...simpleField } = customField;
    return simpleField;
  }) || [];
```

- [ ] **Step 5: Ajustar `defaultValues` ao carregar aventura**

No `.map` de `customFields` em `defaultValues`:

```ts
if (isOptionsFieldType(customField.type)) {
  const base = {
    ...customField,
    options: normalizeSelectionOptions(customField.options),
  };
  if (isTshirtSizeFieldType(customField.type)) {
    return { ...base, helpImageUrl: customField.helpImageUrl ?? "" };
  }
  return base;
}
```

- [ ] **Step 6: Adicionar item no seletor de tipo**

```tsx
<SelectItem value="tshirt_size">Tamanho de camiseta</SelectItem>
```

- [ ] **Step 7: Renderizar editor expandido para `tshirt_size`**

Trocar `shouldShowOptionsEditor`:

```ts
const shouldShowOptionsEditor = isOptionsFieldType(customFieldType);
const shouldShowTshirtHelpImage = isTshirtSizeFieldType(customFieldType);
```

Após o bloco de opções, quando `shouldShowTshirtHelpImage`:

```tsx
<div className="space-y-3 rounded-md border p-3 bg-muted/20">
  <div>
    <h5 className="text-sm font-medium">Imagem de ajuda</h5>
    <p className="text-xs text-muted-foreground">
      Tabela de medidas exibida ao cliente ao clicar no botão de orientação.
    </p>
  </div>
  <FormField
    control={form.control}
    name={`customFields.${index}.helpImageUrl` as const}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <ImageUpload
            value={field.value ?? ""}
            onChange={field.onChange}
            folder="adventures/tshirt-guides"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  {!(form.watch(`customFields.${index}.helpImageUrl` as const) ?? "").trim() && (
    <p className="text-xs text-muted-foreground flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      Sem imagem de ajuda, o botão de orientação não aparecerá para o cliente no formulário de inscrição.
    </p>
  )}
</div>
```

Importar `AlertTriangle` de `lucide-react` e `ImageUpload` (já usado no arquivo).

- [ ] **Step 8: Atualizar textos de ajuda do construtor**

Em `FormDescription` e bloco "Campos do Sistema":

- Contato principal: todos os campos personalizados (incluindo tamanho de camiseta)
- Participantes adicionais: campos simples **e** tamanho de camiseta

- [ ] **Step 9: Verificar admin**

Run: `npm run typecheck`

Expected: PASS

Run: `npm run dev`

Manual em `/admin/adventures/new`:

- tipo "Tamanho de camiseta" aparece no seletor
- rótulo pré-preenchido ao selecionar o tipo
- editor de opções + upload de imagem visíveis
- aviso sem imagem visível
- salvar sem opções → erro; salvar sem imagem → ok

- [ ] **Step 10: Commit**

```bash
git add src/app/(admin)/admin/adventures/_components/adventure-form.tsx
git commit -m "feat: admin configura campo tamanho de camiseta"
```

---

### Task 3: Componente `TshirtSizeField`

**Files:**
- Create: `src/app/(main)/adventures/[slug]/_components/tshirt-size-field.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import Image from "next/image";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TshirtSizeFieldProps = {
  label: string;
  required: boolean;
  options: string[];
  helpImageUrl?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  onBlur?: () => void;
};

export function TshirtSizeField({
  label,
  required,
  options,
  helpImageUrl,
  value,
  onChange,
  name,
  onBlur,
}: TshirtSizeFieldProps) {
  const trimmedHelpImageUrl = helpImageUrl?.trim();

  return (
    <FormItem>
      <div className="flex items-center gap-2">
        <FormLabel>
          {label}
          {required && <span className="text-destructive">*</span>}
        </FormLabel>
        {trimmedHelpImageUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Ver guia de tamanhos"
              >
                <CircleHelp className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{label}</DialogTitle>
              </DialogHeader>
              <div className="relative w-full min-h-[200px]">
                <Image
                  src={trimmedHelpImageUrl}
                  alt={`Guia de tamanhos: ${label}`}
                  width={1200}
                  height={800}
                  className="h-auto w-full object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <Select onValueChange={onChange} value={value}>
        <FormControl>
          <SelectTrigger onBlur={onBlur} name={name}>
            <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/adventures/[slug]/_components/tshirt-size-field.tsx
git commit -m "feat: adiciona componente TshirtSizeField"
```

---

### Task 4: Integração no formulário público

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

- [ ] **Step 1: Adicionar helpers de escopo**

```ts
function isTshirtSizeField(field: CustomField): field is CustomField & { type: "tshirt_size" } {
  return field.type === "tshirt_size";
}

function isParticipantCustomField(field: CustomField): boolean {
  return isSimpleCustomField(field) || isTshirtSizeField(field);
}
```

Substituir usos de `participantCustomFields` (filtro só `isSimpleCustomField`) por filtro com `isParticipantCustomField`.

- [ ] **Step 2: Ajustar estado inicial**

Em `initialCustomData`, `tshirt_size` inicia com `""` (já coberto pelo branch `multiselect` ? [] : "").

No `useEffect` de participantes, ao criar `newParticipant`, incluir campos `tshirt_size`:

```ts
const additionalParticipantFields = (customFields ?? []).filter(isParticipantCustomField);

additionalParticipantFields.forEach((field) => {
  newParticipant[field.name] = "";
});
```

- [ ] **Step 3: Renderizar `tshirt_size` no titular**

Importar `TshirtSizeField`. No loop `allCustomFields.map`, antes do branch `select`, adicionar:

```tsx
if (customField.type === "tshirt_size") {
  const options = customField.options ?? [];
  const selectValue = typeof field.value === "string" ? field.value : "";

  return (
    <TshirtSizeField
      label={customField.label}
      required={customField.required}
      options={options}
      helpImageUrl={customField.helpImageUrl}
      value={selectValue}
      onChange={field.onChange}
      name={field.name}
      onBlur={field.onBlur}
    />
  );
}
```

- [ ] **Step 4: Renderizar `tshirt_size` nos participantes**

No bloco `participantCustomFields.map`, substituir renderização única de `Input` por branch:

```tsx
{participantCustomFields.map((customField) => (
  <FormField
    key={customField.name}
    control={form.control}
    name={`participants.${index}.${customField.name}`}
    render={({ field }) => {
      if (customField.type === "tshirt_size") {
        const options = customField.options ?? [];
        return (
          <TshirtSizeField
            label={customField.label}
            required={customField.required}
            options={options}
            helpImageUrl={customField.helpImageUrl}
            value={field.value ?? ""}
            onChange={field.onChange}
            name={field.name}
            onBlur={field.onBlur}
          />
        );
      }

      return (
        <FormItem>
          <FormLabel>
            {customField.label}
            {customField.required && <span className="text-destructive">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              placeholder={customField.label}
              type={customField.type}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      );
    }}
  />
))}
```

- [ ] **Step 5: Ajustar validação de participantes**

No loop `values.participants.forEach`, trocar `participantCustomFields` (agora inclui `tshirt_size`). Para `tshirt_size` obrigatório, mesma regra: string não vazia após trim.

`isRequiredCustomValueFilled` já cobre `tshirt_size` no titular (trata como string). Para participantes, manter:

```ts
if (field.required && (!participantValue || participantValue.trim() === "")) {
  // setError
}
```

- [ ] **Step 6: Ajustar payload de participantes**

No `participantsPayload`, o loop já usa `participantCustomFields` — com o filtro ampliado, `tshirt_size` entra automaticamente.

- [ ] **Step 7: Rodar verificações**

Run: `npm run typecheck`

Expected: PASS

Run: `npm run lint`

Expected: PASS

- [ ] **Step 8: Verificação manual do formulário público**

Run: `npm run dev`

Cenários:

1. Aventura com `tshirt_size`, imagem configurada, grupo de 3 pessoas
   - seletor no titular + 2 participantes
   - botão `?` abre modal com imagem em todos os campos
2. Mesma aventura sem imagem
   - seletor sem botão `?`
3. Campo obrigatório vazio
   - erro inline + toast; envio bloqueado
4. Envio bem-sucedido
   - `custom_data[campo]` preenchido para titular
   - `participants[i][campo]` preenchido para demais

- [ ] **Step 9: Commit**

```bash
git add src/app/(main)/adventures/[slug]/_components/registration-form.tsx
git commit -m "feat: renderiza tamanho de camiseta na inscricao"
```

---

### Task 5: Revisão de impactos secundários

**Files:**
- Verify: `src/app/(main)/adventures/[slug]/page.tsx`
- Verify: `src/app/(admin)/admin/registrations/_lib/export-registrations.ts`

- [ ] **Step 1: Revisar passagem de `customFields`**

Confirmar que `adventure.custom_fields` é passado ao `RegistrationForm` sem normalização que remova `helpImageUrl` ou `options`.

- [ ] **Step 2: Revisar exportação**

Confirmar que `collectStableCustomColumns` já inclui chaves de `participants` — tamanho de camiseta deve aparecer como coluna automaticamente.

- [ ] **Step 3: Corrigir apenas se houver quebra real**

Mudanças mínimas, sem refactor lateral.

- [ ] **Step 4: Verificação final**

Run: `npm run typecheck && npm run lint`

Expected: PASS

- [ ] **Step 5: Commit (somente se houver correções)**

```bash
git add <arquivos alterados>
git commit -m "fix: ajusta leituras secundarias de tshirt_size"
```

---

### Task 6: Verificação final de história completa

**Files:**
- No file changes required

- [ ] **Step 1: Configurar aventura de teste no admin**

- Campo `tamanho_camiseta` tipo Tamanho de camiseta
- Opções: P, M, G, GG
- Imagem de tabela de medidas via upload
- Segundo campo opcional `tamanho_camiseta_fem` sem imagem (validar múltiplos campos)

- [ ] **Step 2: Inscrição pública grupo de 3**

- Preencher tamanhos para titular e 2 participantes
- Confirmar modal de ajuda no campo com imagem
- Confirmar ausência de `?` no campo sem imagem

- [ ] **Step 3: Validar persistência**

No Supabase (ou admin de inscrições):

- `adventures.custom_fields` contém `type: "tshirt_size"`, `options` e `helpImageUrl`
- `registrations.custom_data.tamanho_camiseta` = string escolhida
- `registrations.participants[0].tamanho_camiseta` = string escolhida

- [ ] **Step 4: Validar exportação CSV**

- Exportar inscrições da aventura
- Confirmar coluna com tamanho de camiseta para titular e participantes

- [ ] **Step 5: Registrar handoff**

Anotar verificações executadas, resultado e limitações restantes (se houver).
