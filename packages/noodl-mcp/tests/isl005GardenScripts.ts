/**
 * P109 ISL-005 slice 6 — Olive's Island's shared code as script files.
 *
 * The garden's Functions were each handed a pasted copy of the blocks they need (the engine alone, 96 KB, in 23 of
 * them). Here each block becomes one file in the project's `scripts/` folder, and a Function that carried a block
 * lists the file under Uses and opens with `var { … } = Scripts.<file>;` for the names it reaches. The block texts
 * stay where they are written (`cg002Scripts.ts` and its neighbours), so a fix is still made in one place, and the
 * artefact now holds one copy too.
 *
 * Names are read by scope (`eslint-scope`), never by text: a body gets exactly the free names it reaches, a file gets
 * `use()` for the names another file declares, and {@link gardenSharingHazards} lists every case where moving a block
 * out of the Function's own scope could change what a name means (a body re-declaring a block's name, two blocks
 * declaring one name, a block reaching a name only a body declares, a cycle between files). The gate asserts that
 * list is empty, so a block grown later in a way the shared form cannot carry stops the build instead of shipping.
 *
 * `runScript` (`cg002Scripts.ts`) runs every script through {@link shareScript} and the runtime's own `ScriptFiles`,
 * so the generator's tests grade the form the artefact runs (ISL-005 trap §7), and a block's top-level values are one
 * instance across every run, as they are on a page.
 *
 * @module noodl-mcp/tests/isl005GardenScripts
 */
import * as acorn from 'acorn';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { analyze } = require('eslint-scope') as { analyze: (ast: unknown, options: Record<string, unknown>) => ScopeManager };

import { ScriptFiles, scriptAlias } from '@noodl/runtime/src/scriptfiles';

interface Reference {
  identifier: { name: string };
}
interface Variable {
  name: string;
  defs: Array<{ type: string }>;
}
interface Scope {
  through: Reference[];
  variables: Variable[];
  childScopes: Scope[];
}
interface ScopeManager {
  globalScope: Scope;
}

/** One shared block and the file it becomes (`scripts/<file>`). */
export interface GardenBlock {
  file: string;
  text: string;
}

/** What a Function's body is compiled with (`simplejavascript.ts` `parseScript`). */
const FUNCTION_PARAMS = ['Inputs', 'Outputs', 'Noodl', 'Component', 'Scripts'];
/** What a script file is compiled with (`scriptfiles.ts`). */
const FILE_PARAMS = ['use', 'exports', 'module', 'Noodl', 'window', 'document'];

let blocks: GardenBlock[] | undefined;

/**
 * The blocks, most inclusive first, read lazily: `cg002Scripts.ts` reaches this module from `runScript`, so reading
 * them at import would see its constants before they exist.
 */
export function gardenBlocks(): GardenBlock[] {
  if (blocks) return blocks;
  /* eslint-disable @typescript-eslint/no-var-requires */
  const s2 = require('./cg002Scripts') as Record<string, string>;
  const s3 = require('./cg003Scripts') as Record<string, string>;
  const olive = require('./cg005Olive') as Record<string, string>;
  const island = require('./ig004Island') as Record<string, string>;
  /* eslint-enable @typescript-eslint/no-var-requires */
  if (!island.ISLAND_ENGINE.startsWith(s2.ENGINE)) throw new Error('ISLAND_ENGINE no longer starts with ENGINE; island.js cannot be cut from it');
  blocks = [
    { file: 'engine.js', text: s2.ENGINE },
    { file: 'island.js', text: island.ISLAND_ENGINE.slice(s2.ENGINE.length) },
    { file: 'save.js', text: s2.SAVE_HELPERS },
    { file: 'fold.js', text: s2.FOLD_HELPERS },
    { file: 'olive.js', text: olive.OLIVE_HELPERS },
    { file: 'words.js', text: s3.WORD_HELPER },
    { file: 'requests.js', text: s2.IWL_REQUEST_HELPERS }
  ];
  for (const b of blocks) if (typeof b.text !== 'string' || !b.text.trim()) throw new Error(`the ${b.file} block is empty`);
  return blocks;
}

// ── Reading names by scope ──────────────────────────────────────────────────

interface ScopeReading {
  /** Names the code reaches that it does not declare (globals, a block's names, a typo). */
  free: Set<string>;
  /** Names declared at the code's own top level (its `var`s and `function`s, and top-level `let`/`const`/`class`). */
  declared: Set<string>;
}

const readings = new Map<string, ScopeReading>();

