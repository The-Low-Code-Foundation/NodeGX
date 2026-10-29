// OWN-032 — the workbench's local server (§3d). Serves the viewer and the runs, and starts the arm for surgery (§3c).
// Local only: it drives Ollama and Chrome, which a published page cannot reach.
//
//   node server.mjs [--port 8732]   then open http://127.0.0.1:8732/?t=runs/view-G-puppy-s0
//
//   GET  /api/runs   every arm run: its fork, its surgery, its end pictures, whether it is running
//   GET  /api/job    the one arm run this server started, while it runs and after
//   POST /api/fork   { from, turn, key, answer?, prompt?, hint?, edit?, note?, ignoreBusy? }
//                    re-run <from> from turn k's call <key>: turns 1..k-1 replay, the calls of turn k before <key>
//                    keep their answers, <key> is asked again with the edit, and every later turn is asked. The edit
//                    is saved beside the fork as surgery.json. One run at a time (§8), and none while another
//                    model is loaded in Ollama (16 GB: E2B + E4B + a peer's model do not fit) unless ignoreBusy.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNS = path.join(HERE, 'runs');
const argv = process.argv.slice(2);
const PORT = Number(argv[argv.indexOf('--port') + 1] || 8732);
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const BRIEFS = { 'Puppy Haven': 'puppy', 'Maison Levain': 'bakery', 'The Blue Room': 'jazz', 'Dupont Plumbing': 'plumber' };

const readLedger = (name) => { try { return JSON.parse(fs.readFileSync(path.join(RUNS, `arm-${name}`, 'ledger.json'), 'utf8')); } catch { return null; } };
let job = null;   // { name, pid, startedAt, args, exit?, endedAt? }

function runsList() {
  return fs.readdirSync(RUNS).filter((d) => d.startsWith('arm-') && fs.existsSync(path.join(RUNS, d, 'ledger.json'))).map((d) => {
    const L = readLedger(d.slice(4));
    const shot = [...L.turns].reverse().find((t) => t.shot)?.shot;
    return { name: L.run, dir: d, from: L.fork?.from ?? L.surgery?.from, upto: L.fork?.upto ?? L.surgery?.turn, surgery: L.surgery, edit: L.edit, rules: L.rules, startedAt: L.startedAt, endedAt: L.endedAt,
      turns: L.turns.length, nodes: L.turns.at(-1)?.nodes?.length ?? 0, findings: (L.turns.at(-1)?.findingsOut || []).length,
      end: shot && { desktop: `runs/${d}/${shot.desktop}`, phone: `runs/${d}/${shot.phone}` }, running: job?.name === L.run && job.exit === undefined };
  });
}

