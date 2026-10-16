import { spawn } from 'node:child_process';
import net from 'node:net';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const [,, project] = process.argv;
const editor = '/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-123-open-bubble/editor';
const { browser } = await import(join(editor, 'cdp.mjs'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const lineFrom = (proc, pattern, ms = 30000) => new Promise((ok, no) => { let out = ''; const t = setTimeout(() => no(new Error('timeout')), ms); const on = (d) => { out += d; const m = out.match(pattern); if (m) { clearTimeout(t); ok(m); } }; proc.stdout.on('data', on); proc.stderr.on('data', on); });
let b; const port = await freePort();
const server = spawn(process.execPath, [join(editor, 'serve.mjs'), resolve(project), '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
try {
  await lineFrom(server, /open-bubble: http/);
  b = await browser({ port: await freePort(), width: 1600, height: 1000 });
  await b.goto(`http://127.0.0.1:${port}/`); await b.waitTitle((t) => t.startsWith('ready'), 90000); await wait(2500);
  const pageKey = await b.evaluate('document.getElementById("pagepick").value');
  const nodes = JSON.parse(readFileSync(join(resolve(project), 'components', pageKey, 'nodes.json'), 'utf8')).nodes;
  const ids = nodes.filter((n) => !['Expression', 'Condition', 'Variable2', 'Set Variable', 'DbCollection2', 'RouterNavigate'].includes(n.type)).map((n) => n.id);
  const rows = JSON.parse(await b.evaluate(`(() => { const ids = ${JSON.stringify(ids)}; const out = []; for (const id of ids) { const el = __ob.preview.elementsOf(id)[0]; if (!el) continue; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (r.height > 900) out.push({ id, h: Math.round(r.height), top: Math.round(r.top), pos: cs.position, disp: cs.display, minH: cs.minHeight, hgt: cs.height, fd: cs.flexDirection, kids: el.children.length }); } return JSON.stringify(out.sort((a, b) => b.h - a.h).slice(0, 40)); })()`));
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const r of rows) { const n = byId[r.id]; const parent = byId[n.parent]; console.log(`${String(r.h).padStart(6)} top ${String(r.top).padStart(6)} ${r.pos.padEnd(8)} ${r.disp.padEnd(5)} minH ${r.minH.padEnd(7)} h ${r.hgt.padEnd(7)} ${n.type.padEnd(28)} ${n.label.slice(0, 30).padEnd(31)} parent: ${(parent?.label || '').slice(0, 24)} | params: ${JSON.stringify(n.parameters).slice(0, 120)}`); }
  console.log('frame doc height:', await b.evaluate('__ob.preview.frame.contentDocument.documentElement.scrollHeight'));
} catch (e) { console.error('PROBE FAILED', e.message); } finally { try { await b?.close(); } catch {} server.kill(); }
