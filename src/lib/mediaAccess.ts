import crypto from 'crypto';

const TOKEN_TTL_SECONDS = 5 * 60;

function secret(): string | null {
  const value = process.env.MEDIA_ACCESS_SECRET || process.env.MEDIA_SERVICE_TOKEN;
  return value?.trim() || null;
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

export function createMediaAccessToken(fileKey: string, ttlSeconds = TOKEN_TTL_SECONDS): string | null {
  const key = secret();
  if (!key) return null;

  const payload = JSON.stringify({
    key: fileKey,
    exp: Math.floor(Date.now() / 1000) + Math.min(ttlSeconds, TOKEN_TTL_SECONDS),
  });
  const encodedPayload = encode(payload);
  return `${encodedPayload}.${sign(encodedPayload, key)}`;
}

export function getMediaServiceUrl(): string | null {
  const value = process.env.MEDIA_SERVICE_URL || process.env.NEXT_PUBLIC_MEDIA_URL;
  return value?.startsWith('http') ? value.replace(/\/+$/, '') : null;
}
