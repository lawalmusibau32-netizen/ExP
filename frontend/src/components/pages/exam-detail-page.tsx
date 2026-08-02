'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Exam } from '@/lib/types';
import { Badge, Card, EmptyState, ErrorBanner, EXAM_STATUS_STYLES, PageHeader, Spinner, formatDateTime } from '@/components/ui';

const TYPE_LABELS: Record<string, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  FILL_BLANK: 'Fill in the Blank',
  SUBJECTIVE: 'Subjective',
};

export function ExamDetailPage({ examId, base }: { examId: string; base: string }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Exam>(`/api/exams/${examId}`)
      .then(setExam)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load exam'))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) return <Spinner />;

  if (!exam) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div>
      <PageHeader
        title={exam.title}
        subtitle={`${exam.courseTitle} · ${exam.durationMinutes} minutes · ${exam.questions?.length ?? 0} questions`}
        actions={
          <Link href={`${base}/exams/${exam.id}/attempts`} className="inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            View Attempts
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Status" value={<Badge label={exam.status} className={EXAM_STATUS_STYLES[exam.status]} />} />
        <InfoCard label="Starts" value={formatDateTime(exam.startTime)} />
        <InfoCard label="Ends" value={formatDateTime(exam.endTime)} />
        <InfoCard label="Passing score" value={`${exam.passingScore}%`} />
        <InfoCard label="Max attempts" value={String(exam.maxAttempts ?? 1)} />
        <InfoCard label="Max tab switches" value={exam.maxTabSwitches === null ? 'Unlimited' : String(exam.maxTabSwitches)} />
        <InfoCard label="Shuffle questions" value={exam.shuffleQuestions ? 'Yes' : 'No'} />
        <InfoCard label="Shuffle choices" value={exam.shuffleChoices ? 'Yes' : 'No'} />
      </div>

      {exam.description && (
        <Card className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Description</h3>
          <p className="text-sm text-zinc-600">{exam.description}</p>
        </Card>
      )}

      <Card title={`Questions (${exam.questions?.length ?? 0})`}>
        {!exam.questions || exam.questions.length === 0 ? (
          <EmptyState label="No questions in this exam." />
        ) : (
          <div className="space-y-3">
            {exam.questions.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-zinc-200 p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-900">Q{i + 1}.</span>
                  <Badge label={TYPE_LABELS[q.questionType] ?? q.questionType} className="bg-sky-50 text-sky-700 border-sky-200" />
                  <span className="text-xs text-zinc-400">{q.points} pts</span>
                </div>
                <p className="text-sm text-zinc-700">{q.questionContent}</p>
                {q.choices?.options && (
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-zinc-500">
                    {q.choices.options.map((opt, j) => (
                      <li key={j}>{opt}</li>
                    ))}
                  </ul>
                )}
                {q.correctAnswer && (
                  <p className="mt-2 text-sm text-emerald-700">
                    Correct answer: <span className="font-medium">{q.correctAnswer}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-zinc-900">{value}</div>
    </div>
  );
}
