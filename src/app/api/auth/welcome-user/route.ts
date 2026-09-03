import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeUserEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { email, fullName, role, laboratory, password } = await request.json();

    if (!email || !fullName || !password) {
      return NextResponse.json({ error: 'Email, full name, and password are required' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'nawi-testflow.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const loginUrl = `${protocol}://${host}/login`;

    await sendWelcomeUserEmail(
      email,
      fullName,
      password,
      role || 'viewer',
      laboratory || 'CMTL-PY-01',
      loginUrl
    );

    return NextResponse.json({
      success: true,
      message: `Credentials successfully dispatched to ${email}`,
    });
  } catch (err: any) {
    console.error('[WelcomeUserAPI] Failed to send welcome email:', err);
    return NextResponse.json({
      error: err.message || 'Failed to dispatch welcome email via SMTP',
    }, { status: 500 });
  }
}
