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

async function migrateDeborahExplicit() {
  const fileKey = 'video-1789312214181-g9d3cp.mp4';
  console.log(`=== MIGRATING DEBORAH ADEYINKA VIDEO "${fileKey}" TO STORJ ===\n`);

  // Check if already in Storj
  try {
    const headStorj = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
    console.log(`✅ File is ALREADY in Storj! Size: ${headStorj.ContentLength} bytes`);
    return;
  } catch (err) {
    console.log('File not yet in Storj. Proceeding with download from Supabase...');
  }

  // Create signed URL to download from Supabase
  let signedData = await supabaseAdmin.storage
    .from('private-videos')
    .createSignedUrl(fileKey, 3600);

  if (signedData.error || !signedData.data?.signedUrl) {
    signedData = await supabaseAdmin.storage.from('guideline-samples').createSignedUrl(fileKey, 3600);
  }
  if (signedData.error || !signedData.data?.signedUrl) {
    signedData = await supabaseAdmin.storage.from('avatars').createSignedUrl(fileKey, 3600);
  }

  if (signedData.error || !signedData.data?.signedUrl) {
    console.error('Failed to create signed URL across all buckets:', signedData.error?.message);
    return;
  }

  console.log('Downloading from Supabase HTTP URL...');
  const res = await fetch(signedData.data!.signedUrl);
  if (!res.ok) {
    console.error(`Download HTTP failed with status ${res.status}: ${res.statusText}`);
    return;
  }

  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  console.log(`Downloaded ${(buffer.length / (1024 * 1024)).toFixed(2)} MB (${buffer.length} bytes). Uploading to Storj S3...`);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: 'video/mp4',
    })
  );

  const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
  console.log(`\n🎉 SUCCESS! Deborah Adeyinka's video ("${fileKey}") has been migrated to Storj S3! Verified size: ${head.ContentLength} bytes`);
}

migrateDeborahExplicit().catch((err) => console.error('Migration error:', err));
