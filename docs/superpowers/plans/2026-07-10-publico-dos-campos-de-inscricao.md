# Público dos Campos do Formulário de Inscrição — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover a promessa de campos de dados automáticos e permitir que o administrador escolha, em cada campo personalizado, se ele aparece para o contato principal, participantes adicionais ou todos.

**Architecture:** O contrato `CustomField` ganha `audience` opcional e uma camada pura resolve o fallback legado por tipo. O admin persiste `audience: "all"` em campos novos, enquanto o formulário público filtra os campos por pessoa, usa um renderer compartilhado para todos os tipos e separa as respostas entre `custom_data` e `participants`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, React Hook Form, Zod, Supabase JSONB, Tailwind CSS 3.4, shadcn/ui, `node:test` executado por `tsx` já presente no lockfile.

**Spec:** `docs/superpowers/specs/2026-07-10-publico-dos-campos-de-inscricao-design.md`

## Global Constraints

- Todo texto visível ao usuário deve permanecer em português do Brasil.
- Novos campos usam **Todos os participantes** por padrão.
- Aventuras podem ser salvas e receber inscrições com zero campos personalizados.
- Campos legados sem `audience` mantêm a regra atual: `select` e `multiselect` usam `primary`; os demais tipos usam `all`.
- Não migrar ou regravar em massa `adventures.custom_fields`, `registrations.custom_data` ou `registrations.participants`.
- Alterar o público de um campo afeta apenas inscrições futuras e nunca apaga respostas antigas.
- Tamanho do grupo, bateria, autorização de imagem, capacidade, lotes, preço e pagamento permanecem fora do construtor de campos.
- Não adicionar migration Supabase nem nova dependência npm.
- Não modificar componentes em `src/components/ui/`.

---

## File Structure

- `src/lib/types.ts` — contrato compartilhado de público e valores de participantes.
- `src/lib/registration-fields.ts` — única fonte das regras puras de público, defaults, obrigatoriedade e montagem de payload.
- `src/lib/registration-fields.test.ts` — testes de caracterização do fallback legado e das regras puras.
- `src/lib/registration-contact.ts` — derivação compatível de nome/contato com valores `string | string[]`.
- `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` — editor e persistência de `audience`.
- `src/app/(main)/adventures/[slug]/_components/dynamic-registration-field.tsx` — renderer isolado dos sete tipos de campo.
- `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` — separação por público, estado, validação e payload.
- `src/app/(admin)/admin/registrations/_lib/export-registrations.ts` — tipagem de respostas de participantes na exportação.
- `src/app/(admin)/admin/registrations/page.tsx` — consumidor verificado; nenhuma modificação é esperada.

---

### Task 1: Contrato e regras puras dos campos

**Files:**
- Modify: `src/lib/types.ts:1-12,87-103`
- Create: `src/lib/registration-fields.ts`
- Create: `src/lib/registration-fields.test.ts`

**Interfaces:**
- Consumes: `CustomField`, `RegistrationCustomData` e `RegistrationCustomValue` de `src/lib/types.ts`.
- Produces: `CustomFieldAudience`, `RegistrationParticipantData`, `resolveCustomFieldAudience()`, `filterCustomFieldsForTarget()`, `createCustomFieldDefaults()`, `isRequiredCustomValueFilled()` e `buildCustomFieldPayload()`.

- [ ] **Step 1: Escrever testes que caracterizam compatibilidade, público e valores**

