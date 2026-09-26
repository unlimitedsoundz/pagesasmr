'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film,
  DollarSign,
  Users,
  CreditCard,
  RotateCw,
  ArrowRight,
  ShieldCheck,
  FileText,
  Settings,
  BookOpen,
  Shield,
  Bell,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<any[]>([]);
  const [recentAuditEvents, setRecentAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setRefreshing(true);
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setSettings(data.settings);
        setRecentSubmissions(data.recentSubmissions || []);
        setRecentPayouts(data.recentPayouts || []);
        setRecentAuditEvents(data.recentAuditEvents || []);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-black">
        <div className="inline-block w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading page-turning platform records...</p>
      </div>
    );
  }

  return (
    <div data-admin-container="true" className="admin-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-black">
      {/* Top Header Bar */}
      <div style={{ borderRadius: 0 }} className="bg-black text-white p-6 sm:p-8 rounded-none border border-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Admin Platform Operations • Page Turning
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Platform Administration
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh database records"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/admin/chat"
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Live Chat ({stats?.unreadChatCount || 0} Unread)
          </Link>
          <Link
            href="/admin/submissions"
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-white text-black hover:bg-neutral-100 text-xs font-semibold transition-colors"
          >
            Review Queue ({stats?.pendingCount || 0})
          </Link>
          <Link
            href="/admin/payouts"
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Payouts ({stats?.pendingPayoutRequests || 0})
          </Link>
          <Link
            href="/admin/creators"
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Creators ({stats?.creatorCount || 0})
          </Link>
          <Link
            href="/admin/ledger"
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Ledger ({stats?.totalLedgerEntries || 0})
          </Link>
          <Link
            href="/admin/settings"
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/admin/audit"
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Audit ({stats?.totalAuditEvents || 0})
          </Link>
          <Link
            href="/guidelines"
            style={{ borderRadius: 0 }}
            className="px-3.5 py-2 rounded-none bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Guidelines
          </Link>
        </div>
      </div>

      {/* Platform Core Database Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submissions */}
        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-5 rounded-none border border-neutral-200 space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-black">
            Total Submissions
          </span>
          <div className="font-serif text-3xl font-bold text-black">
            {stats?.totalSubmissions || 0}
          </div>
          <div className="text-xs text-black font-bold">
            {stats?.pendingCount || 0} pending review
          </div>
        </div>

        {/* Approved Count */}
        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-5 rounded-none border border-neutral-200 space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-black">
            Approved Submissions
          </span>
          <div className="font-serif text-3xl font-bold text-black">
            {stats?.approvedCount || 0}
          </div>
          <div className="text-xs text-black font-bold">
            {stats?.rejectedCount || 0} rejected • {stats?.revisionCount || 0} in revision
          </div>
        </div>

        {/* Outstanding Liability */}
        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-5 rounded-none border border-neutral-200 space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-black">
            Outstanding Liability
          </span>
          <div className="font-serif text-3xl font-bold text-black">
            ${stats?.outstandingLiability?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-xs text-black font-bold">
            Approved unpaid & reserved
          </div>
        </div>

        {/* Total Confirmed Paid */}
        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-5 rounded-none border border-neutral-200 space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-black">
            Confirmed Disbursed
          </span>
          <div className="font-serif text-3xl font-bold text-black">
            ${stats?.totalConfirmedPaid?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-xs text-black font-bold">
            Completed with bank references
          </div>
        </div>
      </div>

      {/* Content Breakdown: Full Videos vs 30s Auditions vs Revisions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-4 rounded-none border border-neutral-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-black uppercase">Full Paid Videos</div>
            <div className="text-2xl font-bold text-black">{stats?.totalFullVideos || 0}</div>
            <div className="text-[11px] text-neutral-600 font-bold">
              {stats?.approvedFullCount || 0} approved • {stats?.pendingFullCount || 0} in review
            </div>
          </div>
          <Film className="w-6 h-6 text-black shrink-0" />
        </div>

        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-4 rounded-none border border-neutral-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-black uppercase">30s Audition Samples</div>
            <div className="text-2xl font-bold text-black">{stats?.totalSamples || 0}</div>
            <div className="text-[11px] text-neutral-600 font-bold">
              {stats?.approvedSamplesCount || 0} approved • {stats?.pendingSamplesCount || 0} in review
            </div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-black shrink-0" />
        </div>

        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-4 rounded-none border border-neutral-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-black uppercase">Versioned Revisions</div>
            <div className="text-2xl font-bold text-black">{stats?.totalRevisions || 0}</div>
            <div className="text-[11px] text-neutral-600 font-bold">
              {stats?.revisionCount || 0} currently requested
            </div>
          </div>
          <RotateCw className="w-6 h-6 text-black shrink-0" />
        </div>
      </div>

      {/* Secondary DB Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-4 rounded-none border border-neutral-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-black uppercase">Creators</div>
            <div className="text-2xl font-bold text-black">{stats?.creatorCount || 0}</div>
          </div>
          <Users className="w-5 h-5 text-black" />
        </div>

        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-4 rounded-none border border-neutral-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-black uppercase">Rate / Video</div>
            <div className="text-2xl font-bold text-black">${settings?.rate_per_video_usd || 10}</div>
          </div>
          <DollarSign className="w-5 h-5 text-black" />
        </div>

        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-4 rounded-none border border-neutral-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-black uppercase">Payout Gate</div>
            <div className="text-2xl font-bold text-black">{settings?.min_payout_videos || 8} videos</div>
          </div>
          <CreditCard className="w-5 h-5 text-black" />
        </div>

        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white p-4 rounded-none border border-neutral-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-black uppercase">Ledger Entries</div>
            <div className="text-2xl font-bold text-black">{stats?.totalLedgerEntries || 0}</div>
          </div>
          <FileText className="w-5 h-5 text-black" />
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module: Creator Live Chat */}
        <Link
          href="/admin/chat"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            {stats?.unreadChatCount > 0 && (
              <span style={{ borderRadius: 0 }} className="px-2 py-0.5 rounded-none text-[11px] font-bold bg-black text-white">
                {stats.unreadChatCount} Unread
              </span>
            )}
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Creator Live Chat
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            {stats?.activeChatConversations || 0} active creator conversations and {stats?.unreadChatCount || 0} unread messages stored in database.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>Open Chat</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 1: Submission Queue */}
        <Link
          href="/admin/submissions"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <span style={{ borderRadius: 0 }} className="px-2 py-0.5 rounded-none text-[11px] font-bold bg-neutral-100 text-black border border-neutral-300">
              {stats?.pendingCount || 0} Pending
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Submissions & Video Review
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            {stats?.pendingCount || 0} pending review out of {stats?.totalSubmissions || 0} total page-turning submissions.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>Inspect Queue</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 2: Payouts */}
        <Link
          href="/admin/payouts"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span style={{ borderRadius: 0 }} className="px-2 py-0.5 rounded-none text-[11px] font-bold bg-neutral-100 text-black border border-neutral-300">
              {stats?.pendingPayoutRequests || 0} Pending
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Payouts & Disbursals
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            {stats?.pendingPayoutRequests || 0} requests awaiting disbursement • ${stats?.totalConfirmedPaid?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'} confirmed disbursed.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>Manage Payouts</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 3: Creator Directory */}
        <Link
          href="/admin/creators"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Creator Directory
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            {stats?.creatorCount || 0} registered creator profiles with banking methods, submissions, and eligibility tallies.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>View Creators</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module: Push Custom Notifications */}
        <Link
          href="/admin/notifications"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <span style={{ borderRadius: 0 }} className="px-2 py-0.5 rounded-none text-[11px] font-bold bg-neutral-100 text-black border border-neutral-300">
              Bell & Email
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Push Custom Notifications
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            Broadcast platform announcements, acoustic quality advice, and payout updates to all creators or individuals.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>Push Notification</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 4: Platform Ledger */}
        <Link
          href="/admin/ledger"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Earnings Ledger
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            {stats?.totalLedgerEntries || 0} financial ledger records tracking credit issuance, locks, and payouts.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>View Ledger</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 5: Platform Settings */}
        <Link
          href="/admin/settings"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Configuration & Rules
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            ${settings?.rate_per_video_usd || 10}/video rate • {settings?.min_payout_videos || 8} min video threshold • {settings?.min_duration_seconds || 180}s min duration.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>Edit Configuration</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 6: Platform Audit Trail */}
        <Link
          href="/admin/audit"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Platform Audit Trail
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            {stats?.totalAuditEvents || 0} recorded administrative events, review actions, and security operations.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>Inspect Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 7: Recording Guidelines */}
        <Link
          href="/guidelines"
          data-admin-card="true"
          style={{ borderRadius: 0 }}
          className="admin-module-card admin-card bg-white p-6 !rounded-none rounded-none border border-neutral-200 hover:border-black transition-all group space-y-3"
        >
          <div style={{ borderRadius: 0 }} className="w-10 h-10 rounded-none bg-neutral-100 text-black flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-black group-hover:underline">
            Recording Guidelines
          </h3>
          <p className="text-xs text-black leading-relaxed font-bold">
            Public guidelines, sample audio standards, camera positioning, and quality checks for page-turning ASMR.
          </p>
          <div className="text-xs font-bold text-black flex items-center gap-1 pt-1">
            <span>View Guidelines</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Live Database Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Recent Submissions */}
        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white rounded-none border border-neutral-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-black">
                Recent Submissions
              </h2>
            </div>
            <Link
              href="/admin/submissions"
              className="text-xs font-bold text-black hover:underline flex items-center gap-1"
            >
              <span>View all ({stats?.totalSubmissions || 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-neutral-200">
            {recentSubmissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-black font-medium">
                No submissions in database.
              </div>
            ) : (
              recentSubmissions.map((sub: any) => (
                <div
                  key={sub.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-black truncate">
                      {sub.title}
                    </div>
                    <div className="text-[11px] text-black font-bold">
                      By {sub.creator_name || 'Creator'} • {Math.floor(sub.duration_seconds / 60)}m {sub.duration_seconds % 60}s • ${sub.agreed_rate_usd}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <StatusBadge status={sub.status} size="sm" />
                    <Link
                      href="/admin/submissions"
                      style={{ borderRadius: 0 }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-none border border-neutral-300 text-black hover:bg-neutral-100"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payout Requests */}
        <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white rounded-none border border-neutral-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-black">
                Recent Payout Requests
              </h2>
            </div>
            <Link
              href="/admin/payouts"
              className="text-xs font-bold text-black hover:underline flex items-center gap-1"
            >
              <span>View all ({stats?.pendingPayoutRequests || 0} pending)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-neutral-200">
            {recentPayouts.length === 0 ? (
              <div className="p-8 text-center text-xs text-black font-medium">
                No payout requests in database.
              </div>
            ) : (
              recentPayouts.map((payout: any) => (
                <div
                  key={payout.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-black">
                      ${payout.amount_usd?.toFixed(2)} • {payout.creator_name}
                    </div>
                    <div className="text-[11px] text-black font-bold">
                      {payout.payment_method} • {payout.payment_destination} • {payout.submission_ids?.length || 0} videos
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <StatusBadge status={payout.status} size="sm" />
                    <Link
                      href="/admin/payouts"
                      style={{ borderRadius: 0 }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-none border border-neutral-300 text-black hover:bg-neutral-100"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live Audit Log Stream */}
      <div data-admin-card="true" style={{ borderRadius: 0 }} className="admin-card bg-white rounded-none border border-neutral-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-black">
              Audit Trail
            </h2>
          </div>
          <Link
            href="/admin/audit"
            className="text-xs font-bold text-black hover:underline flex items-center gap-1"
          >
            <span>Full Log ({stats?.totalAuditEvents || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-black font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-medium">
              {recentAuditEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-black font-medium">
                    No audit records recorded.
                  </td>
                </tr>
              ) : (
                recentAuditEvents.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-4 text-black font-medium whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-black whitespace-nowrap">
                      {ev.actor_name}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span style={{ borderRadius: 0 }} className="px-2 py-0.5 rounded-none text-[10px] font-bold border border-neutral-300 bg-neutral-100 text-black">
                        {ev.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-black font-medium whitespace-nowrap">
                      {ev.target_type} ({ev.target_id})
                    </td>
                    <td className="py-2.5 px-4 text-black font-medium truncate max-w-xs">
                      {ev.details ? JSON.stringify(ev.details) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
