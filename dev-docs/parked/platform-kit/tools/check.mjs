// The checker: ten gates, each a refusal. Any one red is exit 1. Run it before you say a round is done.
//   node tools/check.mjs [--root <the game's folder>] [--only 1,5,9]
//
//  1  no orphan number       a number in src/ that is not in a knobs() call, not 0, 1, 2, 0.5, an index or a
//                            multiple of Math.PI, and has no `// why:` comment on its line
//  2  every mesh under a part a mesh in the running scene with no part name on itself or above it
//  3  the page prints         what.mjs lists at least one knob group, one model and one place
//  4  the round-trip          every design file reads back as what the game holds
//  5  files, not the browser  localStorage, sessionStorage or indexedDB anywhere in the game
//  6  a level is a file       a change that adds a file under places/ and also changes src/engine/
//  7  no panel unasked        a file under editors/ with no line in RECORD.md: keep: <name> — "<the owner's words>"
//                            (or asked: <name> — "…" while the round that asked for it is open)
//  8  no inert knob           a model's knob whose two extremes change fewer than 12 pixels of the parts it changes
//  9  every place drives green a place with no tests/<id>.json, or whose drive fails
// 10  strings are data        words a player reads, written into src/ (textContent, innerHTML, fillText …)
//
// Gates 2, 3, 4, 8 and 9 run the game in headless Chrome (served by tools/serve.mjs on a free port).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer, openPage } from './chrome.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const ROOT = args.includes('--root') ? path.resolve(args[args.indexOf('--root') + 1]) : path.join(here, '..');
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',').map(Number)) : null;
const rel = (f) => path.relative(ROOT, f);

const results = [];
const gate = (n, name, bad, note = '') => {
  if (only && !only.has(n)) return;
  results.push({ n, name, bad, note });
};

function files(dir, test = (f) => /\.m?js$/.test(f)) {
  const out = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'vendor') continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (test(f)) out.push(f);
    }
  };
  walk(dir);
  return out.sort();
}

// ---- a small JavaScript reader: numbers (with what surrounds them), strings, comments ----
const KNOB_CALLS = new Set(['knobs', 'num', 'int', 'on', 'colour', 'text', 'pick']);
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', 'return', 'typeof', 'case', 'do', 'else', 'in', 'of', '=>', '']);
function read(src) {
  const numbers = [], strings = [], whyLines = new Set();
  let i = 0, line = 1, prev = '', prevPrev = '';
  const parens = []; // true where the paren is a knob call's
  const braces = []; // 'code' | 'template' for ${ … }
  const push = (tok) => ((prevPrev = prev), (prev = tok));
  const inKnob = () => parens.includes(true);
  const template = () => {
    // From just after a backtick (or a closing } of ${…}) to the next ${ or closing backtick.
    let text = '';
    const start = line;
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') (text += src.slice(i, i + 2)), (i += 2);
      else if (c === '`') {
        i++;
        strings.push({ text, line: start, quote: '`' });
        push('`');
        return;
      } else if (c === '$' && src[i + 1] === '{') {
        strings.push({ text, line: start, quote: '`', open: true });
        i += 2;
        braces.push('template');
        push('{');
        return;
      } else {
        if (c === '\n') line++;
        text += c;
        i++;
      }
    }
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') (line++, i++);
    else if (/\s/.test(c)) i++;
    else if (c === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i);
      const comment = src.slice(i, end < 0 ? src.length : end);
      if (/\/\/\s*why:/i.test(comment)) whyLines.add(line);
      i = end < 0 ? src.length : end;
    } else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const body = src.slice(i, end < 0 ? src.length : end + 2);
      if (/why:/i.test(body)) whyLines.add(line + body.split('\n').length - 1);
      line += body.split('\n').length - 1;
      i = end < 0 ? src.length : end + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1, text = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') (text += src.slice(j, j + 2)), (j += 2);
        else (text += src[j]), j++;
      }
      strings.push({ text, line, quote: c, at: i });
      i = j + 1;
      push('"');
    } else if (c === '`') {
      i++;
      template();
    } else if (c === '/' && REGEX_AFTER.has(prev)) {
      // A regular expression literal.
      let j = i + 1, cls = false;
      while (j < src.length && (cls || src[j] !== '/')) {
        if (src[j] === '\\') j++;
        else if (src[j] === '[') cls = true;
        else if (src[j] === ']') cls = false;
        else if (src[j] === '\n') break;
        j++;
      }
      i = j + 1;
      while (/[a-z]/i.test(src[i] ?? '')) i++;
      push('/re/');
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)n?/.exec(src.slice(i));
      const text = m[0];
      const value = Number(text.replace(/_/g, '').replace(/n$/, ''));
      // After the number: the next significant characters (for indices and Math.PI).
      const after = src.slice(i + text.length).match(/^\s*([\]\)]|[*/]\s*Math\.PI)/)?.[1] ?? '';
      numbers.push({ text, value, line, inKnob: inKnob(), before: prev, beforeBefore: prevPrev, after });
      i += text.length;
      push('num');
    } else if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/.exec(src.slice(i));
      i += m[0].length;
      push(m[0]);
    } else if (c === '(') {
      parens.push(KNOB_CALLS.has(prev));
      i++;
      push('(');
    } else if (c === ')') {
      parens.pop();
      i++;
      push(')');
    } else if (c === '{') {
      braces.push('code');
      i++;
      push('{');
    } else if (c === '}') {
      const was = braces.pop();
      i++;
      if (was === 'template') template();
      else push('}');
    } else if (c === '=' && src[i + 1] === '>') (i += 2), push('=>');
    else (push(c), i++);
  }
  return { numbers, strings, whyLines };
}

