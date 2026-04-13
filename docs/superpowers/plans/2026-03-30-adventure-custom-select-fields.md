# Adventure Custom Select Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que aventuras tenham campos personalizados de seleção única e seleção múltipla no admin, renderizados corretamente no formulário público apenas para o contato principal.

**Architecture:** A implementação estende o contrato atual de `custom_fields` em `adventures` com dois novos tipos (`select` e `multiselect`) e adiciona `options` como metadado opcional. O admin continua usando o mesmo construtor de campos, enquanto o formulário público passa a renderizar inputs, select e checkboxes por tipo, preservando compatibilidade com aventuras já existentes e mantendo participantes adicionais limitados a campos simples.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, React Hook Form, Zod, shadcn/ui, Supabase JSON/JSONB.

---

## File map

- Modify: `src/lib/types.ts`
  Responsabilidade: ampliar os tipos compartilhados de `CustomField`, `Registration.custom_data` e aliases de valor customizado.

- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`
  Responsabilidade: aceitar os novos tipos no schema, editar opções no admin, atualizar textos de ajuda e normalizar o payload salvo.

- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`
  Responsabilidade: separar campos simples de campos de seleção por escopo, ajustar estado inicial, renderer, validação manual e payload enviado para `registrations`.

- Verify if needed: `src/app/(main)/adventures/[slug]/page.tsx`
  Responsabilidade: confirmar que `customFields` continua sendo passado sem transformação indevida.

- Verify if needed: `src/app/(admin)/admin/registrations/page.tsx`
  Responsabilidade: confirmar que leituras de `custom_data` não assumem `string` em todos os casos.

Observação: o projeto não possui framework de testes automatizados configurado. As verificações formais deste plano usam `npm run lint`, `npm run typecheck` e teste manual no navegador.

---

### Task 1: Tipos compartilhados

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Atualizar o contrato de `CustomField`**

Adicionar `select` e `multiselect` ao union de `type` e incluir `options?: string[]`.

- [ ] **Step 2: Atualizar o contrato de dados customizados da inscrição**

Introduzir aliases equivalentes a:

```ts
export type RegistrationCustomValue = string | string[];
export type RegistrationCustomData = Record<string, RegistrationCustomValue>;
```

Aplicar o novo alias em `Registration.custom_data`.

- [ ] **Step 3: Verificar impactos imediatos de tipagem**

Run: `npm run typecheck`

Expected: erros em arquivos que ainda assumem `Record<string, string>`, principalmente no formulário público.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: amplia tipos de campos customizados"
```

---

### Task 2: Schema e editor do admin

**Files:**
- Modify: `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

- [ ] **Step 1: Ajustar o schema Zod dos campos personalizados**

Expandir `customFieldSchema` para aceitar:

```ts
type: z.enum(["text", "email", "tel", "number", "select", "multiselect"])
```

e incluir validação condicional de `options`, cobrindo:

- obrigatório para tipos de seleção
- trim de cada item
- rejeição de itens vazios
- rejeição de duplicatas após trim

- [ ] **Step 2: Ajustar `defaultValues` e payload normalizado**

Garantir que aventuras antigas carreguem sem quebrar e que, ao salvar:

- campos simples persistam sem depender de `options`
- campos de seleção persistam com `options` limpas
- trocar de tipo de seleção para tipo simples limpe `options` antes do `insert/update`

- [ ] **Step 3: Expandir o seletor de tipo no construtor**

Adicionar:

- `Seleção única` com value `select`
- `Seleção múltipla` com value `multiselect`

- [ ] **Step 4: Renderizar editor de opções por campo**

No card de cada campo personalizado, quando o tipo for `select` ou `multiselect`, renderizar uma lista de opções editável com:

- input por opção
- botão para remover opção
- botão para adicionar nova opção

Manter o layout atual e expandir apenas o card correspondente.

- [ ] **Step 5: Atualizar os textos de ajuda do admin**

Ajustar os blocos explicativos para refletir:

- campos simples aparecem para contato principal e participantes adicionais
- `select` e `multiselect` aparecem apenas para o contato principal

- [ ] **Step 6: Verificar o admin via typecheck**

Run: `npm run typecheck`

Expected: o arquivo compila e os próximos erros, se existirem, devem estar concentrados no formulário público.

- [ ] **Step 7: Verificação manual do admin**

Run: `npm run dev`

Expected:

- em `/admin/adventures/new`, o seletor de tipo mostra os novos valores
- escolher `select` ou `multiselect` revela o editor de opções
- tentar salvar sem opções válidas mostra erro inline

- [ ] **Step 8: Commit**

```bash
git add src/app/(admin)/admin/adventures/_components/adventure-form.tsx
git commit -m "feat: adiciona campos de selecao no admin de aventuras"
```

---

### Task 3: Estado e schema do formulário público

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

- [ ] **Step 1: Separar campos simples e campos de seleção**

