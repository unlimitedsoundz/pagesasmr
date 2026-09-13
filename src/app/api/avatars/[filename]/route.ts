export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { supabaseAdmin } from '@/lib/supabase';

const AVATARS_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const TMP_AVATARS_DIR = path.join(os.tmpdir(), 'uploads', 'avatars');

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
  { params }: { params: { filename: string } }
) {
  try {
    const filename = path.basename(params.filename);
    const possiblePaths = [
      path.join(AVATARS_DIR, filename),
      path.join(TMP_AVATARS_DIR, filename),
    ];

    let filePath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      const { data: supaData, error } = await supabaseAdmin.storage.from('avatars').download(filename);
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
      return new NextResponse('Avatar not found', { status: 404 });
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
    return new NextResponse('Internal Error', { status: 500 });
  }
}
