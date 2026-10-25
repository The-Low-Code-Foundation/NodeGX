// Reads a NodeGX app's folder through the kit's store and works out, from the files alone:
// the functions (endpoints and helpers), what each one reads and writes, and which screen
// calls which function, and what a person does there to make it run.
// Opening is reading: nothing here writes.

import { V2ProjectStore } from '@nodegx/project-contract/format.js';
import { diskFiles } from '@nodegx/project-contract/format-node.js';

const CLOUD = '__cloud__/';
const READ_NODES = new Set(['DbCollection2', 'DbModel2']);
const WRITE_NODES = {
  NewDbModelProperties: 'creates',
  SetDbModelProperties: 'changes',
  DeleteDbModelProperties: 'deletes',
  AddDbModelRelation: 'changes',
  RemoveDbModelRelation: 'changes'
};
/** The inputs that make a record node act (Query Records' fetch, a write's store / do). */
const RECORD_ACTIONS = ['fetch', 'refresh', 'store', 'do', 'create', 'save', 'delete', 'run'];
const RECORD_CALLS = {
  query: 'reads', fetch: 'reads', count: 'reads', aggregate: 'reads', distinct: 'reads', get: 'reads',
  create: 'creates', save: 'changes', update: 'changes', delete: 'deletes', remove: 'deletes'
};

/** `files` defaults to the folder on disk; the suite hands in the kit's in-memory files instead. */
export function openProject(dir, files = diskFiles(dir)) {
  const store = new V2ProjectStore(files);
  return { dir, files, store };
}

