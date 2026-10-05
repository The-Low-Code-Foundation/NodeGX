#!/usr/bin/env node
/**
 * P109 ISL-006 census (s19). For every JavaScriptFunction in the projects under the given directories (both formats:
 * v2 `components/` and legacy `project.json`, plus catalog example files), using the runtime's OWN
 * `parseAndAddPortsFromScript` (sliced from javascriptnodeparser.js and evaluated alone):
 *   - AC4 / D80: prefixed wire endpoints naming a port neither the written list nor the code makes (and whether a saved
 *     port keeps it alive in the editor);
 *   - AC5: the reader's quirks — underscore signals, Inputs["x"], names only inside comments (and whether wired), computed
 *     keys (Outputs[k]), greedy bracket names.
 * Comments are stripped with a string-, template- and regex-aware stripper: a plain `//.*` strip eats the code after a
 * `//` inside a URL string, and gave a wrong count (6, 5 wired) the first time.
 *
 * Usage: node isl006-census.js <dir>...   (s19: templates library docs/node-catalog/examples, run from the repo root)
 */
// ISL-006 AC4 + AC5 census. Uses the runtime's own parseAndAddPortsFromScript, sliced from source.
const fs = require('fs'), path = require('path');

// String-aware comment stripper. Keeps strings, template literals (with ${} nesting) and regex literals verbatim;
// blanks // and /* */ comments (newlines kept).
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_KEYWORDS = /(?:^|[^\w$])(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;
function regexAllowed(out) {
  const t = out.replace(/\s+$/, '');
  if (t.length === 0) return true;
  const last = t[t.length - 1];
  if (REGEX_AFTER.has(last)) return true;
  return REGEX_KEYWORDS.test(t);
}
function stripComments(src) {
  let out = '', i = 0;
  const n = src.length, stack = [];
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (stack.length && stack[stack.length - 1] === '`') {
      if (c === '\\') { out += c + (d ?? ''); i += 2; continue; }
      if (c === '`') { stack.pop(); out += c; i++; continue; }
      if (c === '$' && d === '{') { stack.push('{'); out += '${'; i += 2; continue; }
      out += c; i++; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '`') { stack.push('`'); out += c; i++; continue; }
    if (c === '{' && stack.length) { stack.push('{'); out += c; i++; continue; }
    if (c === '}' && stack.length && stack[stack.length - 1] === '{') { stack.pop(); out += c; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e === -1 ? n : e + 2;
      out += src.slice(i, end).replace(/[^\n]/g, ' '); i = end; continue;
    }
    if (c === '/' && regexAllowed(out)) {
      let j = i + 1, cls = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break;
        j++;
      }
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

const ROOT = path.join(__dirname, '..', '..', '..');
const src = fs.readFileSync(ROOT + '/packages/noodl-runtime/src/javascriptnodeparser.js', 'utf8');
const start = src.indexOf('JavascriptNodeParser.parseAndAddPortsFromScript = function');
const end = src.indexOf('JavascriptNodeParser.prototype.getPorts');
const JavascriptNodeParser = {}; eval(src.slice(start, end));
const parse = JavascriptNodeParser.parseAndAddPortsFromScript;

function portsOf(node) {
  const p = node.parameters || {}; const ports = [];
  for (const s of p.scriptOutputs || []) if (s && s.label) ports.push({ name: 'out-' + s.label, plug: 'output', type: p['outtype-' + s.label] || '*', from: 'list' });
  for (const s of p.scriptInputs || []) if (s && s.label) ports.push({ name: 'in-' + s.label, plug: 'input', type: p['intype-' + s.label] || 'string', from: 'list' });
  const n = ports.length;
  if (typeof p.functionScript === 'string') parse(p.functionScript, ports, { inputPrefix: 'in-', outputPrefix: 'out-' });
  ports.slice(n).forEach((x) => (x.from = 'code'));
  return ports;
}

const projects = [];
function walk(dir, depth) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  if (ents.some((e) => e.name === 'project.json' || e.name === 'nodegx.project.json')) { projects.push(dir); return; }
  for (const e of ents) if (e.isFile() && e.name.endsWith('.json') && dir.includes('node-catalog/examples')) projects.push(path.join(dir, e.name));
  if (depth <= 0) return;
  for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'noodl_modules' && !e.name.startsWith('.')) walk(path.join(dir, e.name), depth - 1);
}
for (const t of process.argv.slice(2)) walk(t, 4);

// yield {component, nodes(flat), connections}
function* components(proj) {
  const cdir = path.join(proj, 'components');
  if (!proj.endsWith('.json') && fs.existsSync(cdir)) {
    const stack = [cdir];
    while (stack.length) {
      const d = stack.pop();
      for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) stack.push(path.join(d, e.name));
      if (fs.existsSync(path.join(d, 'nodes.json'))) {
        try {
          const n = JSON.parse(fs.readFileSync(path.join(d, 'nodes.json'), 'utf8'));
          const c = fs.existsSync(path.join(d, 'connections.json')) ? JSON.parse(fs.readFileSync(path.join(d, 'connections.json'), 'utf8')) : { connections: [] };
          const flat = []; (function f(a) { for (const x of a || []) { flat.push(x); f(x.children); } })(n.nodes);
          yield { component: path.relative(cdir, d), nodes: flat, connections: c.connections || [] };
        } catch (e) {}
      }
    }
    return;
  }
  try {
    const j = JSON.parse(fs.readFileSync(proj.endsWith('.json') ? proj : path.join(proj, 'project.json'), 'utf8'));
    for (const comp of j.components || []) {
      const flat = []; (function f(a) { for (const x of a || []) { flat.push(x); f(x.children); } })(comp.graph && comp.graph.roots);
      yield { component: comp.name, nodes: flat, connections: (comp.graph && comp.graph.connections) || [] };
    }
  } catch (e) {}
}

