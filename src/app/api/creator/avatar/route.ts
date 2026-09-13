export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { supabaseAdmin } from '@/lib/supabase';

const AVATARS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads', 'avatars')
  : path.join(process.cwd(), 'uploads', 'avatars');

function ensureAvatarsDir() {
  try {
    if (!fs.existsSync(AVATARS_DIR)) {
      fs.mkdirSync(AVATARS_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('ensureAvatarsDir warning:', e);
  }
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    ensureAvatarsDir();

    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No avatar image provided.' }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Avatar file exceeds the maximum 10MB size limit.' },
        { status: 400 }
      );
    }

    const mime = file.type || '';
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a JPG, PNG, WebP, or GIF image.' },
        { status: 400 }
      );
    }

    let ext = '.png';
    if (mime === 'image/jpeg') ext = '.jpg';
    else if (mime === 'image/webp') ext = '.webp';
    else if (mime === 'image/gif') ext = '.gif';

    const uniqueName = `avatar-${user.id}-${Date.now()}${ext}`;
    const filePath = path.join(AVATARS_DIR, uniqueName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      fs.writeFileSync(filePath, buffer);
    } catch {}

    let avatarUrl = `/api/avatars/${uniqueName}`;
    try {
      const { error: supaErr } = await supabaseAdmin.storage
        .from('avatars')
        .upload(uniqueName, buffer, {
          contentType: mime,
          upsert: true,
        });

      if (!supaErr) {
        const { data: publicData } = supabaseAdmin.storage
          .from('avatars')
          .getPublicUrl(uniqueName);
        if (publicData?.publicUrl) {
          avatarUrl = publicData.publicUrl;
        }
      }
    } catch {}

    const updatedProfile = await db.updateProfileAsync(user.id, {
      avatar_url: avatarUrl,
    });

    return NextResponse.json({
      success: true,
      avatarUrl,
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Avatar upload failed.' },
      { status: 500 }
    );
  }
}
