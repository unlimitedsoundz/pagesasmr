export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { supabaseAdmin } from '@/lib/supabase';

const PROOFS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads', 'proofs')
  : path.join(process.cwd(), 'uploads', 'proofs');

function ensureProofsDir() {
  try {
    if (!fs.existsSync(PROOFS_DIR)) {
      fs.mkdirSync(PROOFS_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('ensureProofsDir warning:', e);
  }
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_PROOF_SIZE_BYTES = 12 * 1024 * 1024; // 12MB

// Privacy: keep first name visible, asterisk only last name(s) for public display, e.g. "Jane Doe" -> "Jane D***"
function maskCreatorName(name?: string | null): string {
  let base = (name || '').trim();
  // Never expose an email used as a display name — keep only the local part
  if (base.includes('@')) {
    base = base.split('@')[0].replace(/[._-]+/g, ' ').trim();
  }
  if (!base) return 'Creator';

  const words = base.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Creator';

  if (words.length === 1) {
    // Only a first name or username provided (e.g. "Olivia", "Joseph")
    const single = words[0];
    return single.charAt(0).toUpperCase() + single.slice(1);
  }

  // Multiple words: keep first name(s) as-is, asterisk only the last name
  const firstNames = words
    .slice(0, -1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const rawLast = words[words.length - 1];
  const cleanLast = rawLast.replace(/[^a-zA-Z0-9]/g, '');
  const initial = (cleanLast.charAt(0) || rawLast.charAt(0)).toUpperCase();
  const starsCount = Math.min(Math.max(cleanLast.length - 1, 3), 6);
  const maskedLast = `${initial}${'*'.repeat(starsCount)}`;

  return [...firstNames, maskedLast].join(' ');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minRating = searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!, 10) : undefined;
    const country = searchParams.get('country') || undefined;

    // Sync live testimonials from Supabase platform_settings fallback
    await db.syncTestimonialsFromSupabase().catch(() => {});

    let testimonials = db.getTestimonials({ status: 'APPROVED', minRating });

    if (country && country !== 'ALL') {
      testimonials = testimonials.filter(
        (t) => t.creator_country?.toLowerCase() === country.toLowerCase()
      );
    }

    // Calculate aggregated statistics
    const allApproved = db.getTestimonials({ status: 'APPROVED' });
    const totalReviews = allApproved.length;
    const ratingSum = allApproved.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 5.0;

    const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalPaidUsd = 0;
    for (const t of allApproved) {
      const r = Math.round(t.rating) || 5;
      if (ratingCounts[r] !== undefined) ratingCounts[r]++;
      totalPaidUsd += t.amount_usd || 0;
    }

    // Strip emails and mask names before sending to the public
    const publicTestimonials = testimonials.map(({ creator_email, ...rest }) => ({
      ...rest,
      creator_name: maskCreatorName(rest.creator_name),
    }));

    return NextResponse.json({
      testimonials: publicTestimonials,
      stats: {
        totalReviews,
        averageRating,
        ratingCounts,
        totalPaidUsd,
      },
    });
  } catch (error: any) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    ensureProofsDir();

    const formData = await req.formData();
    const payoutId = formData.get('payout_id') as string | null;
    const ratingStr = formData.get('rating') as string | null;
    const review = (formData.get('review') as string | null)?.trim();
    const file = formData.get('proof') as File | null;

    if (!payoutId) {
      return NextResponse.json({ error: 'Payout ID is required.' }, { status: 400 });
    }

    const rating = parseInt(ratingStr || '0', 10);
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Please provide a valid star rating between 1 and 5 stars.' },
        { status: 400 }
      );
    }

    if (!review || review.length < 10) {
      return NextResponse.json(
        { error: 'Please write a brief review (at least 10 characters) about your payout experience.' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Proof of payout is mandatory. Please upload a screenshot of your bank, wallet, or mobile money receipt.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PROOF_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Proof image exceeds the 12MB size limit. Please upload a smaller image.' },
        { status: 400 }
      );
    }

    const mime = file.type || '';
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a JPG, PNG, or WebP screenshot.' },
        { status: 400 }
      );
    }

    // Verify payout exists and belongs to user
    const payout = db.getPayoutRequests().find((p) => p.id === payoutId);
    if (!payout) {
      return NextResponse.json({ error: 'Payout request not found.' }, { status: 404 });
    }

    if (payout.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to review this payout.' }, { status: 403 });
    }

    if (payout.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Testimonials can only be submitted for completed/paid payouts.' },
        { status: 400 }
      );
    }

    // Check if already reviewed
    const existing = db.getTestimonialByPayoutId(payoutId);
    if (existing) {
      return NextResponse.json(
        { error: 'A review and proof have already been submitted for this payout.' },
        { status: 400 }
      );
    }

    let ext = '.png';
    if (mime === 'image/jpeg' || mime === 'image/jpg') ext = '.jpg';
    else if (mime === 'image/webp') ext = '.webp';

    const uniqueName = `proof-${user.id}-${payoutId.slice(0, 8)}-${Date.now()}${ext}`;
    const filePath = path.join(PROOFS_DIR, uniqueName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to local disk
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.warn('Local proof write warning:', fsErr);
    }

    // Upload to Supabase storage proofs bucket
    let proofImageUrl = `/api/testimonials/proofs/${uniqueName}`;
    try {
      const { error: supaErr } = await supabaseAdmin.storage
        .from('proofs')
        .upload(uniqueName, buffer, {
          contentType: mime,
          upsert: true,
        });

      if (!supaErr) {
        const { data: publicData } = supabaseAdmin.storage
          .from('proofs')
          .getPublicUrl(uniqueName);
        if (publicData?.publicUrl) {
          proofImageUrl = publicData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn('Supabase proofs storage exception:', storageErr);
    }

    const userProfile = db.getProfileById(user.id);

    const testimonial = db.createTestimonial({
      platform_id: payout.platform_id || 'pinkroom_pages',
      creator_id: user.id,
      creator_name: userProfile?.display_name || payout.creator_name || 'Creator',
      creator_email: userProfile?.email || payout.creator_email || '',
      creator_avatar_url: userProfile?.avatar_url,
      creator_country: userProfile?.country,
      payout_id: payout.id,
      amount_usd: payout.amount_usd,
      payment_method: payout.payment_method,
      rating,
      review,
      proof_image_url: proofImageUrl,
      status: 'PENDING',
    });

    return NextResponse.json({
      success: true,
      testimonial,
      message: 'Testimonial and proof of payout submitted successfully!',
    });
  } catch (error: any) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}
