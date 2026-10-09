/**
 * The ports a Function node's script names (P109 ISL-006).
 *
 * A Function's ports are its written lists (`scriptInputs` / `scriptOutputs`), the names its code uses, and any
 * port saved on the node. This module is the second of those: what `Inputs.x` / `Outputs.y` in the code make. It
 * is the one implementation the runtime's Function node, the editor and the agent's door (`cloudDynamicPorts.ts`),
 * the exporter (`jsfun.ts`) and the code editor's completion import. Until ISL-006 there were six copies.
 *
 * ## What changed from `javascriptnodeparser.js` (ruling 3, "Fix all three", 2026-10-05)
 *
 * - `Outputs.do_it()` is a signal. The old signal pattern had no `_`, so the name fell through to the value
 *   pattern, the port was `*`, and the call threw "Outputs.do_it is not a function".
 * - `Inputs["first name"]` is an input. The old pattern made it `plug: 'inputs'` (plural), which the editor does
 *   not offer as an input. Its name also stops at its own quote: `Inputs["a"] + Inputs["b"]` on one line was one
 *   port named `a"] + Inputs["b`. The bracket signal form gets the same fix.
 * - A name inside a comment makes no port. The old reader's comment strip was commented out, so
 *   `// Outputs.old = x` left a port behind. {@link stripScriptComments} keeps strings, template literals and
 *   regular expressions, because a plain `//.*` strip eats the code after the `//` in a URL string.
 *
 * Nothing else moved: a regular `Outputs["y"]` is still double quotes only, and `Outputs[key]` still makes no port
 * (the written list is the way to name one).
 *
 * 🔴 **Only the Function node reads this.** The Script node, Query Records' JavaScript filter, the cloud Aggregate
 * node and the deprecated collection node still call `JavascriptNodeParser.parseAndAddPortsFromScript`, unchanged:
 * the ruling and its census covered Functions only.
 *
 * Old projects keep their wires: {@link planFunctionPortFixUp} finds each wired port the old reader made and this one
 * does not, and the editor writes it onto that Function's list when the project opens (AC10).
 */

/** The Function node's type name. */
export const FUNCTION_NODE_TYPE = 'JavaScriptFunction';

/**
 * What a script's code names, by display name (no `in-` / `out-` prefix). Each list is in the old reader's order: every
 * dot form (`Inputs.x`) first, then every bracket form, each in the order it appears.
 */
export interface FunctionScriptPortNames {
  /** `Inputs.x`, `Inputs['x']`, `Inputs["x"]`. */
  inputs: string[];
  /** `Outputs.x()`, `Outputs['x']()`, `Outputs["x"]()`. Never also in {@link outputs}. */
  signals: string[];
  /** `Outputs.x`, `Outputs["x"]`, less every name already in {@link signals}. */
  outputs: string[];
}

