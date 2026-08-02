'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { AttemptListItem } from '@/lib/types';
import { EmptyState, ErrorBanner, PageHeader, Spinner, formatDateTime } from '@/components/ui';
import { CircularProgress, Icon, StatusBadge } from '@/components/design-system';

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
    <div className="animate-fade-up">
      <PageHeader title="My Results" subtitle="Your past attempts and scores" />

      <ErrorBanner message={error} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface shimmer rounded-2xl p-6">
              <div className="h-4 w-2/3 rounded-full bg-brand-500/10" />
              <div className="mx-auto mt-5 h-24 w-24 rounded-full bg-brand-500/10" />
              <div className="mt-5 h-3 w-full rounded-full bg-brand-500/10" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface rounded-2xl">
          <EmptyState label="You have not taken any exams yet." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a, i) => {
            const pct = a.resultsAvailable && a.result ? Number(a.result.percentage) : 0;
            const passed = a.resultsAvailable && a.result?.passed;
            return (
              <Link
                key={a.id}
                href={`/student/results/${a.id}`}
                className="surface animate-fade-up group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-600/15"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-600 via-brand-400 to-cyan-400" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-extrabold text-zinc-900 dark:text-white">{a.examTitle}</h3>
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{a.courseTitle}</p>
                    <p className="mt-1 text-xs text-zinc-400">Attempt #{a.attemptNumber} · {formatDateTime(a.startedAt)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>

                <div className="mt-4 flex items-center justify-center">
                  <CircularProgress
                    value={pct}
                    size={104}
                    label={a.resultsAvailable ? `${pct}%` : '—'}
                    sublabel={a.resultsAvailable ? 'score' : 'pending'}
                    color={passed ? '#10b981' : a.resultsAvailable ? '#f43f5e' : '#a1a1aa'}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {a.resultsAvailable && a.result ? (
                    <>
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        {Number(a.result.totalScore)} / {Number(a.result.maxScore)} pts
                      </span>
                      <StatusBadge status={passed ? 'PASSED' : 'FAILED'} />
                    </>
                  ) : (
                    <span className="text-xs font-medium text-zinc-400">Result not released yet</span>
                  )}
                  <span className="flex items-center gap-1 text-xs font-bold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-300">
                    View <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
