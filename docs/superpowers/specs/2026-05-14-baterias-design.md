# Baterias (horários alternativos) por aventura — Design

**Data:** 2026-05-14
**Status:** spec aprovada para implementação
**Projeto Supabase:** `iyvtoeoeytueoeromdwi` (project-leo, sa-east-1)

---

## Resumo

Adicionar a uma aventura a possibilidade de oferecer múltiplos horários (chamados "baterias") no mesmo dia. Cada bateria tem nome, hora início, hora fim e capacidade própria. Cada participante de um grupo pode escolher uma bateria diferente.

Quando o admin liga o flag "Habilitar Baterias" em uma aventura, o campo "Limite Máximo de Pessoas" deixa de valer — a capacidade passa a ser controlada por bateria.

---

## Decisões consolidadas

| # | Tópico | Decisão |
|---|--------|---------|
| 1 | Capacidade | Por bateria; sem teto total quando baterias estão ligadas |
| 2 | Tempo | Mesmo dia, só hora início e hora fim por bateria (sem data) |
| 3 | Grupo | Cada participante (incluindo contato principal) escolhe sua bateria individualmente |
| 4 | Edição de baterias com inscrições | Permitida com avisos visuais; bateria com inscrições não pode ser deletada |
| 5 | Desligar `has_baterias` com inscrições | Bloqueado; mensagem orienta admin a cancelar inscrições antes |
| 6 | Nome da bateria | Texto livre, com sugestão automática "Bateria N" |
| 7 | UI Admin | Tabela compacta dentro do formulário existente da aventura |
| 8 | UI Pública | Card "Vagas por Bateria" no topo do form + dropdown por participante |
| 9 | Modelagem de dados | Tabela `adventure_baterias` separada (Abordagem 1) |
| 10 | Atribuição em `registrations` | Coluna nova `bateria_assignments jsonb` (paralela a `participants`) |
| 11 | Sobreposição de horários entre baterias | Não validada (admin pode rodar paralelas) |
| 12 | Filtro por bateria na listagem admin | Fora do escopo desta feature |
| 13 | Mover inscrição entre baterias | Fora do escopo desta feature |

---

## Modelo de dados

### Migração `008_add_baterias.sql`

```sql
-- 1. Flag no adventure
ALTER TABLE adventures
  ADD COLUMN has_baterias boolean NOT NULL DEFAULT false;

-- 2. Tabela de baterias
CREATE TABLE adventure_baterias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id uuid NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  label text NOT NULL,
  start_time time NOT NULL,
  end_time   time NOT NULL,
  capacity   integer NOT NULL CHECK (capacity > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bateria_time_valid CHECK (end_time > start_time)
);

CREATE INDEX adventure_baterias_adventure_idx
  ON adventure_baterias(adventure_id, sort_order);

-- 3. Atribuições por inscrição
ALTER TABLE registrations
  ADD COLUMN bateria_assignments jsonb;

-- Formato esperado quando preenchido:
--   { "principal": "<bateria-uuid>",
--     "participants": ["<bateria-uuid>", "<bateria-uuid>", ...] }
-- 'principal' corresponde ao registrations.name/email/phone.
-- 'participants[i]' corresponde, na mesma ordem, ao i-ésimo item de registrations.participants.
-- NULL quando a aventura não usa baterias.

-- 4. RLS para adventure_baterias
ALTER TABLE adventure_baterias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adventure_baterias_select_public"
  ON adventure_baterias FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "adventure_baterias_admin_write"
  ON adventure_baterias FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

### Tipos TypeScript (`src/lib/types.ts`)

```ts
export type Bateria = {
  id: string;
  adventure_id: string;
  label: string;
  start_time: string;   // formato 'HH:MM:SS' ou 'HH:MM' conforme retorno
  end_time: string;
  capacity: number;
  sort_order: number;
  created_at: string;
};

export type BateriaAvailability = Bateria & {
  reserved: number;     // soma de slots já ocupados por inscrições ativas
};

