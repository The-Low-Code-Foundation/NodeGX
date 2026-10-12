/**
 * P109 ISL-005 — a project's Functions as the drives read and run them, now that their shared code lives in
 * `scripts/**.js` and each Function lists the files it uses under Uses.
 *
 * - `functionText(project, component)` — the Function's own text with every file in its Uses in front: what a drive
 *   reads a constant out of (`var SAVE_VERSION = …` now sits in `scripts/save.js`, not in the Function).
 * - `runFunction(project, component, inputs, tail, out)` — the Function run as the page runs it, `Scripts` built from
 *   its Uses. Every name each used file gives is in scope too, so a drive's `tail` can still call an engine helper by
 *   name, as it could when the engine was pasted into the Function.
 *
 * The loader mirrors `packages/noodl-runtime/src/scriptfiles.ts` (a drive is plain Node and cannot load the
 * TypeScript): the same path spellings, one load per file, a cycle sees the exports so far, and `Noodl`, `window` and
 * `document` are undefined inside a file. `packages/noodl-mcp/tests/isl005GardenScripts.test.ts` checks it loads the
 * garden's files to the same exports as the runtime's `ScriptFiles`.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/** A file's path as the project names it (`engine/world.js`), from any spelling; undefined outside `scripts/`. */
function normalizeScriptPath(value) {
  if (typeof value !== 'string') return undefined;
  let p = value.trim().replace(/\\/g, '/');
  p = p.replace(/^\.\//, '').replace(/^\/+/, '');
  if (p.startsWith('scripts/')) p = p.slice('scripts/'.length);
  if (p === '' || p.endsWith('/')) return undefined;
  if (p.split('/').some((part) => part === '' || part === '.' || part === '..')) return undefined;
  return p.endsWith('.js') ? p : p + '.js';
}

/** A Function's `uses` as a list of paths (a comma string, as the editor stores it, or an array). */
function usesOf(value) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const out = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !entry.trim()) continue;
    const p = normalizeScriptPath(entry) || entry.trim();
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

const alias = (p) => path.posix.basename(p).replace(/\.js$/, '');

const projects = new Map();

/** `scripts/**.js` of a project, read once. */
function sourcesOf(project) {
  if (projects.has(project)) return projects.get(project);
  const root = path.join(project, 'scripts');
  const sources = {};
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) sources[path.relative(root, full).split(path.sep).join('/')] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(root);
  const loaded = new Map();
  const load = (value) => {
    const p = normalizeScriptPath(value);
    if (p === undefined || !Object.prototype.hasOwnProperty.call(sources, p)) throw new Error(`There is no script file scripts/${value}`);
    if (loaded.has(p)) return loaded.get(p).exports;
    const module = { exports: {} };
    loaded.set(p, module);
    // eslint-disable-next-line no-new-func
    new Function('use', 'exports', 'module', 'Noodl', 'window', 'document', sources[p] + '\n//# sourceURL=scripts/' + p)(load, module.exports, module, undefined, undefined, undefined);
    return module.exports;
  };
  const entry = { sources, load };
  projects.set(project, entry);
  return entry;
}

/** The component's one Function node: its own text and its Uses. */
function functionOf(project, component) {
  const raw = JSON.parse(fs.readFileSync(path.join(project, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  const nodes = Array.isArray(raw) ? raw : raw.nodes || Object.values(raw);
  const fn = nodes.find((n) => n.type === 'JavaScriptFunction');
  if (!fn) throw new Error(`${component} has no Function`);
  const params = fn.parameters || {};
  return { body: String(params.functionScript || ''), uses: usesOf(params.uses) };
}

/** The Function's text with each file it uses in front of it, for reading a constant out of. */
function functionText(project, component) {
  const { body, uses } = functionOf(project, component);
  const { sources } = sourcesOf(project);
  return [...uses.map((p) => sources[p] || ''), body].join('\n');
}

/** Run the Function as the page runs it: `Inputs` (a fresh copy), `Outputs`, `Scripts`; then `tail` in its scope. */
function runFunction(project, component, inputs, tail = '', out = {}) {
  const { body, uses } = functionOf(project, component);
  const { load } = sourcesOf(project);
  const scripts = {};
  const names = [];
  for (const p of uses) {
    scripts[alias(p)] = load(p);
    names.push(`var { ${Object.keys(scripts[alias(p)]).join(', ')} } = Scripts.${alias(p)};`);
  }
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', 'Scripts', names.join('\n') + '\n' + body + tail)(JSON.parse(JSON.stringify(inputs)), out, scripts);
  return out;
}

module.exports = { functionText, runFunction, functionOf, sourcesOf, normalizeScriptPath, usesOf };
