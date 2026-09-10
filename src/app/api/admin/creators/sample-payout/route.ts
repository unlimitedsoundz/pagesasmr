export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { creatorId, paymentReference } = body;

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required.' }, { status: 400 });
    }

    const result = db.markSamplePayoutPaid(creatorId, user, paymentReference);
    return NextResponse.json({
      message: 'Audition sample $1.00 bonus marked as paid out.',
      ...result,
    });
  } catch (err: any) {
    console.error('Error marking sample payout as paid:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