const FREE = new Set([0, 1, 2, 0.5]);
function orphanNumbers() {
  const bad = [];
  let total = 0;
  for (const f of files(path.join(ROOT, 'src'))) {
    const { numbers, whyLines } = read(fs.readFileSync(f, 'utf8'));
    for (const n of numbers) {
      total++;
      if (n.inKnob || FREE.has(n.value) || whyLines.has(n.line)) continue;
      // An index: x[3] (a bracket after a name, a call or another bracket), not an array of numbers.
      if (n.before === '[' && n.after === ']' && /^[\w$.)\]]/.test(n.beforeBefore)) continue;
      // A multiple of π: Math.PI * 1.5, 2 * Math.PI, Math.PI / 4.
      if (/Math\.PI$/.test(n.beforeBefore) && /^[*/]$/.test(n.before)) continue;
      if (/Math\.PI/.test(n.after)) continue;
      bad.push(`${rel(f)}:${n.line}: ${n.text} — make it a knob, or say why on its line (// why: …)`);
    }
  }
  return { bad, note: `${total} numbers read` };
}

function browserStorage() {
  const bad = [];
  for (const dir of ['src', 'places', 'editors'])
    for (const f of files(path.join(ROOT, dir)))
      fs.readFileSync(f, 'utf8').split('\n').forEach((l, k) => {
        const m = /\b(localStorage|sessionStorage|indexedDB)\b/.exec(l.replace(/\/\/.*$/, ''));
        if (m) bad.push(`${rel(f)}:${k + 1}: ${m[1]} — the owner's changes go in design files (kit/design.mjs)`);
      });
  return { bad };
}

