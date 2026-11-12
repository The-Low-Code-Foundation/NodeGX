// Fetches the two assets the game loads into public/assets/ (gitignored): the anime heroine (pixiv's VRM sample, the
// one the life sim tried and set aside) and Quaternius's animation library. Everything else (the château, the
// creatures, the cakes) is made in code. Copies them from the life sim next door when it has them, downloads otherwise,
// then shrinks the VRM's textures (slim-vrm.mjs, macOS `sips`). Safe to re-run: present files are skipped.
//   node tools/fetch-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/assets');
const lifesim = path.join(root, '../lifesim/public/assets');
const UAL = 'https://raw.githubusercontent.com/J-Ponzo/gltf-universal-animation-library/HEAD/glTF';
const VRM = 'https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models';

const FILES = [
  ['anim/AnimationLibrary_Godot_Standard.gltf', `${UAL}/AnimationLibrary_Godot_Standard.gltf`],
  ['anim/AnimationLibrary_Godot_Standard.bin', `${UAL}/AnimationLibrary_Godot_Standard.bin`],
  ['vrm/sample-slim.vrm', null],
  ['vrm/VRM1_Constraint_Twist_Sample.vrm', `${VRM}/VRM1_Constraint_Twist_Sample.vrm`]
];

for (const [rel, url] of FILES) {
  const dst = path.join(out, rel);
  if (fs.existsSync(dst)) continue;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const near = path.join(lifesim, rel);
  if (fs.existsSync(near)) {
    fs.copyFileSync(near, dst);
    console.log('copied from the life sim:', rel);
    continue;
  }
  if (!url) continue;
  console.log('downloading', rel);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  fs.writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
}
const slim = path.join(out, 'vrm/sample-slim.vrm');
if (!fs.existsSync(slim)) execFileSync(process.execPath, [path.join(root, 'tools/slim-vrm.mjs'), path.join(out, 'vrm/VRM1_Constraint_Twist_Sample.vrm'), slim], { stdio: 'inherit' });

fs.writeFileSync(path.join(out, 'CREDITS.md'), `# Asset credits (fetched by tools/fetch-assets.mjs — not committed)

| Asset | Source | Licence |
|---|---|---|
| The heroine (VRM1_Constraint_Twist_Sample, textures shrunk) | pixiv Inc., github.com/pixiv/three-vrm | VRM Public License 1.0 (redistribution + modification allowed) |
| Animations (Universal Animation Library, Standard) | Quaternius, via github.com/J-Ponzo/gltf-universal-animation-library | CC0 |

Everything else in the game is drawn in code.
`);
console.log('assets ready in', out);
