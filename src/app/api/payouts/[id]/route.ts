export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminUser = await requireAdmin();
    const body = await req.json();
    const { action, paymentReference, reason } = body;

    let updatedPayout;

    switch (action) {
      case 'MARK_PROCESSING':
        updatedPayout = db.markPayoutProcessing(params.id, adminUser);
        break;

      case 'CONFIRM_PAID':
        if (!paymentReference || paymentReference.trim().length === 0) {
          return NextResponse.json(
            { error: 'An actual transfer confirmation number or payment reference is strictly required to mark paid.' },
            { status: 400 }
          );
        }
        updatedPayout = db.confirmPayoutPaid(params.id, paymentReference.trim(), adminUser);
        break;

      case 'CANCEL':
        if (!reason || reason.trim().length === 0) {
          return NextResponse.json(
            { error: 'A cancellation reason is required to release reserved funds safely.' },
            { status: 400 }
          );
        }
        updatedPayout = db.cancelOrFailPayout(params.id, reason.trim(), adminUser, false);
        break;

      case 'FAIL':
        if (!reason || reason.trim().length === 0) {
          return NextResponse.json(
            { error: 'A failure reason is required.' },
            { status: 400 }
          );
        }
        updatedPayout = db.cancelOrFailPayout(params.id, reason.trim(), adminUser, true);
        break;

      default:
        return NextResponse.json({ error: `Invalid payout action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, payout: updatedPayout });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Payout action failed' }, { status: 400 });
  }
}
