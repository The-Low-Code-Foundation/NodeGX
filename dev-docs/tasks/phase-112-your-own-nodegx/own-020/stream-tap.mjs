// OWN-020: a tap between Cline and ClinePass (round-cline.mjs --base-url http://127.0.0.1:<port>).
// Why: four CDS1 sittings (2026-10-19) ended on "Stream error occurred" (AI_InvalidResponseDataError) or "The
// operation timed out." (5 m 43 s of silence), each just as the model began a large tool call; Cline marks both
// non-retryable and ends the run, and its log keeps no byte of what the gateway sent.
//   node stream-tap.mjs <port> <out-dir> [--mode record|retry] [--idle-s 90] [--tries 4]
// record: streams straight through and saves every response (resp-NNN.sse) — the diagnosis.
// retry:  holds each chat response until it is complete and well-formed (every data line JSON, no error object, each
//         tool call opening with an id and a function.name — what the AI SDK's openai-compatible parser demands — and
//         a [DONE]); a malformed or silent (--idle-s) attempt is saved as bad-NNN-<try>.sse and asked again, up to
//         --tries. Cline gets SSE comment pings meanwhile, so its own idle clock never runs out. The fix, for the lab.
// The Authorization header passes through and is never written; a request body is saved whole only when its answer was bad.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const [port, out, ...rest] = process.argv.slice(2);
if (!port || !out) throw new Error('usage: node stream-tap.mjs <port> <out-dir> [--mode record|retry]');
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const MODE = opt('--mode', 'retry');
// record mode leaves a silent stream to Cline's own clock (~5 min), so a run behaves as it would without the tap.
const IDLE_MS = Number(opt('--idle-s', MODE === 'record' ? 900 : 90)) * 1000;
const TRIES = Number(opt('--tries', 4));
const UPSTREAM = 'api.cline.bot';
fs.mkdirSync(out, { recursive: true });
const log = (line) => { fs.appendFileSync(path.join(out, 'tap.log'), `${new Date().toISOString()} ${line}\n`); };
let n = 0;

// One upstream request. onChunk sees raw bytes as they arrive; resolves with { status, headers, raw, why }.
function upstream(method, url, headers, body, onChunk) {
  return new Promise((resolve) => {
    const h = { ...headers, host: UPSTREAM, 'accept-encoding': 'identity' };
    delete h['content-length'];
    if (body.length) h['content-length'] = Buffer.byteLength(body);
    const chunks = [];
    let idle;
    const req = https.request({ host: UPSTREAM, method, path: url, headers: h }, (res) => {
      const arm = () => { clearTimeout(idle); idle = setTimeout(() => { req.destroy(new Error('idle')); }, IDLE_MS); };
      arm();
      res.on('data', (d) => { arm(); chunks.push(d); onChunk?.(d, res); });
      res.on('end', () => { clearTimeout(idle); resolve({ status: res.statusCode, headers: res.headers, raw: Buffer.concat(chunks).toString('utf8'), why: null }); });
      res.on('error', (e) => { clearTimeout(idle); resolve({ status: res.statusCode, headers: res.headers, raw: Buffer.concat(chunks).toString('utf8'), why: e.message }); });
    });
    req.on('error', (e) => { clearTimeout(idle); resolve({ status: 0, headers: {}, raw: Buffer.concat(chunks).toString('utf8'), why: e.message === 'idle' ? `silent ${IDLE_MS / 1000}s` : e.message }); });
    req.end(body);
  });
}

// What makes the AI SDK's openai-compatible stream parser throw, read off the raw SSE.
function verdict(r) {
  if (r.why) return r.why;
  if (r.status !== 200) return `HTTP ${r.status}`;
  const seen = new Set();
  let done = false;
  for (const line of r.raw.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') { done = true; continue; }
    let j;
    try { j = JSON.parse(data); } catch { return `unparsable data line: ${data.slice(0, 160)}`; }
    if (j.error) return `error object: ${JSON.stringify(j.error).slice(0, 300)}`;
    for (const c of j.choices ?? []) for (const tc of c.delta?.tool_calls ?? []) {
      if (seen.has(tc.index)) continue;
      seen.add(tc.index);
      if (typeof tc.id !== 'string') return `tool call ${tc.index} opens without an id: ${JSON.stringify(tc).slice(0, 200)}`;
      if (typeof tc.function?.name !== 'string') return `tool call ${tc.index} opens without function.name: ${JSON.stringify(tc).slice(0, 200)}`;
    }
  }
  return done ? null : 'no [DONE]';
}

function summary(body) {
  try {
    const j = JSON.parse(body);
    return `model=${j.model} messages=${j.messages?.length} tools=${j.tools?.length} chars=${body.length}`;
  } catch { return `chars=${body.length}`; }
}

http.createServer((req, res) => {
  const parts = [];
  req.on('data', (d) => parts.push(d));
  req.on('end', async () => {
    const body = Buffer.concat(parts).toString('utf8');
    const url = req.url.replace(/^(\/api\/v1)+/, '/api/v1');
    const id = String(n++).padStart(3, '0');
    const isChat = url.includes('chat/completions') && req.method === 'POST';
    log(`${id} ${req.method} ${url} ${isChat ? summary(body) : ''}`);
    const t0 = Date.now();

    if (!isChat || MODE === 'record') {
      let started = false;
      const r = await upstream(req.method, url, req.headers, body, (d, up) => {
        if (!started) { started = true; const h = { ...up.headers }; delete h['content-length']; res.writeHead(up.statusCode, h); }
        res.write(d);
      });
      if (!started) res.writeHead(r.status || 502, { 'content-type': 'application/json' });
      res.end(started ? undefined : JSON.stringify({ error: { message: `tap: ${r.why}` } }));
      if (isChat) {
        fs.writeFileSync(path.join(out, `resp-${id}.sse`), r.raw);
        const v = verdict(r);
        if (v) fs.writeFileSync(path.join(out, `req-${id}.json`), body); // the request that got a bad answer, to replay
        log(`${id} ${v ?? 'ok'} ${Math.round((Date.now() - t0) / 1000)}s ${r.raw.length}b`);
      }
      return;
    }

    // retry mode, a chat request: headers now, pings while an attempt runs, then one good response.
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    const ping = setInterval(() => res.write(': tap keep-alive\n\n'), 15000);
    let r, why;
    for (let t = 1; t <= TRIES; t++) {
      r = await upstream('POST', url, req.headers, body);
      why = verdict(r);
      log(`${id} try ${t}: ${why ?? 'ok'} ${Math.round((Date.now() - t0) / 1000)}s ${r.raw.length}b`);
      if (!why) break;
      fs.writeFileSync(path.join(out, `bad-${id}-${t}.sse`), `# ${why}\n# status ${r.status}\n${r.raw}`);
      if (r.status === 429) break; // a quota answer is the result, not a flake (R45)
    }
    clearInterval(ping);
    res.end(r.raw);
  });
}).listen(Number(port), '127.0.0.1', () => console.log(`tap on ${port} (${MODE})`));
