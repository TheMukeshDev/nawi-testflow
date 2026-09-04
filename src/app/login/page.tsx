/**
 * NAWI TestFlow — Login Page
 *
 * Professional login page with demo credentials display.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ROLE_DASHBOARD_PATHS } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      if (loggedIn) {
        const path = ROLE_DASHBOARD_PATHS[loggedIn.role];
        router.replace(path || '/viewer');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      if (msg.includes('Invalid login credentials')) {
        setError('Invalid email or password.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[56px] flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-[28px] h-[28px] bg-[#1e3a5f] rounded-sm flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">NW</span>
            </div>
            <span className="text-[14px] font-semibold text-gray-900">NAWI TestFlow</span>
          </Link>
          <div className="ml-auto">
            <Link href="/" className="text-[12px] text-gray-500 hover:text-gray-700">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[30px] h-[30px] bg-[#1e3a5f] rounded-sm flex items-center justify-center">
                <span className="text-white text-[11px] font-bold">NW</span>
              </div>
              <div>
                <h1 className="text-[18px] font-semibold text-gray-900 leading-tight">Sign In</h1>
                <p className="text-[12px] text-gray-500">NAWI TestFlow — OIML R-76</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm text-[13px] text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full h-[36px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
                  placeholder="you@nawi-demo.local"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full h-[36px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-[#1e3a5f] focus:ring-blue-200" />
                  <span className="text-[12px] text-gray-600">Remember me</span>
                </label>
                <Link href="/reset-password" className="text-[12px] text-[#1e3a5f] hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[36px] bg-[#1e3a5f] text-white text-[13px] font-medium rounded-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Demo credentials */}
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-[#1e3a5f]">Demo Accounts</p>
              <span className="px-1.5 py-0.5 text-[9px] font-bold text-blue-700 bg-blue-100 border border-blue-200 rounded">ONE-CLICK FILL</span>
            </div>
            <div className="space-y-1.5">
              {[
                { role: 'Admin', email: 'admin@nawi-demo.local', pw: 'Admin@123' },
                { role: 'Tester', email: 'tester@nawi-demo.local', pw: 'Tester@123' },
                { role: 'Reviewer', email: 'reviewer@nawi-demo.local', pw: 'Reviewer@123' },
                { role: 'Viewer', email: 'viewer@nawi-demo.local', pw: 'Viewer@123' },
              ].map(d => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pw); setError(''); }}
                  className="group w-full flex items-center justify-between px-2.5 py-1.5 bg-white border border-blue-100 rounded-sm text-left hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-[20px] h-[20px] bg-blue-50 border border-blue-100 text-[10px] font-bold text-[#1e3a5f] rounded group-hover:bg-blue-100 transition-colors">
                      {d.role[0]}
                    </span>
                    <span className="text-[11px] font-medium text-gray-700">{d.role}</span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{d.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Click a role to auto-fill credentials. DEMO ONLY — passwords are prefilled.
            </p>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-4">
            NAWI TestFlow — OIML R-76 Test Report Management System
          </p>
          <p className="text-center text-[11px] text-gray-400 mt-1">
            <a
              href="https://github.com/TheMukeshDev/nawi-testflow"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1e3a5f]"
            >
              github.com/TheMukeshDev/nawi-testflow
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