Criar `src/lib/registration-fields.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import type { CustomField } from "./types";
import {
  buildCustomFieldPayload,
  createCustomFieldDefaults,
  filterCustomFieldsForTarget,
  isRequiredCustomValueFilled,
  resolveCustomFieldAudience,
} from "./registration-fields";

function field(overrides: Partial<CustomField>): CustomField {
  return {
    name: "campo",
    label: "Campo",
    type: "text",
    required: false,
    ...overrides,
  };
}

test("resolve o público legado sem alterar o comportamento atual", () => {
  assert.equal(resolveCustomFieldAudience(field({ type: "text" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "email" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "tel" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "number" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "tshirt_size" })), "all");
  assert.equal(resolveCustomFieldAudience(field({ type: "select" })), "primary");
  assert.equal(resolveCustomFieldAudience(field({ type: "multiselect" })), "primary");
});

test("público explícito prevalece sobre o fallback do tipo", () => {
  assert.equal(
    resolveCustomFieldAudience(field({ type: "select", audience: "additional" })),
    "additional"
  );
  assert.equal(
    resolveCustomFieldAudience(field({ type: "text", audience: "primary" })),
    "primary"
  );
});

test("filtra campos para contato principal e participantes adicionais", () => {
  const fields = [
    field({ name: "principal", audience: "primary" }),
    field({ name: "adicionais", audience: "additional" }),
    field({ name: "todos", audience: "all" }),
    field({ name: "selecao_legada", type: "select" }),
    field({ name: "texto_legado", type: "text" }),
  ];

  assert.deepEqual(
    filterCustomFieldsForTarget(fields, "primary").map((item) => item.name),
    ["principal", "todos", "selecao_legada", "texto_legado"]
  );
  assert.deepEqual(
    filterCustomFieldsForTarget(fields, "additional").map((item) => item.name),
    ["adicionais", "todos", "texto_legado"]
  );
});

test("cria defaults compatíveis com campos simples e multiselect", () => {
  assert.deepEqual(
    createCustomFieldDefaults([
      field({ name: "nome", type: "text" }),
      field({ name: "preferencias", type: "multiselect" }),
    ]),
    { nome: "", preferencias: [] }
  );
});

test("valida obrigatoriedade de string e seleção múltipla", () => {
  assert.equal(isRequiredCustomValueFilled(field({ required: false }), undefined), true);
  assert.equal(isRequiredCustomValueFilled(field({ required: true }), "  "), false);
  assert.equal(isRequiredCustomValueFilled(field({ required: true }), "ok"), true);
  assert.equal(
    isRequiredCustomValueFilled(field({ type: "multiselect", required: true }), []),
    false
  );
  assert.equal(
    isRequiredCustomValueFilled(
      field({ type: "multiselect", required: true }),
      ["", "Trilha"]
    ),
    true
  );
});

test("monta payload apenas com os campos recebidos e preserva arrays", () => {
  const fields = [
    field({ name: "nome", type: "text" }),
    field({ name: "preferencias", type: "multiselect" }),
  ];

  assert.deepEqual(
    buildCustomFieldPayload(fields, {
      nome: "Ana",
      preferencias: ["Manhã", "Tarde"],
      campo_de_outro_publico: "não copiar",
    }),
    { nome: "Ana", preferencias: ["Manhã", "Tarde"] }
  );
});
```

- [ ] **Step 2: Executar os testes e confirmar a falha inicial**

Run:

```bash
npx --no-install tsx --test src/lib/registration-fields.test.ts
```

Expected: FAIL com `Cannot find module './registration-fields'`.

- [ ] **Step 3: Ampliar os tipos compartilhados**

Em `src/lib/types.ts`, substituir o início do arquivo por:

```ts
export type CustomFieldAudience = "primary" | "additional" | "all";

export type CustomField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "multiselect" | "tshirt_size";
  required: boolean;
  audience?: CustomFieldAudience;
  options?: string[];
  helpImageUrl?: string;
};

export type RegistrationCustomValue = string | string[];

export type RegistrationCustomData = Record<string, RegistrationCustomValue>;

export type RegistrationParticipantData = RegistrationCustomData;
```

No type `Registration`, substituir:

```ts
participants?: Record<string, string>[];
```

por:

```ts
participants?: RegistrationParticipantData[];
```

- [ ] **Step 4: Implementar a única fonte das regras de público e valores**

Criar `src/lib/registration-fields.ts`:

