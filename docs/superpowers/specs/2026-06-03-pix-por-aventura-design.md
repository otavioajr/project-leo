# PIX por aventura — Design

**Data:** 2026-06-03
**Status:** Aprovado (design), aguardando plano de implementação

## Problema

Hoje a configuração de PIX é **global**: existe uma única config na tabela `content`
(id `"pix"`) com `pixEnabled`, `pixCopiaECola` (4 códigos copia-e-cola, um por tamanho
de grupo: 1, 2, 3 e 4 pessoas) e `instructions`. Como cada código PIX copia-e-cola
(BR Code estático) carrega um **valor fixo embutido**, uma config global obriga todas as
aventuras a compartilharem os mesmos valores — o que só faz sentido se todas custarem
igual.

Cada aventura tem seu próprio `price`, então o PIX precisa ser **por aventura**.

## Objetivo

Mover a configuração de PIX para dentro de cada aventura, de forma que cada uma tenha
seus próprios códigos copia-e-cola, seu próprio interruptor de ativação e suas próprias
instruções.

## Decisões de produto (validadas com o usuário)

1. **Estrutura mantida:** cada aventura tem **4 slots** de PIX copia-e-cola — um por
   tamanho de grupo (1, 2, 3, 4 pessoas) — exatamente como hoje, só que por aventura.
2. **Ativação por aventura:** cada aventura ganha seu próprio interruptor "Ativar PIX".
   Permite ter os códigos cadastrados mas o PIX desligado. Quando desligado, a tela de
   pagamento mostra "Inscrição realizada, entraremos em contato".
3. **Migração — começar vazio:** aventuras existentes ficam **sem PIX** (toggle
   desligado, códigos em branco). A config global atual é removida. Não há cópia
   automática; o admin recadastra os códigos em cada aventura.
4. **Instruções por aventura:** o campo "Instruções Adicionais" passa a pertencer a cada
   aventura, junto dos códigos PIX.

## Decisão técnica (validada com o usuário)

**Armazenamento:** uma coluna **JSONB `pix_config`** na tabela `adventures`, guardando a
mesma estrutura do tipo `PixConfig` que já existe:
`{ pixEnabled, pixCopiaECola: {1,2,3,4}, instructions }`.

Motivo: espelha o tipo `PixConfig` existente, reaproveita `normalizePixConfig()` sem
reescrever nada, segue o padrão do projeto (a config global hoje já é JSONB em
`content.data`) e torna a migração "começar vazio" trivial (`DEFAULT '{}'`).

## Mudanças por componente

### 1. Banco — migration `supabase/migrations/011_pix_per_adventure.sql`

> **Numeração:** `010_adventure_difficulty_optional.sql` já existe. O próximo número
> sequencial livre é **011**. Confirmar o próximo livre no momento da implementação
> (CLAUDE.md exige numeração sequencial).

```sql
ALTER TABLE adventures
  ADD COLUMN pix_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Config global de PIX não é mais usada (decisão: começar vazio)
DELETE FROM content WHERE id = 'pix';
```

- **RLS:** sem mudanças. `adventures_select` já é `USING (true)` (leitura pública, usada
  pela tela de pagamento); `adventures_insert`/`adventures_update` já exigem `is_admin()`.
- Aventuras existentes ficam com `pix_config = '{}'` → normalizado para PIX desligado.

### 2. Tipos — `src/lib/types.ts`

- Adicionar `pix_config?: PixConfig | null` ao tipo `Adventure`.
- `PixConfig`, `PixCopiaEColaByGroupSize` e `PixGroupSize` permanecem inalterados (agora
  reusados por aventura em vez de uma config global).

### 3. Normalização — `src/lib/pix-config.ts`

- `normalizePixConfig()` é reaproveitado **sem alteração** para normalizar
  `adventure.pix_config`. Ele já cobre `null`, `undefined`, `string` e `{}`
  (`const data = (raw ?? {}) as ...`), retornando sempre um `PixConfig` com os 4 slots e
  `pixEnabled`/`instructions` — não é preciso tratamento adicional para o caso vazio.

