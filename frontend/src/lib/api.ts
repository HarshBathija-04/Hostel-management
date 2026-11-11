// Fetch wrapper for the Hostel API: JWT header, JSON errors, timeouts and cold-start detection.

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5124').replace(/\/$/, '');
const TOKEN_KEY = 'hostel.token';
/** After this long without a response we assume the free Render instance is waking up. */
export const SLOW_AFTER_MS = 4000;
const TIMEOUT_MS = 90_000;

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;
  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage blocked: session lasts until reload */
    }
  },
};

// Tiny external store so any component can show the "waking up" banner.
let slowCount = 0;
const listeners = new Set<() => void>();
const setSlow = (delta: number) => {
  slowCount += delta;
  listeners.forEach((l) => l());
};
export const wakeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  isWaking: () => slowCount > 0,
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

type Json = Record<string, unknown> | unknown[];

export async function api<T>(path: string, options: { method?: string; body?: Json } = {}): Promise<T> {
  const token = tokenStore.get();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let markedSlow = false;
  const slowTimer = setTimeout(() => {
    markedSlow = true;
    setSlow(1);
  }, SLOW_AFTER_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.success === false) {
      if (res.status === 401 && token) onUnauthorized?.();
      const fieldErrors: Record<string, string> = {};
      for (const e of payload.errors ?? []) fieldErrors[e.field] ??= e.message;
      throw new ApiError(res.status, payload.message ?? `Request failed (${res.status})`, fieldErrors);
    }
    return (payload.data ?? null) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'The server took too long to respond. Please try again.');
    }
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
    clearTimeout(slowTimer);
    if (markedSlow) setSlow(-1);
  }
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
