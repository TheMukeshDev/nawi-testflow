/**
 * NAWI Sahayak — Notification Dropdown Component
 *
 * Real-time notification center in TopBar for workflow state transitions:
 * - Submissions awaiting Reviewer approval
 * - Reviewer approvals notifying Testers
 * - Revisions requested
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { workflowStore, type WorkflowNotification } from '@/lib/workflow-store';

interface NotificationDropdownProps {
  onSelectTest?: (testId: string, mode: 'view' | 'review') => void;
}

export function NotificationDropdown({ onSelectTest }: NotificationDropdownProps) {
  const { userRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    const list = workflowStore.getNotifications(userRole);
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    const unsubscribe = workflowStore.subscribe(() => {
      loadNotifications();
    });
    return unsubscribe;
  }, [userRole]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    workflowStore.markAllAsRead(userRole);
    loadNotifications();
  };

  const handleNotificationClick = (notif: WorkflowNotification) => {
    workflowStore.markNotificationAsRead(notif.id);
    loadNotifications();
    setOpen(false);

    if (notif.testId && onSelectTest) {
      const mode = notif.type === 'submission' ? 'review' : 'view';
      onSelectTest(notif.testId, mode);
    } else if (notif.type === 'submission') {
      window.location.href = '/reviewer';
    } else {
      window.location.href = '/reports';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
        title="Workflow Notifications"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-1.5 w-[330px] sm:w-[380px] bg-white border border-gray-200 rounded-md shadow-xl z-50 overflow-hidden">
          {/* Dropdown Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-gray-900">Workflow Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-[#1e3a5f] hover:underline font-medium cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-gray-400 text-[12px]">
                No notifications for your role
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 text-[12px] hover:bg-gray-50 cursor-pointer transition-colors flex gap-2.5 items-start ${
                    !n.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {/* Status Indicator Icon */}
                  <div className="mt-0.5 shrink-0">
                    {n.type === 'submission' && (
                      <div className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                        ⏳
                      </div>
                    )}
                    {n.type === 'approval' && (
                      <div className="w-6 h-6 rounded bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                    )}
                    {n.type === 'rejection' && (
                      <div className="w-6 h-6 rounded bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-bold">
                        ✕
                      </div>
                    )}
                    {n.type === 'alert' && (
                      <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                        ℹ
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`font-semibold truncate ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">
                      {n.message}
                    </p>
                    {n.testNumber && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded text-gray-700">
                          {n.testNumber}
                        </span>
                        <span className="text-[10px] text-[#1e3a5f] font-semibold hover:underline">
                          {n.type === 'submission' ? 'Review Now →' : 'View Results →'}
                        </span>
                      </div>
                    )}
                  </div>

                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="px-3.5 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">
              Role: <strong className="text-gray-800 uppercase">{userRole || 'All'}</strong>
            </span>
            <Link
              href={userRole === 'reviewer' ? '/reviewer' : '/tests'}
              onClick={() => setOpen(false)}
              className="text-[#1e3a5f] hover:underline font-medium"
            >
              {userRole === 'reviewer' ? 'Go to Review Queue →' : 'Go to Tests →'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
