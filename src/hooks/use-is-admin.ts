'use client';
import { useIsAdmin as useIsAdminFromProvider } from '@/supabase/hooks';

export function useIsAdmin() {
  const { isAdmin, loading } = useIsAdminFromProvider();
  return { isAdmin, isAdminLoading: loading };
}
