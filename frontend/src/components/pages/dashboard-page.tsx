'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { AnimatedCounter, Avatar, BarChart, CircularProgress, Icon, ProgressBar, SkeletonCard, StatusBadge } from '@/components/design-system';
import type { AttemptListItem, Exam } from '@/lib/types';

interface Counter {
  label: string;
  value: number;
  icon: string;
  href: string;
  tone: string;
}

const COUNTER_TONES = [
  { bg: 'bg-brand-500/15 text-brand-500', glow: 'shadow-brand-500/20' },
  { bg: 'bg-cyan-500/15 text-cyan-500', glow: 'shadow-cyan-500/20' },
  { bg: 'bg-emerald-500/15 text-emerald-500', glow: 'shadow-emerald-500/20' },
  { bg: 'bg-amber-500/15 text-amber-500', glow: 'shadow-amber-500/20' },
  { bg: 'bg-rose-500/15 text-rose-500', glow: 'shadow-rose-500/20' },
  { bg: 'bg-violet-500/15 text-violet-500', glow: 'shadow-violet-500/20' },
];

export function DashboardPage({ scope }: { scope: 'admin' | 'lecturer' | 'student' }) {
  const { user } = useAuth();
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<{ available: Exam[]; attempts: AttemptListItem[] } | null>(null);
  const [lecturerData, setLecturerData] = useState<{ exams: Exam[] } | null>(null);
  const [adminData, setAdminData] = useState<{ attempts: any[]; stats: any } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = scope === 'admin' ? '/admin' : scope === 'lecturer' ? '/lecturer' : '/student';
        if (scope === 'admin') {
          const [departments, courses, users, banks, questions, exams, loginData] = await Promise.all([
            api.get<any[]>('/api/departments'),
            api.get<any[]>('/api/courses'),
            api.get<any[]>('/api/users'),
            api.get<any[]>('/api/question-banks'),
            api.get<any[]>('/api/questions'),
            api.get<any[]>('/api/exams'),
            api.get<any>('/api/auth/attempts?page=0&size=6'),
          ]);
          if (!cancelled) {
            setCounters([
              { label: 'Departments', value: departments.length, icon: 'building', href: `${base}/departments`, tone: COUNTER_TONES[0].bg },
              { label: 'Courses', value: courses.length, icon: 'book', href: `${base}/courses`, tone: COUNTER_TONES[1].bg },
              { label: 'Users', value: users.length, icon: 'users', href: `${base}/users`, tone: COUNTER_TONES[2].bg },
              { label: 'Question Banks', value: banks.length, icon: 'bank', href: `${base}/question-banks`, tone: COUNTER_TONES[3].bg },
              { label: 'Questions', value: questions.length, icon: 'question', href: `${base}/questions`, tone: COUNTER_TONES[4].bg },
              { label: 'Exams', value: exams.length, icon: 'exam', href: `${base}/exams`, tone: COUNTER_TONES[5].bg },
            ]);
            setAdminData({ attempts: loginData.content, stats: loginData.stats });
          }
        } else if (scope === 'lecturer') {
          const [exams, banks, questions] = await Promise.all([
            api.get<Exam[]>('/api/exams/my'),
            api.get<any[]>('/api/question-banks'),
            api.get<any[]>('/api/questions'),
          ]);
          if (!cancelled) {
            setCounters([
              { label: 'My Exams', value: exams.length, icon: 'exam', href: `${base}/exams`, tone: COUNTER_TONES[0].bg },
              { label: 'Question Banks', value: banks.length, icon: 'bank', href: `${base}/question-banks`, tone: COUNTER_TONES[1].bg },
              { label: 'Questions', value: questions.length, icon: 'question', href: `${base}/questions`, tone: COUNTER_TONES[2].bg },
            ]);
            setLecturerData({ exams });
          }
        } else {
          const [available, attempts] = await Promise.all([
            api.get<Exam[]>('/api/exams/available'),
            api.get<AttemptListItem[]>('/api/attempts/my'),
          ]);
          if (!cancelled) {
            setCounters([
              { label: 'Available Exams', value: available.length, icon: 'bolt', href: `${base}/exams`, tone: COUNTER_TONES[0].bg },
              { label: 'Attempts', value: attempts.length, icon: 'exam', href: `${base}/results`, tone: COUNTER_TONES[1].bg },
              { label: 'Results Released', value: attempts.filter((a) => a.resultsAvailable).length, icon: 'checkCircle', href: `${base}/results`, tone: COUNTER_TONES[2].bg },
            ]);
            setStudentData({ available, attempts });
          }
        }
      } catch {
        if (!cancelled) setCounters([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-navy-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const releasedAttempts = (studentData?.attempts ?? []).filter((a) => a.resultsAvailable);
  const scores = releasedAttempts.map((a) => Number(a.result?.percentage ?? 0));
  const avgScore = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0;
  const passed = releasedAttempts.filter((a) => a.result?.passed).length;
  const chartData = studentData
    ? (studentData.attempts ?? []).slice(0, 6).map((a, i) => ({
        label: `#${a.attemptNumber}`,
        value: a.resultsAvailable ? Number(a.result?.percentage ?? 0) : 0,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="grad-bg animate-fade-up relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl shadow-brand-600/20 sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl" />
        <div className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-200">Welcome back</p>
            <h1 className="mt-0.5 text-2xl font-extrabold sm:text-3xl">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="mt-1 text-sm text-indigo-200">
              {scope === 'student'
                ? 'Take your exams and track your performance.'
                : scope === 'lecturer'
                  ? 'Manage your examinations and review attempts.'
                  : 'Platform overview and security monitoring.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {scope === 'student' && studentData && studentData.available.length > 0 && (
              <Link href="/student/exams" className="btn-glow btn-glow-cyan inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">
                <Icon name="bolt" className="h-4 w-4" /> Start an exam
              </Link>
            )}
            {scope === 'lecturer' && (
              <Link href="/lecturer/exams" className="btn-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">
                <Icon name="plus" className="h-4 w-4" /> Create exam
              </Link>
            )}
            {scope === 'admin' && (
              <Link href="/admin/login-attempts" className="btn-glow btn-glow-cyan inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">
                <Icon name="shield" className="h-4 w-4" /> Monitor logins
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counters.map((c, i) => (
          <Link
            key={c.label}
            href={c.href}
            className="surface animate-fade-up group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                  <AnimatedCounter value={c.value} />
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">{c.label}</div>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.tone}`}>
                <Icon name={c.icon} className="h-5.5 w-5.5" />
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-300">
              View <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Student analytics */}
      {scope === 'student' && studentData && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface animate-fade-up rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Average score</h3>
            <div className="mt-3 flex justify-center">
              <CircularProgress value={avgScore} label={`${avgScore}%`} sublabel="average" color="#8b5cf6" />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Released results</span><span className="font-bold">{releasedAttempts.length}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Passed</span><span className="font-bold text-emerald-500">{passed}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Failed</span><span className="font-bold text-rose-500">{releasedAttempts.length - passed}</span></div>
            </div>
          </div>

          <div className="surface animate-fade-up rounded-2xl p-6" style={{ animationDelay: '0.08s' }}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Performance by attempt</h3>
            <div className="mt-6">
              {chartData.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-400">No attempts yet — your chart appears here.</p>
              ) : (
                <BarChart data={chartData} />
              )}
            </div>
          </div>

          <div className="surface animate-fade-up rounded-2xl p-6" style={{ animationDelay: '0.16s' }}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Up next</h3>
            <div className="mt-4 space-y-3">
              {studentData.available.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">No open exams right now.</p>
              ) : (
                studentData.available.slice(0, 3).map((ex) => (
                  <Link key={ex.id} href="/student/exams" className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 transition-colors hover:border-brand-300 hover:bg-brand-500/5 dark:border-brand-500/15">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-500">
                      <Icon name="exam" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-zinc-900 dark:text-white">{ex.title}</span>
                      <span className="block text-xs text-zinc-400">{ex.durationMinutes} min · {ex.courseTitle}</span>
                    </span>
                    <StatusBadge status="AVAILABLE" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lecturer exams */}
      {scope === 'lecturer' && lecturerData && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="surface animate-fade-up rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Your exams</h3>
              <Link href="/lecturer/exams" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">View all</Link>
            </div>
            <div className="mt-4 space-y-3">
              {lecturerData.exams.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">No exams created yet.</p>
              ) : (
                lecturerData.exams.slice(0, 4).map((ex) => (
                  <div key={ex.id} className="rounded-xl border border-zinc-100 p-3.5 dark:border-brand-500/15">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-zinc-900 dark:text-white">{ex.title}</span>
                      <StatusBadge status={ex.status} />
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">{ex.courseTitle} · {ex.durationMinutes} min</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="surface animate-fade-up rounded-2xl p-6" style={{ animationDelay: '0.08s' }}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Quick actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'New exam', href: '/lecturer/exams', icon: 'plus', tone: 'bg-brand-500/15 text-brand-500' },
                { label: 'Question bank', href: '/lecturer/question-banks', icon: 'bank', tone: 'bg-cyan-500/15 text-cyan-500' },
                { label: 'Questions', href: '/lecturer/questions', icon: 'question', tone: 'bg-emerald-500/15 text-emerald-500' },
                { label: 'Dashboard', href: '/lecturer', icon: 'dashboard', tone: 'bg-amber-500/15 text-amber-500' },
              ].map((q) => (
                <Link key={q.label} href={q.href} className="group flex flex-col items-start gap-2 rounded-xl border border-zinc-100 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/10 dark:border-brand-500/15">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${q.tone}`}>
                    <Icon name={q.icon} className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Admin security panel */}
      {scope === 'admin' && adminData && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface animate-fade-up rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Security today</h3>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <div className="text-xl font-extrabold text-emerald-500"><AnimatedCounter value={adminData.stats?.successToday ?? 0} /></div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-400">Logins</div>
              </div>
              <div className="rounded-xl bg-rose-500/10 p-3">
                <div className="text-xl font-extrabold text-rose-500"><AnimatedCounter value={adminData.stats?.failedToday ?? 0} /></div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-400">Failed</div>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3">
                <div className="text-xl font-extrabold text-amber-500"><AnimatedCounter value={adminData.stats?.lockedNow ?? 0} /></div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-400">Locked</div>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar value={Math.min(100, Math.round(((adminData.stats?.failedToday ?? 0) / Math.max(1, (adminData.stats?.failedToday ?? 0) + (adminData.stats?.successToday ?? 0))) * 100))} color="#f43f5e" />
              <p className="mt-1.5 text-xs text-zinc-400">Failure rate vs logins today</p>
            </div>
          </div>

          <div className="surface animate-fade-up rounded-2xl p-6 lg:col-span-2" style={{ animationDelay: '0.08s' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Recent login activity</h3>
              <Link href="/admin/login-attempts" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Monitor</Link>
            </div>
            <div className="mt-4 space-y-1">
              {(adminData.attempts ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">No login activity yet.</p>
              ) : (
                adminData.attempts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-brand-500/5">
                    <Avatar name={a.userName ?? '?'} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{a.userName ?? 'Unknown user'}</div>
                      <div className="text-xs text-zinc-400">{a.userEmail ?? a.userLoginId ?? 'no account'}</div>
                    </div>
                    <StatusBadge status={a.loginSuccessful ? 'PASSED' : 'FAILED'} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Announcements */}
      <div className="surface animate-fade-up rounded-2xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Announcements</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="flex gap-3 rounded-xl border border-zinc-100 p-4 dark:border-brand-500/15">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-500"><Icon name="bolt" className="h-4.5 w-4.5" /></span>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Timed exams auto-submit</p>
              <p className="mt-0.5 text-xs text-zinc-500">When the countdown hits zero, your attempt is submitted automatically.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-zinc-100 p-4 dark:border-brand-500/15">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-500"><Icon name="shield" className="h-4.5 w-4.5" /></span>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Proctoring is on</p>
              <p className="mt-0.5 text-xs text-zinc-500">Switching tabs during an exam is logged; repeated switches may auto-submit.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-zinc-100 p-4 dark:border-brand-500/15">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500"><Icon name="checkCircle" className="h-4.5 w-4.5" /></span>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Results need release</p>
              <p className="mt-0.5 text-xs text-zinc-500">Scores appear once your lecturer releases the result for an attempt.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
