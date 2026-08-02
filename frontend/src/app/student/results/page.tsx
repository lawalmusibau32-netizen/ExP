'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { AttemptListItem } from '@/lib/types';
import { ATTEMPT_STATUS_STYLES, Badge, Card, EmptyState, ErrorBanner, PageHeader, Spinner, formatDateTime } from '@/components/ui';

export default function MyResultsPage() {
  const [items, setItems] = useState<AttemptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AttemptListItem[]>('/api/attempts/my')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load results'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="My Results" subtitle="Your past attempts and scores" />

      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState label="You have not taken any exams yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Exam</th>
                  <th className="pb-3 pr-4 font-medium">Course</th>
                  <th className="pb-3 pr-4 font-medium">Attempt</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Started</th>
                  <th className="pb-3 pr-4 font-medium">Score</th>
                  <th className="pb-3 pr-4 font-medium">Result</th>
                  <th className="pb-3 font-medium">View</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-zinc-900">{a.examTitle}</td>
                    <td className="py-3 pr-4 text-zinc-500">{a.courseTitle}</td>
                    <td className="py-3 pr-4 text-zinc-500">#{a.attemptNumber}</td>
                    <td className="py-3 pr-4">
                      <Badge label={a.status} className={ATTEMPT_STATUS_STYLES[a.status] ?? ''} />
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateTime(a.startedAt)}</td>
                    <td className="py-3 pr-4 text-zinc-500">
                      {a.resultsAvailable && a.result ? `${Number(a.result.totalScore)} / ${Number(a.result.maxScore)}` : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {a.resultsAvailable && a.result ? (
                        <Badge
                          label={a.result.passed ? 'Passed' : 'Failed'}
                          className={a.result.passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
                        />
                      ) : (
                        <span className="text-xs text-zinc-400">Not released</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Link href={`/student/results/${a.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                        View
                      </Link>
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
