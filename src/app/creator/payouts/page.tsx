'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Landmark,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Lock,
  X,
  FileText,
  ArrowRight,
  Wallet,
  MessageSquare,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { PayoutRequest, PaymentMethodType } from '@/types';
import { useToast } from '@/components/ToastProvider';
import { NIGERIAN_BANKS } from '@/lib/nigerian-banks';
import { getLocalCurrency, formatLocalFx, AFRICAN_MOBILE_MONEY_COUNTRIES, MOBILE_MONEY_PROVIDERS } from '@/lib/currency';

export default function CreatorPayoutsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethodType>('WISE');
  const [destination, setDestination] = useState('');
  const [userCountry, setUserCountry] = useState('');
  const [nigerianBank, setNigerianBank] = useState<string>(NIGERIAN_BANKS[0]);
  const [nigerianAccNum, setNigerianAccNum] = useState('');
  const [nigerianAccName, setNigerianAccName] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [mobileMoneyAccountName, setMobileMoneyAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [profile, setProfile] = useState<any>(null);

  const applyPayoutDetailsFromProfile = (selectedMethod: PaymentMethodType, p?: any) => {
    const prof = p || profile;
    if (!prof?.payment_details) return;
    const pd = prof.payment_details;

    if (selectedMethod === 'NIGERIA_BANK') {
      const bName = pd.nigerian_bank_name || pd.bank_name || NIGERIAN_BANKS[0];
      const accNum = pd.nigerian_account_number || pd.account_number || '';
      const accName = pd.nigerian_account_name || pd.beneficiary_name || '';
      if (bName) setNigerianBank(bName);
      if (accNum) setNigerianAccNum(accNum);
      if (accName) setNigerianAccName(accName);
    } else if (selectedMethod === 'MOBILE_MONEY') {
      const prov = pd.mobile_money_provider || '';
      const phone = pd.mobile_money_phone || '';
      const name = pd.mobile_money_account_name || '';
      if (prov) setMobileMoneyProvider(prov);
      if (phone) setMobileMoneyPhone(phone);
      if (name) setMobileMoneyAccountName(name);
    } else if (selectedMethod === 'WISE') {
      if (pd.wise_email) setDestination(pd.wise_email);
    } else if (selectedMethod === 'PAYPAL') {
      if (pd.paypal_email) setDestination(pd.paypal_email);
    } else if (selectedMethod === 'ACH' || selectedMethod === 'WIRE') {
      const parts: string[] = [];
      if (pd.bank_name) parts.push(`Bank: ${pd.bank_name}`);
      if (pd.account_number) parts.push(`Acc: ${pd.account_number}`);
      if (pd.routing_number) parts.push(`Routing: ${pd.routing_number}`);
      if (pd.beneficiary_name) parts.push(`Beneficiary: ${pd.beneficiary_name}`);
      if (parts.length > 0) setDestination(parts.join(', '));
    }
  };

  const handleMethodChange = (newMethod: PaymentMethodType) => {
    setMethod(newMethod);
    applyPayoutDetailsFromProfile(newMethod);
  };

  const handleSavePayoutInfo = async () => {
    setSavingDetails(true);
    setErrorMsg('');
    try {
      const newDetails: any = { ...(profile?.payment_details || {}) };
      if (method === 'NIGERIA_BANK') {
        newDetails.nigerian_bank_name = nigerianBank;
        newDetails.nigerian_account_number = nigerianAccNum.trim();
        newDetails.nigerian_account_name = nigerianAccName.trim();
      } else if (method === 'MOBILE_MONEY') {
        newDetails.mobile_money_provider = mobileMoneyProvider;
        newDetails.mobile_money_phone = mobileMoneyPhone.trim();
        newDetails.mobile_money_account_name = mobileMoneyAccountName.trim();
      } else if (method === 'WISE') {
        newDetails.wise_email = destination.trim();
      } else if (method === 'PAYPAL') {
        newDetails.paypal_email = destination.trim();
      }

      const res = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          paymentDetails: newDetails,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save payout information');

      setProfile(data.profile);
      toast.success('Payout information updated successfully!', 'Details Saved');
    } catch (err: any) {
      toast.error(err.message || 'Error saving payout information', 'Save Failed');
    } finally {
      setSavingDetails(false);
    }
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/creator/stats').then((r) => r.json()),
      fetch('/api/payouts').then((r) => r.json()),
      fetch('/api/creator/profile').then((r) => r.json()),
    ])
      .then(([statsData, payoutsData, profileData]) => {
        setStats(statsData.stats);
        setPayouts(payoutsData.payouts || []);

        if (profileData?.profile) {
          const p = profileData.profile;
          setProfile(p);
          setUserCountry(p.country || '');
          const initialMethod: PaymentMethodType =
            p.payment_method || (p.country === 'Nigeria' ? 'NIGERIA_BANK' : (p.country && AFRICAN_MOBILE_MONEY_COUNTRIES.includes(p.country) ? 'MOBILE_MONEY' : 'WISE'));
          setMethod(initialMethod);
          applyPayoutDetailsFromProfile(initialMethod, p);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalDestination = destination.trim();

    if (method === 'NIGERIA_BANK') {
      const accNum = nigerianAccNum.trim() || profile?.payment_details?.nigerian_account_number || profile?.payment_details?.account_number || '';
      const accName = nigerianAccName.trim() || profile?.payment_details?.nigerian_account_name || profile?.payment_details?.beneficiary_name || '';
      const bName = nigerianBank || profile?.payment_details?.nigerian_bank_name || profile?.payment_details?.bank_name || NIGERIAN_BANKS[0];

      if (!accNum || accNum.length !== 10) {
        setErrorMsg('Please enter a valid 10-digit Nigerian NUBAN account number.');
        return;
      }
      if (!accName) {
        setErrorMsg('Please enter the Nigerian bank account beneficiary name.');
        return;
      }
      finalDestination = `${bName} - NUBAN: ${accNum} (${accName})`;
    } else if (method === 'MOBILE_MONEY') {
      const defaultProv = MOBILE_MONEY_PROVIDERS[userCountry] ? MOBILE_MONEY_PROVIDERS[userCountry][0] : 'M-Pesa (Safaricom)';
      const prov = mobileMoneyProvider || profile?.payment_details?.mobile_money_provider || defaultProv;
      const phone = mobileMoneyPhone.trim() || profile?.payment_details?.mobile_money_phone || '';
      const name = mobileMoneyAccountName.trim() || profile?.payment_details?.mobile_money_account_name || profile?.display_name || '';

      if (!phone || phone.length < 8) {
        setErrorMsg('Please enter a valid Mobile Money phone number with country dialing code (e.g. +254 712 345 678).');
        return;
      }
      if (!name) {
        setErrorMsg('Please enter the registered Mobile Money account holder name.');
        return;
      }
      finalDestination = `Mobile Money: ${prov} - ${phone} (${name})`;
    } else if (!finalDestination || finalDestination.length === 0) {
      if (method === 'WISE' && profile?.payment_details?.wise_email) {
        finalDestination = profile.payment_details.wise_email;
      } else if (method === 'PAYPAL' && profile?.payment_details?.paypal_email) {
        finalDestination = profile.payment_details.paypal_email;
      } else if ((method === 'ACH' || method === 'WIRE') && profile?.payment_details) {
        const pd = profile.payment_details;
        const parts: string[] = [];
        if (pd.bank_name) parts.push(`Bank: ${pd.bank_name}`);
        if (pd.account_number) parts.push(`Acc: ${pd.account_number}`);
        if (pd.routing_number) parts.push(`Routing: ${pd.routing_number}`);
        if (pd.beneficiary_name) parts.push(`Beneficiary: ${pd.beneficiary_name}`);
        if (parts.length > 0) finalDestination = parts.join(', ');
      }
    }

    if (!finalDestination || finalDestination.length === 0) {
      setErrorMsg('Please enter your payout destination account details or save them in your profile settings.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          paymentDestination: finalDestination,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payout request');
      }

      setIsModalOpen(false);
      loadData();
      toast.success('Payout request submitted successfully! Your funds are now in processing review.');

      // Instantly trigger notification bell update in header
      window.dispatchEvent(new CustomEvent('notification-updated'));
      try {
        const bc = new BroadcastChannel('asmr_notifications_sync');
        bc.postMessage({ type: 'PAYOUT_REQUESTED' });
        bc.close();
      } catch {}
    } catch (err: any) {
      setErrorMsg(err.message || 'Error requesting payout');
      toast.error(err.message || 'Error requesting payout');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-black">
        <div className="inline-block w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading payout records...</p>
      </div>
    );
  }

  const minRequired = stats?.minRequired || 8;
  const eligibleCount = stats?.eligibleCount || 0;
  const canRequest = stats?.canRequestPayout;
  const ratePerVideo = (stats?.availablePayoutBalance && eligibleCount > 0)
    ? (stats.availablePayoutBalance / eligibleCount)
    : 50;
  const localCurrency = getLocalCurrency(userCountry, method);
  const remainingVideos = Math.max(0, minRequired - eligibleCount);
  const progressPercent = Math.min(100, Math.round((eligibleCount / minRequired) * 100));

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 lg:px-6 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-[#9D174D] dark:text-pink-400 uppercase">
              CREATOR DISBURSEMENTS
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-neutral-900 dark:text-white">
              Payout Requests
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-normal">
              Disbursements unlock every {minRequired} approved full videos at $50/video ($400 minimum disbursement).
            </p>
          </div>

          <button
            type="button"
            disabled={!canRequest}
            onClick={() => setIsModalOpen(true)}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto ${
              canRequest
                ? 'bg-[#7b1e4b] hover:bg-[#68173e] text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>
              {canRequest
                ? `Request $${stats.availablePayoutBalance.toFixed(2)} Payout`
                : `Locked (${eligibleCount}/${minRequired} Approved)`}
            </span>
          </button>
        </div>

        {/* 2-Card Row: Threshold Progress & Available Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Card: Threshold Status (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-[#9D174D] dark:text-pink-400 uppercase">
                  PAYOUT THRESHOLD
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold text-[#7B1E4B] bg-[#FDF2F4] border-0">
                  {minRequired} videos = ${(minRequired * ratePerVideo).toFixed(0)}
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 dark:text-white font-normal leading-snug">
                {canRequest ? (
                  <>
                    Payout threshold <span className="italic font-serif text-[#8E2848] dark:text-pink-400">unlocked.</span> Ready to withdraw.
                  </>
                ) : (
                  <>
                    {remainingVideos} more approved video{remainingVideos > 1 ? 's' : ''} to <span className="italic font-serif text-[#8E2848] dark:text-pink-400">unlock payout.</span>
                  </>
                )}
              </h2>
            </div>

            {/* Segmented Progress */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                <span>{eligibleCount} of {minRequired} full videos approved</span>
                <span className="text-neutral-500 dark:text-neutral-400">{progressPercent}%</span>
              </div>

              <div className="grid grid-cols-8 gap-1.5 w-full">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx < eligibleCount
                        ? 'bg-[#8E2848] dark:bg-pink-400'
                        : 'bg-neutral-200/90 dark:bg-neutral-800'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                <span>${(eligibleCount * 50).toFixed(0)} earned</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">$400 minimum payout</span>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                {canRequest ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">Eligible for immediate disbursement</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>Upload more videos to reach the 8-video minimum threshold.</span>
                  </>
                )}
              </div>
              <Link href="/creator/upload" className="hover:text-black dark:hover:text-white transition-colors">
                <ArrowRight className="w-4 h-4 text-neutral-500" />
              </Link>
            </div>
          </div>

          {/* Right Card: AVAILABLE BALANCE (5 cols) with pure white text and icons */}
          <div className="lg:col-span-5 bg-[#18151A] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 border border-white/15">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-white uppercase">
                  AVAILABLE BALANCE
                </span>
                <Wallet className="w-4 h-4 text-white" />
              </div>

              <div>
                <div className="font-serif text-4xl sm:text-5xl font-normal tracking-tight text-white">
                  ${(stats?.availablePayoutBalance || 0).toFixed(2)}
                </div>
                {localCurrency.code !== 'USD' && (stats?.availablePayoutBalance || 0) > 0 && (
                  <div className="text-xs text-white/90 mt-1 font-normal">
                    ≈ {formatLocalFx(stats.availablePayoutBalance, localCurrency)}
                  </div>
                )}
                <div className="text-xs text-white/90 mt-1.5 font-normal">
                  {eligibleCount} approved, unpaid full videos
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-t border-white/15 pt-4 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                  YOUR LOCKED-IN RATE
                </span>
                <span className="font-bold text-white">
                  $50 <span className="text-white/90 font-normal">/ approved video</span>
                </span>
              </div>

              <div>
                {canRequest ? (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-3 rounded-full bg-white hover:bg-neutral-100 text-black font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    Request payout →
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 rounded-full bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-white/20"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                    <span className="text-white font-semibold">Request payout</span>
                  </button>
                )}
                <div className="text-[11px] text-white/80 text-center mt-2 font-normal">
                  Unlocks at 8 approved, unpaid videos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payout History Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between">
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-neutral-900 dark:text-white">
              Payout History ({payouts.length})
            </h2>
          </div>

          {payouts.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm font-normal">
              No payout requests submitted yet. Once you accumulate {minRequired} approved videos, your request will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 dark:bg-neutral-800/60 border-b border-neutral-200/90 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 sm:px-6">Request Date</th>
                    <th className="py-3.5 px-4">Amount & Videos</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6">Bank Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {new Date(p.requested_at).toLocaleDateString()}
                        <div className="text-[10px] text-neutral-400 font-mono">ID: {p.id}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-serif text-sm font-normal text-neutral-900 dark:text-white">
                          ${p.amount_usd.toFixed(2)} USD
                        </div>
                        {getLocalCurrency(userCountry, p.payment_method).code !== 'USD' && (
                          <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                            ≈ {formatLocalFx(p.amount_usd, getLocalCurrency(userCountry, p.payment_method))}
                          </div>
                        )}
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{p.video_count} approved videos</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.payment_method === 'NIGERIA_BANK' ? 'Nigerian Bank Transfer' : p.payment_method === 'MOBILE_MONEY' ? 'Mobile Money' : p.payment_method}</span>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs truncate font-mono">
                          {p.payment_destination}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={p.status} size="sm" />
                        {p.failure_reason && (
                          <div className="text-[10px] text-red-600 dark:text-red-400 mt-1 max-w-xs font-medium">
                            {p.status === 'REFUNDED'
                              ? `Refunded: ${p.failure_reason}`
                              : p.failure_reason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        {p.status === 'PAID' && p.payment_reference ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                              Ref: {p.payment_reference}
                            </span>
                            <div className="text-[10px] text-neutral-400">
                              Confirmed:{' '}
                              {p.processed_at ? new Date(p.processed_at).toLocaleDateString() : 'Yes'}
                            </div>
                          </div>
                        ) : p.status === 'REFUNDED' ? (
                          <div className="space-y-0.5">
                            <span className="text-neutral-700 dark:text-neutral-300 font-semibold text-[11px]">
                              Restored to Balance
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">
                            {p.status === 'PROCESSING'
                              ? 'Processing transfer...'
                              : p.status === 'CANCELLED' || p.status === 'FAILED'
                              ? 'Released'
                              : 'Pending review'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Centered Ticker Bar */}
        <div className="text-center text-xs text-neutral-400 dark:text-neutral-500 tracking-wider py-8">
          $50 flat rate. &nbsp;·&nbsp; 8-video minimum. &nbsp;·&nbsp; Your work. Your earnings.
        </div>
      </div>

      {/* Payout Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#fff9fb] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 border border-[#f2e3e8] text-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D174D] dark:text-pink-400">Withdrawal</span>
                <h3 className="font-serif text-xl font-normal text-neutral-900 dark:text-white leading-tight">
                  Request Payout
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-2 bg-[#f8e2ec] p-3.5 rounded-xl border-0 text-xs">
              <div>
                <div className="text-[10px] text-neutral-600 font-bold uppercase">Videos</div>
                <div className="font-semibold text-neutral-900">{eligibleCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-600 font-bold uppercase">Rate</div>
                <div className="font-semibold text-neutral-900">${ratePerVideo.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-600 font-bold uppercase">Total (USD)</div>
                <div className="font-serif font-normal text-neutral-900 text-sm">${stats?.availablePayoutBalance?.toFixed(2)}</div>
              </div>
              {localCurrency.code !== 'USD' && (
                <div className="col-span-3 pt-2 border-t border-pink-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-600">Est. local ({localCurrency.code})</span>
                  <span className="font-semibold text-neutral-900 text-xs">≈ {formatLocalFx(stats?.availablePayoutBalance || 0, localCurrency)}</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestPayout} className="space-y-4">
              {profile && (
                ((method === 'WISE' && profile.payment_details?.wise_email) ||
                 (method === 'PAYPAL' && profile.payment_details?.paypal_email) ||
                 (method === 'MOBILE_MONEY' && (profile.payment_details?.mobile_money_phone || profile.payment_details?.mobile_money_provider)) ||
                 (method === 'NIGERIA_BANK' && (profile.payment_details?.nigerian_account_number || profile.payment_details?.account_number)) ||
                 ((method === 'ACH' || method === 'WIRE') && (profile.payment_details?.account_number || profile.payment_details?.bank_name))) ? (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/90 dark:border-neutral-800 rounded-xl text-xs space-y-0.5">
                    <div className="flex items-center justify-between font-medium text-neutral-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Using saved payout details</span>
                      </span>
                      <Link href="/creator/settings" className="underline hover:text-neutral-700 text-[10px]">
                        Edit →
                      </Link>
                    </div>
                    <p className="text-[10px] text-neutral-500">
                      {method === 'NIGERIA_BANK' ? 'Nigerian Bank details' : method === 'MOBILE_MONEY' ? 'Mobile Money details' : method} pre-filled from profile.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/90 dark:border-neutral-800 rounded-xl text-xs flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Tip: Save payment details in your profile for auto-fill.</span>
                    <Link href="/creator/settings" className="underline font-semibold text-neutral-900 dark:text-white text-[10px] shrink-0 ml-2">
                      Edit →
                    </Link>
                  </div>
                )
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Payout Method
                </label>
                <select
                  value={method}
                  onChange={(e) => handleMethodChange(e.target.value as PaymentMethodType)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  {userCountry === 'Nigeria' && (
                    <option value="NIGERIA_BANK">Nigerian Local Bank Transfer (NGN Direct Deposit / NUBAN)</option>
                  )}
                  {userCountry && AFRICAN_MOBILE_MONEY_COUNTRIES.includes(userCountry) && (
                    <option value="MOBILE_MONEY">Mobile Money (M-Pesa, MTN MoMo, Airtel Money, etc.)</option>
                  )}
                  <option value="WISE">Wise (Recommended for International Creators)</option>
                  <option value="PAYPAL">PayPal</option>
                  {(!userCountry || !AFRICAN_MOBILE_MONEY_COUNTRIES.includes(userCountry)) && (
                    <option value="MOBILE_MONEY">Mobile Money (M-Pesa, MTN MoMo, Airtel Money, etc.)</option>
                  )}
                  <option value="ACH">Direct Deposit / ACH (US Checking or Savings)</option>
                  <option value="WIRE">International Wire Transfer</option>
                  {userCountry !== 'Nigeria' && (
                    <option value="NIGERIA_BANK">Nigerian Local Bank Transfer (NGN Direct Deposit / NUBAN)</option>
                  )}
                </select>
              </div>

              {method === 'MOBILE_MONEY' ? (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/90 dark:border-neutral-800">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Mobile Money Provider
                    </label>
                    <select
                      value={mobileMoneyProvider || (MOBILE_MONEY_PROVIDERS[userCountry] ? MOBILE_MONEY_PROVIDERS[userCountry][0] : 'M-Pesa (Safaricom)')}
                      onChange={(e) => setMobileMoneyProvider(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    >
                      {(MOBILE_MONEY_PROVIDERS[userCountry] || MOBILE_MONEY_PROVIDERS['Other']).map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Mobile Money Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={mobileMoneyPhone}
                      onChange={(e) => setMobileMoneyPhone(e.target.value)}
                      placeholder="e.g. +254 712 345 678"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5">Include country dialing code (+254, +233, +256, etc.)</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Account Registered Name
                    </label>
                    <input
                      type="text"
                      required
                      value={mobileMoneyAccountName}
                      onChange={(e) => setMobileMoneyAccountName(e.target.value)}
                      placeholder="e.g. Ophelia Adeleke"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : method === 'NIGERIA_BANK' ? (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/90 dark:border-neutral-800">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Nigerian Bank
                    </label>
                    <select
                      value={nigerianBank}
                      onChange={(e) => setNigerianBank(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    >
                      {NIGERIAN_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      NUBAN Account Number
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={nigerianAccNum}
                      onChange={(e) => setNigerianAccNum(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 0123456789"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono tracking-wider"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5">10-digit NUBAN</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Beneficiary Name
                    </label>
                    <input
                      type="text"
                      value={nigerianAccName}
                      onChange={(e) => setNigerianAccName(e.target.value)}
                      placeholder="e.g. Chukwuma Adewale Obi"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    {method === 'WISE'
                      ? 'Wise Recipient Email'
                      : method === 'PAYPAL'
                      ? 'PayPal Email'
                      : method === 'ACH'
                      ? 'Bank Name, Account & Routing'
                      : 'IBAN / SWIFT & Beneficiary'}
                  </label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={
                      method === 'WISE'
                        ? 'e.g. yourname@wise.me'
                        : method === 'PAYPAL'
                        ? 'e.g. your.paypal@domain.com'
                        : 'e.g. Chase Bank, Routing 021000021, Acc 987654321'
                    }
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={handleSavePayoutInfo}
                  className="text-xs font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 underline disabled:opacity-50"
                >
                  {savingDetails ? 'Saving...' : 'Save this payout method to profile'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-[10px] text-neutral-600 dark:text-neutral-400 flex items-start gap-1.5 font-normal">
                <Shield className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                <span>Upon submission, your {eligibleCount} approved videos enter <code>RESERVED</code> status. A transaction reference is logged on transfer confirmation.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-5 rounded-full bg-[#7b1e4b] hover:bg-[#68173e] text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-50"
              >
                {submitting
                  ? 'Submitting...'
                  : localCurrency.code !== 'USD'
                  ? `Request $${stats?.availablePayoutBalance?.toFixed(2)} (≈ ${formatLocalFx(stats?.availablePayoutBalance || 0, localCurrency)})`
                  : `Request $${stats?.availablePayoutBalance?.toFixed(2)} Payout`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

