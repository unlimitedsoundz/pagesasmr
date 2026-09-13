export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Referral } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const referrals = db.getPlatformReferrals();

    const totalReferralsCount = referrals.length;
    const totalRewardedCount = referrals.filter((r: Referral) => r.reward_status === 'REWARDED').length;
    const totalPendingCount = referrals.filter((r: Referral) => r.reward_status === 'PENDING').length;
    const totalPayoutUsd = totalRewardedCount * 35.0;

    const enrichedReferrals = referrals.map((r: Referral) => {
      const referrer = db.getProfileById(r.referrer_id);
      return {
        ...r,
        referrer_name: referrer?.display_name || 'Unknown Referrer',
        referrer_email: referrer?.email || '',
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalReferralsCount,
        totalRewardedCount,
        totalPendingCount,
        totalPayoutUsd,
      },
      referrals: enrichedReferrals,
    });
  } catch (err: any) {
    console.error('Error fetching admin referrals list:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch admin referral list' },
      { status: 500 }
    );
  }
}