async function fork(b) {
  const L = readLedger(b.from);
  if (!L) return [404, { error: `no run arm-${b.from}` }];
  if (job && job.exit === undefined) return [409, { error: `arm-${job.name} is still running; one run at a time.` }];
  const T = L.turns.find((t) => t.turn === Number(b.turn));
  const ci = T?.calls.findIndex((c) => c.key === b.key);
  if (!T || ci < 0) return [400, { error: `turn ${b.turn} of ${b.from} has no call "${b.key}"` }];
  const call = T.calls[ci], k = T.turn;
  if (b.answer != null && call.options && !call.options.some((o) => o.label === b.answer)) return [400, { error: `"${b.answer}" is not one of the options of ${b.key}` }];
  if (!b.ignoreBusy) {
    try {
      const ps = await (await fetch('http://127.0.0.1:11434/api/ps')).json();
      const others = (ps.models || []).map((m) => m.name).filter((n) => ![L.model, L.judge].includes(n));
      if (others.length) return [409, { error: `Ollama has another model loaded (${others.join(', ')}); a run now would not fit beside it.`, busy: others }];
    } catch { return [503, { error: 'Ollama is not answering on 11434.' }]; }
  }
  let name; for (const c of 'abcdefghijklmnopqrstuvwxyz') { name = `${b.from}-t${k}${c}`; if (!fs.existsSync(path.join(RUNS, `arm-${name}`))) break; }
  const out = path.join(RUNS, `arm-${name}`);
  fs.mkdirSync(out, { recursive: true });
  const brief = L.brief || BRIEFS[L.goal?.name] || 'puppy';
  const args = ['arm.mjs', '--run', name, '--brief', brief, '--turns', String(L.turnsCap), '--look', L.look, '--model', L.model, '--judge', L.judge, ...(L.bench ? ['--bench', L.bench] : [])];
  if (k > 1) args.push('--replay', b.from, '--upto', String(k));
  // the calls of turn k before the edited one keep their answers, so the edit is the only thing that moves
  for (const c of T.calls.slice(0, ci)) args.push('--force', `${k}.${c.key}=${c.answer}`);
  const change = {};
  if (b.answer != null && b.answer !== '') { args.push('--force', `${k}.${b.key}=${b.answer}`); change.answer = { was: call.answer, now: b.answer }; }
  if (b.prompt != null && b.prompt !== call.prompt) {
    const f = path.join(out, `prompt-t${k}-${b.key}.txt`); fs.writeFileSync(f, b.prompt);
    args.push('--prompt', `${k}.${b.key}=${f}`); change.prompt = { was: call.prompt, now: b.prompt };
  }
  if (b.hint) { args.push('--hint', `${k}=${b.hint}`); change.hint = b.hint; }
  // a whole-run edit stacks on the parent's, so a chain of forks keeps every earlier edit
  const edit = { ...(L.edit || {}), ...(b.edit || {}), rules: { ...(L.edit?.rules || {}), ...(b.edit?.rules || {}) } };
  if (!Object.keys(edit.rules).length) delete edit.rules;
  if (Object.keys(edit).length) { fs.writeFileSync(path.join(out, 'edit.json'), JSON.stringify(edit, null, 1)); args.push('--edit', path.join(out, 'edit.json')); }
  if (b.edit && Object.keys(b.edit).length) change.edit = b.edit;
  if (!Object.keys(change).length) change.none = 'the same step asked again, with nothing changed';
  const surgery = { from: b.from, turn: k, key: b.key, note: b.note || undefined, change, inherited: L.edit && Object.keys(L.edit).length ? L.edit : undefined, args, at: new Date().toISOString() };
  fs.writeFileSync(path.join(out, 'surgery.json'), JSON.stringify(surgery, null, 1));
  const log = fs.openSync(path.join(RUNS, `arm-${name}.log`), 'w');
  const child = spawn('nice', ['-n', '10', process.execPath, ...args], { cwd: HERE, stdio: ['ignore', log, log] });
  job = { name, pid: child.pid, startedAt: surgery.at, args };
  child.on('exit', (code) => { job.exit = code; job.endedAt = new Date().toISOString(); fs.closeSync(log); });
  return [200, { name, timeline: `runs/arm-${name}`, surgery }];
}

const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };

http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  try {
    if (url === '/runs') return send(res, 200, fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'timeline.json'))));
    if (url === '/api/runs') return send(res, 200, runsList());
    if (url === '/api/job') {
      const tail = job ? fs.readFileSync(path.join(RUNS, `arm-${job.name}.log`), 'utf8').trim().split('\n').slice(-3) : [];
      return send(res, 200, job ? { ...job, running: job.exit === undefined, tail } : { running: false });
    }
    if (url === '/api/fork' && req.method === 'POST') {
      let body = ''; for await (const c of req) body += c;
      const [code, out] = await fork(JSON.parse(body || '{}'));
      return send(res, code, out);
    }
  } catch (e) { return send(res, 500, { error: e.message }); }
  const file = path.join(HERE, url === '/' ? 'viewer.html' : url);
  if (!file.startsWith(HERE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`workbench on http://127.0.0.1:${PORT}/?t=runs/view-G-puppy-s0`));
