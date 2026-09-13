export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can generate guideline sample upload URLs.' }, { status: 403 });
    }

    const body = await req.json();
    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required.' }, { status: 400 });
    }

    const cleanExt = path.extname(fileName).toLowerCase() || '.mp4';
    const isAllowedExt = ['.mp4', '.mov', '.webm'].includes(cleanExt);
    if (!isAllowedExt) {
      return NextResponse.json({ error: 'Only MP4, MOV, and WebM video files are supported.' }, { status: 400 });
    }

    const baseName = path.basename(fileName, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFileName = `sample-${Date.now()}-${baseName}${cleanExt}`;

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === 'guideline-samples')) {
      await supabaseAdmin.storage.createBucket('guideline-samples', {
        public: true,
        allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
      });
    }

    // Generate signed upload URL (valid for 2 hours)
    const { data, error } = await supabaseAdmin.storage
      .from('guideline-samples')
      .createSignedUploadUrl(uniqueFileName);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Could not generate signed upload URL.');
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('guideline-samples')
      .getPublicUrl(uniqueFileName);

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      publicUrl: publicData?.publicUrl || '',
      fileName: uniqueFileName,
    });
  } catch (err: any) {
    console.error('Upload URL error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create upload URL.' }, { status: 500 });
  }
}
