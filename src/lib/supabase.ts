import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ydymhzdoptmpblmejcjs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeW1oemRvcHRtcGJsbWVqY2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Nzg4NTksImV4cCI6MjEwNDM1NDg1OX0.ebN7kACUEpY5uUFXUa8PPTZXnl9IhxxQryUyyMhBzI4';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeW1oemRvcHRtcGJsbWVqY2pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc3ODg1OSwiZXhwIjoyMTA0MzU0ODU5fQ.3PftOAibqREafTOqQqXLuF510J04DW4Sip1wjy8bJyQ';

// Browser/public Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server/admin Supabase client with bypass RLS capability
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const STORAGE_BUCKET = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.SUPABASE_STORAGE_BUCKET || 'private-videos';

// Cloudflare R2 / Storj / S3 Client setup ($0 Egress Fee Storage)
const r2AccountId = process.env.R2_ACCOUNT_ID;
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const s3Endpoint = process.env.S3_ENDPOINT || (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : undefined);

const s3Client = s3Endpoint && s3AccessKeyId && s3SecretAccessKey
  ? new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
      },
      forcePathStyle: true,
    })
  : null;

interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CachedSignedUrl>();
const negativeUrlCache = new Map<string, number>();

/**
 * Safely extracts the clean storage key from any raw URL, API path, or bucket path.
 */
export function extractStorageKey(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();

  if (cleaned.includes('/private-videos/')) {
    cleaned = cleaned.split('/private-videos/')[1];
  } else if (cleaned.includes('/submissions/')) {
    cleaned = cleaned.split('/submissions/')[1];
  } else if (cleaned.includes('/avatars/')) {
    cleaned = cleaned.split('/avatars/')[1];
  } else if (cleaned.includes('/guideline-samples/')) {
    cleaned = cleaned.split('/guideline-samples/')[1];
  } else if (cleaned.includes('/api/videos/')) {
    const match = cleaned.match(/\/api\/videos\/([^/?#]+)/);
    if (match) {
      cleaned = match[1];
    }
  }

  cleaned = cleaned.split('?')[0].split('#')[0];
  return decodeURIComponent(cleaned);
}

/**
 * Generates a short-lived signed URL for private video playback or direct file download.
 * Automatically prefers Storj / S3 ($0 egress fees) if configured, falling back to Supabase.
 */
export async function getSignedVideoUrl(
  rawFilePath: string,
  expiresInSeconds = 3600,
  options?: { download?: string | boolean }
): Promise<string | null> {
  const filePath = extractStorageKey(rawFilePath);
  if (!filePath) return null;

  const now = Date.now();
  const cacheKey = options?.download ? `${filePath}:dl:${options.download}` : filePath;

  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt - now > 120_000) {
    return cached.url;
  }

  const negExpiry = negativeUrlCache.get(filePath);
  if (negExpiry && negExpiry > now) {
    return null;
  }

  // 1. Prefer Storj / S3 Storage (25GB Free, $0 Egress Fees)
  if (s3Client) {
    try {
      const filename = typeof options?.download === 'string' ? options.download : `${filePath}.mp4`;
      const command = new GetObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: filePath,
        ...(options?.download ? { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"` } : {}),
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
      if (signedUrl) {
        signedUrlCache.set(cacheKey, { url: signedUrl, expiresAt: now + (expiresInSeconds - 60) * 1000 });
        return signedUrl;
      }
    } catch (err) {
      console.warn('[S3/Storj Storage] Signed URL error, falling back to Supabase:', err);
    }
  }

  // 2. Fallback to Supabase Storage
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(
        filePath,
        expiresInSeconds,
        options?.download ? { download: typeof options.download === 'string' ? options.download : true } : undefined
      );

    if (error || !data?.signedUrl) {
      // Short negative cache (3s) so transient errors don't lock out valid files for minutes
      negativeUrlCache.set(filePath, now + 3000);
      return null;
    }

    signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: now + (expiresInSeconds - 60) * 1000 });
    return data.signedUrl;
  } catch (err) {
    console.error('getSignedVideoUrl Supabase error:', err);
    negativeUrlCache.set(filePath, now + 3000);
    return null;
  }
}

/**
 * Clears a file from the negative signed-URL cache (call after a successful upload).
 */
export function clearNegativeCache(filePath: string) {
  negativeUrlCache.delete(filePath);
  signedUrlCache.delete(filePath);
}

/**
 * Uploads a video buffer to active cloud storage (Storj S3 or Supabase) with retry + verification.
 */
const MAX_UPLOAD_RETRIES = 3;

export async function uploadToSupabaseStorage(
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  // 1. Prefer Storj / S3 Storage ($0 Egress Fees)
  if (s3Client) {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: filePath,
        Body: buffer,
        ContentType: contentType,
      }));
      clearNegativeCache(filePath);
      console.log(`[Storj S3 Storage] Successfully uploaded ${filePath} ($0 egress cost)`);
      return filePath;
    } catch (s3Err: any) {
      console.warn('[Storj S3 Storage] Upload failed, falling back to Supabase:', s3Err?.message || s3Err);
    }
  }

  // 2. Fallback to Supabase Storage
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        lastError = new Error(`Supabase upload error (attempt ${attempt}): ${error.message}`);
        console.warn(lastError.message);
      } else {
        clearNegativeCache(filePath);
        return data!.path;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`uploadToSupabaseStorage exception (attempt ${attempt}):`, err?.message || err);
    }

    if (attempt < MAX_UPLOAD_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error(
    `Video storage failed after ${MAX_UPLOAD_RETRIES} attempts. (${lastError?.message || 'unknown error'})`
  );
}
