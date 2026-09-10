import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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

const forceSupabaseOnly = process.env.FORCE_SUPABASE_STORAGE === 'true' || process.env.USE_SUPABASE_STORAGE_ONLY === 'true';

const s3Client = !forceSupabaseOnly && s3Endpoint && s3AccessKeyId && s3SecretAccessKey
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
  source?: 's3' | 'supabase';
}

const signedUrlCache = new Map<string, CachedSignedUrl>();
const negativeUrlCache = new Map<string, number>();
const storjVerifiedKeys = new Map<string, boolean>();

// S3 / Storj circuit breaker & health state
let s3BandwidthExceeded = false;
let lastS3BandwidthCheck = 0;
const S3_CIRCUIT_BREAKER_COOLDOWN_MS = 300_000; // 5 minutes

// Remote clock offset compensation (handles host CMOS drift vs S3/NTP)
let serverClockOffsetMs = 0;
let lastClockOffsetSync = 0;
const CLOCK_SYNC_INTERVAL_MS = 600_000; // 10 minutes

export async function syncServerClockOffset(): Promise<number> {
  const now = Date.now();
  if (lastClockOffsetSync > 0 && now - lastClockOffsetSync < CLOCK_SYNC_INTERVAL_MS) {
    return serverClockOffsetMs;
  }
  try {
    const probeUrl = s3Endpoint || supabaseUrl || 'https://www.google.com';
    const res = await fetch(probeUrl, { method: 'HEAD', cache: 'no-store' });
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const remoteTime = new Date(dateHeader).getTime();
      serverClockOffsetMs = remoteTime - Date.now();
      lastClockOffsetSync = Date.now();
      if (Math.abs(serverClockOffsetMs) > 10_000) {
        console.log(`[Storage Clock Sync] Host clock offset detected: ${Math.round(serverClockOffsetMs / 1000)}s applied to S3 signatures.`);
      }
    }
  } catch {
    // Keep previous offset
  }
  return serverClockOffsetMs;
}

export function isS3BandwidthExceeded(): boolean {
  if (!s3BandwidthExceeded) return false;
  if (Date.now() - lastS3BandwidthCheck > S3_CIRCUIT_BREAKER_COOLDOWN_MS) {
    // Cooldown passed, allow a probe
    return false;
  }
  return true;
}

export function markS3BandwidthExceeded() {
  s3BandwidthExceeded = true;
  lastS3BandwidthCheck = Date.now();
  console.warn('[Storage] S3 / Storj BandwidthLimitExceeded detected. Tripping circuit breaker for 5 minutes; routing to Supabase Storage.');
}

let lastS3Probe = 0;
const S3_PROBE_INTERVAL_MS = 60_000;

export async function checkS3Health(testKey?: string): Promise<boolean> {
  if (!s3Client) return false;
  const now = Date.now();
  if (s3BandwidthExceeded) {
    if (now - lastS3BandwidthCheck < S3_CIRCUIT_BREAKER_COOLDOWN_MS) {
      return false;
    }
  } else if (lastS3Probe > 0 && now - lastS3Probe < S3_PROBE_INTERVAL_MS) {
    return true;
  }

  try {
    lastS3Probe = now;
    if (testKey) {
      // 1-byte range probe to test if Storj egress bandwidth is open
      await s3Client.send(new GetObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: testKey,
        Range: 'bytes=0-0',
      }));
    }
    s3BandwidthExceeded = false;
    return true;
  } catch (err: any) {
    if (
      err?.name === 'BandwidthLimitExceeded' ||
      err?.message?.includes('bandwidth') ||
      err?.Code === 'BandwidthLimitExceeded' ||
      err?.Code === 'AccessDenied'
    ) {
      markS3BandwidthExceeded();
      return false;
    }
    return true;
  }
}

export function resetS3CircuitBreaker() {
  s3BandwidthExceeded = false;
  lastS3BandwidthCheck = 0;
}

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

export interface SignedVideoResult {
  url: string | null;
  source?: 's3' | 'supabase' | null;
  bandwidthExceeded?: boolean;
  error?: string | null;
}

/**
 * Detailed signed URL generator that reports storage source and bandwidth status.
 */