// A bracket name is `'…'` or `"…"`, captured by whichever group matched.
const INPUT_PATTERNS: readonly RegExp[] = [/Inputs\.([A-Za-z0-9_]+)/g, /Inputs\s*\[\s*(?:'([^'\n]*)'|"([^"\n]*)")\s*\]/g];
const SIGNAL_PATTERNS: readonly RegExp[] = [
  /Outputs\.([A-Za-z0-9_]+)\s*\(\s*\)/g,
  /Outputs\s*\[\s*(?:'([^'\n]*)'|"([^"\n]*)")\s*\]\(\s*\)/g
];
const OUTPUT_PATTERNS: readonly RegExp[] = [/Outputs\.([A-Za-z0-9_]+)/g, /Outputs\s*\[\s*"([^"]*)"\s*\]/g];

function collect(source: string, patterns: readonly RegExp[], into: string[], skip?: readonly string[]): void {
  for (const pattern of patterns) {
    // A fresh RegExp per call: `lastIndex` on a shared /g literal would make the second script a different answer.
    // An exec loop, not `for…of matchAll`: the viewer compiles this file at ES5, where that loop reads `.length`
    // off an iterator and runs zero times (ISL-006 s20: every Function in the editor's preview lost its ports).
    const re = new RegExp(pattern.source, pattern.flags);
    for (let match = re.exec(source); match; match = re.exec(source)) {
      const name = match[1] ?? match[2];
      if (!name || into.includes(name) || (skip && skip.includes(name))) continue;
      into.push(name);
    }
  }
}

/** The port names a Function's script makes. */
export function functionScriptPortNames(script: unknown): FunctionScriptPortNames {
  const names: FunctionScriptPortNames = { inputs: [], signals: [], outputs: [] };
  if (typeof script !== 'string' || script.length === 0) return names;
  const code = stripScriptComments(script);
  collect(code, INPUT_PATTERNS, names.inputs);
  collect(code, SIGNAL_PATTERNS, names.signals);
  collect(code, OUTPUT_PATTERNS, names.outputs, names.signals);
  return names;
}

/** After one of these, a `/` starts a regular expression, not a division. */
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_AFTER_WORD = /(?:^|[^\w$])(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

function regexCanStart(before: string): boolean {
  const text = before.replace(/\s+$/, '');
  if (text.length === 0) return true;
  return REGEX_AFTER.has(text[text.length - 1]) || REGEX_AFTER_WORD.test(text);
}

/**
 * The script with its comments blanked: `//` to the end of the line, and `/* … *\/` with its newlines kept.
 *
 * Strings (`'…'`, `"…"`), template literals (with `${…}` nested to any depth) and regular expression literals are
 * copied as they are, so a `//` inside `"https://…"` or `/https?:\/\//` is not a comment. Whether a `/` starts a
 * regular expression is read from the token before it, the usual rule. It is a reader for port names, not a
 * JavaScript parser: on code that does not parse it still returns text, never throws.
 */
export function stripScriptComments(source: string): string {
  let out = '';
  let i = 0;
  const n = source.length;
  // Open template literals ('`') and the `${` / `{` braces inside them.
  const stack: string[] = [];
  while (i < n) {
    const c = source[i];
    const d = source[i + 1];
    if (stack.length > 0 && stack[stack.length - 1] === '`') {
      if (c === '\\') {
        out += source.slice(i, i + 2);
        i += 2;
      } else if (c === '`') {
        stack.pop();
        out += c;
        i++;
      } else if (c === '$' && d === '{') {
        stack.push('{');
        out += '${';
        i += 2;
      } else {
        out += c;
        i++;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && source[j] !== c && source[j] !== '\n') j += source[j] === '\\' ? 2 : 1;
      out += source.slice(i, j + 1);
      i = j + 1;
    } else if (c === '`') {
      stack.push('`');
      out += c;
      i++;
    } else if (c === '{' && stack.length > 0) {
      stack.push('{');
      out += c;
      i++;
    } else if (c === '}' && stack.length > 0 && stack[stack.length - 1] === '{') {
      stack.pop();
      out += c;
      i++;
    } else if (c === '/' && d === '/') {
      while (i < n && source[i] !== '\n') i++;
    } else if (c === '/' && d === '*') {
      const close = source.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      out += source.slice(i, end).replace(/[^\n]/g, ' ');
      i = end;
    } else if (c === '/' && regexCanStart(out)) {
      let j = i + 1;
      let inClass = false;
      while (j < n && source[j] !== '\n') {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        else if (source[j] === '/' && !inClass) break;
        j++;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/**
 * The reader as it was before ISL-006, frozen: `javascriptnodeparser.js` `parseAndAddPortsFromScript`, comments
 * read, no `_` in the signal pattern, greedy brackets, `Inputs["x"]` counted as an input here because it was named
 * like one. Used only to find the ports an old project relied on; never to make a port.
 */
export function legacyFunctionScriptPortNames(script: unknown): FunctionScriptPortNames {
  const names: FunctionScriptPortNames = { inputs: [], signals: [], outputs: [] };
  if (typeof script !== 'string' || script.length === 0) return names;
  collect(script, [/Inputs\.([A-Za-z0-9_]+)/g, /Inputs\s*\[\s*(?:'|")(.*)(?:'|")\s*\]/g], names.inputs);
  collect(script, [/Outputs\.([A-Za-z0-9]+)\s*\(\s*\)/g, /Outputs\s*\[\s*(?:'|")(.*)(?:'|")\s*\]\(\s*\)/g], names.signals);
  collect(script, [/Outputs\.([A-Za-z0-9_]+)/g, /Outputs\s*\[\s*"([^"]*)"\s*\]/g], names.outputs, names.signals);
  return names;
}

// ── AC10: the on-open fix-up ────────────────────────────────────────────────

/** A node as it appears in a saved component's `graph.roots` (children nested). */
export interface FunctionPortNodeLike {
  id: string;
  type: string;
  label?: string;
  parameters?: Record<string, unknown>;
  ports?: { name?: string }[];
  children?: FunctionPortNodeLike[];
}

export interface FunctionPortConnectionLike {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}

export interface FunctionPortComponentLike {
  name?: string;
  graph?: { roots?: FunctionPortNodeLike[]; connections?: FunctionPortConnectionLike[] };
}

export interface FunctionPortProjectLike {
  components?: FunctionPortComponentLike[];
}

/** One name the fix-up writes onto a Function's list. */
export interface FunctionPortFixUpWrite {
  component: string;
  nodeId: string;
  nodeLabel?: string;
  list: 'scriptInputs' | 'scriptOutputs';
  /** The display name: the port is `in-<name>` or `out-<name>`. */
  name: string;
  /** Set for a signal the old reader made, so it stays a signal: written as `outtype-<name>`. */
  type?: 'signal';
}

function listLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => (row && typeof row === 'object' ? (row as { label?: unknown }).label : undefined))
    .filter((label): label is string => typeof label === 'string');
}

/** Every node, `children` recursed into only when a child is an object: in the v2 files `children` holds id strings. */
function eachNode(roots: readonly FunctionPortNodeLike[] | undefined, visit: (node: FunctionPortNodeLike) => void): void {
  for (const node of roots ?? []) {
    if (!node || typeof node !== 'object') continue;
    visit(node);
    eachNode(node.children, visit);
  }
}

/**
 * The wired Function ports an old project relied on that the new reader no longer makes.
 *
 * A port qualifies when a connection names it, the old reader made it, the new one does not, and it is neither on
 * the node's list nor saved on the node (either of which keeps it on its own). In practice that is a name only a
 * comment mentioned, or a greedy bracket name. A port nobody wired is left to go: it carried nothing.
 */
export function planFunctionPortFixUp(project: FunctionPortProjectLike): FunctionPortFixUpWrite[] {
  const writes: FunctionPortFixUpWrite[] = [];
  for (const component of project.components ?? []) {
    const connections = component.graph?.connections ?? [];
    eachNode(component.graph?.roots, (node) => {
      if (node.type !== FUNCTION_NODE_TYPE) return;
      const parameters = node.parameters ?? {};
      const fresh = functionScriptPortNames(parameters.functionScript);
      const old = legacyFunctionScriptPortNames(parameters.functionScript);
      const saved = new Set((node.ports ?? []).map((p) => p.name));
      const ends: { list: 'scriptInputs' | 'scriptOutputs'; port: string; prefix: string }[] = [];
      for (const c of connections) {
        if (c.toId === node.id) ends.push({ list: 'scriptInputs', port: c.toProperty, prefix: 'in-' });
        if (c.fromId === node.id) ends.push({ list: 'scriptOutputs', port: c.fromProperty, prefix: 'out-' });
      }
      const listed = { scriptInputs: listLabels(parameters.scriptInputs), scriptOutputs: listLabels(parameters.scriptOutputs) };
      const seen = new Set<string>();
      for (const { list, port, prefix } of ends) {
        if (typeof port !== 'string' || !port.startsWith(prefix)) continue;
        const name = port.slice(prefix.length);
        const key = list + ':' + name;
        if (name.length === 0 || seen.has(key)) continue;
        seen.add(key);
        if (listed[list].includes(name) || saved.has(port)) continue;
        const input = list === 'scriptInputs';
        const madeBefore = input ? old.inputs.includes(name) : old.signals.includes(name) || old.outputs.includes(name);
        const madeNow = input ? fresh.inputs.includes(name) : fresh.signals.includes(name) || fresh.outputs.includes(name);
        if (!madeBefore || madeNow) continue;
        writes.push({
          component: component.name ?? '',
          nodeId: node.id,
          nodeLabel: node.label,
          list,
          name,
          ...(!input && old.signals.includes(name) ? { type: 'signal' as const } : {})
        });
      }
    });
  }
  return writes;
}

/** Plan and write: each name becomes a list row (`{ id, label }`), and a signal keeps its type. Idempotent. */
export function applyFunctionPortFixUp(project: FunctionPortProjectLike): FunctionPortFixUpWrite[] {
  const writes = planFunctionPortFixUp(project);
  if (writes.length === 0) return writes;
  const byNode = new Map<string, FunctionPortFixUpWrite[]>();
  for (const write of writes) {
    const key = write.component + '\u0000' + write.nodeId;
    byNode.set(key, [...(byNode.get(key) ?? []), write]);
  }
  for (const component of project.components ?? []) {
    eachNode(component.graph?.roots, (node) => {
      const mine = byNode.get((component.name ?? '') + '\u0000' + node.id);
      if (!mine) return;
      const parameters = (node.parameters = node.parameters ?? {});
      for (const write of mine) {
        const rows = Array.isArray(parameters[write.list]) ? [...(parameters[write.list] as { id?: unknown }[])] : [];
        const ids = new Set(rows.map((row) => row?.id));
        let id = write.name;
        for (let k = 2; ids.has(id); k++) id = `${write.name}-${k}`;
        rows.push({ id, label: write.name } as never);
        parameters[write.list] = rows;
        if (write.type === 'signal') parameters['outtype-' + write.name] = 'signal';
      }
    });
  }
  return writes;
}

/** What a person reads when the project opens: one sentence, then one per place a port was kept. Empty when nothing was written. */
export function describeFunctionPortFixUp(writes: readonly FunctionPortFixUpWrite[]): string[] {
  if (writes.length === 0) return [];
  const one = writes.length === 1;
  const lines = [
    `A name inside a code comment no longer makes a Function port. ${writes.length} wired ${one ? 'port' : 'ports'} ` +
      `made that way ${one ? 'was' : 'were'} added to ${one ? 'its' : 'their'} Function's port list. ${one ? 'Its wire' : 'Their wires'} still ${one ? 'works' : 'work'}.`
  ];
  // One sentence per component and set of kept ports, naming ports as the node shows them (s20: the first version
  // wrote "a Function in /X keeps in-reps." per port, so two Functions in one component read as a duplicate line).
  // Arrays, not a Map's iterator: the viewer compiles this file at ES5, where `for…of` over an iterator runs zero times.
  const nodes: FunctionPortFixUpWrite[][] = [];
  for (const w of writes) {
    const mine = nodes.find((n) => n[0].component === w.component && n[0].nodeId === w.nodeId);
    if (mine) mine.push(w);
    else nodes.push([w]);
  }
  const sentences: { component: string; label?: string; kept: string; functions: number }[] = [];
  for (const nodeWrites of nodes) {
    const { component, nodeLabel } = nodeWrites[0];
    const kept = keptPorts(nodeWrites);
    const same = sentences.find((s) => s.component === component && s.label === nodeLabel && s.kept === kept);
    if (same) same.functions++;
    else sentences.push({ component, label: nodeLabel, kept, functions: 1 });
  }
  const shown = sentences.slice(0, 6);
  for (const s of shown) {
    const named = s.label ? ` called "${s.label}"` : '';
    const who = s.functions === 1 ? (s.label ? `"${s.label}" keeps` : 'a Function keeps') : `${s.functions} Functions${named} keep`;
    lines.push(`In ${s.component || 'the project'}, ${who} ${s.kept}.`);
  }
  const hidden = sentences.slice(shown.length).reduce((n, s) => n + s.functions, 0);
  if (hidden > 0) lines.push(`${hidden} more ${hidden === 1 ? 'Function keeps its' : 'Functions keep theirs'} the same way.`);
  return lines;
}

/** "the input id and the output Done", "the outputs NoodlObject and Done": the names a person sees on the node. */
function keptPorts(writes: readonly FunctionPortFixUpWrite[]): string {
  const inputs = writes.filter((w) => w.list === 'scriptInputs').map((w) => w.name);
  const outputs = writes.filter((w) => w.list === 'scriptOutputs').map((w) => w.name);
  const phrase = (kind: string, names: string[]) =>
    names.length === 0 ? '' : `the ${kind}${names.length === 1 ? '' : 's'} ${andList(names)}`;
  return [phrase('input', inputs), phrase('output', outputs)].filter(Boolean).join(' and ');
}

function andList(names: readonly string[]): string {
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