Criar coleções derivadas equivalentes a:

- `primaryCustomFields`: todos os campos
- `participantCustomFields`: apenas `text`, `email`, `tel`, `number`

Usar essas coleções para evitar que `select` e `multiselect` vazem para participantes adicionais.

- [ ] **Step 2: Ajustar o estado inicial**

Montar `initialCustomData` com as regras:

- tipos simples e `select` iniciam com `""`
- `multiselect` inicia com `[]`

Garantir que `participants` continuem usando apenas strings.

- [ ] **Step 3: Ajustar o schema do formulário**

Trocar `customData: z.record(z.string()).optional()` por um schema compatível com `string | string[]`, preservando `participants` como array de registros string-only.

- [ ] **Step 4: Ajustar a geração dinâmica de participantes**

No efeito que chama `append`, preencher novos participantes apenas com `name` e campos simples. Não incluir `select` nem `multiselect`.

- [ ] **Step 5: Rodar typecheck**

Run: `npm run typecheck`

Expected: o arquivo compila com os novos unions; erros restantes devem ser em renderização ou leitura secundária.

- [ ] **Step 6: Commit**

```bash
git add src/app/(main)/adventures/[slug]/_components/registration-form.tsx
git commit -m "refactor: ajusta estado dos campos customizados da inscricao"
```

---

### Task 4: Renderer e validação do formulário público

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

- [ ] **Step 1: Implementar renderer por tipo no contato principal**

Para cada `customField`:

- `text`, `email`, `tel`, `number` usam `Input`
- `select` usa o `Select` do shadcn/ui
- `multiselect` usa checkboxes controlados por React Hook Form

- [ ] **Step 2: Limitar participantes adicionais a campos simples**

No bloco `Dados do Participante X`, renderizar apenas `participantCustomFields`.

- [ ] **Step 3: Ajustar validação manual**

Cobrir:

- string obrigatória não vazia
- `select` obrigatório com valor string preenchido
- `multiselect` obrigatório com array não vazio
- nenhuma validação extra para `select`/`multiselect` em `participants`

- [ ] **Step 4: Ajustar payload enviado ao Supabase**

Confirmar que `custom_data` vai como `Record<string, string | string[]>` e que `participants` continua string-only.

- [ ] **Step 5: Rodar `typecheck` e `lint`**

Run: `npm run typecheck`

Expected: PASS

Run: `npm run lint`

Expected: PASS

- [ ] **Step 6: Verificação manual completa**

Run: `npm run dev`

Expected:

- página pública da aventura mostra `select` e `multiselect` apenas em `Dados do Contato Principal`
- participantes adicionais não recebem esses campos
- campo obrigatório vazio impede envio
- `select` salva string
- `multiselect` salva array

- [ ] **Step 7: Commit**

```bash
git add src/app/(main)/adventures/[slug]/_components/registration-form.tsx src/lib/types.ts src/app/(admin)/admin/adventures/_components/adventure-form.tsx
git commit -m "feat: renderiza campos de selecao na inscricao"
```

---

### Task 5: Revisão de impactos secundários

**Files:**
- Verify: `src/app/(main)/adventures/[slug]/page.tsx`
- Verify: `src/app/(admin)/admin/registrations/page.tsx`

- [ ] **Step 1: Revisar passagem de `customFields` na página da aventura**

Confirmar que `customFields` chega ao componente sem cast inadequado ou normalização que remova `options`.

- [ ] **Step 2: Revisar consumo administrativo de inscrições**

Confirmar que telas de listagem/detalhe não quebram ao encontrar `string[]` em `custom_data`.

- [ ] **Step 3: Corrigir apenas se houver quebra real**

Aplicar mudanças mínimas, sem refactor lateral.

- [ ] **Step 4: Rodar verificação final**

Run: `npm run typecheck && npm run lint`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(main)/adventures/[slug]/page.tsx src/app/(admin)/admin/registrations/page.tsx
git commit -m "fix: ajusta leituras secundarias de campos customizados"
```

---

### Task 6: Verificação final de história completa

**Files:**
- No file changes required

- [ ] **Step 1: Criar uma aventura de teste no admin**

Configurar:

- um campo `Escola` do tipo `select`
- um campo `Preferências` do tipo `multiselect`
- um campo simples existente para garantir compatibilidade

- [ ] **Step 2: Exercitar o fluxo público**

Validar:

- renderização correta
- obrigatoriedade
- contato principal com seleções
- participantes adicionais sem seleções

- [ ] **Step 3: Validar persistência no Supabase**

Conferir o registro criado e confirmar:

- `adventures.custom_fields` contém `options`
- `registrations.custom_data.escola` é `string`
- `registrations.custom_data.preferencias` é `string[]`

- [ ] **Step 4: Registrar resultado no handoff**

Anotar quais verificações foram executadas, o que passou e qualquer limitação restante.

