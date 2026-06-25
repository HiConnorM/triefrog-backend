'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; orgName: string }) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tf_access_token');
    if (token) {
      api.auth
        .me()
        .then((r) => {
          const u = r.data?.data || r.data;
          setUser(u);
          if (u?.orgId) localStorage.setItem('tf_org_id', u.orgId);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.auth.login(email, password);
    const payload = r.data?.data || r.data;
    const { tokens, user: u } = payload;
    localStorage.setItem('tf_access_token', tokens.accessToken);
    localStorage.setItem('tf_refresh_token', tokens.refreshToken);
    if (u?.orgId) localStorage.setItem('tf_org_id', u.orgId);
    setUser(u);
  };

  const register = async (data: { email: string; password: string; name: string; orgName: string }) => {
    const r = await api.auth.register(data);
    const payload = r.data?.data || r.data;
    const { tokens, user: u } = payload;
    localStorage.setItem('tf_access_token', tokens.accessToken);
    localStorage.setItem('tf_refresh_token', tokens.refreshToken);
    if (u?.orgId) localStorage.setItem('tf_org_id', u.orgId);
    setUser(u);
  };

  const logout = () => {
    const rt = localStorage.getItem('tf_refresh_token') || '';
    api.auth.logout(rt).catch(() => {});
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
