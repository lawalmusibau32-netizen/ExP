'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api-client';
import { Logo } from '@/components/logo';
import { Avatar, Dropdown, Icon, StatusBadge, Tooltip } from '@/components/design-system';
import type { Role } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const LINKS: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/admin/departments', label: 'Departments', icon: 'building' },
    { href: '/admin/courses', label: 'Courses', icon: 'book' },
    { href: '/admin/users', label: 'Users', icon: 'users' },
    { href: '/admin/login-attempts', label: 'Login Attempts', icon: 'shield' },
    { href: '/admin/question-banks', label: 'Question Banks', icon: 'bank' },
    { href: '/admin/questions', label: 'Questions', icon: 'question' },
    { href: '/admin/exams', label: 'Exams', icon: 'exam' },
  ],
  LECTURER: [
    { href: '/lecturer', label: 'Dashboard', icon: 'dashboard' },
    { href: '/lecturer/question-banks', label: 'Question Banks', icon: 'bank' },
    { href: '/lecturer/questions', label: 'Questions', icon: 'question' },
    { href: '/lecturer/exams', label: 'Exams', icon: 'exam' },
  ],
  STUDENT: [
    { href: '/student', label: 'Dashboard', icon: 'dashboard' },
    { href: '/student/exams', label: 'Available Exams', icon: 'exam' },
    { href: '/student/results', label: 'My Results', icon: 'chartBar' },
  ],
};

const NOTIF_LOADERS: Record<Role, () => Promise<{ id: string; title: string; body: string; icon: string; tone: string; href: string }[]>> = {
  ADMIN: async () => {
    const [attempts, exams] = await Promise.all([
      api.get<{ stats: { failedToday: number; lockedNow: number } }>('/api/auth/attempts?size=1'),
      api.get<any[]>('/api/exams'),
    ]);
    const items = [];
    if (attempts.stats.failedToday > 0)
      items.push({ id: `fail-${attempts.stats.failedToday}`, title: `${attempts.stats.failedToday} failed login attempt(s) today`, body: 'Review the login monitor for details.', icon: 'shield', tone: 'rose', href: '/admin/login-attempts' });
    if (attempts.stats.lockedNow > 0)
      items.push({ id: `lock-${attempts.stats.lockedNow}`, title: `${attempts.stats.lockedNow} account(s) currently locked`, body: 'Locked due to repeated failed attempts.', icon: 'clock', tone: 'amber', href: '/admin/login-attempts' });
    items.push({ id: `exams-${exams.length}`, title: `${exams.length} exam(s) on the platform`, body: 'Manage exams from the Exams section.', icon: 'exam', tone: 'violet', href: '/admin/exams' });
    return items;
  },
  LECTURER: async () => {
    const exams = await api.get<any[]>('/api/exams/my');
    return [
      { id: `exams-${exams.length}`, title: `You have ${exams.length} exam(s)`, body: 'Track attempts and release results.', icon: 'exam', tone: 'violet', href: '/lecturer/exams' },
    ];
  },
  STUDENT: async () => {
    const [available, attempts] = await Promise.all([
      api.get<any[]>('/api/exams/available'),
      api.get<any[]>('/api/attempts/my'),
    ]);
    const items = [];
    if (available.length > 0)
      items.push({ id: `avail-${available.length}`, title: `${available.length} exam(s) available for you`, body: 'Don\'t miss the deadline — start now.', icon: 'bolt', tone: 'emerald', href: '/student/exams' });
    const released = attempts.filter((a) => a.resultsAvailable).length;
    if (released > 0)
      items.push({ id: `rel-${released}`, title: `${released} result(s) ready`, body: 'Your scores have been released.', icon: 'checkCircle', tone: 'cyan', href: '/student/results' });
    return items;
  },
};

