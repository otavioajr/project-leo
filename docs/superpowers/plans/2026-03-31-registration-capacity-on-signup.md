# Reserva de Vagas na Inscrição Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer com que cada inscrição consuma vagas no momento da criação, com validação transacional no banco e UI alinhada à nova regra de lotação.

**Architecture:** A lotação passa a ser centralizada no Supabase. Uma nova migration atualiza a função de contagem para considerar todas as inscrições existentes e adiciona uma RPC `SECURITY DEFINER` para validar capacidade e inserir a inscrição atomicamente. O frontend público troca o `insert` direto por essa RPC, ajusta os textos para “vagas reservadas”, e o admin deixa de bloquear confirmação de pagamento por capacidade.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase Postgres/RPC, React Hook Form, Zod, Next lint, `tsc --noEmit`

---

## File Structure

- Modify: `src/app/(main)/adventures/[slug]/page.tsx`
  Responsibility: trocar a semântica da lotação pública para reservas ativas e ajustar textos de UI.
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`
  Responsibility: chamar a nova RPC de criação, mapear erro de lotação e atualizar textos auxiliares.
- Modify: `src/app/(admin)/admin/registrations/page.tsx`
  Responsibility: remover a checagem de lotação do fluxo de confirmação de pagamento.
- Create: `supabase/migrations/006_reserve_capacity_on_registration.sql`
  Responsibility: atualizar a função de contagem, criar a RPC transacional de inscrição e definir o contrato de erro.

## Task 1: Atualizar a camada SQL de capacidade e criação

**Files:**
- Create: `supabase/migrations/006_reserve_capacity_on_registration.sql`

- [ ] **Step 1: Escrever a migration com a função de contagem por inscrições ativas**

```sql
CREATE OR REPLACE FUNCTION get_adventure_confirmed_participants(p_adventure_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(group_size), 0)::integer
  FROM registrations
  WHERE adventure_id = p_adventure_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

- [ ] **Step 2: Adicionar a RPC transacional de criação de inscrição**

```sql
CREATE OR REPLACE FUNCTION create_registration_with_capacity(
  p_adventure_id uuid,
  p_adventure_title text,
  p_name text,
  p_email text,
  p_phone text,
  p_group_size integer,
  p_participants jsonb,
  p_custom_data jsonb,
  p_payment_status text,
  p_total_amount numeric
)
RETURNS registrations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_participants integer;
  v_reserved integer;
  v_registration registrations;
BEGIN
  SELECT max_participants
  INTO v_max_participants
  FROM adventures
  WHERE id = p_adventure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADVENTURE_NOT_FOUND';
  END IF;

  SELECT COALESCE(SUM(group_size), 0)::integer
  INTO v_reserved
  FROM registrations
  WHERE adventure_id = p_adventure_id;

  IF v_max_participants IS NOT NULL AND v_reserved + p_group_size > v_max_participants THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED';
  END IF;

  INSERT INTO registrations (
    adventure_id,
    adventure_title,
    name,
    email,
    phone,
    group_size,
    participants,
    custom_data,
    payment_status,
    total_amount
  )
  VALUES (
    p_adventure_id,
    p_adventure_title,
    p_name,
    p_email,
    p_phone,
    p_group_size,
    p_participants,
    p_custom_data,
    p_payment_status,
    p_total_amount
  )
  RETURNING *
  INTO v_registration;

  RETURN v_registration;
END;
$$;
```

- [ ] **Step 3: Restringir o caminho público de criação para passar apenas pela RPC**

Adicionar na mesma migration a remoção do `INSERT` público direto:

```sql
DROP POLICY IF EXISTS "registrations_insert" ON registrations;
```

Expected:
- clientes públicos deixam de inserir diretamente em `registrations`
- a criação pública passa a acontecer apenas pela RPC `SECURITY DEFINER`

- [ ] **Step 4: Revisar a migration para manter o contrato aprovado**

