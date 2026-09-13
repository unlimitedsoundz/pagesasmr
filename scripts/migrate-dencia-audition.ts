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
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
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

async function migrateDenciaAudition() {
  const fileKey = 'video-1789141987830-x45sxg.mp4';
  console.log(`=== MIGRATING DENCIA ADELEKE AUDITION SAMPLE "${fileKey}" TO STORJ ===\n`);

  const { data: supaBlob, error: supaErr } = await supabaseAdmin.storage.from('private-videos').download(fileKey);
  if (supaErr || !supaBlob) {
    console.error('Failed to download from Supabase:', supaErr?.message);
    return;
  }

  const buffer = Buffer.from(await supaBlob.arrayBuffer());
  console.log(`Downloaded ${(buffer.length / (1024 * 1024)).toFixed(2)} MB from Supabase. Uploading to Storj S3...`);

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: 'video/mp4',
    },
  });

  await upload.done();

  const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
  console.log(`\n🎉 SUCCESS! Dencia Adeleke's audition sample ("${fileKey}") is now on Storj S3! Verified size: ${head.ContentLength} bytes`);
}

migrateDenciaAudition().catch((err) => console.error(err));
