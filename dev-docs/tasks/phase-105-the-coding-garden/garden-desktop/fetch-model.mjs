#!/usr/bin/env node
/**
 * The owl's model file (P105 CG-004): `unsloth/Qwen3.5-0.8B-GGUF` `Qwen3.5-0.8B-Q4_K_M.gguf`, 532 MB, Apache 2.0.
 * NEVER committed; fetched at build by pinned URL and sha256 (garden.json `model`), cached in CI on the sha.
 *
 *   node fetch-model.mjs                     download from the pinned URL into shell/build-output/model/, verify the sha256
 *   node fetch-model.mjs --from <file>       hard-link (or copy) a local copy instead of downloading, verify the sha256
 *   node fetch-model.mjs --to <dir>          another destination folder
 *   node fetch-model.mjs --check             only verify what is there (exit 1 on a mismatch or a missing file)
 *
 * A mismatch removes the bad file and exits 1 naming both hashes (AC6, the build half; model-check.js is the launch half).
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(HERE, 'shell', 'garden.json'), 'utf8'));
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const TO = path.resolve(opt('--to') || path.join(HERE, 'shell', 'build-output', 'model'));
const FROM = opt('--from') ? path.resolve(opt('--from')) : null;
const CHECK = argv.includes('--check');
const target = path.join(TO, config.model.file);

function sha256(file) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    fs.createReadStream(file).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}

async function verify(file) {
  const t0 = Date.now();
  const st = fs.statSync(file);
  const got = await sha256(file);
  const ok = got === config.model.sha256 && st.size === config.model.bytes;
  console.log(`fetch-model: ${path.basename(file)} ${st.size} bytes sha256 ${got.slice(0, 16)}… ${ok ? 'MATCHES' : 'DOES NOT MATCH'} (${Date.now() - t0} ms)`);
  if (!ok) {
    console.error(`fetch-model: expected sha256 ${config.model.sha256} (${config.model.bytes} bytes), got ${got} (${st.size} bytes) — refusing the model`);
  }
  return ok;
}

async function download() {
  fs.mkdirSync(TO, { recursive: true });
  const tmp = target + '.part';
  console.log(`fetch-model: GET ${config.model.url}`);
  const res = await fetch(config.model.url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} from ${config.model.url}`);
  const out = fs.createWriteStream(tmp);
  let got = 0;
  let last = 0;
  for await (const chunk of res.body) {
    got += chunk.length;
    if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
    if (got - last > 50 * 1024 * 1024) {
      last = got;
      console.log(`fetch-model: ${(got / 1048576).toFixed(0)} MB`);
    }
  }
  await new Promise((r) => out.end(r));
  fs.renameSync(tmp, target);
}

async function main() {
  if (CHECK) {
    if (!fs.existsSync(target)) {
      console.error(`fetch-model: no model at ${target}`);
      process.exit(1);
    }
    process.exit((await verify(target)) ? 0 : 1);
  }
  if (fs.existsSync(target) && (await verify(target))) {
    console.log(`fetch-model: already there: ${target}`);
    return;
  }
  fs.rmSync(target, { force: true });
  if (FROM) {
    if (!fs.existsSync(FROM)) throw new Error(`no file at ${FROM}`);
    fs.mkdirSync(TO, { recursive: true });
    try {
      fs.linkSync(FROM, target);
      console.log(`fetch-model: hard-linked ${FROM}`);
    } catch {
      fs.copyFileSync(FROM, target);
      console.log(`fetch-model: copied ${FROM}`);
    }
  } else {
    await download();
  }
  if (!(await verify(target))) {
    fs.rmSync(target, { force: true });
    process.exit(1);
  }
  console.log(`fetch-model: ok — ${target}`);
}

main().catch((e) => {
  console.error(`fetch-model: ${e.message}`);
  process.exit(1);
});