Checklist:
- função de contagem soma todas as inscrições existentes
- a RPC usa `SECURITY DEFINER`
- a RPC trava a linha da aventura com `FOR UPDATE`
- o erro de lotação usa contrato estável `CAPACITY_EXCEEDED`
- o erro de aventura inválida usa contrato estável `ADVENTURE_NOT_FOUND`
- o `INSERT` público direto em `registrations` foi removido

- [ ] **Step 5: Aplicar a migration no ambiente de desenvolvimento**

Aplicar a migration com o fluxo disponível do ambiente.

Opção preferida para agente: usar Supabase MCP com o nome `006_reserve_capacity_on_registration`.

Alternativa por CLI local, se disponível:

```bash
supabase db push
```

Expected:
- função `get_adventure_confirmed_participants` atualizada
- função `create_registration_with_capacity` disponível para o cliente
- policy `registrations_insert` removida

- [ ] **Step 6: Verificar manualmente a lógica da migration**

Verificações:
- aventura limitada com inscrições `pending` deve somar na função de contagem
- a RPC deve rejeitar grupo que ultrapassa `max_participants`
- a RPC deve inserir e retornar `id` e `registration_token` quando houver vaga
- `insert` direto em `registrations` por cliente público não deve mais ser permitido

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/006_reserve_capacity_on_registration.sql
git commit -m "feat: adiciona reserva de vagas na criacao da inscricao"
```

## Task 2: Consumir a nova regra na página pública da aventura

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/page.tsx`

- [ ] **Step 1: Renomear o estado local para refletir reservas ativas**

Trechos alvo:

```ts
const [reservedParticipants, setReservedParticipants] = useState(0);
```

e:

```ts
return { adventure, reservedParticipants, isLoading, error };
```

- [ ] **Step 2: Ajustar a leitura da RPC para a nova semântica**

Trecho alvo:

```ts
const { data: reservedCount, error: reservedError } = await supabase
  .rpc("get_adventure_confirmed_participants", { p_adventure_id: typedAdventure.id });
```

Expected:
- nomes locais deixam de usar `confirmed`
- tratamento de erro continua igual

- [ ] **Step 3: Atualizar o cálculo e os textos de vagas**

Trechos alvo:

```ts
const remainingSpots = adventure.max_participants === null
  ? null
  : Math.max(adventure.max_participants - reservedParticipants, 0);
```

e textos como:

```tsx
<p className="text-sm text-muted-foreground">
  {reservedParticipants} de {adventure.max_participants} vagas reservadas no momento
</p>
```

- [ ] **Step 4: Verificar visualmente o estado sold out e o contador**

Run: `npm run dev`

Expected:
- aventura com vagas restantes mostra contagem coerente com reservas ativas
- aventura lotada oculta o formulário com base na nova regra
- nenhum texto menciona “pessoas já confirmadas”

- [ ] **Step 5: Commit**

```bash
git add src/app/\(main\)/adventures/\[slug\]/page.tsx
git commit -m "feat: ajusta contagem publica para vagas reservadas"
```

## Task 3: Trocar o insert do formulário público pela RPC

**Files:**
- Modify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

- [ ] **Step 1: Substituir o `insert` direto por chamada `rpc`**

Trecho alvo:

```ts
const { data, error } = await supabase.rpc("create_registration_with_capacity", {
  p_adventure_id: adventureId,
  p_adventure_title: adventureTitle,
  p_name: values.name,
  p_email: values.email,
  p_phone: values.phone,
  p_group_size: values.groupSize,
  p_participants: participantsPayload,
  p_custom_data: customDataPayload,
  p_payment_status: "pending",
  p_total_amount: totalAmount,
});
```

- [ ] **Step 2: Ajustar a leitura do retorno da RPC**

Expected:
- o código continua navegando para `/pagamento`
- o retorno usado precisa conter `id` e `registration_token`
- se a RPC retornar uma linha única, normalizar o acesso antes do `router.push(...)`

- [ ] **Step 3: Mapear o erro estável de lotação para toast específico**

Trecho alvo:

```ts
if (error?.message.includes("CAPACITY_EXCEEDED")) {
  toast({
    title: "Vagas esgotadas",
    description: "As vagas desta aventura se esgotaram enquanto sua inscricao era enviada.",
    variant: "destructive",
  });
  setIsSubmitting(false);
  return;
}
```

