'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { authApi, getErrorMessage } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await authApi.getMe();
      setUser(data);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    sessionStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
