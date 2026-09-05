/**
 * NAWI TestFlow — Supabase Unified Database Client
 *
 * Provides persistent database access through secure Next.js API routes
 * with local cache fallback, ensuring data remains intact on page refreshes.
 */

import { isSupabaseConfigured } from './supabase/client';

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

export interface DbInstrument {
  id: string;
  serialNumber: string;
  modelName: string;
  modelNumber: string;
  manufacturerName: string;
  instrumentClass: string | null;
  maxCapacity: number;
  maxCapacityUnit: string;
  scaleInterval: number;
  scaleIntervalUnit: string;
  laboratoryCode: string;
  laboratoryName: string;
  condition: string;
  lastCalibration: string | null;
  dateReceived: string | null;
}

export interface DbLaboratory {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  country: string;
  accreditationBody: string;
  accreditationValidUntil: string;
  contactPerson: string;
  phone: string;
  email: string;
  isActive: boolean;
}

function titleCase(value?: string | null): string {
  if (!value) return '';
  return value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function caseCode(caseType?: string | null): string {
  switch (caseType) {
    case 'repeatability': return 'RPT';
    case 'eccentricity': return 'ECC';
    case 'linearity': return 'LIN';
    case 'discrimination': return 'DIS';
    case 'stability': return 'STB';
    case 'temperature-effect': return 'TMP';
    default: return (caseType || '').toUpperCase().slice(0, 3);
  }
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function formatNum(value?: number | null): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeCompliance(result?: string | null): string {
  const v = (result || 'pending').toLowerCase();
  if (['compliant', 'non-compliant', 'conditional', 'pending', 'not-applicable'].includes(v)) return v;
  return 'pending';
}

function mapReportStatus(status?: string | null): string {
  const s = (status || 'draft').toLowerCase();
  if (['approved', 'completed'].includes(s)) return 'completed';
  if (s === 'revision-requested' || s === 'rejected') return 'revision-requested';
  if (s === 'pending-review') return 'pending-review';
  return 'in-testing';
}

export const supabaseDb = {  /**
   * Fetch all instruments from Supabase (join with models + labs)
   */
  async getInstruments(): Promise<DbInstrument[]> {
    try {
      const res = await fetch('/api/db/instruments?select=*,instrument_models(*,manufacturers(*)),laboratories(*)&order=created_at.desc', { cache: 'no-store' });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped: DbInstrument[] = rows.map((r: any) => ({
            id: r.id,
            serialNumber: r.serial_number,
            modelName: r.instrument_models?.model_name || r.serial_number,
            modelNumber: r.instrument_models?.model_number || '',
            manufacturerName: r.instrument_models?.manufacturers?.name || '',
            instrumentClass: r.instrument_models?.instrument_class || null,
            maxCapacity: r.instrument_models?.capacity || 0,
            maxCapacityUnit: r.instrument_models?.capacity_unit || 'g',
            scaleInterval: r.instrument_models?.division || 0,
            scaleIntervalUnit: r.instrument_models?.division_unit || 'g',
            laboratoryCode: r.laboratories?.code || '',
            laboratoryName: r.laboratories?.name || '',
            condition: r.condition || 'good',
            lastCalibration: r.last_calibration || null,
            dateReceived: r.date_received || null,
          }));
          try { localStorage.setItem('nawi_cached_instruments_v1', JSON.stringify(mapped)); } catch {}
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[supabaseDb] Failed to fetch instruments from server:', err);
    }
    const cached = typeof window !== 'undefined' ? localStorage.getItem('nawi_cached_instruments_v1') : null;
    if (cached) { try { return JSON.parse(cached); } catch {} }
    return [];
  },

  /**
   * Fetch all laboratories from Supabase
   */
  async getLaboratories(): Promise<DbLaboratory[]> {
    try {
      const res = await fetch('/api/db/laboratories?select=*&order=name.asc', { cache: 'no-store' });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped: DbLaboratory[] = rows.map((r: any) => ({
            id: r.id,
            code: r.code || '',
            name: r.name || '',
            city: r.city || '',
            state: r.state || '',
            country: r.country || 'India',
            accreditationBody: r.accreditation_body || 'NABL',
            accreditationValidUntil: r.accreditation_valid_until || '',
            contactPerson: r.contact_person || '',
            phone: r.phone || '',
            email: r.email || '',
            isActive: r.is_active !== false,
          }));
          try { localStorage.setItem('nawi_cached_labs_v1', JSON.stringify(mapped)); } catch {}
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[supabaseDb] Failed to fetch laboratories from server:', err);
    }
    const cached = typeof window !== 'undefined' ? localStorage.getItem('nawi_cached_labs_v1') : null;
    if (cached) { try { return JSON.parse(cached); } catch {} }
    return [];
  },

  /**
   * Fetch all test equipment from Supabase
   */
  async getEquipment(): Promise<any[]> {
    try {
      const res = await fetch('/api/db/test_equipment?select=*&order=created_at.desc', { cache: 'no-store' });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped = rows.map((r: any) => ({
            id: r.id,
            name: r.equipment_name || '',
            type: r.equipment_type || '',
            manufacturer: '',
            model: '',
            serialNumber: r.serial_number || '',
            certificateNumber: r.certificate_number || '',
            laboratoryCode: '',
            laboratoryName: '',
            calibrationDate: r.calibration_date || '',
            calibrationValidUntil: r.calibration_valid_until || '',
            condition: 'good',
            createdAt: r.created_at || '',
          }));
          try { localStorage.setItem('nawi_cached_equipment_v1', JSON.stringify(mapped)); } catch {}
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[supabaseDb] Failed to fetch equipment from server:', err);
    }
    const cached = typeof window !== 'undefined' ? localStorage.getItem('nawi_cached_equipment_v1') : null;
    if (cached) { try { return JSON.parse(cached); } catch {} }
    return [];
  },

  /**
   * Fetch all users from Supabase profiles.
   *
   * The server response is merged (deduplicated by id) with the locally cached
   * user list instead of replacing it. This guarantees a partial or incomplete
   * server response — e.g. a `profiles` table that only holds one newly created
   * user — can never wipe out users we already know about.
   */
  async getUsers(): Promise<DbUser[]> {
    const cacheKey = 'nawi_cached_users_v1';
    const readCache = (): DbUser[] => {
      if (typeof window === 'undefined') return [];
      try {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    };
    const mergeById = (...lists: DbUser[][]): DbUser[] =>
      [...new Map(lists.flat().map(u => [u.id, u])).values()];

    try {
      const res = await fetch('/api/db/profiles?select=*,laboratories!fk_profiles_laboratory(code,name)&order=created_at.desc');
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          const mapped: DbUser[] = rows.map(r => ({
            id: r.id,
            email: r.email,
            fullName: r.full_name || r.email.split('@')[0],
            role: r.role || 'viewer',
            laboratory: r.laboratories?.code || r.laboratory_id || '',
            isActive: r.is_active !== false,
            lastLogin: r.last_login || new Date().toISOString(),
            createdAt: r.created_at || new Date().toISOString(),
          }));
          // Merge with any locally known users (existing cache) instead of
          // replacing them with the server subset.
          const merged = mergeById(mapped, readCache());
          try { localStorage.setItem(cacheKey, JSON.stringify(merged)); } catch {}
          return merged;
        }
      }
    } catch (err) {
      console.warn('[supabaseDb] Failed to fetch users from server, checking local cache:', err);
    }

    // Fallback to local cache or defaults
    const cached = readCache();
    if (cached.length > 0) return cached;

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
    if (updates.laboratory !== undefined) {
      // Resolve lab code -> UUID so the FK write succeeds
      payload.laboratory_id = await this.resolveLaboratoryId(updates.laboratory);
    }
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
   * Add a new user — creates a real Supabase Auth account + profile + login.
   *
   * In a configured deployment we never fall back to a profile-only row:
   * without a Supabase Auth account the returned password can never log in,
   * which produces "user shows in the list but login says invalid credentials".
   * The legacy profile-only path is kept only for demo/unconfigured builds.
   */
  async createUser(user: Omit<DbUser, 'id' | 'createdAt' | 'lastLogin'>): Promise<DbUser & { password?: string } | null> {
    // 1. Create auth user + profile + get login credentials via server-side API
    let serverError: Error | null = null;
    try {
      const res = await fetch('/api/auth/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          laboratory: user.laboratory,
          sendEmail: false,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const newId = created.id;
        const createdUser: DbUser & { password?: string } = {
          ...user,
          id: newId,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          password: created.password,
        };
        // Optimistically update local cache
        try {
          const cached = localStorage.getItem('nawi_cached_users_v1');
          const users: DbUser[] = cached ? JSON.parse(cached) : [];
          users.unshift(createdUser);
          localStorage.setItem('nawi_cached_users_v1', JSON.stringify([...new Map(users.map(u => [u.id, u])).values()]));
        } catch {}
        return createdUser;
      } else {
        const err = await res.json().catch(() => null);
        serverError = new Error(
          (err?.error as string) || `Failed to create user (HTTP ${res.status})`,
        );
        console.warn('[supabaseDb] manage-user create failed:', serverError.message);
      }
    } catch (err) {
      serverError = err instanceof Error ? err : new Error('Failed to create user (network error)');
      console.warn('[supabaseDb] manage-user create network error:', err);
    }

    // When a real Supabase deployment is configured, a profile-only user can
    // never log in. Surface the real error instead of silently succeeding.
    if (serverError && isSupabaseConfigured) {
      throw serverError;
    }

    // 2. Demo/unconfigured fallback — create just the profile row
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
      localStorage.setItem('nawi_cached_users_v1', JSON.stringify([...new Map(users.map(u => [u.id, u])).values()]));
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
   * Resolve a laboratory id or code to the laboratories.id UUID.
   */
  async resolveLaboratoryId(laboratory?: string): Promise<string | null> {
    if (!laboratory) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(laboratory)) {
      return laboratory;
    }
    try {
      const res = await fetch(`/api/db/laboratories?select=id,code`, { cache: 'no-store' });
      if (res.ok) {
        const rows = await res.json();
        const match = (rows || []).find((l: any) => l.code === laboratory);
        if (match?.id) return match.id;
      }
    } catch (err) {
      console.warn('[supabaseDb] Failed to resolve laboratory id:', err);
    }
    return null;
  },

  /**
   * Fetch all test reports from Supabase joined with instrument/model/lab,
   * and hydrate each report's conditions, test cases and observations.
   * Returns rows shaped like the workflow StoredTest so existing UI can render them.
   */
  async getTestReports(): Promise<any[]> {
    try {
      const sel = [
        '*',
        'instruments(serial_number,condition,date_received,last_calibration,next_calibration,instrument_models(model_name,model_number,instrument_class,capacity,capacity_unit,division,division_unit,manufacturers(name)))',
        'laboratories(code,name)',
      ].join(',');
      const res = await fetch(`/api/db/test_reports?select=${encodeURIComponent(sel)}&order=created_at.desc`, { cache: 'no-store' });
      if (!res.ok) return [];
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return [];

      // Resolve assigned technician/reviewer names via profiles lookup
      // (test_reports has multiple FKs to profiles, so we avoid join hint ambiguity)
      const userMap = new Map<string, { full_name?: string; role?: string }>();
      try {
        const profRes = await fetch('/api/db/profiles?select=id,full_name,role', { cache: 'no-store' });
        if (profRes.ok) {
          const profs = await profRes.json();
          (profs || []).forEach((p: any) => p && p.id && userMap.set(p.id, p));
        }
      } catch {}

      const reports: any[] = [];
      for (const row of rows) {
        const inst = row.instruments || {};
        const model = inst.instrument_models || {};
        const lab = row.laboratories || {};
        const tech = userMap.get(row.assigned_technician_id)?.full_name || '';
        const reviewer = userMap.get(row.assigned_reviewer_id)?.full_name || '';

        // Gather test cases + observations
        const cases: any[] = [];
        const casesRes = await fetch(`/api/db/test_cases?select=*,test_observations(*)`, { cache: 'no-store' });
        if (casesRes.ok) {
          const caseRows = await casesRes.json();
          (caseRows || []).filter((c: any) => c.report_id === row.id).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).forEach((c: any) => cases.push(c));
        }

        const observations = cases.map((c: any) => {
          const obs = (c.test_observations || []).sort((a: any, b: any) => (a.observation_number || 0) - (b.observation_number || 0));
          const readings = obs.map((o: any) => String(o.measured_value ?? o.measured_value ?? ''));
          const numeric = obs.map((o: any) => Number(o.measured_value)).filter((n: number) => !isNaN(n));
          const mean = numeric.length ? numeric.reduce((a: number, b: number) => a + b, 0) / numeric.length : 0;
          const verdict = c.case_type === 'repeatability'
            ? (row.compliance_result === 'non-compliant' ? 'FAIL' : 'PASS')
            : 'PASS';
          return {
            testName: titleCase(c.case_type),
            testCode: caseCode(c.case_type),
            readings,
            mean: numeric.length ? mean.toFixed(4) : '',
            stddev: numeric.length > 1 ? stdDev(numeric).toFixed(4) : '',
            verdict,
            unit: c.unit || model.unit || '',
          };
        });

        reports.push({
          id: row.id,
          testNumber: row.report_number,
          instrumentSerial: inst.serial_number || '',
          instrumentModel: model.model_name || 'Unknown Instrument',
          instrumentManufacturer: model.manufacturers?.name || '',
          instrumentClass: model.instrument_class || 'III',
          maxCapacity: String(model.capacity ?? ''),
          maxCapacityUnit: model.capacity_unit || 'g',
          scaleInterval: formatNum(model.division),
          scaleIntervalUnit: model.division_unit || 'g',
          laboratory: lab.code || '',
          verificationType: titleCase(row.verification_type || 'subsequent'),
          status: mapReportStatus(row.status),
          complianceResult: normalizeCompliance(row.compliance_result),
          complianceNotes: row.compliance_notes || undefined,
          technician: tech,
          reviewer,
          testDate: (row.submitted_at || row.created_at || '').slice(0, 10),
          observations,
          createdAt: row.created_at || '',
          lastUpdated: row.updated_at || row.submitted_at || row.created_at || '',
        });
      }
      return reports;
    } catch (err) {
      console.warn('[supabaseDb] Failed to fetch test reports:', err);
      return [];
    }
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
