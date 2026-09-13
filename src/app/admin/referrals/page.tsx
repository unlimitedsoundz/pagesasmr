'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Check,
  DollarSign,
  Award,
} from 'lucide-react';

interface AdminReferralItem {
  id: string;
  referrer_id: string;
  referrer_name: string;
  referrer_email: string;
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

interface AdminReferralStats {
  totalReferralsCount: number;
  totalRewardedCount: number;
  totalPendingCount: number;
  totalPayoutUsd: number;
}

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminReferralStats>({
    totalReferralsCount: 0,
    totalRewardedCount: 0,
    totalPendingCount: 0,
    totalPayoutUsd: 0,
  });
  const [referrals, setReferrals] = useState<AdminReferralItem[]>([]);

  useEffect(() => {
    fetchAdminReferrals();
  }, []);

  const fetchAdminReferrals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/referrals');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        if (data.referrals) setReferrals(data.referrals);
      }
    } catch (err) {
      console.error('Error fetching admin referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900 flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500" />
            Referral Program Management ($35 Bonus)
          </h1>
          <p className="text-sm text-charcoal-600 mt-1">
            Track creator referral links, audition milestones, and $35 automatic ledger bonuses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-sand-300 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-plum-50 text-plum-800 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Total Referred</div>
            <div className="text-2xl font-bold text-charcoal-900">{stats.totalReferralsCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-sand-300 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">In Progress</div>
            <div className="text-2xl font-bold text-charcoal-900">{stats.totalPendingCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-sand-300 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Milestones Met</div>
            <div className="text-2xl font-bold text-emerald-700">{stats.totalRewardedCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-sand-300 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Total Referral Payouts</div>
            <div className="text-2xl font-bold text-emerald-700">${stats.totalPayoutUsd.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-sand-300 shadow-warm overflow-hidden space-y-4 p-6 sm:p-8">
        <h3 className="font-serif text-xl font-bold text-charcoal-900">Platform Referral Activity</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-charcoal-500">Loading referral records...</div>
        ) : referrals.length === 0 ? (
          <div className="py-12 text-center text-xs text-charcoal-500">No referral relationships recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-charcoal-800">
              <thead>
                <tr className="border-b border-sand-200 text-charcoal-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Referrer (Gets $35)</th>
                  <th className="py-3 px-4">Referred Creator</th>
                  <th className="py-3 px-4">Audition Gate</th>
                  <th className="py-3 px-4">Progress (8 Videos)</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {referrals.map((item) => (
                  <tr key={item.id} className="hover:bg-sand-50/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-plum-900">{item.referrer_name}</div>
                      <div className="text-[11px] text-charcoal-500">{item.referrer_email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-charcoal-900">{item.referred_user_name}</div>
                      <div className="text-[11px] text-charcoal-500">{item.referred_user_email}</div>
                    </td>
                    <td className="py-4 px-4">
                      {item.audition_passed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Pending Audition
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-sand-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-plum-800 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (item.videos_completed_count / 8) * 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-charcoal-900">
                          {item.videos_completed_count} / 8
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {item.reward_status === 'REWARDED' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                          +$35.00 Credited
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-sand-100 text-charcoal-700 border border-sand-300">
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
  );
}
