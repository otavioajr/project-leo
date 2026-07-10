# Público dos Campos do Formulário de Inscrição

## Visão geral

O construtor de formulário de inscrição não deve apresentar Nome Completo, E-mail, Telefone ou Nome dos participantes como campos automáticos. O administrador define todos os campos de dados necessários para cada aventura e escolhe, campo a campo, para quais pessoas eles aparecem.

Cada novo campo personalizado terá a configuração **Exibir para**, com três opções:

- **Contato principal**
- **Participantes adicionais**
- **Todos os participantes**

Novos campos começam com **Todos os participantes** selecionado. Aventuras podem ser salvas e receber inscrições sem nenhum campo personalizado.

Esta mudança preserva aventuras e inscrições existentes. Controles operacionais do fluxo — tamanho do grupo, bateria e autorização de imagem quando habilitados — continuam sendo gerenciados pelo sistema.

## Contexto atual

O painel administrativo ainda exibe um bloco chamado **Campos do Sistema (incluídos automaticamente)**, afirmando que Nome Completo, E-mail e Telefone são obrigatórios para o contato principal e que Nome Completo é obrigatório para participantes adicionais.

O formulário público atual já não renderiza esses campos fixos. Ele deriva as colunas legadas `name`, `email` e `phone` dos campos personalizados e usa valores internos quando esses dados não existem. Portanto, o aviso administrativo está desatualizado, mas o construtor ainda não permite que o administrador determine livremente o público de cada campo.

Hoje o público é inferido pelo tipo:

- texto, e-mail, telefone, número e tamanho de camiseta aparecem para o contato principal e para participantes adicionais;
- seleção única e seleção múltipla aparecem somente para o contato principal.

## Objetivos

- Remover do painel o aviso sobre campos de dados automáticos.
- Não criar nem exigir automaticamente Nome, E-mail, Telefone ou qualquer outro campo de dados.
- Permitir que uma aventura tenha zero campos personalizados.
- Permitir que o administrador escolha o público de cada campo.
- Usar **Todos os participantes** como público padrão de todo campo novo.
- Permitir todos os tipos de campo em qualquer público.
- Preservar o comportamento dos campos legados que não possuem público explícito.
- Preservar respostas e inscrições já armazenadas.

## Fora de escopo

- Transformar tamanho do grupo, bateria ou autorização de imagem em campos personalizados.
- Alterar regras de capacidade, lotes, baterias, preço ou pagamento.
- Migrar em massa o JSON das aventuras existentes.
- Reescrever inscrições antigas.
- Introduzir ordenação por arrastar, campos condicionais ou dependências entre campos.

## Abordagens consideradas

### 1. Uma propriedade de público por campo — escolhida

Cada `CustomField` recebe uma propriedade opcional com um de três valores. A ausência da propriedade identifica um campo legado e ativa a regra atual de compatibilidade.

Vantagens:

- modelo simples e explícito;
- uma única escolha no painel;
- não permite combinações inválidas;
- compatível com o JSON já armazenado;
- fácil de consumir no formulário público.

### 2. Dois booleanos independentes

Usar marcadores como `showForPrimary` e `showForAdditional` permitiria as mesmas combinações, mas também permitiria deixar ambos falsos. Isso criaria campos configurados que nunca aparecem e exigiria validação adicional.

### 3. Listas separadas por público

Manter três listas de campos no construtor tornaria o público visualmente evidente, mas complicaria a movimentação de campos e duplicaria a lógica de edição. A estrutura também seria mais difícil de compatibilizar com o array único existente.

## Modelo de dados

O contrato compartilhado passa a aceitar um público opcional:

```ts
type CustomFieldAudience = "primary" | "additional" | "all";

type CustomField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "multiselect" | "tshirt_size";
  required: boolean;
  audience?: CustomFieldAudience;
  options?: string[];
  helpImageUrl?: string;
};
```

`audience` permanece opcional para distinguir campos legados. Nenhuma migration SQL é necessária porque `adventures.custom_fields`, `registrations.custom_data` e `registrations.participants` usam JSONB.

### Resolução do público

Uma função pura e centralizada resolve o público efetivo:

1. Se `audience` estiver presente, usar seu valor.
2. Se o campo for legado e o tipo for `select` ou `multiselect`, usar `primary`.
3. Para os demais tipos legados, usar `all`.

Essa resolução reproduz o comportamento atual sem regravar dados. Um campo novo, inclusive quando adicionado a uma aventura antiga, é criado com `audience: "all"`.

Ao abrir uma aventura antiga, o seletor mostra o público efetivo calculado. Se o administrador não alterar o seletor, o campo pode continuar sem a propriedade no JSON. Não haverá atualização em massa nem mudança de comportamento causada apenas pela implantação.

