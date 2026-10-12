#!/usr/bin/env node
/**
 * P112 OWN-015 — a cloud function that keeps the key, as a stranger's agent builds it: the MCP from a tarball (or the
 * registry), in an empty folder, `HOME` empty, spoken to over stdio.
 *
 *   node scripts/own/stranger-backend.mjs <mcp .tgz | registry spec>
 *
 * In order, through the tools an agent has:
 *   create_project "Lingo" → provision_backend → set_function_secret GOOGLE_TTS_KEY → create_component
 *   `#__cloud__/speak` (Request → Secret → Function that calls text:synthesize → Response) → deploy_cloud_functions →
 *   POST /functions/speak {text, voice}.
 *
 * Google is stood in for by a local server that answers `text:synthesize` with audio ONLY when the right key arrives
 * in `x-goog-api-key`, so the run proves the key travelled backend → API and back without a real key. The function's
 * endpoint constant is the one thing that differs from the shipped fixture (the real URL is in FIXTURE_ENDPOINT).
 *
 * Then OWN-015 AC2: the key's value is searched for in every file under the project folder and in every tool result
 * the agent was shown. Zero hits is the claim. The control arm puts the same key in an HTTP Request node in a page
 * and searches again, which must find it; otherwise the search could not see a key and the zero proves nothing.
 *
 * Prints one JSON line per step; exit 1 on any failed step.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mcpRequire = createRequire(path.join(here, '..', '..', 'packages', 'noodl-mcp', 'package.json'));
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));

export const FIXTURE_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const spec = process.argv[2];
if (!spec) {
  console.error('usage: stranger-backend.mjs <mcp .tgz | registry spec>');
  process.exit(2);
}
const mcp = fs.existsSync(spec) ? path.resolve(spec) : spec;
const KEY = 'own015-' + crypto.randomBytes(12).toString('hex');

const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }));
let failed = false;
const check = (step, ok, data = {}) => {
  say(step, { ok, ...data });
  if (!ok) failed = true;
  return ok;
};

// --- the stand-in for Google ---------------------------------------------------------------------------------------
const seen = [];
const stub = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const gotKey = req.headers['x-goog-api-key'];
    seen.push({ url: req.url, keyMatched: gotKey === KEY });
    let input = {};
    try {
      input = JSON.parse(body);
    } catch {
      /* answered below */
    }
    res.setHeader('content-type', 'application/json');
    if (req.method !== 'POST' || !req.url.startsWith('/v1/text:synthesize')) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: { message: 'not found' } }));
    }
    if (gotKey !== KEY) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: { message: 'API key not valid. Please pass a valid API key.' } }));
    }
    const text = input?.input?.text ?? '';
    res.end(JSON.stringify({ audioContent: Buffer.from(`ID3-stand-in-mp3:${text}`).toString('base64') }));
  });
});
await new Promise((r) => stub.listen(0, '127.0.0.1', r));
const STUB = `http://127.0.0.1:${stub.address().port}/v1/text:synthesize`;

// --- the stranger's folder -----------------------------------------------------------------------------------------
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'stranger-backend-'));
const home = path.join(work, 'home');
const apps = path.join(work, 'my-apps');
fs.mkdirSync(home);
fs.mkdirSync(apps);
const env = { ...process.env, HOME: home, npm_config_cache: path.join(home, '.npm') };
for (const k of ['NODEGX_RENDER_CLI', 'NODEGX_DRIVE_CLI', 'NODEGX_BACKEND_ENTRY', 'NODEGX_BACKENDS_DIR', 'NODEGX_DEPLOY_CLI', 'NODE_PATH']) {
  delete env[k];
}
say('folder', { work, mcp });

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '--package', mcp, 'noodl-mcp', '--allow-writes'],
  cwd: apps,
  env,
  stderr: 'pipe'
});
let serverLog = '';
transport.stderr?.on('data', (d) => (serverLog += d));
const client = new Client({ name: 'stranger-backend', version: '1.0.0' });
await client.connect(transport);

/** Every tool result the agent was shown, for AC2's search. */
const shown = [];
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const text = (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  shown.push(text);
  let json = null;
  try {
    json = JSON.parse(text.slice(text.indexOf('{')));
  } catch {
    /* not JSON */
  }
  return { isError: !!r.isError, text, json };
};

