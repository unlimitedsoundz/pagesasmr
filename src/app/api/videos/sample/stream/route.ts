export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin, getSignedVideoUrl } from '@/lib/supabase';
import { PLATFORM_ID } from '@/lib/constants';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT_UPLOADS_DIR = path.resolve(process.cwd(), '../../uploads');
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const TMP_UPLOADS_DIR = path.join(os.tmpdir(), 'uploads');

/**
 * GET /api/videos/sample/stream
 * Public streaming endpoint for Pink Room Pages guideline benchmark sample video.
 * Accessible to creators to preview quality standards before uploading.
 */
export async function GET(req: NextRequest) {
  // 1. Try fetching most recent sample from Supabase first
  let primarySample: any = null;
  try {
    const { data: supaSamples } = await supabaseAdmin
      .from('guideline_samples')
      .select('*')
      .or(`platform_id.eq.${PLATFORM_ID},category.eq.PAGE_TURNING`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (supaSamples && supaSamples.length > 0) {
      const pageSamples = supaSamples.filter(
        (gs: any) =>
          (gs.platform_id === PLATFORM_ID || gs.category === 'PAGE_TURNING') &&
          gs.category !== 'THIGH_FLAPPING_AND_GUM_CHEWING' &&
          gs.platform_id !== 'pinkroom_main'
      );
      if (pageSamples.length > 0) {
        primarySample = pageSamples[0];
      }
    }
  } catch (e) {
    console.error('Supabase guideline_samples lookup error:', e);
  }

  // 2. Fall back to local DB if Supabase query returned nothing
  if (!primarySample) {
    const samples = db.getGuidelineSamples();
    primarySample = samples[0];
  }


  if (!primarySample || !primarySample.video_url) {
    return new NextResponse(
      JSON.stringify({
        error: 'No official sample video has been uploaded yet. An administrator can upload one in Admin Settings.',
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. If external or Supabase Storage URL, redirect directly
  if (primarySample.video_url.startsWith('http://') || primarySample.video_url.startsWith('https://')) {
    return NextResponse.redirect(new URL(primarySample.video_url), 307);
  }

  // 4. Extract target key if relative path (format: /api/videos/<key>/stream)
  const urlParts = primarySample.video_url.split('/');
  const fileKey = urlParts[3] || primarySample.id;

  const possiblePaths = [
    path.join(ROOT_UPLOADS_DIR, fileKey),
    path.join(ROOT_UPLOADS_DIR, `${fileKey}.mp4`),
    path.join(ROOT_UPLOADS_DIR, `${fileKey}.mov`),
    path.join(LOCAL_UPLOADS_DIR, fileKey),
    path.join(LOCAL_UPLOADS_DIR, `${fileKey}.mp4`),
    path.join(LOCAL_UPLOADS_DIR, `${fileKey}.mov`),
    path.join(TMP_UPLOADS_DIR, fileKey),
    path.join(TMP_UPLOADS_DIR, `${fileKey}.mp4`),
    path.join(TMP_UPLOADS_DIR, `${fileKey}.mov`),
  ];

  let filePath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (filePath) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const rangeHeader = req.headers.get('range');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.mov' ? 'video/quicktime' : 'video/mp4';

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      const nodeStream = fileStream as unknown as ReadableStream;
      return new NextResponse(nodeStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const fileStream = fs.createReadStream(filePath);
    const nodeStream = fileStream as unknown as ReadableStream;
    return new NextResponse(nodeStream, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // 5. Try signed Supabase URL if file isn't on local disk
  try {
    const signedUrl = await getSignedVideoUrl(fileKey);
    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }
  } catch {}

  // 6. If relative url starts with '/', redirect
  if (primarySample.video_url.startsWith('/')) {
    return NextResponse.redirect(new URL(primarySample.video_url, req.url), 307);
  }

  return new NextResponse(
    JSON.stringify({ error: 'Sample video file not found on server.' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}
