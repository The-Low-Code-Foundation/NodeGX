/**
 * NSP-010 — a behaviour change is a version, a trace diff, and a migration answer.
 *
 * GOLDEN TRACES. For every spec, the interpreter's trace of each of its hand scenarios is committed as
 * `golden/<type>.json`, with the spec's `version`, its port names, and for each scenario a hash of what it
 * plays (params, steps, world, wired) — so a scenario whose INPUT was edited is not mistaken for a node whose
 * BEHAVIOUR changed. The interpreter is the reference (R3: the spec says what the node does), so its traces are
 * what a change to a reducer moves.
 *
 * THE VERSION RULE (`versionProblems`), against the golden file as it was at a base commit:
 *   - a scenario that plays the same input and now traces differently, or a port renamed, added or removed (a
 *     rename is a behaviour change to every saved project — memory: a rename of a built-in port ships no
 *     migration), with the version unchanged, fails;
 *   - every version above the base's needs its `changes` entry (spec.ts `Change`), and the version never falls.
 * A scenario only on one side (added, removed, renamed) is not a change: it has no before or no after.
 *
 * THE HISTORY'S SHAPE (`changesProblems`), on any spec: entries in rising version order, none above `version`,
 * `says` written, and exactly one migration answer — a `parameter` answer names an input the spec declares.
 *
 * Browser-safe: no files here. `scripts/node-spec/golden.js` reads and writes them, and reads the base with
 * `git show`.
 */

import { canonicalise } from '../canonical';
import { sha256 } from '../sha2';
import type { AnyNodeSpec, Change } from '../spec';
import type { TraceEvent } from '../trace';
import { playReference } from './conformance';
import { canonicalScenario, type Scenario } from './scenario';

export interface GoldenScenario {
  name: string;
  /** sha256 (hex, first 16) of the canonical params, steps, world and wired — what the scenario plays. */
  input: string;
  trace: TraceEvent[];
}

