'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Copy,
  Check,
  Gift,
  CheckCircle2,
  Clock,
  ArrowRight,
  Share2,
  DollarSign,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface ReferralItem {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referred_user_name: string;
  referred_user_email: string;
  audition_passed: boolean;
  videos_completed_count: number;
  milestone_reached: boolean;
  reward_amount_usd: number;
  reward_status: 'PENDING' | 'REWARDED';
  rewarded_at?: string;
  created_at: string;
}

interface ReferralStats {
  totalReferred: number;
  rewardedCount: number;
  pendingCount: number;
  totalEarnedUsd: number;
  rewardPerCreator: number;
}

export default function CreatorReferralsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<ReferralStats>({
    totalReferred: 0,
    rewardedCount: 0,
    pendingCount: 0,
    totalEarnedUsd: 0,
    rewardPerCreator: 35.0,
  });
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/creator/referrals');
      if (res.ok) {
        const data = await res.json();
        setReferralCode(data.referralCode || '');
        setReferralLink(data.referralLink || '');
        if (data.stats) setStats(data.stats);
        if (data.referrals) setReferrals(data.referrals);
      }
    } catch (err) {
      console.error('Error loading referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFBFD] dark:bg-[#120F15] text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 lg:px-6 py-8 sm:py-10 space-y-8">

        {/* Welcome Section (Matches Creator Dashboard) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-[#9D174D] dark:text-pink-400 uppercase">
              CREATOR REFERRAL PROGRAM
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5 flex-wrap">
              <span>Invite Creators & Earn <span className="italic font-serif text-[#8E2848] dark:text-pink-400">$35.00 Bonus.</span></span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-normal">
              Earn $35.00 USD for every qualified creator who joins with your link, passes their audition, and completes 8 approved videos.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/creator"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#FDF2F4] text-[#7B1E4B] hover:bg-[#F8E2EC] dark:bg-pink-950/50 dark:text-pink-300 text-xs font-bold transition-colors border-0"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!referralLink}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#7B1E4B] hover:bg-[#63183C] text-white text-xs font-bold flex items-center gap-2 transition-colors border-0 shadow-sm disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
            </button>
          </div>
        </div>

        {/* Program Rule Banner (Matches Dashboard Audition Approved Banner) */}
        <div className="bg-[#f8e2ec] dark:bg-[#281420] border border-[#f0cddc] dark:border-[#421d31] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-[#8E2848] text-white flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#9D174D] dark:text-pink-300 uppercase">
                AUTOMATIC $35.00 CREDIT PER QUALIFIED CREATOR
              </div>
              <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                How the referral reward works:
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                1. Creator joins via your link &nbsp;•&nbsp; 2. Passes 30-second audition sample &nbsp;•&nbsp; 3. Completes 8 approved videos &nbsp;•&nbsp; 4. You automatically get credited <strong>+$35.00 USD</strong> in your ledger!
              </p>
            </div>
          </div>
          <Link
            href="/creator/payouts"
            className="text-xs font-semibold text-[#8E2848] dark:text-pink-300 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>View Payouts Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Personal Referral Link Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#8E2848] dark:text-pink-400" />
                Your Unique Invitation Link
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Share this link with fellow creators. Anyone registering with your link is linked to your referral account.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Referral Code:</span>
              <span className="px-3 py-1 bg-[#FDF2F4] dark:bg-pink-950/60 text-[#7B1E4B] dark:text-pink-300 font-mono font-bold text-xs rounded-lg border border-[#F8E2EC] dark:border-pink-900/40">
                {referralCode || '...'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={referralLink || 'Loading link...'}
                className="w-full pl-4 pr-12 py-2.5 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none select-all"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!referralLink}
              className="px-6 py-2.5 rounded-xl bg-[#7B1E4B] hover:bg-[#63183C] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Copied Link!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Invitation Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Row (Matches Dashboard Stat Card Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 divide-y md:divide-y-0 md:divide-x divide-neutral-200/90 dark:divide-neutral-800 overflow-hidden">
          
          {/* Total Referred */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Total referred</span>
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              {stats.totalReferred}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {stats.totalReferred === 1 ? '1 creator registered via your link' : `${stats.totalReferred} creators registered via your link`}
            </div>
          </div>

          {/* In Progress */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>In progress</span>
              <Clock className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-neutral-900 dark:text-white">
              {stats.pendingCount}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {stats.pendingCount === 1 ? '1 creator working towards 8 videos milestone' : `${stats.pendingCount} creators working towards 8 videos milestone`}
            </div>
          </div>

          {/* Referral Bonus Earned */}
          <div className="p-5 sm:p-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>Referral bonus earned</span>
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-normal text-emerald-600 dark:text-emerald-400">
              ${stats.totalEarnedUsd.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {stats.rewardedCount} milestone rewards paid ($35.00 each)
            </div>
          </div>

        </div>

        {/* Referrals Tracking Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-6 sm:p-8 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">Your Referred Creators</h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              {referrals.length} Total
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-neutral-500 dark:text-neutral-400">Loading referral tracking data...</div>
          ) : referrals.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Users className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No referred creators yet.</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                Share your invitation link with fellow creators. When they register and complete their 8 approved videos milestone, you earn $35.00 per creator!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-800 dark:text-neutral-200">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold text-[10px] sm:text-[11px]">
                    <th className="py-3 px-4">Creator</th>
                    <th className="py-3 px-4">Date Joined</th>
                    <th className="py-3 px-4">Audition Gate</th>
                    <th className="py-3 px-4">Videos Milestone</th>
                    <th className="py-3 px-4 text-right">Reward Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {referrals.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-neutral-900 dark:text-white">{item.referred_user_name}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{item.referred_user_email}</div>
                      </td>
                      <td className="py-4 px-4 text-neutral-600 dark:text-neutral-400">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4">
                        {item.audition_passed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending Audition
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#7B1E4B] dark:bg-pink-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, (item.videos_completed_count / 8) * 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white text-xs">
                            {item.videos_completed_count} / 8
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {item.reward_status === 'REWARDED' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
                            <Check className="w-3.5 h-3.5" />
                            +$35.00 Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                            Pending ($35.00)
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

      </div>
    </div>
  );
}
