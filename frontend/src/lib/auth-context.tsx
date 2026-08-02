'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api-client';
import { clearAuth, getStoredUser, getToken, getTokenExpiry, isTokenExpired, setStoredUser, setToken } from './api-client';
import type { LoginData, LoginUser, Role } from './types';

const WARNING_BEFORE_MS = 5 * 60 * 1000;
const RE_WARN_BEFORE_MS = 2 * 60 * 1000;
const TICK_MS = 1000;

interface AuthContextValue {
  user: LoginUser | null;
  loading: boolean;
  sessionExpired: boolean;
  login: (identifier: string, email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const expiresAtRef = useRef<number | null>(null);
  const warnedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser<LoginUser>();
    if (token && stored && !isTokenExpired(token)) {
      setUser(stored);
      expiresAtRef.current = getTokenExpiry(token);
    } else {
      setSessionExpired(!!token);
      clearAuth();
    }
    setLoading(false);
  }, []);

  const forceExpire = useCallback(() => {
    clearAuth();
    setUser(null);
    setSessionExpired(true);
    setWarningVisible(false);
    router.replace('/login?expired=1');
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const exp = expiresAtRef.current;
      if (exp === null) return;
      const remaining = exp - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        forceExpire();
        return;
      }
      if (remaining <= WARNING_BEFORE_MS) {
        if (!warnedRef.current) {
          warnedRef.current = true;
          setWarningVisible(true);
        }
        setCountdown(Math.floor(remaining / 1000));
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [user, forceExpire]);

  const dismissWarning = useCallback(() => {
    setWarningVisible(false);
    const exp = expiresAtRef.current ?? 0;
    const remaining = exp - Date.now();
    if (remaining > RE_WARN_BEFORE_MS) {
      warnedRef.current = false;
      setCountdown(null);
    }
  }, []);

  const login = useCallback(async (identifier: string, email: string, password: string, rememberMe: boolean) => {
    const data = await api.post<LoginData>('/api/auth/login', { identifier: identifier || undefined, email: email || undefined, password, rememberMe });
    setToken(data.token, rememberMe);
    setStoredUser(data.user, rememberMe);
    setUser(data.user);
    expiresAtRef.current = getTokenExpiry(data.token);
    setSessionExpired(false);
    warnedRef.current = false;
    setWarningVisible(false);
    setCountdown(null);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setSessionExpired(false);
    setWarningVisible(false);
    setCountdown(null);
    warnedRef.current = false;
  }, []);

  const minutes = countdown !== null ? Math.floor(countdown / 60) : 0;
  const seconds = countdown !== null ? countdown % 60 : 0;

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, login, logout, hasRole: (roles) => (user ? roles.includes(user.role) : false) }}>
      {children}
      {warningVisible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-2 flex items-center gap-2 text-amber-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="text-base font-semibold text-zinc-900">Session expiring soon</h3>
            </div>
            <p className="text-sm text-zinc-600">
              Your session will end in <span className="font-semibold text-zinc-900">{minutes}:{String(seconds).padStart(2, '0')}</span>. Any unsaved work may be lost. Please save your work and sign in again if needed.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={dismissWarning} className="rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
