import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function searchDir(dir: string, pattern: string) {
  if (!fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.toLowerCase().includes(pattern.toLowerCase())) {
        console.log('Found in', dir, ':', f);
      }
    }
  } catch {}
}

const tmpDir = os.tmpdir();
console.log('Searching os.tmpdir():', tmpDir);
searchDir(tmpDir, 'g9d3cp');
searchDir(path.join(tmpDir, 'uploads'), 'g9d3cp');
searchDir(path.join(tmpDir, 'uploads'), 'video-1789312214181');
searchDir(path.join(tmpDir, 'uploads'), '193332');

searchDir('public/uploads', 'g9d3cp');
searchDir('apps/pinkroom-pages/public/uploads', 'g9d3cp');