export type BateriaAssignments = {
  principal: string;          // uuid
  participants: string[];     // uuids alinhados com Registration.participants
};

export type Adventure = {
  // ...campos atuais
  has_baterias: boolean;
};

export type Registration = {
  // ...campos atuais
  bateria_assignments?: BateriaAssignments | null;
};
```

---

## RPCs (continuação da migração 008)

### A) Leitura pública de vagas por bateria

```sql
CREATE OR REPLACE FUNCTION get_adventure_baterias_with_availability(
  p_adventure_id uuid
)
RETURNS TABLE (
  id uuid,
  label text,
  start_time time,
  end_time time,
  capacity integer,
  sort_order integer,
  reserved integer
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH slot_counts AS (
    SELECT s.bid AS bateria_id, COUNT(*)::integer AS reserved
    FROM registrations r,
         LATERAL (
           SELECT (r.bateria_assignments->>'principal')::uuid AS bid
           WHERE r.bateria_assignments ? 'principal'
           UNION ALL
           SELECT (jsonb_array_elements_text(r.bateria_assignments->'participants'))::uuid
           WHERE r.bateria_assignments ? 'participants'
         ) AS s(bid)
    WHERE r.adventure_id = p_adventure_id
      AND r.bateria_assignments IS NOT NULL
      AND is_registration_capacity_active(r.payment_status)
    GROUP BY s.bid
  )
  SELECT b.id, b.label, b.start_time, b.end_time, b.capacity, b.sort_order,
         COALESCE(sc.reserved, 0) AS reserved
  FROM adventure_baterias b
  LEFT JOIN slot_counts sc ON sc.bateria_id = b.id
  WHERE b.adventure_id = p_adventure_id
  ORDER BY b.sort_order, b.start_time;
$$;

REVOKE EXECUTE ON FUNCTION get_adventure_baterias_with_availability(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_adventure_baterias_with_availability(uuid)
  TO anon, authenticated;
```

### B) `create_registration_with_capacity` estendido

Acrescenta parâmetro `p_bateria_assignments jsonb` (NULL quando `has_baterias = false`).

Fluxo dentro da função:

1. Valida `p_group_size > 0` → senão `INVALID_GROUP_SIZE`.
2. `SELECT title, price, max_participants, registrations_enabled, has_baterias INTO ... FROM adventures WHERE id = p_adventure_id FOR UPDATE`.
3. Se não encontrar → `ADVENTURE_NOT_FOUND`.
4. Se `registrations_enabled = false` → `REGISTRATIONS_DISABLED`.
5. **Se `has_baterias = true`:**
   - `p_bateria_assignments` precisa ser objeto com chaves `principal` (uuid) e `participants` (array de uuid).
   - `jsonb_array_length(p_bateria_assignments->'participants') = p_group_size - 1`. Senão → `BATERIA_ASSIGNMENTS_MISMATCH`.
   - Todos os UUIDs em `principal` + `participants` precisam existir em `adventure_baterias WHERE adventure_id = p_adventure_id`. Senão → `BATERIA_NOT_FOUND`.
   - Conta, para o novo grupo, quantos slots vão para cada bateria. Para cada bateria afetada, soma com o `reserved` atual (mesma query do RPC de leitura) e compara com `capacity`. Se exceder → `BATERIA_CAPACITY_EXCEEDED` com mensagem incluindo o `label` da bateria estourada.
6. **Se `has_baterias = false`:**
   - Comportamento atual: soma `group_size` ativos e compara com `max_participants`. Erro `CAPACITY_EXCEEDED` quando excede.
   - Se `p_bateria_assignments` foi enviado mesmo assim, o RPC ignora (passa NULL no INSERT).
7. INSERT em `registrations` com `bateria_assignments` (ou NULL).
8. Retorna a row inserida.

Permissões: igual ao RPC atual (`REVOKE FROM PUBLIC`, `GRANT TO anon, authenticated`).

### C) Apagar bateria com segurança

```sql
CREATE OR REPLACE FUNCTION delete_adventure_bateria(p_bateria_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'NOT_AUTHORIZED';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM registrations r,
       LATERAL (
         SELECT (r.bateria_assignments->>'principal')::uuid AS bid
         WHERE r.bateria_assignments ? 'principal'
         UNION ALL
         SELECT (jsonb_array_elements_text(r.bateria_assignments->'participants'))::uuid
         WHERE r.bateria_assignments ? 'participants'
       ) s(bid)
  WHERE s.bid = p_bateria_id
    AND is_registration_capacity_active(r.payment_status);

  IF v_count > 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'BATERIA_HAS_REGISTRATIONS';
  END IF;

  DELETE FROM adventure_baterias WHERE id = p_bateria_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_adventure_bateria(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION delete_adventure_bateria(uuid) TO authenticated;
```

### D) RPC `save_adventure_baterias` (atomicidade do save admin)

Recebe `p_adventure_id`, `p_has_baterias boolean` e `p_baterias jsonb` (array no formato do form). Faz, dentro de uma única transação:

1. Verifica `is_admin()`. Senão → `NOT_AUTHORIZED`.
2. Lê `has_baterias` atual de `adventures`. Se mudou (transição true↔false), valida:
   - true → false: nenhuma `registrations` ativa da aventura pode ter `bateria_assignments` não-nulo. Senão → `CANNOT_DISABLE_BATERIAS_WITH_REGISTRATIONS`.
   - false → true: nenhuma `registrations` ativa pode existir para a aventura. Senão → `CANNOT_ENABLE_BATERIAS_WITH_REGISTRATIONS`.
3. Atualiza `adventures.has_baterias = p_has_baterias` na row alvo.
4. Lê IDs atuais das baterias dessa aventura.
5. Para cada item de `p_baterias`:
   - Se traz `id`, UPDATE em `adventure_baterias` setando `label, start_time, end_time, capacity, sort_order`.
   - Se não traz `id`, INSERT.
6. Para cada bateria existente que **não** está em `p_baterias`, aplica a mesma checagem do `delete_adventure_bateria` (count de slots em inscrições ativas); se 0, deleta; se > 0, aborta com `BATERIA_HAS_REGISTRATIONS`.
7. Erros possíveis: `NOT_AUTHORIZED`, `BATERIA_HAS_REGISTRATIONS`, `CANNOT_DISABLE_BATERIAS_WITH_REGISTRATIONS`, `CANNOT_ENABLE_BATERIAS_WITH_REGISTRATIONS`, `INVALID_BATERIA_PAYLOAD`.

Justificativa: ao colocar `has_baterias` e o upsert/delete das baterias na mesma transação, o banco nunca fica num estado onde `has_baterias = true` sem baterias correspondentes, nem onde baterias órfãs persistem com a flag desligada. Falha no meio do upsert aborta tudo via rollback automático do PostgreSQL.

---

## UI Admin — `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

### Onde encaixar

Após o bloco "Habilitar Inscrições" (coluna direita), antes do `<Separator />` que precede "Construtor de Formulário de Inscrição", adicionar:

1. Toggle "Habilitar Baterias" (`<Switch>` ligado a `hasBaterias` no form).
2. Quando ligado, expande a seção "Baterias" com tabela compacta:

```
┌─ Baterias ─────────────────────────────────────────────┐
│ # | Nome             | Início | Fim   | Cap. | 🗑      │
│ 1 | [Turma Manhã]    | 08:00  | 10:00 | [15] | 🗑      │
│ 2 | [Turma Tarde]    | 14:00  | 16:00 | [15] | 🗑      │
│ [+ Adicionar Bateria]                                  │
└────────────────────────────────────────────────────────┘
```

Implementação: `useFieldArray({ name: "baterias" })`.

### Comportamento condicional

- `hasBaterias = false` → seção "Baterias" some. Campo "Limite Máximo de Pessoas" fica visível e editável (comportamento atual).
- `hasBaterias = true` → seção aparece, exige pelo menos 1 bateria no array (validação Zod). Campo "Limite Máximo de Pessoas" fica **disabled** com nota: "Não usado quando baterias estão ativas — a capacidade é definida por bateria."
- **Liga toggle com inscrições já existentes:** bloqueia no client (UX). Antes de salvar, verifica `registrations` existentes para aquela aventura via Supabase select; se houver alguma, toast: "Não é possível ativar baterias com inscrições já existentes. Cancele as inscrições primeiro."
- **Desliga toggle com inscrições nas baterias:** bloqueia no client (UX). Antes de salvar, chama `get_adventure_baterias_with_availability` e se algum `reserved > 0`, toast: "Não é possível desativar baterias com inscrições ativas. Cancele as inscrições primeiro."
- Mesmo com a checagem no client, o RPC `save_adventure_baterias` enforça server-side e retorna `CANNOT_ENABLE_BATERIAS_WITH_REGISTRATIONS` ou `CANNOT_DISABLE_BATERIAS_WITH_REGISTRATIONS`. O client mapeia esses erros para os mesmos toasts.

### Validação Zod

```ts
const bateriaSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1, "Nome da bateria é obrigatório."),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use formato HH:MM."),
  end_time:   z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use formato HH:MM."),
  capacity:   z.coerce.number().int().min(1, "Capacidade mínima é 1."),
}).refine(b => b.end_time > b.start_time, {
  message: "Horário final deve ser maior que o inicial.",
  path: ["end_time"],
});

// No schema principal:
hasBaterias: z.boolean(),
baterias: z.array(bateriaSchema).optional(),
// + .superRefine que exige baterias.length >= 1 quando hasBaterias = true.
```

Nenhuma validação de sobreposição entre baterias (decisão 11).

### Aviso ao reduzir capacidade abaixo do reservado

Antes do submit, para cada bateria com `id`, compara a `capacity` editada com `reserved` (obtido do RPC). Se `nova < reserved`, mostra `<AlertDialog>`:

> "A Bateria 'Turma Manhã' tem 12 inscrições e você está reduzindo a capacidade para 10. As inscrições atuais serão mantidas, mas a bateria ficará com excedente. Deseja continuar?"

Botões: "Cancelar" / "Salvar mesmo assim".

### Delete bateria

- Botão 🗑 chama `delete_adventure_bateria` se a bateria já tem `id`.
- Erro `BATERIA_HAS_REGISTRATIONS` → toast "Não é possível remover uma bateria com inscrições. Cancele as inscrições primeiro."
- Bateria sem `id` (recém-adicionada no form) → apenas remove do array local.

### Persistência (onSubmit)

A ordem é importante para evitar estado inconsistente entre `has_baterias` e a tabela `adventure_baterias`.

1. UPDATE em `adventures` setando **todos os campos atuais exceto `has_baterias`** (título, descrição, preço, etc.). Esse update é menos sensível — se falhar, abortar e mostrar toast.
2. Chama `save_adventure_baterias(adventure_id, has_baterias, baterias_payload)` RPC, que atomicamente atualiza a flag e o conjunto de baterias.
3. Em erro do passo 1, toast com mensagem traduzida; nada foi alterado na parte de baterias.
4. Em erro do passo 2, toast com mensagem traduzida; campos do adventure foram atualizados mas baterias permanecem como estavam. Aceitável porque essa janela só afeta campos visuais (título, descrição), não capacidade.
5. Em sucesso, `router.push("/admin/adventures")` + `router.refresh()` (comportamento atual).

---

## UI Pública

### Página da aventura — `src/app/(main)/adventures/[slug]/page.tsx`

Quando `adventure.has_baterias = true`:

- A linha "Restam X vagas reservadas no momento" é substituída por chamada a `get_adventure_baterias_with_availability` (server-side, em paralelo aos outros loads da página).
- Mostra na página, antes do form, uma lista resumida:

  ```
  Horários disponíveis:
   • Turma Manhã — 08:00-10:00 — 12 vagas
   • Turma Tarde — 14:00-16:00 — 8 vagas
  ```

- A prop `remainingSpots` do `<RegistrationForm>` é substituída por `baterias: BateriaAvailability[]` quando `has_baterias = true`. Quando `has_baterias = false`, `baterias = null` e `remainingSpots` continua sendo passado.

### Form — `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

Mudanças quando `baterias` está preenchido:

**1. Card "Vagas por Bateria" no topo do form**, sem botão de ação:

```
┌─ Vagas por Bateria ──────────────────────────────┐
│ Turma Manhã (08:00-10:00)            12 vagas   │
│ Turma Tarde (14:00-16:00)             8 vagas   │
└──────────────────────────────────────────────────┘
```

Cor da contagem: verde quando `(capacity - reserved) > 0`, vermelho quando `0`.

**2. Campo "Tamanho do Grupo"** continua existindo, com `max = SUM(capacity - reserved)` somando todas as baterias.

**3. Dropdown "Bateria"** posicionado:
- Após o campo "Telefone" do contato principal, antes dos custom fields do contato.
- Após o "Nome" de cada participante adicional, antes dos custom fields simples desse participante.

Cada `<SelectItem>` fica desabilitado quando:
```
capacity - reserved - (slots já alocados a essa bateria no form atual, exceto este select) < 1
```

Texto na opção: `"<label> — HH:MM-HH:MM (<n> vagas)"`. Quando desabilitada, troca por `"(sem vagas)"`.

**4. Schema Zod do form** ganha campos condicionais:
- `principalBateriaId: z.string().uuid()` (obrigatório quando `baterias != null`).
- `participants[i].bateriaId: z.string().uuid()` (obrigatório quando `baterias != null`).
- Validação extra (`superRefine`) que conta slots por bateria e marca erro se algum estouro local for detectado antes de enviar para o servidor.

**5. Submit** monta `p_bateria_assignments`:

```ts
const bateriaAssignments = baterias
  ? {
      principal: values.principalBateriaId,
      participants: values.participants.map(p => p.bateriaId),
    }
  : null;
```

Envia para `create_registration_with_capacity` no novo parâmetro `p_bateria_assignments`.

### Tratamento de erros (atualizar `normalizeRegistrationRpcError`)

```ts
type RegistrationRpcErrorId =
  | "CAPACITY_EXCEEDED"
  | "ADVENTURE_NOT_FOUND"
  | "INVALID_GROUP_SIZE"
  | "REGISTRATIONS_DISABLED"
  | "BATERIA_ASSIGNMENTS_MISMATCH"
  | "BATERIA_NOT_FOUND"
  | "BATERIA_CAPACITY_EXCEEDED"
  | "UNKNOWN";
```

Toasts em pt-BR:
- `BATERIA_ASSIGNMENTS_MISMATCH` → "Selecione uma bateria para cada participante."
- `BATERIA_NOT_FOUND` → "Bateria indisponível. Recarregue a página e tente de novo."
- `BATERIA_CAPACITY_EXCEEDED` → "As vagas dessa bateria se esgotaram. Recarregue e escolha outra."

### Realtime

Inscrever uma subscription no canal `adventure_baterias` filtrado por `adventure_id` (via `use-collection` ou direto). Mudança em qualquer bateria dispara refetch de `get_adventure_baterias_with_availability` e atualiza:

- Contagem do card "Vagas por Bateria".
- Estado disabled das opções nos dropdowns.

Se o usuário tentar submeter com uma seleção que se tornou inválida, o erro `BATERIA_CAPACITY_EXCEEDED` do RPC é a última linha de defesa.

---

## Lista admin de inscrições

### `src/app/(admin)/admin/registrations/page.tsx`

Nova coluna **"Baterias"** mostrando resumo agregado quando `bateria_assignments` está preenchido. Ex: para um grupo de 3 com 2 na Manhã e 1 na Tarde, mostra `Manhã (2), Tarde (1)`. Quando `bateria_assignments` é `NULL`, exibe `—`.

Para resolver `bateria_id → label`, a página carrega `adventure_baterias` filtrando pelas aventuras relevantes (ids únicos do conjunto de inscrições visíveis) e monta um `Map<string, string>` em memória.

Filtro por bateria fica **fora do escopo** (decisão 12).

### Exportação XLSX — `src/app/(admin)/admin/registrations/_lib/export-registrations.ts`

Nova coluna **"Bateria"** por linha. Como o export já achata cada inscrição em N+1 linhas (Titular + N participantes), cada linha resolve sua bateria específica:

- Linha "Titular" → `bateria_assignments.principal`.
- Linha "Participante N+1" → `bateria_assignments.participants[N-1]`.
- `NULL` ou ausente → célula vazia.

Mudança na assinatura:

```ts
export type ExportRegistrationsInput = {
  adventureTitle: string;
  registrations: Registration[];
  bateriaLabels?: Map<string, string>;
};
```

Em `flattenRegistration`, cada `ExportRegistrationRow` ganha `bateriaLabel: string` resolvido do `bateria_assignments`. Coluna "Bateria" inserida no schema entre "Posicao no grupo" e "Nome".

---

## Edge cases

| Caso | Comportamento |
|------|---------------|
| Inscrição antiga (`bateria_assignments` NULL) numa aventura com baterias ativadas depois | Mantém a inscrição visível; lista admin mostra `—`; export deixa célula vazia. Cômputo de `reserved` ignora `bateria_assignments NULL`. |
| Admin tenta ligar `has_baterias` numa aventura que já tem inscrições | Bloqueado no client antes de salvar; toast orienta a cancelar inscrições. |
| Admin tenta desligar `has_baterias` com inscrições atribuídas a baterias | Bloqueado no client antes de salvar; toast orienta a cancelar inscrições. |
| Concorrência: outro usuário esgota bateria enquanto este preenche o form | Subscription realtime desabilita opções; se mesmo assim chegar ao submit, RPC retorna `BATERIA_CAPACITY_EXCEEDED` (última defesa). |
| Pagamento cancelado/recusado | `is_registration_capacity_active` já trata: status `cancelled`/`refunded` libera o slot da bateria. |
| Aventura deletada | `ON DELETE CASCADE` na FK de `adventure_baterias` limpa tudo automaticamente. |
| Admin reduz `capacity` de bateria abaixo de `reserved` | Permitido com `<AlertDialog>` de confirmação; nenhuma inscrição existente é desfeita. |

---

## Fora do escopo (anti-YAGNI)

- Validação de sobreposição de horários entre baterias da mesma aventura.
- Filtro por bateria na listagem admin de inscrições.
- Drag-and-drop para reordenar baterias (a ordem é definida pelo array do form).
- Mover uma inscrição existente entre baterias (admin precisa cancelar e o usuário se reinscrever).
- Notificação ao usuário quando o admin altera horários de uma bateria já confirmada.

---

## Lista de arquivos afetados

**Novo:**
- `supabase/migrations/008_add_baterias.sql`

**Editado:**
- `src/lib/types.ts` — `Bateria`, `BateriaAvailability`, `BateriaAssignments`, campos novos em `Adventure` e `Registration`.
- `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` — toggle, tabela de baterias, validação Zod, save via RPC.
- `src/app/(admin)/admin/adventures/[id]/edit/page.tsx` — carregar baterias com a aventura.
- `src/app/(admin)/admin/registrations/page.tsx` — coluna "Baterias", carregar labels.
- `src/app/(admin)/admin/registrations/_lib/export-registrations.ts` — coluna "Bateria" no XLSX.
- `src/app/(main)/adventures/[slug]/page.tsx` — listagem "Horários disponíveis", passar `baterias` em vez de `remainingSpots` quando aplicável.
- `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` — card de vagas, dropdowns por participante, validações, submit, realtime, novos códigos de erro.
