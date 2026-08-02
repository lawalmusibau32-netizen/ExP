'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { TeacherAttemptRow } from '@/lib/types';
import { ATTEMPT_STATUS_STYLES, Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner, SuccessBanner, formatDateTime } from '@/components/ui';

export function ExamAttemptsPage({ examId, base }: { examId: string; base: string }) {
  const [items, setItems] = useState<TeacherAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await api.get<TeacherAttemptRow[]>(`/api/exams/${examId}/attempts`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attempts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [examId]);

  const release = async (attemptId: string) => {
    setError(null);
    try {
      await api.post(`/api/exams/${examId}/attempts/${attemptId}/release-result`);
      setSuccess('Result released');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release failed');
    }
  };

  return (
    <div>
      <PageHeader
        title="Attempts"
        subtitle="All student attempts for this exam"
        actions={
          <Link href={`${base}/exams/${examId}`} className="text-sm font-medium text-indigo-600 hover:underline">
            Back to exam
          </Link>
        }
      />

      <ErrorBanner message={error} />
      {success && (
        <div className="mb-4">
          <SuccessBanner message={success} />
        </div>
      )}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState label="No attempts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Student</th>
                  <th className="pb-3 pr-4 font-medium">Attempt</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Tab Switches</th>
                  <th className="pb-3 pr-4 font-medium">Started</th>
                  <th className="pb-3 pr-4 font-medium">Score</th>
                  <th className="pb-3 pr-4 font-medium">Result</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-zinc-900">{a.studentName}</div>
                      <div className="text-xs text-zinc-400">{a.studentEmail}</div>
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">#{a.attemptNumber}</td>
                    <td className="py-3 pr-4">
                      <Badge label={a.status} className={ATTEMPT_STATUS_STYLES[a.status] ?? ''} />
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">{a.tabSwitchCount}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateTime(a.startedAt)}</td>
                    <td className="py-3 pr-4 text-zinc-500">
                      {a.result ? `${Number(a.result.totalScore)} / ${Number(a.result.maxScore)} (${Number(a.result.percentage)}%)` : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {a.result ? (
                        <Badge
                          label={a.result.isReleased ? (a.result.passed ? 'Passed' : 'Failed') : 'Not released'}
                          className={
                            !a.result.isReleased
                              ? 'bg-zinc-100 text-zinc-500 border-zinc-200'
                              : a.result.passed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                          }
                        />
                      ) : (
                        <span className="text-xs text-zinc-400">No result</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`${base}/exams/${examId}/attempts/${a.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                          Review
                        </Link>
                        {a.result && !a.result.isReleased && (
                          <Button variant="secondary" onClick={() => release(a.id)}>Release</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
