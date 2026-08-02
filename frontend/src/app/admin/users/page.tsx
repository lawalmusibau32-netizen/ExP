'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { UsersPage } from '@/components/pages/users-page';

export default function Page() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <AppShell>
        <UsersPage />
      </AppShell>
    </RequireAuth>
  );
}
