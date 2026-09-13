export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseAdmin, getSignedVideoUrl } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT_UPLOADS_DIR = path.resolve(process.cwd(), '../../uploads');
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const TMP_UPLOADS_DIR = path.join(os.tmpdir(), 'uploads');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rawId = params.id;

  // 1. Check if this file is a guideline / benchmark sample
  let isGuidelineSample =
    rawId.startsWith('guideline-') ||
    rawId.startsWith('sample-') ||
    rawId.startsWith('guide-') ||
    rawId.includes('benchmark') ||
    rawId.includes('reference');

  if (!isGuidelineSample) {
    try {
      const localSamples = db.getGuidelineSamples();
      if (localSamples.some((s: any) => s.video_url && s.video_url.includes(rawId))) {
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

  // 2. Authorization check: Guideline reference samples are public for all creators
  if (!isGuidelineSample) {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized: Access to private video recordings requires authentication.', {
        status: 401,
      });
    }

    if (user.role !== 'ADMIN') {
      const isSubmissionId = rawId.startsWith('sub-');
      if (isSubmissionId) {
        const submission = db.getSubmissionById(rawId);
        if (!submission || submission.creator_id !== user.id) {
          return new NextResponse('Forbidden: You can only view your own submitted recordings.', {
            status: 403,
          });
        }
      }
    }
  }

  let targetKey = rawId;
  if (rawId.startsWith('sub-') || rawId.length === 36) {
    try {
      const sub = db.getSubmissionById(rawId);
      if (sub && sub.file_url) {
        const match = sub.file_url.match(/\/api\/videos\/([^/?#]+)\/stream/);
        if (match) {
          targetKey = match[1];
        }
      }
    } catch {}
  }

  const possiblePaths = [
    path.join(ROOT_UPLOADS_DIR, targetKey),
    path.join(ROOT_UPLOADS_DIR, `${targetKey}.mp4`),
    path.join(ROOT_UPLOADS_DIR, `${targetKey}.mov`),
    path.join(LOCAL_UPLOADS_DIR, targetKey),
    path.join(LOCAL_UPLOADS_DIR, `${targetKey}.mp4`),
    path.join(LOCAL_UPLOADS_DIR, `${targetKey}.mov`),
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

  const wantsJson =
    req.nextUrl.searchParams.get('format') === 'json' ||
    req.headers.get('accept')?.includes('application/json');

  if (actualFilePath) {
    const stat = fs.statSync(actualFilePath);
    const fileSize = stat.size;

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        url: `/api/videos/${encodeURIComponent(targetKey)}/stream`,
        direct: false,
        size: fileSize,
      });
    }

    const range = req.headers.get('range');
    const isMov = actualFilePath.endsWith('.mov');
    const contentType = isMov ? 'video/quicktime' : 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(actualFilePath, { start, end });

      const readableStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(readableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
        },
      });
    }

    const fileStream = fs.createReadStream(actualFilePath);
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  try {
    const signedUrl = await getSignedVideoUrl(targetKey);
    if (!signedUrl) {
      return new NextResponse('Video not found', { status: 404 });
    }

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        url: signedUrl,
        direct: true,
      });
    }

    return NextResponse.redirect(signedUrl);
  } catch (e) {
    return new NextResponse('Video not found', { status: 404 });
  }
}
