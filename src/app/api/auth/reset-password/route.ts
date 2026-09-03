import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'nawi-testflow.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    // Generate secure random reset token
    const token = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const resetLink = `${protocol}://${host}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;

    await sendPasswordResetEmail(email, resetLink, email.split('@')[0]);

    return NextResponse.json({
      success: true,
      message: `Password reset link sent to ${email}`,
    });
  } catch (err: any) {
    console.error('[ResetPasswordAPI] Failed to send email:', err);
    return NextResponse.json({
      error: err.message || 'Failed to dispatch password reset email via SMTP',
    }, { status: 500 });
  }
}
