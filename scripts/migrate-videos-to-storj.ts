import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
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
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function runMigration() {
  console.log('====================================================');
  console.log('--- MIGRATING PAGE TURNING PLATFORM VIDEOS TO STORJ ---');
  console.log('====================================================\n');

  const dbData = JSON.parse(fs.readFileSync('data/database.json', 'utf-8'));

  const ptCreators = (dbData.profiles || []).filter(
    (p: any) => p.preferred_category === 'PAGE_TURNING' || p.preferred_category === 'BOTH'
  );
  const ptCreatorIds = new Set<string>(ptCreators.map((p: any) => p.id));

  const { data: supaProfiles } = await supabaseAdmin.from('profiles').select('id, preferred_category, display_name');
  (supaProfiles || []).forEach((p: any) => {
    if (p.preferred_category === 'PAGE_TURNING' || p.preferred_category === 'BOTH') {
      ptCreatorIds.add(p.id);
    }
  });

  const pageTurningFileKeys = new Set<string>();

  (dbData.submissions || []).forEach((s: any) => {
    if (s.category === 'PAGE_TURNING' || ptCreatorIds.has(s.creator_id)) {
      if (s.file_url) {
        const key = s.file_url.split('/api/videos/')[1]?.split('/stream')[0] || s.file_url;
        pageTurningFileKeys.add(key.replace('/stream', '').replace('/download', ''));
      }
    }
  });

  const { data: supaSubs } = await supabaseAdmin.from('submissions').select('*');
  (supaSubs || []).forEach((s: any) => {
    if (s.category === 'PAGE_TURNING' || ptCreatorIds.has(s.creator_id)) {
      if (s.file_url) {
        const key = s.file_url.split('/api/videos/')[1]?.split('/stream')[0] || s.file_url;
        pageTurningFileKeys.add(key.replace('/stream', '').replace('/download', ''));
      }
    }
  });

  const { data: supaSamples } = await supabaseAdmin.from('guideline_samples').select('*');
  (supaSamples || []).forEach((g: any) => {
    if (g.category === 'PAGE_TURNING' || g.platform_id === 'pinkroom_pages') {
      if (g.video_url) {
        let key = g.video_url;
        if (key.includes('/guideline-samples/')) {
          key = key.split('/guideline-samples/')[1];
        } else if (key.includes('/api/videos/')) {
          key = key.split('/api/videos/')[1]?.split('/stream')[0];
        }
        if (key && !key.startsWith('http')) {
          pageTurningFileKeys.add(key);
        }
      }
    }
  });

  const { data: supaPrivateFiles } = await supabaseAdmin.storage.from('private-videos').list('', { limit: 1000 });
  for (const f of supaPrivateFiles || []) {
    const isPtCreatorFile = Array.from(ptCreatorIds).some((cid) => f.name.includes(cid));
    if (isPtCreatorFile) {
      pageTurningFileKeys.add(f.name);
    }
  }

  console.log(`Found ${pageTurningFileKeys.size} PAGE_TURNING video file(s) for migration.`);

  // Get existing files in Storj
  const existingStorjKeys = new Map<string, number>();
  try {
    const storjList = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME }));
    if (storjList.Contents) {
      for (const item of storjList.Contents) {
        if (item.Key) {
          existingStorjKeys.set(item.Key, item.Size || 0);
        }
      }
    }
  } catch (err: any) {
    console.warn('Warning listing Storj bucket:', err.message);
  }

  const fileKeyArray = Array.from(pageTurningFileKeys);
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < fileKeyArray.length; i++) {
    const fileKey = fileKeyArray[i];
    console.log(`\n[${i + 1}/${fileKeyArray.length}] Checking PAGE_TURNING video "${fileKey}"...`);

    // Download buffer via Supabase Storage signed URL for speed & reliability
    let signedUrlData = await supabaseAdmin.storage.from('private-videos').createSignedUrl(fileKey, 3600);
    let bucketName = 'private-videos';

    if (signedUrlData.error || !signedUrlData.data?.signedUrl) {
      signedUrlData = await supabaseAdmin.storage.from('guideline-samples').createSignedUrl(fileKey, 3600);
      bucketName = 'guideline-samples';
    }

    if (signedUrlData.error || !signedUrlData.data?.signedUrl) {
      console.error(`   ❌ File "${fileKey}" not found in Supabase storage.`);
      errorCount++;
      continue;
    }

    const downloadUrl = signedUrlData.data.signedUrl;

    // Check size on Supabase first
    const headRes = await fetch(downloadUrl, { method: 'HEAD' });
    const supaSize = parseInt(headRes.headers.get('content-length') || '0', 10);

    if (existingStorjKeys.has(fileKey) && supaSize > 0 && existingStorjKeys.get(fileKey) === supaSize) {
      console.log(`   ⏭ Already exists on Storj (${supaSize} bytes). Skipping.`);
      skippedCount++;
      continue;
    }

    console.log(`   ⬇ Downloading from Supabase Storage (${(supaSize / (1024 * 1024)).toFixed(2)} MB)...`);
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      console.error(`   ❌ Failed to download from Supabase HTTP (${fileRes.statusText})`);
      errorCount++;
      continue;
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    console.log(`   ⬆ Uploading to Storj S3 bucket "${BUCKET_NAME}" (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)...`);

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: buffer,
          ContentType: getMimeType(fileKey),
        })
      );

      const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
      if (head.ContentLength === buffer.length) {
        console.log(`   ✅ Successfully uploaded and verified on Storj! (${head.ContentLength} bytes)`);
        successCount++;
      } else {
        throw new Error(`Size mismatch after upload! Expected ${buffer.length}, got ${head.ContentLength}`);
      }
    } catch (err: any) {
      console.error(`   ❌ Storj upload failed for "${fileKey}":`, err.message || err);
      errorCount++;
    }
  }

  console.log('\n====================================================');
  console.log('--- PAGE TURNING MIGRATION SUMMARY ---');
  console.log(`Successfully Migrated: ${successCount}`);
  console.log(`Skipped (Already on Storj): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total Files Processed: ${fileKeyArray.length}`);
  console.log('====================================================');
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
