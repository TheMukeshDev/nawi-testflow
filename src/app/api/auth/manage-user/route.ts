import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeUserEmail } from '@/lib/email-service';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const AUTH_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

export interface ManageUserPayload {
  email: string;
  fullName: string;
  role: 'admin' | 'tester' | 'reviewer' | 'viewer';
  laboratory?: string;
  password?: string;
  sendEmail?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { email, fullName, role = 'viewer', laboratory, password, sendEmail = true } = await request.json() as ManageUserPayload;

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const tempPassword = password || `Nawi#${Math.floor(1000 + Math.random() * 9000)}@Lab`;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Supabase not configured on server' }, { status: 500 });
    }

    // 1. Create the Auth user in Supabase Auth (admin API)
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      }),
    });

    let authUserId: string | null = null;
    if (authRes.ok) {
      const authUser = await authRes.json();
      authUserId = authUser?.id || null;
    } else {
      // The auth create failed. Determine WHY: if the email already has an
      // auth account, we must NOT reuse it — the generated password would not
      // match, and login would return "Invalid email or password".
      const errText = await authRes.text();
      const existing = await lookupUserByEmail(email);
      if (existing?.id) {
        return NextResponse.json(
          {
            error: `An account with email ${email} already exists. Use a different email, or reset that account's password instead of creating a new one.`,
          },
          { status: 409 }
        );
      }
      console.error('[ManageUser] Auth create failed:', errText);
      return NextResponse.json(
        {
          error: `Failed to create the login account for ${email}. Verify that a Supabase service-role key is configured server-side (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY) and try again.`,
        },
        { status: 500 }
      );
    }

    // 2. Resolve laboratory (UUID) — accept either a lab id or a code
    const laboratoryId = await resolveLaboratoryId(laboratory);

    // 3. Upsert the profile record (links role + lab to the auth user)
    const profile: any = {
      id: authUserId,
      auth_user_id: authUserId,
      email,
      full_name: fullName,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (laboratoryId) profile.laboratory_id = laboratoryId;

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?auth_user_id=eq.${authUserId}`, {
      method: 'POST',
      headers: { ...AUTH_HEADERS, Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(profile),
    });

    if (!profileRes.ok) {
      console.error('[ManageUser] Profile upsert failed:', await profileRes.text());
    }

    // 4. Send welcome email with credentials
    if (sendEmail) {
      try {
        const host = request.headers.get('host') || 'nawi-testflow.vercel.app';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const loginUrl = `${protocol}://${host}/login`;
        await sendWelcomeUserEmail(email, fullName, tempPassword, role, laboratory || '', loginUrl);
      } catch (emailErr) {
        console.warn('[ManageUser] Email send failed:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: authUserId,
      email,
      password: tempPassword,
      message: `User ${email} created. Login credentials: ${tempPassword}`,
    });
  } catch (err: any) {
    console.error('[ManageUser] Failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to create user' }, { status: 500 });
  }
}

async function lookupUserByEmail(email: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: AUTH_HEADERS,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.users?.[0] || null;
  } catch {
    return null;
  }
}

/** Resolve a laboratory id or code to the laboratories.id UUID (returns null if none). */
async function resolveLaboratoryId(laboratory?: string): Promise<string | null> {
  if (!laboratory) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(laboratory);
  const filter = isUuid ? `id=eq.${laboratory}` : `code=eq.${encodeURIComponent(laboratory)}`;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/laboratories?select=id&${filter}&limit=1`, {
      method: 'GET',
      headers: AUTH_HEADERS,
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0]?.id || null;
  } catch {
    return null;
  }
}