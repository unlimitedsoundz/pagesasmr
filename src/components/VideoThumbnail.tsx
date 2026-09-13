'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Film, Play } from 'lucide-react';

interface VideoThumbnailProps {
  videoId: string;
  durationSeconds?: number;
  className?: string;
  altTitle?: string;
}

export default function VideoThumbnail({
  videoId,
  durationSeconds,
  className = 'w-20 h-20 sm:w-24 sm:h-24',
  altTitle = 'Video thumbnail',
}: VideoThumbnailProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamUrl = `/api/videos/${videoId}/stream`;

  useEffect(() => {
    let isMounted = true;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = streamUrl;
    video.muted = true;
    video.preload = 'metadata';

    const onSeeked = () => {
      try {
        if (!isMounted) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUri = canvas.toDataURL('image/jpeg', 0.85);
          if (isMounted) setThumbUrl(dataUri);
        }
      } catch (err) {
        // Cross-origin redirect fallback: native video element renders frame
      }
    };

    const onLoadedMetadata = () => {
      const targetTime = Math.min(1.0, (video.duration || 2) / 2);
      video.currentTime = targetTime;
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', () => {
      if (isMounted) setHasError(true);
    });

    return () => {
      isMounted = false;
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.src = '';
    };
  }, [videoId, streamUrl]);

  const minutes = durationSeconds ? Math.floor(durationSeconds / 60) : 0;
  const seconds = durationSeconds ? Math.round(durationSeconds % 60) : 0;
  const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#FDF0F4] dark:bg-[#251821] text-[#8E2848] dark:text-pink-300 flex items-center justify-center shrink-0 border border-neutral-200/70 dark:border-neutral-800 ${className}`}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={altTitle}
          className="w-full h-full object-cover"
        />
      ) : !hasError ? (
        <video
          ref={videoRef}
          src={`${streamUrl}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          className="w-full h-full object-cover pointer-events-none"
          onError={() => setHasError(true)}
        />
      ) : (
        <Film className="w-6 h-6 sm:w-7 sm:h-7 opacity-50" />
      )}

      {/* Subtle play indicator on hover */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
        </div>
      </div>

      {durationSeconds !== undefined && durationSeconds > 0 && (
        <span className="bg-black/80 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-mono absolute bottom-1.5 left-1.5 leading-none z-10">
          {durationText}
        </span>
      )}
    </div>
  );
}
