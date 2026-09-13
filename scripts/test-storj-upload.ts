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

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

async function testStorj() {
  console.log('Testing Storj S3 Connection...');
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'https://gateway.storjshare.io',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  });

  const testKey = 'test-ping.txt';
  const buffer = Buffer.from('Storj connection test OK at ' + new Date().toISOString());

  console.log('Uploading small test file...');
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || 'private-videos',
    Key: testKey,
    Body: buffer,
    ContentType: 'text/plain',
  }));

  console.log('Verifying test file on Storj...');
  const head = await s3.send(new HeadObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || 'private-videos',
    Key: testKey,
  }));

  console.log('Test file uploaded successfully! ContentLength:', head.ContentLength);
}

testStorj().catch(err => console.error('Storj test error:', err));
