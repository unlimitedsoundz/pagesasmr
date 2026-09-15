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

// POST /api/admin/referrals — manually register a referral on pinkroom-pages
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const { referrerId, referredUserId } = await req.json();
    if (!referrerId || !referredUserId) {
      return NextResponse.json({ error: 'referrerId and referredUserId are required.' }, { status: 400 });
    }

    const referral = db.createReferral(referrerId, referredUserId);
    return NextResponse.json({ success: true, referral });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create referral.' }, { status: 500 });
  }
}

// PATCH /api/admin/referrals — re-trigger milestone check for a referred user
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const { referredUserId } = await req.json();
    if (!referredUserId) {
      return NextResponse.json({ error: 'referredUserId is required.' }, { status: 400 });
    }

    const referral = db.checkAndUpdateReferralMilestone(referredUserId);
    const referrals = db.getPlatformReferrals();
    const updated = referrals.find((r: Referral) => r.referred_user_id === referredUserId);
    return NextResponse.json({ success: true, referral: updated || referral });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update milestone.' }, { status: 500 });
  }
}
