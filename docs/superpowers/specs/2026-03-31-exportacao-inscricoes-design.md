# Exportação de Inscrições por Aventura

## Visão geral

Adicionar ao painel admin uma exportação de inscrições em `.xlsx`, com filtro obrigatório por aventura e estrutura operacional de uma linha por participante.

O objetivo é permitir que o admin extraia rapidamente uma planilha utilizável em Excel, Google Sheets ou ferramentas similares, sem exigir pós-processamento manual para separar grupos em participantes individuais.

O escopo aprovado inclui:

- exportação em `.xlsx`
- filtro por aventura antes da geração
- uma linha por participante
- repetição dos dados do contato principal em todas as linhas do grupo
- uso da tela atual de inscrições como ponto de entrada da feature

Não faz parte deste escopo:

- exportação consolidada de múltiplas aventuras em um único arquivo
- envio por e-mail
- histórico de exports
- mudanças de schema no Supabase

---

## Problema atual

Hoje o admin consegue visualizar as inscrições na tela [`src/app/(admin)/admin/registrations/page.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(admin)/admin/registrations/page.tsx), mas não consegue extrair esses dados em formato de planilha.

A visualização atual é boa para consulta, porém ruim para operação externa. Quando a aventura tem grupos com vários participantes, a leitura em tela não resolve bem cenários como:

- lista de presença
- conferência operacional antes da saída
- repasse para parceiros ou equipe de apoio
- filtragem por dados customizados em planilhas

Como cada inscrição pode conter um contato principal e participantes adicionais, exportar uma linha por inscrição deixaria a planilha pouco prática. O recorte aprovado é expandir cada inscrição em linhas individuais por participante.

---

## Requisitos funcionais

### Tela admin

Na página de inscrições:

- deve existir um filtro por aventura
- o export só deve ser gerado para a aventura selecionada
- o botão de exportação deve ficar disponível no contexto da listagem de inscrições
- se não houver aventura selecionada, a exportação deve ficar desabilitada ou bloqueada com feedback claro
- se a aventura selecionada não tiver inscrições, nenhum arquivo deve ser gerado e o admin deve receber um aviso

### Formato da exportação

- o arquivo deve ser gerado em `.xlsx`
- cada participante deve ocupar uma linha
- o contato principal também deve ocupar uma linha
- participantes adicionais de uma mesma inscrição devem repetir os dados do contato principal
- o arquivo deve conter apenas dados da aventura filtrada

### Dados exportados

Cada linha deve carregar, no mínimo:

- dados da aventura
- data da inscrição
- status de pagamento
- valor total da inscrição
- tamanho do grupo
- identificação se a linha representa o titular ou um participante adicional
- nome do participante da linha
- nome do contato principal
- e-mail do contato principal
- telefone do contato principal
- campos customizados compatíveis com a aventura selecionada

---

## Abordagem escolhida

Gerar o `.xlsx` no cliente, dentro da própria página de inscrições do admin, usando os dados filtrados da aventura selecionada.

### Motivos

- menor custo de implementação agora
- não exige nova rota, server action ou edge function
- aproveita a listagem já existente e o hook atual de dados
- reduz acoplamento com backend para uma feature predominantemente administrativa
- atende o caso operacional sem alterar o modelo de persistência

### Alternativas rejeitadas

#### Endpoint de exportação no servidor

Foi descartado nesta fase porque adiciona complexidade estrutural sem necessidade clara. Pode ser reavaliado no futuro caso o volume de dados cresça muito ou a exportação passe a exigir permissões, auditoria ou formatos múltiplos.

#### CSV em vez de XLSX

Foi descartado porque o objetivo é maximizar compatibilidade prática para o admin. `.xlsx` evita parte dos problemas comuns de encoding, abertura e formatação ao lidar com Excel.

---

## Fluxo da feature

1. O admin acessa a página de inscrições.
2. Seleciona uma aventura no filtro.
3. A tabela passa a refletir apenas as inscrições daquela aventura.
4. O admin aciona `Exportar XLSX`.
5. O sistema transforma cada inscrição em uma ou mais linhas, uma por participante.
6. O navegador baixa o arquivo com nome previsível, baseado na aventura e na data.

### Regras de uso

- sem filtro selecionado: não exporta
- sem inscrições no filtro atual: não exporta
- campos ausentes em participantes adicionais permanecem vazios nas colunas correspondentes
- dados do contato principal são repetidos em todas as linhas do grupo

---

## Modelo de exportação

### Origem dos dados

Os dados já existem no contrato de [`src/lib/types.ts`](/Users/otavioajr/Documents/Projetos/project-leo/src/lib/types.ts), principalmente em `Registration`:

- `adventure_title`
- `name`
- `email`
- `phone`
- `registration_date`
- `group_size`
- `participants`
- `payment_status`
- `total_amount`
- `custom_data`

### Estratégia de expansão

Cada registro da tabela `registrations` será convertido em uma lista de linhas:

- 1 linha para o contato principal
- 1 linha para cada item de `participants`

Isso significa que uma inscrição com `group_size = 4` deve produzir 4 linhas na planilha.

### Papel de cada linha

Cada linha deve informar claramente o papel do participante no grupo. Exemplo de coluna:

- `tipo_participante`: `Titular` ou `Participante`

Esse marcador evita ambiguidade quando a planilha estiver fora do sistema.

---

## Estrutura das colunas

As colunas devem combinar uma base fixa com extensão dinâmica por campos customizados.

### Colunas fixas sugeridas

- `aventura`
- `data_inscricao`
- `status_pagamento`
- `valor_total_inscricao`
- `tamanho_grupo`
- `tipo_participante`
- `nome_participante`
- `nome_contato_principal`
- `email_contato_principal`
- `telefone_contato_principal`

### Colunas dinâmicas

Os campos personalizados devem ser derivados da configuração da aventura e dos dados efetivamente presentes nas inscrições filtradas.

Regras:

- campos do contato principal vindos de `custom_data` viram colunas próprias
- campos equivalentes presentes em `participants` também ocupam essas colunas
- quando um participante adicional não tiver valor para determinada coluna, a célula fica vazia
- campos `multiselect` devem ser serializados como texto legível em uma célula, por exemplo com separação por vírgula

### Ordem recomendada

- primeiro as colunas fixas
- depois as colunas customizadas, em ordem estável

Isso ajuda a manter previsibilidade entre exports da mesma aventura.

---

## Design da interface admin

O ponto de entrada continua sendo [`src/app/(admin)/admin/registrations/page.tsx`](/Users/otavioajr/Documents/Projetos/project-leo/src/app/(admin)/admin/registrations/page.tsx).

Mudanças previstas:

- adicionar controle de filtro por aventura
- derivar a lista filtrada usada tanto na tabela quanto na exportação
- adicionar ação explícita `Exportar XLSX`
- manter o restante da página intacto

### Comportamento do botão

- habilitado apenas quando houver aventura selecionada e inscrições disponíveis
- durante a geração, pode exibir estado de carregamento curto se necessário
- em erro, deve mostrar toast claro

### Nome do arquivo

O arquivo deve usar nome previsível e legível, por exemplo:

`inscricoes-{aventura}-{data}.xlsx`

O nome precisa ser sanitizado para evitar caracteres problemáticos no download.

---

## Tratamento de dados customizados

Este é o ponto mais sensível da feature.

O projeto já suporta campos customizados simples, `select` e `multiselect`. A exportação deve respeitar esse contrato atual, inclusive as mudanças recentes.

### Regras

- não assumir que todo campo customizado é `string`
- aceitar `string` e `string[]` no contato principal
- continuar aceitando que participantes adicionais usem apenas os campos que já são persistidos no array `participants`
- não inventar colunas fora do conjunto real de dados daquela aventura

### Normalização para planilha

- `string`: exporta como texto simples
- `string[]`: exporta como texto unido por delimitador legível
- `undefined`, `null` ou ausente: exporta célula vazia

---

## Tratamento de erros

Os erros devem ser simples e orientados ao admin.

Casos esperados:

- aventura não selecionada
- nenhuma inscrição encontrada para a aventura
- falha ao montar workbook
- falha ao iniciar download

Comportamento esperado:

- não baixar arquivo inválido
- informar o problema via toast
- preservar a tela utilizável após o erro

---

## Compatibilidade e impacto

### Banco de dados

Nenhuma migration é necessária. A feature consome dados já disponíveis.

### RLS e permissões

Nenhuma mudança prevista. A tela já depende de acesso admin e a exportação apenas reutiliza o conjunto de dados que o admin já pode consultar.

### Performance

Para o volume esperado dessa tela, a geração client-side é suficiente. Se no futuro houver aventuras com volume muito alto, a decisão pode ser revisitada para processamento server-side.

---

## Verificação

O projeto não possui framework de testes automatizados configurado, então a validação desta entrega deve combinar verificação estática e teste manual.

### Verificações formais

- `npm run lint`
- `npm run typecheck`

### Verificação manual mínima

Validar no navegador uma aventura com:

- pelo menos uma inscrição individual
- pelo menos uma inscrição em grupo
- campos customizados simples
- pelo menos um campo `multiselect`

Checklist manual:

- o filtro por aventura funciona
- a tabela reflete o filtro selecionado
- o botão exporta apenas a aventura atual
- o arquivo abre corretamente em Excel/Sheets
- o total de linhas bate com o total de participantes
- os dados do contato principal aparecem em todas as linhas do grupo
- os campos customizados ocupam as colunas certas

---

## Arquivos envolvidos

### Modificar

- `src/app/(admin)/admin/registrations/page.tsx`
  Responsabilidade: filtro por aventura, transformação dos dados exportados, botão e fluxo de geração do `.xlsx`

- `package.json`
  Responsabilidade: adicionar dependência de geração de planilha, se necessário

### Verificar se necessário

- `src/lib/types.ts`
  Responsabilidade: confirmar compatibilidade de tipos usados na exportação, sem mudança obrigatória prevista neste momento

---

## Riscos principais

- assumir formato uniforme entre `custom_data` e `participants` quando eles não são idênticos
- ordenar colunas dinâmicas de forma instável entre exports
- tratar arrays de seleção múltipla de maneira pouco legível
- gerar planilha com linhas a menos ou a mais em grupos grandes

O principal cuidado de implementação é separar claramente:

- dados do grupo
- dados do contato principal
- dados do participante da linha
- dados customizados normalizados para célula
