import { getSignedVideoUrl } from '@/lib/supabase';

export interface TelegramSubmissionNotification {
  type: 'SAMPLE' | 'SUBMISSION' | 'REVISION';
  creatorName: string;
  creatorEmail: string;
  title: string;
  category?: string;
  durationSeconds: number;
  fileSizeMb?: number;
  fileUrl: string;
  notes?: string;
  submissionId?: string;
}

export async function sendTelegramSubmissionNotification(params: TelegramSubmissionNotification) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[Telegram Pages Alert] Skipped - TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.');
    return { success: false, reason: 'Not configured' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pages.pinkroom.online';
  
  // Extract diskFileName if fileUrl is structured like /api/videos/diskFileName/stream
  let diskFileName = params.fileUrl;
  if (diskFileName.includes('/api/videos/')) {
    const parts = diskFileName.split('/api/videos/');
    if (parts[1]) {
      diskFileName = parts[1].replace('/stream', '').replace('/download', '');
    }
  }

  const safeTitle = (params.title || 'video').replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_');
  const safeCreator = (params.creatorName || 'creator').replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_');
  const downloadFilename = `${safeTitle}_${safeCreator}.mp4`;

  // Generate signed URLs for direct streaming and download if hosted on Supabase / Storj
  let directSignedUrl: string | null = null;
  let downloadUrl: string | null = null;

  if (diskFileName && !diskFileName.startsWith('http')) {
    try {
      directSignedUrl = await getSignedVideoUrl(diskFileName, 86400 * 3);
      downloadUrl = await getSignedVideoUrl(diskFileName, 86400 * 3, { download: downloadFilename });
    } catch (e) {
      console.warn('[Telegram Pages] Could not generate signed video URL:', e);
    }
  }

  const publicStreamUrl = directSignedUrl || `${appUrl}${params.fileUrl.startsWith('/') ? '' : '/'}${params.fileUrl}`;
  const publicDownloadUrl = downloadUrl || `${appUrl}/api/videos/${encodeURIComponent(diskFileName)}/download?filename=${encodeURIComponent(downloadFilename)}`;
  const adminReviewUrl = `${appUrl}/admin/submissions`;

  const durationMin = Math.floor(params.durationSeconds / 60);
  const durationSec = Math.round(params.durationSeconds % 60);
  const formattedDuration = `${durationMin}m ${durationSec}s (${Math.round(params.durationSeconds)}s)`;

  const emoji = params.type === 'SAMPLE' ? '🎤' : params.type === 'REVISION' ? '🔄' : '🎬';
  const typeLabel = params.type === 'SAMPLE' ? 'Audition Sample' : params.type === 'REVISION' ? 'Video Revision' : 'Full Video Submission';

  const captionHtml = [
    `<b>${emoji} NEW SUBMISSION RECEIVED (PINKROOM PAGES)</b>`,
    ``,
    `📌 <b>Type:</b> ${typeLabel}`,
    `👤 <b>Creator:</b> ${escapeHtml(params.creatorName)} (${escapeHtml(params.creatorEmail)})`,
    `📽️ <b>Title:</b> ${escapeHtml(params.title)}`,
    params.category ? `🏷️ <b>Category:</b> ${escapeHtml(params.category)}` : null,
    `⏱️ <b>Duration:</b> ${formattedDuration}`,
    params.fileSizeMb ? `📦 <b>Size:</b> ${params.fileSizeMb.toFixed(1)} MB` : null,
    params.notes ? `💬 <b>Notes:</b> <i>${escapeHtml(params.notes)}</i>` : null,
    ``,
    `⬇️ <a href="${escapeHtml(publicDownloadUrl)}">Download Video File (${downloadFilename})</a>`,
    `🖥️ <a href="${escapeHtml(adminReviewUrl)}">Open Admin Dashboard</a>`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    // 1. Primary: Send immediate, guaranteed alert message with action buttons
    const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: captionHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⬇️ Download MP4 File', url: publicDownloadUrl },
              { text: '⚡ Review in Dashboard', url: adminReviewUrl },
            ],
          ],
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    const msgData = await msgRes.json();
    if (!msgData.ok) {
      console.error('[Telegram Pages Error] sendMessage failed:', msgData);
      return { success: false, error: msgData.description };
    }
    console.log('[Telegram Pages] Submission text alert sent successfully.');

    // 2. Optional: If media is under 20MB and has a direct signed URL, also try to post video preview directly
    if (directSignedUrl && params.fileSizeMb && params.fileSizeMb <= 20) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            video: directSignedUrl,
            caption: `🎬 <b>Video Stream:</b> ${escapeHtml(params.title)}`,
            parse_mode: 'HTML',
          }),
          signal: AbortSignal.timeout(6000),
        });
      } catch (videoErr) {
        console.warn('[Telegram Pages] Optional sendVideo preview skipped:', videoErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Telegram Pages Exception]', err?.message || err);
    return { success: false, error: err?.message };
  }
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