```ts
import type {
  CustomField,
  CustomFieldAudience,
  RegistrationCustomData,
  RegistrationCustomValue,
} from "@/lib/types";

export type CustomFieldTarget = "primary" | "additional";

export function resolveCustomFieldAudience(
  field: Pick<CustomField, "type" | "audience">
): CustomFieldAudience {
  if (field.audience) {
    return field.audience;
  }

  return field.type === "select" || field.type === "multiselect"
    ? "primary"
    : "all";
}

export function filterCustomFieldsForTarget(
  fields: CustomField[],
  target: CustomFieldTarget
): CustomField[] {
  return fields.filter((field) => {
    const audience = resolveCustomFieldAudience(field);
    return audience === "all" || audience === target;
  });
}

export function getCustomFieldDefaultValue(
  field: CustomField
): RegistrationCustomValue {
  return field.type === "multiselect" ? [] : "";
}

export function createCustomFieldDefaults(
  fields: CustomField[]
): RegistrationCustomData {
  return Object.fromEntries(
    fields.map((field) => [field.name, getCustomFieldDefaultValue(field)])
  );
}

export function isRequiredCustomValueFilled(
  field: CustomField,
  value: RegistrationCustomValue | undefined
): boolean {
  if (!field.required) {
    return true;
  }

  if (field.type === "multiselect") {
    return (
      Array.isArray(value) &&
      value.some((selectedValue) => selectedValue.trim() !== "")
    );
  }

  return typeof value === "string" && value.trim() !== "";
}

export function buildCustomFieldPayload(
  fields: CustomField[],
  values: Record<string, RegistrationCustomValue | undefined> | undefined
): RegistrationCustomData {
  const payload: RegistrationCustomData = {};

  fields.forEach((field) => {
    const value = values?.[field.name];
    payload[field.name] =
      field.type === "multiselect"
        ? Array.isArray(value)
          ? value
          : []
        : typeof value === "string"
          ? value
          : "";
  });

  return payload;
}
```

- [ ] **Step 5: Executar testes e typecheck**

Run:

```bash
npx --no-install tsx --test src/lib/registration-fields.test.ts
npm run typecheck
```

Expected: 6 tests PASS; `tsc --noEmit` termina sem erros.

- [ ] **Step 6: Commitar o contrato e as regras puras**

```bash
git add src/lib/types.ts src/lib/registration-fields.ts src/lib/registration-fields.test.ts
git commit -m "feat: define publico dos campos de inscricao"
```

---

### Task 2: Configurar o público no construtor administrativo

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx:59-140,348-382,589-608,1359-1584`

**Interfaces:**
- Consumes: `CustomFieldAudience` de `@/lib/types` e `resolveCustomFieldAudience()` de `@/lib/registration-fields`.
- Produces: `custom_fields[*].audience` explícito em todo campo novo, preservando `undefined` em campos legados não alterados.

- [ ] **Step 1: Adicionar o público opcional ao schema do admin**

Ampliar o import de tipos e importar o resolver:

```ts
import type {
  Adventure,
  BateriaAvailability,
  CustomFieldAudience,
  LoteAvailability,
} from "@/lib/types";
import { resolveCustomFieldAudience } from "@/lib/registration-fields";
```

Logo após `customFieldTypes`, adicionar:

```ts
const customFieldAudiences = ["primary", "additional", "all"] as const;
```

Dentro de `customFieldSchema`, após `required`, adicionar:

```ts
audience: z.enum(customFieldAudiences).optional(),
```

- [ ] **Step 2: Preservar `audience` ausente ao carregar e salvar campos legados**

Não preencher `audience` em `defaultValues`. O spread `...customField` existente deve mantê-lo ausente quando o JSON legado não o contém. Da mesma forma, a normalização de `normalizedCustomFields` deve continuar usando spread/desestruturação sem inserir um fallback.

Confirmar com estes invariantes no código existente:

```ts
const base = {
  ...customField,
  options: normalizeSelectionOptions(customField.options),
};
```

e:

```ts
const { options: _options, helpImageUrl: _help, ...simpleField } = customField;
return simpleField;
```

Não substituir `audience: undefined` por `"all"` durante load ou save; somente o botão de criar campo define o novo padrão.

- [ ] **Step 3: Remover o aviso de campos automáticos e atualizar o texto de apoio**

Substituir o trecho entre o título do construtor e `Campos Personalizados` por:

```tsx
<h3 className="text-xl font-headline font-semibold mb-4">
  Construtor de Formulário de Inscrição
</h3>
<FormDescription className="mb-4">
  Crie apenas os campos necessários e escolha para quem cada um aparece. É permitido salvar a aventura sem campos personalizados.
</FormDescription>

<h4 className="text-sm font-medium text-muted-foreground mb-3">
  Campos Personalizados