## Painel administrativo

O construtor em `adventure-form.tsx` continua sendo o único editor dos campos de inscrição.

Mudanças de interface:

- remover todo o bloco **Campos do Sistema (incluídos automaticamente)**;
- substituir o texto de apoio por uma explicação de que todos os campos são configurados pelo administrador;
- adicionar a cada cartão um seletor **Exibir para**;
- oferecer as opções **Contato principal**, **Participantes adicionais** e **Todos os participantes**;
- iniciar todo novo campo com **Todos os participantes**;
- mostrar em campos legados o público resolvido pela regra de compatibilidade.

O schema administrativo aceita `audience` ausente para campos legados e valida os três valores quando a propriedade estiver presente. As regras atuais de ID único, rótulo, tipo, obrigatoriedade, opções e imagem de ajuda permanecem.

Alterar o tipo de um campo não altera automaticamente um `audience` explícito. Em um campo legado sem público explícito, o público visual continua sendo resolvido pelo tipo até que o administrador escolha uma opção.

## Formulário público

### Separação dos campos

Antes de criar o estado do formulário, os campos são separados em duas coleções:

- `primaryFields`: público `primary` ou `all`;
- `additionalFields`: público `additional` ou `all`.

Os valores iniciais de `customData` incluem somente `primaryFields`. Cada item de `participants` inclui somente `additionalFields`.

Um campo obrigatório só é validado para as pessoas que pertencem ao seu público. Um campo obrigatório direcionado a participantes adicionais não bloqueia uma inscrição de uma única pessoa, pois não existe participante adicional a preencher.

### Renderização reutilizável

A renderização de um campo dinâmico deve ficar isolada em um componente reutilizável, consumido tanto pelo contato principal quanto pelos participantes adicionais. O componente trata:

- texto;
- e-mail;
- telefone;
- número;
- seleção única;
- seleção múltipla;
- tamanho de camiseta e sua imagem de ajuda.

Isso elimina a limitação atual que impede seleção única e múltipla nos participantes adicionais e evita duas implementações diferentes de validação e aparência.

### Estado e tipagem dos participantes

Como participantes adicionais passam a aceitar seleção múltipla, seus valores personalizados devem aceitar `string | string[]`, assim como `custom_data`. A propriedade técnica `bateriaId` continua sendo uma string separada do payload de respostas.

O tipo compartilhado de `Registration.participants` deve refletir esse formato. Consumidores administrativos e de exportação continuarão normalizando arrays como texto separado por vírgulas.

### Payload

- Respostas de `primaryFields` são gravadas em `registrations.custom_data`.
- Respostas de `additionalFields` são gravadas em cada objeto de `registrations.participants`.
- Campos que não se aplicam à pessoa não recebem valor vazio no payload.
- A ordem dos participantes e a estrutura de baterias permanecem inalteradas.

O nome de exibição de cada pessoa continua sendo derivado de um campo de texto cujo rótulo ou ID represente nome. A derivação considera apenas campos aplicáveis àquela pessoa.

Se o contato principal não tiver Nome, E-mail ou Telefone, a inscrição ainda é válida. As colunas legadas obrigatórias da tabela recebem os valores internos de compatibilidade já usados hoje: marcador de nome, e-mail interno único e telefone vazio. Esses valores não são mostrados como campos ao usuário e e-mails internos continuam omitidos da exportação.

## Fluxo de dados

1. O administrador adiciona um campo; o construtor define `audience: "all"`.
2. O administrador pode alterar o público e salva a aventura.
3. A configuração permanece em `adventures.custom_fields`.
4. O formulário público resolve o público, incluindo o fallback dos campos legados.
5. O formulário renderiza e valida somente os campos aplicáveis a cada pessoa.
6. O envio separa respostas do contato principal e dos participantes adicionais.
7. A RPC de criação recebe o mesmo formato geral e continua responsável por capacidade, lote, bateria, preço e criação da inscrição.
8. A listagem administrativa e a exportação leem as respostas salvas sem depender do público atual do campo.

## Compatibilidade

### Aventuras existentes

- Campos sem `audience` não são migrados em massa.
- O público efetivo continua igual ao comportamento anterior.
- O painel mostra a opção equivalente sem exigir que o administrador recadastre campos.
- Respostas existentes permanecem visíveis mesmo se o administrador alterar posteriormente o público do campo.

### Novas aventuras e novos campos

- Uma aventura nova começa sem campos personalizados.
- Salvar sem campos é válido.
- Todo campo adicionado começa com `audience: "all"`.
- Um campo novo adicionado a uma aventura antiga também usa a nova configuração.

### Mudança de público

