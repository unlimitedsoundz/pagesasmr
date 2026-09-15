export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSignedVideoUrl, getSignedVideoUrlResult, extractStorageKey } from '@/lib/supabase';
import { getStorageProvider } from '@/lib/storage';
import { createMediaAccessToken, getMediaServiceUrl } from '@/lib/mediaAccess';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT_UPLOADS_DIR = path.resolve(process.env.LOCAL_MEDIA_DIR || path.resolve(process.cwd(), '../../uploads'));
const MEDIA_DIR = process.env.MEDIA_STORAGE_DIR ? path.resolve(process.env.MEDIA_STORAGE_DIR, 'originals') : ROOT_UPLOADS_DIR;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const TMP_UPLOADS_DIR = path.join(os.tmpdir(), 'uploads');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rawId = params.id;
  if (!rawId) {
    return NextResponse.json({ error: 'Video ID or storage key required.' }, { status: 400 });
  }

  // 1. Determine clean storage key and target submission (if any)
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
    if (targetSubmission && targetSubmission.file_url) {
      const extractedFromSub = extractStorageKey(targetSubmission.file_url);
      if (extractedFromSub) {
        targetKey = extractedFromSub;
      }
    }
  } catch (err) {
    console.warn('Submission lookup warning in stream route:', err);
  }

  // Special alias: /api/videos/sample/stream dynamically routes to the active guideline sample
  if (rawId === 'sample' || targetKey === 'sample') {
    const guidelineSamples = db.getGuidelineSamples();
    const activeSample = guidelineSamples[0];
    if (activeSample?.video_url) {
      if (activeSample.video_url.startsWith('http://') || activeSample.video_url.startsWith('https://')) {
        return NextResponse.redirect(activeSample.video_url, 307);
      }
      const extracted = extractStorageKey(activeSample.video_url);
      if (extracted) {
        targetKey = extracted;
      }
    }
  }

  // 2. Guideline / Benchmark sample check
  const isGuidelineSample =
    rawId === 'sample' ||
    targetKey === 'sample' ||
    targetKey.startsWith('guideline-') ||
    targetKey.startsWith('sample-') ||
    targetKey.startsWith('guide-') ||
    targetKey.includes('benchmark') ||
    db.getGuidelineSamples().some((g) => g.video_url && g.video_url.includes(targetKey));

  // 3. Authorization check
  const user = await getCurrentUser();
  if (!user && !isGuidelineSample) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required to access private video assets.' }, { status: 401 });
  }

  if (user && user.role !== 'ADMIN' && !isGuidelineSample) {
    const isOwner =
      (targetSubmission && targetSubmission.creator_id === user.id) ||
      targetKey.includes(user.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You can only access your own submitted recordings.' }, { status: 403 });
    }
  }

  const wantsJson =
    req.nextUrl.searchParams.get('format') === 'json' ||
    req.nextUrl.searchParams.get('action') === 'url' ||
    req.headers.get('accept')?.includes('application/json');

  // 4. Check persistent local filesystem first
  const possiblePaths = [
    path.join(MEDIA_DIR, targetKey),
    path.join(MEDIA_DIR, `${targetKey}.mp4`),
    path.join(MEDIA_DIR, `${targetKey}.mov`),
    path.join(ROOT_UPLOADS_DIR, targetKey),
    path.join(ROOT_UPLOADS_DIR, `${targetKey}.mp4`),
    path.join(ROOT_UPLOADS_DIR, `${targetKey}.mov`),
    path.join(UPLOADS_DIR, targetKey),
    path.join(UPLOADS_DIR, `${targetKey}.mp4`),
    path.join(UPLOADS_DIR, `${targetKey}.mov`),
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
    if (wantsJson) {
      return NextResponse.json({
        success: true,
        url: `/api/videos/${encodeURIComponent(targetKey)}/stream`,
        direct: false,
        source: 'local',
        videoId: rawId,
      });
    }

    const stat = fs.statSync(actualFilePath);
    const fileSize = stat.size;
    const range = req.headers.get('range');
    const cacheHeader = 'private, max-age=86400, stale-while-revalidate=604800';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(actualFilePath, { start, end });

      const readable = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(readable as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'video/mp4',
          'Cache-Control': cacheHeader,
        },
      });
    } else {
      const fileStream = fs.createReadStream(actualFilePath);
      const readable = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(readable as any, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Content-Type': 'video/mp4',
          'Cache-Control': cacheHeader,
        },
      });
    }
  }

  const mediaBase = getMediaServiceUrl();
  const mediaToken = (targetSubmission?.storage_provider === 'hostinger' || targetSubmission?.file_url?.includes('media.pinkroom.online')) && !isGuidelineSample
    ? createMediaAccessToken(targetKey)
    : null;
  if (mediaBase && mediaToken) {
    const mediaUrl = new URL(`${mediaBase}/media/stream/${encodeURIComponent(targetKey)}`);
    mediaUrl.searchParams.set('token', mediaToken);
    if (req.nextUrl.searchParams.get('download') === 'true') {
      mediaUrl.searchParams.set('download', 'true');
      mediaUrl.searchParams.set('filename', req.nextUrl.searchParams.get('filename') || `${targetKey}.mp4`);
    }
    if (wantsJson) {
      return NextResponse.json({ success: true, url: mediaUrl.toString(), direct: true, source: 'hostinger', videoId: rawId });
    }
    return NextResponse.redirect(mediaUrl, { status: 307, headers: { 'Cache-Control': 'private, no-store' } });
  }

  // 5. Generate Supabase / S3 signed playback URL
  try {
    const isDownload = req.nextUrl.searchParams.get('download') === 'true' || req.nextUrl.searchParams.get('download') === '1';
    const downloadFilename = req.nextUrl.searchParams.get('filename') || `${targetKey}.mp4`;
    const result = await getSignedVideoUrlResult(
      targetKey,
      3600,
      isDownload ? { download: downloadFilename } : undefined
    );

    if (result.url) {
      if (wantsJson) {
        return NextResponse.json({
          success: true,
          url: result.url,
          direct: true,
          source: result.source || 'supabase',
          videoId: rawId,
          download: isDownload,
        });
      }

      // 307 Redirect directly to signed URL (no-cache so stale/expired URLs are not cached by browsers)
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
          message: 'This video is stored on Storj DCS which has consumed its monthly project bandwidth quota. Please upgrade or add billing at storj.io to restore playback.',
        },
        { status: 429 }
      );
    }
  } catch (err) {
    console.warn('Could not get signed video URL for streaming:', err);
  }

  if (wantsJson) {
    return NextResponse.json(
      {
        error: 'Video file not found in active storage repository.',
        file_missing: true,
        videoId: rawId,
      },
      { status: 404 }
    );
  }

  return new NextResponse(
    JSON.stringify({
      message: 'Video file not found in active storage repository.',
      file_missing: true,
      videoId: rawId,
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
