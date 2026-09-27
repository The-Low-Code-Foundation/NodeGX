/**
 * The model file's sha256 (CG-004 AC6): checked at build (fetch-model.mjs) and at first launch (here). A 532 MB hash is
 * 1–2 s on the Mac and maybe ten on the tablet, so the verdict is remembered in `<dataDir>/model-check.json` keyed on
 * the file's size and mtime; a file that changed is hashed again. A mismatch REFUSES the model: the owl never loads it,
 * and status says `refused` with the reason for the Grown-ups page. Plain Node.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}

/**
 * @param {{ file: string, expected: string, dataDir: string, log?: (l: string) => void }} o
 * @returns {Promise<{ ok: boolean, reason?: string, sha256?: string, cached?: boolean, ms: number }>}
 */
async function checkModel({ file, expected, dataDir, log = () => {} }) {
  const t0 = Date.now();
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    return { ok: false, reason: 'no-model', ms: Date.now() - t0 };
  }
  const marker = path.join(dataDir, 'model-check.json');
  try {
    const m = JSON.parse(fs.readFileSync(marker, 'utf8'));
    if (m.file === file && m.size === st.size && m.mtimeMs === st.mtimeMs && m.expected === expected && typeof m.sha256 === 'string') {
      return { ok: m.sha256 === expected, reason: m.sha256 === expected ? undefined : 'sha256-mismatch', sha256: m.sha256, cached: true, ms: Date.now() - t0 };
    }
  } catch {
    // no marker yet, or a stale one: hash the file
  }
  const sha256 = await sha256File(file);
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(marker, JSON.stringify({ file, size: st.size, mtimeMs: st.mtimeMs, expected, sha256, at: new Date().toISOString() }, null, 2));
  } catch {
    // the verdict is still returned
  }
  const ok = sha256 === expected;
  log(`model: sha256 ${sha256.slice(0, 12)}… ${ok ? 'matches' : 'DOES NOT MATCH ' + expected.slice(0, 12) + '…'} (${Date.now() - t0} ms)`);
  return { ok, reason: ok ? undefined : 'sha256-mismatch', sha256, cached: false, ms: Date.now() - t0 };
}

module.exports = { checkModel, sha256File };
