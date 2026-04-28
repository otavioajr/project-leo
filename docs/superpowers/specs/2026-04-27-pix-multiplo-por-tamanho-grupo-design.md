# Múltiplas Chaves PIX por Tamanho de Grupo

**Data:** 2026-04-27
**Branch:** feat/pix-multiplicado

## Contexto

Hoje a configuração PIX (`content` id='pix') guarda um único `pixCopiaECola`. A página de pagamento mostra esse mesmo QR independente do tamanho do grupo (`registration.group_size`), o que obriga o cliente a calcular mentalmente o valor total ao pagar.

A funcionalidade permite ao admin cadastrar até 4 chaves PIX distintas — uma para cada tamanho de grupo (x1, x2, x3, x4) — cada uma já com o valor multiplicado pré-calculado pelo banco do admin. A página de pagamento seleciona a chave correspondente ao `group_size` da inscrição.

## Decisões

- **Limite de grupo:** o formulário de inscrição passa a aceitar no máximo 4 pessoas, alinhado aos 4 slots de PIX.
- **Slot ausente:** se o admin não cadastrou o PIX do tamanho usado pela inscrição, a página de pagamento mostra tela de erro ("PIX indisponível, entre em contato"), bloqueando o botão "Já paguei".
- **Toggle e instruções globais:** mantém-se um único `pixEnabled` e um único campo `instructions` compartilhado entre os 4 slots. Slot vazio = não cadastrado.
- **UI admin:** 4 cards empilhados verticalmente, cada um com título, textarea do copia-e-cola e preview do QR.
- **Sem migration SQL:** o `content` é JSONB; conversão do formato antigo é feita por shim em memória no carregamento.

## Modelo de Dados

`src/lib/types.ts`:

```ts
export type PixConfig = {
  pixCopiaECola: { 1: string; 2: string; 3: string; 4: string };
  pixEnabled: boolean;
  instructions?: string;
};
```

Persistido em `content` id='pix' (JSONB, sem alteração de schema). Strings vazias representam slots não configurados.

### Shim de compatibilidade

Tanto o form admin quanto a página de pagamento devem aceitar o formato antigo na leitura:

```ts
function normalizePixConfig(raw: any): PixConfig {
  const pix = raw?.pixCopiaECola;
  const isOldFormat = typeof pix === 'string';
  return {
    pixEnabled: !!raw?.pixEnabled,
    instructions: raw?.instructions,
    pixCopiaECola: isOldFormat
      ? { 1: pix, 2: '', 3: '', 4: '' }
      : { 1: pix?.['1'] ?? '', 2: pix?.['2'] ?? '', 3: pix?.['3'] ?? '', 4: pix?.['4'] ?? '' },
  };
}
```

O shim some naturalmente após o primeiro save no admin (que grava no formato novo).

## Admin — `/admin/configuracao-pix`

Arquivo: `src/app/(admin)/admin/configuracao-pix/_components/pix-config-form.tsx`

Layout:

1. Toggle global "Ativar Pagamento PIX" (`pixEnabled`) — como hoje.
2. Quatro cards empilhados, um por tamanho de grupo:
   - Título: "PIX para 1 pessoa", "PIX para 2 pessoas", "PIX para 3 pessoas", "PIX para 4 pessoas".
   - Textarea do copia-e-cola.
   - Preview do QR (`QRCode.toDataURL`) ao lado do textarea (ou abaixo em mobile), gerado em tempo real a partir do conteúdo. Preview oculto se textarea vazio.
3. Campo único "Instruções Adicionais" (`instructions`) — como hoje.
4. Botão "Salvar Configurações".

Schema Zod:

```ts
const pixConfigSchema = z.object({
  pixCopiaECola: z.object({
    1: z.string().default(''),
    2: z.string().default(''),
    3: z.string().default(''),
    4: z.string().default(''),
  }),
  pixEnabled: z.boolean(),
  instructions: z.string().optional(),
}).refine(
  (v) => !v.pixEnabled || Object.values(v.pixCopiaECola).some((s) => s.trim().length > 0),
  { message: 'Cadastre ao menos uma chave PIX para ativar o pagamento.', path: ['pixEnabled'] }
);
```

Submit faz `supabase.from('content').upsert({ id: 'pix', data: values })`.

## Formulário de Inscrição

Arquivo: `src/app/(main)/adventures/[slug]/_components/registration-form.tsx`

Alteração única no `groupSizeSchema`: adicionar `.max(4, 'O grupo pode ter no máximo 4 pessoas.')`.

A lógica de campos dinâmicos por participante e a reserva de vagas via RPC permanecem inalteradas.

## Página de Pagamento

Arquivo: `src/app/(main)/adventures/[slug]/pagamento/page.tsx`

Após carregar o `PixConfig` (já normalizado pelo shim), selecionar o slot:

```ts
const slot = registration.group_size as 1 | 2 | 3 | 4;
const pixCopiaECola = pixConfig?.pixCopiaECola?.[slot] ?? '';
```

Caminhos:

| Condição | Comportamento |
|---|---|
| `pixConfig.pixEnabled === false` | Tela atual: "Inscrição Realizada", sem QR. |
| `pixEnabled === true` e `pixCopiaECola` (do slot) preenchido | Mostra QR + copia-e-cola desse slot. Botão "Já paguei" habilitado. |
| `pixEnabled === true` e `pixCopiaECola` (do slot) vazio | Nova tela de erro: "PIX indisponível para este tamanho de grupo. Entre em contato com o organizador." Botão "Voltar para Aventura". Sem botão de "Já paguei". |

A geração do QR (`QRCode.toDataURL`) usa o copia-e-cola do slot. O valor total exibido continua vindo de `registration.total_amount`.

## Out of Scope

- Validação ou cálculo do valor PIX no backend (admin é responsável por gerar copia-e-cola correto no banco).
- Group size > 4 ou configurável.
- PIX desativado por slot individual (slot vazio já cobre o caso).

## Verificação Manual

Sem framework de testes. Conferir:

1. Salvar no admin com slots 1, 2 e 4 preenchidos (3 vazio); recarregar a página e confirmar persistência.
2. Inscrever-se com `groupSize=1` → QR do slot 1.
3. Inscrever-se com `groupSize=3` → tela de erro "PIX indisponível".
4. Inscrever-se com `groupSize=5` → form bloqueia com mensagem do schema.
5. Carregar config gravada no formato antigo (string única) → form admin mostra valor no slot 1, demais vazios; após salvar, formato novo é persistido.
