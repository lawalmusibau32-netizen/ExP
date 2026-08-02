'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { ExamsPage } from '@/components/pages/exams-page';

export default function Page() {
  return (
    <RequireAuth roles={['LECTURER']}>
      <AppShell>
        <ExamsPage scope="lecturer" />
      </AppShell>
    </RequireAuth>
  );
}
