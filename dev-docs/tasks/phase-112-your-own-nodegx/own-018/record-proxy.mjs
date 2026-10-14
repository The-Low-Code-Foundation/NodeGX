// OWN-018 s2: why does Mistral's prompt cache miss under OpenCode? A pass-through proxy between OpenCode and
// api.mistral.ai that saves every request BODY (never a header: the key travels in Authorization) as req-<n>.json, then
// forwards it unchanged and streams the answer back. compare: the first character where each request stops being a
// prefix-extension of the one before (a cache can only reuse the shared prefix).
//   node record-proxy.mjs <out-dir> [--port 8799]          the harness's config: provider.mistral.options.baseURL =
//                                                           http://127.0.0.1:8799/v1
//   node record-proxy.mjs --compare <out-dir>
//
// OWN-019 s3: every call is also logged to calls.jsonl — when it was sent, when the headers came back, when the first
// chunk and the last arrived, the status, Mistral's own `usage` from the stream's last chunk (prompt, cached and
// completion tokens), the finish reason, and the x-ratelimit-* headers. Never a request header (the key is one).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const argv = process.argv.slice(2);
if (argv[0] === '--compare') {
  const dir = argv[1];
  const files = fs.readdirSync(dir).filter((f) => /^req-\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)));
  // Serialise in the order the API reads: tools, then messages (a provider caches the prompt as it renders it).
  const flat = (b) => JSON.stringify({ model: b.model, tools: b.tools, messages: b.messages });
  let prev = null;
  for (const f of files) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const s = flat(b);
    if (prev !== null) {
      let i = 0;
      while (i < prev.length && i < s.length && prev[i] === s[i]) i++;
      const extends_ = i === prev.length;
      console.log(`${f}: ${s.length} chars, ${b.messages?.length} messages, ${b.tools?.length ?? 0} tools; ${extends_ ? 'extends the previous request' : `DIVERGES at char ${i} of ${prev.length}`}`);
      if (!extends_) {
        console.log(`   was: …${JSON.stringify(prev.slice(Math.max(0, i - 120), i + 160))}`);
        console.log(`   now: …${JSON.stringify(s.slice(Math.max(0, i - 120), i + 160))}`);
      }
    } else console.log(`${f}: ${s.length} chars, ${b.messages?.length} messages, ${b.tools?.length ?? 0} tools; first`);
    prev = s;
  }
  process.exit(0);
}

const OUT = path.resolve(argv[0]);
const portAt = argv.indexOf('--port');
const PORT = portAt >= 0 ? Number(argv[portAt + 1]) : 8799;
fs.mkdirSync(OUT, { recursive: true });
let n = 0;
http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const i = ++n;
  if (body.length) fs.writeFileSync(path.join(OUT, `req-${i}.json`), body);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers['content-length'];
  const sent = Date.now();
  try {
    const upstream = await fetch(`https://api.mistral.ai${req.url.replace(/^\/v1/, '/v1')}`, { method: req.method, headers, body: body.length ? body : undefined, duplex: 'half' });
    const headersAt = Date.now();
    const out = {};
    const limits = {};
    upstream.headers.forEach((v, k) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) out[k] = v;
      if (k.startsWith('x-ratelimit') || k === 'retry-after') limits[k] = v;
    });
    res.writeHead(upstream.status, out);
    let firstAt = null;
    let bytes = 0;
    let tail = '';
    if (upstream.body) {
      for await (const c of upstream.body) {
        if (firstAt === null) firstAt = Date.now();
        bytes += c.length;
        tail = (tail + Buffer.from(c).toString('utf8')).slice(-8192);
        res.write(c);
      }
    }
    res.end();
    const endAt = Date.now();
    // The stream's last data lines carry `usage` and the finish reason.
    let usage = null;
    let finish = null;
    for (const line of tail.split('\n')) {
      const m = /^data: (\{.*\})\s*$/.exec(line);
      if (!m) continue;
      try {
        const d = JSON.parse(m[1]);
        if (d.usage) usage = d.usage;
        const f = d.choices?.[0]?.finish_reason;
        if (f) finish = f;
      } catch {}
    }
    let msgs = null;
    try {
      msgs = JSON.parse(body.toString('utf8')).messages?.length ?? null;
    } catch {}
    fs.appendFileSync(path.join(OUT, 'calls.jsonl'), JSON.stringify({ n: i, url: req.url, status: upstream.status, reqBytes: body.length, messages: msgs, sent, headersMs: headersAt - sent, firstChunkMs: firstAt === null ? null : firstAt - sent, totalMs: endAt - sent, resBytes: bytes, finish, usage, limits }) + '\n');
    fs.appendFileSync(path.join(OUT, 'log.txt'), `${i} ${req.method} ${req.url} → ${upstream.status} ${body.length}B\n`);
  } catch (e) {
    res.writeHead(502);
    res.end(String(e));
    fs.appendFileSync(path.join(OUT, 'log.txt'), `${i} ${req.method} ${req.url} → proxy error ${String(e).slice(0, 200)}\n`);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`recording on http://127.0.0.1:${PORT}/v1 → ${OUT}`));
