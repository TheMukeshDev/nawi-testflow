/**
 * NAWI Sahayak — Profile Setup Page
 *
 * For first-time users who need to complete their profile.
 * Collects role/organization information before allowing access.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, getRoleRedirectPath } = useAuth();
  const [fullName, setFullName] = useState('');
  const [laboratory, setLaboratory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, laboratory_id: laboratory }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Redirect to role-based dashboard
      router.push(getRoleRedirectPath());
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-[480px]">
        <div className="bg-white border border-gray-200 rounded p-6">
          <h1 className="text-[18px] font-semibold text-gray-900 mb-1">
            Complete Your Profile
          </h1>
          <p className="text-[13px] text-gray-600 mb-6">
            Please complete your profile information to continue.
          </p>

          {error && (
            <div
              className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded text-[13px] text-danger-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="fullName"
                className="block text-[13px] font-medium text-gray-700 mb-1"
              >
                Full Name <span className="text-danger-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200"
                placeholder="Enter your full name"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="laboratory"
                className="block text-[13px] font-medium text-gray-700 mb-1"
              >
                Laboratory <span className="text-danger-500">*</span>
              </label>
              <select
                id="laboratory"
                value={laboratory}
                onChange={(e) => setLaboratory(e.target.value)}
                required
                className="w-full h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200"
              >
                <option value="">Select laboratory...</option>
                <option value="lab-1">Precision Metrics Testing Laboratory</option>
                <option value="lab-2">National Instrumentation Test Centre</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !fullName || !laboratory}
              className="w-full h-[36px] bg-primary-600 text-white text-[13px] font-medium rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