const TONES: Record<string, string> = {
  rose: 'bg-rose-500/15 text-rose-500',
  amber: 'bg-amber-500/15 text-amber-500',
  emerald: 'bg-emerald-500/15 text-emerald-500',
  cyan: 'bg-cyan-500/15 text-cyan-500',
  violet: 'bg-brand-500/15 text-brand-500',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifs, setNotifs] = useState<ReturnType<(typeof NOTIF_LOADERS)[Role]> extends Promise<infer T> ? T : never>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loader = NOTIF_LOADERS[user.role];
    loader()
      .then((items) => {
        setNotifs(items);
        try {
          const seen = new Set<string>(JSON.parse(localStorage.getItem('exp_seen_notifs') || '[]'));
          setNotifCount(items.filter((i) => !seen.has(i.id)).length);
        } catch {
          setNotifCount(items.length);
        }
      })
      .catch(() => setNotifs([]));
  }, [user]);

  if (!user) return null;
  const links = LINKS[user.role];
  const base = `/${user.role.toLowerCase()}`;

  const isActive = (href: string) =>
    pathname === href || (href !== base && pathname.startsWith(href));

  const searchMatches = query.trim()
    ? links.filter((l) => l.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const markAllRead = () => {
    try {
      localStorage.setItem('exp_seen_notifs', JSON.stringify(notifs.map((n) => n.id)));
    } catch {
      // ignore
    }
    setNotifCount(0);
  };

  const sidebar = (
    <aside
      className={`flex h-full flex-col border-r border-zinc-200 bg-white transition-all duration-300 dark:border-brand-500/15 dark:bg-navy-900 ${
        collapsed ? 'w-[72px]' : 'w-[248px]'
      }`}
    >
      <div className={`flex h-16 items-center gap-2.5 border-b border-zinc-100 px-4 dark:border-brand-500/10 ${collapsed ? 'justify-center px-0' : ''}`}>
        <Link href={base} className="flex items-center gap-2.5 overflow-hidden">
          <Logo />
          {!collapsed && (
            <span className="whitespace-nowrap text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Exam<span className="grad-text">Platform</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map((l) => {
          const active = isActive(l.href);
          const item = (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                collapsed ? 'justify-center px-0' : ''
              } ${active ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/30' : 'text-zinc-600 hover:bg-brand-500/10 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-300'}`}
            >
              {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400" />}
              <Icon name={l.icon} className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{l.label}</span>}
            </Link>
          );
          return collapsed ? <Tooltip key={l.href} label={l.label}>{item}</Tooltip> : <div key={l.href}>{item}</div>;
        })}
      </nav>

      <div className="border-t border-zinc-100 p-3 dark:border-brand-500/10">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-navy-800"
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-navy-950">
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="animate-slide-in-right absolute inset-y-0 left-0 shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex">
        <div className="sticky top-0 hidden h-screen shrink-0 lg:block">{sidebar}</div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-brand-500/15 dark:bg-navy-900/80">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-navy-800 lg:hidden"
                aria-label="Open menu"
              >
                <Icon name="menu" />
              </button>

              {/* Search */}
              <div className="relative hidden max-w-md flex-1 sm:block">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
                  <Icon name="search" className="h-4.5 w-4.5" />
                </div>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  placeholder="Search pages…"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-10 pr-4 text-sm text-zinc-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 dark:border-brand-500/20 dark:bg-navy-800 dark:text-white dark:focus:bg-navy-800"
                />
                {searchOpen && query.trim() && (
                  <div className="animate-scale-in absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-brand-500/25 dark:bg-navy-800">
                    {searchMatches.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-zinc-400">No pages match “{query}”</p>
                    ) : (
                      searchMatches.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onMouseDown={() => setQuery('')}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-brand-500/10 hover:text-brand-600 dark:text-zinc-200"
                        >
                          <Icon name={l.icon} className="h-4.5 w-4.5 text-zinc-400" />
                          {l.label}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                {/* Notifications */}
                <Dropdown
                  align="right"
                  wide
                  trigger={
                    <button className="tip-wrap relative rounded-xl p-2.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-navy-800" aria-label="Notifications">
                      <Icon name="bell" />
                      {notifCount > 0 && (
                        <span className="animate-pop absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-brand-600 px-1 text-[10px] font-bold text-white shadow-md shadow-rose-500/40">
                          {notifCount}
                        </span>
                      )}
                    </button>
                  }
                >
                  {(close) => (
                    <div>
                      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-brand-500/10">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Notifications</span>
                        {notifCount > 0 && (
                          <button onClick={markAllRead} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifs.length === 0 ? (
                          <p className="px-4 py-8 text-center text-sm text-zinc-400">You're all caught up.</p>
                        ) : (
                          notifs.map((n) => (
                            <Link
                              key={n.id}
                              href={n.href}
                              onClick={close}
                              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-brand-500/5"
                            >
                              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[n.tone] ?? TONES.violet}`}>
                                <Icon name={n.icon} className="h-4 w-4" />
                              </span>
                              <span>
                                <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">{n.title}</span>
                                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{n.body}</span>
                              </span>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </Dropdown>

                {/* Dark mode toggle */}
                <button
                  onClick={toggleTheme}
                  className="rounded-xl p-2.5 text-zinc-500 transition-all hover:bg-zinc-100 hover:text-brand-600 dark:text-zinc-300 dark:hover:bg-navy-800 dark:hover:text-brand-300"
                  aria-label="Toggle dark mode"
                >
                  <span className="block transition-transform duration-300" style={{ transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                    <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
                  </span>
                </button>

                {/* Profile */}
                <Dropdown
                  align="right"
                  trigger={
                    <button className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-zinc-100 dark:hover:bg-navy-800">
                      <Avatar name={`${user.firstName} ${user.lastName}`} className="h-9 w-9" />
                      <span className="hidden text-left md:block">
                        <span className="block max-w-[140px] truncate text-sm font-bold text-zinc-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="block text-left">
                          <StatusBadge status={user.role} className="scale-90 origin-left" />
                        </span>
                      </span>
                      <Icon name="chevronDown" className="hidden h-4 w-4 text-zinc-400 md:block" />
                    </button>
                  }
                >
                  {(close) => (
                    <div>
                      <div className="border-b border-zinc-100 px-4 py-4 dark:border-brand-500/10">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${user.firstName} ${user.lastName}`} className="h-11 w-11" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="truncate text-xs text-zinc-400">{user.email}</div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <StatusBadge status={user.role} />
                        </div>
                      </div>
                      <div className="p-1.5">
                        <Link
                          href={base}
                          onClick={close}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-brand-500/10 hover:text-brand-600 dark:text-zinc-200"
                        >
                          <Icon name="dashboard" className="h-4.5 w-4.5" />
                          Dashboard
                        </Link>
                        <Link
                          href={user.role === 'STUDENT' ? '/student/results' : `${base}/exams`}
                          onClick={close}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-brand-500/10 hover:text-brand-600 dark:text-zinc-200"
                        >
                          <Icon name={user.role === 'STUDENT' ? 'chartBar' : 'exam'} className="h-4.5 w-4.5" />
                          {user.role === 'STUDENT' ? 'My Results' : 'My Exams'}
                        </Link>
                      </div>
                      <div className="border-t border-zinc-100 p-1.5 dark:border-brand-500/10">
                        <button
                          onClick={() => {
                            close();
                            logout();
                            router.replace('/login?loggedOut=1');
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                        >
                          <Icon name="logout" className="h-4.5 w-4.5" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </Dropdown>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>

          <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-400 dark:border-brand-500/10">
            ExamPlatform · Secure online examination system
          </footer>
        </div>
      </div>
    </div>
  );
}
