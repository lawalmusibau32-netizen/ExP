'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { DepartmentsPage } from '@/components/pages/departments-page';

export default function Page() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <AppShell>
        <DepartmentsPage />
      </AppShell>
    </RequireAuth>
  );
}
