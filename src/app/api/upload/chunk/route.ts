export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { extractVideoDuration, extractVideoDimensions } from '@/lib/media';
import { db } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';
import { formatCreatorPayoutInfo } from '@/lib/payoutDetails';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to upload videos.' }, { status: 401 });
    }

    const formData = await req.formData();
    const chunk = formData.get('chunk') as File | null;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const totalChunks = parseInt(formData.get('totalChunks') as string, 10);
    const submissionId = formData.get('submissionId') as string;
    const fileName = (formData.get('fileName') as string) || 'video.mp4';
    const clientDuration = Number(formData.get('duration_seconds') || 0);
    const isSample = formData.get('is_sample') === 'true' || formData.get('is_sample') === '1';

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !submissionId) {
      return NextResponse.json({ error: 'Missing required chunk upload parameters.' }, { status: 400 });
    }

    // Temporary chunk directory for this submission
    const tempDir = path.join(process.cwd(), 'data', 'temp_chunks', submissionId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save current chunk part
    const chunkArrayBuffer = await chunk.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkArrayBuffer);
    const partPath = path.join(tempDir, `part-${String(chunkIndex).padStart(6, '0')}`);
    fs.writeFileSync(partPath, chunkBuffer);

    // If more chunks remain, acknowledge receipt
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({
        success: true,
        chunkIndex,
        totalChunks,
        receivedBytes: chunkBuffer.length,
      });
    }

    // Last chunk received: Assemble parts in numerical order
    const ext = fileName.toLowerCase().endsWith('.mov') ? '.mov' : '.mp4';
    const assembledPath = path.join(tempDir, `assembled-${submissionId}${ext}`);
    const writeStream = fs.createWriteStream(assembledPath);

    for (let i = 0; i < totalChunks; i++) {
      const partFile = path.join(tempDir, `part-${String(i).padStart(6, '0')}`);
      if (!fs.existsSync(partFile)) {
        writeStream.destroy();
        return NextResponse.json(
          { error: `Missing upload chunk part ${i} of ${totalChunks}. Please resume or retry.` },
          { status: 400 }
        );
      }
      const partBytes = fs.readFileSync(partFile);
      writeStream.write(partBytes);
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', reject);
    });

    const assembledBuffer = fs.readFileSync(assembledPath);
    const actualSize = assembledBuffer.length;
    const mimeType = fileName.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';

    // Verify media duration
    let durationSeconds: number;
    try {
      durationSeconds = await extractVideoDuration(assembledBuffer, mimeType, clientDuration);
    } catch (durErr) {
      if (clientDuration > 0) {
        durationSeconds = clientDuration;
      } else {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        return NextResponse.json(
          { error: 'Could not read valid media duration from video container headers.' },
          { status: 422 }
        );
      }
    }

    // Business rules validation
    const isAdminUpload = user.role === 'ADMIN';

    if (isAdminUpload) {
      // Admin reference clips have no minimum duration
    } else if (isSample) {
      const profile = db.getProfileById(user.id);
      if (profile && !profile.agreement_signed) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        return NextResponse.json(
          { error: 'You must sign the Master Creator Agreement before uploading your audition sample.' },
          { status: 403 }
        );
      }

      const payoutInfo = formatCreatorPayoutInfo(profile);
      if (!payoutInfo.isConfigured) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        return NextResponse.json(
          {
            error:
              'Payout account required: Please configure your local bank account or payout destination in Settings before submitting your audition sample so we can disburse your $1.00 audition bonus upon approval.',
            requiresPayoutSetup: true,
          },
          { status: 400 }
        );
      }

      if (durationSeconds < 30) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        return NextResponse.json(
          {
            error: `Audition sample rejected: Video duration is only ${Math.round(
              durationSeconds
            )} seconds. Audition samples must be at least 30 seconds long to assess audio quality.`,
            durationSeconds,
            minRequiredSeconds: 30,
          },
          { status: 422 }
        );
      }
    } else {
      const profile = db.getProfileById(user.id);
      if (profile && profile.role === 'CREATOR' && profile.sample_status !== 'APPROVED') {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        return NextResponse.json(
          {
            error:
              'Audition sample required: You must submit a 30-second audition sample and receive Admin approval before uploading full 3+ minute videos.',
          },
          { status: 403 }
        );
      }

      const settings = db.getSettings();
      const minDuration = settings.min_duration_seconds || 180;
      if (durationSeconds < minDuration) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        return NextResponse.json(
          {
            error: `Video rejected: Video duration is only ${Math.round(
              durationSeconds
            )} seconds. Full production videos must be at least 3 minutes (${minDuration}s).`,
            durationSeconds,
            minRequiredSeconds: minDuration,
          },
          { status: 422 }
        );
      }
    }

    // Generate unique file ID
    const uniqueFileId = `video-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const diskFileName = `${uniqueFileId}${ext}`;

    // Resolve persistent local storage directory
    const uploadsDir = path.resolve(process.env.LOCAL_MEDIA_DIR || path.join(process.cwd(), 'uploads'));
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const diskPath = path.join(uploadsDir, diskFileName);

    try {
      fs.writeFileSync(diskPath, assembledBuffer);
    } catch (fsErr: any) {
      console.error('[Upload Chunk] Failed to save video to disk storage:', fsErr);
      return NextResponse.json(
        { error: `Could not save video to server storage: ${fsErr?.message || 'disk write error'}` },
        { status: 500 }
      );
    }

    // Video orientation and dimensions
    const dimensions = extractVideoDimensions(assembledBuffer);
    const streamUrl = `/api/videos/${diskFileName}/stream`;

    // Clean up temporary chunks
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}

    return NextResponse.json({
      success: true,
      fileKey: diskFileName,
      fileUrl: streamUrl,
      fileName,
      fileSizeBytes: actualSize,
      width: dimensions?.width,
      height: dimensions?.height,
      durationSeconds,
      storageProvider: 'hostinger',
    });
  } catch (err: any) {
    console.error('[Upload Chunk Route] error:', err);
    return NextResponse.json({ error: err.message || 'Chunk upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('submissionId');
    if (submissionId) {
      const tempDir = path.join(process.cwd(), 'data', 'temp_chunks', submissionId);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