function levelIsAFile() {
  const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  let prefix;
  try {
    prefix = git('rev-parse', '--show-prefix').trim();
  } catch {
    return { bad: [], note: 'not a git repository: nothing to compare (git init, and commit each round)' };
  }
  const local = (p) => (p.startsWith(prefix) ? p.slice(prefix.length) : null);
  // Only an engine that already existed counts: the first build adds its places and its engine together.
  let engineBefore = false;
  const judge = (label, entries) => {
    const added = entries.filter(([s, p]) => /^(A|\?\?)/.test(s) && p?.startsWith('places/'));
    const engine = entries.filter(([, p]) => p?.startsWith('src/engine/'));
    const out = engineBefore && added.length && engine.length ? [`${label}: adds ${added.map(([, p]) => p).join(', ')} and changes ${engine.map(([, p]) => p).join(', ')}`] : [];
    if (engine.length) engineBefore = true;
    return out;
  };
  const bad = [];
  // Each commit, oldest first, then what is not committed yet.
  let log = '';
  try {
    log = git('log', '--reverse', '--name-status', '--format=@@%h %s', '--', '.');
  } catch {} // no commit yet: only the working tree to judge
  for (const block of log.split('@@').filter(Boolean)) {
    const [head, ...rows] = block.trim().split('\n');
    bad.push(...judge(`commit ${head}`, rows.map((r) => r.split('\t')).map(([s, p]) => [s, local(p ?? '')])));
  }
  const status = git('status', '--porcelain', '--untracked-files=all', '--', '.').split('\n').filter(Boolean).map((r) => [r.slice(0, 2).trim() || 'M', local(r.slice(3))]);
  bad.push(...judge('not committed yet', status));
  return { bad };
}

function noPanelUnasked() {
  const dir = path.join(ROOT, 'editors');
  if (!fs.existsSync(dir)) return { bad: [] };
  const record = fs.existsSync(path.join(ROOT, 'RECORD.md')) ? fs.readFileSync(path.join(ROOT, 'RECORD.md'), 'utf8') : '';
  const said = new Set([...record.matchAll(/^\s*[-*]?\s*(?:keep|asked):\s*([\w./-]+)\s*[—–-]+\s*["“].{3,}["”]/gim)].map((m) => m[1].replace(/\.m?js$/, '').replace(/\/$/, '')));
  const bad = [];
  for (const e of fs.readdirSync(dir)) {
    if (e.startsWith('.')) continue;
    const name = e.replace(/\.m?js$/, '');
    if (!said.has(name)) bad.push(`editors/${e}: no line in RECORD.md saying the owner asked for it (keep: ${name} — "their words")`);
  }
  return { bad };
}

const SHOWN = /(\.(?:textContent|innerText|innerHTML|title|placeholder|alt)\s*\+?=\s*$)|((?:fillText|strokeText|createTextNode|alert|confirm|prompt)\s*\(\s*$)/;
function stringsAreData() {
  const bad = [];
  for (const f of files(path.join(ROOT, 'src'))) {
    const src = fs.readFileSync(f, 'utf8');
    const { strings } = read(src);
    for (const s of strings) {
      if (s.at === undefined) continue; // a template literal: the line check below reads those
      // What comes before the literal on its line: is it being shown to a player?
      const lineStart = src.lastIndexOf('\n', s.at ?? 0) + 1;
      const before = s.at !== undefined ? src.slice(lineStart, s.at) : '';
      const words = s.text.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ');
      if (SHOWN.test(before) && /[A-Za-z]{2,}/.test(words)) bad.push(`${rel(f)}:${s.line}: "${s.text.slice(0, 50)}" — a player reads this: put it in strings/ (kit/strings.mjs, say('key'))`);
    }
    // Template literals shown to a player: `textContent = \`Found ${n} cans\``.
    src.split('\n').forEach((l, k) => {
      const m = /(?:\.(?:textContent|innerText|innerHTML|title)\s*\+?=|(?:fillText|strokeText|createTextNode)\s*\()\s*`([^`]*)`/.exec(l);
      if (m && /[A-Za-z]{2,}/.test(m[1].replace(/\$\{[^}]*\}/g, '').replace(/<[^>]*>/g, ' '))) bad.push(`${rel(f)}:${k + 1}: \`${m[1].slice(0, 50)}\` — a player reads this: put it in strings/`);
    });
  }
  return { bad };
}

