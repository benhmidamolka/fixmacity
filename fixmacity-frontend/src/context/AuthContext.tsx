// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService, type AppUser } from '../lib/supabase';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    email: string; password: string;
    first_name: string; last_name: string; phone?: string;
  }) => Promise<void>;
  updateProfile: (updates: Partial<AppUser>) => Promise<void>;
  isPresident: boolean;
  isCitizen:   boolean;
  isChef:      boolean;
  isAgent:     boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem('fmc_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('fmc_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    // Initial sync
    handleStorageChange();

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.login(email, password);
      const profile = await authService.getProfile();
      if (profile) {
        localStorage.setItem('fmc_user', JSON.stringify(profile));
      }
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('fmc_token');
    localStorage.removeItem('fmc_refresh_token');
    localStorage.removeItem('fmc_user');
    try {
      await authService.logout();
    } catch (e) {
      console.warn("Supabase logout issue ignored", e);
    }
    setUser(null);
  };

  const register = async (data: Parameters<typeof authService.register>[0]) => {
    setLoading(true);
    try {
      await authService.register(data);
      const profile = await authService.getProfile();
      if (profile) {
        localStorage.setItem('fmc_user', JSON.stringify(profile));
      }
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AppUser>) => {
    if (!user) return;
    const updated = await authService.updateProfile(user.id, updates);
    localStorage.setItem('fmc_user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, register, updateProfile,
      isPresident: user?.role === 'president',
      isCitizen:   user?.role === 'citizen',
      isChef:      user?.role === 'chef',
      isAgent:     user?.role === 'agent',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      loading: false,
      login: async () => {},
      logout: async () => {},
      register: async () => {},
      updateProfile: async () => {},
      isPresident: false,
      isCitizen: false,
      isChef: false,
      isAgent: false,
    };
  }
  return ctx;
};