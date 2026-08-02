'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Exam } from '@/lib/types';
import { EmptyState, ErrorBanner, PageHeader, Spinner, formatDateTime } from '@/components/ui';
import { Icon, StatusBadge, Tooltip } from '@/components/design-system';

export default function AvailableExamsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await api.get<Exam[]>('/api/exams/available'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const start = async (examId: string) => {
    setStarting(examId);
    setError(null);
    try {
      await api.post(`/api/exams/${examId}/attempts/start`);
      router.push(`/student/exams/${examId}/take`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start exam');
    } finally {
      setStarting(null);
    }
  };

  const closesIn = (endTime: string) => {
    const ms = new Date(endTime).getTime() - Date.now();
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m left`;
    if (h < 24) return `${h}h left`;
    return `${Math.floor(h / 24)}d left`;
  };

  return (
    <div className="animate-fade-up">
      <PageHeader title="Available Exams" subtitle="Exams currently open for you" />

      <ErrorBanner message={error} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="surface shimmer rounded-2xl p-6">
              <div className="h-4 w-1/2 rounded-full bg-brand-500/10" />
              <div className="mt-3 h-3 w-3/4 rounded-full bg-brand-500/10" />
              <div className="mt-8 h-10 w-full rounded-xl bg-brand-500/10" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface rounded-2xl">
          <EmptyState label="No exams are available right now." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((ex, i) => {
            const left = closesIn(ex.endTime);
            return (
              <div key={ex.id} className="surface animate-fade-up group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-600/15" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-600 via-brand-400 to-cyan-400" />
                <div className="flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/30">
                        <Icon name="exam" className="h-5.5 w-5.5" />
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">{ex.title}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{ex.courseTitle}</p>
                      </div>
                    </div>
                    <StatusBadge status="AVAILABLE" />
                  </div>

                  {ex.description && <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{ex.description}</p>}

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <Meta icon="clock" label="Duration" value={`${ex.durationMinutes} min`} />
                    <Meta icon="checkCircle" label="Passing score" value={`${ex.passingScore}%`} />
                    <Meta icon="shield" label="Max attempts" value={`${ex.maxAttempts ?? 1}`} />
                    <Meta icon="flag" label={left ? 'Closes in' : 'Closes'} value={left ?? formatDateTime(ex.endTime)} accent={left ? 'text-amber-500' : ''} />
                  </div>

                  <div className="mt-5 flex-1" />
                  <button
                    onClick={() => start(ex.id)}
                    disabled={starting === ex.id}
                    className="btn-glow w-full rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {starting === ex.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Starting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Start Exam <Icon name="arrowRight" className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Meta({ icon, label, value, accent = '' }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-navy-800/70">
      <Icon name={icon} className="h-4 w-4 text-zinc-400" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
        <Tooltip label={value}>
          <div className={`truncate text-xs font-bold text-zinc-800 dark:text-zinc-200 ${accent}`}>{value}</div>
        </Tooltip>
      </div>
    </div>
  );
}
