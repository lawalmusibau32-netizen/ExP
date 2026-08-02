'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';

interface Stats {
  label: string;
  value: number;
  href: string;
}

export function DashboardPage({ scope }: { scope: 'admin' | 'lecturer' | 'student' }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = scope === 'admin' ? '/admin' : scope === 'lecturer' ? '/lecturer' : '/student';
        let items: Stats[] = [];
        if (scope === 'admin') {
          const [departments, courses, users, banks, questions, exams] = await Promise.all([
            api.get<any[]>('/api/departments'),
            api.get<any[]>('/api/courses'),
            api.get<any[]>('/api/users'),
            api.get<any[]>('/api/question-banks'),
            api.get<any[]>('/api/questions'),
            api.get<any[]>('/api/exams'),
          ]);
          items = [
            { label: 'Departments', value: departments.length, href: `${base}/departments` },
            { label: 'Courses', value: courses.length, href: `${base}/courses` },
            { label: 'Users', value: users.length, href: `${base}/users` },
            { label: 'Question Banks', value: banks.length, href: `${base}/question-banks` },
            { label: 'Questions', value: questions.length, href: `${base}/questions` },
            { label: 'Exams', value: exams.length, href: `${base}/exams` },
          ];
        } else if (scope === 'lecturer') {
          const [exams, banks, questions] = await Promise.all([
            api.get<any[]>('/api/exams/my'),
            api.get<any[]>('/api/question-banks'),
            api.get<any[]>('/api/questions'),
          ]);
          items = [
            { label: 'My Exams', value: exams.length, href: `${base}/exams` },
            { label: 'Question Banks', value: banks.length, href: `${base}/question-banks` },
            { label: 'Questions', value: questions.length, href: `${base}/questions` },
          ];
        } else {
          const [available, attempts] = await Promise.all([
            api.get<any[]>('/api/exams/available'),
            api.get<any[]>('/api/attempts/my'),
          ]);
          items = [
            { label: 'Available Exams', value: available.length, href: `${base}/exams` },
            { label: 'My Attempts', value: attempts.length, href: `${base}/results` },
          ];
        }
        if (!cancelled) setStats(items);
      } catch {
        if (!cancelled) setStats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        Welcome, {user?.firstName} {user?.lastName}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {scope === 'student' ? 'Take your exams and track your results.' : 'Manage your examination resources.'}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="text-3xl font-bold text-indigo-600">{s.value}</div>
            <div className="mt-1 text-sm font-medium text-zinc-600">{s.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