Também tratar `ADVENTURE_NOT_FOUND` com fallback claro, mantendo erro genérico para o resto.

- [ ] **Step 4: Atualizar textos auxiliares do formulário**

Trecho alvo:

```tsx
<p className="text-sm text-muted-foreground">
  Restam {remainingSpots} {remainingSpots === 1 ? "vaga" : "vagas"} reserváveis no momento.
</p>
```

Remover linguagem que dependa de “vagas confirmadas”.

- [ ] **Step 5: Verificar o fluxo público completo**

Run: `npm run dev`

Fluxos:
- inscrição bem-sucedida continua redirecionando para a página de pagamento
- grupo maior que `remainingSpots` continua falhando na validação do formulário
- erro vindo da RPC por lotação concorrente mostra toast específico

- [ ] **Step 6: Rodar checagens estáticas**

Run: `npm run lint`
Expected: sem novos erros

Run: `npm run typecheck`
Expected: sem novos erros

- [ ] **Step 7: Commit**

```bash
git add src/app/\(main\)/adventures/\[slug\]/_components/registration-form.tsx
git commit -m "feat: cria inscricao via rpc com reserva de vagas"
```

## Task 4: Remover a checagem de capacidade da confirmação no admin

**Files:**
- Modify: `src/app/(admin)/admin/registrations/page.tsx`

- [ ] **Step 1: Simplificar `handleConfirmPayment`**

Remover o bloco que:

- consulta `adventures.max_participants`
- busca inscrições `confirmed`
- soma participantes confirmados
- bloqueia a confirmação por excesso de capacidade

Manter apenas:

```ts
const { error } = await supabase
  .from("registrations")
  .update({ payment_status: "confirmed" })
  .eq("id", registration.id);
```

- [ ] **Step 2: Revisar mensagens administrativas**

Expected:
- sucesso continua informando confirmação de pagamento
- nenhuma mensagem sugere que a vaga só é consumida ao confirmar

- [ ] **Step 3: Rodar checagens estáticas**

Run: `npm run lint`
Expected: sem novos erros

Run: `npm run typecheck`
Expected: sem novos erros

- [ ] **Step 4: Verificar manualmente o fluxo do admin**

Fluxos:
- confirmar pagamento em inscrição existente continua funcionando
- excluir inscrição continua removendo a linha
- após exclusão, a página pública passa a refletir vagas liberadas

- [ ] **Step 5: Commit**

```bash
git add src/app/\(admin\)/admin/registrations/page.tsx
git commit -m "refactor: remove validacao de lotacao da confirmacao admin"
```

## Task 5: Validação final integrada

**Files:**
- Verify: `supabase/migrations/006_reserve_capacity_on_registration.sql`
- Verify: `src/app/(main)/adventures/[slug]/page.tsx`
- Verify: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`
- Verify: `src/app/(admin)/admin/registrations/page.tsx`

- [ ] **Step 1: Rodar checagens finais do projeto**

Run: `npm run lint`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Executar validação manual end-to-end**

Checklist:
- criar inscrição `pending` e confirmar que a página pública reduz vagas imediatamente
- marcar essa inscrição como `confirmed` no admin e confirmar que a lotação não muda
- excluir a inscrição no admin e confirmar que as vagas voltam
- tentar duas inscrições que excedam o limite e confirmar bloqueio por RPC
- revisar a página pública e garantir que nenhum texto restante fale em “confirmadas” para lotação

- [ ] **Step 3: Revisar diff final antes de publicar**

Run: `git diff --stat`
Expected: apenas a migration nova e os arquivos públicos/admin previstos

- [ ] **Step 4: Commit final de integração**

```bash
git add supabase/migrations/006_reserve_capacity_on_registration.sql \
  src/app/\(main\)/adventures/\[slug\]/page.tsx \
  src/app/\(main\)/adventures/\[slug\]/_components/registration-form.tsx \
  src/app/\(admin\)/admin/registrations/page.tsx
git commit -m "feat: reserva vagas no momento da inscricao"
```