</h4>
```

Remover integralmente o comentário `{/* Campos fixos do sistema */}` e o card **Campos do Sistema (incluídos automaticamente)**.

- [ ] **Step 4: Renderizar o seletor “Exibir para” em cada cartão**

Dentro do `fields.map`, calcular o público exibido sem persistir o fallback:

```ts
const customFieldAudience = form.watch(
  `customFields.${index}.audience` as const
) as CustomFieldAudience | undefined;
const effectiveAudience = resolveCustomFieldAudience({
  type: customFieldType,
  audience: customFieldAudience,
});
```

Alterar a grid principal do cartão para acomodar cinco controles:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
```

Adicionar este `FormField` depois do seletor **Tipo** e antes do bloco **Obrigatório**:

```tsx
<FormField
  control={form.control}
  name={`customFields.${index}.audience` as const}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Exibir para</FormLabel>
      <Select
        onValueChange={field.onChange}
        value={field.value ?? effectiveAudience}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o público" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="primary">Contato principal</SelectItem>
          <SelectItem value="additional">Participantes adicionais</SelectItem>
          <SelectItem value="all">Todos os participantes</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

O uso de `field.value ?? effectiveAudience` mostra o fallback legado, mas não chama `onChange` e não regrava o JSON por apenas abrir o editor.

- [ ] **Step 5: Definir `all` somente em campos novos**

Substituir o `append` do botão **Adicionar Campo Personalizado** por:

```tsx
onClick={() =>
  append({
    name: "",
    label: "",
    type: "text",
    required: false,
    audience: "all",
  })
}
```

- [ ] **Step 6: Verificar o construtor**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: typecheck PASS; lint PASS ou somente warnings preexistentes sem novos erros.

Verificação manual em `/admin/adventures/new`:

1. O card de campos automáticos não existe.
2. Salvar sem campos personalizados é permitido.
3. Novo campo mostra **Todos os participantes**.
4. Trocar para cada uma das outras opções e salvar persiste o valor.
5. Em aventura antiga, `select` legado mostra **Contato principal** e `text` legado mostra **Todos os participantes**.

- [ ] **Step 7: Commitar o construtor**

```bash
git add 'src/app/(admin)/admin/adventures/_components/adventure-form.tsx'
git commit -m "feat(admin): configura publico dos campos"
```

---

### Task 3: Extrair o renderer reutilizável dos campos públicos

**Files:**
- Create: `src/app/(main)/adventures/[slug]/_components/dynamic-registration-field.tsx`
- Read: `src/app/(main)/adventures/[slug]/_components/tshirt-size-field.tsx`

**Interfaces:**
- Consumes: `CustomField` e `RegistrationCustomValue` de `@/lib/types`.
- Produces: `DynamicRegistrationField(props)` que renderiza qualquer tipo sem conhecer a posição no formulário ou a persistência.

- [ ] **Step 1: Criar o componente compartilhado completo**

Criar `src/app/(main)/adventures/[slug]/_components/dynamic-registration-field.tsx`:

```tsx
"use client";

import type { RefCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CustomField,
  RegistrationCustomValue,
} from "@/lib/types";
import { TshirtSizeField } from "./tshirt-size-field";

type DynamicRegistrationFieldProps = {
  customField: CustomField;
  value: RegistrationCustomValue | undefined;
  onChange: (value: RegistrationCustomValue) => void;
  onBlur?: () => void;
  name: string;
  inputRef?: RefCallback<HTMLInputElement>;
};

export function DynamicRegistrationField({
  customField,
  value,
  onChange,
  onBlur,
  name,
  inputRef,
}: DynamicRegistrationFieldProps) {
  const label = (
    <>
      {customField.label}
      {customField.required && <span className="text-destructive">*</span>}
    </>
  );

  if (customField.type === "tshirt_size") {
    return (
      <TshirtSizeField
        label={customField.label}
        required={customField.required}
        options={customField.options ?? []}
        helpImageUrl={customField.helpImageUrl}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        name={name}
        onBlur={onBlur}
      />
    );
  }

  if (customField.type === "select") {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select
          onValueChange={onChange}
          value={typeof value === "string" ? value : ""}
        >
          <FormControl>
            <SelectTrigger onBlur={onBlur} name={name}>
              <SelectValue
                placeholder={`Selecione ${customField.label.toLowerCase()}`}
              />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {(customField.options ?? []).map((option) => (
              <SelectItem key={`${customField.name}-${option}`} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    );
  }

  if (customField.type === "multiselect") {
    const selectedValues = Array.isArray(value) ? value : [];

    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="space-y-2">
          {(customField.options ?? []).map((option) => {
            const checked = selectedValues.includes(option);
            return (
              <div
                key={`${customField.name}-${option}`}
                className="flex items-center gap-2"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    onChange(
                      isChecked === true
                        ? Array.from(new Set([...selectedValues, option]))
                        : selectedValues.filter(
                            (selectedValue) => selectedValue !== option
                          )
                    );
                  }}
                />
                <span className="text-sm font-normal">{option}</span>
              </div>
            );
          })}
        </div>
        <FormMessage />
      </FormItem>
    );
  }

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <Input
          placeholder={customField.label}
          type={customField.type}
          name={name}
          value={typeof value === "string" ? value : ""}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          ref={inputRef}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
