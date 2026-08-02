'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Button, ErrorBanner, Input, Label, SuccessBanner } from '@/components/ui';
import { Logo } from '@/components/logo';

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 w-fit">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Forgot password?</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enter the email on your account and an administrator will assist with resetting your password.
          </p>
        </div>

        {message && <SuccessBanner message={message} />}
        {error && <ErrorBanner message={error} />}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full py-2.5">
            {busy ? 'Submitting...' : 'Request password reset'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
