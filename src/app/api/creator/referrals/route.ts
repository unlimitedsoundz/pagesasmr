export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Referral } from '@/types';
import { PUBLIC_URL } from '@/lib/constants';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const referralCode = db.getReferralCodeForProfile(user.id);
    const referralLink = `${PUBLIC_URL.replace(/\/$/, '')}/auth/register?ref=${encodeURIComponent(referralCode)}`;

    const referrals = db.getReferralsByReferrer(user.id);

    const totalReferred = referrals.length;
    const rewardedCount = referrals.filter((r: Referral) => r.reward_status === 'REWARDED').length;
    const pendingCount = referrals.filter((r: Referral) => r.reward_status === 'PENDING').length;
    const totalEarnedUsd = rewardedCount * 35.0;

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink,
      stats: {
        totalReferred,
        rewardedCount,
        pendingCount,
        totalEarnedUsd,
        rewardPerCreator: 35.0,
      },
      referrals,
    });
  } catch (err: any) {
    console.error('Error fetching creator referrals:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch referral program stats' },
      { status: 500 }
    );
  }
}
