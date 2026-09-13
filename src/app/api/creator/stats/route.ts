export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const stats = db.getCreatorStats(user.id);
    const ledger = db.getEarningsLedger(user.id);
    const settings = db.getSettings();

    return NextResponse.json({
      stats,
      ledger,
      settings,
      profile: user,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}
