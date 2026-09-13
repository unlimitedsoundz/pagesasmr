export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireUser();
    const profile = db.getProfileById(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json({
      signed: Boolean(profile.agreement_signed),
      signed_at: profile.agreement_signed_at || null,
      signature_name: profile.agreement_signature_name || null,
      creator_name: profile.display_name,
      creator_email: profile.email,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { signature_name, confirmed_adult, confirmed_terms, confirmed_original } = body;

    if (!signature_name || typeof signature_name !== 'string' || !signature_name.trim()) {
      return NextResponse.json({ error: 'Legal signature name is required.' }, { status: 400 });
    }

    if (!confirmed_adult || !confirmed_terms || !confirmed_original) {
      return NextResponse.json(
        { error: 'All agreement declarations must be confirmed prior to execution.' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const cleanSignature = signature_name.trim();

    const updated = db.updateProfile(user.id, {
      agreement_signed: true,
      agreement_signed_at: timestamp,
      agreement_signature_name: cleanSignature,
      is_adult_confirmed: true,
    });

    return NextResponse.json({
      success: true,
      signed: true,
      signed_at: timestamp,
      signature_name: cleanSignature,
      profile: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Signing failed' }, { status: 400 });
  }
}
