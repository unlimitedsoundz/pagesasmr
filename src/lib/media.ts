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