### 4. Componente compartilhado — `PixSlotCard`

- Extrair o componente `PixSlotCard` (textarea do código + preview de QR Code) que hoje
  vive dentro de `configuracao-pix/_components/pix-config-form.tsx` para um arquivo
  reutilizável: `src/app/(admin)/admin/adventures/_components/pix-slot-card.tsx`.
- Motivo: ele será usado pela nova seção PIX do form de aventura, e a página global (sua
  origem atual) será removida.
- **Padrão de binding ao react-hook-form (manter o do form global, NÃO o de baterias):**
  cada `PixSlotCard` é envolvido por um `Controller` sobre a chave numérica
  `pixCopiaECola.{1..4}` (recebendo `value`/`onChange`). O toggle usa `FormField` + `Switch`
  sobre `pixEnabled`, com `<FormMessage/>` exibindo a mensagem do `refine`.

### 5. Form de aventura — `src/app/(admin)/admin/adventures/_components/adventure-form.tsx`

- **Schema Zod:** adicionar
  - `pixEnabled: boolean`
  - `pixCopiaECola: { 1,2,3,4: string }` (default `""` em cada slot)
  - `pixInstructions: string` (opcional)
  - **Refine:** se `pixEnabled` estiver ligado, exigir ao menos um código não-vazio
    (mesma regra do form global atual), com `path: ['pixEnabled']` para que a mensagem
    apareça no `<FormMessage/>` do toggle.
- **defaultValues — mapeamento de ENTRADA explícito** (os nomes do form diferem do JSONB):
  ```ts
  const pix = normalizePixConfig(adventure?.pix_config);
  // ...
  pixEnabled: pix.pixEnabled,
  pixCopiaECola: pix.pixCopiaECola,
  pixInstructions: pix.instructions ?? "",  // instructions (JSONB) -> pixInstructions (form)
  ```
  `normalizePixConfig` cobre `null`/`undefined`/`{}`, então não há caso vazio a tratar à parte.
- **Nova seção "Pagamento PIX"** no JSX: toggle "Ativar PIX" + 4 `PixSlotCard` (um por
  tamanho de grupo) + campo de instruções, usando o padrão de binding descrito na seção 4.
- **`onSubmit` — ordem das operações (importante por causa do fluxo de baterias):**
  `pix_config` é adicionado ao objeto **`adventureData`** já existente
  (`adventure-form.tsx:~403`), com mapeamento de **SAÍDA**:
  ```ts
  pix_config: {
    pixEnabled: values.pixEnabled,
    pixCopiaECola: values.pixCopiaECola,
    instructions: values.pixInstructions,  // pixInstructions (form) -> instructions (JSONB)
  }
  ```
  Esse objeto é persistido via o **`update`/`insert` direto em `adventures`** que já existe,
  **ANTES** da chamada ao RPC `save_adventure_baterias`. O RPC permanece **inalterado** —
  não recebe nem altera `pix_config` (ele só cuida de `has_baterias` + conjunto de
  baterias). Sem RPC novo para PIX (são apenas dados, sem regra de atomicidade).

### 6. Remover a config global do admin

- Apagar a pasta `src/app/(admin)/admin/configuracao-pix/` inteira
  (`page.tsx` + `_components/pix-config-form.tsx`) — **depois** de extrair o `PixSlotCard`
  (seção 4).
- Em `src/app/(admin)/admin/layout.tsx`:
  - Remover o item de menu
    `{ href: "/admin/configuracao-pix", label: "Configuração PIX", icon: QrCode }` (linha 29).
  - Remover `QrCode` da lista de imports de `lucide-react` (linha 18) — ele é usado
    **apenas** nesse item de menu, então ficará órfão com certeza.
- Após apagar a pasta, rodar `grep` por `configuracao-pix` e `PixConfigForm` em `src/`
  para garantir que não restem imports/links órfãos que quebrem o build.

### 7. Tela de pagamento — `src/app/(main)/adventures/[slug]/pagamento/page.tsx`

