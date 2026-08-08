import type { Adventure, BateriaAvailability, BateriaWithLoteAvailability, LoteAvailability, Registration } from "@/lib/types";

export type BateriaStats = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  sortOrder: number;
  total: number;
  confirmed: number;
  activeLoteLabel?: string | null;
  activeLoteRemaining?: number;
};

export type LoteStats = {
  id: string;
  label: string;
  total: number;
  confirmed: number;
  capacity: number;
};

export type RegistrationSummaryStats = {
  totalStudents: number;
  confirmedStudents: number;
  maxParticipants: number | null;
  hasBaterias: boolean;
  hasLotes: boolean;
  baterias: BateriaStats[];
  lotes: LoteStats[];
};

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

export function computeRegistrationStats(
  registrations: Registration[],
  adventure: Adventure,
  baterias: BateriaAvailability[],
  bateriasWithLotes: BateriaWithLoteAvailability[] = [],
  lotes: LoteAvailability[] = [],
): RegistrationSummaryStats {
  const totalStudents = registrations.reduce((acc, reg) => acc + reg.group_size, 0);
  const confirmedStudents = registrations
    .filter((reg) => reg.payment_status === "confirmed")
    .reduce((acc, reg) => acc + reg.group_size, 0);

  const totalMap = new Map<string, number>();
  const confirmedMap = new Map<string, number>();
  const loteTotalMap = new Map<string, number>();
  const loteConfirmedMap = new Map<string, number>();

  for (const reg of registrations) {
    accumulateBateriaCounts(reg, totalMap, confirmedMap);

    if (reg.lote_id) {
      loteTotalMap.set(reg.lote_id, (loteTotalMap.get(reg.lote_id) ?? 0) + 1);
      if (reg.payment_status === "confirmed") {
        loteConfirmedMap.set(reg.lote_id, (loteConfirmedMap.get(reg.lote_id) ?? 0) + 1);
      }
    }
  }

  const combinedMode = adventure.has_baterias && adventure.has_lotes;
  const bateriaSource = combinedMode ? bateriasWithLotes : baterias;

  const bateriaStats: BateriaStats[] = bateriaSource
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => {
      const combined = combinedMode ? (b as BateriaWithLoteAvailability) : null;
      return {
        id: b.id,
        label: b.label,
        startTime: b.start_time,
        endTime: b.end_time,
        capacity: combinedMode
          ? combined?.active_lote_remaining ?? 0
          : (b as BateriaAvailability).capacity,
        sortOrder: b.sort_order,
        total: totalMap.get(b.id) ?? 0,
        confirmed: confirmedMap.get(b.id) ?? 0,
        activeLoteLabel: combined?.active_lote_label ?? null,
        activeLoteRemaining: combined?.active_lote_remaining,
      };
    });

  const loteStats: LoteStats[] = lotes
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((lote) => ({
      id: lote.id,
      label: lote.label,
      total: loteTotalMap.get(lote.id) ?? 0,
      confirmed: loteConfirmedMap.get(lote.id) ?? 0,
      capacity: lote.capacity,
    }));

  return {
    totalStudents,
    confirmedStudents,
    maxParticipants: adventure.max_participants,
    hasBaterias: adventure.has_baterias,
    hasLotes: adventure.has_lotes,
    baterias: bateriaStats,
    lotes: loteStats,
  };
}
