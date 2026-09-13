import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function thoroughSearch() {
  console.log('====================================================');
  console.log('--- THOROUGH SEARCH FOR DEBORAH ADEYINKA VIDEO ---');
  console.log('====================================================\n');
  console.log('Target File Key: "video-1789312214181-g9d3cp.mp4"');
  console.log('Target Size: ~77,794,320 bytes (77.79 MB)\n');

  // 1. Search local filesystem
  const searchDirectories = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'apps', 'pinkroom-pages', 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'apps', 'pinkroom-pages', 'public', 'uploads'),
    os.tmpdir(),
    path.join(os.tmpdir(), 'uploads'),
    path.join(os.tmpdir(), 'asmr_data'),
  ];

  console.log('--- 1. Searching Local Filesystem Directories ---');
  for (const dir of searchDirectories) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const fullPath = path.join(dir, f);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
            if (
              f.includes('g9d3cp') ||
              f.includes('193332') ||
              f.includes('1789312') ||
              (stat.size > 70000000 && stat.size < 85000000)
            ) {
              console.log(`FOUND LOCAL FILE: "${fullPath}" | Size: ${sizeMb} MB (${stat.size} bytes)`);
            }
          }
        } catch {}
      }
    } catch (err: any) {
      console.warn(`Error reading dir "${dir}":`, err.message);
    }
  }

  // 2. Search Supabase Storage Buckets
  console.log('\n--- 2. Searching Supabase Storage Buckets ---');
  const { data: supaBuckets } = await supabaseAdmin.storage.listBuckets();
  for (const b of supaBuckets || []) {
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: files, error } = await supabaseAdmin.storage.from(b.name).list('', { limit: 100, offset });
      if (error || !files || files.length === 0) {
        hasMore = false;
        break;
      }
      offset += files.length;
      for (const f of files) {
        const sizeMb = ((f.metadata?.size || 0) / (1024 * 1024)).toFixed(2);
        if (
          f.name.includes('g9d3cp') ||
          f.name.includes('193332') ||
          f.name.includes('1789312') ||
          ((f.metadata?.size || 0) > 70000000 && (f.metadata?.size || 0) < 85000000)
        ) {
          console.log(`FOUND IN SUPABASE BUCKET [${b.name}]: "${f.name}" | Size: ${sizeMb} MB (${f.metadata?.size} bytes)`);
        }
      }
      if (files.length < 100) hasMore = false;
    }
  }

  // 3. Search Storj S3 Bucket
  console.log('\n--- 3. Searching Storj S3 Bucket ---');
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'https://gateway.storjshare.io',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  });

  try {
    const storjRes = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME || 'private-videos' }));
    (storjRes.Contents || []).forEach((c) => {
      const sizeMb = ((c.Size || 0) / (1024 * 1024)).toFixed(2);
      if (
        c.Key?.includes('g9d3cp') ||
        c.Key?.includes('193332') ||
        c.Key?.includes('1789312') ||
        ((c.Size || 0) > 70000000 && (c.Size || 0) < 85000000)
      ) {
        console.log(`FOUND IN STORJ BUCKET: "${c.Key}" | Size: ${sizeMb} MB (${c.Size} bytes)`);
      }
    });
  } catch (err: any) {
    console.warn('Storj error:', err.message);
  }
}

thoroughSearch().catch((err) => console.error('Search error:', err));
