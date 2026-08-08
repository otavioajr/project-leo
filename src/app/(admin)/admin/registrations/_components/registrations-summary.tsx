"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Users } from "lucide-react";
import { useSupabase } from "@/supabase/hooks";
import type {
  Adventure,
  BateriaAvailability,
  BateriaWithLoteAvailability,
  LoteAvailability,
  Registration,
} from "@/lib/types";
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
  const [bateriasWithLotes, setBateriasWithLotes] = useState<BateriaWithLoteAvailability[]>([]);
  const [lotes, setLotes] = useState<LoteAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const combinedMode = adventure.has_baterias && adventure.has_lotes;

  useEffect(() => {
    if (!adventure.has_baterias && !adventure.has_lotes) {
      setBaterias([]);
      setBateriasWithLotes([]);
      setLotes([]);
      setLoadError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);

    async function load() {
      try {
        if (combinedMode) {
          const { data, error } = await supabase.rpc("get_baterias_with_lote_availability", {
            p_adventure_id: adventure.id,
          });
          if (cancelled) return;
          if (error) throw error;
          setBateriasWithLotes((data ?? []) as BateriaWithLoteAvailability[]);
        } else if (adventure.has_baterias) {
          const { data, error } = await supabase.rpc("get_adventure_baterias_with_availability", {
            p_adventure_id: adventure.id,
          });
          if (cancelled) return;
          if (error) throw error;
          setBaterias((data ?? []) as BateriaAvailability[]);
        }

        if (adventure.has_lotes) {
          const { data, error } = await supabase.rpc("get_adventure_lotes_with_availability", {
            p_adventure_id: adventure.id,
          });
          if (cancelled) return;
          if (error) throw error;
          setLotes((data ?? []) as LoteAvailability[]);
        }
      } catch (error) {
        console.error("Failed to load summary data:", error);
        if (!cancelled) {
          setLoadError(true);
          setBaterias([]);
          setBateriasWithLotes([]);
          setLotes([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    adventure.id,
    adventure.has_baterias,
    adventure.has_lotes,
    combinedMode,
    supabase,
  ]);

  const stats = computeRegistrationStats(
    registrations,
    adventure,
    baterias,
    bateriasWithLotes,
    lotes
  );

  function formatTotalLine(): string {
    const { totalStudents, confirmedStudents, maxParticipants, hasBaterias, hasLotes } = stats;
    if (!hasBaterias && !hasLotes && maxParticipants != null) {
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
      {(adventure.has_baterias || adventure.has_lotes) && (
        <div className="mt-3 space-y-1.5">
          {isLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : loadError ? (
            <p className="text-sm text-muted-foreground">Nao foi possivel carregar o resumo.</p>
          ) : (
            <>
              {stats.baterias.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between gap-4 text-sm text-muted-foreground"
                >
                  <span>
                    {b.label} ({formatTime(b.startTime)}–{formatTime(b.endTime)})
                    {b.activeLoteLabel ? ` · ${b.activeLoteLabel}` : ""}
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {b.total}/{b.capacity} · {b.confirmed} confirmados
                  </span>
                </div>
              ))}
              {!combinedMode &&
                stats.lotes.map((lote) => (
                  <div
                    key={lote.id}
                    className="flex justify-between gap-4 text-sm text-muted-foreground"
                  >
                    <span>{lote.label}</span>
                    <span className="whitespace-nowrap tabular-nums">
                      {lote.total}/{lote.capacity} · {lote.confirmed} confirmados
                    </span>
                  </div>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
