'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { DashboardPage } from '@/components/pages/dashboard-page';

export default function Page() {
  return (
    <RequireAuth roles={['STUDENT']}>
      <AppShell>
        <DashboardPage scope="student" />
      </AppShell>
    </RequireAuth>
  );
}
