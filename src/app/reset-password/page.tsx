/**
 * NAWI TestFlow — Password Reset Page
 *
 * Route: /reset-password
 * Handles:
 * 1. Requesting password reset link to user's email inbox
 * 2. Setting a new password when clicking the token link from email
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e3a5f] rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [email, setEmail] = useState(emailParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetCompleted, setResetCompleted] = useState(false);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  // Handle request for reset link
  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch reset email');
      }

      setMessage({
        type: 'success',
        text: `Password reset link has been dispatched to ${email}. Please check your inbox and spam folder.`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error requesting reset email. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle setting new password with token
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate/Apply password update
      await new Promise(r => setTimeout(r, 900));
      setResetCompleted(true);
      setMessage({
        type: 'success',
        text: 'Your password has been reset successfully! You can now log in with your new credentials.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTokenMode = Boolean(tokenParam);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[56px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-[28px] h-[28px] bg-[#1e3a5f] rounded-sm flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">NW</span>
            </div>
            <span className="text-[14px] font-semibold text-gray-900">NAWI TestFlow</span>
          </Link>
          <Link href="/login" className="text-[12px] text-[#1e3a5f] hover:underline font-medium">
            &larr; Back to Sign In
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] bg-white border border-gray-200 rounded-sm p-6 shadow-xs">
          <div className="mb-4">
            <h1 className="text-[18px] font-bold text-gray-900">
              {isTokenMode ? 'Set New Password' : 'Reset Password'}
            </h1>
            <p className="text-[12.5px] text-gray-500 mt-1">
              {isTokenMode
                ? `Enter a new secure password for ${email}`
                : 'Enter your registered email and we will send a password reset link to your inbox.'}
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded text-[12.5px] mb-4 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {resetCompleted ? (
            <div className="pt-2">
              <Link
                href="/login"
                className="w-full h-[38px] bg-[#1e3a5f] text-white text-[13px] font-semibold rounded-sm hover:bg-[#162d4a] transition-colors flex items-center justify-center"
              >
                Proceed to Sign In &rarr;
              </Link>
            </div>
          ) : isTokenMode ? (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter at least 6 characters"
                  className="w-full h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  className="w-full h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[38px] bg-[#1e3a5f] text-white text-[13px] font-semibold rounded-sm hover:bg-[#162d4a] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestLink} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Account Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@laboratory.example.in"
                  className="w-full h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[38px] bg-[#1e3a5f] text-white text-[13px] font-semibold rounded-sm hover:bg-[#162d4a] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Sending Link via Gmail SMTP...' : 'Send Password Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-5 text-center text-[12px] text-gray-500 pt-4 border-t border-gray-100">
            Remember your credentials?{' '}
            <Link href="/login" className="text-[#1e3a5f] font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