try {
  const projectDir = path.join(apps, 'lingo');
  const made = await call('create_project', {
    directory: projectDir,
    name: 'Lingo',
    request: 'A Duolingo-style app: short lessons, each word spoken aloud by Google text-to-speech.',
    pages: [{ name: 'Home', purpose: 'Pick a lesson.' }],
    backend: { kind: 'nodegx', description: 'A cloud function that turns a sentence into speech' },
    agreed: true
  });
  if (!check('create_project', !made.isError, { head: made.text.slice(0, 160) })) throw new Error('stop');

  await call('find_tools', { query: 'provision backend secret deploy cloud functions' });
  const tools = (await client.listTools()).tools.map((t) => t.name);
  check('tools', ['provision_backend', 'set_function_secret', 'deploy_cloud_functions'].every((t) => tools.includes(t)), {
    have: tools.filter((t) => /backend|secret|deploy/.test(t))
  });

  const prov = await call('provision_backend', { name: 'Lingo backend' });
  if (!check('provision_backend', !prov.isError, { head: prov.text.slice(0, 300) })) throw new Error('stop');
  const backendId = prov.json?.backendId ?? prov.json?.backend?.id ?? prov.json?.id;
  const endpoint = prov.json?.endpoint ?? prov.json?.backend?.endpoint;

  const created = await call('create_component', speakComponent(STUB));
  if (!check('create_component', !created.isError, { head: created.text.slice(0, 300) })) throw new Error('stop');

  const deployed = await call('deploy_cloud_functions', { backendId });
  if (!check('deploy_cloud_functions', !deployed.isError && deployed.json?.ok !== false, { head: deployed.text.slice(0, 400) })) {
    throw new Error('stop');
  }

  const base = deployed.json?.endpoint ?? endpoint;

  // AC3: before the secret is set, the function's error names the secret, not a 401 from somebody else.
  const early = await fetch(`${base}/functions/speak`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Bonjour', voice: 'fr-FR-Neural2-A' })
  });
  const earlyBody = await early.text();
  shown.push(earlyBody);
  check('AC3 no secret yet: the error names it', early.status !== 200 && earlyBody.includes('GOOGLE_TTS_KEY') && seen.length === 0, {
    status: early.status,
    body: earlyBody.slice(0, 300),
    apiCalls: seen.length
  });

  const secret = await call('set_function_secret', { backendId, name: 'GOOGLE_TTS_KEY', value: KEY });
  check('set_function_secret', !secret.isError && !secret.text.includes(KEY), { head: secret.text.slice(0, 200) });

  const listed = await call('list_function_secrets', { backendId });
  check('list_function_secrets', !listed.isError && listed.text.includes('GOOGLE_TTS_KEY') && !listed.text.includes(KEY), {
    head: listed.text.slice(0, 200)
  });

  const answer = await fetch(`${base}/functions/speak`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Bonjour, je m’appelle Lingo.', voice: 'fr-FR-Neural2-A' })
  });
  const answerBody = await answer.text();
  shown.push(answerBody);
  let audio = null;
  try {
    audio = JSON.parse(answerBody)?.result?.audioContent ?? null;
  } catch {
    /* checked below */
  }
  const decoded = audio ? Buffer.from(audio, 'base64').toString('utf8') : '';
  check('call /functions/speak', answer.status === 200 && decoded === 'ID3-stand-in-mp3:Bonjour, je m’appelle Lingo.', {
    status: answer.status,
    decoded: decoded.slice(0, 80),
    body: audio ? undefined : answerBody.slice(0, 300),
    apiSawKey: seen.map((s) => s.keyMatched)
  });

  // --- AC2: the key is nowhere the browser or the agent reaches ---------------------------------------------------
  const hits = searchTree(projectDir, KEY);
  const inShown = shown.filter((t) => t.includes(KEY)).length;
  const store = findFiles(path.join(home, '.noodl', 'backends'), 'secrets.json');
  const inStore = store.filter((f) => fs.readFileSync(f, 'utf8').includes(KEY)).length;
  check('AC2 the key is not in the project or any result shown', hits.length === 0 && inShown === 0, {
    projectFiles: countFiles(projectDir),
    hits,
    inShown
  });
  check('AC2 the key IS in the backend store (where it belongs)', inStore === 1, { store });

  // The control: the same key, put where a page would hold it, must be found by the same search.
  const ctrl = await call('create_component', controlPage(KEY));
  const ctrlHits = searchTree(projectDir, KEY);
  check('AC2 control: the key in a page is found', !ctrl.isError && ctrlHits.length > 0, {
    hits: ctrlHits,
    head: ctrl.isError ? ctrl.text.slice(0, 300) : undefined
  });

  await call('stop_backend', { backendId }).catch(() => {});
} catch (e) {
  if (e.message !== 'stop') say('threw', { message: String(e?.stack || e).slice(0, 600) });
  failed = true;
} finally {
  await client.close().catch(() => {});
  stub.close();
}
if (failed) say('server-stderr', { tail: serverLog.slice(-2500) });
process.exit(failed ? 1 : 0);

