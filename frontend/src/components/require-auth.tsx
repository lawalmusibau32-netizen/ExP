'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from './ui';
import type { Role } from '@/lib/types';

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading, sessionExpired } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(sessionExpired ? '/login?expired=1' : '/login');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      const base = user.role === 'STUDENT' ? '/student' : user.role === 'LECTURER' ? '/lecturer' : '/admin';
      router.replace(base);
    }
  }, [loading, user, roles, router, sessionExpired]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner />
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) return null;

  return <>{children}</>;
}
