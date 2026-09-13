export interface CompressionOptions {
  maxDimension?: number; // e.g. 1280 for 720p, 1920 for 1080p
  videoBitrate?: number; // target video bitrate in bps (e.g. 2_000_000 = 2 Mbps)
  audioBitrate?: number; // target audio bitrate in bps (e.g. 128_000 = 128 kbps)
  fps?: number; // frames per second (e.g. 30)
  onProgress?: (progress: {
    percent: number;
    currentTime: number;
    duration: number;
    stage: 'initializing' | 'compressing' | 'finalizing' | 'done';
    originalSize: number;
    estimatedCompressedSize?: number;
  }) => void;
  signal?: AbortSignal;
}

export interface ClientCompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  duration: number;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Detect the best supported video MIME type for recording / compression in the current browser.
 */
export function getBestSupportedVideoMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'video/mp4';
  }

  const candidateTypes = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];

  for (const t of candidateTypes) {
    try {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    } catch {}
  }

  return 'video/webm';
}

/**
 * Hardware-accelerated client-side video compression using HTML5 Canvas & MediaRecorder.
 * Preserves high audio fidelity (crucial for ASMR microphones) while scaling down frame size
 * and regulating video bitrate to drastically reduce file sizes during upload.
 */
export async function compressVideoFile(
  fileOrBlob: File | Blob,
  options: CompressionOptions = {}
): Promise<ClientCompressionResult> {
  const originalSize = fileOrBlob.size;
  const originalName = fileOrBlob instanceof File ? fileOrBlob.name : 'video.mp4';
  const signal = options.signal;

  if (signal?.aborted) {
    throw new Error('Compression cancelled');
  }

  // 1. Create a video element to decode frames
  const video = document.createElement('video');
  video.preload = 'auto';
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.muted = false;
  video.crossOrigin = 'anonymous';

  const objectUrl = URL.createObjectURL(fileOrBlob);
  video.src = objectUrl;

  try {
    options.onProgress?.({
      percent: 0,
      currentTime: 0,
      duration: 0,
      stage: 'initializing',
      originalSize,
    });

    // 2. Wait for metadata to load
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Failed to load video metadata for compression.'));
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);

      if (video.readyState >= 1) {
        cleanup();
        resolve();
      }
    });

    if (signal?.aborted) {
      throw new Error('Compression cancelled');
    }

    const duration = video.duration || 180;
    const origWidth = video.videoWidth || 1280;
    const origHeight = video.videoHeight || 720;
    const maxDim = options.maxDimension || 1280;

    // 3. Compute target resolution keeping aspect ratio
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (origWidth >= origHeight) {
      if (origWidth > maxDim) {
        targetWidth = maxDim;
        targetHeight = Math.round((origHeight * maxDim) / origWidth);
      }
    } else {
      if (origHeight > maxDim) {
        targetHeight = maxDim;
        targetWidth = Math.round((origWidth * maxDim) / origHeight);
      }
    }

    // Video encoders require even pixel dimensions
    targetWidth = targetWidth - (targetWidth % 2);
    targetHeight = targetHeight - (targetHeight % 2);

    // 4. Setup off-screen canvas for frame resizing
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not create canvas 2D rendering context');
    }

    // 5. Connect AudioContext for pristine audio capture
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    let audioCtx: AudioContext | null = null;
    let audioTrack: MediaStreamTrack | null = null;

    if (AudioContextClass) {
      try {
        const ctxInstance: AudioContext = new AudioContextClass();
        audioCtx = ctxInstance;
        const sourceNode = ctxInstance.createMediaElementSource(video);
        const destNode = ctxInstance.createMediaStreamDestination();
        sourceNode.connect(destNode);
        audioTrack = destNode.stream.getAudioTracks()[0] || null;
      } catch (audioErr) {
        console.warn('AudioContext source capture error:', audioErr);
      }
    }

    // 6. Setup MediaStream from canvas + audio
    const fps = options.fps || 30;
    const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(fps) : null;
    if (!canvasStream) {
      throw new Error('Browser does not support canvas stream capture');
    }
    const videoTrack = canvasStream.getVideoTracks()[0];

    const outputTracks: MediaStreamTrack[] = [videoTrack];
    if (audioTrack) {
      outputTracks.push(audioTrack);
    }
    const outputStream = new MediaStream(outputTracks);

    // 7. Configure MediaRecorder with target bitrates
    const mimeType = getBestSupportedVideoMimeType();
    const videoBitrate = options.videoBitrate || 2_000_000;
    const audioBitrate = options.audioBitrate || 160_000;

    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: audioBitrate,
    };

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(outputStream, recorderOptions);
    } catch {
      recorder = new MediaRecorder(outputStream);
    }

    const recordedChunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    // 8. Render loop
    let animId: number;
    const renderLoop = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      animId = requestAnimationFrame(renderLoop);
    };

    // 9. Execute recording
    const compressionPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        cancelAnimationFrame(animId);
        const finalBlob = new Blob(recordedChunks, {
          type: mimeType.split(';')[0] || 'video/mp4',
        });
        resolve(finalBlob);
      };

      recorder.onerror = (err) => {
        cancelAnimationFrame(animId);
        reject(err);
      };

      video.ontimeupdate = () => {
        if (!duration || duration <= 0) return;
        const percent = Math.min(98, Math.round((video.currentTime / duration) * 100));
        const estimatedRatio = Math.min(
          1,
          (videoBitrate + audioBitrate) / 8 / (originalSize / duration)
        );
        const estimatedSize = Math.round(originalSize * (estimatedRatio || 0.3));

        options.onProgress?.({
          percent,
          currentTime: video.currentTime,
          duration,
          stage: 'compressing',
          originalSize,
          estimatedCompressedSize: estimatedSize,
        });
      };

      video.onended = () => {
        options.onProgress?.({
          percent: 99,
          currentTime: duration,
          duration,
          stage: 'finalizing',
          originalSize,
        });
        recorder.stop();
      };
    });

    if (audioCtx && audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch {}
    }

    recorder.start(1000);
    video.currentTime = 0;
    try {
      await video.play();
    } catch (playErr) {
      console.warn('Playback without mute failed, retrying with muted:', playErr);
      video.muted = true;
      await video.play();
    }
    renderLoop();

    if (signal) {
      signal.addEventListener('abort', () => {
        video.pause();
        cancelAnimationFrame(animId);
        try {
          recorder.stop();
        } catch {}
      });
    }

    const compressedBlob = await compressionPromise;

    if (audioCtx && audioCtx.state !== 'closed') {
      try {
        await audioCtx.close();
      } catch {}
    }

    const compressedSize = compressedBlob.size;
    const savedPercent = Math.max(
      0,
      Math.round(((originalSize - compressedSize) / originalSize) * 100)
    );

    options.onProgress?.({
      percent: 100,
      currentTime: duration,
      duration,
      stage: 'done',
      originalSize,
      estimatedCompressedSize: compressedSize,
    });

    const isMp4 = mimeType.includes('mp4');
    const ext = isMp4 ? '.mp4' : '.webm';
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const finalFileName = `${baseName}_compressed${ext}`;

    const compressedFile = new File([compressedBlob], finalFileName, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      savedPercent,
      duration,
      width: targetWidth,
      height: targetHeight,
      mimeType: compressedBlob.type,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}
