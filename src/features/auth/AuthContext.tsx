import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../../types/api';
import { authStorage } from '../../lib/auth';
import { authApi } from '../../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

  useEffect(() => {
    const handleAuthExpired = () => {
      authStorage.clear();
      setUser(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
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

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user && authStorage.getAccessToken()),
    isLoading,
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
