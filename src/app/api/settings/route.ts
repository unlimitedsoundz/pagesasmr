export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const settings = db.getSettings();
  return NextResponse.json({
    settings: {
      rate_per_video_usd: settings.rate_per_video_usd,
      min_payout_videos: settings.min_payout_videos,
      min_duration_seconds: settings.min_duration_seconds,
      max_upload_size_bytes: settings.max_upload_size_bytes,
    },
  });
}
