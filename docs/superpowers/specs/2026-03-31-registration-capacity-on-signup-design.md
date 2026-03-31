# Reserva de Vagas no Momento da Inscrição

## Visão geral

Alterar a regra de lotação para que a inscrição consuma vaga imediatamente no momento da criação, sem depender da confirmação manual do admin.

O comportamento aprovado para esta mudança é:

- a vaga é reservada assim que a inscrição é criada
- a reserva vale para inscrições com `payment_status` `pending`, `awaiting_confirmation` e `confirmed`
- a confirmação de pagamento pelo admin não altera a ocupação de vagas
- a vaga só é liberada quando a inscrição for excluída ou cancelada administrativamente

O objetivo é alinhar a lotação real com o momento em que o usuário entra na fila da aventura, evitando que várias inscrições pendentes aparentem ainda deixar vagas disponíveis.

---

## Problema atual

Hoje a capacidade da aventura considera apenas inscrições `confirmed`.

Na prática, isso cria duas inconsistências:

- o formulário público continua aceitando novas inscrições enquanto existirem vagas "não confirmadas"
- o limite real só é imposto quando o admin confirma o pagamento, deslocando a decisão de lotação para uma etapa posterior

Além disso, a checagem atual acontece em camadas diferentes:

- a página pública calcula vagas com base em uma RPC que soma apenas `confirmed`
- o admin repete a checagem ao clicar em confirmar pagamento
- o `insert` da inscrição continua sendo feito diretamente do cliente

Esse desenho permite concorrência entre inscrições simultâneas e não garante consistência entre UI e banco.

---

## Requisitos funcionais

### Regra de ocupação

- `max_participants` deve considerar todas as inscrições ativas da aventura
- inscrições ativas, neste escopo, são as que ainda existem na tabela `registrations`
- `payment_status` deixa de ser critério de consumo de vaga
- se `max_participants` for `null`, a aventura continua sem limite

### Criação de inscrição

- o sistema deve impedir a criação de uma inscrição que exceda a lotação restante
- essa validação final deve acontecer no banco, não apenas no cliente
- ao falhar por falta de vagas, o usuário deve receber mensagem específica

### Liberação de vaga

- excluir a inscrição no admin devolve as vagas correspondentes ao `group_size`
- não haverá fluxo separado de "não confirmado" nesta entrega
- cancelamento administrativo pode ser tratado como exclusão da inscrição

### Fluxo de pagamento

- `pending`, `awaiting_confirmation` e `confirmed` continuam existindo
- o botão de confirmar pagamento continua disponível para fins operacionais
- confirmar pagamento não deve recalcular nem bloquear lotação

---

## Abordagem escolhida

Manter o modelo atual de `payment_status` e mover a regra de capacidade para uma camada única no banco.

### Motivos

- menor impacto no modelo de dados
- preserva o fluxo atual de pagamento
- reduz divergência entre página pública, formulário e admin
- evita depender de validação exclusivamente no cliente

### Alternativas rejeitadas

Adicionar um novo campo como `holds_spot` ou `spot_status` foi descartado por introduzir um segundo eixo de estado sem necessidade imediata.

Manter a lógica só no frontend também foi descartado, porque não resolve concorrência nem garante consistência sob envios simultâneos.

---

## Design de dados e banco

### Função de contagem de vagas ocupadas

A função atual, criada em [`supabase/migrations/005_add_adventure_capacity.sql`](/Users/otavioajr/Documents/Projetos/project-leo/supabase/migrations/005_add_adventure_capacity.sql), soma apenas inscrições `confirmed`.

Ela deve ser substituída por uma função que some todas as inscrições ainda existentes da aventura:

```sql
SELECT COALESCE(SUM(group_size), 0)::integer
FROM registrations
WHERE adventure_id = p_adventure_id;
```

Uma nova migration deve atualizar ou recriar essa função. Não faz parte desta entrega editar migrations já aplicadas.

O nome da função pode permanecer o mesmo por compatibilidade, mas a semântica deixa de ser "confirmed participants". Se o nome atual começar a gerar ambiguidade no código, vale renomear também os consumidores para refletir "reserved participants" ou "occupied spots".

### RPC de criação de inscrição

A criação deve sair do `insert` direto do cliente e passar por uma função SQL que:

1. busca `max_participants` da aventura
2. calcula o total já reservado na aventura
3. compara `reserved + new_group_size` com `max_participants`
4. lança erro se ultrapassar o limite
5. insere a inscrição e retorna a linha criada

### Autorização da RPC

Como a criação atual acontece por `INSERT` público controlado por policy, a nova RPC precisa preservar esse comportamento para usuários não autenticados.

O plano deve assumir uma RPC `SECURITY DEFINER` com validações explícitas para:

- aceitar apenas os campos esperados da inscrição
- validar a existência da aventura
- aplicar a regra de lotação antes do insert
- retornar apenas a linha recém-criada

Isso evita depender de permissões de `INSERT` diretas no cliente para a nova regra transacional.

### Concorrência

O ponto central desta mudança é garantir que a checagem real aconteça no banco. Sem isso, duas submissões simultâneas podem ler a mesma disponibilidade e ultrapassar a capacidade.

