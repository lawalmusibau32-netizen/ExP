'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { QuestionsPage } from '@/components/pages/questions-page';

export default function Page() {
  return (
    <RequireAuth roles={['LECTURER']}>
      <AppShell>
        <QuestionsPage />
      </AppShell>
    </RequireAuth>
  );
}
