/**
 * P109 ISL-005 slice 6 — Olive's Island shares its engine through script files (AC3, and the shared form's soundness).
 *
 * The same program: every block the garden's Functions carried is a file, no Function re-declares a file's name, no
 * file reaches a name only a Function declares, and each Function mines the same ports. One copy: the artefact holds the
 * engine once, in `scripts/engine.js`, and the summed `functionScript` bytes fall below a ceiling a pasted copy cannot
 * meet (the sabotage arm). One instance: two Functions reach the same `exports`, loaded once by the runtime's own
 * `ScriptFiles`.
 */
import * as fs from 'fs';
import * as path from 'path';

import { scriptGives } from '@noodl/runtime/src/scriptfiles';

import { CG003_COMPONENTS } from './cg003Components';
import { portsOf, runScript, runScriptInline, STEP_SCRIPT, NEW_RUN_SCRIPT } from './cg002Scripts';
import { START_WORLD_SCRIPT } from './cg003Scripts';
import { REQUESTS } from './cg002Content';
import { gardenBlocks, gardenScriptSources, gardenSharingHazards, scriptsFor, shareScript } from './isl005GardenScripts';

const TEMPLATE = path.join(__dirname, '..', '..', '..', 'templates', 'bot-garden');
const ENGINE_LINE = 'var BLOCKING_TILES = { W: 1';
/**
 * The ceiling on the artefact's summed `functionScript` bytes. Before ISL-005: 3,678,351 (91 Functions, 23 holding the
 * engine). After: 385,294. A pasted engine in even four of them crosses it.
 */
const FUNCTION_BYTES_CEILING = 500_000;

interface FnNode {
  where: string;
  script: string;
  uses?: string;
}

/** Every Function in the source the door is handed. */
function sourceFunctions(): FnNode[] {
  const out: FnNode[] = [];
  for (const c of CG003_COMPONENTS) {
    for (const n of c.nodes as Array<{ type: string; parameters?: Record<string, unknown> }>) {
      if (n.type === 'JavaScriptFunction') out.push({ where: c.path, script: String(n.parameters?.functionScript ?? '') });
    }
  }
  return out;
}

/** Every Function in the artefact on disk (`components/**\/nodes.json`). */
function artefactFunctions(): FnNode[] {
  const out: FnNode[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'nodes.json') {
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        const nodes = Array.isArray(data) ? data : data.nodes ?? [];
        for (const n of nodes) {
          if (n.type !== 'JavaScriptFunction') continue;
          const p = n.parameters ?? {};
          out.push({ where: path.relative(path.join(TEMPLATE, 'components'), path.dirname(full)), script: String(p.functionScript ?? ''), uses: p.uses });
        }
      }
    }
  };
  walk(path.join(TEMPLATE, 'components'));
  return out;
}

const bytes = (fns: FnNode[]) => fns.reduce((a, f) => a + Buffer.byteLength(f.script, 'utf8'), 0);

describe('ISL-005 slice 6 — the shared form is the same program', () => {
  const fns = sourceFunctions();

  it('🔴 no hazard: no body re-declares a file’s name, no two files one Function uses share a name, no file reaches a body’s name, no cycle, every whole block shared', () => {
    expect(gardenSharingHazards(fns)).toEqual([]);
  });

  it('known-firing beside it: a body that redefines an engine function is a hazard, and is left whole', () => {
    const step = fns.find((f) => f.where === 'Logic/Step')!;
    const redefined = `${step.script}\nfunction blocked() { return false; }`;
    expect(gardenSharingHazards([{ where: 'arm', script: redefined }]).map((h) => h.kind)).toEqual(['body-redeclares', 'not-shared']);
    expect(shareScript(redefined).script).toBe(redefined);
  });

  it('every file a Function used to hold is shared, and the big ones by many', () => {
    const users = (file: string) => fns.filter((f) => shareScript(f.script).uses.includes(file)).length;
    expect(Object.fromEntries(gardenBlocks().map((b) => [b.file, users(b.file) > 0]))).toEqual(Object.fromEntries(gardenBlocks().map((b) => [b.file, true])));
    expect(users('engine.js')).toBe(23);
    expect(fns.filter((f) => shareScript(f.script).uses.length).length).toBe(70);
  });

  it('each Function mines the same ports from its shared body as from the pasted one', () => {
    const changed = fns.filter((f) => JSON.stringify(portsOf(shareScript(f.script).script)) !== JSON.stringify(portsOf(f.script))).map((f) => f.where);
    expect(changed).toEqual([]);
  });

  it('a file sees use, exports and module only: none reads Noodl, window or document, and each says what it gives', () => {
    for (const [file, text] of Object.entries(gardenScriptSources())) {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      expect(() => new Function('use', 'exports', 'module', 'Noodl', 'window', 'document', text)).not.toThrow();
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      expect({ file, reads: ['Noodl', 'window', 'document'].filter((g) => new RegExp(`\\b${g}\\b`).test(code)) }).toEqual({ file, reads: [] });
      expect(scriptGives(text).length).toBeGreaterThan(0);
    }
  });

  it('one instance: two Functions reach the same engine exports, loaded once', () => {
    const a = scriptsFor(['engine.js']).engine;
    const b = scriptsFor(['engine.js', 'save.js']).engine;
    expect(a).toBe(b);
    expect(typeof (a as Record<string, unknown>).step).toBe('function');
  });

  it('runScript takes the shared path, and gives what the pasted script gives (the control)', () => {
    expect(shareScript(STEP_SCRIPT).uses).toEqual(['engine.js']);
    const start = runScript(START_WORLD_SCRIPT, { requests: JSON.parse(JSON.stringify(REQUESTS)), requestId: 'tulips-three', nonce: 0 });
    const program = JSON.stringify([{ op: 'fwd' }, { op: 'left' }, { op: 'fwd' }]);
    const run = runScript(NEW_RUN_SCRIPT, { program, robotId: 'me', lang: 'en' }).run;
    const { runId: _shared, ...sharedRun } = run;
    const { runId: _pasted, ...pastedRun } = runScriptInline(NEW_RUN_SCRIPT, { program, robotId: 'me', lang: 'en' }).run;
    expect(sharedRun).toEqual(pastedRun); // runId is drawn at random each run
    const shared = runScript(STEP_SCRIPT, { run, world: start.world });
    const pasted = runScriptInline(STEP_SCRIPT, { run, world: start.world });
    expect(shared).toEqual(pasted);
    expect(shared.delta).toBeTruthy();
  });
});

