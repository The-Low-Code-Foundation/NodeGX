// BKO-008 — the backend suite, the editor suite's twin (`@nodegx/project-contract/editor-suite.js`). A script of backend
// edits is applied one at a time through an editor's adapter, the path a person's click takes. After each edit the suite
// reads the running backend and the project's files itself (never what the editor says about itself) and compares both
// with what the kit's own writers (lib/rules.mjs, lib/hands.mjs) leave: the same entry in both places, and each file
// byte for byte as the kit would have written it. PASS, or a sentence per difference naming the file, the table or the
// trigger, and what each place says. At the end both places are put back as they were before the first edit.
//
// An adapter is a module whose default export is an object, or a function returning one:
//   { name, open({ project, backend, token }), apply(edit) → { id }? , close()? }
// `apply` must return { id } for add_trigger and schedule: the trigger's id, so later edits can name it ("@3").

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serializeV2File } from '@nodegx/project-contract/format.js';
import { backend as backendClient } from './backend.mjs';
import { openProject, analyseProject } from './project.mjs';
import { SECURITY_FILE } from './rules.mjs';
import { AUTOMATIONS_FILE } from './triggers.mjs';
import { makeHands, projectTrigger } from './hands.mjs';
import { handEntry, ruleWords, tableWords, whoWords, MAKER } from './words.js';

export const EDIT_KINDS = ['grant', 'revoke', 'add_trigger', 'schedule', 'remove_trigger', 'turn_off'];

const ACTIONS = ['create', 'update', 'delete'];
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** One edit in words, for the report: "2 revoke: Anyone signed in on Lesson". */
export function editWords(edit, i) {
  const n = `edit ${i + 1} (${edit.kind}`;
  if (edit.kind === 'grant' || edit.kind === 'revoke') return `${n}: ${whoWords(edit.who)}${edit.kind === 'grant' && edit.who !== MAKER ? ` may ${edit.what ?? 'both'}` : ''} on ${edit.table})`;
  if (edit.kind === 'add_trigger') return `${n}: ${edit.fn} when a row of ${edit.table} is ${(edit.actions ?? []).join('/')})`;
  if (edit.kind === 'schedule') return `${n}: ${edit.fn} at “${edit.cron}”)`;
  return `${n}: ${edit.trigger})`;
}

/** What makes two triggers the same trigger to a person, the tuple Studio's `agrees` reads: never the backend's status. */
const triggerTuple = (t) =>
  !t ? null : { type: t.type, enabled: t.enabled !== false, target: { kind: t.target?.kind ?? null, name: t.target?.name ?? null }, cron: t.schedule?.cron ?? null, table: t.dbChange?.collection ?? null, actions: [...(t.dbChange?.actions ?? [])].sort() };

function triggerWords(t) {
  if (!t) return 'no such trigger';
  const what = t.type === 'schedule' ? `runs ${t.target.name} at “${t.cron}”` : t.type === 'db-change' ? `runs ${t.target.name} when a row of ${t.table} is ${t.actions.join('/')}` : `a ${t.type} trigger for ${t.target.name}`;
  return `${what}, ${t.enabled ? 'on' : 'turned off'}`;
}

function ruleSentence(entry, config) {
  const rule = { permissions: { ...(config.defaults?.permissions ?? {}), ...(entry?.permissions ?? {}) }, creatorOwns: entry ? !!entry.creatorOwns : !!config.defaults?.creatorOwns };
  // "The member group or The admin group" → "the member group or the admin group", inside a sentence
  const lower = (w) => w.split(' or ').map((x) => x.charAt(0).toLowerCase() + x.slice(1)).join(' or ');
  return `${entry ? '' : 'the standard rule: '}reading ${lower(ruleWords(rule.permissions.find))}, adding ${lower(ruleWords(rule.permissions.create))}${rule.creatorOwns ? ', and whoever made a row always may' : ''}`;
}

/** The first line where two texts part, for a sentence: "line 4: … ≠ …". */
function firstDifference(a, b) {
  const x = (a ?? '').split('\n');
  const y = (b ?? '').split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    // as written, spaces and all: the difference is often only the indent
    if (x[i] !== y[i]) return `line ${i + 1} is ${JSON.stringify((x[i] ?? '(no line)').slice(0, 90))}; the kit writes ${JSON.stringify((y[i] ?? '(no line)').slice(0, 90))}`;
  }
  return 'they differ';
}

