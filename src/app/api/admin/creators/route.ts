export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Always sync latest state from Supabase
    await db.syncFromSupabase();

    const profiles = db.getPlatformCreators();
    const creatorsWithStats = profiles.map((p) => {
      const stats = db.getCreatorStats(p.id);
      const { password, ...safeProfile } = p as any;

      // Find latest payout request if available to backfill details if profile has none
      const latestPayout = ((db as any).data?.payout_requests || [])
        .filter((pr: any) => pr.creator_id === p.id || pr.creator_email?.toLowerCase() === p.email.toLowerCase())
        .sort((a: any, b: any) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime())[0];

      let paymentDetails: any = p.payment_details && Object.keys(p.payment_details).length > 0 ? { ...p.payment_details } : {};
      if (Object.keys(paymentDetails).length === 0 && latestPayout?.payment_destination) {
        paymentDetails.payment_destination = latestPayout.payment_destination;
      }

      return {
        ...safeProfile,
        payment_method: p.payment_method || latestPayout?.payment_method || null,
        payment_destination: (p as any).payment_destination || latestPayout?.payment_destination || null,
        payment_details: paymentDetails,
        stats,
      };
    });

    return NextResponse.json({ creators: creatorsWithStats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Forbidden' }, { status: 403 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get('id');

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required.' }, { status: 400 });
    }

    const result = await db.removeCreatorById(creatorId);
    if (!result) {
      return NextResponse.json({ error: 'Creator not found or could not be removed.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Creator account removed.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Forbidden' }, { status: 403 });
  }
}
