export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/admin/cleanup
 * Removes creator accounts that:
 *   - Registered > 48 hours ago
 *   - Have sample_status === 'NOT_SUBMITTED'
 *   - Have never submitted any audition sample
 *
 * Admin-only. Safe to call repeatedly - idempotent.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    let hours = 24;
    try {
      const { searchParams } = new URL(req.url);
      const hParam = searchParams.get('hours');
      if (hParam !== null) {
        hours = parseInt(hParam, 10);
      } else {
        const body = await req.json().catch(() => ({}));
        if (typeof body?.hours === 'number') hours = body.hours;
      }
    } catch {}

    if (isNaN(hours) || hours < 0) hours = 24;

    const olderThanMs = hours * 3600000;
    const result = await db.removeStaleCreators(olderThanMs);

    return NextResponse.json({
      success: true,
      removed: result.removed,
      emails: result.emails,
      message:
        result.removed === 0
          ? `No stale creator accounts found (${hours > 0 ? `>${hours} hours ` : ''}with no audition sample).`
          : `Removed ${result.removed} stale creator account(s) ${hours > 0 ? `older than ${hours} hours ` : ''}without an audition sample.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Forbidden or cleanup failed.' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
