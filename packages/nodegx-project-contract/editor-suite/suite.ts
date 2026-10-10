/**
 * P112 OWN-006 — the editor suite: open, edit, save, compare with the reference, validate.
 *
 * An editor implements `EditorAdapter` over its own code path (the one a person's click goes
 * through, not a shortcut). The suite opens a fixture in it, applies the fixture's edit script one
 * edit at a time, takes what it saved, and compares that with the same edits applied through this
 * package's store (`referenceAdapter`): ids matched, layout free, everything else equal. Then the
 * structural validator must report nothing on every file, and any extra check the caller hands in
 * (the editor's semantic validator, the official loader; both live in the editor, so in a checkout
 * they are passed as functions and outside one they are absent and said so).
 *
 * The result is PASS or a list of sentences, the first ten printed by the command.
 */

import { memoryFiles } from '../format/files';
import { V2ProjectStore, type ComponentFiles } from '../format/store';
import type { RegistryV2File } from '../format/types';
import { SCHEMA_IDS, SchemaValidator } from '../format/validator';
import { compareSaves, type Difference } from './compare';
import { EditRefusal, applyEdit, type Edit } from './edits';

export type Files = Record<string, string>;

/** What an editor implements. Each method may be sync or async. */
export interface EditorAdapter {
  /** A short name for the report. */
  name?: string;
  open(files: Files): void | Promise<void>;
  /** For `add_node`, returns the id the editor gave the node when it minted its own. */
  apply(edit: Edit): void | { id?: string } | Promise<void | { id?: string }>;
  save(): Files | Promise<Files>;
  /** OWN-003: the editor's own graph runner, graded by the 76 scenarios when present. */
  graphTarget?(): unknown;
}

/** An adapter whose methods are synchronous: what the reference is, and what a page's own editor usually is. */
export interface SyncEditorAdapter extends EditorAdapter {
  open(files: Files): void;
  apply(edit: Edit): { id?: string } | undefined;
  save(): Files;
}

export interface Fixture {
  name: string;
  files: Files;
  edits: Edit[];
}

/** An extra check on what the editor saved: sentences, empty when clean. In a checkout: the semantic validator, the loader. */
export type SavedFilesCheck = (saved: Files, fixture: Fixture) => string[] | Promise<string[]>;

export interface SuiteOptions {
  checks?: Record<string, SavedFilesCheck>;
  /** The reference's id for the i-th `add_node` that names none. Deterministic by default. */
  mint?: (editIndex: number) => string;
  /** Files the comparison ignores (project-relative). */
  ignoreFiles?: string[];
}

