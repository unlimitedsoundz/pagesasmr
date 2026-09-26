export const PLATFORM_ID = 'pinkroom_pages';
export const BRAND_NAME = 'The Pink Room — Page Turning';
export const BRAND_SHORT = 'The Pink Room Pages';
export const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pages.pinkroom.online';
export const CONTENT_CATEGORY = 'PAGE_TURNING';

export const RATE_PER_VIDEO_USD = 10.0;
export const MIN_PAYOUT_VIDEOS = 8;
export const MIN_PAYOUT_AMOUNT_USD = 80.0;
export const MIN_VIDEO_DURATION_SECONDS = 180; // 3 minutes strictly
export const MAX_UPLOAD_SIZE_BYTES = 524288000; // 500 MB

export const NOTIFICATION_SENDER =
  process.env.RESEND_FROM_EMAIL || 'The Pink Room Pages <notifications@pages.pinkroom.online>';
export const REPLY_TO_EMAIL =
  process.env.RESEND_REPLY_TO || 'opheliaadeleke@gmail.com';
export const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || 'opheliaadeleke@gmail.com';
export const ADMIN_NOTIFICATION_EMAILS: string[] = ADMIN_NOTIFICATION_EMAIL.split(',')
  .map((e) => e.trim())
  .filter(Boolean);
export const ADMIN_EMAIL = ADMIN_NOTIFICATION_EMAILS[0] || 'opheliaadeleke@gmail.com';

export const PLATFORM_LOGO_URL =
  'https://ydymhzdoptmpblmejcjs.supabase.co/storage/v1/object/public/avatars/brand/logo.png';
