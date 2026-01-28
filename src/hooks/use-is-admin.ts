'use client';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AdminRole } from '@/lib/types';

export function useIsAdmin() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const adminRoleRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);

  const { data: adminRole, isLoading: isRoleLoading } = useDoc<AdminRole>(adminRoleRef);

  const isAdmin = !!adminRole && adminRole.isAdmin === true;
  const isAdminLoading = isUserLoading || (!!user && isRoleLoading);

  return { isAdmin, isAdminLoading };
}
