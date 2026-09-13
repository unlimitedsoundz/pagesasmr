import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      process.env[key.trim()] = vals.join('=').trim();
    }
  }
}

import { supabaseAdmin } from '../src/lib/supabase';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'private-videos';

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || 'https://gateway.storjshare.io',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

async function checkDeborahVideo() {
  console.log('=== CHECKING DEBORAH ADEYINKA SAMPLE VIDEO ===');

  const { data: supaSubs } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .ilike('title', '%deborah%');

  console.log('Deborah submissions found in Supabase DB:', supaSubs);

  if (!supaSubs || supaSubs.length === 0) {
    console.log('No submissions found for Deborah Adeyinka.');
    return;
  }

  for (const sub of supaSubs) {
    const fileUrl = sub.file_url || '';
    const fileKey = fileUrl.split('/api/videos/')[1]?.split('/stream')[0] || fileUrl;

    console.log(`\nSub ID: ${sub.id}`);
    console.log(`Title: "${sub.title}"`);
    console.log(`Target Storage Key: "${fileKey}"`);
    console.log(`Declared Size: ${sub.file_size_bytes} bytes`);

    // 1. Check if present in Storj
    try {
      const headStorj = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
      console.log(`✅ File is ALREADY PRESENT on Storj bucket "${BUCKET_NAME}"! Size: ${headStorj.ContentLength} bytes`);
      continue;
    } catch (err: any) {
      console.log(`File not yet on Storj: ${err.message}`);
    }

    // 2. Check if present in Supabase Storage
    const { data: supaBlob, error: supaErr } = await supabaseAdmin.storage.from('private-videos').download(fileKey);
    if (supaBlob) {
      const buffer = Buffer.from(await supaBlob.arrayBuffer());
      console.log(`Found in Supabase storage "private-videos" (${buffer.length} bytes). Uploading to Storj...`);

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: 'video/mp4',
      }));

      const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
      console.log(`✅ Successfully migrated Deborah's video to Storj! Verified size: ${head.ContentLength} bytes`);
    } else {
      console.log(`Could not find file in Supabase Storage private-videos: ${supaErr?.message}`);
    }
  }
}

checkDeborahVideo().catch((err) => console.error('Error checking Deborah video:', err));
