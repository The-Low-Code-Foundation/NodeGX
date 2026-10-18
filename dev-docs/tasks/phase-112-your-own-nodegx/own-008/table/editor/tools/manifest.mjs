// Prints a sha256 manifest of every file under a folder (node_modules skipped),
// or with --copy <dest> copies the folder too. Used to prove the app was not changed.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const [root, flag, dest] = process.argv.slice(2);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const files = walk(root).sort();
if (flag === '--copy') {
  for (const f of files) {
    const t = join(dest, relative(root, f));
    mkdirSync(dirname(t), { recursive: true });
    copyFileSync(f, t);
  }
  console.log(`copied ${files.length} files to ${dest}`);
} else {
  const lines = files.map((f) => createHash('sha256').update(readFileSync(f)).digest('hex') + '  ' + relative(root, f));
  if (flag === '--out') {
    writeFileSync(dest, lines.join('\n') + '\n');
    console.log(`${lines.length} files hashed into ${dest}`);
  } else if (flag === '--check') {
    const before = readFileSync(dest, 'utf8').trim().split('\n');
    const a = new Set(before), b = new Set(lines);
    const diff = [...before.filter((l) => !b.has(l)).map((l) => '- ' + l), ...lines.filter((l) => !a.has(l)).map((l) => '+ ' + l)];
    console.log(diff.length ? diff.join('\n') : `unchanged: all ${lines.length} files match ${dest}`);
    process.exitCode = diff.length ? 1 : 0;
  } else console.log(lines.join('\n'));
}