```

- [ ] **Step 2: Executar o typecheck do componente isolado**

Run:

```bash
npm run typecheck
```

Expected: PASS. `DynamicRegistrationField.onChange` aceita `string | string[]`, portanto é compatível com o `string` emitido por `TshirtSizeField`.

- [ ] **Step 3: Commitar o renderer**

```bash
git add 'src/app/(main)/adventures/[slug]/_components/dynamic-registration-field.tsx'
git commit -m "refactor: extrai renderer dos campos de inscricao"
```

---

### Task 4: Aplicar o público no estado, validação, interface e payload

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx:1-145,301-465,640-928`

**Interfaces:**
- Consumes: helpers de `@/lib/registration-fields`, `RegistrationParticipantData` e `DynamicRegistrationField`.
- Produces: `custom_data` somente com campos do contato principal e `participants[]` somente com campos aplicáveis aos adicionais, aceitando `string[]`.

- [ ] **Step 1: Trocar funções locais pelos helpers compartilhados**

Alterar imports de React e React Hook Form:

```ts
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
```

Remover somente o import direto de `TshirtSizeField`. Manter `Checkbox` para a autorização de imagem e manter `FormControl`, `FormItem`, `FormLabel`, `FormMessage`, `Input` e o conjunto `Select*`, pois tamanho do grupo e baterias ainda dependem deles.

Adicionar:

```ts
import type {
  BateriaAvailability,
  CustomField,
  RegistrationCustomData,
  RegistrationCustomValue,
  RegistrationParticipantData,
} from "@/lib/types";
import {
  buildCustomFieldPayload,
  createCustomFieldDefaults,
  filterCustomFieldsForTarget,
  isRequiredCustomValueFilled,
} from "@/lib/registration-fields";
import { DynamicRegistrationField } from "./dynamic-registration-field";
```

Remover completamente `SimpleCustomFieldType`, `SimpleCustomField`, `isSimpleCustomField()`, `isTshirtSizeField()`, `isParticipantCustomField()` e a implementação local de `isRequiredCustomValueFilled()`.

- [ ] **Step 2: Permitir arrays no schema dos participantes**

Manter:

```ts
const customDataValueSchema = z.union([z.string(), z.array(z.string())]);
```

e substituir o schema de participante por:

```ts
const participantSchema = z
  .object({
    bateriaId: z.string().optional(),
  })
  .catchall(customDataValueSchema);
```

Isso permite que `multiselect` use `string[]` sem transformar `bateriaId` em resposta personalizada.

- [ ] **Step 3: Separar os campos e defaults por público**

Substituir `allCustomFields`, `participantCustomFields` e `initialCustomData` por:

```ts
const allCustomFields = useMemo(() => customFields ?? [], [customFields]);
const primaryFields = useMemo(
  () => filterCustomFieldsForTarget(allCustomFields, "primary"),
  [allCustomFields]
);
const additionalFields = useMemo(
  () => filterCustomFieldsForTarget(allCustomFields, "additional"),
  [allCustomFields]
);
const initialCustomData = useMemo(
  () => createCustomFieldDefaults(primaryFields),
  [primaryFields]
);
```

Manter `customData: initialCustomData` nos `defaultValues`.

- [ ] **Step 4: Criar participantes somente com seus campos aplicáveis**

Substituir o efeito que sincroniza `groupSize` e `participants` por:

