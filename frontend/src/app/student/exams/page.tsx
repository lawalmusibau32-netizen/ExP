'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Exam } from '@/lib/types';
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner, formatDateTime } from '@/components/ui';

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

  return (
    <div>
      <PageHeader title="Available Exams" subtitle="Exams currently open for you" />

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState label="No exams are available right now." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((ex) => (
            <Card key={ex.id}>
              <div className="flex h-full flex-col">
                <h3 className="text-base font-semibold text-zinc-900">{ex.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{ex.courseTitle}</p>
                {ex.description && <p className="mt-2 text-sm text-zinc-600">{ex.description}</p>}
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-zinc-400">Duration</dt>
                    <dd className="font-medium text-zinc-800">{ex.durationMinutes} min</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">Passing score</dt>
                    <dd className="font-medium text-zinc-800">{ex.passingScore}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">Closes</dt>
                    <dd className="font-medium text-zinc-800">{formatDateTime(ex.endTime)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">Max attempts</dt>
                    <dd className="font-medium text-zinc-800">{ex.maxAttempts ?? 1}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex-1" />
                <Button
                  className="w-full"
                  disabled={starting === ex.id}
                  onClick={() => start(ex.id)}
                >
                  {starting === ex.id ? 'Starting...' : 'Start Exam'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
