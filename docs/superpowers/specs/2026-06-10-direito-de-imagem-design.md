# Direito de imagem por aventura

## Visão geral

Adicionar um toggle **"Direito de Imagem"** no formulário admin de criar/editar aventura. Quando ativo, o formulário público de inscrição exibe um **checkbox obrigatório** com o termo de autorização de uso de imagem — sem marcá-lo, o usuário não consegue concluir a inscrição (e, portanto, não chega à etapa de pagamento PIX, já que o submit do formulário é o que cria a inscrição e redireciona ao pagamento). O aceite fica **gravado na inscrição** para comprovação futura.

Decisões aprovadas na brainstorm:

| Tópico | Escolha |
|--------|---------|
| Registro do aceite | Gravado na inscrição (comprovação), visível no admin e no XLSX |
| Texto do termo | Fixo, definido no código (igual para todas as aventuras) |
| Inscrição em grupo | 1 checkbox único — titular autoriza a própria imagem e declara ter autorização dos demais |
| Persistência | Dentro de `custom_data` (JSONB), sem mudança no RPC — Abordagem B |
| Validação | Apenas no cliente (schema Zod) — limitação consciente, ver seção "Limitação conhecida" |

---

## Problema atual

Não existe nenhum mecanismo de consentimento/termos no fluxo de inscrição. O formulário público (`registration-form.tsx`) valida apenas campos de dados (custom fields, baterias, tamanho de grupo) e grava a inscrição via RPC `create_registration_with_capacity`, redirecionando em seguida para `/adventures/[slug]/pagamento`. O admin não tem como exigir autorização de uso de imagem dos inscritos nem comprovar depois quem autorizou.

---

## Requisitos funcionais

### Admin (`/admin/adventures`)

- Novo toggle **"Direito de Imagem"** no `AdventureForm`, mesmo padrão visual dos toggles existentes (`Switch` em card `rounded-lg border p-4`), posicionado logo após "Inscrições Abertas"
  - *Label:* "Direito de Imagem"
  - *Descrição:* "Exige que o inscrito autorize o uso de sua imagem para concluir a inscrição."
- Desligado por padrão em aventuras novas; aventuras existentes ficam desligadas (default do banco)
- Funciona tanto na criação quanto na edição

### Formulário público (`/adventures/[slug]`)

- Quando `image_rights_enabled` da aventura é `true`:
  - Renderizar um checkbox com o texto fixo do termo, **entre os blocos de dados dos participantes e o botão "Inscreva-se Agora"**
  - Checkbox desmarcado por padrão
  - Submit sem marcar → bloqueado pela validação Zod: mensagem inline no campo + toast de erro (mecanismo `handleInvalid` existente). Mensagem: **"Você precisa autorizar o uso de imagem para concluir a inscrição."**
  - Submit com aceite → gravar `custom_data["autorizacao_de_uso_de_imagem"] = "Sim"` no payload enviado ao RPC
- Quando `false`: nenhum checkbox, nenhuma chave gravada (comportamento atual intocado)

### Admin de inscrições e exportação (automático, sem código novo)

- Lista de inscrições e dashboard: o aceite aparece via `formatCustomDataEntries` (valor string "Sim", rótulo derivado da chave: "Autorizacao De Uso De Imagem")
- Export XLSX: a chave vira coluna dinâmica automaticamente (`collectStableCustomColumns`)
- Inscrições antigas (sem a chave): célula vazia / entrada omitida

---

## Texto fixo do termo (aprovado)

> Autorizo, de forma gratuita e por prazo indeterminado, o uso da minha imagem — e declaro ter autorização dos demais participantes inscritos por mim — em fotos e vídeos captados durante a aventura, para divulgação das atividades em redes sociais, site e materiais promocionais.

Definido como constante no código (`registration-form.tsx`), único consumidor.

---

## Abordagem escolhida

