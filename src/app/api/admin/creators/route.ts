export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

// Run auto-cleanup at most once per 6 hours per server process
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Lazily sweep stale creators (registered 48h+ ago with no audition sample)
    const now = Date.now();
    if (now - lastCleanupAt > CLEANUP_INTERVAL_MS) {
      lastCleanupAt = now;
      db.removeStaleCreators(172_800_000).catch((e) =>
        console.warn('[Pages] Stale creator sweep warning:', e)
      );
    }

    // Always sync latest state from Supabase
    await db.syncFromSupabase();

    const profiles = db.getPlatformCreators();
    const creatorsWithStats = profiles.map((p) => {
      const stats = db.getCreatorStats(p.id);
      const { password, ...safeProfile } = p as any;
      return {
        ...safeProfile,
        payment_method: p.payment_method || null,
        payment_details: p.payment_details || {},
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