Mudar o público de um campo afeta apenas novos preenchimentos. Dados já armazenados em `custom_data` ou `participants` não são movidos nem removidos. A listagem e a exportação continuam baseadas no conteúdo efetivamente salvo em cada inscrição.

## Validação e tratamento de erros

- `audience` explícito fora dos três valores aceitos impede salvar a aventura.
- Campos legados sem `audience` permanecem válidos.
- Campo obrigatório é validado uma vez para cada pessoa à qual se aplica.
- `multiselect` obrigatório exige pelo menos uma opção marcada.
- `select` e `tshirt_size` obrigatórios exigem uma opção escolhida.
- Tipos baseados em opções continuam exigindo opções não vazias e únicas no painel.
- Ao falhar a validação, a mensagem fica associada ao campo e à pessoa corretos, além do toast geral já usado pelo formulário.
- Erros de capacidade, bateria, lote e indisponibilidade continuam usando o tratamento atual.

## Unidades e responsabilidades

### Resolução de público

Funções puras determinam o público efetivo e se um campo se aplica ao contato principal ou aos participantes adicionais. Nenhuma tela deve repetir a regra legada por tipo.

### Editor administrativo

Responsável por criar, editar, validar e salvar `audience`, sem decidir como o campo é renderizado publicamente.

### Campo dinâmico público

Responsável por renderizar um único `CustomField` e ligar seu valor ao React Hook Form. Não conhece capacidade, pagamento ou persistência.

### Formulário de inscrição

Responsável por separar campos por público, criar participantes, validar cada pessoa e montar os dois conjuntos de respostas.

### Compatibilidade de contato

Responsável por derivar as colunas legadas de contato a partir dos campos aplicáveis, mantendo os valores internos quando os dados não forem solicitados.

## Arquivos previstos

- `src/lib/types.ts` — público dos campos e valores personalizados dos participantes.
- `src/lib/registration-contact.ts` — resolução/derivação compatível dos dados de exibição, caso os helpers de público sejam colocados junto ou consumidos aqui.
- `src/app/(admin)/admin/adventures/_components/adventure-form.tsx` — remoção do aviso, seletor de público e padrão dos campos novos.
- `src/app/(main)/adventures/[slug]/_components/registration-form.tsx` — separação por público, validação e payload.
- `src/app/(main)/adventures/[slug]/_components/` — componente reutilizável para renderizar campos dinâmicos, se extraído em arquivo próprio.
- `src/app/(admin)/admin/registrations/page.tsx` e `src/app/(admin)/admin/registrations/_lib/export-registrations.ts` — apenas ajustes de tipagem ou normalização exigidos pelo suporte a arrays nos participantes.

Não é prevista migration Supabase.

## Verificação

### Verificações estáticas

- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Cenários administrativos

1. Criar aventura sem campos e salvar.
2. Adicionar campo e confirmar **Todos os participantes** pré-selecionado.
3. Alterar o campo para **Contato principal** e salvar.
4. Alterar outro campo para **Participantes adicionais** e salvar.
5. Abrir aventura antiga e confirmar o público legado equivalente.
6. Salvar aventura antiga sem modificar campos e confirmar ausência de mudança funcional.

### Cenários públicos

1. Inscrição sem campos personalizados.
2. Campo `primary` aparecendo apenas uma vez.
3. Campo `additional` aparecendo em cada participante adicional e não no contato principal.
4. Campo `all` aparecendo para todas as pessoas.
5. Inscrição individual com campo `additional` obrigatório sem bloqueio indevido.
6. Validação obrigatória por pessoa.
7. Texto, e-mail, telefone, número, seleção única, seleção múltipla e camiseta em cada público compatível.
8. Seleção múltipla de participante persistida como array.
9. Aventura com bateria preservando uma escolha por pessoa.
10. Aventura com lote preservando grupo unitário e preço atual.

### Cenários de compatibilidade

1. Aventura antiga mantém a distribuição atual dos campos.
2. Inscrição antiga continua visível no painel.
3. Exportação combina inscrições antigas e novas sem expor e-mails internos.
4. Alterar o público de um campo não apaga nem move respostas antigas.

## Critérios de aceite

- O painel não afirma que existem campos de dados incluídos automaticamente.
- Nome, E-mail, Telefone e Nome de participante não aparecem sem terem sido criados pelo administrador.
- Zero campos personalizados é uma configuração válida.
- O administrador controla o público de cada novo campo.
- Novos campos usam **Todos os participantes** por padrão.
- Todos os tipos de campo funcionam nos três públicos.
- Campos e inscrições antigos mantêm o comportamento e os dados anteriores.
- O fluxo de capacidade, bateria, lote, pagamento e autorização de imagem não sofre regressão.
