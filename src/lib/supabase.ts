import { createClient } from '@supabase/supabase-js';
import { PLATFORM_ID } from './constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ydymhzdoptmpblmejcjs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeW1oemRvcHRtcGJsbWVqY2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Nzg4NTksImV4cCI6MjEwNDM1NDg1OX0.ebN7kACUEpY5uUFXUa8PPTZXnl9IhxxQryUyyMhBzI4';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeW1oemRvcHRtcGJsbWVqY2pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc3ODg1OSwiZXhwIjoyMTA0MzU0ODU5fQ.3PftOAibqREafTOqQqXLuF510J04DW4Sip1wjy8bJyQ';

// Browser/public client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server/admin client with privileged bypass for platform operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'private-videos';

export function getPlatformStoragePath(userId: string, submissionId: string, fileName: string): string {
  const safeFilename = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${PLATFORM_ID}/${userId}/${submissionId}/${safeFilename}`;
}

interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CachedSignedUrl>();
const negativeUrlCache = new Map<string, number>();

export async function getSignedVideoUrl(
  filePath: string,
  expiresInSeconds = 3600,
  options?: { download?: string | boolean }
): Promise<string | null> {
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

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(
        filePath,
        expiresInSeconds,
        options?.download ? { download: options.download } : undefined
      );

    if (error || !data?.signedUrl) {
      negativeUrlCache.set(filePath, now + 300_000);
      return null;
    }

    const effectiveTtlMs = Math.max((expiresInSeconds - 60) * 1000, 300_000);
    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + effectiveTtlMs,
    });

    return data.signedUrl;
  } catch (err) {
    console.error('getSignedVideoUrl error:', err);
    negativeUrlCache.set(filePath, now + 60_000);
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
 * Uploads a video buffer to Supabase private storage with retry + verification.
 *
 * Retries up to MAX_RETRIES times with exponential backoff, then verifies the
 * upload actually landed by generating a signed URL. Throws if all attempts fail
 * so the calling upload route can return an HTTP 500 instead of silently
 * recording a broken file URL in the database.
 */
const MAX_UPLOAD_RETRIES = 3;

export async function uploadToSupabaseStorage(
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
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
        // Verify the file is actually readable by generating a signed URL
        const { data: checkData, error: checkErr } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(filePath, 60);

        if (checkErr || !checkData?.signedUrl) {
          lastError = new Error(`Supabase verification failed (attempt ${attempt}): file not readable after upload`);
          console.warn(lastError.message);
        } else {
          // Clear any stale negative caches so streaming works immediately
          clearNegativeCache(filePath);
          return data!.path;
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`uploadToSupabaseStorage exception (attempt ${attempt}):`, err?.message || err);
    }

    // Exponential backoff before retry: 1s, 2s, 4s
    if (attempt < MAX_UPLOAD_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error(
    `Video storage failed after ${MAX_UPLOAD_RETRIES} attempts. ` +
    `The file could not be saved to Supabase. Please try again. (${lastError?.message || 'unknown error'})`
  );
}
