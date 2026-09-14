import { Submission, StorageProvider } from '@/types';
import { getSignedVideoUrl, extractStorageKey } from '@/lib/supabase';

export interface StorageUrlResult {
  url: string;
  direct: boolean;
  source: 'supabase' | 'hostinger' | 'local';
  filename?: string;
}

export interface IStorageProvider {
  name: StorageProvider;
  getStreamUrl(
    target: string | Partial<Submission>,
    options?: { download?: boolean | string; filename?: string }
  ): Promise<StorageUrlResult | null>;
  getDownloadUrl(
    target: string | Partial<Submission>,
    options?: { filename?: string }
  ): Promise<StorageUrlResult | null>;
}

export class SupabaseStorageProvider implements IStorageProvider {
  public readonly name: StorageProvider = 'supabase';

  async getStreamUrl(
    target: string | Partial<Submission>,
    options?: { download?: boolean | string; filename?: string }
  ): Promise<StorageUrlResult | null> {
    const rawKey = typeof target === 'string' ? target : target.storage_key || target.file_url || '';
    const cleanKey = extractStorageKey(rawKey);
    if (!cleanKey) return null;

    try {
      const signedUrl = await getSignedVideoUrl(cleanKey, 3600, {
        download: options?.download ? (typeof options.download === 'string' ? options.download : options.filename || true) : undefined,
      });

      if (signedUrl) {
        return {
          url: signedUrl,
          direct: true,
          source: 'supabase',
        };
      }
    } catch (err) {
      console.warn('[Pages SupabaseStorageProvider] Failed to generate stream URL:', err);
    }

    return null;
  }

  async getDownloadUrl(
    target: string | Partial<Submission>,
    options?: { filename?: string }
  ): Promise<StorageUrlResult | null> {
    const rawKey = typeof target === 'string' ? target : target.storage_key || target.file_url || '';
    const cleanKey = extractStorageKey(rawKey);
    if (!cleanKey) return null;

    const downloadFilename = options?.filename || (typeof target === 'object' && target.original_filename) || `${cleanKey}.mp4`;

    try {
      const signedUrl = await getSignedVideoUrl(cleanKey, 3600, {
        download: downloadFilename,
      });

      if (signedUrl) {
        return {
          url: signedUrl,
          direct: true,
          source: 'supabase',
          filename: downloadFilename,
        };
      }
    } catch (err) {
      console.warn('[Pages SupabaseStorageProvider] Failed to generate download URL:', err);
    }

    return null;
  }
}

export class HostingerStorageProvider implements IStorageProvider {
  public readonly name: StorageProvider = 'hostinger';

  private getMediaBaseUrl(): string | null {
    const mediaUrl = process.env.MEDIA_SERVICE_URL || process.env.NEXT_PUBLIC_MEDIA_URL;
    if (mediaUrl && mediaUrl.startsWith('http')) {
      return mediaUrl.replace(/\/+$/, '');
    }
    return null;
  }

  async getStreamUrl(
    target: string | Partial<Submission>,
    options?: { download?: boolean | string; filename?: string }
  ): Promise<StorageUrlResult | null> {
    const rawKey = typeof target === 'string' ? target : target.storage_key || target.file_url || '';
    const cleanKey = extractStorageKey(rawKey);
    if (!cleanKey) return null;

    const mediaBase = this.getMediaBaseUrl();
    if (mediaBase) {
      const queryParams = new URLSearchParams();
      if (options?.download) queryParams.set('download', 'true');
      if (options?.filename) queryParams.set('filename', options.filename);
      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return {
        url: `${mediaBase}/media/stream/${encodeURIComponent(cleanKey)}${qs}`,
        direct: true,
        source: 'hostinger',
      };
    }

    const queryParams = new URLSearchParams();
    if (options?.download) queryParams.set('download', 'true');
    if (options?.filename) queryParams.set('filename', options.filename);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

    return {
      url: `/api/videos/${encodeURIComponent(cleanKey)}/stream${qs}`,
      direct: false,
      source: 'hostinger',
    };
  }

  async getDownloadUrl(
    target: string | Partial<Submission>,
    options?: { filename?: string }
  ): Promise<StorageUrlResult | null> {
    const rawKey = typeof target === 'string' ? target : target.storage_key || target.file_url || '';
    const cleanKey = extractStorageKey(rawKey);
    if (!cleanKey) return null;

    const downloadFilename = options?.filename || (typeof target === 'object' && target.original_filename) || `${cleanKey}.mp4`;

    const mediaBase = this.getMediaBaseUrl();
    if (mediaBase) {
      return {
        url: `${mediaBase}/media/download/${encodeURIComponent(cleanKey)}?filename=${encodeURIComponent(downloadFilename)}`,
        direct: true,
        source: 'hostinger',
        filename: downloadFilename,
      };
    }

    return {
      url: `/api/videos/${encodeURIComponent(cleanKey)}/download?filename=${encodeURIComponent(downloadFilename)}`,
      direct: false,
      source: 'hostinger',
      filename: downloadFilename,
    };
  }
}

const supabaseProviderInstance = new SupabaseStorageProvider();
const hostingerProviderInstance = new HostingerStorageProvider();

export function getStorageProvider(
  target?: string | Partial<Submission> | null
): IStorageProvider {
  if (!target) {
    const defaultProvider = process.env.STORAGE_PROVIDER?.toLowerCase();
    return defaultProvider === 'supabase' ? supabaseProviderInstance : hostingerProviderInstance;
  }

  if (typeof target === 'object') {
    if (target.storage_provider === 'hostinger') return hostingerProviderInstance;
    if (target.storage_provider === 'supabase') return supabaseProviderInstance;

    const fileUrl = target.file_url || target.storage_key || '';
    if (fileUrl.includes('media.pinkroom.online') || fileUrl.includes('/api/videos/')) {
      return hostingerProviderInstance;
    }
    if (fileUrl.includes('/private-videos/') || fileUrl.includes('supabase.co')) {
      return supabaseProviderInstance;
    }
  } else if (typeof target === 'string') {
    if (target.includes('media.pinkroom.online') || target.includes('/api/videos/')) {
      return hostingerProviderInstance;
    }
    if (target.includes('/private-videos/') || target.includes('supabase.co')) {
      return supabaseProviderInstance;
    }
  }

  const defaultProvider = process.env.STORAGE_PROVIDER?.toLowerCase();
  return defaultProvider === 'supabase' ? supabaseProviderInstance : hostingerProviderInstance;
}
