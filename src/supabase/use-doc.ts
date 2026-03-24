'use client'

import { useEffect, useState, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useSupabaseContext } from './provider'
import { errorEmitter } from './error-emitter'
import { SupabasePermissionError } from './errors'

export type WithId<T> = T & { id: string }

export function useDoc<T = any>(
  table: string | null,
  id: string | null
): { data: WithId<T> | null; isLoading: boolean; error: Error | null } {
  const { supabase } = useSupabaseContext()
  const [data, setData] = useState<WithId<T> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!table || !id) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    async function fetchData() {
      const { data: row, error: fetchError } = await supabase
        .from(table!)
        .select('*')
        .eq('id', id!)
        .single()

      if (cancelled) return

      if (fetchError) {
        const err = new Error(fetchError.message)
        setError(err)
        setData(null)
        setIsLoading(false)

        if (fetchError.code === '42501' || fetchError.message.includes('permission denied')) {
          errorEmitter.emit(
            'permission-error',
            new SupabasePermissionError({
              table: table!,
              operation: 'select',
              details: fetchError.message,
            })
          )
        }
        return
      }

      setData((row as WithId<T>) ?? null)
      setIsLoading(false)
    }

    fetchData()

    // Subscribe to real-time changes for this specific row
    const channel = supabase
      .channel(`doc:${table}:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (cancelled) return

          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              setData(payload.new as WithId<T>)
              break
            case 'DELETE':
              setData(null)
              break
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabase, table, id])

  return { data, isLoading, error }
}
