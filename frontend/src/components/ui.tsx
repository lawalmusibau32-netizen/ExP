'use client';

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const EXAM_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-300 dark:border-zinc-600',
  SCHEDULED: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/40',
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
  COMPLETED: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/40',
  CANCELLED: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40',
};

export const ATTEMPT_STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40',
  SUBMITTED: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/40',
  AUTO_SUBMITTED: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/40',
  GRADED: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
};

export function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className ?? 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-300 dark:border-zinc-600'}`}>
      {label}
    </span>
  );
}

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-zinc-500 dark:text-zinc-400">
      <span className="relative h-6 w-6">
        <span className="absolute inset-0 rounded-full border-2 border-brand-400/25" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand-500" />
      </span>
      {label}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 py-14 text-center text-sm text-zinc-500 dark:border-brand-500/25 dark:text-zinc-400">
      {label}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="animate-fade-up rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="animate-fade-up rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
      {message}
    </div>
  );
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles: Record<string, string> = {
    primary: 'btn-glow text-white',
    secondary:
      'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50 dark:bg-navy-800 dark:text-zinc-200 dark:border-brand-500/25 dark:hover:bg-navy-700 disabled:opacity-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 disabled:opacity-50 shadow-md shadow-rose-600/20',
    ghost: 'text-brand-600 hover:bg-brand-500/10 dark:text-brand-300 disabled:opacity-50',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  );
}

const fieldBase = `w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all duration-200 placeholder:text-zinc-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:bg-zinc-50 dark:border-brand-500/25 dark:bg-navy-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-brand-400 dark:focus:ring-brand-500/20 dark:disabled:bg-navy-900`;

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} ${props.className ?? ''}`} />;
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <label className={`mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-300 ${className}`}>{children}</label>;
}

export function Card({ title, actions, children, className = '' }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`surface rounded-2xl ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-brand-500/10">
          {title && <h2 className="text-base font-bold text-zinc-900 dark:text-white">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, wide = false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div
        className={`animate-scale-in my-8 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-brand-500/25 dark:bg-navy-800`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-brand-500/10">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-navy-700" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmButton({ onConfirm, children, className = '' }: { onConfirm: () => void; children: ReactNode; className?: string }) {
  return (
    <Button
      variant="danger"
      className={className}
      onClick={() => {
        if (window.confirm('Are you sure? This action cannot be undone.')) onConfirm();
      }}
    >
      {children}
    </Button>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="animate-fade-up mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
