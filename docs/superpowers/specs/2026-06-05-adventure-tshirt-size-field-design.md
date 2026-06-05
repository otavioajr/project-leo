# Campo "Tamanho de camiseta" no formulário de inscrição

## Visão geral

Adicionar um novo tipo dedicado de campo personalizado — **Tamanho de camiseta** — no construtor de formulário de aventuras. O admin configura rótulo, opções de tamanho e, opcionalmente, uma imagem guia (tabela de medidas). No formulário público de inscrição, **cada pessoa do grupo** (contato principal e participantes adicionais) escolhe o tamanho em um seletor. Se houver imagem configurada, um botão `?` ao lado do rótulo abre um modal com a imagem.

Decisões aprovadas na brainstorm:

| Tópico | Escolha |
|--------|---------|
| Quem preenche | Contato principal + cada participante adicional |
| Tipo de campo | Dedicado "Tamanho de camiseta" (`tshirt_size`) |
| Imagem de ajuda | Opcional, com aviso no admin se ausente |
| Rótulo | Pré-preenchido "Tamanho de camiseta", editável |
| Quantidade por aventura | Múltiplos campos permitidos |
| Opções iniciais | Vazio — admin cadastra manualmente |

---

## Problema atual

Os campos personalizados aceitam tipos simples (`text`, `email`, `tel`, `number`) e de seleção (`select`, `multiselect`). Campos de seleção aparecem **apenas no contato principal**; participantes adicionais recebem somente campos simples.

Não existe suporte para:

- um seletor de tamanho de camiseta por participante
- imagem de ajuda configurável pelo admin
- botão de orientação no formulário público

---

## Requisitos funcionais

### Admin (`/admin/adventures`)

- O seletor **Tipo** deve incluir **Tamanho de camiseta** (`tshirt_size`)
- Ao selecionar o tipo:
  - se o rótulo estiver vazio, pré-preencher com `"Tamanho de camiseta"`
  - exibir editor de **Opções de Seleção** (adicionar, editar, remover — mesmo padrão de seleção única)
  - exibir **Imagem de ajuda** com o componente `ImageUpload` existente
  - se `helpImageUrl` estiver vazio, exibir aviso:
    > *"Sem imagem de ajuda, o botão de orientação não aparecerá para o cliente no formulário de inscrição."*
- Múltiplos campos `tshirt_size` permitidos na mesma aventura (ex.: camiseta masculina e feminina)
- Opções começam vazias; admin adiciona manualmente
- Ao trocar o tipo de `tshirt_size` para outro, descartar `options` e `helpImageUrl` antes de salvar

### Formulário público (`/adventures/[slug]`)

| Pessoa | Onde renderiza | Onde persiste |
|--------|----------------|---------------|
| Contato principal | Seção "Informações da inscrição" | `custom_data[campo.name]` |
| Participantes 2, 3, 4… | Seção "Dados do Participante N" | `participants[i][campo.name]` |

- Renderizar como `Select` com as opções configuradas
- Se `helpImageUrl` existir: botão `?` (`CircleHelp`) ao lado do rótulo abre `Dialog` com a imagem em largura total
- Se `helpImageUrl` não existir: apenas o seletor, sem botão de ajuda
- Campo obrigatório: validar string não vazia (mesma regra de `select`)

### Persistência

- Configuração: `adventures.custom_fields` (JSONB) — sem migration obrigatória
- Inscrição: `registrations.custom_data` (titular) e `registrations.participants` (demais) — valor `string` com o tamanho escolhido

### Admin de inscrições e exportação

- Valores do titular em `custom_data` — exibição atual
- Valores dos participantes em `participants` — exibição e exportação CSV já coletam chaves dinâmicas; funciona sem alteração estrutural

---

## Abordagem escolhida

Estender o modelo atual de `custom_fields` com novo tipo `tshirt_size` em vez de criar estrutura paralela.

### Motivos

- menor impacto na arquitetura existente
- reaproveita editor de opções, `ImageUpload`, validação Zod e persistência JSONB
- compatível com aventuras e inscrições já existentes

### Alternativas rejeitadas

| Opção | Motivo de rejeição |
|-------|-------------------|
| Array separado `tshirt_fields` na aventura | Duplica editor, renderer, validação e exportação |
| Estender `select` com `helpImageUrl` + flag `perParticipant` | Contradiz tipo dedicado aprovado; mistura comportamentos |

---

## Modelo de dados

### `CustomField` (`src/lib/types.ts`)

```ts
type CustomField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "multiselect" | "tshirt_size";
  required: boolean;
  options?: string[];
  helpImageUrl?: string;
};
```

### Regras de modelagem

- `options` obrigatório para `tshirt_size` (≥ 1 opção válida)
- `helpImageUrl` só é lido quando `type === "tshirt_size"`; ignorado nos demais tipos
- `helpImageUrl` opcional; string vazia não persiste
- Valor da inscrição: `string` (tamanho escolhido), igual `select`
- Campos antigos permanecem válidos sem `helpImageUrl`

### Banco de dados

Nenhuma migration obrigatória — `custom_fields` e `custom_data` já são JSONB compatíveis com o novo formato.

---

## Design do admin

### Editor (`adventure-form.tsx`)

O construtor existente continua sendo o ponto único de configuração.

**Novo item no seletor Tipo:**

| Valor interno | Rótulo |
|---------------|--------|
| `tshirt_size` | Tamanho de camiseta |

**Bloco expandido quando `type === "tshirt_size"`:**