**Abordagem B — aceite dentro de `custom_data` (menor atrito).** O RPC `create_registration_with_capacity` já persiste `p_custom_data` verbatim no JSONB `custom_data` de `registrations`; gravar o aceite ali não exige mudança de assinatura nem recriação do RPC. A obrigatoriedade é garantida pelo schema Zod no cliente.

### Alternativas rejeitadas

| Opção | Motivo de rejeição |
|-------|-------------------|
| Coluna dedicada `image_consent` em `registrations` + validação no RPC (`IMAGE_CONSENT_REQUIRED`) | Mais robusta (garantia no servidor), porém exige migration adicional + recriação do RPC; usuário optou pela simplicidade |
| Só travar o envio, sem gravar nada | Sem comprovação futura de quem aceitou — requisito central é o registro |

---

## Modelo de dados

### Migration `014_image_rights.sql`

```sql
-- Toggle de direito de imagem por aventura
ALTER TABLE adventures ADD COLUMN image_rights_enabled boolean NOT NULL DEFAULT false;
```

- Sem mudança em `registrations`, RLS ou RPCs
- `adventures_select` é público (`USING (true)`) → o formulário público lê a flag sem mudança de policy; escrita já coberta por `is_admin()`
- **Pré-requisito de deploy:** a página pública (`/adventures/[slug]`) seleciona a coluna explicitamente — em ambiente sem a migration, o carregamento da aventura **falha em runtime** (erro 42703). Aplicar a migration **antes** do deploy do código, em cada ambiente:
  1. Supabase cloud (produção atual): ✅ aplicada em 2026-06-10.
  2. VPS (`api.otavio.junior.nom.br`): ⚠️ pendente — banco congelado nas migrations ≤007; aplicar 008–014 antes de apontar qualquer ambiente (inclusive `npm run dev` local) para ela.
  3. Verificação pré-deploy em qualquer ambiente: `SELECT column_name FROM information_schema.columns WHERE table_name = 'adventures' AND column_name = 'image_rights_enabled';` → deve retornar 1 linha.

### `Adventure` (`src/lib/types.ts`)

Novo campo após `has_lotes`:

```ts
image_rights_enabled: boolean;
```

### Chave do aceite em `custom_data`

- Chave fixa: `"autorizacao_de_uso_de_imagem"` (constante no código)
- Valor: `"Sim"` (string — `formatCustomDataEntries` omite booleans; string aparece no admin e no XLSX)
- Sem acentos na chave: os formatadores de rótulo (`formatFieldNameFromKey`, `formatFieldLabel`) fazem Title Case por regex `\w` e quebrariam com caracteres acentuados
- Chave reservada: colisão com um custom field criado pelo admin com esse mesmo `name` é teoricamente possível, mas considerada negligível (fora de escopo proteger)

---

## Design do admin (`adventure-form.tsx`)

1. **Schema Zod:** `imageRightsEnabled: z.boolean()` (junto dos booleans existentes `registrationsEnabled`/`hasBaterias`/`hasLotes`)
2. **defaultValues:** `imageRightsEnabled: adventure?.image_rights_enabled ?? false`
3. **Persistência:** chave `image_rights_enabled: values.imageRightsEnabled` no objeto `adventureData` (vale para insert e update — flag simples, não passa por RPC, igual `registrations_enabled`)
4. **JSX:** `FormField` + `Switch`, copiando o padrão de `registrationsEnabled`, inserido logo após ele (antes do toggle de baterias)

---

## Design do formulário público

### Propagação da flag

- `[slug]/page.tsx`: adicionar `image_rights_enabled` à **lista explícita de colunas do SELECT** (ponto fácil de esquecer — sem isso a flag chega `undefined`)
- Nova prop do `RegistrationForm`: `requiresImageConsent: boolean` (padrão das props existentes, ex. `hasLotes`)

### Validação (schema Zod)

- `createRegistrationSchema` ganha 4º parâmetro `requiresImageConsent`
- Novo campo `imageConsent: z.boolean()` com default `false` em `defaultValues`
- Obrigatoriedade via `superRefine` (mecanismo já usado para baterias): se `requiresImageConsent` e `imageConsent !== true`, adicionar issue no path `["imageConsent"]` com a mensagem definida acima
  - Manter o campo sempre `z.boolean()` (em vez de `z.literal(true)` condicional) preserva a estabilidade do tipo `RegistrationFormValues`
