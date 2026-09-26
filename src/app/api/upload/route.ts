export const dynamic = 'force-dynamic';
// Allow up to 5 minutes for large MOV/MP4 uploads + Supabase transfer
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { extractVideoDuration, extractVideoDimensions } from '@/lib/media';
import { db } from '@/lib/db';
import { uploadToSupabaseStorage, supabaseAdmin } from '@/lib/supabase';
import { formatCreatorPayoutInfo } from '@/lib/payoutDetails';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to upload videos.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isSample =
      formData.get('is_sample') === 'true' ||
      formData.get('is_sample') === '1' ||
      formData.get('isSample') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No video file provided.' }, { status: 400 });
    }

    // Gate full production uploads: creator must have approved 30s audition sample first
    if (!isSample && user.role === 'CREATOR') {
      const profile = db.getProfileById(user.id);
      if (profile && profile.sample_status !== 'APPROVED') {
        return NextResponse.json(
          {
            error:
              'Audition Required: You must submit a 30-second audition sample and receive Admin approval before you can upload full 3+ minute videos ($10 each).',
            code: 'AUDITION_SAMPLE_REQUIRED',
          },
          { status: 403 }
        );
      }
    }

    const fileName = file.name;
    const fileSizeBytes = file.size;
    const mimeType = file.type || 'video/mp4';

    // File format check
    const isAllowedExt = fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.mov');
    if (!isAllowedExt) {
      return NextResponse.json(
        { error: 'Invalid file format. Only MP4 and MOV video files are accepted.' },
        { status: 400 }
      );
    }

    // Settings check for max upload size
    const settings = db.getSettings();
    if (fileSizeBytes > settings.max_upload_size_bytes) {
      const maxMb = Math.round(settings.max_upload_size_bytes / (1024 * 1024));
      return NextResponse.json(
        { error: `File size exceeds the platform limit of ${maxMb}MB.` },
        { status: 400 }
      );
    }

    // Read bytes into buffer for server-side duration parsing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const clientDuration = Number(formData.get('duration_seconds') || 0);
    let durationSeconds: number;
    try {
      durationSeconds = await extractVideoDuration(buffer, mimeType, clientDuration);
    } catch (e: any) {
      if (clientDuration > 0) {
        durationSeconds = clientDuration;
      } else {
        return NextResponse.json(
          {
            error:
              'Unable to read media duration from video container headers. Please ensure the file is an intact MP4 or MOV recording.',
          },
          { status: 422 }
        );
      }
    }

    const isAdminUpload =
      user.role === 'ADMIN' ||
      formData.get('is_admin_sample') === 'true' ||
      formData.get('is_admin_sample') === '1';

    // Admin reference clips have no minimum duration limits
    if (isAdminUpload) {
      // Allow any duration for admin guideline/reference samples
    } else if (isSample) {
      const profile = db.getProfileById(user.id);
      if (profile && !profile.agreement_signed) {
        return NextResponse.json(
          { error: 'You must sign the Master Creator Agreement before uploading your audition sample.' },
          { status: 403 }
        );
      }

      const payoutInfo = formatCreatorPayoutInfo(profile);
      if (!payoutInfo.isConfigured) {
        return NextResponse.json(
          {
            error:
              'Payout account required: Please configure your local bank account or payout destination in Settings before submitting your audition sample so we can disburse your $1.00 audition bonus upon approval.',
            requiresPayoutSetup: true,
          },
          { status: 400 }
        );
      }

      // Creator audition sample check (min 28-30s)
      if (durationSeconds < 28) {
        return NextResponse.json(
          {
            error: `Audition rejected: Sample duration is only ${Math.round(
              durationSeconds
            )} seconds. Every audition sample must be at least 30 seconds long to qualify for review.`,
            durationSeconds,
            minRequiredSeconds: 30,
          },
          { status: 422 }
        );
      }
    } else {
      // Strict 180 seconds rule (3 minutes)
      const minRequiredSeconds = settings.min_duration_seconds || 180;
      if (durationSeconds < minRequiredSeconds) {
        const minutes = Math.floor(durationSeconds / 60);
        const remainingSeconds = Math.round(durationSeconds % 60);
        return NextResponse.json(
          {
            error: `Submission rejected: Video duration is only ${minutes}m ${remainingSeconds}s (${Math.round(
              durationSeconds
            )} seconds). Every page-turning submission must be at least 3 minutes (180 seconds) long to qualify for review and payout.`,
            durationSeconds,
            minRequiredSeconds,
          },
          { status: 422 }
        );
      }
    }

    // Generate unique file ID
    const uniqueFileId = isAdminUpload
      ? `guideline-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      : `video-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const extension = fileName.toLowerCase().endsWith('.mov') ? '.mov' : '.mp4';
    const diskFileName = `${uniqueFileId}${extension}`;

    // Resolve persistent local storage directory
    const uploadsDir = path.resolve(process.env.LOCAL_MEDIA_DIR || path.join(process.cwd(), 'uploads'));
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const diskPath = path.join(uploadsDir, diskFileName);

    // 1. Primary: Save persistent master copy to Hostinger disk
    try {
      fs.writeFileSync(diskPath, buffer);
      console.log(`[Pages Upload] Saved persistent video file to Hostinger storage: ${diskPath}`);
    } catch (fsErr: any) {
      console.error('[Pages Upload] Failed to save video to Hostinger disk storage:', fsErr);
      return NextResponse.json(
        { error: `Could not save video to server storage: ${fsErr?.message || 'disk write error'}` },
        { status: 500 }
      );
    }

    // 2. Secondary: Resilient cloud mirroring
    const isSupabaseForced = process.env.STORAGE_PROVIDER?.toLowerCase() === 'supabase';
    let storageProvider = 'hostinger';
    let streamUrl = `/api/videos/${diskFileName}/stream`;

    if (isAdminUpload) {
      try {
        const { error: supaErr } = await supabaseAdmin.storage
          .from('guideline-samples')
          .upload(diskFileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });
        if (!supaErr) {
          const { data: pubData } = supabaseAdmin.storage
            .from('guideline-samples')
            .getPublicUrl(diskFileName);
          if (pubData?.publicUrl) {
            streamUrl = pubData.publicUrl;
            storageProvider = 'supabase_public';
          }
        }
      } catch (adminUploadErr) {
        console.warn('[Pages Upload] Failed to mirror guideline sample to Supabase:', adminUploadErr);
      }
    } else if (isSupabaseForced || fileSizeBytes <= 50 * 1024 * 1024) {
      try {
        await uploadToSupabaseStorage(diskFileName, buffer, mimeType);
        if (isSupabaseForced) storageProvider = 'supabase';
      } catch (supaErr: any) {
        console.warn('[Pages Upload] Supabase backup mirror failed:', supaErr?.message || supaErr);
        if (isSupabaseForced) {
          return NextResponse.json(
            {
              error: `Video could not be saved to Supabase storage after multiple attempts. (${supaErr?.message || 'storage error'})`,
            },
            { status: 500 }
          );
        }
      }
    }

    const dimensions = extractVideoDimensions(buffer);

    return NextResponse.json({
      success: true,
      fileKey: diskFileName,
      storagePath: diskFileName,
      fileUrl: streamUrl,
      fileName,
      fileSizeBytes,
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      width: dimensions?.width,
      height: dimensions?.height,
      previewUrl: streamUrl,
      storageProvider,
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during upload processing.' },
      { status: 500 }
    );
  }
}
