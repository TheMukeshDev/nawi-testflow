/**
 * NAWI TestFlow — Supabase Client (Mock for Development)
 *
 * Mock Supabase client for development.
 * Persists session via localStorage so page reloads work.
 * Replace with real Supabase client when deploying.
 *
 * DEMO CREDENTIALS (fictional only):
 *   admin@nawi-demo.local  / Admin@123
 *   tester@nawi-demo.local / Tester@123
 *   reviewer@nawi-demo.local / Reviewer@123
 *   viewer@nawi-demo.local / Viewer@123
 */

export interface MockUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  laboratory_id?: string;
}

export interface MockSession {
  user: MockUser;
  access_token: string;
}

const MOCK_USERS: Record<string, { user: MockUser; password: string }> = {
  'admin@nawi-demo.local': {
    user: {
      id: 'usr-001',
      email: 'admin@nawi-demo.local',
      full_name: 'Rajesh Kumar',
      role: 'admin',
      laboratory_id: 'lab-001',
    },
    password: 'Admin@123',
  },
  'tester@nawi-demo.local': {
    user: {
      id: 'usr-002',
      email: 'tester@nawi-demo.local',
      full_name: 'Priya Mehta',
      role: 'tester',
      laboratory_id: 'lab-001',
    },
    password: 'Tester@123',
  },
  'reviewer@nawi-demo.local': {
    user: {
      id: 'usr-003',
      email: 'reviewer@nawi-demo.local',
      full_name: 'Dr. Anand Kumar',
      role: 'reviewer',
      laboratory_id: 'lab-001',
    },
    password: 'Reviewer@123',
  },
  'viewer@nawi-demo.local': {
    user: {
      id: 'usr-004',
      email: 'viewer@nawi-demo.local',
      full_name: 'S. Venkatesh',
      role: 'viewer',
      laboratory_id: 'lab-001',
    },
    password: 'Viewer@123',
  },
};

const STORAGE_KEY = 'nawi-mock-session';

class MockSupabaseAuth {
  private currentSession: MockSession | null = null;
  private sessionChangeListeners: Array<(event: string, session: MockSession | null) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.currentSession = JSON.parse(stored);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    await new Promise(resolve => setTimeout(resolve, 200));

    const entry = MOCK_USERS[email];
    if (!entry || entry.password !== password) {
      return { data: null, error: new Error('Invalid login credentials') };
    }

    const session: MockSession = {
      user: entry.user,
      access_token: `mock-token-${entry.user.id}`,
    };

    this.currentSession = session;
    this.persistSession(session);
    this.notifyListeners('SIGNED_IN', session);

    return { data: { user: entry.user, session }, error: null };
  }

  async signOut() {
    this.currentSession = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notifyListeners('SIGNED_OUT', null);
    return { error: null };
  }

  async getSession() {
    return { data: { session: this.currentSession }, error: null };
  }

  async getUser() {
    return { data: { user: this.currentSession?.user || null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
    this.sessionChangeListeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.sessionChangeListeners = this.sessionChangeListeners.filter(cb => cb !== callback);
          },
        },
      },
    };
  }

  private persistSession(session: MockSession | null) {
    if (typeof window === 'undefined') return;
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private notifyListeners(event: string, session: MockSession | null) {
    this.sessionChangeListeners.forEach(cb => cb(event, session));
  }
}

class MockSupabaseClient {
  auth = new MockSupabaseAuth();
}

export const supabase = new MockSupabaseClient() as any;

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session;
}
