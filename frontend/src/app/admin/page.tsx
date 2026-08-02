'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { DashboardPage } from '@/components/pages/dashboard-page';

export default function Page() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <AppShell>
        <DashboardPage scope="admin" />
      </AppShell>
    </RequireAuth>
  );
}
