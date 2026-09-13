'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, AlertCircle, Info, Clock, Check, CheckCheck } from 'lucide-react';
import { NotificationItem } from '@/types';
import { useToast } from '@/components/ToastProvider';

export default function CreatorNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadNotifications = () => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      toast.success('Notification marked as read');
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-black">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          {unreadCount > 0 && (
            <div className="mb-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-black text-white">
                {unreadCount} unread
              </span>
            </div>
          )}
          <h1 className="font-serif text-3xl font-bold text-black">
            Notifications & Feedback
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-1">
            Real-time alerts regarding video reviews, revision requests, and payout confirmations.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-bold transition-colors border border-neutral-300 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-black" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-black">
          <div className="inline-block w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm font-medium">Loading alerts...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-neutral-200 text-center text-neutral-500 font-bold text-xs space-y-2">
          <Bell className="w-8 h-8 mx-auto text-neutral-300" />
          <p>No notifications at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                !n.is_read
                  ? 'bg-white border-black shadow-sm'
                  : 'bg-white border-neutral-200 opacity-80'
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />}
                  <div className="font-bold text-sm text-black">{n.title}</div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed font-medium">{n.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(n.id)}
                    className="p-1.5 rounded text-neutral-400 hover:text-black border border-neutral-200"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {n.link && (
                  n.link === '/creator/messages' ? (
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
                      className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
                    >
                      Open Chat
                    </button>
                  ) : (
                    <Link
                      href={n.link}
                      className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800"
                    >
                      View
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
