'use client'

import { SupabaseProvider } from './provider'

export function SupabaseClientProvider({ children }: { children: React.ReactNode }) {
  return <SupabaseProvider>{children}</SupabaseProvider>
}
