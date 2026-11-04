/**
 * P134 session 12. The React work's Glow Desk (`fixtures/glow-desk`, EXP-011 §49: a States panel, a follower whose State is
 * wired, and an Animate To Value whose At Target Value says "arrived") copied to a temporary folder with its page at
 * `Pages/Home`, where the arms look for it, and the Fade's Duration 0, so a tween settles in one frame and every reading
 * is the same on every run (a 500 ms tween is read part way, at a different point each time).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'glow-desk');

export function writeGlowHomeDesk(): string {
  const at = fs.mkdtempSync(path.join(os.tmpdir(), 'glow-home-desk-'));
  const copy = (from: string, to: string): void => {
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const name = entry.name === 'Glow' ? 'Home' : entry.name;
      if (entry.isDirectory()) {
        fs.mkdirSync(path.join(to, name), { recursive: true });
        copy(path.join(from, entry.name), path.join(to, name));
      } else {
        const text = fs.readFileSync(path.join(from, entry.name), 'utf-8').replace(/Pages\/Glow/g, 'Pages/Home').replace(/"duration": 500/g, '"duration": 0');
        fs.writeFileSync(path.join(to, name), text);
      }
    }
  };
  copy(FIXTURE, at);
  return at;
}
