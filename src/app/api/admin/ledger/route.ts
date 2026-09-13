export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const ledger = db.getEarningsLedger();
    return NextResponse.json({ ledger });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Forbidden' }, { status: 403 });
  }
}
