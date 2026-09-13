'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  CheckCircle2,
  Lock,
  ArrowRight,
  CreditCard,
  Building2,
  ChevronDown,
  Plus,
  Minus,
  Sparkles,
  Video,
} from 'lucide-react';
import { PayoutRequest, PaymentMethodType } from '@/types';
import { useToast } from '@/components/ToastProvider';

export default function CreatorPayoutsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PROCESSING' | 'PAID'>('ALL');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Request payout modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<PaymentMethodType>('WISE');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, profileRes, payoutsRes] = await Promise.all([
          fetch('/api/creator/stats', { cache: 'no-store' }),
          fetch('/api/creator/profile', { cache: 'no-store' }),
          fetch('/api/payouts', { cache: 'no-store' }),
        ]);

        const [statsData, profileData, payoutsData] = await Promise.all([
          statsRes.json().catch(() => ({})),
          profileRes.json().catch(() => ({})),
          payoutsRes.json().catch(() => ({})),
        ]);

        if (statsData) setStats(statsData.stats || statsData);
        if (profileData?.profile) setProfile(profileData.profile);
        if (payoutsData?.payouts) setPayouts(payoutsData.payouts);
      } catch (err) {
        console.error('Failed to load payouts data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const rate = profile?.rate_per_video_usd || 50;
  const threshold = profile?.payout_min_videos || 8;
  const minPayout = threshold * rate;

  const approvedCount = stats?.approved_count ?? stats?.approvedCount ?? 0;
  const approvedUnpaidCount = stats?.approved_unpaid_count ?? stats?.approvedUnpaidCount ?? 0;
  const availableBalance = stats?.available_balance ?? stats?.availableBalance ?? (approvedUnpaidCount * rate);
  const reservedAmount = stats?.reserved_amount ?? stats?.reservedAmount ?? 0;
  const totalDisbursed = stats?.total_paid ?? stats?.totalPaid ?? stats?.total_disbursed ?? 0;

  const canRequest = approvedUnpaidCount >= threshold;

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  const filteredPayouts = payouts.filter((p) => {
    if (activeTab === 'PROCESSING') return p.status === 'REQUESTED' || p.status === 'PROCESSING';
    if (activeTab === 'PAID') return p.status === 'PAID';
    return true;
  });

  const paymentPreferenceName = profile?.payment_method
    ? profile.payment_method.replace('_', ' ')
    : 'No preference selected';

  const handleRequestPayout = async () => {
    if (!canRequest) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: availableBalance,
          paymentMethod: profile?.payment_method || method,
          paymentDetails: profile?.payment_details || { destination },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payout request');
      toast.success('Your payout request has been sent for review.', 'Payout requested');
      setIsModalOpen(false);
      // Refresh
      const pRes = await fetch('/api/payouts', { cache: 'no-store' });
      const pData = await pRes.json();
      if (pData?.payouts) setPayouts(pData.payouts);
    } catch (e: any) {
      toast.error(e.message || 'Could not request payout', 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <main className="max-w-[1100px] mx-auto px-3 sm:px-4 lg:px-4 py-8 sm:py-12 space-y-8 sm:space-y-10">

        {/* ─── Page Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-1">
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-[11px] tracking-[0.22em] font-bold text-[#7B1E4B] dark:text-[#F472B6] uppercase">
              YOUR EARNINGS, SIMPLY
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] font-normal tracking-tight text-neutral-900 dark:text-white leading-tight">
              Your creativity.{' '}
              <span className="italic font-serif text-[#7B1E4B] dark:text-[#F472B6]">
                Your earnings.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
              Track your balance and follow every payout, from request to receipt.
            </p>
          </div>

          <Link
            href="/creator/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-200/90 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors self-start sm:self-auto shadow-2xs"
          >
            <span>Payment preferences</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ─── Top Grid (Available to Withdraw + Milestone Progress) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left: Available to withdraw */}
          <div className="lg:col-span-5 bg-[#130E14] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between text-[10px] tracking-[0.2em] font-bold text-white/50 uppercase">
                <span>AVAILABLE TO WITHDRAW</span>
                <Wallet className="w-4 h-4 text-white/40" />
              </div>

              <div className="mt-6 flex items-baseline">
                <span className="font-serif text-4xl sm:text-5xl font-normal text-white">
                  ${availableBalance.toFixed(2)}
                </span>
                <span className="text-xs font-sans text-white/50 ml-1.5 font-medium tracking-wide">
                  USD
                </span>
              </div>

              <p className="text-xs text-white/60 mt-2 font-normal">
                {approvedUnpaidCount} approved, unpaid full videos
              </p>
            </div>

            <div>
              {canRequest ? (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 px-4 rounded-full bg-[#7B1E4B] hover:bg-[#63143B] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Request payout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-4 rounded-full bg-white/20 text-white/50 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-white/40" />
                  <span>Request payout</span>
                </button>
              )}
              <p className="text-[10px] text-white/40 text-center mt-2.5 font-medium">
                Unlocks at {threshold} approved, unpaid videos.
              </p>
            </div>
          </div>

          {/* Right: Progress Milestones ("Your First $400") */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-5 shadow-2xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] tracking-[0.2em] font-bold text-[#7B1E4B] dark:text-[#F472B6] uppercase">
                  YOUR FIRST ${minPayout}
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700">
                  {Math.min(approvedCount, threshold)} of {threshold} approved
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white mt-3 leading-snug">
                Every recording brings you{' '}
                <span className="italic text-[#7B1E4B] dark:text-[#F472B6]">closer.</span>
              </h2>

              {/* Milestone Steps */}
              <div className={`grid gap-1.5 sm:gap-2 mt-5`} style={{ gridTemplateColumns: `repeat(${threshold}, minmax(0, 1fr))` }}>
                {Array.from({ length: threshold }, (_, i) => i + 1).map((step) => {
                  const isDone = approvedCount >= step;
                  return (
                    <div
                      key={step}
                      className={`h-9 sm:h-10 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        isDone
                          ? 'bg-[#7B1E4B] text-white font-bold shadow-2xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 font-medium'
                      }`}
                    >
                      {String(step).padStart(2, '0')}
                    </div>
                  );
                })}
              </div>

              {/* Range indicators */}
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
                <span>${(approvedCount * rate).toFixed(0)} earned</span>
                <span>${minPayout} minimum</span>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3 font-normal leading-relaxed">
                {Math.max(0, threshold - approvedCount)} more approved full videos to go. Audition samples don't count toward your payout.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/creator/upload"
                className="text-xs font-semibold text-[#7B1E4B] dark:text-[#F472B6] hover:underline inline-flex items-center gap-1.5"
              >
                <span>Add your next recording</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Middle 3-Column Metric Cards (Creator Dashboard Grid Style) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 divide-y md:divide-y-0 md:divide-x divide-neutral-200/90 dark:divide-neutral-800 overflow-hidden">
          {/* Card 1: Reserved */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Reserved in payout</span>
              <Lock className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              ${reservedAmount.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Held while a payment is processing
            </div>
          </div>

          {/* Card 2: Total Disbursed */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Total disbursed</span>
              <Wallet className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              ${totalDisbursed.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Confirmed payments to date
            </div>
          </div>

          {/* Card 3: Rate */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Your locked-in rate</span>
              <Video className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              ${rate.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Per approved full video
            </div>
          </div>
        </div>

        {/* ─── Bottom 2-Column Section (History + Payment Preference) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">

          {/* Left: Payout History (col-span-7) */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
                Payout history{' '}
                <sup className="font-sans text-[10px] text-neutral-400">
                  {String(filteredPayouts.length).padStart(2, '0')}
                </sup>
              </h3>
              <span className="text-[11px] text-neutral-400 font-medium">
                All amounts in USD
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-5 text-xs font-medium border-b border-neutral-100 dark:border-neutral-800">
              {(['ALL', 'PROCESSING', 'PAID'] as const).map((tab) => {
                const label = tab === 'ALL' ? 'All payouts' : tab === 'PROCESSING' ? 'Processing' : 'Paid';
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 transition-colors border-b-2 ${
                      isActive
                        ? 'border-[#7B1E4B] text-[#7B1E4B] dark:text-[#F472B6] font-bold'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Content / Empty state */}
            {filteredPayouts.length === 0 ? (
              <div className="py-12 sm:py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#FCEBF2] dark:bg-[#25151F] text-[#7B1E4B] dark:text-[#F472B6] flex items-center justify-center mx-auto shadow-2xs">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="font-serif text-xl font-normal text-neutral-900 dark:text-white">
                  Your first payout is ahead.
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Once you request a payout, its status and payment reference will appear here.
                </p>
                <div className="pt-2">
                  <Link
                    href="/creator/videos"
                    className="text-xs font-semibold text-[#7B1E4B] dark:text-[#F472B6] hover:underline inline-flex items-center gap-1"
                  >
                    <span>View your submissions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredPayouts.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-white">
                        ${Number(p.amount_usd || 0).toFixed(2)} USD
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {new Date(p.requested_at || Date.now()).toLocaleDateString()} · {p.payment_method}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              {filteredPayouts.length} payouts
            </div>
          </div>

          {/* Right: Payment Preference (col-span-5) */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs">
            <div>
              <div className="text-[10px] tracking-[0.2em] font-bold text-neutral-400 dark:text-neutral-500 uppercase">
                HOW YOU GET PAID
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white mt-1">
                Payment preference
              </h3>
            </div>

            <div className="pt-2 pb-1 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#FCEBF2] dark:bg-[#25151F] text-[#7B1E4B] dark:text-[#F472B6] flex items-center justify-center shadow-2xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-900 dark:text-white capitalize">
                  {paymentPreferenceName}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Choose a payment preference in Settings. No payment account is connected in this preview.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/creator/settings"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-200/90 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors shadow-2xs"
                >
                  <span>Manage preference</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 pt-3 border-t border-neutral-100 dark:border-neutral-800 font-normal">
              Bank details are managed in your existing creator account.
            </p>
          </div>

        </div>

        {/* ─── Accordion FAQ: "A Little Clarity - Good to know." ────── */}
        <div className="pt-8 border-t border-neutral-200/70 dark:border-neutral-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-1">
            <div className="text-[10px] tracking-[0.22em] font-bold text-[#7B1E4B] dark:text-[#F472B6] uppercase">
              A LITTLE CLARITY
            </div>
            <h2 className="font-serif text-3xl font-normal text-neutral-900 dark:text-white">
              Good to know.
            </h2>
          </div>

          <div className="lg:col-span-8 divide-y divide-neutral-200/70 dark:divide-neutral-800">
            {/* Question 1 */}
            <div className="py-4">
              <button
                type="button"
                onClick={() => toggleFaq(1)}
                className="w-full flex items-center justify-between text-left text-sm sm:text-base font-serif font-normal text-neutral-900 dark:text-white hover:text-[#7B1E4B] transition-colors py-1"
              >
                <span>When can I request a payout?</span>
                <span className="ml-4 text-neutral-400">
                  {openFaq === 1 ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>
              {openFaq === 1 && (
                <div className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed animate-in fade-in duration-150 pr-8">
                  You can request a payout as soon as you have at least {threshold} approved full-production recordings (${minPayout.toFixed(2)} minimum threshold). Once reached, the Request Payout button unlocks automatically.
                </div>
              )}
            </div>

            {/* Question 2 */}
            <div className="py-4">
              <button
                type="button"
                onClick={() => toggleFaq(2)}
                className="w-full flex items-center justify-between text-left text-sm sm:text-base font-serif font-normal text-neutral-900 dark:text-white hover:text-[#7B1E4B] transition-colors py-1"
              >
                <span>What does "reserved in payout" mean?</span>
                <span className="ml-4 text-neutral-400">
                  {openFaq === 2 ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>
              {openFaq === 2 && (
                <div className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed animate-in fade-in duration-150 pr-8">
                  When you submit a payout request, that balance moves to 'Reserved in payout' while our finance team processes the wire, transfer, or mobile money disbursement. Once settled, it moves to 'Total disbursed'.
                </div>
              )}
            </div>

            {/* Question 3 */}
            <div className="py-4">
              <button
                type="button"
                onClick={() => toggleFaq(3)}
                className="w-full flex items-center justify-between text-left text-sm sm:text-base font-serif font-normal text-neutral-900 dark:text-white hover:text-[#7B1E4B] transition-colors py-1"
              >
                <span>Why doesn't my audition count?</span>
                <span className="ml-4 text-neutral-400">
                  {openFaq === 3 ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>
              {openFaq === 3 && (
                <div className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed animate-in fade-in duration-150 pr-8">
                  The initial 30-second audition is a quality & framing check to ensure your setup meets production standards. All subsequent approved full recordings earn ${rate.toFixed(2)} flat rate each.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Bottom Note & Summary Bar ────────────────────────────── */}
        <div className="pt-4 space-y-6">
          <p className="text-[11px] text-neutral-400 text-center font-normal">
            Balances reflect your verified submissions. Payouts are reviewed and disbursed according to your payment preferences.
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-neutral-400 font-medium tracking-wide">
            <span>${rate} flat rate.</span>
            <span>·</span>
            <span>{threshold}-video minimum.</span>
            <span>·</span>
            <span>Your work. Your earnings.</span>
          </div>
        </div>

      </main>

      {/* Payout Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="font-serif text-2xl font-normal text-neutral-900 dark:text-white">
              Request Payout
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              You are requesting a payout for your available balance of{' '}
              <strong className="text-neutral-900 dark:text-white">
                ${availableBalance.toFixed(2)} USD
              </strong>
              .
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRequestPayout}
                className="px-5 py-2 rounded-full bg-[#7B1E4B] hover:bg-[#63143B] text-white text-xs font-semibold shadow-sm"
              >
                {submitting ? 'Submitting...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
