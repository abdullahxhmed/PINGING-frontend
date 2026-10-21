import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../../types/api';
import { authStorage } from '../../lib/auth';
import { authApi } from '../../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  login: (mobileNumber: string, otpOrPassword: string, isPassword?: boolean) => Promise<void>;
  loginWithPassword: (mobileNumber: string, password: string) => Promise<void>;
  loginWithOtp: (mobileNumber: string, otp: string) => Promise<void>;
  signup: (name: string, mobileNumber: string, otp: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authStorage.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshUser = async () => {
    if (!authStorage.getAccessToken()) return;
    try {
      const res: any = await authApi.getMe();
      const profile = res?.user || res?.data?.user || res?.data || res;
      if (profile && (profile.id || profile.name || profile.role)) {
        setUser((prev) => {
          const merged: User = {
            ...(prev || {}),
            ...profile,
            id: profile.id || prev?.id || '',
            name: profile.name || prev?.name || '',
            mobileNumber: profile.mobileNumber || prev?.mobileNumber || '',
            active: profile.active ?? prev?.active ?? true,
            role: profile.role || (profile as any)?.role || prev?.role || 'USER',
          };
          authStorage.setCurrentUser(merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  useEffect(() => {
    const handleAuthExpired = () => {
      authStorage.clear();
      setUser(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    
    // Refresh user role & profile on initial load
    refreshUser();

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  const loginWithPassword = async (mobileNumber: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.loginWithPassword(mobileNumber, password);
      authStorage.setAccessToken(res.accessToken);
      authStorage.setCurrentUser(res.user);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (mobileNumber: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyLoginOtp(mobileNumber, otp);
      authStorage.setAccessToken(res.accessToken);
      authStorage.setCurrentUser(res.user);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (mobileNumber: string, otpOrPassword: string, isPassword = true) => {
    if (isPassword) {
      return loginWithPassword(mobileNumber, otpOrPassword);
    }
    return loginWithOtp(mobileNumber, otpOrPassword);
  };

  const signup = async (name: string, mobileNumber: string, otp: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.verifySignupOtp(name, mobileNumber, otp, password);
      authStorage.setAccessToken(res.accessToken);
      authStorage.setCurrentUser(res.user);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignored if network/server is unreachable
    } finally {
      authStorage.clear();
      setUser(null);
    }
  };

  const isAdmin = Boolean(
    user?.role === 'ADMIN' ||
    (typeof window !== 'undefined' && Boolean(localStorage.getItem('pingin_admin_key')))
  );

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user && authStorage.getAccessToken()),
    isAdmin,
    isLoading,
    refreshUser,
    login,
    loginWithPassword,
    loginWithOtp,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
