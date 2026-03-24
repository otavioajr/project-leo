'use client'

import { useEffect, useState, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useSupabaseContext } from './provider'
import { errorEmitter } from './error-emitter'
import { SupabasePermissionError } from './errors'

export type WithId<T> = T & { id: string }

interface UseCollectionOptions {
  filters?: Array<{ column: string; operator: string; value: unknown }>
  orderBy?: { column: string; ascending?: boolean }
}

export function useCollection<T = any>(
  table: string | null,
  options?: UseCollectionOptions
): { data: WithId<T>[] | null; isLoading: boolean; error: Error | null } {
  const { supabase } = useSupabaseContext()
  const [data, setData] = useState<WithId<T>[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Serialize options for dependency tracking
  const optionsKey = JSON.stringify(options ?? null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!table) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    async function fetchData() {
      let query = supabase.from(table!).select('*')

      const parsedOptions: UseCollectionOptions | null = JSON.parse(optionsKey)

      if (parsedOptions?.filters) {
        for (const filter of parsedOptions.filters) {
          query = query.filter(filter.column, filter.operator, filter.value)
        }
      }

      if (parsedOptions?.orderBy) {
        query = query.order(parsedOptions.orderBy.column, {
          ascending: parsedOptions.orderBy.ascending ?? true,
        })
      }

      const { data: rows, error: fetchError } = await query

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

      setData((rows as WithId<T>[]) ?? [])
      setIsLoading(false)
    }

    fetchData()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`collection:${table}:${optionsKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          if (cancelled) return

          switch (payload.eventType) {
            case 'INSERT':
              setData((prev) =>
                prev ? [...prev, payload.new as WithId<T>] : [payload.new as WithId<T>]
              )
              break
            case 'UPDATE':
              setData((prev) =>
                prev
                  ? prev.map((row) =>
                      row.id === (payload.new as WithId<T>).id
                        ? (payload.new as WithId<T>)
                        : row
                    )
                  : prev
              )
              break
            case 'DELETE':
              setData((prev) =>
                prev
                  ? prev.filter((row) => row.id !== (payload.old as WithId<T>).id)
                  : prev
              )
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
  }, [supabase, table, optionsKey])

  return { data, isLoading, error }
}
