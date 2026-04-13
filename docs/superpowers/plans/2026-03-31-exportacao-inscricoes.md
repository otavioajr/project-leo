# Exportação de Inscrições por Aventura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o admin exporte inscrições de uma aventura específica para `.xlsx`, com uma linha por participante e repetição dos dados do contato principal em todas as linhas do grupo.

**Architecture:** A implementação mantém a UI na página de inscrições do admin, adicionando filtro por aventura e botão de exportação. A lógica de transformação dos registros em linhas de planilha e de geração do workbook fica isolada em um helper local da rota para evitar inflar ainda mais `page.tsx` e facilitar validação manual da regra de exportação.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Supabase realtime hooks, shadcn/ui, biblioteca browser-safe para geração de `.xlsx` (`write-excel-file`).

**Spec:** `docs/superpowers/specs/2026-03-31-exportacao-inscricoes-design.md`

---

## File map

- Modify: `package.json`
  Responsabilidade: adicionar a dependência usada para gerar `.xlsx` no cliente.

- Create: `src/app/(admin)/admin/registrations/_lib/export-registrations.ts`
  Responsabilidade: centralizar tipos auxiliares, normalização de colunas, flatten das inscrições em linhas e escrita do workbook.

- Modify: `src/app/(admin)/admin/registrations/page.tsx`
  Responsabilidade: carregar aventuras para filtro, derivar inscrições filtradas, renderizar seletor + botão de exportação e integrar o helper de export.

Observação: o projeto não tem framework de testes automatizados. Este plano usa `npm run lint`, `npm run typecheck` e verificação manual no navegador. Não adicionar infraestrutura de testes só para esta entrega.

---

### Task 1: Preparar a dependência de planilha

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Adicionar a biblioteca de exportação**

Instalar uma biblioteca browser-safe para geração de `.xlsx` nas dependências do projeto.

Run:

```bash
npm install write-excel-file
```

Expected: `package.json` e lockfile atualizados com a nova dependência.

- [ ] **Step 2: Verificar o diff da dependência**

Run:

```bash
git diff -- package.json package-lock.json
```

Expected: apenas a adição de `write-excel-file` e ajustes normais do lockfile.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: adiciona dependencia para exportacao xlsx"
```

---

### Task 2: Isolar a lógica de exportação em helper local

**Files:**
- Create: `src/app/(admin)/admin/registrations/_lib/export-registrations.ts`
- Verify if needed: `src/lib/types.ts`

- [ ] **Step 1: Criar o contrato interno das linhas exportadas**

Criar no helper tipos focados em exportação, por exemplo:

```ts
import type { Registration, RegistrationCustomValue } from "@/lib/types";

export type ExportRow = Record<string, string | number>;

type ExportParticipantRole = "Titular" | "Participante";
```

Evitar mudar `src/lib/types.ts` se os tipos existentes já forem suficientes.

- [ ] **Step 2: Implementar normalização de valores para célula**

Adicionar funções pequenas e puras para:

- transformar `string[]` em texto legível
- devolver `""` para valores ausentes
- gerar nome de coluna legível a partir de `snake_case`

Exemplo:

```ts
function normalizeCellValue(value: RegistrationCustomValue | string | undefined) {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}
```

- [ ] **Step 3: Implementar a coleta estável de colunas customizadas**

Criar uma função que receba as inscrições filtradas e devolva a lista ordenada de colunas customizadas com base em:

- chaves presentes em `registration.custom_data`
- chaves presentes nos objetos de `registration.participants`
- exclusão da chave `name`

Assinatura sugerida:

```ts
function collectCustomColumnKeys(registrations: Registration[]): string[] {
  const keys = new Set<string>();
  // ...
  return Array.from(keys).sort();
}
```

- [ ] **Step 4: Implementar o flatten de uma inscrição em múltiplas linhas**

Criar uma função pura que transforme uma `Registration` em:

- 1 linha de `Titular`
- N linhas de `Participante`

Cada linha deve repetir:

- aventura
- data da inscrição
- status do pagamento
- valor total
- tamanho do grupo
- nome/e-mail/telefone do contato principal

Cada linha deve variar em:

- `tipo_participante`
- `nome_participante`
- preenchimento das colunas customizadas daquela pessoa

- [ ] **Step 5: Implementar a criação do workbook e download**

No mesmo helper, adicionar a função pública que:

- recebe as inscrições filtradas e o nome da aventura
- monta `ExportRow[]`
- cria worksheet/workbook com `write-excel-file/browser`
- dispara `writeFile`

Assinatura sugerida:

```ts
export function exportRegistrationsToXlsx(params: {
  adventureTitle: string;
  registrations: Registration[];
}) {
  // ...
}
```

Ao implementar, importar explicitamente a entrada de browser da biblioteca, por exemplo:

```ts
import writeXlsxFile from "write-excel-file/browser";
```

- [ ] **Step 6: Validar a tipagem do helper**

Run:

```bash
npm run typecheck
```

Expected: sem erros novos no helper; erros existentes fora do escopo devem ser investigados antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(admin\)/admin/registrations/_lib/export-registrations.ts
git commit -m "feat: cria helper de exportacao de inscricoes"
```

---

### Task 3: Adicionar filtro por aventura na página admin

**Files:**
- Modify: `src/app/(admin)/admin/registrations/page.tsx`

- [ ] **Step 1: Carregar as aventuras para popular o filtro**

Adicionar `useCollection<Adventure>("adventures")` à página e derivar uma lista ordenada por título para o seletor.

Exemplo:

```ts
const { data: adventures, isLoading: isLoadingAdventures } =
  useCollection<Adventure>("adventures");
```

- [ ] **Step 2: Adicionar estado local do filtro**

Criar estado para a aventura selecionada:

