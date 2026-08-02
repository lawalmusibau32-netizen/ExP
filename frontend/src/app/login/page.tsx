'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button, ErrorBanner, Input, Label, SuccessBanner } from '@/components/ui';
import { Logo } from '@/components/logo';

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 w-fit">
              <Logo size="lg" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900">Exam Platform</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in with your Student/Staff ID or email</p>
          </div>

          {expired && <SuccessBanner message="Your session has expired. Please sign in again to continue." />}
          {loggedOut && <SuccessBanner message="You have been signed out successfully." />}

          {error &&
            (isLockout ? (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <div>
                  <p className="font-semibold">Account temporarily locked</p>
                  <p className="mt-0.5 text-amber-700">{error}</p>
                </div>
              </div>
            ) : (
              <ErrorBanner message={error} />
            ))}

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <Label>Student / Staff ID</Label>
              <Input
                type="text"
                autoComplete="username"
                placeholder="e.g. STU-001"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div>
              <Label>
                Email <span className="font-normal text-zinc-400">(or use ID above)</span>
              </Label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={busy} className="w-full py-2.5">
              {busy ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-lg bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-500">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <span>
              Protected area. Unauthorized access is prohibited. All login attempts are logged and monitored by
              administrators.
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-400">
          Demo: <span className="font-medium text-zinc-500">STU-001</span> (or student1@exams.local) /{' '}
          <span className="font-medium text-zinc-500">LEC-001</span> (lecturer1@exams.local) /{' '}
          <span className="font-medium text-zinc-500">ADMIN-001</span> (admin@exams.local) · passwords{' '}
          <span className="font-medium text-zinc-500">Student@123</span> / <span className="font-medium text-zinc-500">Lecturer@123</span> /{' '}
          <span className="font-medium text-zinc-500">Admin@123</span>
        </p>
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