export interface Golden {
  type: string;
  version: number;
  /** The declared port names, sorted — a renamed port moves this. Derived ports are not here: they follow a parameter. */
  ports: { inputs: string[]; outputs: string[] };
  scenarios: GoldenScenario[];
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** What a scenario plays, as a short hash: its name, `because` and `row` are words about it and move nothing. */
export function scenarioInput(scenario: Scenario): string {
  const c = canonicalScenario(scenario);
  const played = { params: c.params, steps: c.steps, world: c.world ?? null, wired: c.wired ?? null };
  return hex(sha256(new TextEncoder().encode(JSON.stringify(played)))).slice(0, 16);
}

/** The golden file for one spec: its hand scenarios played on the interpreter. */
export async function goldenOf(spec: AnyNodeSpec, scenarios: readonly Scenario[]): Promise<Golden> {
  const out: GoldenScenario[] = [];
  for (const sc of scenarios) {
    const trace = await playReference(spec, sc.params, sc.steps, sc.world, sc.wired);
    // canonical, so NaN / -0 / a Date survive the JSON the file is written as
    out.push({ name: sc.name, input: scenarioInput(sc), trace: canonicalise(trace) as unknown as TraceEvent[] });
  }
  return {
    type: spec.type,
    version: spec.version,
    ports: { inputs: Object.keys(spec.inputs).sort(), outputs: Object.keys(spec.outputs).sort() },
    scenarios: out
  };
}

export interface GoldenChange {
  /** Port names in one and not the other. */
  ports: { removed: string[]; added: string[] };
  /** Scenarios that play the same input and trace differently. */
  traces: Array<{ name: string; before: TraceEvent[]; after: TraceEvent[] }>;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** What moved between two golden files of one node — `undefined` when no behaviour did. */
export function goldenChange(before: Golden, after: Golden): GoldenChange | undefined {
  const portsOf = (g: Golden) => [...g.ports.inputs.map((p) => 'input ' + p), ...g.ports.outputs.map((p) => 'output ' + p)];
  const b = new Set(portsOf(before));
  const a = new Set(portsOf(after));
  const ports = { removed: [...b].filter((p) => !a.has(p)), added: [...a].filter((p) => !b.has(p)) };
  const prior = new Map(before.scenarios.map((s) => [s.name, s]));
  const traces: GoldenChange['traces'] = [];
  for (const s of after.scenarios) {
    const p = prior.get(s.name);
    if (p && p.input === s.input && !same(p.trace, s.trace)) traces.push({ name: s.name, before: p.trace, after: s.trace });
  }
  return ports.removed.length + ports.added.length + traces.length > 0 ? { ports, traces } : undefined;
}

/** The history's own shape — what any spec's `changes` must satisfy, whatever the base. */
export function changesProblems(spec: AnyNodeSpec): string[] {
  const problems: string[] = [];
  const changes: readonly Change[] = spec.changes ?? [];
  let last = 0;
  for (const c of changes) {
    const at = `${spec.type} changes v${c.version}`;
    if (!Number.isInteger(c.version) || c.version < 1) problems.push(`${at}: a version is a whole number from 1`);
    else if (c.version <= last) problems.push(`${at}: the entries go in rising version order, one per version`);
    else if (c.version > spec.version) problems.push(`${at}: above the spec's version ${spec.version}`);
    last = Math.max(last, c.version);
    if (typeof c.says !== 'string' || c.says.trim() === '') problems.push(`${at}: \`says\` is empty — what does an app do differently?`);
    const m = (c.migration ?? {}) as Record<string, unknown>;
    const keys = Object.keys(m).filter((k) => k === 'none' || k === 'project' || k === 'parameter');
    if (keys.length !== 1 || Object.keys(m).length !== 1) {
      problems.push(`${at}: the migration answer is exactly one of { none: why } / { project: its id } / { parameter: its name }`);
      continue;
    }
    const v = m[keys[0]];
    if (typeof v !== 'string' || v.trim() === '') problems.push(`${at}: the ${keys[0]} answer is empty`);
    else if (keys[0] === 'parameter' && !(v in spec.inputs)) problems.push(`${at}: the compatibility parameter '${v}' is not an input of ${spec.type}`);
  }
  return problems;
}

/**
 * The version rule against the base's golden file (`undefined`: the spec is new there, and has no before).
 * `now` is the golden file as the spec plays today.
 */
export function versionProblems(base: Golden | undefined, now: Golden, spec: AnyNodeSpec): string[] {
  if (!base) return [];
  const problems: string[] = [];
  if (now.version < base.version) problems.push(`${spec.type}: version fell from ${base.version} to ${now.version}`);
  const change = goldenChange(base, now);
  if (change && now.version === base.version) {
    const what = [
      ...change.traces.map((t) => `"${t.name}"`),
      ...change.ports.removed.map((p) => `${p} removed`),
      ...change.ports.added.map((p) => `${p} added`)
    ];
    problems.push(`${spec.type}: behaviour changed at version ${now.version} — ${what.join('; ')}. Bump \`version\` and add its \`changes\` entry`);
  }
  const have = new Set((spec.changes ?? []).map((c) => c.version));
  for (let v = base.version + 1; v <= now.version; v++) {
    if (!have.has(v)) problems.push(`${spec.type}: version ${v} has no \`changes\` entry — say what changed and what happens to apps built on v${v - 1}`);
  }
  return problems;
}

// ------------------------------------------------------------------------------------------------
// the diff a person reads (AC4): one table per changed scenario, a row per frame

interface Frame {
  stimulus: string[];
  value: string[];
  signal: string[];
  outcome: string[];
  other: string[];
}

const show = (v: unknown) => (typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v ?? null));

function stimulusText(e: TraceEvent): string {
  switch (e.t) {
    case 'set':
      return `${e.port} ← ${'value' in e ? show(e.value) : 'unset'}`;
    case 'in':
      return `▶ ${e.port}`;
    case 'advance':
      return `+${e.ms} ms`;
    case 'act':
      return `person: ${e.act}${'value' in e && e.value !== undefined ? ' ' + show(e.value) : ''}`;
    default:
      return e.t;
  }
}

/** A trace cut into frames: the stimuli, then the frame's observations up to the next stimulus. */
export function traceFrames(trace: readonly TraceEvent[]): Frame[] {
  const frames: Frame[] = [];
  let f: Frame | undefined;
  let observed = false;
  const fresh = () => ((f = { stimulus: [], value: [], signal: [], outcome: [], other: [] }), frames.push(f), (observed = false), f);
  for (const e of trace) {
    if (e.t === 'set' || e.t === 'in' || e.t === 'advance' || e.t === 'act') {
      if (!f || observed) fresh();
      f!.stimulus.push(stimulusText(e));
      continue;
    }
    if (!f) fresh();
    if (e.t === 'settle') {
      if (observed) fresh();
      observed = true;
      continue;
    }
    observed = true;
    if (e.t === 'value') f!.value.push(`${e.port}=${show(e.value)}`);
    else if (e.t === 'signal') f!.signal.push(e.port);
    else if (e.t === 'outcome') f!.outcome.push(`${e.port || '—'}: ${e.value}${e.error ? ` (${e.error})` : ''}`);
    else {
      const { t, ...rest } = e as { t: string };
      f!.other.push(`${t} ${JSON.stringify(rest)}`);
    }
  }
  return frames;
}

const cellText = (xs: string[] | undefined) => (xs === undefined ? '—' : xs.length === 0 ? '' : xs.join(', ')).replace(/\|/g, '\\|');

function cell(before: string[] | undefined, after: string[] | undefined): string {
  const b = cellText(before);
  const a = cellText(after);
  return b === a ? a : `~~${b || '(none)'}~~ → **${a || '(none)'}**`;
}

/** The before / after of one changed scenario as a markdown table — value, signal and outcome columns, a row per frame. */
export function formatTraceDiff(name: string, before: readonly TraceEvent[], after: readonly TraceEvent[]): string {
  const b = traceFrames(before);
  const a = traceFrames(after);
  const other = [...b, ...a].some((f) => f.other.length > 0);
  const head = ['', 'frame', 'stimulus', 'value', 'signal', 'outcome', ...(other ? ['world'] : [])];
  const rows = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = b[i];
    const y = a[i];
    const keys: Array<keyof Frame> = ['stimulus', 'value', 'signal', 'outcome', ...(other ? (['other'] as const) : [])];
    const moved = keys.some((k) => cellText(x?.[k]) !== cellText(y?.[k]));
    rows.push(`| ${moved ? '●' : ''} | ${i + 1} | ${keys.map((k) => cell(x?.[k], y?.[k])).join(' | ')} |`);
  }
  return `**${name}**\n\n${rows.join('\n')}`;
}

/** The whole change of one node, for a PR: the version line, the ports, a table per scenario. */
export function formatGoldenChange(base: Golden, now: Golden, spec: AnyNodeSpec): string {
  const change = goldenChange(base, now);
  const lines = [`### ${spec.type} — v${base.version} → v${now.version}`];
  for (const c of (spec.changes ?? []).filter((c) => c.version > base.version)) {
    const [kind, why] = Object.entries(c.migration)[0];
    lines.push(`- **v${c.version}**${c.row ? ` (${c.row})` : ''}: ${c.says} — *migration: ${kind}* — ${why}`);
  }
  if (!change) return [...lines, '', 'No golden trace moved.'].join('\n');
  if (change.ports.removed.length + change.ports.added.length > 0) {
    lines.push('', `Ports: ${[...change.ports.removed.map((p) => `~~${p}~~`), ...change.ports.added.map((p) => `**${p}**`)].join(', ')}`);
  }
  for (const t of change.traces) lines.push('', formatTraceDiff(t.name, t.before, t.after));
  return lines.join('\n');
}