/** Read `code` as the body of a function taking `params`, as the runtime compiles it. */
function readScope(code: string, params: readonly string[]): ScopeReading {
  const key = params.join(',') + '\n' + code;
  const known = readings.get(key);
  if (known) return known;
  const wrapped = `(async function (${params.join(', ')}) {\n${code}\n})`;
  const ast = acorn.parse(wrapped, { ecmaVersion: 2022, sourceType: 'script', ranges: true });
  const manager = analyze(ast, { ecmaVersion: 2022, sourceType: 'script', fallback: 'iteration' });
  const fnScope = manager.globalScope.childScopes[0];
  const declared = new Set<string>();
  const collect = (scope: Scope) => {
    for (const v of scope.variables) if (v.name !== 'arguments' && !v.defs.every((d) => d.type === 'Parameter')) declared.add(v.name);
  };
  collect(fnScope);
  // Top-level `let`/`const`/`class` live in the body's block scope under some analysers.
  for (const child of fnScope.childScopes) if ((child as unknown as { type: string }).type === 'block') collect(child);
  const reading = { free: new Set(manager.globalScope.through.map((r) => r.identifier.name)), declared };
  readings.set(key, reading);
  return reading;
}

function blockReading(b: GardenBlock): ScopeReading {
  return readScope(b.text, FILE_PARAMS);
}

/** The file that declares `name` among `candidates`, or undefined. */
function providerOf(name: string, candidates: readonly GardenBlock[]): GardenBlock | undefined {
  return candidates.find((b) => blockReading(b).declared.has(name));
}

// ── The files ───────────────────────────────────────────────────────────────

/** `var { a, b, … } = <from>;`, wrapped at about 110 columns. */
function destructure(names: readonly string[], from: string): string {
  const lines: string[] = [];
  let line = 'var { ';
  names.forEach((n, i) => {
    const piece = n + (i < names.length - 1 ? ', ' : '');
    if (line.length + piece.length > 110 && line !== 'var { ') {
      lines.push(line.trimEnd());
      line = '  ';
    }
    line += piece;
  });
  lines.push(line + ` } = ${from};`);
  return lines.join('\n');
}

