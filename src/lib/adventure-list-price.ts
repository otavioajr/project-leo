import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActiveLote, BateriaWithLoteAvailability } from '@/lib/types';

type AdventureListPriceInput = {
  id: string;
  price: number;
  has_lotes: boolean;
  has_baterias: boolean;
};

/**
 * Preço exibido em listagens (home/admin).
 * Retorna `null` quando a aventura com lotes está esgotada
 * (nenhum lote ativo com vaga).
 */
export async function getAdventureListPrice(
  supabase: SupabaseClient,
  adventure: AdventureListPriceInput
): Promise<number | null> {
  if (!adventure.has_lotes) {
    return adventure.price;
  }

  if (adventure.has_baterias) {
    const { data } = await supabase.rpc('get_baterias_with_lote_availability', {
      p_adventure_id: adventure.id,
    });
    const baterias = (data ?? []) as BateriaWithLoteAvailability[];
    const pricesWithSpots = baterias
      .filter((b) => b.active_lote_remaining > 0 && b.active_lote_price != null)
      .map((b) => Number(b.active_lote_price));

    if (pricesWithSpots.length === 0) {
      return null;
    }

    return Math.min(...pricesWithSpots);
  }

  const { data } = await supabase.rpc('get_active_lote', {
    p_adventure_id: adventure.id,
  });
  const lote = data?.[0] as ActiveLote | undefined;
  return lote ? Number(lote.price) : null;
}
