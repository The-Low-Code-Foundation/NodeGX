// One hash over every file in a folder, names and bytes: equal means nothing changed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function fingerprint(dir) {
  const hash = crypto.createHash('sha256');
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const abs = path.join(d, e.name);
      if (e.isDirectory()) walk(abs);
      else hash.update(path.relative(dir, abs) + '\0').update(fs.readFileSync(abs)).update('\0');
    }
  };
  walk(dir);
  return hash.digest('hex');
}