const T = { projects: 0, functions: 0, withList: 0, listPorts: 0, listTyped: 0, endpoints: 0, deadWires: 0, deadInSaved: 0, deadVarScript: 0,
  q_underscoreSignal: 0, q_bracketInputs: 0, q_commentOnly: 0, q_varIndex: 0, q_greedyBracket: 0, bothListAndCode: 0, codeTypeWouldDiffer: 0 };
const hits = [], quirks = { underscoreSignal: [], bracketInputs: [], commentOnly: [], varIndex: [], greedy: [] };
for (const proj of projects) {
  T.projects++;
  for (const { component, nodes, connections } of components(proj)) {
    for (const node of nodes) {
      if (node.type !== 'JavaScriptFunction') continue;
      T.functions++;
      const p = node.parameters || {}; const script = typeof p.functionScript === 'string' ? p.functionScript : '';
      const where = path.relative(process.cwd(), proj) + ' :: ' + component + ' :: ' + (node.label || node.id);
      if ((p.scriptOutputs || []).length || (p.scriptInputs || []).length) { T.withList++; T.listPorts += (p.scriptOutputs || []).length + (p.scriptInputs || []).length; }
      for (const s of p.scriptOutputs || []) if (p['outtype-' + s.label]) T.listTyped++;
      for (const s of p.scriptInputs || []) if (p['intype-' + s.label]) T.listTyped++;
      for (const s of p.scriptOutputs || []) if (s.label && new RegExp('Outputs\\.' + s.label + '\\b').test(script)) T.bothListAndCode++;
      // quirks (AC5)
      const us = [...script.matchAll(/Outputs\.([A-Za-z0-9]*_[A-Za-z0-9_]*)\s*\(\s*\)/g)].map((m) => m[1]);
      if (us.length) { T.q_underscoreSignal++; quirks.underscoreSignal.push(where + ' ' + us.join(',')); }
      const bi = [...script.matchAll(/Inputs\s*\[\s*(?:'|")(.*)(?:'|")\s*\]/g)].map((m) => m[1]);
      if (bi.length) { T.q_bracketInputs++; quirks.bracketInputs.push(where + ' ' + bi.join(',')); }
      if (bi.some((n) => /['"\]]/.test(n))) { T.q_greedyBracket++; quirks.greedy.push(where); }
      const stripped = stripComments(script);
      const all = portsOf(node).filter((x) => x.from === 'code'); const allS = portsOf({ parameters: { functionScript: stripped } });
      const commentOnly = all.filter((x) => !allS.some((y) => y.name === x.name && y.plug === x.plug)).map((x) => x.name);
      if (commentOnly.length) {
        T.q_commentOnly++;
        const wired = commentOnly.filter((nm) => connections.some((c) => (c.toId === node.id && c.toProperty === nm) || (c.fromId === node.id && c.fromProperty === nm)));
        quirks.commentOnly.push(where + ' ' + commentOnly.join(',') + ' wired=' + (wired.join(',') || 'none'));
      }
      const varIdx = /(?:Inputs|Outputs)\s*\[\s*(?!['"])/.test(script);
      if (varIdx) { T.q_varIndex++; quirks.varIndex.push(where); }
      // D80 (AC4): wires to in-/out- that neither list nor code makes
      const ports = portsOf(node); const saved = new Set((node.ports || []).map((x) => x.name));
      for (const c of connections) {
        for (const [id, prop, plug, pre] of [[c.toId, c.toProperty, 'input', 'in-'], [c.fromId, c.fromProperty, 'output', 'out-']]) {
          if (id !== node.id || typeof prop !== 'string' || !prop.startsWith(pre)) continue;
          T.endpoints++;
          if (ports.some((x) => x.name === prop && (x.plug === plug || x.plug === 'inputs'))) continue;
          T.deadWires++; if (saved.has(prop)) T.deadInSaved++; if (varIdx) T.deadVarScript++;
          hits.push(where + ' :: ' + prop + (saved.has(prop) ? ' [in saved ports]' : '') + (varIdx ? ' [var-index script]' : ''));
        }
      }
    }
  }
}
console.log(JSON.stringify(T, null, 1));
console.log('--- dead wires (' + hits.length + ')'); hits.forEach((h) => console.log('  ' + h));
for (const k of Object.keys(quirks)) { console.log('--- ' + k + ' (' + quirks[k].length + ')'); quirks[k].forEach((h) => console.log('  ' + h.slice(0, 220))); }