```ts
const [selectedAdventureId, setSelectedAdventureId] = useState<string>("");
```

Usar string vazia como estado "sem filtro selecionado".

- [ ] **Step 3: Derivar as inscrições filtradas**

Criar uma coleção derivada para uso na tabela e na exportação:

```ts
const filteredRegistrations = (registrations ?? []).filter((registration) =>
  selectedAdventureId ? registration.adventure_id === selectedAdventureId : true
);
```

Depois ajustar o comportamento vazio da tabela para diferenciar:

- nenhuma aventura selecionada
- aventura sem inscrições

- [ ] **Step 4: Renderizar o seletor de aventura no cabeçalho do card**

Usar os componentes já existentes de `@/components/ui/select` em um bloco de ações no `CardHeader`, mantendo a linguagem visual do admin.

O seletor deve:

- listar aventuras por `title`
- permitir limpar a seleção voltando ao placeholder
- ficar disponível apenas quando as aventuras tiverem carregado

- [ ] **Step 5: Substituir a fonte de dados da tabela**

Trocar o `map` atual de `registrations` por `filteredRegistrations`.

Garantir também que o estado vazio mostre mensagem coerente com o filtro atual.

- [ ] **Step 6: Verificar a tela com typecheck**

Run:

```bash
npm run typecheck
```

Expected: a página compila com o novo filtro e sem regressões de tipagem.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(admin\)/admin/registrations/page.tsx
git commit -m "feat: adiciona filtro por aventura nas inscricoes"
```

---

### Task 4: Integrar o botão de exportação e feedbacks

**Files:**
- Modify: `src/app/(admin)/admin/registrations/page.tsx`
- Verify: `src/app/(admin)/admin/registrations/_lib/export-registrations.ts`

- [ ] **Step 1: Importar o helper de exportação**

Adicionar import explícito do helper criado:

```ts
import { exportRegistrationsToXlsx } from "./_lib/export-registrations";
```

- [ ] **Step 2: Criar o handler de exportação**

Implementar `handleExportXlsx` cobrindo:

- bloqueio quando `selectedAdventureId` estiver vazio
- bloqueio quando `filteredRegistrations.length === 0`
- identificação do título da aventura selecionada
- `try/catch` com toast de erro

Exemplo de esqueleto:

```ts
function handleExportXlsx() {
  if (!selectedAdventureId) {
    toast({ title: "Selecione uma aventura", description: "...", variant: "destructive" });
    return;
  }

  if (filteredRegistrations.length === 0) {
    toast({ title: "Sem inscrições", description: "..." });
    return;
  }

  exportRegistrationsToXlsx({
    adventureTitle: selectedAdventure.title,
    registrations: filteredRegistrations,
  });
}
```

- [ ] **Step 3: Adicionar o botão `Exportar XLSX` na UI**

Posicionar o botão ao lado do filtro de aventura no cabeçalho do card.

O botão deve:

- usar label clara
- ficar desabilitado sem aventura selecionada
- ficar desabilitado se não houver inscrições no filtro atual

- [ ] **Step 4: Ajustar mensagens vazias e toasts**

Refinar o feedback textual para os três cenários:

- nenhuma inscrição no sistema
- nenhuma aventura selecionada
- aventura selecionada sem inscrições

Evitar uma única mensagem ambígua para todos os casos.

- [ ] **Step 5: Rodar lint e typecheck**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: ambos passam sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(admin\)/admin/registrations/page.tsx src/app/\(admin\)/admin/registrations/_lib/export-registrations.ts
git commit -m "feat: exporta inscricoes filtradas para xlsx"
```

---

### Task 5: Verificação manual end-to-end

**Files:**
- Verify: `src/app/(admin)/admin/registrations/page.tsx`
- Verify: `src/app/(admin)/admin/registrations/_lib/export-registrations.ts`

- [ ] **Step 1: Subir a aplicação**

Run:

```bash
npm run dev
```

Expected: app disponível em `http://localhost:9002`.

- [ ] **Step 2: Validar o filtro e estados de interface**

No navegador, abrir `/admin/registrations` e verificar:

- o seletor lista aventuras reais
- sem seleção, o botão de export permanece desabilitado
- ao selecionar uma aventura, a tabela reflete apenas aquele recorte

- [ ] **Step 3: Validar o arquivo gerado com aventura sem grupo**

Gerar export de uma aventura com pelo menos uma inscrição individual e confirmar:

- 1 linha por pessoa
- colunas fixas presentes
- `tipo_participante = Titular`

- [ ] **Step 4: Validar o arquivo gerado com grupo**

Gerar export de uma aventura com grupo maior que 1 e confirmar:

- 1 linha para o titular
- 1 linha por participante adicional
- nome, e-mail e telefone do contato principal repetidos em todas as linhas
- `tipo_participante` diferencia `Titular` de `Participante`

- [ ] **Step 5: Validar campos customizados**

Usar uma aventura com:

- campos simples
- `select`
- `multiselect`

Confirmar:

- colunas customizadas aparecem uma vez cada
- arrays de `multiselect` saem como texto legível
- células sem valor ficam vazias, não com `undefined` ou `[object Object]`

- [ ] **Step 6: Registrar resultado final**

Run:

```bash
git status --short
```

Expected: sem alterações extras além das previstas para a feature.

---

## Notes for execution

- Não refatorar a página de inscrições além do necessário para acomodar filtro e export.
- Manter a exportação client-side nesta fase; não introduzir endpoint novo.
- Se a biblioteca `xlsx` trouxer incompatibilidade de build, reavaliar rapidamente alternativa compatível antes de expandir o escopo.
- Se a lógica de colunas dinâmicas começar a crescer demais dentro de `page.tsx`, mover tudo relacionado ao flatten para o helper em vez de duplicar utilitários inline.
