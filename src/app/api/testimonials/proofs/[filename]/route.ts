export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { supabaseAdmin } from '@/lib/supabase';

const PROOFS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads', 'proofs')
  : path.join(process.cwd(), 'uploads', 'proofs');
const TMP_PROOFS_DIR = path.join(os.tmpdir(), 'uploads', 'proofs');

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: rawFilename } = await params;
    const filename = path.basename(rawFilename);
    const possiblePaths = [
      path.join(PROOFS_DIR, filename),
      path.join(TMP_PROOFS_DIR, filename),
      path.join(process.cwd(), 'uploads', 'proofs', filename),
      path.join(process.cwd(), 'public', 'proofs', filename),
    ];

    let filePath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      // Try download from Supabase storage proofs bucket
      try {
        const { data: supaData, error } = await supabaseAdmin.storage
          .from('proofs')
          .download(filename);
        if (!error && supaData) {
          const ext = path.extname(filename).toLowerCase();
          const contentType = MIME_MAP[ext] || 'application/octet-stream';
          const arrayBuf = await supaData.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
          });
        }
      } catch {}
      return new NextResponse('Proof image not found', { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('Error serving proof image:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
