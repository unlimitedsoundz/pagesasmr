import { getSignedVideoUrl, supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';
import { extractVideoDimensions } from '@/lib/media';
import fs from 'fs';
import path from 'path';

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
  width?: number;
  height?: number;
}

const DEFAULT_TELEGRAM_BOT_TOKEN = '8903193318:AAFKkDsS5c8ri-DNKmleAyyzno22AeOmTJY';
const DEFAULT_TELEGRAM_CHAT_ID = '-5442804356';

export async function sendTelegramSubmissionNotification(params: TelegramSubmissionNotification) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID;

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

  // Generate signed URLs from Supabase Storage ($0 Storj dependency eliminated)
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

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '⬇️ Download MP4 File', url: publicDownloadUrl },
        { text: '⚡ Review in Dashboard', url: adminReviewUrl },
      ],
    ],
  };

  // Telegram sendVideo captions must be <= 1024 characters
  const videoCaption = captionHtml.length > 1024 ? captionHtml.substring(0, 1020) + '...' : captionHtml;

  // 1. PRIMARY: Deliver the actual playable video directly into Telegram!
  // Telegram bot multipart upload supports files up to 50MB.
  const isEligibleForDirectVideo = !params.fileSizeMb || params.fileSizeMb <= 50;

  if (isEligibleForDirectVideo && diskFileName && !diskFileName.startsWith('http')) {
    try {
      console.log(`[Telegram Pages] Preparing direct video delivery for ${diskFileName}...`);
      let videoBlob: Blob | null = null;
      let rawBuffer: Buffer | null = null;

      // Check local files first
      const localPaths = [
        path.join(process.cwd(), 'uploads', diskFileName),
        path.resolve(process.cwd(), '../../uploads', diskFileName),
        path.join(process.cwd(), 'public', 'uploads', diskFileName),
      ];

      for (const p of localPaths) {
        if (fs.existsSync(p)) {
          rawBuffer = fs.readFileSync(p);
          videoBlob = new Blob([new Uint8Array(rawBuffer)], { type: 'video/mp4' });
          break;
        }
      }

      // If not on local disk, download from Supabase Storage
      if (!videoBlob) {
        const { data: supaBlob, error: supaErr } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .download(diskFileName);
        if (!supaErr && supaBlob) {
          videoBlob = supaBlob;
          try {
            const ab = await supaBlob.arrayBuffer();
            rawBuffer = Buffer.from(ab);
          } catch (abErr) {
            console.warn('[Telegram Pages] Could not read Supabase blob arrayBuffer:', abErr);
          }
        }
      }

      if (videoBlob && videoBlob.size <= 50 * 1024 * 1024) {
        // Resolve native aspect ratio and dimensions to prevent video stretching/squashing
        let nativeWidth = params.width || 0;
        let nativeHeight = params.height || 0;

        if (rawBuffer && (!nativeWidth || !nativeHeight)) {
          const dims = extractVideoDimensions(rawBuffer);
          if (dims?.width && dims?.height) {
            nativeWidth = dims.width;
            nativeHeight = dims.height;
            console.log(
              `[Telegram Pages] Native video resolution detected: ${dims.width}x${dims.height} (rotation: ${dims.rotation}°)`
            );
          }
        }

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('video', videoBlob, downloadFilename);
        formData.append('caption', videoCaption);
        formData.append('parse_mode', 'HTML');
        formData.append('supports_streaming', 'true');

        // Pass exact native dimensions and duration so Telegram renders the exact native aspect ratio
        if (nativeWidth > 0 && nativeHeight > 0) {
          formData.append('width', Math.round(nativeWidth).toString());
          formData.append('height', Math.round(nativeHeight).toString());
        }

        if (params.durationSeconds && params.durationSeconds > 0) {
          formData.append('duration', Math.round(params.durationSeconds).toString());
        }

        formData.append('reply_markup', JSON.stringify(replyMarkup));

        const vidRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(60000), // 60s timeout for video upload
        });

        const vidData = await vidRes.json();
        if (vidData.ok) {
          console.log('[Telegram Pages] Inline video player delivered successfully to Telegram chat in native aspect ratio!');
          return { success: true, videoDelivered: true, width: nativeWidth, height: nativeHeight };
        } else {
          console.warn('[Telegram Pages] sendVideo multipart failed (' + vidData.description + '), falling back to sendMessage...');
        }
      }
    } catch (vidErr: any) {
      console.warn('[Telegram Pages] Direct sendVideo error, falling back to sendMessage:', vidErr?.message || vidErr);
    }
  }

  // 2. FALLBACK: Send rich text alert with inline download and review buttons
  try {
    let msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: captionHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: replyMarkup,
      }),
      signal: AbortSignal.timeout(10000),
    });

    let msgData = await msgRes.json();

    // Fallback if inline keyboard button URL is rejected
    if (!msgData.ok) {
      console.warn('[Telegram Pages Error] Primary sendMessage failed (' + msgData.description + '), retrying without inline keyboard...');
      msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: captionHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
        signal: AbortSignal.timeout(10000),
      });
      msgData = await msgRes.json();
    }

    // Fallback if HTML parsing failed, retry as pure plain text
    if (!msgData.ok) {
      console.warn('[Telegram Pages Error] HTML sendMessage failed (' + msgData.description + '), retrying as plain text...');
      const plainText = [
        `${emoji} NEW SUBMISSION RECEIVED (PINKROOM PAGES)`,
        ``,
        `Type: ${typeLabel}`,
        `Creator: ${params.creatorName} (${params.creatorEmail})`,
        `Title: ${params.title}`,
        params.category ? `Category: ${params.category}` : null,
        `Duration: ${formattedDuration}`,
        params.fileSizeMb ? `Size: ${params.fileSizeMb.toFixed(1)} MB` : null,
        params.notes ? `Notes: ${params.notes}` : null,
        ``,
        `Download: ${publicDownloadUrl}`,
        `Dashboard: ${adminReviewUrl}`,
      ]
        .filter(Boolean)
        .join('\n');

      msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText,
          disable_web_page_preview: false,
        }),
        signal: AbortSignal.timeout(10000),
      });
      msgData = await msgRes.json();
    }

    if (!msgData.ok) {
      console.error('[Telegram Pages Error] All sendMessage attempts failed:', msgData);
      return { success: false, error: msgData.description };
    }
    console.log('[Telegram Pages] Submission text alert sent successfully.');

    return { success: true, videoDelivered: false };
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
