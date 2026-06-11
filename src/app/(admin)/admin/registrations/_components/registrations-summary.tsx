"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Users } from "lucide-react";
import { useSupabase } from "@/supabase/hooks";
import type { Adventure, BateriaAvailability, Registration } from "@/lib/types";
import { computeRegistrationStats } from "../_lib/registration-stats";

type RegistrationsSummaryProps = {
  adventure: Adventure;
  registrations: Registration[];
};

function formatTime(value: string): string {
  return value.slice(0, 5);
}

export function RegistrationsSummary({ adventure, registrations }: RegistrationsSummaryProps) {
  const supabase = useSupabase();
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
      const { data, error } = await supabase.rpc("get_adventure_baterias_with_availability", {
        p_adventure_id: adventure.id,
      });
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
    return () => {
      cancelled = true;
    };
  }, [adventure.id, adventure.has_baterias, supabase]);

  const stats = computeRegistrationStats(registrations, adventure, baterias);

  function formatTotalLine(): string {
    const { totalStudents, confirmedStudents, maxParticipants, hasBaterias } = stats;
    if (!hasBaterias && maxParticipants != null) {
      return `${totalStudents}/${maxParticipants} alunos inscritos (${confirmedStudents} confirmados)`;
    }
    return `${totalStudents} alunos inscritos (${confirmedStudents} confirmados)`;
  }

  return (
    <div className="mb-4 rounded-lg border bg-muted/30 p-4">
      <h3 className="mb-3 text-sm font-semibold">Resumo: {adventure.title}</h3>
      <div className="flex items-center gap-2 text-base font-medium">
        <Users className="h-4 w-4 text-muted-foreground" />
        {formatTotalLine()}
      </div>
      {adventure.has_baterias && (
        <div className="mt-3 space-y-1.5">
          {isLoadingBaterias ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : bateriasError ? (
            <p className="text-sm text-muted-foreground">Nao foi possivel carregar baterias.</p>
          ) : (
            stats.baterias.map((b) => (
              <div
                key={b.id}
                className="flex justify-between gap-4 text-sm text-muted-foreground"
              >
                <span>
                  {b.label} ({formatTime(b.startTime)}–{formatTime(b.endTime)})
                </span>
                <span className="whitespace-nowrap tabular-nums">
                  {b.total}/{b.capacity} · {b.confirmed} confirmados
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
