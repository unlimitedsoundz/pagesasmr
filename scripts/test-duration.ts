import { extractVideoDuration } from '../src/lib/media';

/**
 * Creates a minimal valid MP4 file header containing ftyp, moov, and mvhd atoms
 * with a specified timescale and duration.
 */
function createMinimalMp4(durationSeconds: number, timescale = 1000): Buffer {
  const durationUnits = Math.round(durationSeconds * timescale);

  // 1. ftyp atom (28 bytes)
  const ftyp = Buffer.alloc(28);
  ftyp.writeUInt32BE(28, 0);
  ftyp.write('ftyp', 4);
  ftyp.write('isom', 8);
  ftyp.writeUInt32BE(512, 12);
  ftyp.write('isom', 16);
  ftyp.write('iso2', 20);
  ftyp.write('mp41', 24);

  // 2. mvhd atom (v0: 108 bytes total)
  const mvhd = Buffer.alloc(108);
  mvhd.writeUInt32BE(108, 0);
  mvhd.write('mvhd', 4);
  mvhd.writeUInt8(0, 8); // version 0
  // flags: 3 bytes (offset 9, 10, 11)
  // creation_time: 4 bytes (offset 12)
  // modification_time: 4 bytes (offset 16)
  // timescale: 4 bytes (offset 20)
  mvhd.writeUInt32BE(timescale, 20);
  // duration: 4 bytes (offset 24)
  mvhd.writeUInt32BE(durationUnits, 24);
  // rate: 0x00010000 (1.0)
  mvhd.writeUInt32BE(0x00010000, 28);
  // volume: 0x0100 (1.0)
  mvhd.writeUInt16BE(0x0100, 32);

  // 3. moov atom containing mvhd
  const moovSize = 8 + mvhd.length;
  const moov = Buffer.alloc(moovSize);
  moov.writeUInt32BE(moovSize, 0);
  moov.write('moov', 4);
  mvhd.copy(moov, 8);

  return Buffer.concat([ftyp, moov]);
}

async function run() {
  console.log('Testing duration extraction...');
  
  // Test 1: 120 seconds (2 minutes - under threshold)
  const shortMp4 = createMinimalMp4(120);
  const dur1 = await extractVideoDuration(shortMp4, 'video/mp4');
  console.log(`Short MP4 duration: ${dur1}s (Under 180s threshold: ${dur1 < 180})`);
  if (Math.abs(dur1 - 120) > 0.1) throw new Error(`Expected 120s, got ${dur1}`);

  // Test 2: 195 seconds (3 min 15 sec - valid submission)
  const validMp4 = createMinimalMp4(195);
  const dur2 = await extractVideoDuration(validMp4, 'video/mp4');
  console.log(`Valid MP4 duration: ${dur2}s (Eligible: ${dur2 >= 180})`);
  if (Math.abs(dur2 - 195) > 0.1) throw new Error(`Expected 195s, got ${dur2}`);

  console.log('Duration extraction test passed successfully!');
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
