// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  const [user, setUser]       = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial profile load
    authService.getProfile().then(p => { setUser(p); setLoading(false); });

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange(p => {
      setUser(p);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.login(email, password);
      const profile = await authService.getProfile();
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const register = async (data: Parameters<typeof authService.register>[0]) => {
    setLoading(true);
    try {
      await authService.register(data);
      const profile = await authService.getProfile();
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AppUser>) => {
    if (!user) return;
    const updated = await authService.updateProfile(user.id, updates);
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
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};