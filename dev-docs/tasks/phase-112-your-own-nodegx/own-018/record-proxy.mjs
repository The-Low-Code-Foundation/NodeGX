// OWN-018 s2: why does Mistral's prompt cache miss under OpenCode? A pass-through proxy between OpenCode and
// api.mistral.ai that saves every request BODY (never a header: the key travels in Authorization) as req-<n>.json, then
// forwards it unchanged and streams the answer back. compare: the first character where each request stops being a
// prefix-extension of the one before (a cache can only reuse the shared prefix).
//   node record-proxy.mjs <out-dir> [--port 8799]          the harness's config: provider.mistral.options.baseURL =
//                                                           http://127.0.0.1:8799/v1
//   node record-proxy.mjs --compare <out-dir>
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
  try {
    const upstream = await fetch(`https://api.mistral.ai${req.url.replace(/^\/v1/, '/v1')}`, { method: req.method, headers, body: body.length ? body : undefined, duplex: 'half' });
    const out = {};
    upstream.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) out[k] = v; });
    res.writeHead(upstream.status, out);
    if (upstream.body) for await (const c of upstream.body) res.write(c);
    res.end();
    fs.appendFileSync(path.join(OUT, 'log.txt'), `${i} ${req.method} ${req.url} → ${upstream.status} ${body.length}B\n`);
  } catch (e) {
    res.writeHead(502);
    res.end(String(e));
    fs.appendFileSync(path.join(OUT, 'log.txt'), `${i} ${req.method} ${req.url} → proxy error ${String(e).slice(0, 200)}\n`);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`recording on http://127.0.0.1:${PORT}/v1 → ${OUT}`));
