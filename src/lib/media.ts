import * as mm from 'music-metadata';

/**
 * Extracts duration in seconds from an MP4 or MOV file buffer.
 * Uses music-metadata with fallback to direct ISO BMFF / QuickTime `mvhd` atom parsing.
 */
export async function extractVideoDuration(buffer: Buffer, mimeType?: string): Promise<number> {
  // Strategy 1: music-metadata parser
  try {
    const metadata = await mm.parseBuffer(buffer, mimeType || 'video/mp4', {
      duration: true,
      skipCovers: true,
    });
    if (metadata.format && typeof metadata.format.duration === 'number' && metadata.format.duration > 0) {
      return metadata.format.duration;
    }
  } catch (err) {
    console.warn('music-metadata parse warning, attempting ISO BMFF fallback:', err);
  }

  // Strategy 2: Direct ISO-BMFF / QuickTime container parser for 'mvhd' atom
  try {
    const parsed = parseMvhdDuration(buffer);
    if (parsed && parsed > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('ISO BMFF fallback error:', err);
  }

  // If both fail to find an mvhd box (e.g. truncated or unusual packaging)
  throw new Error('Could not read valid media duration from video container headers.');
}

/**
 * Pure binary fallback parser for MP4 and MOV 'mvhd' atom (Movie Header).
 * Reads timescale and duration directly from the ISO BMFF / QuickTime header.
 */
function parseMvhdDuration(buf: Buffer): number | null {
  const mvhdIndex = buf.indexOf(Buffer.from('mvhd'));
  if (mvhdIndex === -1) return null;

  const dataStart = mvhdIndex + 4;
  if (dataStart + 20 > buf.length) return null;

  const version = buf.readUInt8(dataStart);
  let timescale = 0;
  let duration = 0;

  if (version === 1) {
    const timescaleOffset = dataStart + 1 + 3 + 8 + 8;
    if (timescaleOffset + 12 > buf.length) return null;
    timescale = buf.readUInt32BE(timescaleOffset);
    const durationBig = buf.readBigUInt64BE(timescaleOffset + 4);
    duration = Number(durationBig);
  } else {
    const timescaleOffset = dataStart + 1 + 3 + 4 + 4;
    if (timescaleOffset + 8 > buf.length) return null;
    timescale = buf.readUInt32BE(timescaleOffset);
    duration = buf.readUInt32BE(timescaleOffset + 4);
  }

  if (timescale > 0 && duration > 0) {
    return duration / timescale;
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