- Substituir a busca da config global pela busca da aventura por `slug`:
  ```ts
  // antes: supabase.from('content').select('data').eq('id', 'pix').single()
  //        → normalizePixConfig(data?.data)
  // depois:
  supabase.from('adventures').select('pix_config').eq('slug', slug).single()
  //        → normalizePixConfig(data?.pix_config)   // <- pix_config, NÃO data
  ```
  O `slug` já está disponível via `useParams()`.
- **Dependências do `useEffect`:** hoje o efeito de busca depende só de `[supabase]`. Passar
  a depender de `[supabase, slug]` e proteger contra `slug` ausente, senão a config não
  recarrega ao trocar de aventura. Manter os nomes de state `pixConfig`/`isLoadingPixConfig`
  para minimizar o diff.
- **Inalterado:** seleção do código por `group_size` (`pixCopiaECola[1..4]`), o
  `import QRCode from "qrcode"` e a geração visual do QR Code, copia-e-cola, exibição das
  instruções e os fluxos de erro existentes ("Inscrição Realizada" quando PIX desligado,
  "PIX Indisponível" quando não há código para aquele tamanho de grupo). **Apenas a query
  da config muda.**

### 8. Evitar exposição pública de `pix_config` na página da aventura

- A página pública `src/app/(main)/adventures/[slug]/page.tsx` (linha ~43) usa
  `.from('adventures').select()` **sem lista de colunas**, então passaria a trazer
  `pix_config` para o público dessa rota.
- **Ação:** trocar `.select()` por uma lista explícita de colunas que **exclui**
  `pix_config`:
  `id, slug, title, description, long_description, max_participants, price, duration,
  location, difficulty, image_url, image_description, registrations_enabled, has_baterias,
  custom_fields, created_at`.
- Não é um segredo (o código PIX é exibido na tela de pagamento de qualquer forma), mas a
  página da aventura não precisa carregá-lo — manter o payload enxuto.

## Fluxo de dados

1. Admin cria/edita uma aventura e preenche a seção "Pagamento PIX" → `pix_config` é salvo
   junto com os demais campos da aventura (no `update`/`insert` direto, antes do RPC de
   baterias).
2. Cliente se inscreve → é redirecionado para `/adventures/[slug]/pagamento`.
3. A tela de pagamento busca `adventures.pix_config` por `slug`, normaliza, escolhe o
   código pelo tamanho do grupo da inscrição e exibe QR Code + copia-e-cola.

## Edge cases (todos já cobertos pela UI atual)

- `pix_config` vazio ou `pixEnabled = false` → tela "Inscrição Realizada, entraremos em
  contato".
- Tamanho de grupo sem código cadastrado → tela "PIX Indisponível".
- Aventuras antigas (`pix_config = '{}'`) → PIX desligado, sem quebra de fluxo.

## Notas

- **Valor cobrado:** assim como hoje, o valor efetivamente cobrado vem do código PIX
  copia-e-cola (BR Code com valor embutido). O `total_amount` calculado no banco
  (`price × group_size`, em `migrations/007`) continua sendo apenas exibido na tela de
  pagamento. Garantir consistência entre o `price` da aventura e os valores embutidos nos
  4 códigos é responsabilidade do admin (igual a hoje).

## Verificação

O projeto **não tem framework de testes**. Validação será feita por:

- `npm run typecheck` (TypeScript strict)
- `npm run lint`
- Teste manual do fluxo: cadastrar PIX numa aventura → inscrever-se → conferir QR Code,
  valor e copia-e-cola na tela de pagamento; conferir o fluxo com PIX desligado e com
  tamanho de grupo sem código; editar a aventura e confirmar que os 4 códigos e as
  instruções voltam preenchidos (mapeamento de entrada).

## Fora de escopo

- Cópia automática da config global para aventuras existentes (decidido: começar vazio).
- Cálculo/geração automática do código PIX a partir do `price` (continua manual, colado
  pelo admin).
- Suporte a grupos maiores que 4 pessoas (limite atual `PIX_MAX_GROUP_SIZE = 4` é mantido).