// ---- the gates that need the game running ----
async function running() {
  const server = await startServer(ROOT);
  const out = { orphans: null, page: null, roundTrip: null, inert: null, places: [], errors: [], up: false };
  try {
    const page = await openPage(server.url);
    out.up = await page.waitFor('window.__play && __play.ready', 120000);
    if (out.up) {
      const r = await page.evaluate('__play.pageChecks().then((r) => ({ ...r, what: __play.what(), census: __play.census() }))');
      Object.assign(out, { orphans: r.orphans, roundTrip: r.roundTrip, inert: r.inert, what: r.what, census: r.census });
    }
    out.errors = page.errors.slice();
    page.close();
    // Every place's drive, each in its own Chrome (tools/drive.mjs).
    if (out.census && (!only || only.has(9)))
      for (const p of out.census.places) {
        const steps = path.join(ROOT, p.drive);
        if (!fs.existsSync(steps)) {
          out.places.push({ id: p.id, ok: false, why: `no ${p.drive}: write the drive for this place` });
          continue;
        }
        const r = spawnSync(process.execPath, [path.join(here, 'drive.mjs'), server.url, steps, path.join(ROOT, 'shots/check')], { encoding: 'utf8' });
        const fails = (r.stdout ?? '').split('\n').filter((l) => /^FAIL|TIMED OUT|\[exception\]/.test(l));
        out.places.push({ id: p.id, ok: r.status === 0, why: r.status === 0 ? '' : `${p.drive} failed: ${fails.slice(0, 4).join(' · ') || `exit ${r.status}`}` });
      }
  } finally {
    server.stop();
  }
  return out;
}

const needsGame = !only || [2, 3, 4, 8, 9].some((n) => only.has(n));
const wanted = (n) => !only || only.has(n);
if (wanted(1)) gate(1, 'no orphan number', ...Object.values(orphanNumbers()));
if (wanted(5)) gate(5, 'files, not the browser', browserStorage().bad);
if (wanted(6)) gate(6, 'a level is a file', ...Object.values(levelIsAFile()));
if (wanted(7)) gate(7, 'no panel unasked', noPanelUnasked().bad);
if (wanted(10)) gate(10, 'strings a player reads are data', stringsAreData().bad);
if (needsGame) {
  const g = await running();
  const down = g.up ? [] : [`the game never said it was ready (call expose({ scene, camera, renderer }) once the first place is built)${g.errors.length ? `; page errors: ${g.errors.slice(0, 3).join(' · ')}` : ''}`];
  gate(2, 'every mesh under a part', g.up ? g.orphans.map((o) => `${o} — build it inside a model's part`) : down);
  const c = g.census;
  gate(3, 'the page prints', g.up ? [!c.knobs.length && 'no knob group', !c.models.length && 'no model', !c.places.length && 'no place'].filter(Boolean) : down);
  gate(4, 'the round-trip', g.up ? g.roundTrip : down);
  gate(8, 'no inert knob', g.up ? g.inert.bad : down, g.up && g.inert.unrendered.length ? `not rendered (no model reads them): ${g.inert.unrendered.join(', ')}` : '');
  const placeFiles = files(path.join(ROOT, 'places')).map((f) => path.basename(f).replace(/\.m?js$/, ''));
  const ids = new Set((c?.places ?? []).map((p) => p.id));
  gate(9, 'every place drives green', g.up ? [...placeFiles.filter((f) => !ids.has(f)).map((f) => `places/${f}.mjs registers no place called "${f}" (a place's file is named after it)`), ...g.places.filter((p) => !p.ok).map((p) => `${p.id}: ${p.why}`)] : down);
  if (g.errors.length) console.log(`page errors while checking:\n  ${g.errors.join('\n  ')}`);
}

results.sort((a, b) => a.n - b.n);
for (const r of results) {
  console.log(`${r.bad.length ? 'FAIL' : 'PASS'}  ${String(r.n).padStart(2)} ${r.name}${r.note ? `  (${r.note})` : ''}`);
  for (const b of r.bad.slice(0, 25)) console.log(`        ${b}`);
  if (r.bad.length > 25) console.log(`        … and ${r.bad.length - 25} more`);
}
const red = results.filter((r) => r.bad.length).length;
console.log(`\n${results.length - red} / ${results.length} gates green`);
process.exit(red ? 1 : 0);
