'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Button, ErrorBanner, Input, Label, SuccessBanner } from '@/components/ui';
import { Logo } from '@/components/logo';
import { Icon } from '@/components/design-system';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const msg = await api.post<string>('/api/auth/forgot-password', { email });
      setMessage(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grad-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-400/25 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="animate-fade-up relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:bg-navy-800/95">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 w-fit">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">Forgot password?</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Enter the email on your account and an administrator will assist with resetting your password.
          </p>
        </div>

        {message && <SuccessBanner message={message} />}
        {error && <ErrorBanner message={error} />}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <Label>Email</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-zinc-400">
                <Icon name="search" className="h-4.5 w-4.5" />
              </span>
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="btn-glow w-full py-2.5">
            {busy ? 'Submitting...' : 'Request password reset'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-bold text-brand-600 hover:underline dark:text-brand-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
