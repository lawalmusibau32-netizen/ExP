'use client';

import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { QuestionBanksPage } from '@/components/pages/question-banks-page';

export default function Page() {
  return (
    <RequireAuth roles={['LECTURER']}>
      <AppShell>
        <QuestionBanksPage />
      </AppShell>
    </RequireAuth>
  );
}
