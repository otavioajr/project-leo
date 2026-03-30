# Campos de Seleção em Aventuras

## Visão geral

Adicionar suporte a campos personalizados baseados em opções na criação e edição de aventuras em `/admin/adventures`, permitindo que o admin configure listas pré-definidas para o formulário público de inscrição.

O objetivo imediato é cobrir casos como `Escola`, onde o admin cadastra as opções previamente, e o usuário final apenas escolhe entre elas. O escopo aprovado inclui:

- novo tipo `Seleção única`
- novo tipo `Seleção múltipla`
- exibição apenas para o contato principal
- sem opção `Outro` nesta fase

O trabalho deve preservar compatibilidade com aventuras já existentes que usam apenas campos simples.

---

## Problema atual

Hoje os campos personalizados de aventura aceitam apenas tipos simples:

- `text`
- `email`
- `tel`
- `number`

No formulário público, todos esses campos são renderizados como `Input`, o que obriga o usuário a digitar tudo manualmente. Isso é ruim para dados controlados e repetitivos, como escola, turma, unidade, turno ou preferências padronizadas.

---

## Requisitos funcionais

### Admin

Na tela de criação/edição de aventura:

- o seletor `Tipo` deve incluir `Seleção única` e `Seleção múltipla`
- ao escolher um tipo de seleção, o admin deve conseguir cadastrar e remover opções daquele campo
- cada opção é um texto simples
- campos de seleção devem exigir pelo menos 1 opção válida antes do salvamento
- se o tipo for alterado de seleção para um tipo simples, as opções podem ser descartadas automaticamente antes de salvar

### Formulário público

Na inscrição da aventura:

- `Seleção única` deve ser renderizada como um campo de escolha única
- `Seleção múltipla` deve ser renderizada como um conjunto de múltiplas escolhas
- esses campos devem aparecer apenas em `Dados do Contato Principal`
- participantes adicionais continuam usando apenas os campos simples já existentes
- campos obrigatórios devem continuar sendo validados antes do envio

### Persistência

- a configuração continua sendo salva em `adventures.custom_fields`
- o envio continua sendo salvo em `registrations.custom_data`
- `Seleção única` deve persistir como `string`
- `Seleção múltipla` deve persistir como `string[]`

---

## Abordagem escolhida

Estender o modelo atual de `custom_fields` em vez de criar uma estrutura paralela.

### Motivos

- menor impacto na arquitetura existente
- reaproveita o editor atual de campos personalizados
- evita duplicar lógica de renderização e validação
- mantém compatibilidade com os campos já salvos

### Alternativas rejeitadas

Separar campos de seleção em outra estrutura foi descartado por aumentar a complexidade do admin e do renderer. Um refactor completo para um form builder mais genérico também foi descartado por ser maior que o necessário para esta entrega.

---

## Modelo de dados

### `CustomField`

O tipo compartilhado deve evoluir para aceitar tipos de seleção e metadados extras.

Estrutura alvo:

```ts
type CustomField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "multiselect";
  required: boolean;
  options?: string[];
};
```

### Regras de modelagem

- `options` só é relevante para `select` e `multiselect`
- campos antigos permanecem válidos sem `options`
- o schema do admin deve garantir que tipos de seleção tenham pelo menos uma opção
- tipos simples não devem depender de `options`

### `Registration.custom_data`

O tipo atual assume apenas `Record<string, string>`, o que não comporta seleção múltipla. O contrato precisa aceitar ambos os formatos:

```ts
type RegistrationCustomValue = string | string[];
type RegistrationCustomData = Record<string, RegistrationCustomValue>;
```

Isso alinha o tipo compartilhado com o payload real salvo no Supabase. O schema e o form state do formulário público também devem aceitar `Record<string, string | string[]>`.

---

## Design do admin

### Editor de campos personalizados

