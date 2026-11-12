// Shrinks a VRM's embedded textures: colour maps to 1024px (JPEG when they have no alpha), normal maps to 512px, the
// thumbnail to 128px. Geometry, bones, springs and materials are copied byte for byte. Uses macOS `sips`.
//   node tools/slim-vrm.mjs <in.vrm> <out.vrm>
// A game would get the same from VRoid Studio's export settings; this does it to a model we did not make.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [input, output] = process.argv.slice(2);
const glb = fs.readFileSync(input);
if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLen));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'slim-vrm-'));
const replaced = new Map(); // bufferView index → new bytes
const thumb = json.extensions?.VRMC_vrm?.meta?.thumbnailImage;
json.images.forEach((img, i) => {
  if (img.bufferView === undefined) return;
  const view = json.bufferViews[img.bufferView];
  const src = path.join(tmp, `${i}.${img.mimeType === 'image/jpeg' ? 'jpg' : 'png'}`);
  fs.writeFileSync(src, bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
  const normal = /_nml|normal/i.test(img.name ?? '');
  const size = i === thumb ? 128 : normal ? 512 : 1024;
  const alpha = /hasAlpha: yes/.test(execFileSync('sips', ['-g', 'hasAlpha', src], { encoding: 'utf8' }));
  const toJpeg = !alpha && !normal;
  const dst = path.join(tmp, `${i}-out.${toJpeg ? 'jpg' : 'png'}`);
  execFileSync('sips', ['-Z', String(size), '-s', 'format', toJpeg ? 'jpeg' : 'png', ...(toJpeg ? ['-s', 'formatOptions', '85'] : []), src, '--out', dst], { stdio: 'ignore' });
  const bytes = fs.readFileSync(dst);
  if (bytes.length < view.byteLength) {
    replaced.set(img.bufferView, bytes);
    img.mimeType = toJpeg ? 'image/jpeg' : 'image/png';
  }
});
fs.rmSync(tmp, { recursive: true, force: true });

// Rebuild the binary chunk: every buffer view in order, 4-byte aligned, the images swapped.
const parts = [];
let offset = 0;
json.bufferViews.forEach((view, i) => {
  const bytes = replaced.get(i) ?? bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  const pad = (4 - (offset % 4)) % 4;
  if (pad) parts.push(Buffer.alloc(pad)), (offset += pad);
  view.byteOffset = offset;
  view.byteLength = bytes.length;
  parts.push(bytes);
  offset += bytes.length;
});
const tail = (4 - (offset % 4)) % 4;
if (tail) parts.push(Buffer.alloc(tail)), (offset += tail);
json.buffers[0].byteLength = offset;

let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + offset, 8);
const chunk = (len, type) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(len, 0);
  b.writeUInt32LE(type, 4);
  return b;
};
fs.writeFileSync(output, Buffer.concat([header, chunk(jsonBuf.length, 0x4e4f534a), jsonBuf, chunk(offset, 0x004e4942), ...parts]));
console.log(`${path.basename(output)}: ${(glb.length / 1048576).toFixed(1)} MB → ${(fs.statSync(output).size / 1048576).toFixed(1)} MB (${replaced.size} images shrunk)`);
