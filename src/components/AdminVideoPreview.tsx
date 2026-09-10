'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  Zap,
  Download,
} from 'lucide-react';

interface AdminVideoPreviewProps {
  src: string;
  title?: string;
  durationSeconds?: number;
  className?: string;
  onDownloadNormal?: () => void;
  onDownloadCompressed?: () => void;
  isDownloadingNormal?: boolean;
  isDownloadingCompressed?: boolean;
  compressPercent?: number;
}

export default function AdminVideoPreview({
  src,
  title,
  durationSeconds,
  className = '',
  onDownloadNormal,
  onDownloadCompressed,
  isDownloadingNormal = false,
  isDownloadingCompressed = false,
  compressPercent,
}: AdminVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeUrl, setActiveUrl] = useState<string>('');
  const [isDirectCdn, setIsDirectCdn] = useState<boolean>(false);
  const [resolvingUrl, setResolvingUrl] = useState<boolean>(true);
  const [urlError, setUrlError] = useState<string>('');

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [bufferPercent, setBufferPercent] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const [fileMissing, setFileMissing] = useState<boolean>(false);
  const [bandwidthExceeded, setBandwidthExceeded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Buffer stall detection timer
  const [bufferingTooLong, setBufferingTooLong] = useState<boolean>(false);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Resolve direct high-speed CDN URL or fall back to stream URL
  useEffect(() => {
    let isCancelled = false;
    setResolvingUrl(true);
    setUrlError('');
    setHasError(false);
    setFileMissing(false);
    setBandwidthExceeded(false);
    setIsBuffering(true);
    setBufferingTooLong(false);

    async function resolvePreviewUrl() {
      if (!src) {
        setResolvingUrl(false);
        return;
      }

      // If already a signed Supabase URL with token, use directly
      if (src.startsWith('http') && src.includes('token=')) {
        if (!isCancelled) {
          setActiveUrl(src);
          setIsDirectCdn(true);
          setResolvingUrl(false);
        }
        return;
      }

      // Resolve target stream API route
      let queryUrl = src;
      if (src.includes('/private-videos/')) {
        const fileKey = src.split('/private-videos/')[1].split('?')[0];
        queryUrl = `/api/videos/${encodeURIComponent(fileKey)}/stream`;
      }

      try {
        // Query the JSON endpoint for the direct storage CDN signed URL
        const jsonUrl = queryUrl.includes('?') ? `${queryUrl}&format=json` : `${queryUrl}?format=json`;
        const res = await fetch(jsonUrl, { cache: 'no-store' });

        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.url) {
            setActiveUrl(data.url);
            setIsDirectCdn(Boolean(data.direct));
            setResolvingUrl(false);
            return;
          }
        } else if (res.status === 429) {
          try {
            const errData = await res.json();
            if (!isCancelled) {
              setBandwidthExceeded(true);
              setErrorMessage(errData.message || 'Storage bandwidth limit reached on Storj DCS.');
              setHasError(true);
              setResolvingUrl(false);
              setIsBuffering(false);
              return;
            }
          } catch {}
        } else if (res.status === 404) {
          try {
            const errData = await res.json();
            if (!isCancelled && errData.file_missing) {
              setFileMissing(true);
              setResolvingUrl(false);
              setIsBuffering(false);
              return;
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Could not resolve direct CDN preview URL, falling back to stream proxy:', err);
      }

      // Fallback directly to the provided src
      if (!isCancelled) {
        setActiveUrl(src);
        setIsDirectCdn(false);
        setResolvingUrl(false);
      }
    }

    resolvePreviewUrl();

    return () => {
      isCancelled = true;
    };
  }, [src, reloadKey]);

  // 2. Buffer stall watchdog (alerts if stuck buffering for > 8s)
  useEffect(() => {
    if (isBuffering && !hasError) {
      bufferTimerRef.current = setTimeout(() => {
        setBufferingTooLong(true);
      }, 8000);
    } else {
      setBufferingTooLong(false);
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    }

    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, [isBuffering, hasError]);

  // 3. Update buffer progress
  const updateBufferProgress = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (v.duration && isFinite(v.duration) && v.duration > 0) {
      setDuration(v.duration);
      const b = v.buffered;
      if (b.length > 0) {
        try {
          const end = b.end(b.length - 1);
          const pct = Math.min(100, Math.round((end / v.duration) * 100));
          setBufferPercent(pct);
        } catch {}
      }
    }
  }, []);

  // 4. Video event listeners
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    updateBufferProgress();
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.duration && isFinite(v.duration) && v.duration > 0) {
      setDuration(v.duration);
    }
    updateBufferProgress();
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
    setHasError(false);
    updateBufferProgress();
  };

  const handlePlaying = () => {
    setIsPlaying(true);
    setIsBuffering(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handleSeeking = () => {
    setIsBuffering(true);
  };

  const handleSeeked = () => {
    setIsBuffering(false);
    updateBufferProgress();
  };

  const handleError = (e: any) => {
    console.warn('Video preview playback error:', e);
    const v = videoRef.current;
    const err = v?.error;
    let msg = 'Playback encountered an issue.';
    if (err) {
      if (err.code === 2) msg = 'Network error while buffering video stream.';
      else if (err.code === 3) msg = 'Media decoding error. Video format may be non-standard.';
      else if (err.code === 4) msg = 'Video source not supported or link expired.';
    }
    setErrorMessage(msg);
    setHasError(true);
    setIsBuffering(false);
  };

  // 5. Controls
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch((err) => console.warn('Play interrupted:', err));
    } else {
      v.pause();
    }
  };

  const seekRelative = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || duration || 0, v.currentTime + seconds));
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const target = parseFloat(e.target.value);
    v.currentTime = target;
    setCurrentTime(target);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const newVol = parseFloat(e.target.value);
    v.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const changePlaybackRate = (rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleReload = () => {
    setHasError(false);
    setErrorMessage('');
    setIsBuffering(true);
    setReloadKey((k) => k + 1);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const speedOptions = [0.75, 1, 1.25, 1.5, 2];

  return (
    <div
      ref={containerRef}
      className={`relative bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 flex flex-col shadow-inner select-none ${className}`}
    >
      {/* Video Display Viewport */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {activeUrl && !hasError && (
          <video
            ref={videoRef}
            key={`${activeUrl}-${reloadKey}`}
            src={activeUrl}
            preload="auto"
            playsInline
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onPlaying={handlePlaying}
            onPause={handlePause}
            onWaiting={handleWaiting}
            onSeeking={handleSeeking}
            onSeeked={handleSeeked}
            onError={handleError}
            onProgress={updateBufferProgress}
            className="w-full h-full object-contain cursor-pointer"
          >
            Your browser does not support the video tag.
          </video>
        )}

        {/* Top Stream Quality Badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
          {isDirectCdn ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/80 backdrop-blur-md text-white border border-emerald-400/40">
              <Zap className="w-2.5 h-2.5 text-white fill-white" />
              Direct High-Speed CDN
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20">
              Buffered Stream
            </span>
          )}

          {bufferPercent > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 backdrop-blur-md text-neutral-300 border border-white/10">
              Buffered: {bufferPercent}%
            </span>
          )}
        </div>

        {/* Top Right Quick Reload */}
        <div className="absolute top-3 right-3 z-20">
          <button
            type="button"
            onClick={handleReload}
            title="Reload video preview stream"
            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBuffering ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Buffering Spinner Overlay */}
        {(isBuffering || resolvingUrl) && !hasError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 pointer-events-none">
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-neutral-900/90 border border-neutral-700/60 shadow-xl">
              <div className="relative flex items-center justify-center w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <Play className="w-4 h-4 text-white ml-0.5 opacity-80" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-white tracking-wide">
                  {resolvingUrl ? 'Resolving fast stream...' : 'Buffering preview...'}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Fast range caching active
                </div>
              </div>

              {bufferingTooLong && (
                <div className="pt-2 border-t border-neutral-700/60 flex flex-col items-center gap-2 pointer-events-auto">
                  <span className="text-[10px] text-amber-400 text-center max-w-[220px]">
                    Buffering is taking longer than expected.
                  </span>
                  <button
                    type="button"
                    onClick={handleReload}
                    style={{ backgroundColor: '#ffffff', color: '#000000' }}
                    className="px-2.5 py-1 rounded text-[11px] font-bold hover:bg-neutral-200 transition-colors"
                  >
                    Force Reconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Permanently Missing State */}
        {fileMissing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950 p-4 sm:p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-white mb-1">Video File Missing</h4>
            <p className="text-[11px] sm:text-xs text-neutral-400 max-w-[240px] mb-3 leading-relaxed">
              The physical video file was not found in local storage or Supabase.<br />
              <span className="text-red-400 font-semibold">Ask the creator to re-upload this video.</span>
            </p>
          </div>
        )}

        {/* Bandwidth Exceeded State */}
        {bandwidthExceeded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950 p-4 sm:p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-white mb-1">Storage Bandwidth Limit Exceeded</h4>
            <p className="text-[11px] sm:text-xs text-neutral-300 max-w-[320px] mb-3 leading-relaxed">
              This video is stored on Storj DCS which reached its free monthly egress quota.<br />
              <span className="text-amber-400 font-medium">Add a payment method at storj.io to unlock immediately, or re-upload.</span>
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleReload}
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-check Access</span>
              </button>
              <a
                href="https://storj.io"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 border border-neutral-700 transition-colors"
              >
                Storj Console
              </a>
            </div>
          </div>
        )}

        {/* Error Fallback State */}
        {hasError && !fileMissing && !bandwidthExceeded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950 p-4 sm:p-6 text-center">
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 mb-2" />
            <h4 className="text-xs sm:text-sm font-bold text-white mb-1">Preview Playback Stalled</h4>
            <p className="text-[11px] sm:text-xs text-neutral-400 max-w-sm mb-3 sm:mb-4">
              {errorMessage || 'The stream could not buffer properly. You can reload the connection or download the file directly.'}
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleReload}
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Stream</span>
              </button>
              <a
                href={activeUrl || src}
                download
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 border border-neutral-700 transition-colors"
              >
                Open in Tab
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Admin Player Controls Bar */}
      <div className="bg-neutral-900 border-t border-neutral-800 p-2 sm:p-3 space-y-1.5 sm:space-y-2 text-white">
        {/* Timeline Scrubbing Bar */}
        <div className="relative group flex items-center">
          <div className="absolute left-0 right-0 h-1 sm:h-1.5 bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-neutral-600 transition-all duration-300"
              style={{ width: `${bufferPercent}%` }}
              title={`Buffered ${bufferPercent}%`}
            />
          </div>

          <div className="absolute left-0 right-0 h-1 sm:h-1.5 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full transition-all duration-75"
              style={{
                backgroundColor: '#ffffff',
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
          </div>

          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1.5 opacity-0 cursor-pointer z-10"
            title={`Seek: ${formatTime(currentTime)} / ${formatTime(duration)}`}
          />
        </div>

        {/* Lower Controls Toolbar */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-0.5 text-xs">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
              className="p-1 sm:p-1.5 rounded-md sm:rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center font-bold shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-black text-black" />
              ) : (
                <Play className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-black text-black ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekRelative(-10)}
              title="Rewind 10s"
              className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors shrink-0"
            >
              <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => seekRelative(10)}
              title="Forward 10s"
              className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors shrink-0"
            >
              <RotateCw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>

            <div className="text-[10px] sm:text-[11px] font-mono text-neutral-300 px-1 select-none whitespace-nowrap">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="text-neutral-500 mx-0.5 sm:mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex sm:hidden items-center bg-neutral-800 rounded px-1.5 py-0.5 border border-neutral-700">
              <span className="text-[9px] font-bold text-neutral-400 mr-1 select-none">SPD</span>
              <select
                value={playbackRate}
                onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                className="bg-transparent text-white text-[10px] font-bold outline-none cursor-pointer"
                style={{ color: '#ffffff', backgroundColor: '#262626' }}
              >
                {speedOptions.map((rate) => (
                  <option key={rate} value={rate} style={{ color: '#ffffff', backgroundColor: '#171717' }}>
                    {rate}x
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center bg-neutral-800 rounded-lg p-0.5 border border-neutral-700">
              <span className="text-[10px] text-neutral-400 px-1.5 font-bold uppercase select-none">
                Speed
              </span>
              {speedOptions.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => changePlaybackRate(rate)}
                  style={
                    playbackRate === rate
                      ? { backgroundColor: '#ffffff', color: '#000000' }
                      : { color: '#d4d4d8', backgroundColor: 'transparent' }
                  }
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    playbackRate === rate
                      ? 'shadow-sm font-extrabold'
                      : 'hover:text-white hover:bg-neutral-700/60'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-neutral-700 rounded cursor-pointer accent-white"
                title="Volume"
              />
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              title="Fullscreen"
              className="p-1 rounded text-neutral-400 hover:text-white transition-colors shrink-0"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Mobile-Friendly Device Download Action Bar */}
        {(onDownloadNormal || onDownloadCompressed) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-neutral-900/95 border-t border-neutral-800 text-xs">
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Save to Device Storage:
            </span>
            <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              {onDownloadCompressed && (
                <button
                  type="button"
                  onClick={onDownloadCompressed}
                  disabled={isDownloadingNormal || isDownloadingCompressed}
                  style={{ borderRadius: 0 }}
                  className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-none border border-neutral-700 disabled:opacity-50 transition-colors text-[10px] sm:text-[11px]"
                  title="Save compressed video file directly to phone/device storage"
                >
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                  <Download className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isDownloadingCompressed ? 'animate-bounce' : ''}`} />
                  <span className="truncate">
                    {isDownloadingCompressed
                      ? `${compressPercent !== undefined ? `${compressPercent}%` : 'Compressing'}`
                      : 'Download Compressed'}
                  </span>
                </button>
              )}
              {onDownloadNormal && (
                <button
                  type="button"
                  onClick={onDownloadNormal}
                  disabled={isDownloadingNormal || isDownloadingCompressed}
                  style={{ backgroundColor: '#ffffff', color: '#000000', borderRadius: 0 }}
                  className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 hover:bg-neutral-100 font-bold rounded-none disabled:opacity-50 transition-colors text-[10px] sm:text-[11px]"
                  title="Save normal original video file directly to phone/device storage"
                >
                  <Download className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isDownloadingNormal ? 'animate-bounce' : ''}`} />
                  <span className="truncate">{isDownloadingNormal ? 'Saving...' : 'Download Normal'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
