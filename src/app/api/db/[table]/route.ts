import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsjxiwmofjndlccedjtc.supabase.co';
// Server-side access MUST use a service-role key: with the anon key and no
// authenticated user JWT, Supabase RLS returns zero rows for tables that
// require auth.uid() (e.g. instruments, profiles), making every page look
// empty. Accept all common env names so any deployment picks it up.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// Allowed tables for direct database access
const ALLOWED_TABLES = new Set([
  'profiles',
  'test_reports',
  'test_observations',
  'test_cases',
  'test_conditions',
  'laboratories',
  'instruments',
  'instrument_models',
  'manufacturers',
  'test_equipment',
  'audit_logs',
  'report_versions',
]);

function keyNotConfigured(): NextResponse {
  return NextResponse.json(
    {
      error: 'Database access key is not configured. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) as a server-side environment variable.',
    },
    { status: 500 }
  );
}

function isConfigured(): boolean {
  return Boolean(SUPABASE_KEY);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 400 });
  }
  if (!isConfigured()) {
    return keyNotConfigured();
  }

  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}${queryString ? `?${queryString}` : ''}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: HEADERS,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 400 });
  }
  if (!isConfigured()) {
    return keyNotConfigured();
  }

  try {
    const body = await request.json();
    const url = `${SUPABASE_URL}/rest/v1/${table}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Query parameter "id" is required for PATCH' }, { status: 400 });
  }
  if (!isConfigured()) {
    return keyNotConfigured();
  }

  try {
    const body = await request.json();
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Query parameter "id" is required for DELETE' }, { status: 400 });
  }
  if (!isConfigured()) {
    return keyNotConfigured();
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: HEADERS,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
