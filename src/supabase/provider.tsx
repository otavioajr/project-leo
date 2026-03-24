'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { SupabaseClient, User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from './config'

// TODO: Create SupabaseErrorListener component at @/components/SupabaseErrorListener
// import { SupabaseErrorListener } from '@/components/SupabaseErrorListener'

interface SupabaseContextValue {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
  isAdmin: boolean
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => getSupabaseClient())
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.app_metadata?.is_admin === true

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <SupabaseContext.Provider value={{ supabase, user, loading, isAdmin }}>
      {/* TODO: Add <SupabaseErrorListener /> once the component is created */}
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabaseContext() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabaseContext must be used within a SupabaseProvider')
  }
  return context
}
