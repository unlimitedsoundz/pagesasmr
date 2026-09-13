export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const settings = db.getSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Forbidden' }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    const updates = await req.json();

    const newSettings = db.updateSettings(updates, adminUser);
    return NextResponse.json({ success: true, settings: newSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Settings update failed' }, { status: 400 });
  }
}
