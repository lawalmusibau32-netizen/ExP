'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type { Attempt } from '@/lib/types';
import { Button, ErrorBanner, Modal, Spinner } from '@/components/ui';
import { Icon, ProgressBar, StatusBadge } from '@/components/design-system';

interface AnswerState {
  answerText?: string;
  selectedChoices?: string;
}

const QUESTION_TYPE_STYLES: Record<string, string> = {
  MCQ: 'bg-brand-500/15 text-brand-500',
  TRUE_FALSE: 'bg-cyan-500/15 text-cyan-500',
  FILL_BLANK: 'bg-emerald-500/15 text-emerald-500',
  SUBJECTIVE: 'bg-amber-500/15 text-amber-500',
};

export default function TakeExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Attempt | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

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
    setConfirmOpen(false);
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

  const isAnswered = (qid: string) => {
    const a = answers[qid];
    return !!(a && (a.answerText || a.selectedChoices));
  };

  if (error && !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-navy-950">
        <div className="animate-scale-in w-full max-w-md rounded-2xl surface p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
            <Icon name="xCircle" className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">Cannot start exam</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
          <Link href="/student/exams" className="btn-glow mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white">
            Back to exams
          </Link>
        </div>
      </div>
    );
  }

  if (submitted && attempt) {
    const score = Number(submitted.result?.totalScore);
    const max = Number(submitted.result?.maxScore);
    const pct = Number(submitted.result?.percentage);
    const passed = submitted.result?.passed;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-brand-900 px-4">
        <div className="animate-scale-in w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 text-center shadow-2xl backdrop-blur dark:bg-navy-800/95">
          <div className="animate-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-white shadow-lg shadow-emerald-500/40">
            <Icon name="checkCircle" className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-zinc-900 dark:text-white">
            {submitted.status === 'AUTO_SUBMITTED' ? 'Exam auto-submitted' : 'Exam submitted'}
          </h1>
          {notice && <p className="mt-2 text-sm font-medium text-amber-500">{notice}</p>}
          {submitted.resultsAvailable ? (
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-brand-500/10 to-cyan-500/10 p-5">
              <div className="text-4xl font-extrabold text-zinc-900 dark:text-white">{pct}%</div>
              <div className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-300">
                {score} / {max} points
              </div>
              <div className="mt-3 flex justify-center">
                <StatusBadge status={passed ? 'PASSED' : 'FAILED'} />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Your result will be available once the lecturer releases it.
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/student/results" className="btn-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white">
              View Results
            </Link>
            <Link href="/student/exams" className="inline-flex items-center rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-brand-500/25 dark:text-zinc-300 dark:hover:bg-navy-700">
              Back to Exams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-navy-950">
        <Spinner label="Starting exam..." />
      </div>
    );
  }

  const question = attempt.questions[index];
  const answeredCount = attempt.questions.filter((q) => isAnswered(q.questionId)).length;
  const current = answers[question.questionId] ?? {};
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const options = question.choices?.options ?? [];
  const progress = attempt.questions.length > 0 ? (answeredCount / attempt.questions.length) * 100 : 0;
  const lowTime = remaining < 300;
  const qid = question.questionId;
  const isCurrentFlagged = !!flagged[qid];

  const navState = (q: Attempt['questions'][number]) => {
    const answered = isAnswered(q.questionId);
    const fl = !!flagged[q.questionId];
    if (q.questionId === qid) return 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/40 ring-2 ring-cyan-300';
    if (fl && answered) return 'bg-amber-400 text-white shadow-md shadow-amber-500/40';
    if (fl) return 'bg-amber-100 text-amber-700 border-2 border-amber-400 dark:bg-amber-500/20 dark:text-amber-300';
    if (answered) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    return 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-navy-700 dark:text-zinc-300';
  };

  const navPanel = (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Questions</h4>
        <p className="text-xs text-zinc-400">{answeredCount} of {attempt.questions.length} answered</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {attempt.questions.map((q, i) => (
          <button
            key={q.questionId}
            onClick={() => {
              setIndex(i);
              setNavOpen(false);
            }}
            className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-bold transition-all duration-200 ${navState(q)}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-400" /> Answered</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-zinc-200 dark:bg-navy-700" /> Unanswered</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-400" /> Flagged</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-navy-950">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-brand-500/15 dark:bg-navy-900/85">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-extrabold text-zinc-900 dark:text-white">{attempt.examTitle}</span>
              <span className="hidden rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-300 sm:inline">
                Live
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              Question {index + 1} of {attempt.questions.length} · {answeredCount} answered
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNavOpen(true)}
              className="rounded-xl border border-zinc-200 p-2.5 text-zinc-500 hover:bg-zinc-50 dark:border-brand-500/25 dark:text-zinc-300 lg:hidden"
              aria-label="Open question panel"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-base font-extrabold tracking-wide transition-all duration-300 ${
                lowTime
                  ? 'animate-glow-pulse bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/40'
                  : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/30'
              }`}
            >
              <Icon name="clock" className="h-4.5 w-4.5" />
              {mm}:{String(ss).padStart(2, '0')}
            </div>
          </div>
        </div>
        <ProgressBar value={progress} color={answeredCount === attempt.questions.length ? '#10b981' : '#8b5cf6'} className="h-1.5 rounded-none" />
      </header>

      {notice && (
        <div className="mx-auto mt-4 max-w-5xl px-4">
          <div className="animate-fade-up rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
            {notice}
          </div>
        </div>
      )}
      {error && (
        <div className="mx-auto mt-4 max-w-5xl px-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6">
          {/* Question */}
          <div className="min-w-0 flex-1">
            <div key={qid} className="animate-fade-up surface rounded-3xl p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${QUESTION_TYPE_STYLES[question.questionType] ?? 'bg-brand-500/15 text-brand-500'}`}>
                    {question.questionType.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-medium text-zinc-400">{question.points} pts</span>
                  <span className="text-xs text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="text-xs font-medium text-zinc-400">Question {index + 1}</span>
                </div>
                <button
                  onClick={() => setFlagged((f) => ({ ...f, [qid]: !f[qid] }))}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                    isCurrentFlagged
                      ? 'bg-amber-400 text-white shadow-md shadow-amber-500/40'
                      : 'border border-zinc-200 text-zinc-500 hover:border-amber-300 hover:text-amber-500 dark:border-brand-500/25 dark:text-zinc-300'
                  }`}
                >
                  <Icon name="flag" className="h-3.5 w-3.5" />
                  {isCurrentFlagged ? 'Flagged' : 'Flag for review'}
                </button>
              </div>

              <h2 className="text-lg font-semibold leading-relaxed text-zinc-900 dark:text-white sm:text-xl">
                {question.questionContent}
              </h2>

              <div className="mt-6">
                {question.questionType === 'MCQ' && (
                  <div className="space-y-2.5">
                    {options.map((opt, i) => {
                      const selected = current.selectedChoices === opt;
                      return (
                        <label
                          key={i}
                          className={`group flex cursor-pointer items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-sm transition-all duration-200 ${
                            selected
                              ? 'border-brand-500 bg-gradient-to-r from-brand-500/15 to-cyan-500/10 shadow-lg shadow-brand-500/20'
                              : 'border-zinc-200 hover:border-brand-300 hover:bg-brand-500/5 dark:border-brand-500/20 dark:hover:border-brand-400/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${qid}`}
                            checked={selected}
                            onChange={() => updateAnswer(qid, { selectedChoices: opt })}
                            className="h-4 w-4 accent-brand-600"
                          />
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold transition-all ${
                              selected ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/40' : 'bg-zinc-100 text-zinc-500 group-hover:bg-brand-500/15 group-hover:text-brand-600 dark:bg-navy-700 dark:text-zinc-300'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className={selected ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-200'}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {question.questionType === 'TRUE_FALSE' && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: 'true', label: 'True', icon: 'checkCircle', active: 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20', dot: 'from-emerald-500 to-emerald-400' },
                      { val: 'false', label: 'False', icon: 'xCircle', active: 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/20', dot: 'from-rose-500 to-rose-400' },
                    ].map((t) => {
                      const selected = current.answerText === t.val;
                      return (
                        <label
                          key={t.val}
                          className={`flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-5 text-base font-extrabold transition-all duration-200 ${
                            selected ? t.active : 'border-zinc-200 text-zinc-500 hover:border-brand-300 hover:text-brand-600 dark:border-brand-500/20 dark:text-zinc-300'
                          } ${selected ? 'text-zinc-900 dark:text-white' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`q-${qid}`}
                            checked={selected}
                            onChange={() => updateAnswer(qid, { answerText: t.val })}
                            className="h-4 w-4 accent-brand-600"
                          />
                          <Icon name={t.icon} className={`h-5 w-5 ${selected ? '' : 'opacity-40'}`} />
                          {t.label}
                        </label>
                      );
                    })}
                  </div>
                )}

                {question.questionType === 'FILL_BLANK' && (
                  <input
                    className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3.5 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-brand-500/25 dark:bg-navy-800 dark:text-white"
                    placeholder="Type your answer..."
                    value={current.answerText ?? ''}
                    onChange={(e) => updateAnswer(qid, { answerText: e.target.value })}
                  />
                )}

                {question.questionType === 'SUBJECTIVE' && (
                  <textarea
                    rows={7}
                    className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3.5 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-brand-500/25 dark:bg-navy-800 dark:text-white"
                    placeholder="Write your answer..."
                    value={current.answerText ?? ''}
                    onChange={(e) => updateAnswer(qid, { answerText: e.target.value })}
                  />
                )}
              </div>
            </div>

            {/* Nav buttons */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)} className="!px-5 !py-2.5">
                <Icon name="chevronLeft" className="h-4 w-4" /> Previous
              </Button>
              <div className="hidden gap-2 sm:flex">
                {attempt.questions.map((q, i) => (
                  <button
                    key={q.questionId}
                    onClick={() => setIndex(i)}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      i === index
                        ? 'w-6 bg-gradient-to-r from-brand-600 to-cyan-400'
                        : isAnswered(q.questionId)
                          ? 'bg-emerald-400'
                          : flagged[q.questionId]
                            ? 'bg-amber-400'
                            : 'bg-zinc-300 dark:bg-navy-700'
                    }`}
                    aria-label={`Go to question ${i + 1}`}
                  />
                ))}
              </div>
              {index < attempt.questions.length - 1 ? (
                <Button onClick={() => setIndex(index + 1)} className="!px-5 !py-2.5">
                  Next <Icon name="chevronRight" className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="danger" disabled={submitting} onClick={() => setConfirmOpen(true)} className="!px-5 !py-2.5">
                  {submitting ? 'Submitting...' : 'Submit Exam'}
                </Button>
              )}
            </div>
          </div>

          {/* Question nav panel (desktop) */}
          <aside className="surface sticky top-24 hidden h-fit w-56 shrink-0 rounded-2xl p-5 lg:block">
            {navPanel}
            <button
              disabled={submitting}
              onClick={() => setConfirmOpen(true)}
              className="btn-glow mt-5 w-full rounded-xl px-3.5 py-2.5 text-sm font-bold text-white"
            >
              Submit exam
            </button>
          </aside>
        </div>
      </main>

      {/* Mobile question nav drawer */}
      <Modal open={navOpen} title="Question navigation" onClose={() => setNavOpen(false)}>
        {navPanel}
      </Modal>

      {/* Submit confirmation */}
      <Modal open={confirmOpen} title="Submit exam?" onClose={() => !submitting && setConfirmOpen(false)}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 text-brand-500">
            <Icon name="exam" className="h-7 w-7" />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            You are about to submit <span className="font-bold text-zinc-900 dark:text-white">{attempt.examTitle}</span>.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <div className="text-xl font-extrabold text-emerald-500">{answeredCount}</div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-400">Answered</div>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3 dark:bg-navy-700">
              <div className="text-xl font-extrabold text-zinc-600 dark:text-zinc-300">{attempt.questions.length - answeredCount}</div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-400">Unanswered</div>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3">
              <div className="text-xl font-extrabold text-amber-500">{Object.values(flagged).filter(Boolean).length}</div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-400">Flagged</div>
            </div>
          </div>
          {attempt.questions.length - answeredCount > 0 && (
            <p className="mt-3 text-xs font-medium text-amber-500">
              You still have {attempt.questions.length - answeredCount} unanswered question(s).
            </p>
          )}
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Keep working</Button>
            <Button variant="danger" disabled={submitting} onClick={() => doSubmit(false)}>
              {submitting ? 'Submitting...' : 'Yes, submit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
