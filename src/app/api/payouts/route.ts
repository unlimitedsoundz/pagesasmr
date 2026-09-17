export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { PaymentMethodType } from '@/types';
import { getLocalCurrency, formatLocalFx } from '@/lib/currency';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') as any) || undefined;

    let creatorId = searchParams.get('creatorId') || undefined;
    if (user.role !== 'ADMIN') {
      creatorId = user.id;
    }

    const payouts = db.getPayoutRequests({ creatorId, status });
    const enrichedPayouts = payouts.map((p) => {
      if (user.role !== 'ADMIN') return p;
      const creator = db.getProfileById(p.creator_id);
      return {
        ...p,
        creator_payment_method: creator?.payment_method,
        creator_payment_details: creator?.payment_details,
        creator_country: creator?.country,
      };
    });
    return NextResponse.json({ payouts: enrichedPayouts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    let { paymentMethod, paymentDestination, paymentDetails } = body;

    const profile = await db.getProfileByIdAsync(user.id);

    // If client supplied paymentDetails, persist to profile so it is saved and synced
    if (paymentDetails && typeof paymentDetails === 'object' && Object.keys(paymentDetails).length > 0) {
      const mergedDetails = {
        ...(profile?.payment_details || {}),
        ...paymentDetails,
      };
      await db.updateProfile(user.id, {
        payment_details: mergedDetails,
        ...(paymentMethod ? { payment_method: paymentMethod as PaymentMethodType } : {}),
      });
      const updatedProfile = db.getProfileById(user.id);
      if (updatedProfile) {
        await db.syncProfileToSupabase(updatedProfile);
      }
    }

    if (!paymentMethod && profile?.payment_method) {
      paymentMethod = profile.payment_method;
    }

    const payout = db.requestPayout(
      user.id,
      paymentMethod as PaymentMethodType | undefined,
      paymentDestination || undefined
    );

    if (paymentMethod && profile && profile.payment_method !== paymentMethod) {
      db.updateProfile(user.id, { payment_method: paymentMethod as PaymentMethodType });
    }

    const currency = getLocalCurrency(profile?.country, payout.payment_method);
    const localFx = formatLocalFx(payout.amount_usd, currency);
    const fxNotice = currency.code !== 'USD' ? ` (${localFx})` : '';

    db.notifyAdmins({
      title: 'New Payout Request Received',
      message: `${user.display_name} requested payout of $${payout.amount_usd.toFixed(2)} USD${fxNotice} (${payout.video_count} videos via ${payout.payment_method}). Estimated bank processing: 3 working days.`,
      type: 'PAYOUT',
      link: '/admin/payouts',
    });

    return NextResponse.json({ success: true, payout });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Payout request failed' }, { status: 400 });
  }
}
