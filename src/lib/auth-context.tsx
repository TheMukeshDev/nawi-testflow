/**
 * NAWI Sahayak — Authentication Context
 *
 * React context for managing authentication state.
 * Provides user info, role, and permission checks.
 *
 * IMPORTANT: This is for UX only. Real security is on the backend.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types';
import { hasRole, hasPermission, filterNavByRole, NAV_ITEMS, ROLE_DASHBOARD_PATHS, type NavItem } from './auth';
import { supabase, isSupabaseConfigured } from './supabase/client';

const DEMO_SESSION_KEY = 'nawi-demo-session';

const DEMO_USERS: Array<Omit<User, 'id'> & { password: string }> = [
  { email: 'admin@nawi-demo.local', password: 'Admin@123', full_name: 'Demo Administrator', role: 'admin', laboratory_id: 'demo-lab-admin' },
  { email: 'tester@nawi-demo.local', password: 'Tester@123', full_name: 'Demo Tester', role: 'tester', laboratory_id: 'demo-lab-01' },
  { email: 'reviewer@nawi-demo.local', password: 'Reviewer@123', full_name: 'Demo Reviewer', role: 'reviewer', laboratory_id: 'demo-lab-01' },
  { email: 'viewer@nawi-demo.local', password: 'Viewer@123', full_name: 'Demo Viewer', role: 'viewer', laboratory_id: 'demo-lab-01' },
];

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  laboratory_id?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | undefined;
  laboratoryId: string | undefined;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  navigationItems: NavItem[];
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  getRoleRedirectPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();

    if (!isSupabaseConfigured) return;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      if (!isSupabaseConfigured) {
        const raw = localStorage.getItem(DEMO_SESSION_KEY);
        if (raw) {
          setUser(JSON.parse(raw) as User);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, laboratory_id, is_active')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch profile:', error);
        throw error;
      }

      if (data?.is_active === false) {
        setUser(null);
        return null;
      }

      const profile: User = {
        id: userId,
        email: data?.email || '',
        full_name: data?.full_name || undefined,
        role: (data?.role as UserRole) || 'viewer',
        laboratory_id: data?.laboratory_id || undefined,
      };
      setUser(profile);
      return profile;
    } catch (error) {
      // Fallback: derive minimal profile from the Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const su = session?.user as any;
        if (su) {
          const profile: User = {
            id: su.id,
            email: su.email,
            full_name: su.user_metadata?.full_name || su.email,
            role: su.user_metadata?.role || 'viewer',
            laboratory_id: su.user_metadata?.laboratory_id,
          };
          setUser(profile);
          return profile;
        }
      } catch (err) {
        console.error('Failed to derive user profile:', err);
      }
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        const demo = DEMO_USERS.find(u => u.email === email.trim().toLowerCase());
        if (!demo || demo.password !== password) {
          throw new Error('Invalid login credentials');
        }
        const demoUser: User = {
          id: `demo-${demo.role}`,
          email: demo.email,
          full_name: demo.full_name,
          role: demo.role,
          laboratory_id: demo.laboratory_id,
        };
        setUser(demoUser);
        try {
          localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
        } catch {
          // ignore storage failures
        }
        return demoUser;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        return await fetchUserProfile(data.user.id);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      try {
        localStorage.removeItem(DEMO_SESSION_KEY);
      } catch {
        // ignore storage failures
      }
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getRoleRedirectPath = useCallback(() => {
    if (!user?.role) return '/login';
    return ROLE_DASHBOARD_PATHS[user.role] || '/viewer';
  }, [user?.role]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    userRole: user?.role,
    laboratoryId: user?.laboratory_id,
    hasRole: (roles: UserRole[]) => hasRole(user?.role, roles),
    hasPermission: (permission: string) => hasPermission(user?.role, permission),
    navigationItems: filterNavByRole(NAV_ITEMS, user?.role),
    login,
    logout,
    getRoleRedirectPath,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
