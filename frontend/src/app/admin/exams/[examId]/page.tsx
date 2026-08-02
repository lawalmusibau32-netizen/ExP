'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { AppShell } from '@/components/app-shell';
import { ExamDetailPage } from '@/components/pages/exam-detail-page';

export default function Page({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  return (
    <RequireAuth roles={['ADMIN']}>
      <AppShell>
        <ExamDetailPage examId={examId} base="/admin" />
      </AppShell>
    </RequireAuth>
  );
}
