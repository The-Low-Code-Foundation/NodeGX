// Downloads the twelve Rocketbox people the kit's crowd is baked from (PEOPLE.md ruling 9: functional clothes, as the
// library ships them), into _make/source/rocketbox/ (gitignored). Rocketbox's 2048 px TGA textures become 1024 px
// JPEG/PNG with macOS `sips`. Safe to re-run: present files are skipped. Licence: MIT (the LICENSE.md fetched beside).
//   node _make/fetch-people.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PEOPLE } from './people-list.mjs';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'source/rocketbox');
const RB = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master';

const FILES = [['LICENSE.md', `${RB}/LICENSE.md`]];
const tree = await (await fetch('https://api.github.com/repos/microsoft/Microsoft-Rocketbox/git/trees/master?recursive=1')).json();
if (!tree.tree) throw new Error(`GitHub tree: ${tree.message}`);
for (const { source: name } of PEOPLE) {
  const dir = tree.tree.find((x) => x.type === 'tree' && /^Assets\/Avatars\/[^/]+\/[^/]+$/.test(x.path) && x.path.endsWith(`/${name}`))?.path;
  if (!dir) throw new Error(`no Rocketbox avatar ${name}`);
  // The plain export (no face shapes: nobody's face moves at this size), every colour texture, body and head normals.
  FILES.push([`${name}/${name}.fbx`, `${RB}/${dir}/Export/${name}.fbx`]);
  for (const t of tree.tree.filter((x) => x.path.startsWith(`${dir}/Textures/`) && x.path.endsWith('.tga'))) {
    const base = path.basename(t.path, '.tga');
    const opacity = /_opacity_color/.test(base);
    if (!/_color/.test(base) && !/_(body|head)_normal$/.test(base)) continue;
    FILES.push([`${name}/${base}.${opacity ? 'png' : 'jpg'}`, `${RB}/${t.path}`, opacity ? 'png' : 'jpeg']);
  }
}

let fetched = 0;
const missing = [];
for (const [dest, url, convert] of FILES) {
  const file = path.join(out, dest);
  if (fs.existsSync(file) && fs.statSync(file).size > 100) continue;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    missing.push(`${res.status} ${url}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (convert) {
    const tmp = `${file}.src.tga`;
    fs.writeFileSync(tmp, buf);
    execFileSync('sips', ['-s', 'format', convert, '-Z', '1024', tmp, '--out', file], { stdio: 'ignore' });
    fs.rmSync(tmp);
  } else fs.writeFileSync(file, buf);
  fetched++;
  console.log(`${(buf.length / 1048576).toFixed(1).padStart(6)} MB  ${dest}`);
}
console.log(`${fetched} fetched, ${FILES.length - fetched - missing.length} already here${missing.length ? `; MISSING:\n  ${missing.join('\n  ')}` : ''}`);
if (missing.length) process.exit(1);
