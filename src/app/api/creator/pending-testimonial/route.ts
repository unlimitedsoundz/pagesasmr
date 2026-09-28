export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    // Admins don't have creator payouts
    if (user.role === 'ADMIN' || user.email === 'unlymitedsoundz@gmail.com') {
      return NextResponse.json({ pendingPayouts: [], required: false });
    }

    const pendingPayouts = db.getPendingPayoutReviews(user.id);

    return NextResponse.json({
      pendingPayouts,
      required: pendingPayouts.length > 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check pending testimonials', pendingPayouts: [], required: false },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const { payout_id } = body;

    if (!payout_id || typeof payout_id !== 'string') {
      return NextResponse.json({ error: 'Payout ID is required' }, { status: 400 });
    }

    const success = db.markPayoutReviewPrompted(payout_id, user.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to dismiss review prompt' },
      { status: 500 }
    );
  }
}
