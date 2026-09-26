'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Send,
  Users,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  Radio,
  FileText,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface CreatorItem {
  id: string;
  email: string;
  display_name: string;
  sample_status?: string;
}

interface NotificationLog {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  recipient_name?: string;
  recipient_email?: string;
}

export default function AdminPushNotificationsPage() {
  const { toast } = useToast();

  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTestPush = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/test-notifications', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Diagnostic test failed.');
      }
      toast.success(
        data.message || 'Diagnostic push alert & email dispatched successfully!',
        'System Operational'
      );
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to run diagnostic test.');
    } finally {
      setTesting(false);
    }
  };

  // Form states
  const [target, setTarget] = useState<'ALL' | 'SINGLE'>('ALL');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');
  const [notifType, setNotifType] = useState<'SYSTEM' | 'GENERAL' | 'REVIEW' | 'PAYOUT'>('SYSTEM');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('/creator');
  const [sendEmail, setSendEmail] = useState(true);

  // Filter for creator dropdown
  const [creatorSearch, setCreatorSearch] = useState('');

  // Fetch creators & history
  const fetchData = async () => {
    setLoading(true);
    try {
      const [creatorsRes, notifsRes] = await Promise.all([
        fetch('/api/admin/creators'),
        fetch('/api/admin/notifications'),
      ]);

      if (creatorsRes.ok) {
        const cData = await creatorsRes.json();
        const list = cData.creators || [];
        setCreators(list);
        if (list.length > 0 && !selectedCreatorId) {
          setSelectedCreatorId(list[0].id);
        }
      }

      if (notifsRes.ok) {
        const nData = await notifsRes.json();
        setRecentNotifications(nData.notifications || []);
      }
    } catch (e) {
      console.error('Failed to load notification admin data:', e);
      toast.error('Failed to load creators list or history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Preset Handlers
  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'audio_quality':
        setTitle('Acoustic Quality Notice: Background Noise & Crispness');
        setMessage(
          'Please ensure all page-turning sessions are filmed in complete silence with no fans, television, or street audio. Crisp page sounds recorded close to the microphone ensure 100% approval rate on your $10 videos.'
        );
        setNotifType('REVIEW');
        setLink('/guidelines');
        break;
      case 'batch_payout':
        setTitle('Payment Batch Processing: Verify Your Payout Details');
        setMessage(
          'Our finance desk is processing milestone payouts. Please double-check that your payment account, Mobile Money, or bank beneficiary details are completely up to date under Settings > Payout Details.'
        );
        setNotifType('PAYOUT');
        setLink('/creator/settings');
        break;
      case 'upload_momentum':
        setTitle('Complete Your 8-Video Milestone ($80 Direct Payout)');
        setMessage(
          'You are close to your $80 payment threshold! Keep filming your 3+ minute faceless page-turning recordings and submit them to your review queue today.'
        );
        setNotifType('GENERAL');
        setLink('/creator/upload');
        break;
      case 'system_announcement':
        setTitle('Platform Announcement: Faster Uploads & Processing Active');
        setMessage(
          'We have upgraded our video processing infrastructure for instant file uploads and faster review turnaround. Thank you for creating with The Pink Room.'
        );
        setNotifType('SYSTEM');
        setLink('/creator');
        break;
    }
    toast.info('Template applied to notification form.');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error('Please enter both a title and a message body.');
      return;
    }

    if (target === 'SINGLE' && !selectedCreatorId) {
      toast.error('Please select a creator to receive the notification.');
      return;
    }

    setSending(true);

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          creatorId: target === 'SINGLE' ? selectedCreatorId : undefined,
          title: title.trim(),
          message: message.trim(),
          type: notifType,
          link: link.trim() || '/creator',
          sendEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch custom notification.');
      }

      toast.success(
        data.message || 'Notification pushed successfully to bell and email!',
        'Push Successful'
      );

      // Trigger cross-tab sync so any active creator session updates immediately
      try {
        const bc = new BroadcastChannel('asmr_notifications_sync');
        bc.postMessage({ type: 'NOTIFICATION_SENT', timestamp: Date.now() });
      } catch {}

      // Reset form
      setTitle('');
      setMessage('');

      // Refresh log
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to dispatch notification.');
    } finally {
      setSending(false);
    }
  };

  const filteredCreators = creators.filter((c) => {
    const q = creatorSearch.toLowerCase();
    return (
      (c.display_name && c.display_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-black">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
            <Link href="/admin" className="hover:text-black transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Hub</span>
            </Link>
            <span>/</span>
            <span>Push Notifications</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-black flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-black" />
            <span>Push Custom Notifications</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-1">
            Broadcast platform announcements, quality reminders, and payout alerts that instantly appear in the creator bell icon and their transactional email inbox.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTestPush}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-pink-300 bg-pink-50 text-xs font-bold text-pink-900 hover:bg-pink-100 transition-colors shadow-sm disabled:opacity-50"
            title="Send test push alert and email to verify system delivery"
          >
            <span>{testing ? 'Testing System...' : 'Test Push & Email'}</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-black hover:bg-neutral-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/creators"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View All Creators ({creators.length})</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Composer Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Presets */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <span>Quick Message Presets</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('system_announcement')}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-black border border-neutral-300 transition-colors"
              >
                📢 Announcement
              </button>
              <button
                type="button"
                onClick={() => applyPreset('audio_quality')}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-black border border-neutral-300 transition-colors"
              >
                🎙️ Audio Guidelines
              </button>
              <button
                type="button"
                onClick={() => applyPreset('batch_payout')}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-black border border-neutral-300 transition-colors"
              >
                💳 Payout Details Notice
              </button>
              <button
                type="button"
                onClick={() => applyPreset('upload_momentum')}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-black border border-neutral-300 transition-colors"
              >
                🚀 $80 Milestone Reminder
              </button>
            </div>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSend} className="bg-white p-6 sm:p-7 rounded-2xl border border-neutral-200 shadow-sm space-y-5">
            {/* Target Audience Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black block">
                Target Audience
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTarget('ALL')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    target === 'ALL'
                      ? 'border-black bg-neutral-50 ring-1 ring-black'
                      : 'border-neutral-300 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-black">All Active Creators</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Broadcasts to {creators.length} registered creator accounts
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('SINGLE')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    target === 'SINGLE'
                      ? 'border-black bg-neutral-50 ring-1 ring-black'
                      : 'border-neutral-300 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-neutral-200 text-black flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-black">Specific Creator</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Direct notification & email to 1 creator
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* If target === SINGLE, show creator picker */}
            {target === 'SINGLE' && (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-black">Select Creator Recipient</label>
                  <span className="text-[11px] text-neutral-500">{filteredCreators.length} available</span>
                </div>

                <input
                  type="text"
                  placeholder="Search creators by name or email..."
                  value={creatorSearch}
                  onChange={(e) => setCreatorSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-black placeholder-neutral-400 focus:outline-none focus:border-black"
                />

                <select
                  value={selectedCreatorId}
                  onChange={(e) => setSelectedCreatorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-black focus:outline-none focus:border-black"
                >
                  {filteredCreators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name} ({c.email}) {c.sample_status ? `• ${c.sample_status}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notification Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-black block">
                Notification Category / Icon Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'SYSTEM', label: 'System Alert', color: 'bg-neutral-100 text-black' },
                  { id: 'REVIEW', label: 'Review & Quality', color: 'bg-blue-50 text-blue-800' },
                  { id: 'PAYOUT', label: 'Payout / Earnings', color: 'bg-emerald-50 text-emerald-800' },
                  { id: 'GENERAL', label: 'General Notice', color: 'bg-purple-50 text-purple-800' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNotifType(cat.id as any)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all text-center ${
                      notifType === cat.id
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-black block">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-neutral-400">{title.length}/100</span>
              </div>
              <input
                type="text"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Important Update: Payout Schedule for February"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-medium text-black placeholder-neutral-400 focus:outline-none focus:border-black"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-black block">
                  Message Content <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-neutral-400">{message.length}/500</span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the full message here. This will appear inside the bell notification drawer and within the email notification body sent to the creator..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-medium text-black placeholder-neutral-400 focus:outline-none focus:border-black leading-relaxed"
              />
            </div>

            {/* Link & Action URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-black block">
                Destination Link (Optional)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/creator or /creator/upload or /creator/payouts"
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-black placeholder-neutral-400 focus:outline-none focus:border-black"
              />
              <p className="text-[11px] text-neutral-500">
                When the creator clicks the notification or email button, they will be navigated here.
              </p>
            </div>

            {/* Email dispatch toggle */}
            <div className="pt-2 border-t border-neutral-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black mt-0.5 accent-black"
                />
                <div>
                  <div className="text-xs font-bold text-black flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-black" />
                    <span>Also send transactional email to creator inbox</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Dispatches a formatted Resend notification email with platform branding and direct dashboard action button.
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full py-3 px-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Broadcasting Custom Notification...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      Push Notification to {target === 'ALL' ? `All Creators (${creators.length})` : 'Selected Creator'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Live Previews (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <Eye className="w-3.5 h-3.5 text-neutral-700" />
            <span>Live Recipient Preview</span>
          </div>

          {/* Bell Dropdown Preview Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="text-xs font-bold text-black flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-black" />
                <span>In-App Bell Drawer Preview</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800">
                Unread
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-black">
                  {title || 'Your notification title preview will appear here'}
                </span>
                <span className="text-[10px] text-neutral-400 shrink-0">Just now</span>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                {message || 'Your custom message content preview will appear here in the creator notification dropdown...'}
              </p>
              {link && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-black underline flex items-center gap-1">
                    <span>View in Dashboard ({link})</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Email Preview Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="text-xs font-bold text-black flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-black" />
                <span>Transactional Email Preview</span>
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                {sendEmail ? 'Email Delivery Enabled' : 'Email Skipped'}
              </span>
            </div>

            {sendEmail ? (
              <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 text-xs">
                {/* Email Subject Bar */}
                <div className="bg-neutral-200/70 px-3.5 py-2 font-bold text-neutral-800 border-b border-neutral-200 text-[11px]">
                  Subject: [The Pink Room] {title || 'Notification Title'}
                </div>
                {/* Email Content Mock */}
                <div className="p-4 space-y-3 bg-white">
                  <div className="font-serif text-sm font-bold text-neutral-900">
                    {title || 'Platform Notification'}
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    Dear {target === 'ALL' ? 'Creator' : (selectedCreator?.display_name || 'Creator')},
                  </div>
                  <p className="text-neutral-700 leading-relaxed font-medium text-[11px]">
                    {message || 'The custom announcement or quality advice formatted nicely within The Pink Room transactional template.'}
                  </p>
                  <div className="pt-1">
                    <span className="inline-block px-4 py-2 rounded-full bg-black text-white text-[11px] font-bold">
                      View in Dashboard &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-100 text-center text-xs text-neutral-500 font-medium">
                Email dispatch disabled for this notification. Only the in-app notification bell will receive this alert.
              </div>
            )}
          </div>

          {/* Quick Stats Box */}
          <div className="bg-neutral-100 p-4 rounded-2xl border border-neutral-200 space-y-2">
            <div className="text-xs font-bold text-black">Delivery Summary</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                <div className="text-neutral-500 text-[10px] font-bold uppercase">Audience</div>
                <div className="font-bold text-black mt-0.5">
                  {target === 'ALL' ? `${creators.length} Creators` : '1 Creator'}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                <div className="text-neutral-500 text-[10px] font-bold uppercase">Channels</div>
                <div className="font-bold text-black mt-0.5">
                  Bell {sendEmail ? '+ Email' : 'Only'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Log Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-black flex items-center gap-2">
              <Clock className="w-5 h-5 text-black" />
              <span>Recent Dispatched Notifications Log</span>
            </h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Showing the latest notifications recorded on the platform and delivery audit.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700">
            {recentNotifications.length} Total Dispatched
          </span>
        </div>

        {recentNotifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500 font-medium">
            No notifications recorded in system log yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Title & Message</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentNotifications.slice(0, 15).map((n) => (
                  <tr key={n.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-3 max-w-sm">
                      <div className="font-bold text-black line-clamp-1">{n.title}</div>
                      <div className="text-neutral-500 text-[11px] line-clamp-1 mt-0.5">{n.message}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-black">{n.recipient_name || 'Creator'}</div>
                      <div className="text-neutral-400 text-[10px]">{n.recipient_email || n.user_id}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {n.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          n.is_read
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {n.is_read ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-500 whitespace-nowrap text-[11px]">
                      {new Date(n.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