- O erro dispara o `handleInvalid` existente (toast com a primeira mensagem) + `FormMessage` inline no checkbox

### UI do checkbox

- Renderizado apenas quando `requiresImageConsent`
- `FormField` + `Checkbox` (shadcn, já importado no arquivo) + texto do termo como label clicável + `FormMessage`
- Posição: entre o fim dos blocos de participantes e o botão de submit

### Submit

- Quando `requiresImageConsent`, adicionar ao `customDataPayload`: `customDataPayload[IMAGE_CONSENT_KEY] = "Sim"`
- Nenhuma mudança na chamada do RPC nem no redirect ao pagamento

---

## Compatibilidade

- **Aventuras existentes:** flag `false` por default — nada muda no formulário público
- **Inscrições existentes:** não têm a chave em `custom_data` — admin e XLSX simplesmente não mostram o valor (comportamento natural dos formatadores)
- **Toggle desligado depois de inscrições feitas:** inscrições antigas mantêm o aceite gravado; novas não exibem o checkbox — sem inconsistência
- **RPC e RLS:** intocados

---

## Limitação conhecida

A obrigatoriedade do aceite é validada **somente no navegador**. Uma chamada direta ao RPC `create_registration_with_capacity` (ex.: via API REST do Supabase) consegue criar inscrição sem a chave de consentimento. Troca consciente da Abordagem B pela simplicidade — todos os usuários reais passam pelo formulário. Evolução futura, se necessário: coluna dedicada `image_consent` em `registrations` + parâmetro `p_image_consent boolean DEFAULT false` no RPC com `RAISE EXCEPTION 'IMAGE_CONSENT_REQUIRED'` (padrão das validações de capacidade existentes).

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/014_image_rights.sql` | **Novo** — coluna `image_rights_enabled` em `adventures` |
| `src/lib/types.ts` | `image_rights_enabled: boolean` no type `Adventure` |
| `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` | Campo no schema Zod, defaultValues, `adventureData`, toggle `Switch` |
| `src/app/(main)/adventures/[slug]/page.tsx` | Coluna no SELECT explícito + prop `requiresImageConsent` |
| `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` | Prop, campo `imageConsent` + `superRefine`, checkbox com termo, chave no `customDataPayload` |

---

## Verificação esperada

### Admin

- [ ] Criar aventura com toggle ligado → `image_rights_enabled = true` no banco
- [ ] Editar aventura existente e ligar/desligar o toggle → persiste corretamente
- [ ] Aventuras pré-existentes aparecem com toggle desligado

### Público

- [ ] Aventura com toggle desligado → sem checkbox, inscrição funciona como hoje
- [ ] Aventura com toggle ligado → checkbox visível com o texto do termo
- [ ] Submit sem marcar → toast de erro + mensagem inline; inscrição NÃO criada; não redireciona ao pagamento
- [ ] Submit com aceite marcado → inscrição criada com `custom_data.autorizacao_de_uso_de_imagem = "Sim"`; redireciona ao pagamento normalmente
- [ ] Grupo de 3 pessoas: um único checkbox cobre o grupo

### Admin de inscrições e exportação

- [ ] Lista de inscrições mostra "Autorizacao De Uso De Imagem: Sim" na inscrição com aceite
- [ ] Export XLSX inclui a coluna dinâmica com "Sim" para quem aceitou e vazio para inscrições antigas

---

## Fora de escopo

- Validação do aceite no servidor (RPC) — documentada como evolução futura
- Texto do termo editável por aventura
- Checkbox individual por participante do grupo
- Registro de data/hora do aceite separada (a `registration_date` da inscrição já marca o momento)
- Exibição do aceite na página pública de pagamento
- Proteção contra colisão da chave reservada com custom fields do admin
