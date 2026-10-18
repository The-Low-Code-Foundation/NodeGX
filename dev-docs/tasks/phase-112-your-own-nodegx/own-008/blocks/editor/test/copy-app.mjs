// Copies an app folder somewhere to test on, so the real app is never touched.
//   node test/copy-app.mjs <from> <to>
import fs from 'node:fs';
import path from 'node:path';

export function copyApp(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true, filter: (src) => !src.split(path.sep).includes('node_modules') });
  return to;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [from, to] = process.argv.slice(2);
  if (!from || !to) {
    console.error('usage: node test/copy-app.mjs <from> <to>');
    process.exit(2);
  }
  copyApp(path.resolve(from), path.resolve(to));
  console.log(`copied ${from} → ${to}`);
}
