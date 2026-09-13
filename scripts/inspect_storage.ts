import * as fs from 'fs';
import * as path from 'path';

// Read .env.local manually
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
import { supabaseAdmin, STORAGE_BUCKET } from '../src/lib/supabase';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function check() {
  console.log('STORAGE_BUCKET:', STORAGE_BUCKET);
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('S3_ENDPOINT:', process.env.S3_ENDPOINT);

  // List all buckets in Supabase Storage
  const { data: buckets, error: bErr } = await supabaseAdmin.storage.listBuckets();
  console.log('Supabase Buckets:', bErr ? bErr.message : buckets?.map((b) => b.name));

  for (const b of buckets || []) {
    const { data: supaFiles, error: supaErr } = await supabaseAdmin.storage.from(b.name).list('', { limit: 100 });
    console.log(`\n--- Supabase storage bucket [${b.name}] root ---`);
    console.log(supaFiles?.map((f) => ({ name: f.name, id: f.id, metadata: f.metadata })));

    for (const f of supaFiles || []) {
      // If no id or no metadata, might be a folder
      if (!f.id || !f.metadata) {
        const { data: subFiles } = await supabaseAdmin.storage.from(b.name).list(f.name, { limit: 100 });
        console.log(`Supabase storage bucket [${b.name}] folder [${f.name}]:`, subFiles?.map((sf) => sf.name));
      }
    }
  }

  // Check Storj S3
  console.log('\n--- Checking Storj S3 Bucket ---');
  const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'https://gateway.storjshare.io',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  });

  try {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME || 'private-videos' }));
    console.log('Storj bucket (private-videos) objects count:', res.Contents?.length || 0);
    console.log(res.Contents?.map((c) => ({ key: c.Key, size: c.Size })));
  } catch (err: any) {
    console.log('Storj error:', err.message);
  }

  // Check database.json submissions and guideline_samples
  const dbData = JSON.parse(fs.readFileSync('data/database.json', 'utf-8'));
  console.log('\n--- database.json Submissions ---');
  console.log('Total submissions:', dbData.submissions?.length || 0);
  dbData.submissions?.forEach((s: any) => {
    console.log(`Sub ID: ${s.id} | Title: "${s.title}" | file_url: "${s.file_url}" | file_name: "${s.file_name}"`);
  });

  console.log('\n--- database.json Guideline Samples ---');
  dbData.guideline_samples?.forEach((g: any) => {
    console.log(`Sample ID: ${g.id} | file_url: "${g.file_url}"`);
  });
}

check();
