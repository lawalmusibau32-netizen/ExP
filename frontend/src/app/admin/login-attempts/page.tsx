'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { LoginAttemptsPage } from '@/components/pages/login-attempts-page';

export default function AdminLoginAttempts() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <AppShell>
        <LoginAttemptsPage />
      </AppShell>
    </RequireAuth>
  );
}
