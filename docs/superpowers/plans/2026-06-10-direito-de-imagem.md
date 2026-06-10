# Direito de Imagem por Aventura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toggle "Direito de Imagem" no admin de aventuras que, quando ativo, exige um checkbox obrigatório de autorização de uso de imagem no formulário público de inscrição, gravando o aceite em `custom_data`.

**Architecture:** Nova coluna `image_rights_enabled` em `adventures` (migration 014). O admin liga/desliga via `Switch` no `AdventureForm` (mesmo padrão de `registrationsEnabled`). O formulário público recebe a flag por prop, valida o checkbox via Zod `superRefine` (bloqueia o submit — e portanto o avanço ao pagamento) e grava `custom_data["autorizacao_de_uso_de_imagem"] = "Sim"` no payload do RPC existente. Sem mudança em RPCs, RLS ou na tabela `registrations`. Admin de inscrições e export XLSX exibem o aceite automaticamente (formatadores genéricos de `custom_data`).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, React Hook Form + Zod, shadcn/ui (`Switch`, `Checkbox`), Supabase (PostgreSQL, migration SQL).

**Spec:** `docs/superpowers/specs/2026-06-10-direito-de-imagem-design.md`

> **Sobre testes:** O projeto não tem framework de testes (CLAUDE.md). Validação via `npm run typecheck`, `npm run lint` e teste manual no dev server (`npm run dev`, porta 9002). Para SQL, usar Supabase MCP `apply_migration` no projeto `iyvtoeoeytueoeromdwi` (produção ainda grava no Supabase **cloud** — a migração para VPS está em andamento e o banco local está congelado; o cloud é o ambiente correto).

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/014_image_rights.sql` | Criar | Coluna `image_rights_enabled` em `adventures` |
| `src/lib/types.ts` | Modificar | Campo `image_rights_enabled` no type `Adventure` |
| `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` | Modificar | Toggle no schema Zod, defaultValues, `adventureData` e JSX |
| `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` | Modificar | Constantes, prop, campo `imageConsent` + `superRefine`, checkbox, payload |
| `src/app/(main)/adventures/[slug]/page.tsx` | Modificar | Coluna no SELECT explícito + prop `requiresImageConsent` |

---

### Task 1: Migration e tipo `Adventure`

**Files:**
- Create: `supabase/migrations/014_image_rights.sql`
- Modify: `src/lib/types.ts` (type `Adventure`, ~linha 64)

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- supabase/migrations/014_image_rights.sql
-- Toggle de direito de imagem por aventura: quando ativo, o formulário
-- público exige aceite de autorização de uso de imagem para inscrever.

ALTER TABLE adventures
  ADD COLUMN image_rights_enabled boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Aplicar a migração no Supabase**

Chamar MCP `apply_migration` com:
- `project_id`: `iyvtoeoeytueoeromdwi`
- `name`: `014_image_rights`
- `query`: conteúdo SQL do Step 1

Esperado: sucesso sem erros. (Se o MCP não estiver disponível na sessão, avisar o usuário para aplicar o SQL no SQL Editor do projeto cloud — não pular silenciosamente.)

- [ ] **Step 3: Verificar a coluna**

Chamar MCP `execute_sql` (ou SQL Editor) com:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'adventures' AND column_name = 'image_rights_enabled';
```

Esperado: 1 linha, `boolean`, default `false`.

- [ ] **Step 4: Adicionar o campo ao type `Adventure`**

Em `src/lib/types.ts`, no type `Adventure`, adicionar `image_rights_enabled` após `has_lotes`:

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

Esperado: PASS (nenhum consumidor exige o campo ainda; leituras existentes usam `select('*')` no admin ou cast).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/014_image_rights.sql src/lib/types.ts
git commit -m "feat(direito-imagem): adiciona coluna image_rights_enabled em adventures"
```

---

### Task 2: Toggle no formulário admin

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

Quatro edições no mesmo arquivo, todas ancoradas no campo `registrationsEnabled` existente.

- [ ] **Step 1: Adicionar o campo ao schema Zod**

No objeto do `adventureSchema` (~linha 193), logo após `registrationsEnabled: z.boolean(),`:

```ts
    registrationsEnabled: z.boolean(),
    imageRightsEnabled: z.boolean(),
    hasBaterias: z.boolean(),
```

- [ ] **Step 2: Adicionar o defaultValue**

Em `defaultValues` do `useForm` (~linha 359), logo após `registrationsEnabled: adventure?.registrations_enabled ?? true,`:

```ts
      registrationsEnabled: adventure?.registrations_enabled ?? true,
      imageRightsEnabled: adventure?.image_rights_enabled ?? false,
      hasBaterias: adventure?.has_baterias ?? false,