/** `exports.a = a; exports.b = b; …`, the form the editor and the door read a file's Gives from. */
function exportLines(names: readonly string[]): string {
  const lines: string[] = [];
  let line = '';
  for (const n of names) {
    const piece = `exports.${n} = ${n};`;
    if (line && line.length + piece.length + 1 > 110) {
      lines.push(line);
      line = '';
    }
    line += (line ? ' ' : '') + piece;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

/** The names a file reaches from the other files, grouped by the file that declares each. */
function fileDependencies(b: GardenBlock): Map<GardenBlock, string[]> {
  const others = gardenBlocks().filter((o) => o !== b);
  const deps = new Map<GardenBlock, string[]>();
  for (const name of [...blockReading(b).free].sort()) {
    const from = providerOf(name, others);
    if (from) deps.set(from, [...(deps.get(from) ?? []), name]);
  }
  return deps;
}

let sources: Record<string, string> | undefined;

/** `scripts/<file>` → its text: a `use()` line per file it reaches, the block as written, then what it gives. */
export function gardenScriptSources(): Record<string, string> {
  if (sources) return sources;
  sources = {};
  for (const b of gardenBlocks()) {
    const head = [...fileDependencies(b)].map(([from, names]) => destructure(names, `use('${scriptAlias(from.file)}')`));
    const gives = [...blockReading(b).declared].sort();
    sources[b.file] = [
      ...(head.length ? [...head, ''] : []),
      b.text.replace(/^\n+/, '').replace(/\s+$/, ''),
      '',
      `// What this file gives: Scripts.${/* template-gate: comment ok */ scriptAlias(b.file)}.<name> in a Function, use('${/* template-gate: comment ok */ scriptAlias(b.file)}') in another file.`,
      exportLines(gives),
      ''
    ].join('\n');
  }
  return sources;
}

// ── A Function's script ─────────────────────────────────────────────────────

export interface SharedScript {
  /** The body as the artefact carries it. Unchanged when the script holds no block. */
  script: string;
  /** The files it lists under Uses, as the editor stores them (`engine.js`). */
  uses: string[];
  /** The blocks taken out, in the order they stood. */
  blocks: GardenBlock[];
}

const shared = new Map<string, SharedScript>();

/**
 * Take every whole block out of a Function's script and reach it through `Scripts` instead — only where that is the
 * same program. A script stays whole when its body declares a name a block declares (in one scope the body's won for
 * the block's own calls too; a mutant that redefines an engine function means exactly that), and a block stays in the
 * script when a file it `use()`s is not also taken out of it (a mutant that edits the engine must not have its island
 * code call the file's unedited engine). The artefact's gate asserts neither case occurs in a real script.
 */
export function shareScript(script: string): SharedScript {
  const known = shared.get(script);
  if (known) return known;
  const unchanged = { script, uses: [], blocks: [] };
  let candidates = gardenBlocks().filter((b) => script.includes(b.text));
  for (;;) {
    const kept = candidates.filter((b) => [...fileDependencies(b).keys()].every((dep) => candidates.includes(dep)));
    if (kept.length === candidates.length) break;
    candidates = kept;
  }
  let body = script;
  const found: Array<{ at: number; block: GardenBlock }> = [];
  for (const b of candidates) {
    const at = body.indexOf(b.text);
    if (at < 0) continue;
    found.push({ at: script.indexOf(b.text), block: b });
    body = body.slice(0, at) + body.slice(at + b.text.length);
  }
  const own = found.length ? readScope(body, FUNCTION_PARAMS).declared : new Set<string>();
  if (!found.length || found.some((f) => [...blockReading(f.block).declared].some((n) => own.has(n)))) {
    shared.set(script, unchanged);
    return unchanged;
  }
  // Later blocks win a name, as the later declaration did when they shared one scope (the gate refuses any such name).
  const used = found.sort((a, b) => a.at - b.at).map((f) => f.block);
  const byFile = new Map<GardenBlock, string[]>();
  for (const name of [...readScope(body, FUNCTION_PARAMS).free].sort()) {
    const from = [...used].reverse().find((b) => blockReading(b).declared.has(name));
    if (from) byFile.set(from, [...(byFile.get(from) ?? []), name]);
  }
  const head = used.filter((b) => byFile.has(b)).map((b) => destructure(byFile.get(b)!, `Scripts.${scriptAlias(b.file)}`));
  const result: SharedScript = {
    script: [...head, body.replace(/^\n+/, '')].join('\n'),
    uses: used.map((b) => b.file),
    blocks: used
  };
  shared.set(script, result);
  return result;
}

// ── What could change meaning ───────────────────────────────────────────────

export interface SharingHazard {
  kind: 'body-redeclares' | 'two-blocks-declare' | 'block-reaches-body' | 'cycle' | 'block-holds-block' | 'not-shared';
  where: string;
  names: string[];
}

/**
 * Every place where moving the blocks out of the Function's scope could change what a name means. Empty is the
 * precondition for the shared form being the same program.
 *
 * - `body-redeclares`: a body declares a name a block it used declares. In one scope the body's won for the block's
 *   own calls too; in a file the block keeps calling its own.
 * - `two-blocks-declare`: two blocks one Function uses declare one name; in one scope the later won everywhere.
 * - `block-reaches-body`: a block reaches a free name a body (and no file) declares; in a file that name is undefined.
 * - `cycle`: two files `use()` each other; the destructuring at the top of one would read the other half-loaded.
 * - `block-holds-block`: one block's text contains another's, so taking them out depends on the order.
 * - `not-shared`: a block the script holds whole stays pasted in it ({@link shareScript} refused it).
 */
export function gardenSharingHazards(scripts: ReadonlyArray<{ where: string; script: string }>): SharingHazard[] {
  const hazards: SharingHazard[] = [];
  const all = gardenBlocks();
  for (const a of all) for (const b of all) if (a !== b && a.text.includes(b.text)) hazards.push({ kind: 'block-holds-block', where: a.file, names: [b.file] });
  for (const b of all) {
    for (const [from] of fileDependencies(b)) {
      if (fileDependencies(from).has(b)) hazards.push({ kind: 'cycle', where: b.file, names: [from.file] });
    }
  }
  const fileNames = new Set(all.flatMap((b) => [...blockReading(b).declared]));
  for (const { where, script } of scripts) {
    // Read on every whole block the script holds, not on what shareScript chose: it leaves a hazardous script whole.
    const held = all.filter((b) => script.includes(b.text));
    if (!held.length) continue;
    let body = script;
    for (const b of held) body = body.replace(b.text, () => '');
    const own = readScope(body, FUNCTION_PARAMS).declared;
    const redeclared = held.flatMap((b) => [...blockReading(b).declared].filter((n) => own.has(n)));
    if (redeclared.length) hazards.push({ kind: 'body-redeclares', where, names: [...new Set(redeclared)].sort() });
    const seen = new Map<string, string>();
    const twice: string[] = [];
    for (const b of held) for (const n of blockReading(b).declared) (seen.has(n) ? twice.push(n) : seen.set(n, b.file));
    if (twice.length) hazards.push({ kind: 'two-blocks-declare', where, names: [...new Set(twice)].sort() });
    const reachesBody = held.flatMap((b) => [...blockReading(b).free].filter((n) => own.has(n) && !fileNames.has(n)));
    if (reachesBody.length) hazards.push({ kind: 'block-reaches-body', where, names: [...new Set(reachesBody)].sort() });
    const kept = shareScript(script).blocks;
    const left = held.filter((b) => !kept.includes(b));
    if (left.length) hazards.push({ kind: 'not-shared', where, names: left.map((b) => b.file) });
  }
  return hazards;
}

// ── Running one, as the node does ───────────────────────────────────────────

let files: ScriptFiles | undefined;

/** One `ScriptFiles` over the garden's sources for the life of the process: one compile per file, as on a page. */
export function gardenScriptFiles(): ScriptFiles {
  if (!files) {
    files = new ScriptFiles();
    files.setSources(gardenScriptSources());
  }
  return files;
}

/** `Scripts` as the node builds it for one Function: each file in Uses, by its file name. */
export function scriptsFor(uses: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const path of uses) out[scriptAlias(path)] = gardenScriptFiles().load(path);
  return out;
}
