export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseAdmin, getSignedVideoUrl, getSignedVideoUrlResult, extractStorageKey } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT_UPLOADS_DIR = path.resolve(process.cwd(), '../../uploads');
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const TMP_UPLOADS_DIR = path.join(os.tmpdir(), 'uploads');

/**
 * GET /api/videos/[id]/download
 * Dedicated file download route designed specifically to save videos directly to device storage
 * in Mobile Chrome (Android/iOS) and desktop browsers, preventing unwanted video player preview.
 * 
 * Sets Content-Disposition: attachment on all responses.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rawId = params.id;

  // 1. Check if this is a guideline benchmark sample
  let isGuidelineSample =
    rawId.startsWith('guideline-') ||
    rawId.startsWith('sample-') ||
    rawId.startsWith('guide-') ||
    rawId.includes('benchmark') ||
    rawId.includes('reference');

  if (!isGuidelineSample) {
    try {
      const samples = db.getGuidelineSamples();
      if (samples.some((s: any) => s.video_url && s.video_url.includes(rawId))) {
        isGuidelineSample = true;
      } else {
        const { data: supaSamples } = await supabaseAdmin
          .from('guideline_samples')
          .select('video_url')
          .or('platform_id.eq.pinkroom_pages,category.eq.PAGE_TURNING')
          .ilike('video_url', `%${rawId}%`);
        if (supaSamples && supaSamples.length > 0) {
          isGuidelineSample = true;
        }
      }
    } catch {}
  }

  // 2. Resolve submission and target storage key
  let targetKey = extractStorageKey(rawId);
  let targetSubmission: any = null;

  try {
    if (rawId.startsWith('sub-') || rawId.length === 36) {
      targetSubmission = db.getSubmissionById(rawId);
    }
    if (!targetSubmission) {
      const allSubs = db.getSubmissions();
      targetSubmission = allSubs.find(
        (s) => s.id === rawId || (s.file_url && s.file_url.includes(targetKey)) || (s.file_name && s.file_name.includes(targetKey))
      );
    }

    if (targetSubmission?.file_url) {
      const extractedFromSub = extractStorageKey(targetSubmission.file_url);
      if (extractedFromSub) {
        targetKey = extractedFromSub;
      }
    }
  } catch (err) {
    console.warn('[Pages Download API] Could not resolve submission:', err);
  }

  // 3. Authorization check
  const user = await getCurrentUser();
  if (!user && !isGuidelineSample) {
    if (!targetSubmission && !targetKey.startsWith('video-') && !targetKey.startsWith('prod-') && !targetKey.startsWith('audition-')) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to download video assets.' }, { status: 401 });
    }
  }

  if (user && user.role !== 'ADMIN' && !isGuidelineSample) {
    const isOwner = (targetSubmission && targetSubmission.creator_id === user.id) || targetKey.includes(user.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You can only download your own submitted video files.' }, { status: 403 });
    }
  }

  // 4. Determine clean download filename
  const queryFilename = req.nextUrl.searchParams.get('filename');
  let cleanFilename = 'video.mp4';

  if (queryFilename) {
    cleanFilename = queryFilename.trim();
  } else if (targetSubmission) {
    const safeTitle = (targetSubmission.title || 'video').replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_');
    const safeCreator = (targetSubmission.creator_name || 'creator').replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_');
    cleanFilename = `${safeTitle}_${safeCreator}.mp4`;
  } else {
    cleanFilename = `${targetKey.replace(/[^a-z0-9_\-]/gi, '_')}.mp4`;
  }

  if (!cleanFilename.toLowerCase().endsWith('.mp4') && !cleanFilename.toLowerCase().endsWith('.mov')) {
    cleanFilename += '.mp4';
  }

  const wantsJson =
    req.nextUrl.searchParams.get('format') === 'json' ||
    req.headers.get('accept')?.includes('application/json');

  // 5. Check local filesystem first
  const possiblePaths = [
    path.join(ROOT_UPLOADS_DIR, targetKey),
    path.join(ROOT_UPLOADS_DIR, `${targetKey}.mp4`),
    path.join(ROOT_UPLOADS_DIR, `${targetKey}.mov`),
    path.join(LOCAL_UPLOADS_DIR, targetKey),
    path.join(LOCAL_UPLOADS_DIR, `${targetKey}.mp4`),
    path.join(LOCAL_UPLOADS_DIR, `${targetKey}.mov`),
    path.join(process.cwd(), 'public', 'uploads', targetKey),
    path.join(process.cwd(), 'public', 'uploads', `${targetKey}.mp4`),
    path.join(process.cwd(), 'public', 'uploads', `${targetKey}.mov`),
    path.join(TMP_UPLOADS_DIR, targetKey),
    path.join(TMP_UPLOADS_DIR, `${targetKey}.mp4`),
    path.join(TMP_UPLOADS_DIR, `${targetKey}.mov`),
  ];

  let actualFilePath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      actualFilePath = p;
      break;
    }
  }

  if (actualFilePath) {
    const stat = fs.statSync(actualFilePath);
    const fileSize = stat.size;

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        url: `/api/videos/${encodeURIComponent(targetKey)}/download?filename=${encodeURIComponent(cleanFilename)}`,
        direct: false,
        filename: cleanFilename,
        size: fileSize,
      });
    }

    const fileStream = fs.createReadStream(actualFilePath);
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize.toString(),
        'Cache-Control': 'private, no-cache, no-store',
      },
    });
  }

  // 6. Check cloud storage (Supabase / S3 with circuit breaker)
  try {
    const result = await getSignedVideoUrlResult(targetKey, 3600, { download: cleanFilename });
    if (result.url) {
      if (wantsJson) {
        return NextResponse.json({
          success: true,
          url: result.url,
          direct: true,
          filename: cleanFilename,
        });
      }

      return NextResponse.redirect(result.url, {
        status: 307,
        headers: {
          'Cache-Control': 'private, no-cache, no-store',
        },
      });
    }

    if (result.bandwidthExceeded) {
      return NextResponse.json(
        {
          error: 'Storage bandwidth limit reached on external provider (Storj DCS).',
          bandwidth_exceeded: true,
          code: 'STORAGE_BANDWIDTH_EXCEEDED',
          provider: 'storj',
          videoId: rawId,
          filename: cleanFilename,
          message: 'This video is stored on Storj DCS which has consumed its monthly project bandwidth quota. Please upgrade or add billing at storj.io to enable downloads.',
        },
        { status: 429 }
      );
    }
  } catch (err) {
    console.warn('[Pages Download API] Could not generate signed download URL:', err);
  }

  return NextResponse.json(
    { error: 'Video recording not found for download.', videoId: rawId },
    { status: 404 }
  );
}
