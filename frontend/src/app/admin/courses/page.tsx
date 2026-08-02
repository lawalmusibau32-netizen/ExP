'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { CoursesPage } from '@/components/pages/courses-page';

export default function Page() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <AppShell>
        <CoursesPage />
      </AppShell>
    </RequireAuth>
  );
}