// --- the fixture -------------------------------------------------------------------------------------------------
function speakComponent(endpoint) {
  const script =
    "if (!Inputs.key) return;\n" +
    `var ENDPOINT = ${JSON.stringify(endpoint)};\n` +
    "var voice = String(Inputs.voice || 'fr-FR-Neural2-A');\n" +
    'fetch(ENDPOINT, {\n' +
    "  method: 'POST',\n" +
    "  headers: { 'content-type': 'application/json', 'x-goog-api-key': Inputs.key },\n" +
    '  body: JSON.stringify({\n' +
    "    input: { text: String(Inputs.text || '') },\n" +
    '    voice: { languageCode: voice.split(\'-\').slice(0, 2).join(\'-\'), name: voice },\n' +
    "    audioConfig: { audioEncoding: 'MP3' }\n" +
    '  })\n' +
    '})\n' +
    '  .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })\n' +
    '  .then(function (x) {\n' +
    '    if (x.ok && x.j.audioContent) { Outputs.audio = x.j.audioContent; Outputs.ok(); }\n' +
    "    else { Outputs.reason = (x.j.error && x.j.error.message) || 'Text-to-speech refused the request'; Outputs.failed(); }\n" +
    '  })\n' +
    "  .catch(function () { Outputs.reason = 'Text-to-speech could not be reached'; Outputs.failed(); });";
  return {
    path: '#__cloud__/speak',
    type: 'cloud',
    description: 'Turns a sentence into speech with Google text-to-speech. The key never leaves the backend.',
    nodes: [
      { id: 'spk_req', type: 'noodl.cloud.request', label: 'Say this', parameters: { params: 'text,voice', allowNoAuth: true } },
      { id: 'spk_key', type: 'noodl.cloud.secret', label: 'GOOGLE_TTS_KEY', parameters: { name: 'GOOGLE_TTS_KEY' } },
      {
        id: 'spk_tts',
        type: 'JavaScriptFunction',
        label: 'Ask Google for the audio',
        ports: [
          { name: 'in-text', displayName: 'text', plug: 'input', type: '*', group: 'Inputs' },
          { name: 'in-voice', displayName: 'voice', plug: 'input', type: '*', group: 'Inputs' },
          { name: 'in-key', displayName: 'key', plug: 'input', type: '*', group: 'Inputs' },
          { name: 'out-audio', displayName: 'audio', plug: 'output', type: '*', group: 'Outputs' },
          { name: 'out-reason', displayName: 'reason', plug: 'output', type: '*', group: 'Outputs' },
          { name: 'out-ok', displayName: 'ok', plug: 'output', type: 'signal', group: 'Outputs' },
          { name: 'out-failed', displayName: 'failed', plug: 'output', type: 'signal', group: 'Outputs' }
        ],
        parameters: { functionScript: script }
      },
      { id: 'spk_ok', type: 'noodl.cloud.response', label: 'The audio', parameters: { params: 'audioContent' } },
      { id: 'spk_no', type: 'noodl.cloud.response', label: 'Why not', parameters: { status: 'failure' } }
    ],
    connections: [
      { fromId: 'spk_req', fromProperty: 'receive', toId: 'spk_key', toProperty: 'fetch' },
      { fromId: 'spk_req', fromProperty: 'pm-text', toId: 'spk_tts', toProperty: 'in-text' },
      { fromId: 'spk_req', fromProperty: 'pm-voice', toId: 'spk_tts', toProperty: 'in-voice' },
      { fromId: 'spk_key', fromProperty: 'value', toId: 'spk_tts', toProperty: 'in-key' },
      { fromId: 'spk_key', fromProperty: 'done', toId: 'spk_tts', toProperty: 'run' },
      { fromId: 'spk_tts', fromProperty: 'out-audio', toId: 'spk_ok', toProperty: 'pm-audioContent' },
      { fromId: 'spk_tts', fromProperty: 'out-ok', toId: 'spk_ok', toProperty: 'send' },
      { fromId: 'spk_tts', fromProperty: 'out-reason', toId: 'spk_no', toProperty: 'errorMessage' },
      { fromId: 'spk_tts', fromProperty: 'out-failed', toId: 'spk_no', toProperty: 'send' },
      { fromId: 'spk_key', fromProperty: 'error', toId: 'spk_no', toProperty: 'errorMessage' },
      { fromId: 'spk_key', fromProperty: 'failure', toId: 'spk_no', toProperty: 'send' }
    ]
  };
}

/** The control: the key where a page would hold it, in an HTTP Request node's header. */
function controlPage(key) {
  return {
    path: 'Control/KeyInThePage',
    nodes: [
      {
        id: 'ctl_http',
        type: 'net.noodl.HTTP',
        label: 'Key in the page (control)',
        parameters: { url: FIXTURE_ENDPOINT, method: 'POST', 'auth-type': 'apiKey', 'auth-apiKey': key }
      }
    ]
  };
}

function searchTree(dir, needle) {
  const hits = [];
  for (const f of walk(dir)) if (fs.readFileSync(f).includes(needle)) hits.push(path.relative(dir, f));
  return hits;
}
function countFiles(dir) {
  return [...walk(dir)].length;
}
function findFiles(dir, name) {
  return fs.existsSync(dir) ? [...walk(dir)].filter((f) => path.basename(f) === name) : [];
}
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}
