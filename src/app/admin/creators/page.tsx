'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  ArrowUpDown,
  DollarSign,
  Film,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Bell,
  Trash2,
  Send,
  X,
  RefreshCw,
  CreditCard,
  Copy,
  Check,
  ShieldAlert,
  Ban,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  MinusCircle,
  AlertCircle,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import CreatorPayoutModal from '@/components/CreatorPayoutModal';
import { formatCreatorPayoutInfo } from '@/lib/payoutDetails';
import { useToast } from '@/components/ToastProvider';

const formatCategoryLabel = (category?: string) => {
  if (!category) return 'Page Turning';
  switch (category.toUpperCase()) {
    case 'PAGE_TURNING':
      return 'Page Turning';
    case 'THIGH_FLAPPING_AND_GUM_CHEWING':
    case 'BOTH':
      return 'Thigh Flapping & Gum Chewing';
    case 'THIGH_FLAPPING':
      return 'Thigh Flapping';
    case 'GUM_CHEWING':
      return 'Gum Chewing';
    default:
      return category.replace(/_/g, ' ');
  }
};

export default function AdminCreatorsPage() {
  const { toast } = useToast();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'pending' | 'approved' | 'balance' | 'videos' | 'banned'>('newest');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [payingSampleId, setPayingSampleId] = useState<string | null>(null);
  const [sampleConfirmId, setSampleConfirmId] = useState<{id: string; name: string} | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  // Payout Details Modal & Copy
  const [payoutModalCreator, setPayoutModalCreator] = useState<any | null>(null);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  // Ban Creator Modal
  const [banningCreator, setBanningCreator] = useState<any | null>(null);
  const [banReason, setBanReason] = useState('Severe policy violations and identity circumvention');
  const [banCustomIp, setBanCustomIp] = useState('');
  const [banCustomDevice, setBanCustomDevice] = useState('');
  const [submittingBan, setSubmittingBan] = useState(false);

  const handleExecuteBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banningCreator) return;
    setSubmittingBan(true);
    try {
      const res = await fetch('/api/admin/creators/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: banningCreator.id,
          reason: banReason,
          customIp: banCustomIp,
          customDevice: banCustomDevice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ban creator.');
      toast.success(`Creator ${banningCreator.display_name} has been banned and blacklisted.`, 'Ban Enforced');
      setBanningCreator(null);
      // Immediately reflect in UI
      setCreators((prev) =>
        prev.map((c) => (c.id === banningCreator.id ? { ...c, is_banned: true, sample_status: 'REJECTED' } : c))
      );
      fetchCreators();
    } catch (err: any) {
      toast.error(err.message || 'Error enforcing ban.');
    } finally {
      setSubmittingBan(false);
    }
  };

  const handleUnban = async (creator: any) => {
    if (!confirm(`Lift ban for ${creator.display_name} (${creator.email})? This restores dashboard access.`)) return;
    setUnbanningId(creator.id);
    try {
      const res = await fetch('/api/admin/creators/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: creator.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to lift ban.');
      toast.success(`Ban lifted for ${creator.display_name}.`, 'Creator Restored');
      setCreators((prev) =>
        prev.map((c) => (c.id === creator.id ? { ...c, is_banned: false, sample_status: data.profile?.sample_status || c.sample_status } : c))
      );
      fetchCreators();
    } catch (err: any) {
      toast.error(err.message || 'Error lifting ban.');
    } finally {
      setUnbanningId(null);
    }
  };

  const handleCopyAccount = (creatorId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccountId(creatorId);
    setTimeout(() => setCopiedAccountId(null), 2000);
    toast.success(`Copied account: ${text}`);
  };

  const handleMarkSamplePaid = async (creatorId: string, creatorName: string) => {
    setSampleConfirmId({ id: creatorId, name: creatorName });
  };

  const executeSamplePaid = async () => {
    if (!sampleConfirmId) return;
    const { id: creatorId, name: creatorName } = sampleConfirmId;
    setSampleConfirmId(null);
    setPayingSampleId(creatorId);
    try {
      const res = await fetch('/api/admin/samples/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark sample as paid.');
      toast.success(`$1.00 sample reward marked as paid for ${creatorName}.`, 'Sample Paid Out');
      // Update local state immediately
      setCreators((prev) =>
        prev.map((c) => {
          if (c.id === creatorId) {
            const curStats = c.stats || {};
            return {
              ...c,
              stats: {
                ...curStats,
                sampleBonusPaid: true,
                totalPaid: (curStats.totalPaid || 0) + 1.0,
                availablePayoutBalance: Math.max(0, (curStats.availablePayoutBalance || 0) - 1.0),
              },
            };
          }
          return c;
        })
      );
      try {
        const syncChan = new BroadcastChannel('pages_submissions_sync');
        syncChan.postMessage({ type: 'SAMPLE_PAID', creatorId, timestamp: Date.now() });
      } catch {}
      fetchCreators();
    } catch (err: any) {
      toast.error(err.message || 'Error marking sample as paid.');
    } finally {
      setPayingSampleId(null);
    }
  };

  // Direct push notification modal
  const [notifyCreator, setNotifyCreator] = useState<any | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('SYSTEM');
  const [notifLink, setNotifLink] = useState('/creator');
  const [notifSendEmail, setNotifSendEmail] = useState(true);
  const [notifSending, setNotifSending] = useState(false);

  const fetchCreators = () => {
    setLoading(true);
    fetch('/api/admin/creators')
      .then((r) => r.json())
      .then((data) => {
        setCreators(data.creators || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => { fetchCreators(); }, []);

  const handleApproveAudition = async (creatorId: string) => {
    setApprovingId(creatorId);
    try {
      const res = await fetch('/api/admin/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          action: 'APPROVE',
          notes: '30-second audition sample meets acoustic quality standard. Full production unlocked.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve audition.');
      toast.success('Creator audition approved! 8-video upload portal unlocked.', 'Audition Approved');
      fetchCreators();
      try {
        const syncChan = new BroadcastChannel('pages_submissions_sync');
        syncChan.postMessage({ type: 'AUDITION_REVIEWED', action: 'APPROVE', creatorId, timestamp: Date.now() });
      } catch {}
    } catch (err: any) {
      toast.error(err.message || 'Error approving audition sample.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleCleanupStale = async (hours: number = 24) => {
    const timeLabel = hours === 0 ? 'all' : `>${hours} hours`;
    if (!confirm(`Run auto-cleanup sweep (${timeLabel} with no sample)?`)) return;
    setCleaning(true);
    try {
      const res = await fetch(`/api/admin/cleanup?hours=${hours}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cleanup failed.');
      const count = data.removedCount ?? data.removed ?? 0;
      if (count > 0) {
        toast.success(`Removed ${count} stale creator account(s).`, 'Cleanup Finished');
      } else {
        toast.info(`No stale accounts found (${timeLabel}).`, 'Cleanup Finished');
      }
      fetchCreators();
    } catch (err: any) {
      toast.error(err.message || 'Error running cleanup.');
    } finally {
      setCleaning(false);
    }
  };

  const handleDeleteCreator = async (creator: any) => {
    if (!confirm(`Remove creator "${creator.display_name}" (${creator.email})?`)) return;
    setDeletingId(creator.id);
    // Immediately remove from UI
    setCreators((prev) => prev.filter((c) => c.id !== creator.id));
    try {
      const res = await fetch(`/api/admin/creators/${creator.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove creator.');
      toast.success(`Creator ${creator.display_name} removed.`, 'Creator Deleted');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting creator.');
      fetchCreators();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendDirectNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyCreator || !notifTitle.trim() || !notifMessage.trim()) return;
    setNotifSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: notifyCreator.id,
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: notifType,
          link: notifLink.trim() || '/creator',
          sendEmail: notifSendEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch notification.');
      toast.success(`Notification delivered to ${notifyCreator.display_name}.`, 'Notification Dispatched');
      setNotifyCreator(null);
      setNotifTitle('');
      setNotifMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Error sending notification.');
    } finally {
      setNotifSending(false);
    }
  };

  const filtered = creators
    .filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        !q ||
        c.display_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.country && c.country.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'pending': {
          const aPend = a.sample_status === 'PENDING_REVIEW' ? 0 : 1;
          const bPend = b.sample_status === 'PENDING_REVIEW' ? 0 : 1;
          return aPend - bPend || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case 'approved': {
          const aAppr = a.sample_status === 'APPROVED' ? 0 : 1;
          const bAppr = b.sample_status === 'APPROVED' ? 0 : 1;
          return aAppr - bAppr || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case 'balance':
          return (b.stats?.availablePayoutBalance || 0) - (a.stats?.availablePayoutBalance || 0);
        case 'videos':
          return ((b.stats?.approvedFullCount ?? b.stats?.approvedCount) || 0) - ((a.stats?.approvedFullCount ?? a.stats?.approvedCount) || 0);
        case 'banned':
          return (b.is_banned ? 1 : 0) - (a.is_banned ? 1 : 0);
        default:
          return 0;
      }
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / (pageSize === -1 ? filtered.length || 1 : pageSize)));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCreators = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-5 text-black">

      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-black transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Admin
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl font-bold text-black leading-tight">Creator Directory</h1>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">{creators.length} registered creators</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleCleanupStale(24)}
              disabled={cleaning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDF2F4] text-[#7B1E4B] text-xs font-bold hover:bg-[#F8E2EC] transition-colors disabled:opacity-50"
            >
              <Clock className={`w-3.5 h-3.5 ${cleaning ? 'animate-spin' : ''}`} />
              {cleaning ? 'Sweeping...' : 'Auto-Clean'}
            </button>
            <Link
              href="/admin/notifications"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7B1E4B] text-white text-xs font-bold hover:bg-[#63183C] transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              Broadcast
            </Link>
            <Link
              href="/admin/blacklist"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              Blacklist
            </Link>
          </div>
        </div>
      </div>

      {/* Search + Sort (matches screenshot search bar) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search creators by name, email or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 bg-white placeholder:text-neutral-400 transition-colors shadow-2xs"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1 mr-0.5">
            <ArrowUpDown className="w-3 h-3" /> Sort
          </span>
          {([
            { value: 'newest'  as const, label: 'Recently Joined' },
            { value: 'oldest'  as const, label: 'Oldest First' },
            { value: 'pending' as const, label: 'Needs Review' },
            { value: 'approved' as const, label: 'Approved' },
            { value: 'balance' as const, label: 'Top Balance' },
            { value: 'videos'  as const, label: 'Most Videos' },
            { value: 'banned'  as const, label: 'Banned' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                sortBy === opt.value
                  ? 'bg-[#7B1E4B] text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Creator Accordion Table */}
      {loading ? (
        <div className="py-16 text-center bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="inline-block w-7 h-7 border-2 border-[#7B1E4B] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-500 font-medium mt-2">Loading creators...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-xs font-medium text-neutral-500 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          {searchQuery ? 'No creators match your search.' : 'No creators registered yet.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-neutral-200 text-xs font-medium text-neutral-500 bg-white select-none">
            <div className="col-span-4">Creator</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-3">Videos & Balance</div>
            <div className="col-span-1">Joined</div>
            <div className="col-span-2 text-right pr-6">Status</div>
          </div>

          {/* Table Accordion Rows */}
          <div className="divide-y divide-neutral-100">
            {paginatedCreators.map((c) => {
              const sampleStatus = c.sample_status || 'NOT_SUBMITTED';
              const pInfo = formatCreatorPayoutInfo(c);
              const isExpanded = expandedId === c.id;
              const isApproved = sampleStatus === 'APPROVED';
              const isPending = sampleStatus === 'PENDING_REVIEW';

              return (
                <div key={c.id} className="transition-colors">
                  {/* Row Trigger */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="w-full text-left px-4 sm:px-6 py-3.5 hover:bg-neutral-50/70 transition-colors flex items-center justify-between group"
                  >
                    {/* Desktop Columns */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center w-full">
                      {/* Creator */}
                      <div className="col-span-4 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-neutral-900 truncate">{c.display_name}</span>
                          {isApproved && <VerifiedBadge size={14} />}
                        </div>
                        <p className="text-xs text-neutral-500 font-normal truncate">{c.email}</p>
                      </div>

                      {/* Category */}
                      <div className="col-span-2 min-w-0">
                        <span className="text-xs font-mono text-neutral-700 truncate block">
                          {formatCategoryLabel(c.preferred_category)}
                        </span>
                      </div>

                      {/* Videos & Balance */}
                      <div className="col-span-3 min-w-0">
                        <p className="text-xs text-neutral-800 font-medium truncate">
                          {c.stats?.approvedFullCount ?? c.stats?.approvedCount ?? 0} approved videos
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate">
                          ${c.stats?.availablePayoutBalance?.toFixed(2) || '0.00'} avail.
                        </p>
                      </div>

                      {/* Joined */}
                      <div className="col-span-1 text-xs text-neutral-500 font-normal truncate">
                        {c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '—'}
                      </div>

                      {/* Status & Purple Chevron */}
                      <div className="col-span-2 flex items-center justify-end gap-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {c.is_banned ? (
                            <>
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="text-xs font-medium text-neutral-800">Banned</span>
                            </>
                          ) : isPending ? (
                            <>
                              <Clock className="w-4 h-4 text-amber-500 fill-amber-50 shrink-0" />
                              <span className="text-xs font-medium text-neutral-800">Review Needed</span>
                            </>
                          ) : isApproved ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50 shrink-0" />
                              <span className="text-xs font-medium text-neutral-800">Approved</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100/60 hidden xl:inline">
                                Current
                              </span>
                            </>
                          ) : (
                            <>
                              <MinusCircle className="w-4 h-4 text-neutral-400 shrink-0" />
                              <span className="text-xs font-medium text-neutral-500">Not Submitted</span>
                            </>
                          )}
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 text-purple-600 transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Mobile Row */}
                    <div className="flex md:hidden items-center justify-between w-full gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-neutral-900 truncate">{c.display_name}</span>
                          {isApproved && <VerifiedBadge size={14} />}
                        </div>
                        <p className="text-xs text-neutral-500 truncate">{c.email}</p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {c.is_banned ? (
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                        ) : isPending ? (
                          <Clock className="w-4 h-4 text-amber-500 fill-amber-50" />
                        ) : isApproved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <MinusCircle className="w-4 h-4 text-neutral-400" />
                        )}
                        <ChevronRight
                          className={`w-4 h-4 text-purple-600 transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="border-t border-neutral-100 bg-neutral-50/40 px-5 py-5 sm:px-6 space-y-4">

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Country</p>
                        <p className="font-medium text-black">{c.country || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Category</p>
                        <p className="font-bold text-[#7B1E4B] text-[11px]">{formatCategoryLabel(c.preferred_category)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Joined</p>
                        <p className="font-medium text-black">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Submissions</p>
                        <p className="font-medium text-black">
                          {c.stats?.approvedFullCount ?? c.stats?.approvedCount ?? 0} approved
                          {c.stats?.pendingCount > 0 && (
                            <span className="text-neutral-500"> · {c.stats.pendingCount} pending</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Available</p>
                        <p className="font-bold text-black">${c.stats?.availablePayoutBalance?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Paid</p>
                        <p className="font-medium text-black">${c.stats?.totalPaid?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {/* Audition Status */}
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">30s Audition</p>
                      {sampleStatus === 'APPROVED' ? (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FDF2F4] text-[#7B1E4B]">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                          {c.stats?.sampleBonusPaid ? (
                            <span className="text-[11px] font-bold text-emerald-700">✓ $1 Bonus Paid</span>
                          ) : (
                            <button
                              type="button"
                              disabled={payingSampleId === c.id}
                              onClick={() => handleMarkSamplePaid(c.id, c.display_name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50"
                            >
                              <DollarSign className="w-3 h-3" />
                              {payingSampleId === c.id ? 'Marking...' : 'Mark $1 Paid'}
                            </button>
                          )}
                        </div>
                      ) : sampleStatus === 'PENDING_REVIEW' ? (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF0F5] text-[#7B1E4B]">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                          <button
                            type="button"
                            disabled={approvingId === c.id}
                            onClick={() => handleApproveAudition(c.id)}
                            className="px-3 py-1.5 rounded-full bg-[#7B1E4B] text-white text-[11px] font-bold hover:bg-[#63183C] disabled:opacity-50"
                          >
                            {approvingId === c.id ? 'Approving...' : '✓ Approve'}
                          </button>
                        </div>
                      ) : sampleStatus === 'REVISION_REQUESTED' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                          Revision Requested
                        </span>
                      ) : sampleStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-500 line-through">
                          Rejected
                        </span>
                      ) : (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-500">
                            Not Submitted
                          </span>
                          <button
                            type="button"
                            disabled={approvingId === c.id}
                            onClick={() => handleApproveAudition(c.id)}
                            className="px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-700 text-[11px] font-bold hover:bg-neutral-300 disabled:opacity-50"
                          >
                            Pre-Approve
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Payout Account */}
                    {pInfo.isConfigured && (
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Payout Account</p>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${pInfo.badgeColor}`}>
                            {pInfo.badgeLabel}
                          </span>
                        </div>
                        {(pInfo.accountNumber || pInfo.email) && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-black flex-1 truncate">
                              {pInfo.accountNumber || pInfo.email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyAccount(c.id, pInfo.accountNumber || pInfo.email || '')}
                              className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-black transition-colors flex-shrink-0"
                            >
                              {copiedAccountId === c.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                        {pInfo.accountName && (
                          <p className="text-[11px] text-neutral-500">{pInfo.accountName}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => setPayoutModalCreator(c)}
                          className="text-[11px] font-bold text-[#7B1E4B] hover:underline inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" /> Full payout details
                        </button>
                      </div>
                    )}
                    {!pInfo.isConfigured && (
                      <button
                        type="button"
                        onClick={() => setPayoutModalCreator(c)}
                        className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                          pInfo.needsUpdate
                            ? 'border-amber-400 bg-amber-50/70 text-amber-900 hover:bg-amber-100/70'
                            : 'border-neutral-300 text-neutral-400 hover:text-black hover:border-neutral-400'
                        }`}
                      >
                        {pInfo.needsUpdate ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>PayPal Discontinued — Payout Details Update Required</span>
                          </>
                        ) : (
                          'Payout account not configured — View details'
                        )}
                      </button>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifyCreator(c);
                          setNotifTitle('');
                          setNotifMessage('');
                          setNotifType('SYSTEM');
                          setNotifLink('/creator');
                          setNotifSendEmail(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-black hover:bg-neutral-50 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5 text-[#7B1E4B]" />
                        Notify
                      </button>

                      {c.is_banned ? (
                        <button
                          type="button"
                          disabled={unbanningId === c.id}
                          onClick={() => handleUnban(c)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {unbanningId === c.id ? 'Lifting...' : 'Lift Ban'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setBanningCreator(c);
                            setBanReason('Severe policy violations and identity circumvention');
                            setBanCustomIp('');
                            setBanCustomDevice('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Ban
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={() => handleDeleteCreator(c)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === c.id ? 'Removing...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination Footer (matches screenshot) */}
        <div className="px-5 py-3.5 border-t border-neutral-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 font-medium select-none">
          <div className="flex items-center gap-2">
            <span>Page size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-neutral-200 rounded px-2 py-1 bg-white text-xs text-neutral-800 focus:outline-none cursor-pointer"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div>
            {filtered.length === 0
              ? '0 of 0'
              : `${startIndex + 1} to ${Math.min(startIndex + pageSize, filtered.length)} of ${filtered.length}`}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2">
              Page <strong className="text-neutral-800">{currentPage}</strong> of <strong className="text-neutral-800">{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Notify Modal */}
      {notifyCreator && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 space-y-4 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-black">Send Notification</h3>
                <p className="text-xs text-neutral-500 font-medium">{notifyCreator.display_name}</p>
              </div>
              <button type="button" onClick={() => setNotifyCreator(null)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendDirectNotification} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Type</label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-medium text-black focus:outline-none focus:border-black bg-white"
                >
                  <option value="SYSTEM">System</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="SUBMISSION">Submission</option>
                  <option value="WARNING">Warning</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. Important Update"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-medium text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Message</label>
                <textarea
                  required
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Message delivered to creator's bell icon and email..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-medium text-black focus:outline-none focus:border-black resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Link (Optional)</label>
                <input
                  type="text"
                  value={notifLink}
                  onChange={(e) => setNotifLink(e.target.value)}
                  placeholder="/creator/upload"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-medium text-black focus:outline-none focus:border-black"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifSendEmail}
                  onChange={(e) => setNotifSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 accent-black"
                />
                <span className="text-xs font-medium text-black">Also send email to {notifyCreator.email}</span>
              </label>
              <div className="flex gap-2 pt-1 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setNotifyCreator(null)}
                  className="flex-1 py-2.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={notifSending || !notifTitle.trim() || !notifMessage.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {notifSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {notifSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Creator Payout Modal */}
      <CreatorPayoutModal
        creator={payoutModalCreator}
        isOpen={Boolean(payoutModalCreator)}
        onClose={() => setPayoutModalCreator(null)}
        onBan={(c) => {
          setPayoutModalCreator(null);
          setBanningCreator(c);
          setBanReason('Severe policy violations and identity circumvention');
          setBanCustomIp('');
          setBanCustomDevice('');
        }}
      />

      {/* Ban Modal */}
      {banningCreator && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#18121B] rounded-t-2xl sm:rounded-2xl border border-rose-500/30 w-full sm:max-w-lg p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Enforce Ban & Blacklist
                </h3>
                <p className="text-xs text-neutral-400 font-medium">{banningCreator.display_name} ({banningCreator.email})</p>
              </div>
              <button
                onClick={() => setBanningCreator(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 leading-relaxed">
              This will permanently ban <strong className="text-white">{banningCreator.display_name}</strong>, terminate all sessions, blacklist payment accounts/NUBANs, and block their IP and device.
            </div>

            <form onSubmit={handleExecuteBan} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Enforcement Reason</label>
                <input
                  type="text"
                  required
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Custom IP (Optional)</label>
                  <input
                    type="text"
                    value={banCustomIp}
                    onChange={(e) => setBanCustomIp(e.target.value)}
                    placeholder="e.g. 102.89.45.12"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Device (Optional)</label>
                  <input
                    type="text"
                    value={banCustomDevice}
                    onChange={(e) => setBanCustomDevice(e.target.value)}
                    placeholder="e.g. TECNO KM4"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setBanningCreator(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-xs font-bold text-neutral-300 hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBan || !banReason.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
                >
                  {submittingBan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  {submittingBan ? 'Enforcing...' : 'Enforce Ban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm $1 Sample Bonus Paid */}
      {sampleConfirmId && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Confirm $1.00 Audition Bonus</h3>
                <p className="text-xs text-neutral-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Confirm that the <strong>$1.00 audition sample reward</strong> has been disbursed to{' '}
              <strong>{sampleConfirmId.name}</strong>? This will mark their audition as paid and deduct $1.00 from their available balance.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSampleConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSamplePaid}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Mark $1 Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
