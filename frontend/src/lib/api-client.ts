import type { ApiResponse } from './types';

const TOKEN_KEY = 'exp_token';
const USER_KEY = 'exp_user';

function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // storage unavailable (private mode, quota)
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return read(window.localStorage, TOKEN_KEY) ?? read(window.sessionStorage, TOKEN_KEY);
}

export function setToken(token: string, remember: boolean) {
  const storage = remember ? window.localStorage : window.sessionStorage;
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  write(storage, TOKEN_KEY, token);
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = read(window.localStorage, USER_KEY) ?? read(window.sessionStorage, USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser<T>(user: T, remember: boolean) {
  const storage = remember ? window.localStorage : window.sessionStorage;
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  write(storage, USER_KEY, JSON.stringify(user));
}

export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiry(token);
  return exp !== null && Date.now() >= exp;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  const { json, ...rest } = options;
  let body: BodyInit | null | undefined;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...rest, headers, body });
  let parsed: ApiResponse<T>;
  try {
    parsed = await res.json();
  } catch {
    throw new Error(`Request to ${path} failed (${res.status})`);
  }
  if (!res.ok || !parsed.success) {
    throw new Error(parsed.message || `Request failed (${res.status})`);
  }
  return parsed.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: 'POST', json }),
  put: <T>(path: string, json?: unknown) => request<T>(path, { method: 'PUT', json }),
  patch: <T>(path: string, json?: unknown) => request<T>(path, { method: 'PATCH', json }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
