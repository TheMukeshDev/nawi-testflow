/**
 * NAWI TestFlow — Supabase Client
 *
 * Real Supabase client for authentication and data.
 * Uses NEXT_PUBLIC_* env vars (inlined at build time).
 *
 * Build safety: placeholder values are used when env vars are absent so
 * `next build` prerendering never throws "supabaseUrl is required".
 * Set the real vars in Vercel (Production + Preview) — without them,
 * auth/data calls fail gracefully at runtime and the app shows login errors.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key-for-build-only';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'nawi-supabase-session',
  },
});

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session;
}