1. **Opções de Seleção** — reutiliza UI de `select`/`multiselect`
2. **Imagem de ajuda** — `ImageUpload` com `folder="adventures/tshirt-guides"` (ou pasta equivalente no bucket `images`)
3. **Aviso** — se sem imagem, mensagem em tom `muted` com ícone de alerta

**`handleCustomFieldTypeChange`:**

- ao mudar para `tshirt_size`: inicializar `options` com `[""]` se vazio; pré-preencher rótulo se vazio
- ao mudar de `tshirt_size` para outro: limpar `options` e `helpImageUrl`

**Normalização ao salvar:**

- `tshirt_size`: `options` via `normalizeSelectionOptions()`; `helpImageUrl` trim → `undefined` se vazio
- demais tipos: descartar `helpImageUrl`

### Validação Zod

- `type` inclui `tshirt_size`
- `options`: mesmas regras de `select` (≥ 1, não vazias, únicas após trim)
- `helpImageUrl`: opcional; se preenchido, URL válida

### Textos de ajuda do construtor

Atualizar `FormDescription` e bloco "Campos do Sistema":

- **Contato principal:** todos os campos personalizados (incluindo tamanho de camiseta)
- **Participantes adicionais:** campos simples **e** campos de tamanho de camiseta

---

## Design do formulário público

### Filtros de campos

Introduzir helper (ex.: `isParticipantCustomField`) que inclui:

- tipos simples (`text`, `email`, `tel`, `number`) — comportamento atual
- `tshirt_size` — novo

Manter `select` e `multiselect` **apenas no titular** (sem mudança).

### Componente `TshirtSizeField`

Novo arquivo: `src/app/(main)/adventures/[slug]/_components/tshirt-size-field.tsx`

Responsabilidades:

- `FormLabel` com rótulo e indicador de obrigatório
- botão `?` condicional (`helpImageUrl` presente)
- `Select` com opções
- `Dialog` com imagem (`next/image`, `object-contain`)

Layout:

```
┌─────────────────────────────────────────────┐
│ Tamanho de camiseta *          [?]          │
│ ┌─────────────────────────────────────────┐ │
│ │ Selecione tamanho de camiseta        ▼  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Modal:**

- Título: rótulo do campo
- Conteúdo: somente a imagem
- `aria-label` do botão: "Ver guia de tamanhos"

### Integração em `registration-form.tsx`

- **Titular:** branch `tshirt_size` no loop `allCustomFields` → `TshirtSizeField` ligado a `customData.{name}`
- **Participantes:** loop estendido inclui `tshirt_size` → `TshirtSizeField` ligado a `participants.{i}.{name}`

### Estado inicial e participantes dinâmicos

- Titular: `customData[campo.name] = ""`
- `useEffect` de participantes: ao criar participante, inicializar `campo.name = ""` para campos `tshirt_size`

### Validação

- Titular: loop `allCustomFields` + `isRequiredCustomValueFilled` (já trata string)
- Participantes: loop com campos `isParticipantCustomField`; `tshirt_size` obrigatório → string não vazia

### Payload

Sem mudança na RPC `create_registration_with_capacity`:

- titular: `custom_data[campo.name]`
- participantes: `participants[i][campo.name]`

---

## Compatibilidade

### Aventuras existentes

Campos já salvos continuam funcionando — `tshirt_size` é aditivo; tipos antigos inalterados.

### Inscrições existentes

Sem `tshirt_size` nos `custom_fields` da aventura → formulário não exibe o campo.

### Exportação

`export-registrations.ts` coleta chaves de `custom_data` e `participants` dinamicamente. Colunas de tamanho de camiseta aparecem automaticamente pelo `name` do campo.

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/types.ts` | `tshirt_size` + `helpImageUrl` |
| `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` | Tipo, editor, validação, normalização, textos |
| `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` | Renderização titular + participantes, validação, estado inicial |
| `src/app/(main)/adventures/[slug]/_components/tshirt-size-field.tsx` | **Novo** — seletor + botão `?` + modal |

---

## Verificação esperada

### Admin

- [ ] Criar aventura com campo "Tamanho de camiseta", opções e imagem
- [ ] Salvar sem imagem → aviso visível; salvamento permitido
- [ ] Salvar sem opções → bloqueado pela validação
- [ ] Adicionar segundo campo `tshirt_size` na mesma aventura
- [ ] Trocar tipo de `tshirt_size` para `text` → `options` e `helpImageUrl` descartados
- [ ] Editar aventura existente preserva campos antigos

### Público

- [ ] Grupo de 1 pessoa: seletor no titular; valor em `custom_data`
- [ ] Grupo de 3 pessoas: seletor no titular + 2 participantes; valores corretos
- [ ] Com imagem: botão `?` abre modal com imagem
- [ ] Sem imagem: sem botão `?`
- [ ] Campo obrigatório vazio → erro inline + toast
- [ ] `select`/`multiselect` continuam só no titular

### Persistência e exportação

- [ ] `custom_fields` salva `tshirt_size` com `options` e `helpImageUrl`
- [ ] Inscrição persiste tamanhos em `custom_data` e `participants`
- [ ] Exportação CSV inclui colunas de tamanho

---

## Fora de escopo

- Tipo genérico "seleção com guia visual"
- Pré-preenchimento de tamanhos padrão (PP, P, M, G…)
- Limite de um campo por aventura
- Legenda ou texto editável dentro do modal
- Imagem de ajuda em outros tipos de campo (`select`, etc.)
- Reordenação drag-and-drop de opções
- Cruzar `name` do campo com rótulo amigável na exportação CSV
