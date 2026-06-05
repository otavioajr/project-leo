# Lotes (precificação escalonada) por aventura — Design

**Data:** 2026-06-05
**Status:** Aprovado — plano em `docs/superpowers/plans/2026-06-05-adventure-lotes.md`

## Problema

Hoje cada aventura tem um **preço único** (`adventures.price`) e PIX com **4 códigos
copia-e-cola** (um por tamanho de grupo: 1–4 pessoas). Não há suporte a precificação
escalonada do tipo "Lote 1 promocional → Lote 2 → Lote 3", comum em eventos e
aventuras com alta demanda.

O admin precisa vender vagas em **lotes sequenciais**, cada um com preço e PIX próprios,
avançando automaticamente para o próximo lote quando o anterior esgota.

## Objetivo

Adicionar o modo **"Vender por lote"** a uma aventura. Quando ativo:

- O admin configura N lotes com **vagas**, **preço** e **PIX copia-e-cola** por lote.
- O site mostra apenas o **lote ativo** (preço + vagas restantes).
- Cada inscrição é de **1 pessoa** (sem grupo).
- O lote é **congelado na inscrição** — pagamento usa sempre o PIX/preço daquele lote.
- Quando um lote esgota, o próximo passa a ser o ativo automaticamente.

## Decisões de produto (validadas com o usuário)

| # | Tópico | Decisão |
|---|--------|---------|
| 1 | Modos | **Mutuamente exclusivo:** lotes **ou** baterias **ou** modo simples (preço único + limite máximo). Não combina. |
| 2 | Capacidade | Soma das vagas dos lotes. Campo **"Limite Máximo de Pessoas"** fica desabilitado (igual baterias). |
| 3 | Inscrição | Sempre **1 pessoa por inscrição** — sem seletor de quantidade nem participantes extras. |
| 4 | PIX/preço na inscrição | **Congelado** no lote atribuído no momento do cadastro (`registrations.lote_id`). |
| 5 | Exibição pública | Mostra só o **lote ativo**: label, preço e vagas restantes neste lote. Sem listar lotes futuros ou esgotados. |
| 6 | Edição admin | **Igual baterias:** pode editar com avisos; não pode desligar lotes nem apagar lote com inscrições; reduzir vagas abaixo do ocupado bloqueado no RPC. |
| 7 | Instruções PIX | **Globais por aventura** (`pix_config.instructions`). Cada lote tem só o código copia-e-cola; instruções compartilhadas. Toggle "Ativar PIX" permanece por aventura. |
| 8 | Contagem de vagas | Inscrições com `is_registration_capacity_active(payment_status)` contam (pendentes incluídos), mesma regra de baterias e capacidade geral. |

## Decisão técnica

**Abordagem escolhida:** tabela `adventure_lotes` separada + RPCs, espelhando o padrão
de **baterias** (`adventure_baterias`, `save_adventure_baterias`,
`get_adventure_baterias_with_availability`, extensão de `create_registration_with_capacity`).

Motivo: atribuição atômica do lote ativo com `FOR UPDATE`, integridade referencial via
`registrations.lote_id`, regras de edição server-side e consistência com o código existente.

**Abordagens descartadas:**

- JSONB `lotes_config` na aventura — edição frágil, sem FK, difícil bloquear exclusão.
- Lógica só no frontend — race conditions na transição de lote, inseguro.

---

## Modelo de dados

### Migração `012_adventure_lotes.sql`

> **Numeração:** `011_pix_per_adventure.sql` é o último. Confirmar sequência no momento
> da implementação.

```sql
-- 1. Flag no adventure
ALTER TABLE adventures
  ADD COLUMN has_lotes boolean NOT NULL DEFAULT false;

-- 2. Exclusividade mútua com baterias
ALTER TABLE adventures
  ADD CONSTRAINT adventure_mode_exclusive
  CHECK (NOT (has_lotes AND has_baterias));

-- 3. Tabela de lotes
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

-- 4. Referência na inscrição (congelada no cadastro)
ALTER TABLE registrations
  ADD COLUMN lote_id uuid REFERENCES adventure_lotes(id) ON DELETE RESTRICT;

-- 5. RLS
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

### Tipos TypeScript (`src/lib/types.ts`)

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

export type Adventure = {
  // ...campos atuais
  has_lotes: boolean;
};

export type Registration = {
  // ...campos atuais
  lote_id?: string | null;
};
```

### Campos ignorados no modo lote

| Campo | Comportamento quando `has_lotes = true` |
|-------|----------------------------------------|
| `adventures.price` | Desabilitado no admin. Listagem/cards/página pública usam preço do **lote ativo**. |
| `adventures.max_participants` | Desabilitado. Capacidade total = `SUM(adventure_lotes.capacity)`. |
| `adventures.pix_config.pixCopiaECola` | Ignorado. PIX vem de `adventure_lotes.pix_copia_cola`. |
| `adventures.pix_config.pixEnabled` | Mantido — controla se a tela de pagamento exibe PIX ou mensagem de contato. |
| `adventures.pix_config.instructions` | Mantido — instruções globais na tela de pagamento. |

---

## Lógica do lote ativo

