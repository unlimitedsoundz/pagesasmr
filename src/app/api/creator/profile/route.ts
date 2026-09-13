export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await db.getProfileByIdAsync(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json(
      { profile },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const {
      displayName,
      country,
      bio,
      avatarUrl,
      preferredCategory,
      paymentMethod,
      paymentDetails,
      payment_method,
      payment_details,
    } = body;

    const resolvedMethod = paymentMethod !== undefined ? paymentMethod : payment_method;
    const resolvedDetails = paymentDetails !== undefined ? paymentDetails : payment_details;

    const updated = await db.updateProfileAsync(user.id, {
      ...(displayName !== undefined ? { display_name: displayName.trim() } : {}),
      ...(country !== undefined ? { country: country.trim() } : {}),
      ...(bio !== undefined ? { bio: bio.trim() } : {}),
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
      ...(preferredCategory ? { preferred_category: preferredCategory } : {}),
      ...(resolvedMethod !== undefined ? { payment_method: resolvedMethod } : {}),
      ...(resolvedDetails !== undefined ? { payment_details: resolvedDetails } : {}),
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 400 });
  }
}
