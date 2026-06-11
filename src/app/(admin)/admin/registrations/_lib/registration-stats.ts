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
