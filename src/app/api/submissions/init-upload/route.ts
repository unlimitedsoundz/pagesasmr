export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatCreatorPayoutInfo } from '@/lib/payoutDetails';
import { MIN_VIDEO_DURATION_SECONDS, MAX_UPLOAD_SIZE_BYTES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to upload videos.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const isSample = Boolean(body.isSample);
    const profile = db.getProfileById(user.id);

    if (profile && !profile.agreement_signed) {
      return NextResponse.json(
        { error: 'You must sign the Master Creator Agreement before uploading recordings.' },
        { status: 403 }
      );
    }

    const payoutInfo = formatCreatorPayoutInfo(profile);
    if (!payoutInfo.isConfigured && isSample) {
      return NextResponse.json(
        {
          error:
            'Payout account required: Please configure your local bank account or payout destination in Settings before submitting your audition sample so we can disburse your $1.00 audition bonus upon approval.',
          requiresPayoutSetup: true,
        },
        { status: 400 }
      );
    }

    if (!isSample && profile && profile.role === 'CREATOR' && profile.sample_status !== 'APPROVED') {
      return NextResponse.json(
        {
          error:
            'Audition sample required: You must submit a 30-second audition sample and receive Admin approval before uploading full 3+ minute videos.',
        },
        { status: 403 }
      );
    }

    const submissionId = crypto.randomUUID();
    const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL || process.env.MEDIA_SERVICE_URL || '';
    const tusEndpoint = mediaUrl ? `${mediaUrl.replace(/\/+$/, '')}/files/` : '/api/upload';

    return NextResponse.json({
      success: true,
      submissionId,
      tusEndpoint,
      storageProvider: mediaUrl ? 'hostinger' : (process.env.STORAGE_PROVIDER || 'hostinger'),
      maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
      minDurationSeconds: isSample ? 30 : MIN_VIDEO_DURATION_SECONDS,
    });
  } catch (err: any) {
    console.error('[Pages] init-upload error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
