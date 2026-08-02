'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type { Attempt } from '@/lib/types';
import { Button, ErrorBanner, Spinner } from '@/components/ui';

interface AnswerState {
  answerText?: string;
  selectedChoices?: string;
}

export default function TakeExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [remaining, setRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Attempt | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const attemptRef = useRef<Attempt | null>(null);
  const answersRef = useRef<Record<string, AnswerState>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabSwitchInFlight = useRef(false);
  const submittedRef = useRef(false);

  const setAnswersBoth = useCallback((next: Record<string, AnswerState>) => {
    answersRef.current = next;
    setAnswers(next);
  }, []);

  const saveAnswer = useCallback(async (questionId: string, state: AnswerState) => {
    const a = attemptRef.current;
    if (!a) return;
    try {
      await api.post(`/api/exams/${a.examId}/attempts/${a.id}/answers`, {
        questionId,
        answerText: state.answerText ?? null,
        selectedChoices: state.selectedChoices ?? null,
      });
    } catch {
      // transient save errors are tolerated; submit will still work
    }
  }, []);

  const debouncedSave = useCallback(
    (questionId: string, state: AnswerState) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveAnswer(questionId, state), 400);
    },
    [saveAnswer]
  );

  const doSubmit = useCallback(async (auto: boolean) => {
    const a = attemptRef.current;
    if (!a || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const updated = await api.post<Attempt>(`/api/exams/${a.examId}/attempts/${a.id}/submit`);
      setSubmitted(updated);
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Submit failed');
    }
  }, []);

  useEffect(() => {
    if (started || attempt) return;
    api
      .post<Attempt>(`/api/exams/${examId}/attempts/start`)
      .then((data) => {
        attemptRef.current = data;
        setAttempt(data);
        setStarted(true);
        const init: Record<string, AnswerState> = {};
        data.answers.forEach((a) => {
          init[a.questionId] = {
            answerText: a.answerText ?? undefined,
            selectedChoices: a.selectedChoices ?? undefined,
          };
        });
        answersRef.current = init;
        setAnswers(init);
        setRemaining(Math.max(0, Math.floor((new Date(data.endTime!).getTime() - Date.now()) / 1000)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not start exam'))
      .finally(() => setStarted(true));
  }, [examId, attempt, started]);

  useEffect(() => {
    if (!attempt || submitted) return;
    const timer = setInterval(() => {
      const end = new Date(attempt.endTime!).getTime();
      const rem = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(timer);
        doSubmit(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt, submitted, doSubmit]);

  const reportTabSwitch = useCallback(async () => {
    const a = attemptRef.current;
    if (!a || submittedRef.current || tabSwitchInFlight.current) return;
    tabSwitchInFlight.current = true;
    try {
      const res = await api.post<{ autoSubmitted: boolean; status: string }>(`/api/exams/${a.examId}/attempts/${a.id}/tab-switch`);
      if (res.autoSubmitted) {
        setNotice('Maximum tab switches reached. Attempt auto-submitted.');
        const updated = await api.get<Attempt>(`/api/exams/${a.examId}/attempts/${a.id}`);
        submittedRef.current = true;
        setSubmitted(updated);
      }
    } catch {
      // ignore
    } finally {
      tabSwitchInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') reportTabSwitch();
    };
    const onBlur = () => reportTabSwitch();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [reportTabSwitch]);

  const updateAnswer = (questionId: string, state: AnswerState) => {
    const next = { ...answersRef.current, [questionId]: state };
    setAnswersBoth(next);
    debouncedSave(questionId, state);
  };

  const confirmSubmit = () => {
    if (window.confirm(`Submit your exam? ${Object.values(answers).filter((a) => a.answerText || a.selectedChoices).length} of ${attempt?.questions.length ?? 0} questions answered.`)) {
      doSubmit(false);
    }
  };

  if (error && !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">Cannot start exam</h1>
          <p className="mt-2 text-sm text-zinc-500">{error}</p>
          <Link href="/student/exams" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
            Back to exams
          </Link>
        </div>
      </div>
    );
  }

  if (submitted && attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-zinc-900">
            {submitted.status === 'AUTO_SUBMITTED' ? 'Exam auto-submitted' : 'Exam submitted'}
          </h1>
          {notice && <p className="mt-2 text-sm text-amber-600">{notice}</p>}
          <p className="mt-2 text-sm text-zinc-500">
            {submitted.resultsAvailable
              ? `Your score: ${Number(submitted.result?.totalScore)} / ${Number(submitted.result?.maxScore)} (${Number(submitted.result?.percentage)}%)`
              : 'Your result will be available once the lecturer releases it.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/student/results" className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              View Results
            </Link>
            <Link href="/student/exams" className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
              Back to Exams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner label="Starting exam..." />
      </div>
    );
  }

  const question = attempt.questions[index];
  const answeredCount = Object.values(answers).filter((a) => a.answerText || a.selectedChoices).length;
  const current = answers[question.questionId] ?? {};
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const options = question.choices?.options ?? [];
  const progress = attempt.questions.length > 0 ? ((index + 1) / attempt.questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-900">{attempt.examTitle}</div>
            <div className="text-xs text-zinc-400">
              Question {index + 1} of {attempt.questions.length} · {answeredCount} answered
            </div>
          </div>
          <div
            className={`shrink-0 rounded-lg px-3 py-1.5 font-mono text-sm font-bold ${
              remaining < 300 ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {mm}:{String(ss).padStart(2, '0')}
          </div>
        </div>
        <div className="h-1 w-full bg-zinc-100">
          <div className="h-1 bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {notice && (
        <div className="mx-auto mt-4 max-w-4xl px-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{notice}</div>
        </div>
      )}
      {error && (
        <div className="mx-auto mt-4 max-w-4xl px-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{question.questionType}</span>
            <span className="text-xs text-zinc-400">{question.points} pts</span>
          </div>
          <h2 className="text-lg font-medium text-zinc-900">{question.questionContent}</h2>

          <div className="mt-5">
            {question.questionType === 'MCQ' && (
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                      current.selectedChoices === opt ? 'border-indigo-500 bg-indigo-50' : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${question.questionId}`}
                      checked={current.selectedChoices === opt}
                      onChange={() => updateAnswer(question.questionId, { selectedChoices: opt })}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <span className="font-medium text-zinc-800">{String.fromCharCode(65 + i)}.</span>
                    <span className="text-zinc-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {question.questionType === 'TRUE_FALSE' && (
              <div className="grid grid-cols-2 gap-3">
                {['true', 'false'].map((val) => (
                  <label
                    key={val}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      current.answerText === val ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${question.questionId}`}
                      checked={current.answerText === val}
                      onChange={() => updateAnswer(question.questionId, { answerText: val })}
                      className="h-4 w-4 text-indigo-600"
                    />
                    {val === 'true' ? 'True' : 'False'}
                  </label>
                ))}
              </div>
            )}

            {question.questionType === 'FILL_BLANK' && (
              <input
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="Type your answer..."
                value={current.answerText ?? ''}
                onChange={(e) => updateAnswer(question.questionId, { answerText: e.target.value })}
              />
            )}

            {question.questionType === 'SUBJECTIVE' && (
              <textarea
                rows={6}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="Write your answer..."
                value={current.answerText ?? ''}
                onChange={(e) => updateAnswer(question.questionId, { answerText: e.target.value })}
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            Previous
          </Button>
          {index < attempt.questions.length - 1 ? (
            <Button onClick={() => setIndex(index + 1)}>Next</Button>
          ) : (
            <Button variant="danger" disabled={submitting} onClick={confirmSubmit}>
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
