/**
 * P112-OWN021-NOSHARP: start a backend from a packaged app's resources and ask it for a thumbnail.
 *
 * `<resources>/nodegx-backend/cli.js` is started exactly as the editor's ServiceSupervisor starts it: the given
 * executable (the packaged app's own, in a packaged build) with ELECTRON_RUN_AS_NODE=1. It uploads a 640 × 480 PNG and
 * asks for `?thumb=md`. A pass is a 200 carrying a PNG 256 px wide; anything else throws with what came back (the 501's
 * `reason` names the missing module).
 *
 * Run against an artefact, never the repo: what it proves is that the tree electron-builder copied resolves `sharp`
 * on its own. NODE_PATH is dropped so nothing outside that tree can satisfy the require.
 *
 * Also runnable by hand: node thumb-smoke.js <resources dir> [executable]
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const READY = 'NODEGX_BACKEND_READY ';
const FIXTURE = { width: 640, height: 480 };
const EXPECTED_WIDTH = 256; // the `md` preset (src/storage/config.ts)

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A real RGB PNG with a gradient, so the resize has something to decode. */
function fixturePng({ width, height } = FIXTURE) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x++) {
      raw[row + 1 + x * 3] = (x * 255) / width;
      raw[row + 2 + x * 3] = (y * 255) / height;
      raw[row + 3 + x * 3] = 128;
    }
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/** Width and height from a PNG's IHDR, or null if it isn't one. */
function pngSize(buf) {
  if (buf.length < 24 || buf.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function startBackend({ cliPath, executable, dataDir, timeoutMs }) {
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
  delete env.NODE_PATH;
  const child = spawn(executable, [cliPath, 'serve', '--data-dir', dataDir, '--port', '0', '--host', '127.0.0.1'], {
    env,
    cwd: dataDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`no ${READY.trim()} line in ${timeoutMs} ms:\n${output}`)),
      timeoutMs
    );
    const onData = (data) => {
      output += data;
      const line = output.split('\n').find((l) => l.startsWith(READY));
      if (line) {
        clearTimeout(timer);
        resolve(JSON.parse(line.slice(READY.length)).url);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (data) => (output += data));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`the backend exited (${signal || code}) before it was ready:\n${output}`));
    });
  });
  return { child, ready, output: () => output };
}

/**
 * @param {{ resourcesDir: string, executable?: string, timeoutMs?: number }} opts
 * @returns {Promise<{ status: number, width: number, height: number, bytes: number }>} on a pass; throws otherwise
 */
async function thumbSmoke({ resourcesDir, executable = process.execPath, timeoutMs = 60000 }) {
  const cliPath = path.join(resourcesDir, 'nodegx-backend', 'cli.js');
  if (!fs.existsSync(cliPath)) throw new Error(`[thumb-smoke] no backend at ${cliPath}`);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-thumb-smoke-'));
  const backend = startBackend({ cliPath, executable, dataDir, timeoutMs });
  try {
    const base = await backend.ready;
    const upload = await fetch(`${base}/files/smoke.png`, {
      method: 'POST',
      headers: { 'content-type': 'image/png' },
      body: fixturePng()
    });
    if (upload.status !== 201) throw new Error(`upload answered ${upload.status}: ${await upload.text()}`);
    const { url } = await upload.json();

    const res = await fetch(`${url}?thumb=md`);
    const body = Buffer.from(await res.arrayBuffer());
    if (res.status !== 200) throw new Error(`?thumb=md answered ${res.status}: ${body.toString('utf8').slice(0, 600)}`);
    const size = pngSize(body);
    if (!size || size.width !== EXPECTED_WIDTH) {
      throw new Error(
        `?thumb=md answered 200 but not a ${EXPECTED_WIDTH} px PNG (${res.headers.get(
          'content-type'
        )}, ${JSON.stringify(size)})`
      );
    }
    return { status: res.status, ...size, bytes: body.length };
  } catch (error) {
    error.message = `[thumb-smoke] ${cliPath} via ${executable}: ${error.message}`;
    throw error;
  } finally {
    backend.child.kill();
    await new Promise((resolve) =>
      backend.child.exitCode !== null || backend.child.signalCode !== null
        ? resolve()
        : backend.child.once('exit', resolve)
    );
    // Best effort: on Windows the killed backend's database can hold its files a moment longer, and a temp folder
    // left behind must not fail a smoke that passed.
    try {
      fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* left in the temp folder */
    }
  }
}

module.exports = { thumbSmoke, fixturePng, pngSize };

if (require.main === module) {
  const [resourcesDir, executable] = process.argv.slice(2);
  if (!resourcesDir) {
    console.error('usage: node thumb-smoke.js <resources dir> [executable]');
    process.exit(2);
  }
  thumbSmoke({ resourcesDir: path.resolve(resourcesDir), executable: executable && path.resolve(executable) })
    .then((r) => console.log(`[thumb-smoke] ?thumb=md → ${r.status}, ${r.width} × ${r.height} PNG (${r.bytes} bytes)`))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
