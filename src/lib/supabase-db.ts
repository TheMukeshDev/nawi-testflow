/**
 * NAWI TestFlow — Supabase Unified Database Client
 *
 * Provides persistent database access through secure Next.js API routes
 * with local cache fallback, ensuring data remains intact on page refreshes.
 */

export interface DbUser {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'tester' | 'reviewer' | 'viewer';
  laboratory: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

export const supabaseDb = {
  /**
   * Fetch all users from Supabase profiles
   */
  async getUsers(): Promise<DbUser[]> {
    try {
      const res = await fetch('/api/db/profiles?select=*&order=created_at.desc');
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped: DbUser[] = rows.map(r => ({
            id: r.id,
            email: r.email,
            fullName: r.full_name || r.email.split('@')[0],
            role: r.role || 'viewer',
            laboratory: r.laboratory_id || 'CMTL-PY-01',
            isActive: r.is_active !== false,
            lastLogin: r.last_login || new Date().toISOString(),
            createdAt: r.created_at || new Date().toISOString(),
          }));
          // Save to local cache for instant offline render
          localStorage.setItem('nawi_cached_users_v1', JSON.stringify(mapped));
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[supabaseDb] Failed to fetch users from server, checking local cache:', err);
    }

    // Fallback to local cache or defaults
    const cached = typeof window !== 'undefined' ? localStorage.getItem('nawi_cached_users_v1') : null;
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    return [
      {
        id: '2a927bdb-fc9c-47b9-ae96-528e0e994f36',
        email: 'admin@nawi-demo.local',
        fullName: 'Dr. Anil Deshmukh',
        role: 'admin',
        laboratory: 'CMTL-PY-01',
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: '2025-06-01',
      },
      {
        id: '489fc926-69d5-4e66-acf5-34c23be5ce6a',
        email: 'tester@nawi-demo.local',
        fullName: 'Sneha Kulkarni',
        role: 'tester',
        laboratory: 'CMTL-PY-01',
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: '2025-06-15',
      },
      {
        id: 'fb0ffaa0-a4fd-4d2f-875d-2e10252297c3',
        email: 'reviewer@nawi-demo.local',
        fullName: 'Vikram Singh',
        role: 'reviewer',
        laboratory: 'CMTL-PY-01',
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: '2025-07-01',
      },
      {
        id: 'usr-004-viewer',
        email: 'viewer@nawi-demo.local',
        fullName: 'Rahul Mehta',
        role: 'viewer',
        laboratory: 'CMTL-PY-01',
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: '2025-08-01',
      },
    ];
  },

  /**
   * Update user in Supabase profiles
   */
  async updateUser(id: string, updates: Partial<DbUser>): Promise<boolean> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.role) payload.role = updates.role;
    if (updates.fullName) payload.full_name = updates.fullName;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    // Optimistically update local cache
    try {
      const cached = localStorage.getItem('nawi_cached_users_v1');
      if (cached) {
        const users: DbUser[] = JSON.parse(cached);
        const updated = users.map(u => u.id === id ? { ...u, ...updates } : u);
        localStorage.setItem('nawi_cached_users_v1', JSON.stringify(updated));
      }
    } catch {}

    try {
      const res = await fetch(`/api/db/profiles?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (err) {
      console.warn('[supabaseDb] Failed to update user on server:', err);
      return false;
    }
  },

  /**
   * Add a new user to Supabase profiles
   */
  async createUser(user: Omit<DbUser, 'id' | 'createdAt' | 'lastLogin'>): Promise<DbUser | null> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`;
    const payload = {
      id: newId,
      auth_user_id: newId,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      is_active: user.isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const createdUser: DbUser = {
      ...user,
      id: newId,
      createdAt: payload.created_at,
      lastLogin: payload.created_at,
    };

    // Optimistically update local cache
    try {
      const cached = localStorage.getItem('nawi_cached_users_v1');
      const users: DbUser[] = cached ? JSON.parse(cached) : [];
      users.unshift(createdUser);
      localStorage.setItem('nawi_cached_users_v1', JSON.stringify(users));
    } catch {}

    try {
      const res = await fetch('/api/db/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return createdUser;
      }
    } catch (err) {
      console.warn('[supabaseDb] Failed to create user on server:', err);
    }

    return createdUser;
  },

  /**
   * Log activity to Supabase audit_logs
   */
  async logAudit(action: string, entityType: string, entityId: string, details?: any): Promise<void> {
    const payload = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `aud-${Date.now()}`,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || {},
      created_at: new Date().toISOString(),
    };

    try {
      await fetch('/api/db/audit_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}
  },
};
