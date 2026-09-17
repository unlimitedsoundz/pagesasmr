'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  DollarSign,
  Film,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Bell,
  Trash2,
  Sparkles,
  Send,
  X,
  RefreshCw,
  CreditCard,
  Copy,
  Check,
  ShieldAlert,
  Ban,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import CreatorPayoutModal from '@/components/CreatorPayoutModal';
import { formatCreatorPayoutInfo } from '@/lib/payoutDetails';
import { useToast } from '@/components/ToastProvider';

export default function AdminCreatorsPage() {
  const { toast } = useToast();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [payingSampleId, setPayingSampleId] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Payout Details Modal & Copy
  const [payoutModalCreator, setPayoutModalCreator] = useState<any | null>(null);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  // Ban Creator Modal & Execution State
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
      if (!res.ok) throw new Error(data.error || 'Failed to ban creator');
      toast.success(`${banningCreator.display_name} has been permanently banned and blacklisted.`, 'Ban Enforced');
      setCreators((prev) =>
        prev.map((c) => (c.id === banningCreator.id ? { ...c, is_banned: true, sample_status: 'REJECTED' } : c))
      );
      setBanningCreator(null);
    } catch (err: any) {
      toast.error(err.message || 'Error applying ban');
    } finally {
      setSubmittingBan(false);
    }
  };

  const handleUnban = async (creator: any) => {
    if (!confirm(`Lift permanent ban for ${creator.display_name}?`)) return;
    try {
      const res = await fetch(`/api/admin/creators/ban?creatorId=${encodeURIComponent(creator.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to lift ban');
      toast.success(`Ban lifted for ${creator.display_name}.`);
      setCreators((prev) =>
        prev.map((c) => (c.id === creator.id ? { ...c, is_banned: false } : c))
      );
    } catch (err: any) {
      toast.error(err.message || 'Error lifting ban');
    }
  };

  const handleCopyAccount = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccountId(id);
    setTimeout(() => setCopiedAccountId(null), 2000);
    toast.success(`Copied account number: ${text}`);
  };

  const handleMarkSamplePaid = async (creatorId: string, creatorName?: string) => {
    if (
      !confirm(
        `Confirm that the $1.00 audition sample reward has been disbursed to ${creatorName || 'this creator'}?\n\nThis will mark the audition sample as PAID and remove $1.00 from their available balance.`
      )
    ) {
      return;
    }

    setPayingSampleId(creatorId);
    try {
      const res = await fetch('/api/admin/creators/sample-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark sample payout.');

      toast.success(
        `$1.00 audition reward marked as paid out for ${creatorName || 'creator'}. Available balance updated!`,
        'Bonus Paid Out'
      );

      // Instantly update creator state in table
      setCreators((prev) =>
        prev.map((c) => {
          if (c.id === creatorId) {
            const updatedStats = data.stats || {
              ...c.stats,
              sampleUnpaidEarnings: 0,
              samplePaidEarnings: (c.stats?.samplePaidEarnings || 0) + 1.0,
              availablePayoutBalance: Math.max(0, (c.stats?.availablePayoutBalance || 0) - 1.0),
              totalPaid: (c.stats?.totalPaid || 0) + 1.0,
              sampleBonusPaid: true,
            };
            return {
              ...c,
              stats: updatedStats,
            };
          }
          return c;
        })
      );
    } catch (err: any) {
      toast.error(err.message || 'Error processing sample payout.');
    } finally {
      setPayingSampleId(null);
    }
  };

  // Quick Direct Notify Modal
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

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleApproveAudition = async (creatorId: string) => {
    setApprovingId(creatorId);
    try {
      const res = await fetch('/api/admin/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          action: 'APPROVE',
          notes: '30-second audition sample meets acoustic page-turning quality standard. Full production unlocked.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve audition.');

      toast.success('Creator audition approved! 8-video upload portal unlocked.', 'Audition Approved');
      fetchCreators();

      // Cross-tab broadcast
      try {
        const syncChan = new BroadcastChannel('asmr_submissions_sync');
        syncChan.postMessage({
          type: 'AUDITION_REVIEWED',
          action: 'APPROVE',
          creatorId,
          timestamp: Date.now(),
        });
      } catch {}
    } catch (err: any) {
      toast.error(err.message || 'Error approving audition sample.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleCleanupStale = async (hours: number = 24) => {
    const timeLabel = hours === 0 ? 'all' : `>${hours} hours`;
    if (!confirm(`Run auto-cleanup sweep (${timeLabel} with no sample)? This will permanently remove creator accounts that have never submitted an audition sample.`)) {
      return;
    }
    setCleaning(true);
    try {
      const res = await fetch(`/api/admin/cleanup?hours=${hours}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cleanup failed.');

      const count = data.removedCount ?? data.removed ?? 0;
      if (count > 0) {
        toast.success(
          `Auto-cleanup complete: removed ${count} creator account(s) with no audition sample.`,
          'Cleanup Finished'
        );
      } else {
        toast.info(`No stale creator accounts found (${timeLabel} with no audition sample).`, 'Cleanup Finished');
      }
      fetchCreators();
    } catch (err: any) {
      toast.error(err.message || 'Error running cleanup sweep.');
    } finally {
      setCleaning(false);
    }
  };

  const handleDeleteCreator = async (creator: any) => {
    if (!confirm(`Are you sure you want to remove creator "${creator.display_name}" (${creator.email})?`)) {
      return;
    }
    setDeletingId(creator.id);
    try {
      const res = await fetch(`/api/admin/creators?id=${creator.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete creator.');

      toast.success(`Creator "${creator.display_name}" was successfully removed.`, 'Creator Removed');
      fetchCreators();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting creator.');
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
          target: 'SINGLE',
          creatorId: notifyCreator.id,
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: notifType,
          link: notifLink.trim() || '/creator',
          sendEmail: notifSendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch notification.');

      toast.success(
        `Custom notification pushed to ${notifyCreator.display_name}! Bell and email updated.`,
        'Notification Sent'
      );

      try {
        const bc = new BroadcastChannel('asmr_notifications_sync');
        bc.postMessage({ type: 'NOTIFICATION_SENT', timestamp: Date.now() });
      } catch {}

      setNotifyCreator(null);
      setNotifTitle('');
      setNotifMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send notification.');
    } finally {
      setNotifSending(false);
    }
  };

  const filtered = creators.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.display_name && c.display_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.country && c.country.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-black">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Platform Operations
          </Link>
          <h1 className="font-serif text-3xl font-bold text-black">
            Creator Directory
          </h1>
          <p className="text-xs text-neutral-600 font-medium">
            Review registered page-turning creators, 30s audition status, submission milestones, push direct notifications, and manage accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleCleanupStale(24)}
            disabled={cleaning}
            title="Automatically delete creator accounts that joined >24 hours ago and never submitted an audition sample"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FDF2F4] text-[#7B1E4B] text-xs font-bold hover:bg-[#F8E2EC] transition-colors border-0 disabled:opacity-50"
          >
            <Clock className={`w-3.5 h-3.5 text-[#7B1E4B] ${cleaning ? 'animate-spin' : ''}`} />
            <span>{cleaning ? 'Sweeping...' : 'Auto-Clean (>24h No Sample)'}</span>
          </button>

          <Link
            href="/admin/notifications"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#7B1E4B] text-white text-xs font-bold hover:bg-[#63183C] transition-colors border-0 shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Broadcast Notification</span>
          </Link>

          <Link
            href="/admin/blacklist"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors shadow-xs"
            title="View blacklist rules, banned IPs, device signatures, and sanction engine"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Blacklist & Bans</span>
          </Link>

          <div className="text-xs font-bold bg-[#FDF2F4] px-4 py-2 rounded-full text-[#7B1E4B] border-0">
            Total Creators: {creators.length}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-black absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search creator by alias, email, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-full border border-neutral-300 focus:outline-none focus:border-[#7B1E4B] bg-white font-medium"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-black">
            Registered Creators ({filtered.length})
          </h2>
          <span className="text-xs font-bold text-[#7B1E4B] bg-[#FDF2F4] px-3 py-1 rounded-full border-0">Page Turning Creators</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-black text-xs font-medium">Loading creators...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-black text-xs font-medium">No creators found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-medium">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-black font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 sm:px-6">Creator</th>
                  <th className="py-3.5 px-4">Focus & Country</th>
                  <th className="py-3.5 px-4">30s Audition Status</th>
                  <th className="py-3.5 px-4">Submissions</th>
                  <th className="py-3.5 px-4">Financials</th>
                  <th className="py-3.5 px-4">Payout Account</th>
                  <th className="py-3.5 px-4">Milestone</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((c) => {
                  const sampleStatus = c.sample_status || 'NOT_SUBMITTED';
                  const pInfo = formatCreatorPayoutInfo(c);

                  return (
                    <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="font-bold text-black text-sm flex items-center gap-1.5">
                          <span>{c.display_name}</span>
                          {sampleStatus === 'APPROVED' && <VerifiedBadge size={16} />}
                          {c.is_banned && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-black font-medium">{c.email}</div>
                        <div className="text-[10px] text-neutral-500 font-bold">
                          Joined: {new Date(c.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-black">{c.country}</div>
                        <div className="text-[10px] uppercase font-bold text-[#7B1E4B]">
                          Page Turning
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1.5">
                          {sampleStatus === 'APPROVED' ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDF2F4] text-[#7B1E4B] border-0">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-[#7B1E4B]" />
                                Audition Approved
                              </span>
                              <div>
                                {c.stats?.sampleBonusPaid ? (
                                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                                    ✓ $1 Bonus Paid Out
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={payingSampleId === c.id}
                                    onClick={() => handleMarkSamplePaid(c.id, c.display_name)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-all disabled:opacity-50"
                                    title="Click once the $1 audition bonus has been sent to creator's local bank"
                                  >
                                    <DollarSign className="w-3 h-3" />
                                    {payingSampleId === c.id ? 'Marking Paid...' : 'Mark $1 Paid Out'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : sampleStatus === 'PENDING_REVIEW' ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF0F5] text-[#7B1E4B] border-0">
                                <Clock className="w-3 h-3 mr-1 text-[#7B1E4B]" />
                                Audition Pending
                              </span>
                              <div>
                                <button
                                  type="button"
                                  disabled={approvingId === c.id}
                                  onClick={() => handleApproveAudition(c.id)}
                                  className="px-2.5 py-1 rounded-full bg-[#7B1E4B] text-white text-[10px] font-bold hover:bg-[#63183C] disabled:opacity-50 border-0"
                                >
                                  {approvingId === c.id ? 'Approving...' : '1-Click Approve'}
                                </button>
                              </div>
                            </div>
                          ) : sampleStatus === 'REVISION_REQUESTED' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF0F4] text-[#7B1E4B] border-0">
                              Revision Requested
                            </span>
                          ) : sampleStatus === 'REJECTED' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDF2F4] text-[#993352] line-through border-0">
                              Rejected
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDF2F4] text-[#7B1E4B] border-0">
                                Not Submitted
                              </span>
                              <div>
                                <button
                                  type="button"
                                  disabled={approvingId === c.id}
                                  onClick={() => handleApproveAudition(c.id)}
                                  className="px-2.5 py-0.5 rounded-full bg-[#FDF2F4] text-[#7B1E4B] text-[10px] font-bold hover:bg-[#F8E2EC] disabled:opacity-50 border-0"
                                >
                                  Pre-Approve
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-black">
                          {c.stats?.approvedFullCount ?? c.stats?.approvedCount ?? 0} full approved
                        </div>
                        <div className="text-[11px] text-neutral-600 font-medium">
                          {c.stats?.pendingCount || 0} in review • {c.stats?.totalSubmissions || 0} total
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-serif text-sm font-bold text-black">
                          Available: ${c.stats?.availablePayoutBalance?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-[10px] text-neutral-600 font-bold">
                          Paid: ${c.stats?.totalPaid?.toFixed(2) || '0.00'}
                        </div>
                      </td>

                      {/* Payout Account Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {!pInfo.isConfigured ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
                              Not Configured
                            </span>
                            <div>
                              <button
                                type="button"
                                onClick={() => setPayoutModalCreator(c)}
                                className="text-[10px] text-neutral-500 hover:text-black hover:underline font-medium"
                              >
                                View details
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${pInfo.badgeColor}`}
                              >
                                {pInfo.badgeLabel}
                              </span>
                            </div>

                            {pInfo.accountNumber ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold text-black tracking-tight">
                                  {pInfo.accountNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyAccount(c.id, pInfo.accountNumber!)}
                                  title="Copy Account Number"
                                  className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
                                >
                                  {copiedAccountId === c.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : pInfo.email ? (
                              <div className="text-[11px] font-mono text-neutral-700 truncate max-w-[140px]">
                                {pInfo.email}
                              </div>
                            ) : null}

                            {pInfo.accountName && (
                              <div className="text-[10px] text-neutral-600 font-medium truncate max-w-[150px]">
                                {pInfo.accountName}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setPayoutModalCreator(c)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7B1E4B] hover:text-[#63183C] hover:underline"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Full Payout Details</span>
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const approvedFull = c.stats?.approvedFullCount ?? c.stats?.approvedCount ?? 0;
                          const eligible = c.stats?.eligibleCount || 0;
                          const minReq = c.stats?.minRequired || 8;
                          const paidCount = c.stats?.paidCount || 0;
                          const reservedCount = c.stats?.reservedCount || 0;

                          if (eligible >= minReq) {
                            return (
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-[#7B1E4B] text-white border-0 shadow-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Ready for Payout ({eligible}/{minReq})
                                </span>
                                {approvedFull > eligible && (
                                  <div className="text-[10px] text-neutral-600 font-medium">
                                    {approvedFull} total approved
                                  </div>
                                )}
                              </div>
                            );
                          }
                          if (paidCount >= minReq || (approvedFull >= minReq && eligible === 0)) {
                            return (
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-700 text-white border-0 shadow-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Milestone Completed ({approvedFull}/{minReq})
                                </span>
                                <div className="text-[10px] text-neutral-600 font-medium">
                                  {paidCount > 0 ? `${paidCount} videos paid` : ''} {reservedCount > 0 ? `• ${reservedCount} processing` : ''}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold text-[#7B1E4B] bg-[#FDF2F4] border-0">
                                <Clock className="w-3 h-3 mr-1 text-[#7B1E4B]" />
                                {approvedFull} of {minReq} approved
                              </span>
                              {eligible < approvedFull && eligible > 0 && (
                                <div className="text-[10px] text-neutral-500 font-medium">
                                  ({eligible} unpaid available)
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPayoutModalCreator(c)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FDF2F4] hover:bg-[#F8E2EC] text-[#7B1E4B] text-xs font-bold transition-colors border-0 shadow-xs"
                            title="View Creator's Complete Payout & Banking Info"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Payout</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNotifyCreator(c);
                              setNotifTitle(`Message from The Pink Room Editorial`);
                              setNotifMessage('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FDF2F4] hover:bg-[#F8E2EC] text-[#7B1E4B] text-xs font-bold transition-colors border-0 shadow-xs"
                            title="Push custom notification & email to this creator"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Notify</span>
                          </button>

                          {c.is_banned ? (
                            <button
                              type="button"
                              onClick={() => handleUnban(c)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors border-0 shadow-xs"
                              title="Lift permanent ban"
                            >
                              <span>Unban</span>
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border-0 shadow-xs"
                              title="Permanently ban creator, IP and device"
                            >
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Ban</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={deletingId === c.id}
                            onClick={() => handleDeleteCreator(c)}
                            className="inline-flex items-center p-1.5 rounded-full bg-[#FDF2F4] text-rose-600 hover:bg-rose-100 text-xs font-bold transition-colors border-0 disabled:opacity-50"
                            title="Remove creator account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct Push Modal */}
      {notifyCreator && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#fff9fb] rounded-2xl border border-[#f2e3e8] max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in text-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-black flex items-center gap-2">
                  <Bell className="w-4 h-4 text-black" />
                  <span>Push Notification to Creator</span>
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  {notifyCreator.display_name} ({notifyCreator.email})
                </p>
              </div>
              <button
                onClick={() => setNotifyCreator(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendDirectNotification} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-black block">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-medium text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-black block">
                  Category
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-black focus:outline-none focus:border-black"
                >
                  <option value="SYSTEM">System Alert</option>
                  <option value="REVIEW">Review / Audio Quality</option>
                  <option value="PAYOUT">Payout & Earnings</option>
                  <option value="GENERAL">General Announcement</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-black block">
                  Message Body
                </label>
                <textarea
                  required
                  rows={4}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Type message body that will be delivered to the creator's bell icon and email..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-medium text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-black block">
                  Target Link (Optional)
                </label>
                <input
                  type="text"
                  value={notifLink}
                  onChange={(e) => setNotifLink(e.target.value)}
                  placeholder="/creator/upload"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-medium text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-black">
                  <input
                    type="checkbox"
                    checked={notifSendEmail}
                    onChange={(e) => setNotifSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-black accent-black"
                  />
                  <span>Also dispatch transactional email to {notifyCreator.email}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setNotifyCreator(null)}
                  className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={notifSending || !notifTitle.trim() || !notifMessage.trim()}
                  className="px-5 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {notifSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{notifSending ? 'Sending...' : 'Send Notification'}</span>
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

      {/* Ban Creator & Blacklist Modal */}
      {banningCreator && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#18121B] rounded-2xl border border-rose-500/30 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <span>Enforce Ban & Blacklist</span>
                </h3>
                <p className="text-xs text-neutral-400 font-medium">
                  {banningCreator.display_name} ({banningCreator.email})
                </p>
              </div>
              <button
                onClick={() => setBanningCreator(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteBan} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 leading-relaxed">
                This will permanently ban <strong className="text-white">{banningCreator.display_name}</strong>, terminate all sessions, blacklist their payment accounts/NUBANs, and block their IP and device from accessing The Pink Room.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                  Enforcement Reason
                </label>
                <input
                  type="text"
                  required
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                    Custom IP Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={banCustomIp}
                    onChange={(e) => setBanCustomIp(e.target.value)}
                    placeholder="e.g. 102.89.45.12"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                    Device Signature (Optional)
                  </label>
                  <input
                    type="text"
                    value={banCustomDevice}
                    onChange={(e) => setBanCustomDevice(e.target.value)}
                    placeholder="e.g. TECNO KM4"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setBanningCreator(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-xs font-bold text-neutral-300 hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBan || !banReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-rose-950/50"
                >
                  {submittingBan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  <span>{submittingBan ? 'Enforcing...' : 'Enforce Ban & Blacklist'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