export interface SuiteReport {
  pass: boolean;
  adapter: string;
  fixture: string;
  /** Every sentence, in the order found: the comparison's first, then each check's. */
  sentences: string[];
  differences: Difference[];
  checks: Record<string, string[]>;
  /** The edit the fixture itself could not apply through the reference, when that is the fault. */
  fixtureFault?: string;
  timings: { editor: number; reference: number; compare: number; checks: number; total: number };
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * The reference: the edits applied through this package's store on a project held in memory. It
 * is also the adapter that must pass (AC1), and a thin example of what an adapter looks like.
 */
export function referenceAdapter(
  mint?: (editIndex: number) => string
): SyncEditorAdapter & { store(): V2ProjectStore } {
  let files = memoryFiles();
  let store: V2ProjectStore | undefined;
  let index = 0;
  return {
    name: 'reference (@nodegx/project-contract/format)',
    store: () => {
      if (!store) throw new Error('open() first');
      return store;
    },
    open(initial) {
      files = memoryFiles(initial);
      store = new V2ProjectStore(files);
      index = 0;
    },
    apply(edit) {
      if (!store) throw new Error('open() first');
      const i = index++;
      const stored = store.readComponent(edit.component);
      const { files: next, id } = applyEdit(stored.files, edit, () => (mint ? mint(i) : `suite-${i}`));
      store.writeComponent(stored.key, next, { ifRevision: stored.revision });
      return id !== undefined ? { id } : undefined;
    },
    save() {
      return files.entries();
    }
  };
}

/** Every file of the project that the structural validator has a schema for, validated. */
export function validateStructure(saved: Files): string[] {
  const v = SchemaValidator.instance;
  const out: string[] = [];
  const check = (file: string, id: (typeof SCHEMA_IDS)[keyof typeof SCHEMA_IDS]) => {
    const text = saved[file];
    if (text === undefined) return;
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (err) {
      out.push(`${file} is not JSON: ${(err as Error).message}`);
      return;
    }
    const r = v.validate(id, data);
    if (!r.valid) for (const e of r.errors.slice(0, 3)) out.push(`${file}: ${e.path || '(root)'} ${e.message}`);
  };
  check('nodegx.project.json', SCHEMA_IDS.PROJECT);
  check('nodegx.routes.json', SCHEMA_IDS.ROUTES);
  check('nodegx.styles.json', SCHEMA_IDS.STYLES);
  check('components/_registry.json', SCHEMA_IDS.REGISTRY);
  const registryText = saved['components/_registry.json'];
  if (registryText === undefined) {
    out.push('components/_registry.json is missing.');
    return out;
  }
  let registry: RegistryV2File;
  try {
    registry = JSON.parse(registryText) as RegistryV2File;
  } catch {
    return out;
  }
  for (const entry of Object.values(registry.components)) {
    check(`components/${entry.path}/component.json`, SCHEMA_IDS.COMPONENT);
    check(`components/${entry.path}/nodes.json`, SCHEMA_IDS.NODES);
    check(`components/${entry.path}/connections.json`, SCHEMA_IDS.CONNECTIONS);
  }
  return out;
}

/**
 * P112-S6-SUITEIDS — an edit as the editor must receive it: every node the script named and the editor minted its
 * own id for (`apply` returned it) is called by the editor's id. A script names the nodes it adds so its later edits
 * can find them; an editor that mints its own ids (the official one does) would otherwise be handed a name it never
 * gave anything. The `add_node`'s own `id` is left as the script's request.
 */
export function inEditorIds(edit: Edit, editorIdOf: Readonly<Record<string, string>>): Edit {
  const t = (id: string) => editorIdOf[id] ?? id;
  switch (edit.edit) {
    case 'add_node':
      return edit.parent !== undefined ? { ...edit, parent: t(edit.parent) } : edit;
    case 'connect':
    case 'disconnect':
      return { ...edit, from: { ...edit.from, node: t(edit.from.node) }, to: { ...edit.to, node: t(edit.to.node) } };
    case 'add_child':
      return { ...edit, id: t(edit.id), parent: t(edit.parent) };
    default:
      return { ...edit, id: t(edit.id) };
  }
}

/** Runs one adapter on one fixture. */
export async function runSuite(
  adapter: EditorAdapter,
  fixture: Fixture,
  options: SuiteOptions = {}
): Promise<SuiteReport> {
  const t0 = now();
  const mint = options.mint ?? ((i: number) => `suite-${i}`);
  const report: SuiteReport = {
    pass: false,
    adapter: adapter.name ?? 'the editor',
    fixture: fixture.name,
    sentences: [],
    differences: [],
    checks: {},
    timings: { editor: 0, reference: 0, compare: 0, checks: 0, total: 0 }
  };

  // The reference first: a fixture whose script the reference refuses is the fixture's fault.
  const reference = referenceAdapter(mint);
  const idMap: Record<string, string> = {};
  // the other way round: the id the editor gave a node the script named, so a later edit names it the editor's way
  const editorIdOf: Record<string, string> = {};
  const movedIds = new Set<string>();
  const referenceIds: Array<string | undefined> = [];
  let tr = now();
  try {
    reference.open(fixture.files);
    for (const [i, edit] of fixture.edits.entries()) {
      const r = reference.apply(edit);
      referenceIds.push(r?.id);
      if (edit.edit === 'move') movedIds.add(edit.id);
      if (edit.edit === 'add_node' && (edit.x !== undefined || edit.y !== undefined) && r?.id) movedIds.add(r.id);
      void i;
    }
  } catch (err) {
    report.fixtureFault = `The reference could not apply the fixture's edits: ${(err as Error).message}`;
    report.sentences.push(report.fixtureFault);
    report.timings.total = now() - t0;
    return report;
  }
  const referenceSave = reference.save();
  report.timings.reference = now() - tr;

  // Then the editor, through its own code path.
  let te = now();
  let saved: Files;
  try {
    await adapter.open(fixture.files);
    for (const [i, edit] of fixture.edits.entries()) {
      const r = await adapter.apply(inEditorIds(edit, editorIdOf));
      const refId = referenceIds[i];
      if (edit.edit === 'add_node' && refId !== undefined) {
        const theirs = r && typeof r === 'object' && typeof r.id === 'string' ? r.id : edit.id ?? refId;
        if (theirs !== refId) {
          idMap[theirs] = refId;
          editorIdOf[refId] = theirs;
        }
      }
    }
    saved = await adapter.save();
  } catch (err) {
    const message = err instanceof EditRefusal ? err.message : (err as Error).message;
    report.sentences.push(`${report.adapter} failed while applying the edits: ${message}`);
    report.timings.editor = now() - te;
    report.timings.total = now() - t0;
    return report;
  }
  report.timings.editor = now() - te;

  // The comparison.
  const tc = now();
  report.differences = compareSaves(referenceSave, saved, {
    idMap,
    movedIds,
    ignoreFiles: new Set(options.ignoreFiles ?? [])
  });
  report.sentences.push(...report.differences.map((d) => d.sentence));
  report.timings.compare = now() - tc;

  // The checks: the structural validator always, then the caller's.
  const tk = now();
  const checks: Record<string, SavedFilesCheck> = {
    'structural validator': validateStructure,
    ...(options.checks ?? {})
  };
  for (const [name, check] of Object.entries(checks)) {
    try {
      const sentences = await check(saved, fixture);
      report.checks[name] = sentences;
      report.sentences.push(...sentences.map((s) => `${name}: ${s}`));
    } catch (err) {
      const sentence = `${name} could not run: ${(err as Error).message}`;
      report.checks[name] = [sentence];
      report.sentences.push(sentence);
    }
  }
  report.timings.checks = now() - tk;

  report.pass = report.sentences.length === 0;
  report.timings.total = now() - t0;
  return report;
}

/** The report as the command prints it: PASS, or the first ten sentences and how many more. */
export function formatReport(report: SuiteReport, limit = 10): string {
  const head = `${report.adapter} on ${report.fixture} (${Math.round(report.timings.total)} ms)`;
  if (report.pass) return `PASS — ${head}`;
  const lines = report.sentences.slice(0, limit).map((s, i) => `${i + 1}. ${s}`);
  const more = report.sentences.length - lines.length;
  return [
    `FAIL — ${head}: ${report.sentences.length} difference(s)`,
    ...lines,
    ...(more > 0 ? [`… and ${more} more`] : [])
  ].join('\n');
}

/** A broken adapter for the control arm (AC1): the reference, with two faults on the way out. */
export function brokenAdapter(): SyncEditorAdapter {
  const inner = referenceAdapter();
  return {
    name: 'broken (control)',
    open: (f) => inner.open(f),
    apply: (e) => inner.apply(e),
    save() {
      const saved = { ...inner.save() };
      for (const [file, text] of Object.entries(saved)) {
        if (file.endsWith('/connections.json')) {
          const c = JSON.parse(text) as { connections: Array<Record<string, unknown>> };
          if (c.connections.length > 0) delete c.connections[0].toProperty; // drops a wire's end
          saved[file] = JSON.stringify(c, null, 2);
        }
        if (file.endsWith('/nodes.json')) {
          const n = JSON.parse(text) as { nodes: Array<{ parameters?: Record<string, unknown> }> };
          for (const node of n.nodes) {
            for (const [k, v] of Object.entries(node.parameters ?? {})) {
              if (typeof v === 'number') {
                node.parameters![k] = String(v); // writes a number as a string
                break;
              }
            }
          }
          saved[file] = JSON.stringify(n, null, 2);
        }
      }
      return saved;
    }
  };
}

export type { ComponentFiles };
