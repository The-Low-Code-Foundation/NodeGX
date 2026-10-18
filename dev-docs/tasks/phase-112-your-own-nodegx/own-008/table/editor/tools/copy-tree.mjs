// Copies a folder's files (node_modules and .git left out). Used to test on copies of an app.
import { readdirSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

export function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  let count = 0;
  for (const name of readdirSync(from)) {
    if (name === 'node_modules' || name === '.git') continue;
    const a = join(from, name);
    const b = join(to, name);
    if (statSync(a).isDirectory()) count += copyTree(a, b);
    else {
      copyFileSync(a, b);
      count++;
    }
  }
  return count;
}