Ordem: `sort_order` ascendente, depois `created_at`.

O **lote ativo** é o primeiro lote (na ordem) onde `reserved < capacity`:

```
reserved = COUNT(registrations)
  WHERE lote_id = <lote.id>
    AND is_registration_capacity_active(payment_status)
```

- Se nenhum lote tiver vagas → **sem lote ativo** → inscrições bloqueadas (`NO_ACTIVE_LOTE` / `remaining = 0`).
- Na inscrição, o RPC atribui o lote ativo **atomicamente** (`FOR UPDATE` na aventura + contagem dentro da transação).
- `total_amount = lote.price` (sempre 1 pessoa).
- `group_size = 1` (forçado server-side quando `has_lotes`).

---

## RPCs

### A) `get_adventure_lotes_with_availability(p_adventure_id uuid)`

Retorna todos os lotes da aventura com `reserved` calculado. Usado no admin (edição com
avisos) e internamente.

```sql
RETURNS TABLE (
  id uuid,
  label text,
  sort_order integer,
  capacity integer,
  price numeric,
  reserved integer
)
```

### B) `get_active_lote(p_adventure_id uuid)`

Retorna o lote ativo com `remaining = capacity - reserved`, ou **zero rows** se esgotado.
Usado na página pública da aventura e nos cards.

```sql
RETURNS TABLE (
  id uuid,
  label text,
  sort_order integer,
  capacity integer,
  price numeric,
  reserved integer,
  remaining integer
)
```

Leitura pública (`GRANT TO anon, authenticated`).

### C) `save_adventure_lotes(p_adventure_id, p_has_lotes, p_lotes jsonb)`

Transação atômica (espelha `save_adventure_baterias`):

1. Verifica `is_admin()` → senão `NOT_AUTHORIZED`.
2. Se `p_has_lotes` conflita com `has_baterias = true` na aventura → `CANNOT_ENABLE_LOTES_WITH_BATERIAS`.
3. Transição `has_lotes` true↔false com inscrições ativas:
   - true → false: nenhuma inscrição ativa com `lote_id` não-nulo → senão `CANNOT_DISABLE_LOTES_WITH_REGISTRATIONS`.
   - false → true: nenhuma inscrição ativa na aventura → senão `CANNOT_ENABLE_LOTES_WITH_REGISTRATIONS`.
4. Atualiza `adventures.has_lotes`.
5. Upsert de cada item em `p_lotes` (campos: `id?`, `label`, `sort_order`, `capacity`, `price`, `pix_copia_cola`).
6. Para lotes removidos do payload: checa `reserved > 0` → `LOTE_HAS_REGISTRATIONS`; senão deleta.
7. Para redução de `capacity` abaixo de `reserved`: aborta com `LOTE_CAPACITY_BELOW_RESERVED` (admin deve cancelar inscrições antes).

Payload esperado por item:

```json
{
  "id": "uuid-opcional",
  "label": "Lote 1",
  "sort_order": 0,
  "capacity": 30,
  "price": 320,
  "pix_copia_cola": "00020126..."
}
```

### D) `create_registration_with_capacity` estendido

Quando `has_lotes = true`:

1. Força `p_group_size = 1` (ignora valor enviado ou valida = 1 → senão `INVALID_GROUP_SIZE`).
2. Ignora `p_bateria_assignments` (deve ser NULL; baterias desabilitadas).
3. Determina lote ativo dentro da transação (mesma lógica de `get_active_lote`).
4. Se nenhum lote ativo → `NO_ACTIVE_LOTE`.
5. Se `reserved >= capacity` do lote ativo (race) → `LOTE_CAPACITY_EXCEEDED`.
6. INSERT com `lote_id`, `group_size = 1`, `total_amount = lote.price`.
7. `bateria_assignments = NULL`.

Quando `has_lotes = false`: comportamento atual inalterado.

Novos identificadores de erro:

| ID | Quando |
|----|--------|
| `NO_ACTIVE_LOTE` | Todos os lotes esgotados |
| `LOTE_CAPACITY_EXCEEDED` | Race no último slot do lote ativo |
| `LOTE_NOT_FOUND` | `lote_id` inválido (leitura de pagamento) |
| `CANNOT_ENABLE_LOTES_WITH_BATERIAS` | Tentativa de ligar lotes com baterias ativas |
| `CANNOT_ENABLE_LOTES_WITH_REGISTRATIONS` | Ligar lotes com inscrições existentes |
| `CANNOT_DISABLE_LOTES_WITH_REGISTRATIONS` | Desligar lotes com inscrições ativas |
| `LOTE_HAS_REGISTRATIONS` | Apagar lote com inscrições |
| `LOTE_CAPACITY_BELOW_RESERVED` | Reduzir vagas abaixo do ocupado |

---

## UI Admin — `adventure-form.tsx`

### Toggle e exclusividade

- Novo toggle **"Vender por lote"** (`hasLotes`), posicionado após "Habilitar Baterias"
  (ou na mesma área de modos).
- `hasLotes = true` → desabilita baterias, limite máximo, preço único e seção PIX com
  4 slots.