O editor existente em [`src/app/(admin)/admin/adventures/_components/adventure-form.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(admin)/admin/adventures/_components/adventure-form.tsx) continua sendo o ponto único de configuração.

Mudanças previstas:

- ampliar o `Select` de tipo com `Seleção única` e `Seleção múltipla`
- quando o tipo exigir opções, renderizar um bloco adicional logo abaixo do campo
- esse bloco deve permitir:
  - adicionar opção
  - editar texto da opção
  - remover opção

### UX do editor

- manter a linha principal do campo igual ao padrão atual
- expandir o card do campo apenas quando o tipo for de seleção
- mostrar texto de apoio deixando explícito que as opções aparecem para o usuário final
- atualizar os textos de ajuda do construtor para deixar explícito que campos simples aparecem para todos os participantes, mas `select` e `multiselect` aparecem apenas para o contato principal
- bloquear salvamento de campo sem opções válidas

### Validação do admin

O schema do formulário deve validar:

- `name` no formato já exigido hoje
- `label` obrigatório
- `type` com os novos valores
- `options` obrigatória e não vazia para tipos de seleção
- itens de `options` não podem ser vazios após trim
- itens de `options` devem ser únicos após trim
- o salvamento deve rejeitar duplicatas e preservar a ordem configurada

---

## Design do formulário público

### Renderização dinâmica

O formulário público em [`src/app/(main)/adventures/[slug]/_components/registration-form.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(main)/adventures/[slug]/_components/registration-form.tsx) deve continuar baseado em `customFields`, com renderer por tipo:

- `text`, `email`, `tel`, `number`: `Input`
- `select`: componente de escolha única
- `multiselect`: grupo de checkboxes

### Escopo

Os novos campos de seleção entram apenas em `Dados do Contato Principal`.

Participantes adicionais:

- continuam sendo gerados dinamicamente conforme `groupSize`
- continuam recebendo somente os campos simples
- não exibem `select` nem `multiselect`
- não devem receber defaults, schema, validação nem payload para campos com `type = "select" | "multiselect"`

### Formato dos valores

- `select`: uma string com a opção escolhida
- `multiselect`: array de strings com as opções marcadas
- estado inicial do formulário: tipos simples e `select` começam com `""`; `multiselect` começa com `[]`
- `participants` permanece `Record<string, string>[]`; apenas `custom_data` do contato principal aceita `string | string[]`

---

## Fluxo de validação

O formulário público já faz validação manual para `customFields`. Essa lógica deve ser ajustada por tipo.

### Regras

- campo simples obrigatório: valor não vazio
- `select` obrigatório: uma opção selecionada
- `multiselect` obrigatório: pelo menos um item selecionado
- participantes adicionais não devem passar por defaults, schema, validação nem payload para campos com `type = "select" | "multiselect"`

### Tratamento de erro

- manter o padrão atual de `form.setError(...)`
- manter toast de falha com mensagem genérica de campos obrigatórios
- associar o erro ao campo certo para preservar feedback inline

---

## Compatibilidade

### Aventuras existentes

Campos já salvos continuam funcionando porque:

- os tipos antigos permanecem válidos
- `options` é opcional
- o renderer decide o comportamento pelo `type`

### Banco de dados

Nenhuma migration é obrigatória se `custom_fields` e `custom_data` já estiverem em `json/jsonb`, porque o formato novo é compatível com o armazenamento atual.

### Risco principal

O maior risco não é o banco, mas a tipagem compartilhada e a lógica de renderização assumirem que todo valor customizado é `string`. Esse ponto deve ser corrigido antes de considerar a feature concluída.

---

## Arquivos afetados

- [`src/lib/types.ts`](/Users/otavioajr/Documents/Projetos/project-leo/src/lib/types.ts)
- [`src/app/(admin)/admin/adventures/_components/adventure-form.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(admin)/admin/adventures/_components/adventure-form.tsx)
- [`src/app/(main)/adventures/[slug]/_components/registration-form.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(main)/adventures/[slug]/_components/registration-form.tsx)
- textos de ajuda em [`src/app/(admin)/admin/adventures/_components/adventure-form.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(admin)/admin/adventures/_components/adventure-form.tsx) devem ser ajustados para refletir o novo escopo dos campos

Arquivos adicionais podem ser necessários caso existam renderizações secundárias de `custom_fields` ou de dados de inscrição em telas administrativas.

---

## Verificação esperada

### Admin

- criar aventura com campo `Seleção única`
- criar aventura com campo `Seleção múltipla`
- validar bloqueio ao tentar salvar campo de seleção sem opções
- editar aventura existente preservando campos antigos

### Público

- renderizar `select` corretamente para o contato principal
- renderizar `checkboxes` corretamente para o contato principal
- validar obrigatoriedade dos novos tipos
- confirmar que participantes adicionais não recebem campos de seleção

### Persistência

- confirmar que `custom_fields` salva tipos novos com `options`
- confirmar que `custom_data` salva `string` para `select`
- confirmar que `custom_data` salva `string[]` para `multiselect`

---

## Fora de escopo

- opção `Outro`
- aplicar campos de seleção aos participantes adicionais
- dependência entre campos
- reordenação avançada de opções
- importação de opções em lote
- novos tipos de campo além dos aprovados nesta rodada
