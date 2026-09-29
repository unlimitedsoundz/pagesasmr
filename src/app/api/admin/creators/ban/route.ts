export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { PLATFORM_ID } from '@/lib/constants';
import { isUserBlacklisted, isEmailBlacklisted } from '@/lib/blacklist';

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

    if (isUserBlacklisted(creator.id) || isEmailBlacklisted(creator.email)) {
      return NextResponse.json({ error: 'This user is permanently blacklisted and cannot be unbanned.' }, { status: 403 });
    }

    // 1. Clean payment details (strip ban markers)
    const cleanPaymentDetails = { ...(creator.payment_details || {}) } as any;
    delete cleanPaymentDetails.is_banned;
    delete cleanPaymentDetails.banned_at;
    delete cleanPaymentDetails.ban_reason;

    // 2. Determine restored sample status
    const subs = db.getSubmissions().filter((s: any) => s.creator_id === creator.id);
    const hasApproved = subs.some((s: any) => s.status === 'APPROVED');
    let restoredSampleStatus = creator.sample_status;
    if (creator.sample_status === 'REJECTED' || (creator.sample_status as any) === 'BANNED') {
      if (hasApproved || creator.sample_submission_id) {
        restoredSampleStatus = 'APPROVED';
      } else if (subs.some((s: any) => s.status === 'PENDING')) {
        restoredSampleStatus = 'PENDING_REVIEW';
      } else {
        restoredSampleStatus = 'NOT_SUBMITTED';
      }
    }

    // 3. Update local profile
    const updated = await db.updateProfileAsync(creator.id, {
      is_banned: false,
      banned_at: undefined,
      ban_reason: undefined,
      payment_details: cleanPaymentDetails,
      sample_status: restoredSampleStatus,
    });

    // 4. Remove device and IP ban entries tied to this creator
    const accs = [
      cleanPaymentDetails.account_number,
      cleanPaymentDetails.accountNumber,
      cleanPaymentDetails.nigerian_account_number,
      cleanPaymentDetails.nigerianAccountNumber,
      cleanPaymentDetails.mobile_money_phone,
    ].filter(Boolean);

    for (const acc of accs) {
      db.unbanDevice(String(acc).trim());
    }
    db.unbanCreatorEntries(creator.id);

    // 5. Update Supabase profiles table
    try {
      await supabaseAdmin
        .from('profiles')
        .update({
          sample_status: restoredSampleStatus,
          payment_details: cleanPaymentDetails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creator.id);
    } catch (supaErr) {
      console.warn('Could not update Supabase profile for unban:', supaErr);
    }

    if (updated) {
      await db.syncProfileToSupabase(updated);
    }

    // 6. Record audit event
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
        restored_sample_status: restoredSampleStatus,
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