export async function getSignedVideoUrlResult(
  rawFilePath: string,
  expiresInSeconds = 3600,
  options?: { download?: string | boolean }
): Promise<SignedVideoResult> {
  const filePath = extractStorageKey(rawFilePath);
  if (!filePath) return { url: null };

  const now = Date.now();
  const cacheKey = options?.download ? `${filePath}:dl:${options.download}` : filePath;

  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt - now > 120_000) {
    return { url: cached.url, source: cached.source || 'supabase' };
  }

  const negExpiry = negativeUrlCache.get(filePath);
  if (negExpiry && negExpiry > now) {
    return { url: null };
  }

  const s3Blocked = isS3BandwidthExceeded();

  // 1. Try S3 / Storj ($0 Egress Fees) ONLY if circuit breaker is not tripped
  if (s3Client && !s3Blocked) {
    let isOnFileStorj = storjVerifiedKeys.get(filePath);

    if (isOnFileStorj === undefined) {
      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: STORAGE_BUCKET, Key: filePath }));
        isOnFileStorj = true;
        storjVerifiedKeys.set(filePath, true);
      } catch (headErr: any) {
        if (headErr?.name === 'BandwidthLimitExceeded' || headErr?.message?.includes('bandwidth')) {
          markS3BandwidthExceeded();
        }
        isOnFileStorj = false;
        storjVerifiedKeys.set(filePath, false);
      }
    }

    if (isOnFileStorj && !isS3BandwidthExceeded()) {
      const s3Healthy = await checkS3Health(filePath);
      if (s3Healthy && !isS3BandwidthExceeded()) {
        try {
          const offsetMs = await syncServerClockOffset();
          const signingDate = new Date(Date.now() + offsetMs);

        const filename = typeof options?.download === 'string' ? options.download : `${filePath}.mp4`;
        const isMov = filePath.toLowerCase().endsWith('.mov');
        const isWebm = filePath.toLowerCase().endsWith('.webm');
        const mimeType = isMov ? 'video/quicktime' : isWebm ? 'video/webm' : 'video/mp4';

        const command = new GetObjectCommand({
          Bucket: STORAGE_BUCKET,
          Key: filePath,
          ResponseContentType: mimeType,
          ...(options?.download ? { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"` } : {}),
        });

        const signedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: expiresInSeconds,
          signingDate,
        });

        if (signedUrl) {
          signedUrlCache.set(cacheKey, {
            url: signedUrl,
            expiresAt: now + (expiresInSeconds - 60) * 1000,
            source: 's3',
          });
          return { url: signedUrl, source: 's3' };
        }
      } catch (err: any) {
        if (err?.name === 'BandwidthLimitExceeded' || err?.message?.includes('bandwidth')) {
          markS3BandwidthExceeded();
        }
        console.warn('[S3/Storj Storage] Signed URL error, falling back to Supabase:', err?.message || err);
      }
    }
  }
}

  // 2. Primary fallback: Supabase Storage
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(
        filePath,
        expiresInSeconds,
        options?.download ? { download: typeof options.download === 'string' ? options.download : true } : undefined
      );

    if (error || !data?.signedUrl) {
      // Check if this file was on Storj but blocked by bandwidth limit
      const wasOnStorj = storjVerifiedKeys.get(filePath);
      if (wasOnStorj || s3Blocked) {
        return {
          url: null,
          bandwidthExceeded: true,
          error: 'Video file is stored on Storj DCS which has reached its monthly project bandwidth limit. Please upgrade or add billing at storj.io.',
        };
      }
      negativeUrlCache.set(filePath, now + 3000);
      return { url: null };
    }

    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + (expiresInSeconds - 60) * 1000,
      source: 'supabase',
    });
    return { url: data.signedUrl, source: 'supabase' };
  } catch (err: any) {
    console.error('getSignedVideoUrl Supabase error:', err);
    negativeUrlCache.set(filePath, now + 3000);
    return { url: null, error: err?.message };
  }
}

/**
 * Generates a signed URL for private video playback or direct file download.
 * Automatically fails over between Storj S3 and Supabase Storage.
 */
export async function getSignedVideoUrl(
  rawFilePath: string,
  expiresInSeconds = 3600,
  options?: { download?: string | boolean }
): Promise<string | null> {
  const result = await getSignedVideoUrlResult(rawFilePath, expiresInSeconds, options);
  return result.url;
}

/**
 * Clears a file from negative & verified caches (call after a successful upload).
 */
export function clearNegativeCache(filePath: string) {
  negativeUrlCache.delete(filePath);
  signedUrlCache.delete(filePath);
  storjVerifiedKeys.set(filePath, true);
}

/**
 * Uploads a video buffer to active cloud storage with durable master copy on Supabase
 * and optional mirror on Storj S3.
 */
const MAX_UPLOAD_RETRIES = 3;

export async function uploadToSupabaseStorage(
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  let primaryUploadSuccess = false;
  let lastError: any;

  // 1. Primary: ALWAYS save master copy to Supabase Storage first for absolute durability
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
        primaryUploadSuccess = true;
        clearNegativeCache(filePath);
        console.log(`[Supabase Storage] Successfully uploaded durable master copy for ${filePath}`);
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`uploadToSupabaseStorage exception (attempt ${attempt}):`, err?.message || err);
    }

    if (attempt < MAX_UPLOAD_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  // 2. Secondary: Mirror to Storj / S3 ($0 egress fees) if configured and healthy
  if (s3Client && !isS3BandwidthExceeded()) {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: filePath,
        Body: buffer,
        ContentType: contentType,
      }));
      clearNegativeCache(filePath);
      console.log(`[Storj S3 Storage] Successfully mirrored ${filePath} to S3`);
    } catch (s3Err: any) {
      if (s3Err?.name === 'BandwidthLimitExceeded' || s3Err?.message?.includes('bandwidth')) {
        markS3BandwidthExceeded();
      }
      console.warn('[Storj S3 Storage] Mirror upload failed (Supabase copy preserved):', s3Err?.message || s3Err);
    }
  }

  if (primaryUploadSuccess) {
    return filePath;
  }

  throw new Error(
    `Video storage failed after ${MAX_UPLOAD_RETRIES} attempts. (${lastError?.message || 'unknown error'})`
  );
}