/** The kit's own writers as an adapter: the reference, and what the suite's own control runs against. */
export function referenceAdapter() {
  let hands;
  return {
    name: 'the kit’s reference writers',
    open({ project, backend, token }) {
      const p = openProject(project);
      hands = makeHands({ be: backendClient(backend, token), files: p.files, functions: () => analyseProject(p, []).functions.map((f) => f.name) });
    },
    async apply(edit) {
      if (edit.kind === 'grant' || edit.kind === 'revoke') {
        await hands.rule({ table: edit.table, who: edit.who, what: edit.what ?? 'both', cut: edit.kind === 'revoke', confirmPublic: true });
        return {};
      }
      if (edit.kind === 'add_trigger') return { id: (await hands.addTrigger({ fn: edit.fn, table: edit.table, actions: edit.actions })).trigger.id };
      if (edit.kind === 'schedule') return { id: (await hands.addTrigger({ fn: edit.fn, cron: edit.cron })).trigger.id };
      if (edit.kind === 'remove_trigger') return void (await hands.removeTrigger({ id: edit.trigger }));
      if (edit.kind === 'turn_off') return void (await hands.setEnabled({ id: edit.trigger, enabled: false }));
      throw new Error(`no edit kind “${edit.kind}”`);
    }
  };
}

async function loadAdapter(adapter) {
  if (typeof adapter === 'string') {
    const mod = await import(adapter.startsWith('file:') ? adapter : pathToFileURL(path.resolve(adapter)).href);
    adapter = mod.default ?? mod.adapter;
  }
  return typeof adapter === 'function' ? await adapter() : adapter;
}

/**
 * @param {object} o
 * @param {object|string|Function} o.adapter  the adapter, or the path of its module
 * @param {string} o.project   the app's folder (a copy: the adapter writes into it)
 * @param {string} o.backend   the running backend that folder's app uses (a copy's: the adapter changes it)
 * @param {string} o.token     its admin credential
 * @param {object[]} o.edits   the script
 * @returns {Promise<{ pass: boolean, line: string, differences: string[], putBack: boolean, ms: number }>}
 */
