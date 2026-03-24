'use client'

import { useSupabaseContext } from './provider'

/**
 * Returns the Supabase client instance.
 * Replaces useFirebase(), useFirestore(), useStorage(), useAuth().
 */
export function useSupabase() {
  const { supabase } = useSupabaseContext()
  return supabase
}

/**
 * Returns the current user and loading state.
 * Replaces useUser() from Firebase provider.
 */
export function useUser() {
  const { user, loading } = useSupabaseContext()
  return { user, loading }
}

/**
 * Returns whether the current user is an admin and loading state.
 */
export function useIsAdmin() {
  const { isAdmin, loading } = useSupabaseContext()
  return { isAdmin, loading }
}
