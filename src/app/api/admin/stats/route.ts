export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await db.syncFromSupabase().catch((e) => console.warn('[Pages DB] stats Supabase sync warning:', e));
    db.reload();
    const stats = db.getPlatformStats();
    const settings = db.getSettings();
    const recentSubmissions = db.getSubmissions().slice(0, 6);
    const recentPayouts = db.getPayoutRequests().slice(0, 6);
    const recentAuditEvents = db.getAuditEvents().slice(0, 6);
    const recentCreators = db.getPlatformCreators().slice(0, 6);

    return NextResponse.json({
      stats,
      settings,
      recentSubmissions,
      recentPayouts,
      recentAuditEvents,
      recentCreators,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Forbidden' }, { status: 403 });
  }
}