- `hasBaterias = true` → desabilita toggle de lotes (recíproco).
- Mensagens de bloqueio iguais às de baterias (client + mapeamento de erros do RPC).

### Seção "Lotes"

Tabela compacta com `useFieldArray({ name: "lotes" })`:

```
┌─ Lotes ──────────────────────────────────────────────────────────┐
│ # | Nome        | Vagas | Preço (R$) | PIX copia-e-cola    | 🗑   │
│ 1 | [Lote 1]    | [30]  | [320,00]   | [textarea + QR]     | 🗑   │
│ 2 | [Lote 2]    | [40]  | [400,00]   | [textarea + QR]     | 🗑   │
│ 3 | [Lote 3]    | [30]  | [500,00]   | [textarea + QR]     | 🗑   │
│ [+ Adicionar Lote]                                               │
└──────────────────────────────────────────────────────────────────┘
```

- Label padrão ao adicionar: `"Lote N"` (editável).
- Reutilizar `PixSlotCard` adaptado para um único textarea por lote (ou variante
  `LotePixCard`).
- Toggle **"Ativar PIX"** (`pixEnabled`) permanece na seção de pagamento; quando ligado,
  exige ao menos um `pix_copia_cola` preenchido **por lote** (validação Zod).
- Campo **"Instruções Adicionais"** permanece global (de `pix_config.instructions`).

### Validação Zod

```ts
const loteSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1, "Nome do lote é obrigatório."),
  sort_order: z.coerce.number().int().min(0),
  capacity: z.coerce.number().int().min(1, "Capacidade mínima é 1."),
  price: z.coerce.number().min(0, "Preço não pode ser negativo."),
  pixCopiaECola: z.string().default(""),
});

hasLotes: z.boolean(),
lotes: z.array(loteSchema).optional(),
// + superRefine: lotes.length >= 1 quando hasLotes = true
// + refine: se pixEnabled && hasLotes, cada lote precisa de pixCopiaECola preenchido
```

### Persistência (onSubmit)

1. `update`/`insert` em `adventures` com campos gerais + `pix_config` (toggle + instructions).
2. RPC `save_adventure_lotes` com `has_lotes` e array de lotes.
3. `has_lotes` **não** vai no `update` direto — apenas via RPC (igual `has_baterias`).

---

## UI Pública

### Página da aventura (`adventures/[slug]/page.tsx`)

Quando `has_lotes`:

- Buscar `get_active_lote(adventure_id)`.
- Exibir preço: `R$ {activeLote.price.toFixed(2)}`.
- Badge: `"{activeLote.label} — Restam {remaining} {vaga|vagas}"`.
- Se sem lote ativo: badge "Esgotado" e formulário desabilitado.
- `remainingSpots` para o form = `activeLote.remaining` (não `max_participants`).

### Cards e listagem (`adventure-card.tsx`, admin list)

- Preço exibido = preço do lote ativo (requer join ou segunda query; pode cachear no
  client por aventura).
- Se esgotado: exibir "Esgotado" em vez de preço.

### Formulário de inscrição (`registration-form.tsx`)

Quando `hasLotes` (prop nova ou derivada da aventura):

- Remover seletor `groupSize` e seção de participantes extras.
- `groupSize` fixo em 1 no submit.
- Manter campos customizados e baterias **não aplicável** (mutuamente exclusivo).
- Mapear erros `NO_ACTIVE_LOTE`, `LOTE_CAPACITY_EXCEEDED`.

### Página de pagamento (`pagamento/page.tsx`)

Quando a inscrição tem `lote_id`:

1. Buscar `adventure_lotes.pix_copia_cola` pelo `registration.lote_id`.
2. Ignorar `pix_config.pixCopiaECola` e `group_size`.
3. Usar `pix_config.pixEnabled` e `pix_config.instructions` da aventura.
4. Exibir valor: `registration.total_amount` (congelado na inscrição).

---

## Migração de aventuras existentes

- `has_lotes = false` por default.
- Nenhuma inscrição existente recebe `lote_id`.
- Aventuras no modo simples ou baterias permanecem inalteradas.
- Constraint `adventure_mode_exclusive` impede estados inválidos futuros.

---

## Fora do escopo

- Combinar lotes com baterias na mesma aventura.
- Exibir tabela pública de todos os lotes (esgotados/futuros).
- Alterar lote de uma inscrição após cadastro.
- Lote com múltiplas pessoas por inscrição.
- Instruções PIX diferentes por lote.
- Exportação de inscrições com coluna `lote` (pode ser adicionada depois).

---

## Verificação manual sugerida

1. Criar aventura com 3 lotes (30/40/30 vagas, preços distintos, PIX distintos).
2. Inscrever 30 pessoas → confirmar transição para Lote 2 (preço e badge na página).
3. Inscrição no Lote 1 com pagamento pendente → confirmar PIX do Lote 1 na tela de pagamento mesmo após esgotar Lote 1.
4. Tentar desligar lotes com inscrições → bloqueado.
5. Tentar apagar Lote 1 com inscrições → bloqueado.
6. Confirmar exclusividade com baterias no admin.
7. `npm run typecheck` e `npm run lint` sem erros.
