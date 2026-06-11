# Resumo de Inscrições por Bateria — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir um card de resumo no topo da página de inscrições do admin, visível ao filtrar por aventura, com totais de alunos (geral e confirmados) e distribuição por bateria (`inscritos/capacidade · confirmados`).

**Architecture:** Agregação no cliente via funções puras em `_lib/registration-stats.ts`; componente `RegistrationsSummary` carrega metadados de baterias via RPC existente `get_adventure_baterias_with_availability` quando `adventure.has_baterias`; integração mínima em `page.tsx` passando inscrições filtradas e aventura selecionada.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Supabase client + RPC, shadcn/ui, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-11-admin-inscricoes-resumo-baterias-design.md`

---

## File map

- Create: `src/app/(admin)/admin/registrations/_lib/registration-stats.ts`
  Responsabilidade: tipos de estatísticas, agregação pura de totais gerais e por bateria.

- Create: `src/app/(admin)/admin/registrations/_components/registrations-summary.tsx`
  Responsabilidade: carregar baterias via RPC, chamar `computeRegistrationStats`, renderizar card de resumo.

- Modify: `src/app/(admin)/admin/registrations/page.tsx`
  Responsabilidade: renderizar `<RegistrationsSummary />` entre `CardHeader` e `CardContent` quando `selectedAdventure` existir.

Observação: o projeto não tem framework de testes automatizados. Este plano usa `npm run lint`, `npm run typecheck` e verificação manual no navegador.

---

### Task 1: Helper de agregação (`registration-stats.ts`)

**Files:**
- Create: `src/app/(admin)/admin/registrations/_lib/registration-stats.ts`

- [ ] **Step 1: Definir tipos exportados**

```typescript
import type { Adventure, BateriaAvailability, Registration } from "@/lib/types";

export type BateriaStats = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  sortOrder: number;
  total: number;
  confirmed: number;
};

export type RegistrationSummaryStats = {
  totalStudents: number;
  confirmedStudents: number;
  maxParticipants: number | null;
  hasBaterias: boolean;
  baterias: BateriaStats[];
};
```

- [ ] **Step 2: Implementar contagem por bateria**

Função interna que recebe uma inscrição e dois `Map<string, number>` (total e confirmado):

```typescript
function accumulateBateriaCounts(
  registration: Registration,
  totalMap: Map<string, number>,
  confirmedMap: Map<string, number>,
) {
  const assignments = registration.bateria_assignments;
  if (!assignments) return;

  const ids = [assignments.principal, ...assignments.participants];
  const isConfirmed = registration.payment_status === "confirmed";

  for (const id of ids) {
    totalMap.set(id, (totalMap.get(id) ?? 0) + 1);
    if (isConfirmed) {
      confirmedMap.set(id, (confirmedMap.get(id) ?? 0) + 1);
    }
  }
}
```

- [ ] **Step 3: Implementar `computeRegistrationStats`**

```typescript
export function computeRegistrationStats(
  registrations: Registration[],
  adventure: Adventure,
  baterias: BateriaAvailability[],
): RegistrationSummaryStats {
  const totalStudents = registrations.reduce((acc, reg) => acc + reg.group_size, 0);
  const confirmedStudents = registrations
    .filter((reg) => reg.payment_status === "confirmed")
    .reduce((acc, reg) => acc + reg.group_size, 0);

  const totalMap = new Map<string, number>();
  const confirmedMap = new Map<string, number>();

  for (const reg of registrations) {
    accumulateBateriaCounts(reg, totalMap, confirmedMap);
  }

  const bateriaStats: BateriaStats[] = baterias
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => ({
      id: b.id,
      label: b.label,
      startTime: b.start_time,
      endTime: b.end_time,
      capacity: b.capacity,
      sortOrder: b.sort_order,
      total: totalMap.get(b.id) ?? 0,
      confirmed: confirmedMap.get(b.id) ?? 0,
    }));

  return {
    totalStudents,
    confirmedStudents,
    maxParticipants: adventure.max_participants,
    hasBaterias: adventure.has_baterias,
    baterias: bateriaStats,
  };
}
```

- [ ] **Step 4: Verificar tipos**

Run:

```bash
npm run typecheck
```

Expected: sem erros relacionados a `registration-stats.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/admin/registrations/_lib/registration-stats.ts
git commit -m "feat(admin): add registration stats aggregation helper"
```

---

### Task 2: Componente `RegistrationsSummary`

**Files:**
- Create: `src/app/(admin)/admin/registrations/_components/registrations-summary.tsx`

- [ ] **Step 1: Criar componente com props**

```typescript
"use client";

import type { Adventure, BateriaAvailability, Registration } from "@/lib/types";

type RegistrationsSummaryProps = {
  adventure: Adventure;
  registrations: Registration[];
};
```

- [ ] **Step 2: Carregar baterias via RPC quando `has_baterias`**

Padrão similar ao `useEffect` existente em `page.tsx` (linhas 88–120):

```typescript
const [baterias, setBaterias] = useState<BateriaAvailability[]>([]);
const [isLoadingBaterias, setIsLoadingBaterias] = useState(false);
const [bateriasError, setBateriasError] = useState(false);

