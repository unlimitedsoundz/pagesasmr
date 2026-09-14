import * as mm from 'music-metadata';

/**
 * Extracts duration in seconds from an MP4 or MOV file buffer.
 * Uses music-metadata with fallback to direct ISO BMFF / QuickTime `mvhd` atom parsing,
 * fragmented MP4 `mehd` parsing, and client-verified duration fallback.
 */
export async function extractVideoDuration(
  buffer: Buffer,
  mimeType?: string,
  fallbackDuration?: number
): Promise<number> {
  // Strategy 1: music-metadata parser
  try {
    const metadata = await mm.parseBuffer(buffer, mimeType || 'video/mp4', {
      duration: true,
      skipCovers: true,
    });
    if (metadata.format && typeof metadata.format.duration === 'number' && metadata.format.duration > 0) {
      return Math.round(metadata.format.duration);
    }
  } catch (err) {
    console.warn('music-metadata parse warning, attempting ISO BMFF fallback:', err);
  }

  // Strategy 2: Direct ISO-BMFF / QuickTime container parser for 'mvhd' atom
  try {
    const parsed = parseMvhdDuration(buffer);
    if (parsed && parsed > 0) {
      return Math.round(parsed);
    }
  } catch (err) {
    console.error('ISO BMFF fallback error:', err);
  }

  // Strategy 3: Graceful client-measured duration fallback (HTML5 video element verified)
  if (fallbackDuration && fallbackDuration > 0) {
    return Math.round(fallbackDuration);
  }

  // If both binary header parsing and client duration fail
  throw new Error('Could not read valid media duration from video container headers.');
}

/**
 * Pure binary fallback parser for MP4 and MOV 'mvhd' atom (Movie Header)
 * and fragmented MP4 'mehd' atom (Movie Extends Header).
 * Scans all candidate positions to avoid false positives in compressed video streams.
 */
function parseMvhdDuration(buf: Buffer): number | null {
  const target = Buffer.from('mvhd');
  const matches: number[] = [];
  let pos = 0;

  // Locate all 'mvhd' fourCC occurrences (scanning full buffer)
  while (pos < buf.length) {
    const idx = buf.indexOf(target, pos);
    if (idx === -1) break;
    matches.push(idx);
    pos = idx + 4;
    if (matches.length > 30) break; // Reasonable cap
  }

  let validTimescale: number | null = null;

  // Check each candidate match (testing latest matches first since moov often sits at the end)
  for (let i = matches.length - 1; i >= 0; i--) {
    const mvhdIndex = matches[i];
    const dataStart = mvhdIndex + 4;
    if (dataStart + 24 > buf.length) continue;

    const version = buf.readUInt8(dataStart);
    let timescale = 0;
    let duration = 0;

    if (version === 1) {
      // 64-bit offsets: flags (3), creation (8), mod (8) = 19 bytes
      const timescaleOffset = dataStart + 1 + 3 + 8 + 8;
      if (timescaleOffset + 12 > buf.length) continue;
      timescale = buf.readUInt32BE(timescaleOffset);
      const durationBig = buf.readBigUInt64BE(timescaleOffset + 4);
      duration = Number(durationBig);
    } else if (version === 0) {
      // 32-bit offsets: flags (3), creation (4), mod (4) = 11 bytes
      const timescaleOffset = dataStart + 1 + 3 + 4 + 4;
      if (timescaleOffset + 8 > buf.length) continue;
      timescale = buf.readUInt32BE(timescaleOffset);
      duration = buf.readUInt32BE(timescaleOffset + 4);
    } else {
      continue;
    }

    if (timescale > 0 && timescale <= 10000000) {
      validTimescale = timescale;
      if (duration > 0) {
        const secs = duration / timescale;
        // Verify sanity: duration between 0.5 seconds and 7 days
        if (secs >= 0.5 && secs <= 604800) {
          return secs;
        }
      }
    }
  }

  // Strategy 2b: Fragmented MP4 (mvex -> mehd box)
  const mehdTarget = Buffer.from('mehd');
  const mehdIdx = buf.indexOf(mehdTarget);
  if (mehdIdx !== -1 && mehdIdx + 16 <= buf.length) {
    const dataStart = mehdIdx + 4;
    const version = buf.readUInt8(dataStart);
    let fragDuration = 0;
    if (version === 1 && dataStart + 1 + 3 + 8 <= buf.length) {
      fragDuration = Number(buf.readBigUInt64BE(dataStart + 4));
    } else if (version === 0 && dataStart + 1 + 3 + 4 <= buf.length) {
      fragDuration = buf.readUInt32BE(dataStart + 4);
    }

    const ts = validTimescale || 1000;
    if (fragDuration > 0 && ts > 0) {
      const secs = fragDuration / ts;
      if (secs >= 0.5 && secs <= 604800) {
        return secs;
      }
    }
  }

  return null;
}

export interface VideoDimensions {
  width: number;
  height: number;
  rotation: number;
}

/**
 * Extracts native video dimensions (width, height) and accounts for orientation rotation
 * (e.g. mobile 90° or 270° portrait recordings) from an MP4 or MOV buffer.
 */
export function extractVideoDimensions(buffer: Buffer): VideoDimensions | null {
  let videoMeta: VideoDimensions | null = null;

  function traverse(buf: Buffer) {
    let pos = 0;
    while (pos < buf.length - 8) {
      let size = buf.readUInt32BE(pos);
      const type = buf.toString('ascii', pos + 4, pos + 8);
      let headerSize = 8;

      if (size === 1) {
        if (pos + 16 > buf.length) break;
        size = Number(buf.readBigUInt64BE(pos + 8));
        headerSize = 16;
      } else if (size === 0) {
        size = buf.length - pos;
      }

      if (size < headerSize || pos + size > buf.length) break;

      if (type === 'moov' || type === 'trak' || type === 'mdia') {
        traverse(buf.subarray(pos + headerSize, pos + size));
        if (videoMeta) return;
      } else if (type === 'tkhd') {
        try {
          const version = buf.readUInt8(pos + headerSize);
          let p = pos + headerSize + 4; // skip version(1) + flags(3)
          p += version === 1 ? 32 : 20; // skip creation(8/4), mod(8/4), trackId(4), reserved(4), duration(8/4)
          p += 16; // skip reserved(8), layer(2), alt_group(2), volume(2), reserved(2)

          if (p + 36 + 8 <= pos + size) {
            const a = buf.readInt32BE(p);
            const b = buf.readInt32BE(p + 4);
            const c = buf.readInt32BE(p + 12);
            const d = buf.readInt32BE(p + 16);
            p += 36;

            let width = buf.readUInt32BE(p) >>> 16;
            let height = buf.readUInt32BE(p + 4) >>> 16;

            let rotation = 0;
            if (a === 0 && b === 65536 && c === -65536 && d === 0) rotation = 90;
            else if (a === 0 && b === -65536 && c === 65536 && d === 0) rotation = 270;
            else if (a === -65536 && b === 0 && c === 0 && d === -65536) rotation = 180;

            // When rotated 90 or 270 degrees, visual width and height are inverted
            if (rotation === 90 || rotation === 270) {
              const temp = width;
              width = height;
              height = temp;
            }

            if (width > 0 && height > 0) {
              videoMeta = { width, height, rotation };
              return;
            }
          }
        } catch {}
      }

      pos += size;
    }
  }

  try {
    traverse(buffer);
  } catch {}

  return videoMeta;
}

