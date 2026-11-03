#!/usr/bin/env node
// OWN-036 (Richard, 2026-11-03): "make sure that any future breakthroughs or learnings we make here in this repo or any
// Claude built project in the vscode projects folder contribute new versions to the npm package."
//
// Lists the learnings nobody has considered for the kit's skills yet. Read-only on every source; the only file it
// writes is the ledger, and only with --mark or --baseline. Sources:
//   inbox    ~/.nodegx/learnings/inbox/*.md — one line per lesson, written by `/next` in any project (step 0)
//   memory   ~/.claude/projects/-Users-<you>-vscode-projects-*/memory/*.md — every project's Claude memory, one file each
//   notes    ~/vscode_projects/*/ (3 deep) LEARNINGS*.md, LESSONS*.md, LOOK.md — whole files, re-listed when they grow
//   bugs     this repo's dev-docs/bugs/*.md — the defect ledger, one file each
// The ledger lives at ~/.nodegx/learnings/considered.json, NEVER in this repository: its keys name private and client
// projects, and this repository is public. Projects listed in ~/.nodegx/learnings/exclude.txt (one folder name a line)
// are never read.
//
//   node scripts/kit-learnings/harvest.mjs                  the unconsidered list, newest first (markdown)
//   node scripts/kit-learnings/harvest.mjs --count          one line: how many, per source (exit 0)
//   node scripts/kit-learnings/harvest.mjs --gate           exit 1 while an entry from the last 14 days is unconsidered
//                                                           (create-nodegx's prepublishOnly; KIT_HARVEST_SKIP=<why> passes)
//   node scripts/kit-learnings/harvest.mjs --since 2026-11-01
//   node scripts/kit-learnings/harvest.mjs --mark <key> <taken|general-no|private|duplicate> [note]
//   node scripts/kit-learnings/harvest.mjs --baseline <note> [--before <date>]  marks what is listed now (older than
//                                                           the date) as "backlog": not reviewed, parked (once, at setup)
//   node scripts/kit-learnings/harvest.mjs --backlog        lists what --baseline marked and nobody has looked at since
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const home = os.homedir();
const store = process.env.NODEGX_LEARNINGS_DIR ?? path.join(home, '.nodegx/learnings');
const projectsDir = process.env.NODEGX_PROJECTS_DIR ?? path.join(home, 'vscode_projects');
const claudeProjects = process.env.NODEGX_CLAUDE_PROJECTS ?? path.join(home, '.claude/projects');
const ledgerPath = path.join(store, 'considered.json');
// Whether the skills changed since the last published create-nodegx (packages/create-nodegx/scripts/stamp.js).
const skills = createRequire(import.meta.url)(path.join(repo, 'packages/create-nodegx/scripts/stamp.js')).status();
const VERDICTS = ['taken', 'general-no', 'private', 'duplicate', 'backlog'];

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : undefined);

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const ls = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch { return []; } };
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const mtime = (p) => { try { return fs.statSync(p).mtime; } catch { return new Date(0); } };
const ledger = JSON.parse(read(ledgerPath) ?? '{}');
const exclude = new Set((read(path.join(store, 'exclude.txt')) ?? '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));

// Claude Code names a project's folder after its path, every non-alphanumeric character a dash.
const slug = (p) => p.replace(/[^A-Za-z0-9]/g, '-');
const projects = ls(projectsDir).filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => d.name);
const projectOfSlug = new Map(projects.map((n) => [slug(path.join(projectsDir, n)), n]));

/** The title a reader scans: a memory's `description`, else its first heading, else its first line. */
function titleOf(text) {
  const d = /^description:\s*"?(.+?)"?\s*$/m.exec(text);
  if (d) return d[1];
  const h = /^#+\s+(.+)$/m.exec(text);
  return (h ? h[1] : text.split('\n').find((l) => l.trim()) ?? '').slice(0, 200);
}

const entries = [];
// inbox: one entry per line, so a lesson appended later is new on its own
for (const f of ls(path.join(store, 'inbox')).filter((d) => d.isFile() && d.name.endsWith('.md'))) {
  const p = path.join(store, 'inbox', f.name);
  for (const line of (read(p) ?? '').split('\n').filter((l) => /^\s*[-*]\s+\S/.test(l))) {
    const project = f.name.replace(/\.md$/, '');
    if (exclude.has(project)) continue;
    const date = /\b(20\d\d-\d\d-\d\d)\b/.exec(line)?.[1];
    entries.push({ key: `inbox:${project}:${sha(line)}`, fp: sha(line), source: 'inbox', project, when: date ? new Date(date) : mtime(p), title: line.replace(/^\s*[-*]\s+/, '').slice(0, 240), where: p });
  }
}
// memory: every project's Claude memory (worktrees of a project count as that project)
for (const d of ls(claudeProjects).filter((d) => d.isDirectory())) {
  const base = [...projectOfSlug.keys()].filter((s) => d.name === s || d.name.startsWith(`${s}-`)).sort((a, b) => b.length - a.length)[0];
  if (!base) continue;
  const project = projectOfSlug.get(base);
  if (exclude.has(project)) continue;
  const mem = path.join(claudeProjects, d.name, 'memory');
  for (const f of ls(mem).filter((f) => f.isFile() && f.name.endsWith('.md') && f.name !== 'MEMORY.md')) {
    const p = path.join(mem, f.name);
    const text = read(p) ?? '';
    const type = /^\s*type:\s*(\w+)/m.exec(text)?.[1];
    entries.push({ key: `memory:${project}:${f.name}`, fp: sha(text), source: 'memory', project, when: mtime(p), title: `${type ? `[${type}] ` : ''}${titleOf(text)}`, where: p });
  }
}
// notes: LEARNINGS / LESSONS / LOOK files, three levels into each project
const NOTE = /^(LEARNINGS|LESSONS)[^/]*\.md$|^LOOK\.md$/i;
function walk(dir, depth, project) {
  for (const e of ls(dir)) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory() && depth < 3) walk(p, depth + 1, project);
    else if (e.isFile() && NOTE.test(e.name)) {
      const text = read(p) ?? '';
      entries.push({ key: `notes:${path.relative(projectsDir, p)}`, fp: sha(text), source: 'notes', project, when: mtime(p), title: `${titleOf(text)} (${text.split('\n').length} lines)`, where: p });
    }
  }
}
for (const n of projects) if (!exclude.has(n)) walk(path.join(projectsDir, n), 1, n);
// bugs: this repo's ledger
for (const f of ls(path.join(repo, 'dev-docs/bugs')).filter((f) => f.isFile() && f.name.endsWith('.md'))) {
  const p = path.join(repo, 'dev-docs/bugs', f.name);
  const text = read(p) ?? '';
  entries.push({ key: `bugs:${f.name}`, fp: sha(text), source: 'bugs', project: 'OpenNoodl', when: mtime(p), title: titleOf(text), where: p });
}