useEffect(() => {
  if (!adventure.has_baterias) {
    setBaterias([]);
    setBateriasError(false);
    return;
  }

  let cancelled = false;
  setIsLoadingBaterias(true);
  setBateriasError(false);

  async function load() {
    const { data, error } = await supabase.rpc(
      "get_adventure_baterias_with_availability",
      { p_adventure_id: adventure.id },
    );
    if (cancelled) return;
    if (error) {
      console.error("Failed to load baterias for summary:", error);
      setBateriasError(true);
      setBaterias([]);
    } else {
      setBaterias((data ?? []) as BateriaAvailability[]);
    }
    setIsLoadingBaterias(false);
  }

  void load();
  return () => { cancelled = true; };
}, [adventure.id, adventure.has_baterias, supabase]);
```

- [ ] **Step 3: Calcular stats e formatar textos**

```typescript
const stats = computeRegistrationStats(registrations, adventure, baterias);

function formatTime(value: string): string {
  // "08:00:00" → "08:00"
  return value.slice(0, 5);
}

function formatTotalLine(): string {
  const { totalStudents, confirmedStudents, maxParticipants, hasBaterias } = stats;
  const base = `${totalStudents} alunos inscritos (${confirmedStudents} confirmados)`;
  if (!hasBaterias && maxParticipants != null) {
    return `${totalStudents}/${maxParticipants} alunos inscritos (${confirmedStudents} confirmados)`;
  }
  return base;
}
```

- [ ] **Step 4: Renderizar card**

Usar `Card` aninhado ou bloco com borda dentro do card pai. Estrutura:

```tsx
<div className="border rounded-lg p-4 mb-4 bg-muted/30">
  <h3 className="text-sm font-semibold mb-3">
    Resumo: {adventure.title}
  </h3>
  <div className="flex items-center gap-2 text-base font-medium">
    <Users className="h-4 w-4 text-muted-foreground" />
    {formatTotalLine()}
  </div>
  {adventure.has_baterias && (
    <div className="mt-3 space-y-1.5">
      {isLoadingBaterias ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : bateriasError ? (
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar baterias.
        </p>
      ) : (
        stats.baterias.map((b) => (
          <div key={b.id} className="text-sm text-muted-foreground flex justify-between gap-4">
            <span>
              {b.label} ({formatTime(b.startTime)}–{formatTime(b.endTime)})
            </span>
            <span className="tabular-nums whitespace-nowrap">
              {b.total}/{b.capacity} · {b.confirmed} confirmados
            </span>
          </div>
        ))
      )}
    </div>
  )}
</div>
```

- [ ] **Step 5: Verificar lint e tipos**

Run:

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(admin)/admin/registrations/_components/registrations-summary.tsx
git commit -m "feat(admin): add registrations summary card component"
```

---

### Task 3: Integrar na página de inscrições

**Files:**
- Modify: `src/app/(admin)/admin/registrations/page.tsx`

- [ ] **Step 1: Importar componente**

```typescript
import { RegistrationsSummary } from "./_components/registrations-summary";
```

- [ ] **Step 2: Renderizar entre header e tabela**

Dentro do `<Card>`, após `</CardHeader>` e antes de `<CardContent>`:

```tsx
{selectedAdventure && filteredRegistrations && (
  <div className="px-6">
    <RegistrationsSummary
      adventure={selectedAdventure}
      registrations={filteredRegistrations}
    />
  </div>
)}
```

Ajustar padding para alinhar com `CardContent` (verificar se `px-6` bate com o padding padrão do card).

- [ ] **Step 3: Verificar lint e tipos**

Run:

```bash
npm run typecheck && npm run lint
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/admin/registrations/page.tsx
git commit -m "feat(admin): show registration summary when adventure is filtered"
```

---

### Task 4: Verificação manual

- [ ] **Step 1: Subir dev server**

Run:

```bash
npm run dev
```

- [ ] **Step 2: Cenários de verificação**

1. Acessar `/admin/registrations` sem filtro → card **não** aparece
2. Selecionar aventura com baterias e inscrições → totais corretos + lista por bateria
3. Selecionar aventura sem baterias → só linha de totais (com `max_participants` se existir)
4. Confirmar pagamento de inscrição → contagem de confirmados atualiza
5. Limpar filtro → card desaparece
6. Aventura com baterias e zero inscrições → `"0 alunos inscritos (0 confirmados)"` e baterias `0/capacity`

- [ ] **Step 3: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "fix(admin): ajustes finais no resumo de inscrições por bateria"
```

---

## Checklist de entrega

- [ ] Card visível somente com aventura selecionada
- [ ] Totais gerais: total + confirmados
- [ ] Por bateria: `X/capacity · Y confirmados` com horários `HH:MM`
- [ ] Aventura sem baterias: totais com `max_participants` opcional
- [ ] Erro de RPC: totais gerais + mensagem de erro na seção de baterias
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
