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
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function listStorj() {
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'https://gateway.storjshare.io',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  });

  const res = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME || 'private-videos' }));
  console.log('--- STORJ BUCKET OBJECTS ---');
  console.log(res.Contents?.map(c => ({ key: c.Key, size: c.Size })));
  console.log('Total objects count:', res.Contents?.length || 0);
}
listStorj().catch(err => console.error(err));
