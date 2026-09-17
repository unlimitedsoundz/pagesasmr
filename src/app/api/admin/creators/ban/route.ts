export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { PLATFORM_ID } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { creatorId, reason, customIp, customDevice } = body;

    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required.' }, { status: 400 });
    }

    const creator = await db.getProfileByIdAsync(creatorId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
    }

    const banTimestamp = new Date().toISOString();
    const banReason = reason || `Permanently banned by admin ${admin.display_name}`;

    // 1. Update local database profile
    const updated = await db.updateProfileAsync(creator.id, {
      is_banned: true,
      banned_at: banTimestamp,
      ban_reason: banReason,
      sample_status: 'REJECTED',
    });

    // 2. Ban custom IP if provided
    if (customIp && customIp.trim()) {
      db.banIp(customIp.trim(), `Admin ban for creator ${creator.display_name}`, creator.id);
    }

    // 3. Ban device signature if specified
    if (customDevice && customDevice.trim()) {
      db.banDevice(customDevice.trim(), `Admin device ban for creator ${creator.display_name}`, creator.id);
    }

    // 4. Blacklist creator's bank account if available
    const pd = { ...(creator.payment_details || {}) } as any;
    pd.is_banned = true;
    pd.banned_at = banTimestamp;
    pd.ban_reason = banReason;

    const accs = [
      pd.account_number,
      pd.accountNumber,
      pd.nigerian_account_number,
      pd.nigerianAccountNumber,
      pd.mobile_money_phone,
    ].filter(Boolean);

    for (const acc of accs) {
      db.banDevice(String(acc).trim(), `Blacklisted payment account for ${creator.display_name}`, creator.id);
    }

    // 5. Update Supabase profiles table
    try {
      await supabaseAdmin
        .from('profiles')
        .update({
          sample_status: 'REJECTED',
          payment_details: pd,
          updated_at: banTimestamp,
        })
        .eq('id', creator.id);
    } catch (supaErr) {
      console.warn('Could not update Supabase profile for ban:', supaErr);
    }

    // 6. Log audit event
    db.recordAuditEvent({
      platform_id: PLATFORM_ID,
      actor_id: admin.id,
      actor_name: admin.display_name,
      action: 'CREATOR_BANNED_AND_BLACKLISTED',
      target_type: 'CREATOR',
      target_id: creator.id,
      details: {
        reason: banReason,
        email: creator.email,
        name: creator.display_name,
        customIp,
        customDevice,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Creator ${creator.display_name} has been banned and blacklisted.`,
      profile: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to ban creator.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required.' }, { status: 400 });
    }

    const creator = await db.getProfileByIdAsync(creatorId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
    }

    const updated = await db.updateProfileAsync(creator.id, {
      is_banned: false,
      banned_at: undefined,
      ban_reason: undefined,
    });

    db.recordAuditEvent({
      platform_id: PLATFORM_ID,
      actor_id: admin.id,
      actor_name: admin.display_name,
      action: 'CREATOR_BAN_REVOKED',
      target_type: 'CREATOR',
      target_id: creator.id,
      details: {
        email: creator.email,
        name: creator.display_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Ban lifted for ${creator.display_name}.`,
      profile: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to lift ban.' }, { status: 500 });
  }
}
