// P132 BWF-009: an SMTP catcher a backend can send to, and a page that shows what it caught, for Richard's sitting.
// The protocol is greenhouse-drive-bwf007.mjs's catcher (just enough of SMTP for nodemailer: no TLS, no login), made a
// process of its own: every message is appended to <dir>/mail.jsonl, so a restart keeps what was caught.
//   node smtp-catcher.mjs --dir <dir> [--smtp 1025] [--web 8025]
//   http://127.0.0.1:8025/            the caught mail, newest first (refreshes itself)
//   http://127.0.0.1:8025/mail.json   the same as JSON
// Both listen on 127.0.0.1 only. Stop it: kill the pid in <dir>/catcher.pid.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer as tcp } from 'node:net';
import { createServer as http } from 'node:http';
import { join } from 'node:path';

const flag = (name, fallback) => { const at = process.argv.indexOf(name); return at === -1 ? fallback : process.argv[at + 1]; };
const dir = flag('--dir');
if (!dir) throw new Error('usage: smtp-catcher.mjs --dir <dir> [--smtp 1025] [--web 8025]');
const SMTP = Number(flag('--smtp', 1025)), WEB = Number(flag('--web', 8025));
mkdirSync(dir, { recursive: true });
const store = join(dir, 'mail.jsonl');

const read = () => { try { return readFileSync(store, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const header = (data, name) => new RegExp(`^${name}: (.*(?:\\r\\n[ \\t].*)*)`, 'mi').exec(data)?.[1]?.replace(/\r\n[ \t]/g, ' ') ?? '';
const decodeWords = (s) => s.replace(/=\?utf-8\?([bq])\?([^?]*)\?=/gi, (_, enc, t) => enc.toLowerCase() === 'b' ? Buffer.from(t, 'base64').toString('utf8') : Buffer.from(t.replace(/_/g, ' ').replace(/=([0-9a-f]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8'));
// the text of a message: the first text/plain part (or the body), quoted-printable or base64 undone
function textOf(data) {
  const [head, ...rest] = data.split('\r\n\r\n');
  let body = rest.join('\r\n\r\n'), enc = header(head, 'Content-Transfer-Encoding');
  const boundary = /boundary="?([^";\r\n]+)"?/i.exec(header(head, 'Content-Type'))?.[1];
  if (boundary) {
    const part = body.split('--' + boundary).find((p) => /content-type: text\/plain/i.test(p)) ?? '';
    const [ph, ...pb] = part.replace(/^\r\n/, '').split('\r\n\r\n');
    body = pb.join('\r\n\r\n'); enc = header(ph, 'Content-Transfer-Encoding');
  }
  if (/quoted-printable/i.test(enc)) body = Buffer.from(body.replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
  else if (/base64/i.test(enc)) body = Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
  return body.trim();
}

const smtp = tcp((sock) => {
  let buf = '', data = false, msg = null;
  const out = (l) => sock.write(l + '\r\n');
  out('220 catcher ESMTP');
  sock.on('data', (d) => {
    buf += d.toString('utf8');
    for (;;) {
      if (data) {
        const end = buf.indexOf('\r\n.\r\n');
        if (end < 0) return;
        const raw = buf.slice(0, end).replace(/^\.\./gm, '.'); buf = buf.slice(end + 5); data = false;
        const kept = { at: new Date().toISOString(), from: msg.from, to: msg.to, subject: decodeWords(header(raw, 'Subject')), text: textOf(raw), raw };
        appendFileSync(store, JSON.stringify(kept) + '\n');
        msg = null; out('250 kept'); continue;
      }
      const nl = buf.indexOf('\r\n');
      if (nl < 0) return;
      const line = buf.slice(0, nl); buf = buf.slice(nl + 2);
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === 'EHLO' || cmd === 'HELO') out('250 catcher');
      else if (cmd === 'MAIL') { msg = { from: line.slice(10).replace(/[<>]/g, '').trim(), to: [] }; out('250 ok'); }
      else if (cmd === 'RCPT') { msg?.to.push(line.slice(8).replace(/[<>]/g, '').trim()); out('250 ok'); }
      else if (cmd === 'DATA') { data = true; out('354 go on'); }
      else if (cmd === 'QUIT') { out('221 bye'); sock.end(); }
      else out('250 ok');
    }
  });
  sock.on('error', () => {});
});

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const page = (mail) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="5"><title>Caught mail</title>
<style>:root{color-scheme:light dark;--bg:#fff;--fg:#1d1d1f;--muted:#6e6e73;--line:#d2d2d7}
@media (prefers-color-scheme:dark){:root{--bg:#1c1c1e;--fg:#f5f5f7;--muted:#a1a1a6;--line:#3a3a3c}}
body{background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,system-ui,sans-serif;max-width:760px;margin:0 auto;padding:16px}
h1{font-size:20px}article{border-top:1px solid var(--line);padding:12px 0}.meta{color:var(--muted);font-size:13px}
pre{white-space:pre-wrap;font:14px/1.45 ui-monospace,Menlo,monospace;margin:8px 0 0}</style>
<h1>Caught mail <span class="meta">(${mail.length}; SMTP 127.0.0.1:${SMTP}; nothing here leaves this Mac)</span></h1>
${mail.length ? mail.slice().reverse().map((m) => `<article><strong>${esc(m.subject || '(no subject)')}</strong>
<div class="meta">${esc(new Date(m.at).toLocaleString())} · from ${esc(m.from)} · to ${esc(m.to.join(', '))}</div><pre>${esc(m.text)}</pre></article>`).join('') : '<p class="meta">Nothing yet. A backend whose Email settings point at 127.0.0.1:' + SMTP + ' sends here.</p>'}`;

const web = http((req, res) => {
  const mail = read();
  if (req.url.startsWith('/mail.json')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(mail.map(({ raw, ...m }) => m), null, 2)); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page(mail));
});

await new Promise((ok, no) => { smtp.once('error', no); smtp.listen(SMTP, '127.0.0.1', ok); });
await new Promise((ok, no) => { web.once('error', no); web.listen(WEB, '127.0.0.1', ok); });
writeFileSync(join(dir, 'catcher.pid'), String(process.pid));
console.log(`smtp catcher: smtp 127.0.0.1:${SMTP}, mail at http://127.0.0.1:${WEB}/ (pid ${process.pid}, ${store})`);