export async function runSuite({ adapter, project, backend, token, edits }) {
  const t0 = Date.now();
  const be = backendClient(backend, token);
  const read = (name) => (fs.existsSync(path.join(project, name)) ? fs.readFileSync(path.join(project, name), 'utf8') : null);
  const write = (name, text) => (text === null ? fs.rmSync(path.join(project, name), { force: true }) : fs.writeFileSync(path.join(project, name), text));
  const bad = edits.findIndex((e) => !EDIT_KINDS.includes(e?.kind));
  if (bad >= 0) throw new Error(`Edit ${bad + 1} is “${edits[bad]?.kind}”. The kinds are ${EDIT_KINDS.join(', ')}.`);

  // Where both places start: the suite puts them back here at the end.
  const start = {
    collections: (await be.get('/admin/permissions')).config.collections ?? {},
    triggers: (await be.get('/admin/triggers')).triggers ?? [],
    sec: read(SECURITY_FILE),
    auto: read(AUTOMATIONS_FILE)
  };
  // What the kit's writers would have left: each place's rule per table, each trigger's tuple, each file's text.
  const want = { sec: start.sec, auto: start.auto, tables: new Map(), triggers: new Map() };
  const minted = [];
  const differences = [];
  const ed = await loadAdapter(adapter);
  const name = ed?.name ?? 'the editor';
  // each thing that differs is said once, after the edit where it first showed: not again after every later edit
  const said = new Set();
  const say = (i, words, about = words) => !said.has(about) && (said.add(about), differences.push(`after ${editWords(edits[i], i)}: ${words}`));
  const idOf = (ref) => (typeof ref === 'string' && /^@\d+$/.test(ref) ? minted[Number(ref.slice(1)) - 1] : ref);

  try {
    await ed.open({ project, backend, token });
    for (let i = 0; i < edits.length && differences.length < 10; i++) {
      const edit = { ...edits[i] };
      if (edit.trigger !== undefined) edit.trigger = idOf(edit.trigger);
      const live = (await be.get('/admin/permissions')).config;
      let answer;
      try {
        answer = (await ed.apply(edit)) ?? {};
      } catch (e) {
        say(i, `${name} refused it: ${e.message}`);
        break;
      }
      minted[i] = answer.id ?? null;

      // the reference: what the kit's writer leaves, from the same starting point
      if (edit.kind === 'grant' || edit.kind === 'revoke') {
        const hand = handEntry(live, edit.table, { who: edit.who, what: edit.what ?? 'both', cut: edit.kind === 'revoke' });
        want.tables.set(edit.table, hand.entry);
        if (!hand.same) {
          const cfg = want.sec ? JSON.parse(want.sec) : {};
          const next = { ...cfg, collections: { ...(cfg.collections ?? {}) } };
          if (hand.entry) next.collections[edit.table] = hand.entry;
          else delete next.collections[edit.table];
          want.sec = serializeV2File(next, want.sec);
        }
      } else {
        let id = edit.kind === 'add_trigger' || edit.kind === 'schedule' ? answer.id : edit.trigger;
        if (!id) {
          say(i, `${name} returned no trigger id (apply must return { id } for ${edit.kind}), so later edits can’t name it.`);
          break;
        }
        const stored = await be.get(`/admin/triggers/${encodeURIComponent(id)}`).then((r) => r.trigger, () => null);
        let tuple = null;
        if (edit.kind === 'add_trigger') tuple = { type: 'db-change', enabled: true, target: { kind: 'function', name: edit.fn }, cron: null, table: edit.table, actions: ACTIONS.filter((a) => edit.actions.includes(a)) };
        if (edit.kind === 'schedule') tuple = { type: 'schedule', enabled: true, target: { kind: 'function', name: edit.fn }, cron: edit.cron.trim(), table: null, actions: [] };
        if (edit.kind === 'turn_off') tuple = { ...(want.triggers.get(id) ?? triggerTuple(start.triggers.find((t) => t.id === id))), enabled: false };
        want.triggers.set(id, tuple);
        // the file's text as the kit patches it: the entry from what the backend stored, sorted by id
        const cfg = { version: 1, workflows: [], triggers: [], ...(want.auto ? JSON.parse(want.auto) : {}) };
        const rest = cfg.triggers.filter((t) => t.id !== id);
        const triggers = tuple && stored ? [...rest, projectTrigger(stored)].sort(byId) : rest;
        if (tuple || cfg.triggers.length !== rest.length) want.auto = serializeV2File({ version: 1, workflows: cfg.workflows, triggers }, want.auto);
      }

      // the grade: the backend and the files as they are now, read by the suite
      const nowCfg = (await be.get('/admin/permissions')).config;
      const sec = read(SECURITY_FILE);
      const secCfg = sec ? JSON.parse(sec) : {};
      for (const [table, entry] of want.tables) {
        const onBackend = nowCfg.collections?.[table] ?? null;
        const inFile = secCfg.collections?.[table] ?? null;
        const t = tableWords(table);
        if (!sameJson(onBackend, entry)) say(i, `${t} on the backend is ${ruleSentence(onBackend, nowCfg)}; the kit’s writer leaves ${ruleSentence(entry, nowCfg)}.`, `rule:backend:${table}:${JSON.stringify(onBackend)}`);
        if (!sameJson(inFile, entry)) {
          say(
            i,
            sameJson(inFile, onBackend) ? `${t} in ${SECURITY_FILE} is ${ruleSentence(inFile, nowCfg)}, as on the backend; the kit’s writer leaves ${ruleSentence(entry, nowCfg)}.` : `${t} in ${SECURITY_FILE} is ${ruleSentence(inFile, nowCfg)}; the backend says ${ruleSentence(onBackend, nowCfg)}.`,
            `rule:file:${table}:${JSON.stringify(inFile)}`
          );
        }
      }
      const backendTriggers = (await be.get('/admin/triggers')).triggers ?? [];
      const auto = read(AUTOMATIONS_FILE);
      const fileTriggers = auto ? JSON.parse(auto).triggers ?? [] : [];
      for (const [id, tuple] of want.triggers) {
        const onBackend = triggerTuple(backendTriggers.find((t) => t.id === id));
        const inFile = triggerTuple(fileTriggers.find((t) => t.id === id));
        if (!sameJson(onBackend, tuple)) say(i, `trigger “${id}” on the backend: ${triggerWords(onBackend)}; the kit’s writer leaves ${tuple ? triggerWords(tuple) : 'none'}.`, `trigger:backend:${id}:${JSON.stringify(onBackend)}`);
        if (!sameJson(inFile, tuple)) {
          say(
            i,
            `trigger “${id}” in ${AUTOMATIONS_FILE}: ${triggerWords(inFile)}; ${sameJson(inFile, onBackend) ? 'the kit’s writer leaves ' + (tuple ? triggerWords(tuple) : 'none') : 'the backend says ' + triggerWords(onBackend)}.`,
            `trigger:file:${id}:${JSON.stringify(inFile)}`
          );
        }
      }
      // byte for byte, once the entries agree: a file the kit would write differently is a difference too
      if (!differences.length) {
        if (sec !== want.sec) say(i, `${SECURITY_FILE} holds the same rules but is written differently from the kit’s writer: ${firstDifference(sec, want.sec)}.`);
        if (auto !== want.auto) say(i, `${AUTOMATIONS_FILE} holds the same triggers but is written differently from the kit’s writer: ${firstDifference(auto, want.auto)}.`);
      }
    }
  } finally {
    await ed.close?.();
  }

  // Put both places back as they were.
  const putBack = [];
  try {
    const cfgNow = (await be.get('/admin/permissions')).config.collections ?? {};
    for (const table of new Set([...Object.keys(cfgNow), ...Object.keys(start.collections)])) {
      const was = start.collections[table] ?? null;
      if (sameJson(cfgNow[table] ?? null, was)) continue;
      const p = `/admin/permissions/collections/${encodeURIComponent(table)}`;
      if (was) await be.put(p, was);
      else await be.del(p);
    }
    const trNow = (await be.get('/admin/triggers')).triggers ?? [];
    for (const t of trNow) if (!start.triggers.some((s) => s.id === t.id)) await be.del(`/admin/triggers/${encodeURIComponent(t.id)}`);
    for (const s of start.triggers) {
      const t = trNow.find((x) => x.id === s.id);
      if (!t) await be.post('/admin/triggers', projectTrigger(s));
      else if ((t.enabled !== false) !== (s.enabled !== false)) await be.post(`/admin/triggers/${encodeURIComponent(s.id)}/enabled`, { enabled: s.enabled !== false });
    }
    write(SECURITY_FILE, start.sec);
    write(AUTOMATIONS_FILE, start.auto);
    const after = { collections: (await be.get('/admin/permissions')).config.collections ?? {}, triggers: (await be.get('/admin/triggers')).triggers ?? [] };
    // table by table: a table whose entry was put back comes last in the backend's answer, which is no difference
    const tables = new Set([...Object.keys(after.collections), ...Object.keys(start.collections)]);
    if ([...tables].some((t) => !sameJson(after.collections[t] ?? null, start.collections[t] ?? null))) putBack.push('the backend’s table rules');
    const tuples = (list) => list.map((t) => [t.id, triggerTuple(t)]).sort();
    if (!sameJson(tuples(after.triggers), tuples(start.triggers))) putBack.push('the backend’s triggers');
    if (read(SECURITY_FILE) !== start.sec) putBack.push(SECURITY_FILE);
    if (read(AUTOMATIONS_FILE) !== start.auto) putBack.push(AUTOMATIONS_FILE);
  } catch (e) {
    putBack.push(`(putting back failed: ${e.message})`);
  }

  const ms = Date.now() - t0;
  let where = path.basename(project);
  try {
    where = analyseProject(openProject(project), []).name || where;
  } catch {
    /* the folder's name */
  }
  const tail = putBack.length ? `; NOT put back: ${putBack.join(', ')}` : '; both places put back';
  const line = differences.length ? `FAIL — ${name} on ${where}, ${differences.length} difference${differences.length === 1 ? '' : 's'} (${ms} ms)${tail}` : `PASS — ${name} on ${where}, ${edits.length} edits (${ms} ms)${tail}`;
  return { pass: !differences.length, line, differences, putBack: !putBack.length, ms };
}