/** Every component as { key, files }, read without taking a snapshot (a walk, not a read-before-write). */
function allComponents(store) {
  const reg = store.readRegistry();
  return store.componentKeys().map((key) => ({ key, files: store.filesOf(key, reg.components[key]) }));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * What one script does to the tables. A table counts when its name is written in the code as
 * text ('Lesson'). How it is used is read from the call it sits in; a name passed around in a
 * variable is a "mention": the code names it, the map can't say for sure what it does with it.
 */
export function scriptTouches(script, tableNames) {
  const touches = [];
  // Aliases: `const q = (c, …) => Noodl.Records.query(c, …)` or `function q(c) { return Records.query(…) }`:
  // the first Records call in the few lines after the name is defined.
  const aliases = {};
  const aliasOf = (fn) => {
    if (!(fn in aliases)) {
      const def = script.match(new RegExp(`(?:const|let|var|function)\\s+${fn}\\b`));
      const call = def && script.slice(def.index, def.index + 300).match(/Records\.(\w+)\s*\(/);
      aliases[fn] = call && RECORD_CALLS[call[1]] ? call[1] : undefined;
    }
    return aliases[fn];
  };
  for (const t of tableNames) {
    const re = new RegExp(`(['"\`])${escapeRe(t)}\\1`, 'g');
    for (const m of script.matchAll(re)) {
      const before = script.slice(Math.max(0, m.index - 400), m.index);
      let how = null;
      // Directly the first argument of a call: Noodl.Records.create('X'  or  q('X'
      const direct = before.match(/(?:Records\.(\w+)|\b(\w+))\s*\(\s*$/);
      if (direct) how = RECORD_CALLS[direct[1] ?? aliasOf(direct[2])] ?? null;
      // className: 'X' inside a call's options: the nearest Records.<call> before it on this statement
      if (!how && /className\s*:\s*$/.test(before)) {
        const stmt = before.slice(Math.max(before.lastIndexOf(';'), before.lastIndexOf('{\n')) + 1);
        const calls = [...stmt.matchAll(/Records\.(\w+)\s*\(/g)];
        const last = calls[calls.length - 1];
        if (last && RECORD_CALLS[last[1]]) how = RECORD_CALLS[last[1]];
      }
      touches.push({ table: t, how: how ?? 'mentions' });
    }
  }
  return touches;
}

function mergeTouches(list) {
  const rank = { mentions: 0, reads: 1, changes: 2, creates: 3, deletes: 4 };
  const out = {};
  for (const { table, how, via } of list) {
    out[table] ??= { table, hows: new Set(), via: new Set() };
    out[table].hows.add(how);
    if (via) out[table].via.add(via);
  }
  return Object.values(out)
    .map((o) => {
      const hows = [...o.hows];
      // "mentions" adds nothing when the same table is also read or written in a way we could see
      const seen = hows.filter((h) => h !== 'mentions');
      return { table: o.table, hows: (seen.length ? seen : hows).sort((a, b) => rank[a] - rank[b]), via: [...o.via] };
    })
    .sort((a, b) => a.table.localeCompare(b.table));
}

/** A component's own touches (record nodes and scripts), not counting helpers it places. */
function ownTouches(nodes, tableNames) {
  const out = [];
  for (const n of nodes) {
    const p = n.parameters || {};
    if (READ_NODES.has(n.type) && p.collectionName) out.push({ table: p.collectionName, how: 'reads' });
    if (WRITE_NODES[n.type] && p.collectionName) out.push({ table: p.collectionName, how: WRITE_NODES[n.type] });
    if (n.type === 'JavaScriptFunction' && typeof p.functionScript === 'string') out.push(...scriptTouches(p.functionScript, tableNames));
    if (n.type === 'Expression' && typeof p.expression === 'string') out.push(...scriptTouches(p.expression, tableNames));
  }
  return out;
}

function stripType(type) {
  // '/#__cloud__/shared/Notice' → '__cloud__/shared/Notice', '/Data/Lesson' → 'Data/Lesson'
  return String(type).replace(/^\/#?/, '');
}

/**
 * What makes a call node run, in words: walk the wires back from its `call` input until a button,
 * a screen opening, or a named node is found.
 */
function triggerOf(callNode, nodesById, conns, part, ports = ['call']) {
  const into = (id) => conns.filter((c) => c.toId === id);
  const seen = new Set([callNode.id]);
  let frontier = into(callNode.id).filter((c) => ports.includes(c.toProperty));
  for (let depth = 0; depth < 6 && frontier.length; depth++) {
    const next = [];
    for (const c of frontier) {
      const src = nodesById[c.fromId];
      if (!src || seen.has(src.id)) continue;
      seen.add(src.id);
      const t = String(src.type).toLowerCase();
      if (/button|controls\./.test(t) || c.fromProperty === 'onClick') {
        return { kind: 'press', words: `pressing “${src.label || 'a button'}”` };
      }
      if (/didmount|mounted/i.test(c.fromProperty) || t === 'page inputs' || t === 'router') {
        return { kind: 'open', words: 'opening the screen' };
      }
      if (t === 'component inputs') {
        return { kind: 'asked', words: `“${part}” being given its “${c.fromProperty}”` };
      }
      next.push(...into(src.id));
    }
    frontier = next;
  }
  const first = into(callNode.id)[0];
  if (first && nodesById[first.fromId]) {
    const src = nodesById[first.fromId];
    return { kind: 'other', words: `“${src.label || src.type}” happening` };
  }
  return { kind: 'unknown', words: 'something on the screen (the map could not tell what)' };
}

export function analyseProject(project, tableNames) {
  const comps = allComponents(project.store);
  const byKey = Object.fromEntries(comps.map((c) => [c.key, c]));
  const fnNames = [];
  const helpers = [];
  for (const c of comps) {
    if (!c.key.startsWith(CLOUD)) continue;
    const isEndpoint = c.files.nodes.nodes.some((n) => n.type === 'noodl.cloud.request');
    if (isEndpoint) fnNames.push(c.key);
    else helpers.push(c.key);
  }

  // Touches, with helpers counted for every function that places them (recursively).
  const memo = {};
  const touchesOf = (key, stack = []) => {
    if (memo[key]) return memo[key];
    if (stack.includes(key)) return [];
    const c = byKey[key];
    if (!c) return [];
    const list = ownTouches(c.files.nodes.nodes, tableNames);
    for (const n of c.files.nodes.nodes) {
      const k = stripType(n.type);
      if (byKey[k] && k.startsWith(CLOUD)) {
        for (const t of touchesOf(k, [...stack, key])) list.push({ ...t, via: t.via ?? k.slice(CLOUD.length).replace(/^shared\//, '') });
      }
    }
    return (memo[key] = list);
  };

  const functions = fnNames.map((key) => {
    const c = byKey[key];
    const req = c.files.nodes.nodes.find((n) => n.type === 'noodl.cloud.request');
    const p = req?.parameters || {};
    const name = key.slice(CLOUD.length);
    const scripts = c.files.nodes.nodes.filter((n) => n.type === 'JavaScriptFunction').length;
    const helpersUsed = [...new Set(c.files.nodes.nodes.map((n) => stripType(n.type)).filter((k) => byKey[k] && k.startsWith(CLOUD)))].map((k) =>
      k.slice(CLOUD.length).replace(/^shared\//, '')
    );
    const steps = c.files.nodes.nodes.filter((n) => n.label && n.type !== 'noodl.cloud.request').map((n) => n.label);
    return {
      name,
      component: key,
      asks: String(p.params || '').split(',').map((s) => s.trim()).filter(Boolean),
      allowNoAuthInGraph: p.allowNoAuth === true,
      label: req?.label || '',
      steps,
      scripts,
      helpers: helpersUsed,
      touches: mergeTouches(touchesOf(key))
    };
  });

  // Which components place which (instances are nodes whose type is '/<key>').
  const placedIn = {};
  for (const c of comps) {
    for (const n of c.files.nodes.nodes) {
      const k = stripType(n.type);
      if (byKey[k] && k !== c.key) (placedIn[k] ??= new Set()).add(c.key);
      // a list's row: { "template": "/Course/Timeline row" }
      for (const v of Object.values(n.parameters || {})) {
        if (typeof v === 'string' && v.startsWith('/') && byKey[stripType(v)] && stripType(v) !== c.key) (placedIn[stripType(v)] ??= new Set()).add(c.key);
      }
    }
  }
  const pagesOf = (key, seen = new Set()) => {
    if (seen.has(key)) return [];
    seen.add(key);
    const type = project.store.readRegistry().components[key]?.type;
    if (key.startsWith('Pages/') || type === 'page') return [key];
    const parents = [...(placedIn[key] ?? [])];
    if (!parents.length) return [key];
    return [...new Set(parents.flatMap((p) => pagesOf(p, seen)))];
  };

  // Calls from the app's screens.
  const calls = [];
  for (const c of comps) {
    if (c.key.startsWith(CLOUD)) continue;
    const nodes = c.files.nodes.nodes;
    const conns = c.files.connections.connections || [];
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      if (n.type !== 'CloudFunction2' || !n.parameters?.function) continue;
      const trig = triggerOf(n, byId, conns, c.key.split('/').pop());
      for (const page of pagesOf(c.key)) {
        calls.push({ screen: page, inside: c.key === page ? null : c.key, fn: n.parameters.function, label: n.label || '', trigger: trig });
      }
    }
  }
  // NPMAUDIT-BACKENDMAPSCREENS: a screen also reaches the backend by reading and writing records itself
  // (a Query Records on the page, the MCP's canonical `repeater-query-records`), with no cloud function
  // between. Before, such an app's map had no screens at all. One entry per screen, table and node.
  const uses = [];
  for (const c of comps) {
    if (c.key.startsWith(CLOUD)) continue;
    const nodes = c.files.nodes.nodes;
    const conns = c.files.connections.connections || [];
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      const p = n.parameters || {};
      const how = READ_NODES.has(n.type) ? 'reads' : WRITE_NODES[n.type];
      if (!how || !p.collectionName) continue;
      const wired = conns.some((x) => x.toId === n.id && RECORD_ACTIONS.includes(x.toProperty));
      // A query with nothing wired into its fetch runs when its screen opens.
      const trigger = wired
        ? triggerOf(n, byId, conns, c.key.split('/').pop(), RECORD_ACTIONS)
        : how === 'reads'
          ? { kind: 'open', words: 'opening the screen' }
          : { kind: 'unknown', words: 'something on the screen (the map could not tell what)' };
      for (const page of pagesOf(c.key)) {
        uses.push({ screen: page, inside: c.key === page ? null : c.key, table: p.collectionName, how, label: n.label || '', trigger });
      }
    }
  }
  const screens = [...new Set([...calls.map((c) => c.screen), ...uses.map((u) => u.screen)])].sort();

  return {
    name: project.store.readProjectFile()?.name ?? project.dir,
    functions,
    helpers: helpers.map((k) => {
      const nm = k.slice(CLOUD.length).replace(/^shared\//, '');
      return { name: nm, component: k, touches: mergeTouches(ownTouches(byKey[k].files.nodes.nodes, tableNames)) };
    }),
    screens,
    calls,
    uses
  };
}

/**
 * Links between tables, read from the column names: a column called `conceptId` points at the
 * table whose one unique key is `conceptId`. `userId`, `…UserId` and `createdBy` point at the people.
 */
export function tableLinks(tables) {
  const owners = {};
  for (const t of tables) {
    for (const i of t.indexes || []) if (i.unique && i.fields.length === 1) (owners[i.fields[0]] ??= []).push(t.name);
  }
  const pick = (key, list) => {
    const stem = key.replace(/Id$/, '').toLowerCase();
    return list.find((n) => n.toLowerCase().startsWith(stem)) ?? list[0];
  };
  const links = [];
  const names = new Set(tables.map((t) => t.name));
  for (const t of tables) {
    for (const col of t.columns) {
      if (col.targetClass) {
        links.push({ from: t.name, to: col.targetClass, column: col.name, byName: false });
        continue;
      }
      let target = null;
      if (/^(userId|createdBy|ownerId)$/.test(col.name) || /UserId$/.test(col.name)) target = names.has('_User') ? '_User' : null;
      else {
        let key = col.name;
        if (!owners[key]) {
          const m = col.name.match(/[a-z]([A-Z]\w*Id)$/);
          if (m) key = m[1][0].toLowerCase() + m[1].slice(1);
        }
        if (owners[key]) {
          if (owners[key].includes(t.name) && key === col.name) continue; // the table's own key
          target = pick(key, owners[key].filter((n) => n !== t.name)) ?? null;
        }
      }
      if (target && target !== t.name) links.push({ from: t.name, to: target, column: col.name, byName: true });
    }
  }
  return links;
}
