export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  BLACKLISTED_USER_IDS,
  BLACKLISTED_EMAILS,
  BLACKLISTED_BANK_ACCOUNTS,
  BLACKLISTED_PHONE_NUMBERS,
  BLACKLISTED_NAMES,
  BLACKLISTED_HARDWARE_SIGNATURES,
} from '@/lib/blacklist';

export async function GET() {
  try {
    await requireAdmin();

    const bannedIps = db.getBannedIps();
    const bannedDevices = db.getBannedDevices();
    const bannedEntries = db.getBannedEntries();

    // Fetch Olivia and Loveth profile details
    const olivia = db.getProfileById('db2e55d8-bbb4-4fe4-acb4-0036f5df7ff1') ||
      db.getProfileByEmail('preciousolivia184@gmail.com');
    const loveth = db.getProfileById('6d8fa840-effc-4f02-8549-2b98e3c667ce') ||
      db.getProfileByEmail('lucylovethonome@gmail.com');

    return NextResponse.json({
      bannedIps,
      bannedDevices,
      bannedEntries,
      staticBlacklist: {
        userIds: BLACKLISTED_USER_IDS,
        emails: BLACKLISTED_EMAILS,
        bankAccounts: BLACKLISTED_BANK_ACCOUNTS,
        phoneNumbers: BLACKLISTED_PHONE_NUMBERS,
        names: BLACKLISTED_NAMES,
        hardwareSignatures: BLACKLISTED_HARDWARE_SIGNATURES,
      },
      bannedSubjects: [
        {
          name: 'Olivia',
          email: 'preciousolivia184@gmail.com',
          id: 'db2e55d8-bbb4-4fe4-acb4-0036f5df7ff1',
          status: olivia?.is_banned ? 'BANNED' : 'SANCTIONED',
          beneficiary: 'VICTORY OGHENERIODE OVWIEDO',
          accounts: ['9065277585 (OPay / Access Bank)'],
        },
        {
          name: 'Loveth onome',
          email: 'lucylovethonome@gmail.com',
          id: '6d8fa840-effc-4f02-8549-2b98e3c667ce',
          status: loveth?.is_banned ? 'BANNED' : 'SANCTIONED',
          beneficiary: 'ONOME LOVETH OVWIEDO / Ovwiedo Victory Ogheneriode',
          accounts: ['1632024222 (Access Bank)', '8107287339 (Palmpay)'],
          device: 'TECNO KM4 (Tecno Spark Go 2024)',
        },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { type, value, reason } = body;

    if (!value || !value.trim()) {
      return NextResponse.json({ error: 'Value is required.' }, { status: 400 });
    }

    const trimmed = value.trim();

    if (type === 'IP') {
      db.banIp(trimmed, reason || `Manually banned by ${admin.display_name}`);
      return NextResponse.json({ success: true, message: `IP ${trimmed} added to ban list.` });
    }

    if (type === 'DEVICE') {
      db.banDevice(trimmed, reason || `Manually banned by ${admin.display_name}`);
      return NextResponse.json({ success: true, message: `Device signature ${trimmed} added to ban list.` });
    }

    return NextResponse.json({ error: 'Invalid ban type. Expected IP or DEVICE.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to apply ban.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required.' }, { status: 400 });
    }

    const removed = db.removeBannedEntry(id);
    return NextResponse.json({ success: removed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove ban.' }, { status: 500 });
  }
}
