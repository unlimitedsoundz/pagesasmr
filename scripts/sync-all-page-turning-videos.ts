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
import { S3Client, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

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
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'video/mp4';
}

async function syncAllPageTurningVideos() {
  console.log('====================================================');
  console.log('--- SYNCING ALL PAGE TURNING VIDEOS TO STORJ S3 ---');
  console.log('====================================================\n');

  // 1. Fetch Page Turning Creators
  const dbData = JSON.parse(fs.readFileSync('data/database.json', 'utf-8'));
  const { data: supaProfiles } = await supabaseAdmin.from('profiles').select('*');

  const ptCreatorMap = new Map<string, string>(); // id -> display_name

  (dbData.profiles || []).forEach((p: any) => {
    if (p.preferred_category === 'PAGE_TURNING' || p.preferred_category === 'BOTH') {
      ptCreatorMap.set(p.id, p.display_name || p.email);
    }
  });

  (supaProfiles || []).forEach((p: any) => {
    if (p.preferred_category === 'PAGE_TURNING' || p.preferred_category === 'BOTH') {
      ptCreatorMap.set(p.id, p.display_name || p.email);
    }
  });

  console.log(`Found ${ptCreatorMap.size} PAGE_TURNING creator profile(s).`);

  // 2. Fetch all PAGE_TURNING submissions from DB
  const { data: supaSubs } = await supabaseAdmin.from('submissions').select('*');
  const ptSubmissions = (supaSubs || []).filter(
    (s: any) => s.category === 'PAGE_TURNING' || ptCreatorMap.has(s.creator_id) || s.platform_id === 'pinkroom_pages'
  );

  console.log(`Found ${ptSubmissions.length} PAGE_TURNING submission(s) in Supabase DB.\n`);

  // 3. Fetch Storj existing keys
  const storjKeys = new Map<string, number>();
  try {
    const storjList = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME }));
    (storjList.Contents || []).forEach((c) => {
      if (c.Key) storjKeys.set(c.Key, c.Size || 0);
    });
  } catch (err: any) {
    console.warn('Warning listing Storj bucket:', err.message);
  }

  // 4. List files in Supabase Storage buckets
  const { data: supaPrivateFiles } = await supabaseAdmin.storage.from('private-videos').list('', { limit: 1000 });
  const { data: supaGuidelineFiles } = await supabaseAdmin.storage.from('guideline-samples').list('', { limit: 1000 });

  const supaStorageMap = new Map<string, { bucket: string; size: number }>();
  (supaPrivateFiles || []).forEach((f) => supaStorageMap.set(f.name, { bucket: 'private-videos', size: f.metadata?.size || 0 }));
  (supaGuidelineFiles || []).forEach((f) => supaStorageMap.set(f.name, { bucket: 'guideline-samples', size: f.metadata?.size || 0 }));

  // 5. Build list of files to migrate to Storj
  const filesToProcess = new Set<string>();

  ptSubmissions.forEach((s) => {
    const rawUrl = s.file_url || '';
    let key = rawUrl;
    if (key.includes('/api/videos/')) {
      key = key.split('/api/videos/')[1]?.split('/stream')[0] || key;
    }
    key = key.replace('/stream', '').replace('/download', '').trim();
    if (key && !key.startsWith('http')) {
      filesToProcess.add(key);
    }
  });

  supaStorageMap.forEach((info, fileKey) => {
    const matchesCreator = Array.from(ptCreatorMap.keys()).some((cid) => fileKey.includes(cid));
    const isSample = fileKey.startsWith('sample-') || fileKey.includes('YouCut') || fileKey.includes('benchmark');
    if (matchesCreator || isSample) {
      filesToProcess.add(fileKey);
    }
  });

  console.log(`Targeting ${filesToProcess.size} PAGE_TURNING video file(s) for migration.\n`);

  let success = 0;
  let skipped = 0;
  let missingInSupa = 0;
  let failed = 0;

  const fileList = Array.from(filesToProcess);

  for (let i = 0; i < fileList.length; i++) {
    const fileKey = fileList[i];
    console.log(`[${i + 1}/${fileList.length}] Checking "${fileKey}"...`);

    // Check if already in Storj
    if (storjKeys.has(fileKey)) {
      console.log(`   ⏭ ALREADY ON STORJ S3 (${storjKeys.get(fileKey)} bytes).`);
      skipped++;
      continue;
    }

    // Determine bucket in Supabase
    const storageInfo = supaStorageMap.get(fileKey);
    let bucket = storageInfo?.bucket || 'private-videos';

    let signedData = await supabaseAdmin.storage.from(bucket).createSignedUrl(fileKey, 3600);
    if (signedData.error || !signedData.data?.signedUrl) {
      bucket = bucket === 'private-videos' ? 'guideline-samples' : 'private-videos';
      signedData = await supabaseAdmin.storage.from(bucket).createSignedUrl(fileKey, 3600);
    }

    if (signedData.error || !signedData.data?.signedUrl) {
      console.log(`   ⚠️ Not found in Supabase storage buckets.`);
      missingInSupa++;
      continue;
    }

    const downloadUrl = signedData.data.signedUrl;
    console.log(`   ⬇ Downloading from Supabase Storage (${bucket})...`);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      console.log(`   ⬆ Uploading ${(buffer.length / (1024 * 1024)).toFixed(2)} MB to Storj S3 via chunked Upload...`);

      const parallelUpload = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: buffer,
          ContentType: getMimeType(fileKey),
        },
        partSize: 5 * 1024 * 1024,
        queueSize: 4,
      });

      parallelUpload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          console.log(`      Upload Progress: ${pct}% (${progress.loaded}/${progress.total} bytes)`);
        }
      });

      await parallelUpload.done();

      const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
      console.log(`   ✅ SUCCESSFULLY MIGRATED AND VERIFIED ON STORJ! (${head.ContentLength} bytes)\n`);
      storjKeys.set(fileKey, head.ContentLength || buffer.length);
      success++;
    } catch (err: any) {
      console.error(`   ❌ Failed to migrate "${fileKey}":`, err.message || err);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log('--- PAGE TURNING STORJ MIGRATION SUMMARY ---');
  console.log(`Successfully Migrated: ${success}`);
  console.log(`Skipped (Already on Storj): ${skipped}`);
  console.log(`Missing in Supabase Storage: ${missingInSupa}`);
  console.log(`Upload Failures: ${failed}`);
  console.log(`Total Files Checked: ${fileList.length}`);
  console.log('====================================================\n');

  console.log('=== ADMIN PLAYBACK & DOWNLOAD LINKS STATUS TABLE ===');
  for (const s of ptSubmissions) {
    const creatorName = ptCreatorMap.get(s.creator_id) || 'Unknown Creator';
    const rawUrl = s.file_url || '';
    const key = rawUrl.split('/api/videos/')[1]?.split('/stream')[0] || rawUrl;

    console.log(`Submission: "${s.title}"`);
    console.log(`  - Creator: ${creatorName} (${s.creator_id})`);
    console.log(`  - Category: ${s.category}`);
    console.log(`  - File Key: ${key}`);
    console.log(`  - Admin Stream Endpoint: /api/videos/${encodeURIComponent(key)}/stream`);
    console.log(`  - Admin Download Endpoint: /api/videos/${encodeURIComponent(key)}/download`);
    console.log(`  - Active Storage Location: ${storjKeys.has(key) ? 'STORJ S3 BUCKET ✅' : 'Supabase Storage / Local'}\n`);
  }
}

syncAllPageTurningVideos().catch((err) => console.error('Sync error:', err));
