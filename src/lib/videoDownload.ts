'use client';

import { compressVideoFile, formatBytes, CompressionOptions } from './clientVideoCompression';

/**
 * Triggers a real file download directly to device storage on mobile Chrome (Android/iOS)
 * as well as desktop browsers, preventing unwanted video player previews.
 */
export function triggerDeviceStorageDownload(blobOrUrl: Blob | string, filename: string): void {
  const cleanName = filename.trim().replace(/[\\/:*?"<>|]/g, '_');

  if (typeof blobOrUrl === 'string') {
    // Server-side attachment URL (has Content-Disposition: attachment)
    const a = document.createElement('a');
    a.href = blobOrUrl;
    a.setAttribute('download', cleanName);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 5000);
    return;
  }

  // It's a client-side Blob (e.g. from compression)
  const downloadBlob = new Blob([blobOrUrl], { type: 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(downloadBlob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.setAttribute('download', cleanName);
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 90_000);
}

export interface VideoDownloadTarget {
  id: string;
  title: string;
  creator_name?: string;
  file_url: string;
  file_name?: string;
}

/**
 * Downloads the normal / original uncompressed video file directly to device storage.
 * Obtains a signed download URL with Content-Disposition: attachment header.
 */
export async function downloadNormalVideo(
  video: VideoDownloadTarget,
  options: {
    onStart?: () => void;
    onSuccess?: (filename: string) => void;
    onError?: (err: Error) => void;
  } = {}
): Promise<void> {
  options.onStart?.();

  try {
    const safeTitle = (video.title || 'video').replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, ' ') || 'video';
    const safeCreator = (video.creator_name || 'Creator').replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, ' ');
    const filename = `${safeCreator} - ${safeTitle}.mp4`;

    // 1. Request dedicated attachment download URL
    const downloadApiUrl = `/api/videos/${encodeURIComponent(video.id)}/download?filename=${encodeURIComponent(filename)}&format=json`;

    let directUrl: string | null = null;
    try {
      const res = await fetch(downloadApiUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          directUrl = data.url;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson?.code === 'STORAGE_BANDWIDTH_EXCEEDED' || errJson?.bandwidth_exceeded) {
          throw new Error(errJson.message || 'Storage bandwidth limit reached on Storj DCS. Please add billing at storj.io to download.');
        }
      }
    } catch (apiErr: any) {
      if (apiErr?.message?.includes('bandwidth limit reached')) {
        throw apiErr;
      }
      console.warn('Could not query /api/videos/[id]/download, falling back to stream endpoint:', apiErr);
    }

    if (!directUrl) {
      // Fallback: check stream route with download=true
      try {
        const streamJsonUrl = `/api/videos/${encodeURIComponent(video.id)}/stream?download=true&filename=${encodeURIComponent(filename)}&format=json`;
        const res2 = await fetch(streamJsonUrl, { cache: 'no-store' });
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2.url) directUrl = data2.url;
        } else {
          const errJson2 = await res2.json().catch(() => ({}));
          if (errJson2?.code === 'STORAGE_BANDWIDTH_EXCEEDED' || errJson2?.bandwidth_exceeded) {
            throw new Error(errJson2.message || 'Storage bandwidth limit reached on Storj DCS. Please add billing at storj.io to download.');
          }
        }
      } catch (streamErr: any) {
        if (streamErr?.message?.includes('bandwidth limit reached')) {
          throw streamErr;
        }
      }
    }

    // If still no direct URL, use the direct API download endpoint path
    const finalDownloadUrl = directUrl || `/api/videos/${encodeURIComponent(video.id)}/download?filename=${encodeURIComponent(filename)}`;

    // Trigger true device storage download
    triggerDeviceStorageDownload(finalDownloadUrl, filename);
    options.onSuccess?.(filename);
  } catch (err: any) {
    console.error('downloadNormalVideo error:', err);
    options.onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

/**
 * Downloads a hardware-compressed MP4 video directly to device storage on mobile Chrome & desktop.
 * Compresses frame dimensions and bitrate, then forces application/octet-stream download to device.
 */
export async function downloadCompressedVideo(
  video: VideoDownloadTarget,
  options: {
    onProgress?: CompressionOptions['onProgress'];
    onStart?: () => void;
    onSuccess?: (stats: { filename: string; originalSize: number; compressedSize: number; savedPercent: number }) => void;
    onError?: (err: Error) => void;
    maxDimension?: number;
    videoBitrate?: number;
  } = {}
): Promise<void> {
  options.onStart?.();

  try {
    const safeTitle = (video.title || 'video').replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, ' ') || 'video';
    const safeCreator = (video.creator_name || 'Creator').replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, ' ');
    const baseFilename = `${safeCreator} - ${safeTitle}`;

    // 1. Resolve stream source URL
    let streamUrl = video.file_url;
    try {
      const jsonUrl = video.file_url.includes('?') ? `${video.file_url}&format=json` : `${video.file_url}?format=json`;
      const urlRes = await fetch(jsonUrl, { cache: 'no-store' });
      if (urlRes.ok) {
        const data = await urlRes.json();
        if (data.url) streamUrl = data.url;
      }
    } catch {}

    // 2. Fetch video binary stream
    const res = await fetch(streamUrl, { cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json') || !res.ok) {
      let errMessage = `Failed to fetch video stream (${res.status})`;
      try {
        const errJson = await res.json();
        errMessage = errJson.message || errJson.error || errMessage;
      } catch {}
      throw new Error(errMessage);
    }

    const videoBlob = await res.blob();

    // 3. Compress video with mobile-friendly constraints
    const compResult = await compressVideoFile(videoBlob, {
      maxDimension: options.maxDimension || 1280,
      videoBitrate: options.videoBitrate || 1_800_000,
      onProgress: options.onProgress,
    });

    const isMp4 = compResult.mimeType.includes('mp4');
    const ext = isMp4 ? '.mp4' : '.webm';
    const filename = `${baseFilename}_compressed${ext}`;

    // 4. Save directly to mobile device storage using application/octet-stream
    triggerDeviceStorageDownload(compResult.file, filename);

    options.onSuccess?.({
      filename,
      originalSize: compResult.originalSize,
      compressedSize: compResult.compressedSize,
      savedPercent: compResult.savedPercent,
    });
  } catch (err: any) {
    console.error('downloadCompressedVideo error:', err);
    options.onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}
