# Climb Adventure: cartão, campos e links

## Objetivo

Melhorar a inscrição da Climb Adventure sem substituir o pagamento PIX existente:

- permitir que a pessoa escolha PIX ou cartão;
- encaminhar o cartão para o WhatsApp já configurado do Leo;
- permitir inserir e reordenar campos configuráveis no ponto desejado;
- tornar URLs do descritivo longo clicáveis na página pública.

## Fluxo de pagamento

A página pública de pagamento passa a começar com duas opções equivalentes: **Pagar por PIX** e **Pagar com cartão**.

- Ao escolher PIX, a interface atual de QR Code, copia-e-cola e confirmação é exibida sem alteração de comportamento.
- Ao escolher cartão, a interface apresenta o contato do Leo e um botão que abre o WhatsApp já configurado pela aplicação.
- O botão leva uma mensagem pré-preenchida informando que a pessoa quer pagar a inscrição por cartão.
- O cartão não cria cobrança automática, não introduz gateway e não exige registrar uma nova forma de pagamento na inscrição nesta entrega.

## Campos configuráveis

Os campos personalizados permanecem uma lista ordenada no cadastro da aventura.

- Cada campo recebe uma alça para arrastar e soltar em outra posição.
- Entre itens consecutivos há uma ação de inserir novo campo naquela posição.
- Adicionar no fim continua disponível como atalho.
- A nova ordem é persistida junto com a aventura e é usada pelo formulário público, respeitando as regras atuais de público de cada campo.
- A operação não altera valores de inscrições já concluídas.

## Descritivo com links

O campo de descritivo longo continua sendo texto simples com quebras de linha.

- URLs HTTP e HTTPS completas coladas no texto são reconhecidas na visualização pública.
- Cada URL é renderizada como link clicável, sem interpretar HTML inserido pelo administrador.
- Links abertos em nova aba usam proteções adequadas para não dar acesso à página de origem.
- Texto que não é URL e quebras de linha permanecem idênticos ao comportamento atual.

## Componentes e fluxo de dados

1. A página pública de pagamento controla a etapa escolhida localmente: seleção, PIX existente ou orientação para cartão.
2. A configuração de WhatsApp já existente fornece o destino do contato; o texto da mensagem é montado a partir da aventura/inscrição de forma segura para URL.
3. O formulário administrativo usa as operações de inserção e movimentação da lista de campos já mantida pelo formulário.
4. A página pública da aventura converte apenas trechos validados como URLs em links React; os demais trechos são renderizados como texto.

## Erros e limites

- Se o contato de WhatsApp não estiver configurado, o cartão não oferece um destino inválido e mostra uma orientação clara.
- URLs inválidas continuam como texto, nunca como links quebrados.
- Arrastar e inserir preserva a validação atual dos campos, inclusive nome técnico único, opções obrigatórias e público configurado.

## Verificação

- Conferir PIX para inscrição comum e por lote, inclusive confirmação existente.
- Conferir cartão: escolha da opção, contato correto e mensagem do WhatsApp.
- Criar campos, inserir entre dois existentes, arrastar, salvar, recarregar e conferir a ordem pública para os públicos aplicáveis.
- Conferir URL em meio ao texto, múltiplas URLs e texto sem URL; garantir que não há interpretação de HTML.
