'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Attempt } from '@/lib/types';
import { ATTEMPT_STATUS_STYLES, Badge, Button, Card, ErrorBanner, PageHeader, Spinner, SuccessBanner, formatDateTime } from '@/components/ui';

export function AttemptDetailPage({ examId, attemptId, base }: { examId: string; attemptId: string; base: string }) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Attempt>(`/api/exams/${examId}/attempts/${attemptId}`);
      setAttempt(data);
      const sc: Record<string, string> = {};
      data.answers.forEach((a) => {
        if (a.questionType === 'SUBJECTIVE' && a.scoreObtained !== null) {
          sc[a.questionId] = String(Number(a.scoreObtained));
        }
      });
      setScores(sc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attempt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [examId, attemptId]);

  const grade = async (questionId: string) => {
    setGrading(questionId);
    setError(null);
    try {
      await api.post(`/api/exams/${examId}/attempts/${attemptId}/grade`, {
        questionId,
        score: Number(scores[questionId]) || 0,
      });
      setSuccess('Answer graded');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setGrading(null);
    }
  };

  const release = async () => {
    setError(null);
    try {
      await api.post(`/api/exams/${examId}/attempts/${attemptId}/release-result`);
      setSuccess('Result released to student');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release failed');
    }
  };

  if (loading) return <Spinner />;
  if (!attempt) return <ErrorBanner message={error} />;

  const subjective = attempt.answers.filter((a) => a.questionType === 'SUBJECTIVE');
  const autoGraded = attempt.answers.filter((a) => a.questionType !== 'SUBJECTIVE');

  return (
    <div>
      <PageHeader
        title={`${attempt.studentName}'s Attempt`}
        subtitle={`${attempt.examTitle} · attempt #${attempt.attemptNumber}`}
        actions={
          <Link href={`${base}/exams/${examId}/attempts`} className="text-sm font-medium text-indigo-600 hover:underline">
            Back to attempts
          </Link>
        }
      />

      <ErrorBanner message={error} />
      {success && (
        <div className="mb-4">
          <SuccessBanner message={success} />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Status" value={<Badge label={attempt.status} className={ATTEMPT_STATUS_STYLES[attempt.status] ?? ''} />} />
        <InfoCard label="Started" value={formatDateTime(attempt.startedAt)} />
        <InfoCard label="Submitted" value={formatDateTime(attempt.submittedAt)} />
        <InfoCard label="Tab switches" value={`${attempt.tabSwitchCount}${attempt.maxTabSwitches !== null ? ` / ${attempt.maxTabSwitches}` : ''}`} />
        <InfoCard label="Score" value={attempt.result ? `${Number(attempt.result.totalScore)} / ${Number(attempt.result.maxScore)}` : '-'} />
        <InfoCard label="Percentage" value={attempt.result?.percentage !== null && attempt.result?.percentage !== undefined ? `${Number(attempt.result.percentage)}%` : '-'} />
        <InfoCard label="Passed" value={attempt.result ? (attempt.result.passed ? 'Yes' : 'No') : '-'} />
        <InfoCard label="Result" value={attempt.resultsAvailable ? 'Released' : 'Not released'} />
      </div>

      {!attempt.resultsAvailable && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Release result</h3>
              <p className="text-sm text-zinc-500">Student will see their score and the correct answers.</p>
            </div>
            <Button onClick={release}>Release Result</Button>
          </div>
        </Card>
      )}

      {autoGraded.length > 0 && (
        <Card title="Auto-graded answers" className="mb-6">
          <div className="space-y-3">
            {autoGraded.map((a) => (
              <div key={a.id} className="rounded-lg border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-900">{a.questionContent}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Answer: <span className="font-medium">{a.answerText ?? a.selectedChoices ?? '(no answer)'}</span>
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Correct answer: <span className="font-medium text-emerald-700">{a.correctAnswer ?? '(none)'}</span>
                </p>
                <p className="mt-1 text-sm">
                  {a.isCorrect === null ? (
                    <span className="text-zinc-400">Not graded</span>
                  ) : (
                    <span className={a.isCorrect ? 'font-medium text-emerald-700' : 'font-medium text-rose-600'}>
                      {a.isCorrect ? 'Correct' : 'Incorrect'} · {Number(a.scoreObtained)} pts
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {subjective.length > 0 && (
        <Card title={`Subjective answers (${subjective.length})`}>
          <div className="space-y-3">
            {subjective.map((a) => (
              <div key={a.id} className="rounded-lg border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-900">{a.questionContent}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Answer: <span className="font-medium">{a.answerText ?? '(no answer)'}</span>
                </p>
                {a.gradedByName && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Graded by {a.gradedByName} {a.gradedAt ? `· ${formatDateTime(a.gradedAt)}` : ''}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={scores[a.questionId] ?? ''}
                    placeholder="Score"
                    onChange={(e) => setScores((prev) => ({ ...prev, [a.questionId]: e.target.value }))}
                    className="w-28 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                  />
                  <Button variant="secondary" disabled={grading === a.questionId} onClick={() => grade(a.questionId)}>
                    {grading === a.questionId ? 'Saving...' : 'Save Score'}
                  </Button>
                  {a.scoreObtained !== null && (
                    <span className="text-sm text-zinc-500">Current: {Number(a.scoreObtained)} pts</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
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
