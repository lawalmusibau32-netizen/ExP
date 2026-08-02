'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Attempt } from '@/lib/types';
import { ATTEMPT_STATUS_STYLES, Badge, Card, ErrorBanner, PageHeader, Spinner, formatDateTime } from '@/components/ui';

export default function ResultDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Attempt>(`/api/attempts/${attemptId}`)
      .then(setAttempt)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load result'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <Spinner />;
  if (!attempt) return <ErrorBanner message={error} />;

  const showAnswers = attempt.resultsAvailable;

  return (
    <div>
      <PageHeader
        title={attempt.examTitle}
        subtitle={`${attempt.courseTitle} · attempt #${attempt.attemptNumber}`}
        actions={
          <Link href="/student/results" className="text-sm font-medium text-indigo-600 hover:underline">
            Back to results
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Status" value={<Badge label={attempt.status} className={ATTEMPT_STATUS_STYLES[attempt.status] ?? ''} />} />
        <InfoCard label="Started" value={formatDateTime(attempt.startedAt)} />
        <InfoCard label="Submitted" value={formatDateTime(attempt.submittedAt)} />
        <InfoCard label="Tab switches" value={`${attempt.tabSwitchCount}${attempt.maxTabSwitches !== null ? ` / ${attempt.maxTabSwitches}` : ''}`} />
        <InfoCard label="Score" value={showAnswers && attempt.result ? `${Number(attempt.result.totalScore)} / ${Number(attempt.result.maxScore)}` : '-'} />
        <InfoCard label="Percentage" value={showAnswers && attempt.result?.percentage !== null && attempt.result?.percentage !== undefined ? `${Number(attempt.result.percentage)}%` : '-'} />
        <InfoCard label="Questions" value={String(attempt.questions.length)} />
        <InfoCard label="Result" value={showAnswers ? (attempt.result?.passed ? 'Passed' : 'Failed') : 'Not released'} />
      </div>

      {!showAnswers ? (
        <Card>
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-zinc-700">Your result has not been released yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Once your lecturer releases it, your score and the correct answers will appear here.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {attempt.questions.map((q, i) => {
            const answer = attempt.answers.find((a) => a.questionId === q.questionId);
            const userAnswer = answer?.answerText ?? answer?.selectedChoices;
            return (
              <Card key={q.id}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-900">Q{i + 1}.</span>
                  <span className="text-xs text-zinc-400">{q.points} pts</span>
                  {answer?.isCorrect !== null && answer?.isCorrect !== undefined && (
                    <Badge
                      label={answer.isCorrect ? 'Correct' : 'Incorrect'}
                      className={answer.isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
                    />
                  )}
                </div>
                <p className="text-sm text-zinc-700">{q.questionContent}</p>
                {q.choices?.options && (
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-zinc-500">
                    {q.choices.options.map((opt, j) => (
                      <li key={j} className={q.correctAnswer === opt ? 'font-medium text-emerald-700' : ''}>
                        {opt} {q.correctAnswer === opt && '(correct)'}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm">
                  <p className="text-zinc-600">
                    Your answer: <span className="font-medium text-zinc-900">{userAnswer || '(no answer)'}</span>
                  </p>
                  {answer?.questionType === 'SUBJECTIVE' && answer.scoreObtained !== null && (
                    <p className="mt-1 text-zinc-600">Score: {Number(answer.scoreObtained)} pts</p>
                  )}
                  {q.correctAnswer && (
                    <p className="mt-1 text-emerald-700">
                      Correct answer: <span className="font-medium">{q.correctAnswer}</span>
                    </p>
                  )}
                </div>
                {q.explanation && (
                  <p className="mt-2 text-sm text-zinc-500">Explanation: {q.explanation}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
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
