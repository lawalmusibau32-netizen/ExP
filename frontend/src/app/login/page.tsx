'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button, ErrorBanner, Input, Label, SuccessBanner } from '@/components/ui';
import { Logo } from '@/components/logo';
import { AnimatedCounter, Icon } from '@/components/design-system';

function FloatingInput({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string;
  icon: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-zinc-400">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        placeholder={floated ? placeholder : ''}
        className={`w-full rounded-xl border bg-white px-11 pb-2.5 pt-5 text-sm text-zinc-900 outline-none transition-all duration-200 dark:bg-navy-800 dark:text-white ${
          focused
            ? 'border-brand-500 ring-4 ring-brand-500/15 dark:border-brand-400'
            : 'border-zinc-300 dark:border-brand-500/25'
        }`}
      />
      <label
        className={`pointer-events-none absolute left-11 transition-all duration-200 ${
          floated ? 'top-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-500' : 'top-3.5 text-sm text-zinc-400'
        }`}
      >
        {label}
      </label>
    </div>
  );
}

function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const expired = searchParams.get('expired') === '1';
  const loggedOut = searchParams.get('loggedOut') === '1';
  const isLockout = error !== null && /locked|too many/i.test(error);

  const goHome = () => {
    if (!user) return;
    router.replace(user.role === 'ADMIN' ? '/admin' : user.role === 'LECTURER' ? '/lecturer' : '/student');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() && !email.trim()) {
      setError('Enter your Student/Staff ID or email.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await login(identifier.trim(), email.trim(), password, rememberMe);
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-navy-950">
      {/* Left panel — welcome + illustration */}
      <div className="grad-bg relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-24 top-1/3 h-40 w-40 rounded-full bg-brand-400/20 blur-2xl animate-float" />

        <div className="relative z-10 flex items-center gap-3">
          <Logo size="lg" />
          <span className="text-xl font-extrabold tracking-tight text-white">
            Exam<span className="text-cyan-300">Platform</span>
          </span>
        </div>

        <div className="relative z-10">
          <h1 className="animate-fade-up text-4xl font-extrabold leading-tight text-white xl:text-5xl">
            Secure online exams,
            <br />
            <span className="grad-text">without the stress.</span>
          </h1>
          <p className="animate-fade-up mt-4 max-w-md text-lg text-indigo-200" style={{ animationDelay: '0.1s' }}>
            A modern examination platform for universities and professional institutions — built for students,
            lecturers, and administrators.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: 'shield', text: 'Monitored sessions with tab-switch detection' },
              { icon: 'clock', text: 'Real-time countdown and auto-submission' },
              { icon: 'chartBar', text: 'Instant scoring and detailed analytics' },
            ].map((f, i) => (
              <div key={i} className="animate-fade-up flex items-center gap-3 text-sm text-indigo-100" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 backdrop-blur-sm">
                  <Icon name={f.icon} className="h-4.5 w-4.5" />
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-10">
          {[
            { value: 100, suffix: '%', label: 'Cheat-safe' },
            { value: 24, suffix: '/7', label: 'Availability' },
            { value: 3, suffix: '+', label: 'Question types' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-2xl font-extrabold text-white">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div className="text-xs uppercase tracking-wide text-indigo-300">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="animate-fade-up w-full max-w-md">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Logo size="lg" />
            <h1 className="mt-3 text-xl font-extrabold text-zinc-900 dark:text-white">
              Exam<span className="grad-text">Platform</span>
            </h1>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Sign in with your Student/Staff ID or email</p>

          <div className="mt-5 space-y-3">
            {expired && <SuccessBanner message="Your session has expired. Please sign in again to continue." />}
            {loggedOut && <SuccessBanner message="You have been signed out successfully." />}
            {error &&
              (isLockout ? (
                <div className="animate-fade-up flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                  <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-bold">Account temporarily locked</p>
                    <p className="mt-0.5 text-amber-700 dark:text-amber-300/90">{error}</p>
                  </div>
                </div>
              ) : (
                <ErrorBanner message={error} />
              ))}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <FloatingInput label="Student / Staff ID" icon="users" value={identifier} onChange={setIdentifier} autoComplete="username" placeholder="e.g. STU-001" />
            <FloatingInput label="Email" icon="search" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" type="email" />

            <div className="relative">
              <FloatingInput
                label="Password"
                icon="shield"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 transition-colors hover:text-brand-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-600"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={busy} className="btn-glow w-full py-3 text-base">
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white/60 px-4 py-3 text-xs text-zinc-500 backdrop-blur dark:border-brand-500/20 dark:bg-navy-800/60 dark:text-zinc-400">
            <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <span>
              Protected area. Unauthorized access is prohibited. All login attempts are logged and monitored by
              administrators.
            </span>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
            Demo — ID / email · password:
            <br />
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">STU-001</span> (student1@exams.local) · Student@123 &nbsp;·&nbsp;
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">LEC-001</span> (lecturer1@exams.local) · Lecturer@123 &nbsp;·&nbsp;
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">ADMIN-001</span> (admin@exams.local) · Admin@123
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