describe('ISL-005 AC3 — one copy, in the artefact (templates/bot-garden)', () => {
  const fns = artefactFunctions();
  const sources = gardenScriptSources();

  it('🔴 no Function holds the engine; scripts/engine.js holds it once', () => {
    expect(fns.filter((f) => f.script.includes(ENGINE_LINE)).map((f) => f.where)).toEqual([]);
    const engine = fs.readFileSync(path.join(TEMPLATE, 'scripts', 'engine.js'), 'utf8');
    expect(engine.split(ENGINE_LINE).length - 1).toBe(1);
  });

  it('🔴 the files on disk are the files the generator makes, and nothing else is in scripts/', () => {
    const onDisk = fs.readdirSync(path.join(TEMPLATE, 'scripts')).sort();
    expect(onDisk).toEqual(Object.keys(sources).sort());
    for (const file of onDisk) expect({ file, same: fs.readFileSync(path.join(TEMPLATE, 'scripts', file), 'utf8') === sources[file] }).toEqual({ file, same: true });
  });

  it('🔴 the summed functionScript bytes are under the ceiling, and every Uses entry names a file there', () => {
    const total = bytes(fns);
    console.log(`ISL-005 AC3: ${fns.length} Functions, summed functionScript ${total} B (was 3,678,351); scripts/ ${Object.values(sources).reduce((a, t) => a + t.length, 0)} B in ${Object.keys(sources).length} files`);
    expect(total).toBeLessThan(FUNCTION_BYTES_CEILING);
    const missing = fns.flatMap((f) => String(f.uses ?? '').split(',').filter(Boolean).filter((u) => !sources[u.trim()]).map((u) => `${f.where}: ${u}`));
    expect(missing).toEqual([]);
    expect(fns.filter((f) => f.uses).length).toBe(70);
  });

  it('the drives’ loader (scripts/devtools/garden-functions.js) gives what the runtime’s ScriptFiles gives, file by file', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const drives = require('../../../scripts/devtools/garden-functions.js');
    for (const file of Object.keys(sources)) {
      expect({ file, names: Object.keys(drives.sourcesOf(TEMPLATE).load(file)).sort() }).toEqual({ file, names: Object.keys(scriptsFor([file])[file.replace(/\.js$/, '')] as object).sort() });
    }
    const start = runScript(START_WORLD_SCRIPT, { requests: JSON.parse(JSON.stringify(REQUESTS)), requestId: 'tulips-three', nonce: 0 });
    const run = runScript(NEW_RUN_SCRIPT, { program: JSON.stringify([{ op: 'fwd' }]), robotId: 'me', lang: 'en' }).run;
    expect(drives.runFunction(TEMPLATE, 'Logic/Step', { run, world: start.world })).toEqual(runScript(STEP_SCRIPT, { run, world: start.world }));
  });

  it('sabotage arm: pasting the files back into each Function at save time (behaviour kept) fails the byte count', () => {
    const pasted = fns.map((f) => ({ ...f, script: String(f.uses ?? '').split(',').filter(Boolean).map((u) => sources[u.trim()]).join('\n') + f.script }));
    expect(bytes(pasted)).toBeGreaterThan(FUNCTION_BYTES_CEILING);
  });
});
