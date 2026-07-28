import { useSyncExternalStore } from 'react';
import type { User } from '../types';

// ─── Module-level state ────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((l) => l());
}

function _read(): AuthState {
  try {
    const stored = localStorage.getItem('user');
    return {
      user: stored ? (JSON.parse(stored) as User) : null,
      accessToken: localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('refresh_token'),
    };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function _subscribe(listener: () => void) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

// ─── Public API ────────────────────────────────────────────────────────────

/** React hook — reactive, re-renders on every auth change. */
export const useAuthStore = () => {
  const state = useSyncExternalStore(_subscribe, _read, _read);
  return {
    user: state.user,
    accessToken: state.accessToken,
    isAuthenticated: !!state.accessToken && !!state.user,
    setAuth: (user: User, accessToken: string, refreshToken: string) => {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      _notify();
    },
    setUser: (user: User) => {
      localStorage.setItem('user', JSON.stringify(user));
      _notify();
    },
    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      _notify();
    },
  };
};

/** Non-hook accessor for use in interceptors / outside React. */
export const getAuth = () => _read();

/** Subscribe to auth changes from outside React (e.g. axios interceptors). */
export const subscribeToAuth = (listener: () => void) => _subscribe(listener);
