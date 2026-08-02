'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { LoginAttemptsData } from '@/lib/types';
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, Spinner, formatDateTime } from '@/components/ui';

type Filter = 'all' | 'success' | 'failed';

export function LoginAttemptsPage() {
  const [data, setData] = useState<LoginAttemptsData | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const q = filter === 'all' ? '' : `&filter=${filter}`;
    api
      .get<LoginAttemptsData>(`/api/auth/attempts?page=${page}&size=25${q}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load login attempts'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter, page]);

  const stats = data?.stats;

  return (
    <div>
      <PageHeader
        title="Login Attempts"
        subtitle="Audit trail of all sign-in activity on the platform"
        actions={
          <button onClick={load} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Successful today" value={stats?.successToday ?? '-'} tone="text-emerald-700" />
        <StatCard label="Failed today" value={stats?.failedToday ?? '-'} tone="text-rose-700" />
        <StatCard label="Accounts currently locked" value={stats?.lockedNow ?? '-'} tone="text-amber-700" />
      </div>

      <div className="mb-4 flex gap-2">
        {(['all', 'success', 'failed'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(0);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-indigo-600 text-white' : 'border border-zinc-300 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

      <Card className="overflow-hidden">
        {loading && !data ? (
          <Spinner label="Loading login attempts..." />
        ) : !data || data.content.length === 0 ? (
          <EmptyState label="No login attempts recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Result</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-5 py-3">Device</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-zinc-600">{formatDateTime(a.loggedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-zinc-900">{a.userName ?? 'Unknown'}</div>
                      <div className="text-xs text-zinc-400">
                        {a.userLoginId ?? '-'} · {a.userEmail ?? '-'} {a.userRole ? `· ${a.userRole}` : ''}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {a.loginSuccessful ? (
                        <Badge label="Success" className="bg-emerald-50 text-emerald-700 border-emerald-200" />
                      ) : (
                        <Badge label="Failed" className="bg-rose-50 text-rose-700 border-rose-200" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{a.failureReason ?? '-'}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-zinc-600">{a.ipAddress ?? '-'}</td>
                    <td className="max-w-[220px] truncate px-5 py-3 text-xs text-zinc-500" title={a.userAgent ?? ''}>
                      {a.userAgent ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-sm text-zinc-500">
            <span>
              Page {data.page + 1} of {data.totalPages} · {data.totalElements} attempts
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 disabled:opacity-40 hover:enabled:bg-zinc-50"
              >
                Prev
              </button>
              <button
                disabled={data.last}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 disabled:opacity-40 hover:enabled:bg-zinc-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
