'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, User } from '@/types';
import { DEMO_CREDENTIALS, demoUserForRole } from '@/lib/auth/demo-users';

export const ROLE_COOKIE = 'demo_role';

function setRoleCookie(role: Role | null) {
  if (typeof document === 'undefined') return;
  if (role) document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  else document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

interface AuthState {
  user: User | null;
  /** Simulated login: 800 ms delay, validates against demo credentials. */
  login: (email: string, password: string) => Promise<User>;
  loginAs: (role: Role) => Promise<User>;
  logout: () => void;
  updateProfile: (p: Partial<Pick<User, 'name' | 'org'>>) => void;
  /** Demo helper: switch the active role instantly (keeps the session). */
  switchRole: (role: Role) => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: async (email, password) => {
        await wait(800);
        const match = DEMO_CREDENTIALS.find((c) => c.email.toLowerCase() === email.trim().toLowerCase() && c.password === password);
        if (!match) throw new Error('Invalid email or password. Use one of the demo credentials.');
        setRoleCookie(match.role);
        set({ user: match.user });
        return match.user;
      },
      loginAs: async (role) => {
        await wait(800);
        const user = demoUserForRole(role);
        setRoleCookie(role);
        set({ user });
        return user;
      },
      logout: () => {
        setRoleCookie(null);
        set({ user: null });
      },
      updateProfile: (p) => set((s) => (s.user ? { user: { ...s.user, ...p } } : s)),
      switchRole: (role) => {
        setRoleCookie(role);
        set({ user: demoUserForRole(role) });
      },
    }),
    {
      name: 'pv-auth',
      skipHydration: true,
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        // Keep cookie in sync with persisted session (e.g. cookie expired but localStorage kept).
        setRoleCookie(state?.user?.role ?? null);
      },
    },
  ),
);