```ts
useEffect(() => {
  if (hasLotes) return;
  const desiredParticipantCount = Math.max(0, groupSize - 1);
  const currentParticipantCount = fields.length;

  if (desiredParticipantCount > currentParticipantCount) {
    const newFields: Array<RegistrationCustomData & { bateriaId: string }> = [];

    for (let i = 0; i < desiredParticipantCount - currentParticipantCount; i++) {
      newFields.push({
        bateriaId: "",
        ...createCustomFieldDefaults(additionalFields),
      });
    }

    append(newFields);
  } else if (desiredParticipantCount < currentParticipantCount) {
    remove(
      Array.from(
        { length: currentParticipantCount - desiredParticipantCount },
        (_, i) => desiredParticipantCount + i
      )
    );
  }
}, [
  additionalFields,
  append,
  fields.length,
  groupSize,
  hasLotes,
  remove,
]);
```

- [ ] **Step 5: Validar somente os campos aplicáveis a cada pessoa**

No começo de `onSubmit`, substituir os dois loops de validação por:

```ts
primaryFields.forEach((field) => {
  const customValue = values.customData?.[field.name];
  if (!isRequiredCustomValueFilled(field, customValue)) {
    form.setError(`customData.${field.name}` as const, {
      type: "manual",
      message: `${field.label} é obrigatório.`,
    });
    isValid = false;
  }
});

values.participants.forEach((participant, participantIndex) => {
  additionalFields.forEach((field) => {
    const participantValue = participant[field.name];
    if (!isRequiredCustomValueFilled(field, participantValue)) {
      form.setError(
        `participants.${participantIndex}.${field.name}` as const,
        {
          type: "manual",
          message: `${field.label} é obrigatório.`,
        }
      );
      isValid = false;
    }
  });
});
```

Um campo `additional` obrigatório não é validado quando `participants` está vazio.

- [ ] **Step 6: Montar payloads separados e preservar arrays**

No bloco `try`, substituir a montagem manual de `customDataPayload` e `participantsPayload` por:

```ts
const customDataPayload = buildCustomFieldPayload(
  primaryFields,
  values.customData
);

if (requiresImageConsent) {
  customDataPayload[IMAGE_CONSENT_KEY] = "Sim";
}

const contactFields = deriveLegacyContactFields(
  primaryFields,
  customDataPayload
);

const participantsPayload: RegistrationParticipantData[] =
  values.participants.map((participant) => {
    const participantPayload = buildCustomFieldPayload(
      additionalFields,
      participant
    ) as RegistrationParticipantData;

    participantPayload.name = deriveParticipantDisplayName(
      additionalFields,
      participantPayload
    );

    return participantPayload;
  });
```

Manter o payload da RPC sem alterar nomes ou estrutura:

```ts
p_name: contactFields.name,
p_email: contactFields.email,
p_phone: contactFields.phone,
p_group_size: values.groupSize,
p_participants: participantsPayload,
p_custom_data: customDataPayload,
p_bateria_assignments: bateriaAssignments,
```

- [ ] **Step 7: Usar o renderer compartilhado no contato principal**

Substituir o heading e o `allCustomFields.map` por:

```tsx
{primaryFields.length > 0 ? (
  <h3 className="text-lg font-medium">Informações da inscrição</h3>
) : allCustomFields.length === 0 ? (
  <p className="text-sm text-muted-foreground">
    Nenhum campo adicional configurado para esta aventura.
  </p>
) : null}

{primaryFields.map((customField) => (
  <FormField
    key={customField.name}
    control={form.control}
    name={`customData.${customField.name}` as const}
    render={({ field }) => (
      <DynamicRegistrationField
        customField={customField}
        value={field.value as RegistrationCustomValue | undefined}
        onChange={field.onChange}
        onBlur={field.onBlur}
        name={field.name}
        inputRef={field.ref}
      />
    )}
  />
))}
```

Manter o seletor de bateria principal antes dos campos ou na posição atual; ele não entra em `primaryFields`.

- [ ] **Step 8: Usar o renderer compartilhado nos participantes adicionais**

Substituir o separador anterior aos participantes por:

```tsx
{!hasLotes &&
  fields.length > 0 &&
  (hasBaterias || additionalFields.length > 0) && <Separator />}
```

Renderizar blocos de participantes somente quando houver bateria ou campo adicional:

```tsx
{!hasLotes &&
  (hasBaterias || additionalFields.length > 0) &&
  fields.map((participantField, index) => (
    <div
      key={participantField.id}
      className="space-y-4 border-l-4 border-secondary pl-4 py-4"
    >
      <h3 className="text-lg font-medium">
        Dados do Participante {index + 2}
      </h3>

      {hasBaterias && bateriasState && (
        <FormField
          control={form.control}
          name={`participants.${index}.bateriaId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bateria</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={typeof field.value === "string" ? field.value : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma bateria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {bateriasState.map((b) => {
                    const available = computeAvailableForBateria(b.id, index);
                    const disabled =
                      available < 1 && field.value !== b.id;
                    return (
                      <SelectItem
                        key={b.id}
                        value={b.id}
                        disabled={disabled}
                      >
                        {b.label} — {b.start_time.slice(0, 5)}-
                        {b.end_time.slice(0, 5)}{" "}
                        {disabled
                          ? "(sem vagas)"
                          : `(${Math.max(available, 0)} ${
                              available === 1 ? "vaga" : "vagas"
                            })`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {additionalFields.map((customField) => (
        <FormField
          key={customField.name}
          control={form.control}
          name={`participants.${index}.${customField.name}` as const}
          render={({ field }) => (
            <DynamicRegistrationField
              customField={customField}
              value={field.value as RegistrationCustomValue | undefined}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              inputRef={field.ref}
            />
          )}
        />
      ))}
    </div>
  ))}
```

O bloco acima continua chamando `computeAvailableForBateria()` e mantém uma bateria por pessoa fora dos campos configuráveis.

- [ ] **Step 9: Executar testes e verificações estáticas**

Run:

```bash
npx --no-install tsx --test src/lib/registration-fields.test.ts
npm run typecheck
npm run lint
```

Expected: 6 tests PASS; typecheck PASS; lint sem novos erros.

- [ ] **Step 10: Commitar a integração pública**

```bash
git add 'src/app/(main)/adventures/[slug]/_components/registration-form.tsx'
git commit -m "feat: aplica publico no formulario de inscricao"
```

---

### Task 5: Ajustar compatibilidade de contato e exportação

**Files:**
- Modify: `src/lib/registration-contact.ts:14-98`
- Modify: `src/app/(admin)/admin/registrations/_lib/export-registrations.ts:154-168`
- Verify: `src/app/(admin)/admin/registrations/page.tsx:344-399`

**Interfaces:**
- Consumes: `RegistrationCustomData` e `RegistrationParticipantData` ampliados na Task 1.
- Produces: derivação segura de nomes quando os dados podem ser arrays e exportação de arrays como texto, sem expor e-mails `@interno.local`.

- [ ] **Step 1: Tornar a derivação do nome do participante segura para arrays**

Em `src/lib/registration-contact.ts`, substituir `deriveParticipantDisplayName` por:

```ts
export function deriveParticipantDisplayName(
  fields: CustomField[],
  values: RegistrationCustomData
): string {
  const textFields = fields.filter((field) => field.type === "text");
  const nameField =
    textFields.find(
      (field) =>
        /nome/i.test(field.label) ||
        field.name === "nome" ||
        field.name === "name"
    ) ?? textFields[0];

  const value = nameField ? values[nameField.name] : undefined;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "—";
}
```

Simplificar a assinatura de `formatCustomDataEntries` para o contrato comum:

```ts
export function formatCustomDataEntries(
  customData: RegistrationCustomData | undefined,
  options?: FormatCustomDataOptions
): { label: string; value: string }[] {
```

O corpo atual já trata arrays corretamente e permanece igual.

- [ ] **Step 2: Unificar a tipagem da exportação**

Em `export-registrations.ts`, substituir o import de tipos por:

```ts
import type { Registration, RegistrationCustomData } from "@/lib/types";
```

Depois, substituir a assinatura de `mapCustomValues` por:

```ts
function mapCustomValues(
  customColumns: ExportRegistrationsCustomColumn[],
  values: RegistrationCustomData | undefined
) {
```

Manter `normalizeTextCellValue()`: arrays continuam convertidos pelo `normalizeCellValue()` existente e e-mails internos continuam filtrados por `isPlaceholderRegistrationEmail()`.

- [ ] **Step 3: Verificar a página administrativa sem refactor desnecessário**

Confirmar que estas chamadas compilam sem casts:

```tsx
formatCustomDataEntries(reg.custom_data)
formatCustomDataEntries(p, { excludeKeys: ["name"] })
```

`RegistrationParticipantData` é um alias de `RegistrationCustomData`, portanto essas chamadas devem compilar sem casts. Não alterar `page.tsx` nem duplicar normalização na página.

- [ ] **Step 4: Executar testes e typecheck**

Run:

```bash
npx --no-install tsx --test src/lib/registration-fields.test.ts
npm run typecheck
```

Expected: 6 tests PASS e typecheck PASS.

- [ ] **Step 5: Commitar compatibilidade administrativa**

```bash
git add src/lib/registration-contact.ts 'src/app/(admin)/admin/registrations/_lib/export-registrations.ts'
git commit -m "fix: preserva respostas multivalor de participantes"
```

---

### Task 6: Verificação completa e regressões

**Files:**
- Verify: all files changed in Tasks 1-5
- Verify: `src/app/(main)/adventures/[slug]/page.tsx`
- Verify: Supabase RPC call remains unchanged

**Interfaces:**
- Consumes: feature completa.
- Produces: evidência de testes estáticos, build e cenários manuais; working tree limpo.

- [ ] **Step 1: Rodar toda a verificação automatizada**

Run:

```bash
npx --no-install tsx --test src/lib/registration-fields.test.ts
npm run typecheck
npm run lint
npm run build
```

Expected:

- 6 testes PASS;
- `tsc --noEmit` sem erros;
- lint sem novos erros;
- build de produção concluído.

Se lint ou build falhar por problema preexistente, registrar o comando, a mensagem exata e confirmar que nenhum arquivo da feature introduziu o erro antes de prosseguir.

- [ ] **Step 2: Verificar criação e edição no admin**

Run:

```bash
npm run dev
```

Abrir `/admin/adventures/new` e verificar:

1. Nenhum card afirma que Nome, E-mail ou Telefone são automáticos.
2. Aventura sem campo personalizado salva.
3. Novo campo começa em **Todos os participantes**.
4. **Contato principal**, **Participantes adicionais** e **Todos os participantes** persistem após salvar e reabrir.
5. Aventura antiga mostra o público legado equivalente e mantém seus campos.

- [ ] **Step 3: Verificar formulário público sem campos**

Abrir uma aventura nova sem `custom_fields`:

1. O formulário não mostra Nome, E-mail, Telefone ou Nome do participante.
2. Uma inscrição individual é criada normalmente.
3. A tela administrativa não exibe o e-mail interno como dado do usuário.
4. Exportação deixa a célula de e-mail vazia para o placeholder interno.

- [ ] **Step 4: Verificar os três públicos e obrigatoriedade**

Configurar uma aventura com:

- `CPF`, texto obrigatório, público `primary`;
- `Restrição`, texto obrigatório, público `additional`;
- `Camiseta`, `tshirt_size` obrigatório, público `all`;
- `Turno`, `select` obrigatório, público `additional`;
- `Preferências`, `multiselect` obrigatório, público `additional`.

No público:

1. CPF aparece somente uma vez.
2. Restrição, Turno e Preferências aparecem em cada participante adicional.
3. Camiseta aparece para todas as pessoas.
4. Grupo de uma pessoa não é bloqueado pelos campos `additional` obrigatórios.
5. Grupo de duas ou mais pessoas exige os campos de cada participante.
6. Multiselect de participante é salvo e exibido como lista separada por vírgulas.

- [ ] **Step 5: Verificar fluxos operacionais preservados**

Executar uma inscrição em:

1. aventura comum com limite de vagas;
2. aventura com bateria, escolhendo uma bateria por pessoa;
3. aventura com lote, confirmando grupo unitário e preço do lote;
4. aventura com direito de imagem, confirmando o checkbox obrigatório;
5. aventura com PIX, confirmando o redirecionamento e token de pagamento.

Expected: nenhuma regra operacional muda em relação ao comportamento anterior.

- [ ] **Step 6: Confirmar escopo e histórico Git**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: working tree limpo; commits separados para contrato, admin, renderer, integração pública e compatibilidade.
