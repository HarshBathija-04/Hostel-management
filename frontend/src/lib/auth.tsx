import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler, tokenStore } from './api';
import type { SessionUser } from './types';

const USER_KEY = 'hostel.user';

interface AuthValue {
  user: SessionUser | null;
  signIn: (token: string, user: SessionUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const readUser = (): SessionUser | null => {
  if (!tokenStore.get()) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readUser);
  const queryClient = useQueryClient();

  const signOut = useCallback(() => {
    tokenStore.set(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const signIn = useCallback((token: string, next: SessionUser) => {
    tokenStore.set(token);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setUser(next);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
