import type { User } from '../types/api';

/**
 * Persistent authentication state store.
 * Stores access token, refresh token, and user session in localStorage
 * so that state persists across page refreshes and browser tabs.
 */

const ACCESS_TOKEN_KEY = 'pingin_access_token';
const REFRESH_TOKEN_KEY = 'pingin_refresh_token';
const USER_KEY = 'pingin_user';

const LEGACY_ACCESS_TOKEN_KEY = 'parkping_access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'parkping_refresh_token';
const LEGACY_USER_KEY = 'parkping_user';

export const authStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setAccessToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    } catch (err) {
      console.error('Failed to save access token', err);
    }
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setRefreshToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch (err) {
      console.error('Failed to save refresh token', err);
    }
  },

  getCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (err) {
      console.error('Failed to save user', err);
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
    } catch (err) {
      console.error('Failed to clear auth storage', err);
    }
  },

  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  },
};