```

- [ ] **Step 3: Adicionar a chave snake_case em `adventureData`**

No objeto `adventureData` dentro de `onSubmit` (~linha 619), logo após `registrations_enabled: values.registrationsEnabled,`:

```ts
      registrations_enabled: values.registrationsEnabled,
      image_rights_enabled: values.imageRightsEnabled,
      custom_fields: normalizedCustomFields,
```

(Vale para criação e edição — o insert usa `{ ...adventureData, has_baterias: false, has_lotes: false }`, então a flag entra nos dois caminhos. Não passa por RPC, igual `registrations_enabled`.)

- [ ] **Step 4: Adicionar o toggle no JSX**

Na coluna direita do form, inserir este `FormField` **entre** o `FormField` de `registrationsEnabled` (que termina em `/>`) e o `FormField` de `hasBaterias` (~linha 961):

```tsx
            <FormField
              control={form.control}
              name="imageRightsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Direito de Imagem</FormLabel>
                    <FormDescription>
                      Exige que o inscrito autorize o uso de sua imagem para concluir a inscrição.
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

(`Switch`, `FormField`, `FormItem`, `FormLabel`, `FormDescription` e `FormControl` já estão importados no arquivo.)

- [ ] **Step 5: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`

Esperado: PASS nos dois.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/admin/adventures/_components/adventure-form.tsx"
git commit -m "feat(direito-imagem): toggle de direito de imagem no form admin de aventura"
```

---

### Task 3: Checkbox obrigatório no formulário público

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

Sete edições no mesmo arquivo. `Checkbox` já está importado (linha ~10).

- [ ] **Step 1: Adicionar as constantes do termo**

Logo após `const PIX_MAX_GROUP_SIZE = 4;` (~linha 87):

```ts
const IMAGE_CONSENT_KEY = "autorizacao_de_uso_de_imagem";
const IMAGE_CONSENT_TEXT =
  "Autorizo, de forma gratuita e por prazo indeterminado, o uso da minha imagem — e declaro ter autorização dos demais participantes inscritos por mim — em fotos e vídeos captados durante a aventura, para divulgação das atividades em redes sociais, site e materiais promocionais.";
```

(A chave é propositalmente **sem acentos**: os formatadores de rótulo do admin/XLSX — `formatFieldNameFromKey` e `formatFieldLabel` — fazem Title Case com regex `\w` e quebrariam a capitalização com caracteres acentuados.)

- [ ] **Step 2: Estender `createRegistrationSchema`**

Substituir a função inteira (~linhas 89-135) por esta versão — mudanças: 4º parâmetro `requiresImageConsent`, campo `imageConsent: z.boolean()` no objeto e bloco novo no início do `superRefine` (antes do `if (!hasBaterias) return;`, que abortaria a checagem):

```ts
function createRegistrationSchema(
  remainingSpots: number | null,
  hasBaterias: boolean,
  hasLotes: boolean,
  requiresImageConsent: boolean
) {
  let groupSizeSchema: z.ZodType<number> = hasLotes
    ? z.literal(1)
    : z
        .coerce.number()
        .int("Use um número inteiro.")
        .min(1, "O grupo deve ter pelo menos 1 pessoa.")
        .max(PIX_MAX_GROUP_SIZE, `O grupo pode ter no máximo ${PIX_MAX_GROUP_SIZE} pessoas.`);

  if (!hasLotes && remainingSpots !== null) {
    groupSizeSchema = (groupSizeSchema as z.ZodNumber).max(
      remainingSpots,
      `Restam apenas ${remainingSpots} ${remainingSpots === 1 ? "vaga" : "vagas"} para esta aventura.`
    );
  }

  return z
    .object({
      groupSize: groupSizeSchema,
      customData: z.record(customDataValueSchema).optional(),
      participants: z.array(participantSchema),
      principalBateriaId: z.string().optional(),
      imageConsent: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (requiresImageConsent && data.imageConsent !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Você precisa autorizar o uso de imagem para concluir a inscrição.",
          path: ["imageConsent"],
        });
      }
      if (!hasBaterias) return;
      if (!data.principalBateriaId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione uma bateria.",
          path: ["principalBateriaId"],
        });
      }
      data.participants.forEach((p, index) => {
        if (!p.bateriaId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selecione uma bateria.",
            path: ["participants", index, "bateriaId"],
          });
        }
      });
    });
}
```

- [ ] **Step 3: Adicionar a prop**

No type `RegistrationFormProps` (~linha 139), após `hasLotes?: boolean;`:

```ts
  hasLotes?: boolean;
  requiresImageConsent?: boolean;
```

E na desestruturação dos parâmetros do componente (~linha 234), após `hasLotes = false,`:

```ts
  hasLotes = false,
  requiresImageConsent = false,
```

- [ ] **Step 4: Atualizar o resolver e os defaultValues**

No `useForm` (~linha 294), passar o novo argumento e o default do checkbox:

```ts
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(
      createRegistrationSchema(remainingSpots, hasBaterias, hasLotes, requiresImageConsent)
    ),
    defaultValues: {
      groupSize: 1,
      customData: initialCustomData,
      participants: [],
      principalBateriaId: hasBaterias ? "" : undefined,
      imageConsent: false,
    },
  });
```

- [ ] **Step 5: Gravar o aceite no payload**

Em `onSubmit`, depois do `allCustomFields.forEach(...)` que monta `customDataPayload` e **antes** de `const contactFields = deriveLegacyContactFields(...)` (~linha 404):

```ts
      if (requiresImageConsent) {
        customDataPayload[IMAGE_CONSENT_KEY] = "Sim";
      }

      const contactFields = deriveLegacyContactFields(allCustomFields, customDataPayload);
```

- [ ] **Step 6: Renderizar o checkbox**

No JSX, inserir **entre** o fechamento dos blocos de participantes (`))}`) e o `<Button type="submit" ...>` (~linha 889):

```tsx
        {requiresImageConsent && (
          <FormField
            control={form.control}
            name="imageConsent"
            render={({ field }) => (
              <FormItem className="rounded-lg border p-4">
                <div className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal leading-snug">
                    {IMAGE_CONSENT_TEXT} <span className="text-destructive">*</span>
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
```

(Clicar no texto alterna o checkbox — `FormLabel` é ligado ao controle pelo contexto do `FormItem`. Erro de validação aparece no `FormMessage` e também no toast do `handleInvalid` existente.)

- [ ] **Step 7: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`

Esperado: PASS nos dois.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(main)/adventures/[slug]/_components/registration-form.tsx"
git commit -m "feat(direito-imagem): checkbox obrigatorio de uso de imagem na inscricao"
```

---

### Task 4: Propagar a flag na página pública

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/page.tsx`

- [ ] **Step 1: Adicionar a coluna ao SELECT explícito**

No `useFetchAdventure` (~linha 47), a string de colunas ganha `image_rights_enabled` (sem isso a flag chega `undefined` em runtime):

```ts
        .select(
          'id, slug, title, description, long_description, max_participants, price, duration, location, difficulty, image_url, image_description, registrations_enabled, has_baterias, has_lotes, image_rights_enabled, custom_fields, created_at'
        )
```

- [ ] **Step 2: Passar a prop ao `RegistrationForm`**

Na renderização (~linha 330):

```tsx
                    <RegistrationForm
                      adventureId={adventure.id}
                      adventureTitle={adventure.title}
                      adventureSlug={adventure.slug}
                      adventurePrice={displayPrice}
                      customFields={adventure.custom_fields}
                      remainingSpots={remainingSpots}
                      baterias={usesBaterias ? baterias : null}
                      hasLotes={usesLotes}
                      requiresImageConsent={adventure.image_rights_enabled}
                    />
```

- [ ] **Step 3: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`

Esperado: PASS nos dois.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/adventures/[slug]/page.tsx"
git commit -m "feat(direito-imagem): propaga flag de direito de imagem ao form publico"
```

---

### Task 5: Verificação manual de ponta a ponta

**Files:** nenhum (somente verificação).

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev` (porta 9002).

- [ ] **Step 2: Admin — toggle**

1. Logar como admin → `/admin/adventures` → editar uma aventura existente.
2. Ligar "Direito de Imagem" e salvar → reabrir a edição → toggle continua ligado.
3. Conferir no banco (MCP `execute_sql`): `SELECT image_rights_enabled FROM adventures WHERE id = '<id>';` → `true`.
4. Criar uma aventura nova sem mexer no toggle → flag `false` no banco.

- [ ] **Step 3: Público — aventura SEM a flag**

Abrir `/adventures/[slug]` de aventura com toggle desligado → **não** há checkbox; inscrição funciona como antes.

- [ ] **Step 4: Público — aventura COM a flag**

1. Abrir a aventura com toggle ligado → checkbox com o termo visível antes do botão "Inscreva-se Agora".
2. Preencher tudo e submeter **sem marcar** → toast de erro + mensagem "Você precisa autorizar o uso de imagem para concluir a inscrição."; **não** redireciona ao pagamento; nenhuma inscrição criada.
3. Marcar o checkbox e submeter → redireciona a `/adventures/[slug]/pagamento`.
4. Conferir no banco: `SELECT custom_data->>'autorizacao_de_uso_de_imagem' FROM registrations ORDER BY registration_date DESC LIMIT 1;` → `Sim`.
5. Repetir com grupo de 3 pessoas → um único checkbox cobre o grupo.

- [ ] **Step 5: Admin de inscrições e XLSX**

1. `/admin/registrations` → a inscrição com aceite mostra "Autorizacao De Uso De Imagem: Sim".
2. Exportar XLSX → coluna "Autorizacao De Uso De Imagem" com "Sim" na inscrição nova e vazio nas antigas.

- [ ] **Step 6: Gates finais**

Run: `npm run typecheck && npm run lint && npm run build`

Esperado: PASS nos três.
