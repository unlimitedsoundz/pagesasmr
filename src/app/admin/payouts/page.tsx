'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Landmark,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  XCircle,
  FileText,
  Film,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Search,
  Gift,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import CreatorPayoutModal from '@/components/CreatorPayoutModal';
import { formatCreatorPayoutInfo } from '@/lib/payoutDetails';
import { PayoutRequest } from '@/types';
import { useToast } from '@/components/ToastProvider';
import { getLocalCurrency, formatLocalFx } from '@/lib/currency';

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'VIDEOS' | 'REFERRALS' | 'PAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  // Modals
  const [activePayout, setActivePayout] = useState<PayoutRequest | null>(null);
  const [detailPayout, setDetailPayout] = useState<PayoutRequest | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success(`Copied: ${text}`);
  };

  const [actionModal, setActionModal] = useState<'CONFIRM_PAID' | 'CANCEL' | 'REFUND' | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadPayouts = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch('/api/payouts', { cache: 'no-store' });
      const data = await res.json();
      if (data?.payouts) {
        setPayouts(data.payouts);
      }
    } catch (e) {
      console.error('Error loading payouts:', e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load + background polling every 8s so new requests appear in real time
  useEffect(() => {
    loadPayouts(false);
    const interval = setInterval(() => {
      loadPayouts(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkProcessing = async (payoutId: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_PROCESSING' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payout');
      loadPayouts(true);
      toast.success(`Payout #${payoutId} moved to Processing status`);
      window.dispatchEvent(new CustomEvent('notification-updated'));
      try {
        const bc = new BroadcastChannel('pages_notifications_sync');
        bc.postMessage({ type: 'PAYOUT_PROCESSING', payoutId });
        bc.close();
      } catch {}
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayout) return;
    const finalRef = paymentReference.trim() || `BANK-APP-${Date.now().toString(36).toUpperCase()}`;
    setProcessing(true);
    setModalError('');
    try {
      const res = await fetch(`/api/payouts/${activePayout.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CONFIRM_PAID', paymentReference: finalRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve payout');
      setActionModal(null);
      setActivePayout(null);
      loadPayouts(true);
      toast.success(`Payout #${activePayout.id} approved & marked completed (Ref: ${finalRef})!`);
      window.dispatchEvent(new CustomEvent('notification-updated'));
      try {
        const bc = new BroadcastChannel('pages_notifications_sync');
        bc.postMessage({ type: 'PAYOUT_PAID', payoutId: activePayout.id });
        bc.close();
      } catch {}
    } catch (err: any) {
      setModalError(err.message || 'Error approving payout');
      toast.error(err.message || 'Error approving payout');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayout) return;
    if (!cancelReason || cancelReason.trim().length === 0) {
      setModalError('A cancellation reason is required.');
      return;
    }
    setProcessing(true);
    setModalError('');
    try {
      const res = await fetch(`/api/payouts/${activePayout.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel payout');
      setActionModal(null);
      setActivePayout(null);
      loadPayouts(true);
      toast.warning(`Payout #${activePayout.id} cancelled. Reserved earnings restored.`);
    } catch (err: any) {
      setModalError(err.message || 'Error cancelling payout');
      toast.error(err.message || 'Error cancelling payout');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefundPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayout) return;
    if (!refundReason || refundReason.trim().length === 0) {
      setModalError('A refund reason is required.');
      return;
    }
    setProcessing(true);
    setModalError('');
    try {
      const res = await fetch(`/api/payouts/${activePayout.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REFUND', reason: refundReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to refund payout');
      setActionModal(null);
      setActivePayout(null);
      loadPayouts(true);
      toast.success(`Payout #${activePayout.id} refunded. $${activePayout.amount_usd.toFixed(2)} restored!`);
      window.dispatchEvent(new CustomEvent('notification-updated'));
      try {
        const bc = new BroadcastChannel('pages_notifications_sync');
        bc.postMessage({ type: 'PAYOUT_REFUNDED', payoutId: activePayout.id });
        bc.close();
      } catch {}
    } catch (err: any) {
      setModalError(err.message || 'Error refunding payout');
      toast.error(err.message || 'Error refunding payout');
    } finally {
      setProcessing(false);
    }
  };

  const pendingPayouts = payouts.filter((p) => ['REQUESTED', 'PROCESSING'].includes(p.status));
  const pendingCount = pendingPayouts.length;
  const pendingTotalUsd = pendingPayouts.reduce((sum, p) => sum + p.amount_usd, 0);

  const videoPayouts = payouts.filter(
    (p) => !(p.payout_type === 'REFERRAL' || (p.video_count === 0 && (!p.submission_ids || p.submission_ids.length === 0)))
  );
  const referralPayouts = payouts.filter(
    (p) => p.payout_type === 'REFERRAL' || (p.video_count === 0 && (!p.submission_ids || p.submission_ids.length === 0))
  );
  const paidPayouts = payouts.filter((p) => p.status === 'PAID');
  const totalPaidUsd = paidPayouts.reduce((sum, p) => sum + p.amount_usd, 0);

  // Apply tab filter & search
  const filteredPayouts = payouts.filter((p) => {
    const isReferral =
      p.payout_type === 'REFERRAL' ||
      (p.video_count === 0 && (!p.submission_ids || p.submission_ids.length === 0));

    if (filterTab === 'PENDING' && !['REQUESTED', 'PROCESSING'].includes(p.status)) return false;
    if (filterTab === 'VIDEOS' && isReferral) return false;
    if (filterTab === 'REFERRALS' && !isReferral) return false;
    if (filterTab === 'PAID' && p.status !== 'PAID') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.creator_name || '').toLowerCase().includes(q);
      const matchEmail = (p.creator_email || '').toLowerCase().includes(q);
      const matchDest = (p.payment_destination || '').toLowerCase().includes(q);
      const matchRef = (p.payment_reference || '').toLowerCase().includes(q);
      const matchId = (p.id || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDest && !matchRef && !matchId) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / (pageSize === -1 ? filteredPayouts.length || 1 : pageSize)));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPayouts = filteredPayouts.slice(startIndex, startIndex + pageSize);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-5 text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-black leading-tight flex items-center gap-2">
            <span>Payout Queue</span>
            {refreshing && <RefreshCw className="w-3.5 h-3.5 text-neutral-400 animate-spin" />}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/testimonials"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors shadow-2xs"
          >
            <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
            <span>Review Testimonials</span>
          </Link>
          <button
            type="button"
            onClick={() => loadPayouts(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {pendingCount > 0 && (
            <div className="flex-shrink-0 bg-[#7B1E4B] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xs">
              {pendingCount} Pending (${pendingTotalUsd.toFixed(2)})
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-neutral-500">Pending Liability</div>
          <div className="font-serif text-base sm:text-lg font-bold text-[#7B1E4B] mt-0.5">
            ${pendingTotalUsd.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-500">{pendingCount} requests</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-neutral-500">Video Payouts</div>
          <div className="font-serif text-base sm:text-lg font-bold text-neutral-900 mt-0.5">
            {videoPayouts.length}
          </div>
          <div className="text-[10px] text-neutral-500">{videoPayouts.filter(p => ['REQUESTED', 'PROCESSING'].includes(p.status)).length} pending</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-neutral-500">Referral Payouts</div>
          <div className="font-serif text-base sm:text-lg font-bold text-amber-700 mt-0.5">
            {referralPayouts.length}
          </div>
          <div className="text-[10px] text-neutral-500">{referralPayouts.filter(p => ['REQUESTED', 'PROCESSING'].includes(p.status)).length} pending</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-neutral-500">Total Paid Out</div>
          <div className="font-serif text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
            ${totalPaidUsd.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-500">{paidPayouts.length} completed</div>
        </div>
      </div>

      {/* Search Input (matches screenshot) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payouts by creator name, email, or destination..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400 bg-white placeholder:text-neutral-400 transition-colors shadow-2xs"
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 pb-0.5">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
              filterTab === 'ALL' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            All ({payouts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('PENDING')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
              filterTab === 'PENDING' ? 'bg-[#7B1E4B] text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('VIDEOS')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
              filterTab === 'VIDEOS' ? 'bg-purple-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            🎬 Videos ({videoPayouts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('REFERRALS')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
              filterTab === 'REFERRALS' ? 'bg-amber-800 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            🎁 Referrals ({referralPayouts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('PAID')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
              filterTab === 'PAID' ? 'bg-emerald-700 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Paid ({paidPayouts.length})
          </button>
        </div>
      </div>

      {/* Payout Accordion Table */}
      {loading ? (
        <div className="py-16 text-center bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="inline-block w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-neutral-500 mt-2">Loading payouts queue...</p>
        </div>
      ) : filteredPayouts.length === 0 ? (
        <div className="py-16 text-center text-xs font-medium text-neutral-500 bg-white rounded-xl border border-neutral-200 shadow-2xs p-8">
          No payout requests found in this view.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-neutral-200 text-xs font-medium text-neutral-500 bg-white select-none">
            <div className="col-span-4">Creator</div>
            <div className="col-span-2">Type / Source</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-2 text-right pr-6">Status</div>
          </div>

          {/* Table Accordion Rows */}
          <div className="divide-y divide-neutral-100">
            {paginatedPayouts.map((p) => {
              const pInfo = formatCreatorPayoutInfo(p);
              const isExpanded = expandedId === p.id;
              const localCurrency = getLocalCurrency((p as any).creator_country, p.payment_method);
              const hasLocalFx = localCurrency.code !== 'USD';
              const isReferral =
                p.payout_type === 'REFERRAL' ||
                (p.video_count === 0 && (!p.submission_ids || p.submission_ids.length === 0));

              return (
                <div key={p.id} className="transition-colors">
                  {/* Row Trigger */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="w-full text-left px-4 sm:px-6 py-3.5 hover:bg-neutral-50/70 transition-colors flex items-center justify-between group"
                  >
                    {/* Desktop Columns */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center w-full">
                      {/* Creator */}
                      <div className="col-span-4 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-neutral-900 truncate">{p.creator_name || 'Creator'}</span>
                          <VerifiedBadge size={14} />
                        </div>
                        <p className="text-xs text-neutral-500 font-normal truncate">{p.creator_email}</p>
                      </div>

                      {/* Type / Source */}
                      <div className="col-span-2 min-w-0">
                        {isReferral ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-700 truncate">
                            <Gift className="w-3 h-3 shrink-0" />
                            <span>Referral</span>
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-neutral-700 truncate block">
                            {p.video_count} videos ({p.payment_method?.replace(/_/g, ' ') || 'Bank / Transfer'})
                          </span>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="col-span-3 min-w-0">
                        <p className="text-xs text-neutral-900 font-mono font-semibold truncate">
                          ${p.amount_usd.toFixed(2)} USD
                        </p>
                        {hasLocalFx && (
                          <p className="text-[11px] text-neutral-500 truncate">
                            ≈ {formatLocalFx(p.amount_usd, localCurrency)}
                          </p>
                        )}
                      </div>

                      {/* Date */}
                      <div className="col-span-1 text-xs text-neutral-500 font-normal truncate">
                        {p.requested_at ? new Date(p.requested_at).toISOString().split('T')[0] : '—'}
                      </div>

                      {/* Status & Purple Chevron */}
                      <div className="col-span-2 flex items-center justify-end gap-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {p.status === 'PAID' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50 shrink-0" />
                              <span className="text-xs font-medium text-neutral-800">Completed</span>
                            </>
                          ) : p.status === 'PROCESSING' ? (
                            <>
                              <Clock className="w-4 h-4 text-amber-500 fill-amber-50 shrink-0 animate-pulse" />
                              <span className="text-xs font-medium text-neutral-800">Processing</span>
                            </>
                          ) : p.status === 'REQUESTED' ? (
                            <>
                              <Clock className="w-4 h-4 text-amber-500 fill-amber-50 shrink-0" />
                              <span className="text-xs font-medium text-neutral-800">Pending Review</span>
                            </>
                          ) : p.status === 'REFUNDED' ? (
                            <>
                              <XCircle className="w-4 h-4 text-neutral-500 shrink-0" />
                              <span className="text-xs font-medium text-neutral-800">Refunded</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="text-xs font-medium text-neutral-800">Rejected</span>
                            </>
                          )}
                        </div>

                        {p.status === 'PAID' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePayout(p);
                              setActionModal('REFUND');
                              setRefundReason('');
                              setModalError('');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-[11px] font-bold text-neutral-700 transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
                            title="Refund completed payout"
                          >
                            <RotateCcw className="w-3 h-3 text-neutral-600" />
                            <span>Refund</span>
                          </button>
                        )}

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
                          <span className="font-semibold text-sm text-neutral-900 truncate">{p.creator_name || 'Creator'}</span>
                          <VerifiedBadge size={14} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                          <span className="font-semibold text-black">${p.amount_usd.toFixed(2)}</span>
                          <span>•</span>
                          <span className="truncate">{p.creator_email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {p.status === 'PAID' ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePayout(p);
                                setActionModal('REFUND');
                                setRefundReason('');
                                setModalError('');
                              }}
                              className="px-2 py-0.5 rounded border border-neutral-300 text-[10px] font-bold text-neutral-700"
                            >
                              Refund
                            </button>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                          </>
                        ) : p.status === 'PROCESSING' || p.status === 'REQUESTED' ? (
                          <Clock className="w-4 h-4 text-amber-500 fill-amber-50" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
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
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Email</p>
                        <p className="font-medium text-black truncate">{p.creator_email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Type</p>
                        <p className="font-medium text-black">
                          {isReferral ? (
                            <span className="font-bold text-amber-800 flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              <span>Referral Bonus Withdrawal</span>
                            </span>
                          ) : (
                            `${p.video_count} production videos`
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Requested</p>
                        <p className="font-medium text-black">{new Date(p.requested_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Method</p>
                        <p className="font-medium text-black">{p.payment_method}</p>
                      </div>
                    </div>

                    {/* Payment Destination (account / email) */}
                    <div className="p-3 bg-neutral-50 rounded-lg space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Destination</span>
                        {(pInfo.accountNumber || pInfo.email) && (
                          <button
                            type="button"
                            onClick={() => handleCopy(p.id, pInfo.accountNumber || pInfo.email || "")}
                            className="text-[11px] font-bold text-[#7B1E4B] hover:underline flex items-center gap-1"
                          >
                            {copiedKey === p.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === p.id ? 'Copied!' : 'Copy'}</span>
                          </button>
                        )}
                      </div>
                      <p className="font-mono text-xs font-semibold text-black break-all">
                        {p.payment_destination || 'Not specified'}
                      </p>
                    </div>

                    {/* Reference / Failure / Completed Info */}
                    {p.payment_reference && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-0.5 text-emerald-900">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Bank Reference</p>
                        <p className="font-mono font-bold">{p.payment_reference}</p>
                        {p.processed_at && (
                          <p className="text-[10px] text-emerald-600">Processed: {new Date(p.processed_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}

                    {p.failure_reason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-0.5 text-rose-900">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Reason</p>
                        <p>{p.failure_reason}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailPayout(p)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Inspect Details</span>
                      </button>

                      {p.status === 'REQUESTED' && (
                        <button
                          type="button"
                          onClick={() => handleMarkProcessing(p.id)}
                          disabled={processing}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Mark Processing</span>
                        </button>
                      )}

                      {['REQUESTED', 'PROCESSING'].includes(p.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePayout(p);
                            setActionModal('CONFIRM_PAID');
                            setPaymentReference('');
                            setModalError('');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Paid</span>
                        </button>
                      )}

                      {['REQUESTED', 'PROCESSING'].includes(p.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePayout(p);
                            setActionModal('CANCEL');
                            setCancelReason('');
                            setModalError('');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:border-neutral-400 text-xs font-semibold text-neutral-700 transition-colors"
                        >
                          Cancel
                        </button>
                      )}

                      {p.status === 'PAID' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePayout(p);
                            setActionModal('REFUND');
                            setRefundReason('');
                            setModalError('');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:border-neutral-400 text-xs font-semibold text-neutral-700 transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refund</span>
                        </button>
                      )}
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
            {filteredPayouts.length === 0
              ? '0 of 0'
              : `${startIndex + 1} to ${Math.min(startIndex + pageSize, filteredPayouts.length)} of ${filteredPayouts.length}`}
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

      {/* Modal: Confirm Paid */}
      {actionModal === 'CONFIRM_PAID' && activePayout && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#fff9fb] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 space-y-4 shadow-2xl border border-[#f2e3e8]">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-black">Confirm Payment</h3>
              <button type="button" onClick={() => setActionModal(null)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-[#f8e2ec] rounded-xl text-xs space-y-1 font-medium">
              <p>
                <strong>{activePayout.creator_name}</strong> — ${activePayout.amount_usd.toFixed(2)} USD (
                {activePayout.payout_type === 'REFERRAL' || activePayout.video_count === 0 ? 'Referral Bonus' : `${activePayout.video_count} videos`}
                )
              </p>
              <p className="font-mono text-neutral-700">{formatCreatorPayoutInfo(activePayout).accountNumber || formatCreatorPayoutInfo(activePayout).email}</p>
            </div>
            {modalError && (
              <div className="flex items-center gap-2 p-3 bg-neutral-100 border border-neutral-300 rounded-lg text-xs text-black">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{modalError}</span>
              </div>
            )}
            <form onSubmit={handleConfirmPaid} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Transfer Reference</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. TRF-20240926-001"
                  className="w-full px-3 py-2.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-black bg-white"
                />
                <p className="text-[10px] text-neutral-500 mt-1">Leave blank to auto-generate a reference code.</p>
              </div>
              <button type="submit" disabled={processing}
                className="w-full py-3 rounded-lg bg-black text-white font-bold text-xs transition-colors disabled:opacity-50">
                {processing ? 'Processing...' : 'Approve & Mark Completed'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Payout */}
      {actionModal === 'CANCEL' && activePayout && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#fff9fb] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 space-y-4 shadow-2xl border border-[#f2e3e8]">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-black">Cancel Payout</h3>
              <button type="button" onClick={() => setActionModal(null)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-black font-medium leading-relaxed">
              {activePayout.payout_type === 'REFERRAL' || activePayout.video_count === 0
                ? `Cancelling will release $${activePayout.amount_usd.toFixed(2)} referral bonus back to the creator's available balance.`
                : `Cancelling will release ${activePayout.video_count} reserved submissions ($${activePayout.amount_usd.toFixed(2)}) back to the creator's balance.`}
            </p>
            {modalError && (
              <div className="flex items-center gap-2 p-3 bg-neutral-100 border border-neutral-300 rounded-lg text-xs text-black">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{modalError}</span>
              </div>
            )}
            <form onSubmit={handleCancelPayout} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Cancellation Reason (Required)</label>
                <textarea rows={3} required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Invalid routing number; creator to update account details."
                  className="w-full p-3 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-black bg-white resize-none" />
              </div>
              <button type="submit" disabled={processing}
                className="w-full py-3 rounded-lg bg-black text-white font-bold text-xs disabled:opacity-50">
                {processing ? 'Releasing Funds...' : 'Confirm Cancellation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Refund */}
      {actionModal === 'REFUND' && activePayout && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#fff9fb] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 space-y-4 shadow-2xl border border-[#f2e3e8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <h3 className="font-serif text-lg font-bold text-black">Refund Payout</h3>
              </div>
              <button type="button" onClick={() => setActionModal(null)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-[#f8e2ec] rounded-xl text-xs space-y-1 font-medium">
              <p>
                <strong>{activePayout.creator_name}</strong> — ${activePayout.amount_usd.toFixed(2)} (
                {activePayout.payout_type === 'REFERRAL' || activePayout.video_count === 0 ? 'Referral Bonus' : `${activePayout.video_count} videos`}
                )
              </p>
              {activePayout.payment_reference && <p>Ref: {activePayout.payment_reference}</p>}
            </div>
            <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-lg text-[11px] text-neutral-600 space-y-1">
              <p className="font-bold text-black">Effect:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Status → <code>REFUNDED</code></li>
                <li>
                  {activePayout.payout_type === 'REFERRAL' || activePayout.video_count === 0
                    ? 'Referral bonus restored to creator available balance'
                    : `${activePayout.video_count} submissions unlocked to UNPAID`}
                </li>
                <li>Creator balance restored immediately</li>
                <li>Audit ledger updated</li>
              </ul>
            </div>
            {modalError && (
              <div className="flex items-center gap-2 p-3 bg-neutral-100 border border-neutral-300 rounded-lg text-xs text-black">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{modalError}</span>
              </div>
            )}
            <form onSubmit={handleRefundPayout} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Refund Reason (Required)</label>
                <textarea rows={3} required value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Bank wire bounced; creator submitted updated bank details."
                  className="w-full p-3 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-black bg-white resize-none" />
              </div>
              <button type="submit" disabled={processing}
                className="w-full py-3 rounded-lg bg-black text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                <RotateCcw className="w-3.5 h-3.5" />
                {processing ? 'Processing Refund...' : 'Confirm Refund & Restore Balance'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Full Creator Payout Details Modal */}
      <CreatorPayoutModal
        payout={detailPayout}
        isOpen={Boolean(detailPayout)}
        onClose={() => setDetailPayout(null)}
        onRefund={(p) => {
          setDetailPayout(null);
          setActivePayout(p);
          setActionModal('REFUND');
          setRefundReason('');
          setModalError('');
        }}
      />
    </div>
  );
}
