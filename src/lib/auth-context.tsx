/**
 * NAWI TestFlow — Authentication Context
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
import { hasRole, hasPermission, filterNavByRole, NAV_ITEMS, type NavItem } from './auth';
import { supabase } from './supabase/client';

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getRoleRedirectPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based dashboard paths
const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  admin: '/admin',
  tester: '/tester',
  reviewer: '/reviewer',
  viewer: '/viewer',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();

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

  const fetchUserProfile = async (userId: string) => {
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
        return;
      }

      setUser({
        id: userId,
        email: data?.email || '',
        full_name: data?.full_name || undefined,
        role: (data?.role as UserRole) || 'viewer',
        laboratory_id: data?.laboratory_id || undefined,
      });
    } catch (error) {
      // Fallback: derive minimal profile from the Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const su = session?.user as any;
        if (su) {
          setUser({
            id: su.id,
            email: su.email,
            full_name: su.user_metadata?.full_name || su.email,
            role: su.user_metadata?.role || 'viewer',
            laboratory_id: su.user_metadata?.laboratory_id,
          });
        }
      } catch (err) {
        console.error('Failed to derive user profile:', err);
      }
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await fetchUserProfile(data.user.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
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
