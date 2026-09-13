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

async function inspectTempVideos() {
  const tmpDir = os.tmpdir();
  console.log('=== INSPECTING TEMP FILES FOR DEBORAH ADEYINKA VIDEO ===\n');

  const files = fs.readdirSync(tmpDir);
  const targetKey = 'video-1789312214181-g9d3cp.mp4';

  for (const f of files) {
    if (!f.endsWith('.tmp')) continue;
    const fullPath = path.join(tmpDir, f);
    try {
      const stat = fs.statSync(fullPath);
      // Deborah's file is around ~70-78MB
      if (stat.size > 50000000 && stat.size < 100000000) {
        // Read header
        const fd = fs.openSync(fullPath, 'r');
        const header = Buffer.alloc(32);
        fs.readSync(fd, header, 0, 32, 0);
        fs.closeSync(fd);

        const headerHex = header.toString('hex');
        const headerAscii = header.toString('ascii').replace(/[^a-zA-Z0-9]/g, '.');
        const isVideo = headerHex.includes('66747970') || headerAscii.includes('ftyp');

        console.log(`Temp File: "${f}"`);
        console.log(`  - Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB (${stat.size} bytes)`);
        console.log(`  - Created/Modified: ${stat.mtime.toISOString()}`);
        console.log(`  - Header: ${headerAscii} (${headerHex.substring(0, 16)}...)`);
        console.log(`  - Is MP4/MOV Video? ${isVideo ? 'YES ✅' : 'NO'}\n`);

        if (isVideo) {
          console.log(`   ⬆ Uploading "${f}" directly to Storj S3 as "${targetKey}"...`);
          const buffer = fs.readFileSync(fullPath);

          const upload = new Upload({
            client: s3Client,
            params: {
              Bucket: BUCKET_NAME,
              Key: targetKey,
              Body: buffer,
              ContentType: 'video/mp4',
            },
          });

          await upload.done();

          const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: targetKey }));
          console.log(`   🎉 SUCCESS! Uploaded Deborah Adeyinka's video to Storj S3 as "${targetKey}"! Verified size: ${head.ContentLength} bytes\n`);
          break;
        }
      }
    } catch (err: any) {
      console.warn(`Error inspecting "${f}":`, err.message);
    }
  }
}

inspectTempVideos().catch((err) => console.error('Error:', err));
