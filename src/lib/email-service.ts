/**
 * NAWI TestFlow — Gmail SMTP Email Service
 *
 * Dispatches transactional emails via Gmail SMTP:
 * 1. Password Reset Link with secure one-time tokens
 * 2. New User Welcome Credentials (Login ID & Temporary Password)
 */

import nodemailer from 'nodemailer';

const SMTP_EMAIL = process.env.SMTP_EMAIL || 'itzcodermukesh@gmail.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'hkvxqmsupcmvinbz';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'NAWI TestFlow National Portal';

export function getEmailTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_EMAIL,
      pass: SMTP_PASSWORD,
    },
  });
}

/**
 * Send Password Reset Email with Link
 */
export async function sendPasswordResetEmail(toEmail: string, resetLink: string, userName = 'Officer') {
  const transporter = getEmailTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #1e3a5f; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 4px 0 0 0; font-size: 11px; color: #93c5fd; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 28px 24px; line-height: 1.6; font-size: 14px; }
        .btn { display: inline-block; background-color: #1e3a5f; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 20px 0; }
        .btn:hover { background-color: #162d4a; }
        .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .token-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; color: #334155; margin-top: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>NAWI TestFlow</h1>
          <p>National Legal Metrology Portal &middot; OIML R-76</p>
        </div>
        <div class="body">
          <p>Dear <strong>${userName}</strong>,</p>
          <p>We received a request to reset the password for your NAWI TestFlow laboratory account associated with <code>${toEmail}</code>.</p>
          <p>Click the secure button below to choose a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="btn" target="_blank">Reset My Password &rarr;</a>
          </div>

          <p style="font-size: 12px; color: #64748b;">
            This password reset link is valid for <strong>60 minutes</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.
          </p>

          <p style="font-size: 11px; color: #94a3b8; margin-top: 20px;">Or paste this URL directly into your browser:</p>
          <div class="token-box">${resetLink}</div>
        </div>
        <div class="footer">
          NAWI TestFlow &bull; Smart India Hackathon 2026 &bull; Department of Consumer Affairs<br>
          This is an automated system email. Please do not reply.
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_EMAIL}>`,
    to: toEmail,
    subject: 'Password Reset Request — NAWI TestFlow',
    html,
  });
}

/**
 * Send Welcome Email to New User with Temporary Password
 */
export async function sendWelcomeUserEmail(
  toEmail: string,
  userName: string,
  tempPassword: string,
  role: string,
  laboratory: string,
  loginUrl = 'https://nawi-testflow.vercel.app/login'
) {
  const transporter = getEmailTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #1e3a5f; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
        .header p { margin: 4px 0 0 0; font-size: 11px; color: #93c5fd; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 28px 24px; line-height: 1.6; font-size: 14px; }
        .cred-card { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 18px 0; }
        .cred-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
        .cred-label { color: #64748b; }
        .cred-val { font-weight: 600; color: #0f172a; }
        .pwd-badge { font-family: monospace; font-size: 15px; font-weight: bold; background: #ecfdf5; color: #065f46; padding: 4px 10px; border-radius: 4px; border: 1px solid #a7f3d0; display: inline-block; }
        .btn { display: inline-block; background-color: #16a34a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 16px 0; }
        .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to NAWI TestFlow</h1>
          <p>OIML R-76 Laboratory Metrology System</p>
        </div>
        <div class="body">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>An administrator has created a new account for you on the <strong>NAWI TestFlow</strong> National Legal Metrology portal. Here are your access credentials:</p>
          
          <div class="cred-card">
            <div class="cred-row">
              <span class="cred-label">Login Email:</span>
              <span class="cred-val">${toEmail}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Assigned Role:</span>
              <span class="cred-val" style="text-transform: capitalize;">${role}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Designated Laboratory:</span>
              <span class="cred-val">${laboratory}</span>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <div class="cred-label" style="margin-bottom: 4px;">Temporary Password:</div>
              <div class="pwd-badge">${tempPassword}</div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${loginUrl}" class="btn" target="_blank">Log In to Your Account &rarr;</a>
          </div>

          <p style="font-size: 12px; color: #64748b;">
            ⚠️ <strong>Security Note:</strong> For your security, please change this temporary password immediately after logging into your dashboard.
          </p>
        </div>
        <div class="footer">
          NAWI TestFlow &bull; Ministry of Consumer Affairs, Food &amp; Public Distribution<br>
          Official Laboratory Portal &bull; ISO/IEC 17025 Compliant
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_EMAIL}>`,
    to: toEmail,
    subject: 'Your Account Credentials — NAWI TestFlow Portal',
    html,
  });
}
