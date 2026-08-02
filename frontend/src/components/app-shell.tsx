'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';

const LINKS: Record<Role, { href: string; label: string }[]> = {
  ADMIN: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/departments', label: 'Departments' },
    { href: '/admin/courses', label: 'Courses' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/question-banks', label: 'Question Banks' },
    { href: '/admin/questions', label: 'Questions' },
    { href: '/admin/exams', label: 'Exams' },
  ],
  LECTURER: [
    { href: '/lecturer', label: 'Dashboard' },
    { href: '/lecturer/question-banks', label: 'Question Banks' },
    { href: '/lecturer/questions', label: 'Questions' },
    { href: '/lecturer/exams', label: 'Exams' },
  ],
  STUDENT: [
    { href: '/student', label: 'Dashboard' },
    { href: '/student/exams', label: 'Available Exams' },
    { href: '/student/results', label: 'My Results' },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;
  const links = LINKS[user.role];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href={`/${user.role.toLowerCase()}`} className="flex items-center gap-2 text-base font-bold text-zinc-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">E</span>
            Exam Platform
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === l.href || (l.href !== '/admin' && l.href !== '/lecturer' && l.href !== '/student' && pathname.startsWith(l.href))
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-zinc-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">{user.role}</div>
            </div>
            <button
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-zinc-100 px-4 py-1.5 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                pathname === l.href ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