Esta entrega deve usar uma RPC única para validar e inserir. O plano de implementação deve detalhar se isso será feito com bloqueio explícito da linha da aventura (`FOR UPDATE`) ou estratégia equivalente que preserve atomicidade suficiente para a regra de lotação.

---

## Design da página pública

### Página da aventura

[`src/app/(main)/adventures/[slug]/page.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(main)/adventures/[slug]/page.tsx) deve passar a exibir lotação baseada em vagas reservadas, não apenas confirmadas.

Mudanças previstas:

- trocar a chamada/semântica da contagem para refletir reservas ativas
- recalcular `remainingSpots` com base nessa nova contagem
- manter o comportamento de `sold out` quando `remainingSpots <= 0`
- ajustar o texto da interface para não falar em "pessoas já confirmadas"

Textos aceitáveis para a UI:

- "vagas reservadas"
- "lugares ocupados no momento"

O importante é deixar claro que a inscrição já segura a vaga antes da confirmação manual.

### Formulário público

[`src/app/(main)/adventures/[slug]/_components/registration-form.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(main)/adventures/[slug]/_components/registration-form.tsx) continua limitando `groupSize` pelo número de vagas restantes exibido na tela, mas essa validação passa a ser apenas preventiva.

Mudanças previstas:

- trocar o `insert` direto por chamada à nova RPC
- manter o redirecionamento para a página de pagamento com `registrationId` e `token`
- tratar o erro de lotação retornado pela RPC com mensagem específica ao usuário
- ajustar o texto auxiliar para refletir vagas reservadas/disponíveis, não vagas "confirmadas"

Se a disponibilidade mudar entre o carregamento da página e o envio do formulário, a RPC será a fonte final de verdade.

---

## Design do admin

### Tela de inscrições

[`src/app/(admin)/admin/registrations/page.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(admin)/admin/registrations/page.tsx) não deve mais bloquear a ação de confirmar pagamento com base em `max_participants`.

Mudanças previstas:

- remover a checagem de lotação de `handleConfirmPayment`
- manter a atualização de `payment_status` para `confirmed`
- manter a exclusão como ação que libera vagas

### Semântica administrativa

O admin continua controlando o status de pagamento, mas não mais a ocupação de vagas. A lotação passa a ser decidida no momento da inscrição.

Se houver texto na interface sugerindo que "confirmar pagamento" também confirma a vaga, esse texto deve ser revisado para evitar ambiguidade.

---

## Tratamento de erros

Casos esperados:

- aventura sem limite: inscrição permitida normalmente
- aventura inexistente ou inválida: RPC falha com erro claro
- vagas insuficientes: RPC falha com erro específico de lotação
- erro inesperado de insert: manter fallback genérico já usado pelo formulário

Na experiência do usuário final, o erro mais importante é o de lotação concorrente. A mensagem precisa explicar que as vagas se esgotaram enquanto a inscrição era enviada.

Para reduzir acoplamento frágil no frontend, a implementação deve definir um contrato estável para o erro de lotação, preferencialmente por código ou mensagem canônica previsível da RPC.

---

## Compatibilidade

### Dados existentes

Nenhuma migration estrutural em tabela é obrigatória para esta entrega se a solução ficar restrita a:

- atualizar a função de contagem
- adicionar a RPC de criação

As inscrições já existentes continuam válidas. Após a mudança, todas as inscrições não excluídas passam a contar para a capacidade, inclusive as antigas com `payment_status` diferente de `confirmed`.

### Impacto de negócio

Esse efeito retroativo precisa ser aceito: aventuras com inscrições pendentes antigas podem aparecer mais cheias imediatamente após o deploy. Isso é coerente com a nova regra aprovada.

---

## Arquivos afetados

- nova migration em [`supabase/migrations/`](/Users/otavioajr/Documents/Projetos/project-leo/supabase/migrations/)
- [`src/app/(main)/adventures/[slug]/page.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(main)/adventures/[slug]/page.tsx)
- [`src/app/(main)/adventures/[slug]/_components/registration-form.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(main)/adventures/[slug]/_components/registration-form.tsx)
- [`src/app/(admin)/admin/registrations/page.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(admin)/admin/registrations/page.tsx)

Arquivos adicionais podem surgir se houver helpers ou tipos intermediários necessários para consumir a nova RPC.

---

## Verificação esperada

### Capacidade

- aventura com limite 10 e 1 inscrição `pending` de grupo 3 deve exibir 7 vagas restantes
- aventura com inscrições `pending` + `awaiting_confirmation` + `confirmed` deve somar todas para a lotação
- aventura sem limite continua aceitando inscrições normalmente

### Concorrência

- quando duas inscrições simultâneas disputarem as últimas vagas, apenas as que couberem devem ser criadas

### Admin

- confirmar pagamento de uma inscrição não altera a quantidade de vagas restantes
- excluir uma inscrição devolve suas vagas para a aventura

### Fluxo público

- o formulário bloqueia grupos maiores que a disponibilidade mostrada
- se a disponibilidade acabar entre carregamento e envio, o usuário recebe erro claro de lotação
- a inscrição criada com sucesso continua redirecionando para a página de pagamento
