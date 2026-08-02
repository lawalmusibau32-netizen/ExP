'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { AttemptDetailPage } from '@/components/pages/attempt-detail-page';

export default function Page({ params }: { params: Promise<{ examId: string; attemptId: string }> }) {
  const { examId, attemptId } = use(params);
  return (
    <RequireAuth roles={['ADMIN']}>
      <AppShell>
        <AttemptDetailPage examId={examId} attemptId={attemptId} base="/admin" />
      </AppShell>
    </RequireAuth>
  );
}