// Unconsidered = never marked, or changed since it was marked (a memory rewritten, a LEARNINGS file grown).
const fresh = (e) => !ledger[e.key] || (ledger[e.key].fp !== e.fp && ledger[e.key].verdict !== 'private');
const save = () => { fs.mkdirSync(store, { recursive: true }); fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1) + '\n'); };

if (flag('--gate')) {
  // create-nodegx's prepublishOnly: a release carries what was learned in the last two weeks, or says why not.
  const cutoff = new Date(Date.now() - 14 * 864e5);
  const late = entries.filter((e) => fresh(e) && e.when >= cutoff);
  if (late.length && !process.env.KIT_HARVEST_SKIP) {
    console.error(`${late.length} learnings from the last 14 days are unconsidered (node scripts/kit-learnings/harvest.mjs --since ${cutoff.toISOString().slice(0, 10)}).`);
    console.error('Triage them (dev-docs/guidelines/KIT-LEARNINGS.md), or publish with KIT_HARVEST_SKIP="<why>".');
    process.exit(1);
  }
  console.log(late.length ? `KIT_HARVEST_SKIP: ${process.env.KIT_HARVEST_SKIP} (${late.length} unconsidered)` : 'kit learnings: none unconsidered in the last 14 days');
} else if (flag('--mark')) {
  const [key, verdict, ...note] = argv.slice(argv.indexOf('--mark') + 1);
  if (!VERDICTS.includes(verdict)) throw new Error(`verdict is one of ${VERDICTS.join(', ')}`);
  const e = entries.find((x) => x.key === key);
  if (!e) throw new Error(`no source entry has the key ${key}`);
  ledger[key] = { verdict, fp: e.fp, at: new Date().toISOString().slice(0, 10), note: note.join(' ') || undefined };
  save();
  console.log(`${key}: ${verdict}`);
} else if (flag('--baseline')) {
  const note = opt('--baseline') ?? 'baseline';
  let n = 0;
  const before = opt('--before') ? new Date(opt('--before')) : new Date(8.64e15);
  for (const e of entries) if (fresh(e) && e.when < before) { ledger[e.key] = { verdict: 'backlog', fp: e.fp, at: new Date().toISOString().slice(0, 10), note }; n++; }
  save();
  console.log(`${n} entries marked backlog in ${ledgerPath}`);
} else {
  const since = opt('--since') ? new Date(opt('--since')) : new Date(0);
  const backlog = flag('--backlog');
  const list = entries
    .filter((e) => (backlog ? ledger[e.key]?.verdict === 'backlog' && ledger[e.key].fp === e.fp : fresh(e)) && e.when >= since)
    .sort((a, b) => b.when - a.when);
  const by = Object.fromEntries(['inbox', 'memory', 'notes', 'bugs'].map((s) => [s, list.filter((e) => e.source === s).length]));
  if (flag('--count')) {
    console.log(`${list.length} ${backlog ? 'in the backlog' : 'unconsidered'}: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ')}. ${skills.line}`);
  } else {
    console.log(`# Kit learnings ${backlog ? 'backlog' : 'not yet considered'} (${list.length})\n`);
    console.log(`${skills.line}.\n`);
    console.log(`Ledger: ${ledgerPath}. Triage each with \`--mark <key> <${VERDICTS.slice(0, 4).join('|')}> [note]\`.\n`);
    for (const s of ['inbox', 'memory', 'notes', 'bugs']) {
      const rows = list.filter((e) => e.source === s);
      if (!rows.length) continue;
      console.log(`## ${s} (${rows.length})\n`);
      for (const e of rows) console.log(`- ${e.when.toISOString().slice(0, 10)} · **${e.project}** · ${e.title}\n  \`${e.key}\`${ledger[e.key] ? ` (changed since ${ledger[e.key].verdict} ${ledger[e.key].at})` : ''}`);
      console.log('');
    }
  }
}
