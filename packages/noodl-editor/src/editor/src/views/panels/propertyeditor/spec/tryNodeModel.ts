/**
 * NSP-019 AC2 — "Try this node": the model half, with no React in it.
 *
 * It runs the node's SPEC through the interpreter (`@nodegx/node-spec`, P107 NSP-001: a pure
 * reducer per port, played from a fresh mount by `run(spec, params, steps)` into a trace), never
 * the project — so a node with nothing wired to it can be tried with values a person types. The
 * trace is the format every target shares (trace.ts); this module turns it into a TIMELINE OF
 * PLAIN EVENTS a person reads top to bottom — memory: *correct and usable were never the same
 * criterion*; a trace is correct, and JSON is not what Richard reads.
 *
 * Deterministic by construction (the interpreter has no clock or randomness of its own), so the
 * whole timeline is recomputed from the steps on every change rather than kept as state: the
 * steps ARE the state, and a scenario file's `params` + `steps` reproduces here step by step
 * (`tests-unit/nsp-019/tryNode.test.tsx` plays Counter's hand scenarios through this).
 *
 * This module is the one that pulls the whole spec package (~890 KB of source, every spec) into
 * the bundle, which is why the panel loads it with a dynamic `import()` on first open and the
 * rules section (AC1) never touches it.
 */
import {
  isSignalInput,
  run,
  specFor,
  type AnyNodeSpec,
  type InputDecl,
  type Step,
  type TraceEvent
} from '@nodegx/node-spec';

export type { AnyNodeSpec, Step };

export type ControlKind = 'number' | 'boolean' | 'string' | 'enum' | 'other';

/** A value input the person can set: the spec's declaration, reduced to what a field needs. */
export interface ValueControl {
  port: string;
  label: string;
  group?: string;
  kind: ControlKind;
  enums?: readonly string[];
  default?: unknown;
  description?: string;
}

/** A signal input the person can press. */
export interface SignalControl {
  port: string;
  label: string;
  group?: string;
  description?: string;
}

export interface TryControls {
  values: ValueControl[];
  signals: SignalControl[];
}

/** The spec the registry holds for a catalog type name, if any. */
export function specNamed(typeName: string): AnyNodeSpec | undefined {
  return specFor(typeName);
}

function kindOf(decl: InputDecl): ControlKind {
  if (decl.type === 'signal') return 'other';
  if (decl.type === 'enum') return 'enum';
  if (decl.type === 'number' || decl.type === 'boolean' || decl.type === 'string') return decl.type;
  return 'other';
}

/**
 * The spec's declared inputs as controls, in declaration order. Derived ports (`derived.inputs`,
 * the ones that exist only for some params — String Format's placeholders) are not offered yet.
 */
export function controlsFor(spec: AnyNodeSpec): TryControls {
  const values: ValueControl[] = [];
  const signals: SignalControl[] = [];
  for (const [port, decl] of Object.entries(spec.inputs)) {
    const label = decl.displayName || port;
    if (isSignalInput(decl)) {
      signals.push({ port, label, group: decl.group, description: decl.description });
    } else {
      values.push({
        port,
        label,
        group: decl.group,
        kind: kindOf(decl),
        enums: decl.enums,
        default: decl.default,
        description: decl.description
      });
    }
  }
  return { values, signals };
}

/**
 * What a typed string means on a port of this kind. A number field keeps text that is not a
 * number AS TEXT, so what the node does with `"abc"` (Counter's coercion scenario) can be tried.
 * Anything else is read as JSON when it parses, and as the text otherwise.
 */
export function parseTyped(kind: ControlKind, text: string): unknown {
  if (kind === 'number') {
    const trimmed = text.trim();
    if (trimmed === '') return '';
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : text;
  }
  if (kind === 'boolean') return text === 'true';
  if (kind === 'string' || kind === 'enum') return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** The params a node on the canvas starts with: its parameters, kept to the ports the spec declares as values. */
export function startParamsFor(
  spec: AnyNodeSpec,
  parameters: Readonly<Record<string, unknown>> | undefined
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (!parameters) return params;
  for (const [port, value] of Object.entries(parameters)) {
    const decl = spec.inputs[port];
    if (decl && !isSignalInput(decl) && value !== undefined) params[port] = value;
  }
  return params;
}

// ------------------------------------------------------------------------------------------------
// the timeline

export type TimelineKind =
  /** what the node starts with (a mount-time param) */
  | 'start'
  /** something the person did: set a port, pressed a signal, moved the clock */
  | 'you'
  /** the frame ended — what follows is the node's answer */
  | 'frame'
  /** what the node did: an output moved, a signal fired, an outcome was reported */
  | 'node'
  /** the frame ended and nothing came out */
  | 'quiet';

export interface TimelineEntry {
  kind: TimelineKind;
  text: string;
}

export interface Timeline {
  entries: TimelineEntry[];
  /** The interpreter refused a step (a spec error) — the entries stop where it did. */
  error?: string;
}

const MAX_VALUE_TEXT = 80;

/** A value as a person reads it: text quoted, `undefined` as nothing, an object compact and capped. */
export function showValue(value: unknown): string {
  if (value === undefined) return 'nothing';
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  let text: string;
  try {
    // a string is quoted, like an object's keys are — so "3" and 3 read apart (the coercion scenario)
    text = JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }
  return text.length > MAX_VALUE_TEXT ? text.slice(0, MAX_VALUE_TEXT - 1) + '…' : text;
}

function inputLabel(spec: AnyNodeSpec, port: string): string {
  if (port === '') return 'the node';
  return spec.inputs[port]?.displayName || port;
}

function outputLabel(spec: AnyNodeSpec, port: string): string {
  return spec.outputs[port]?.displayName || port;
}

function outcomeText(spec: AnyNodeSpec, e: Extract<TraceEvent, { t: 'outcome' }>): string {
  const who = inputLabel(spec, e.port);
  if (e.value === 'done') return `${who}: done`;
  if (e.value === 'unchanged') return `${who}: unchanged — nothing to do`;
  return `${who}: failed${e.error ? ` (${e.error})` : ''}`;
}

/** The world-facing observations (a request, a navigation, a popup…) in one generic line each. */
function otherText(e: TraceEvent): string {
  const { t, subject: _subject, ...rest } = e as TraceEvent & { subject?: string };
  const fields = Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k} ${showValue(v)}`)
    .join(', ');
  return `the node ${describeKind(t)}${fields ? ` — ${fields}` : ''}`;
}

function describeKind(t: TraceEvent['t']): string {
  switch (t) {
    case 'request':
      return 'sends a request';
    case 'backend':
      return 'asks the backend';
    case 'open':
      return 'opens a URL';
    case 'history':
      return 'moves the browser history';
    case 'dispatch':
      return 'dispatches a window event';
    case 'stack':
      return 'moves a component stack';
    case 'route':
      return 'navigates';
    case 'popup':
      return 'works a popup';
    case 'picker':
      return 'opens the file picker';
    case 'socket':
      return 'uses a WebSocket';
    case 'answer':
      return 'answers another node';
    default:
      return t;
  }
}

/**
 * Plays `steps` on the spec from a fresh mount with `params` and reads the trace as a timeline.
 * The mount's own `set` events (the params, in their key order) read as what the node starts
 * with; everything after is the person's, the frame's, or the node's.
 */
export function playTimeline(spec: AnyNodeSpec, params: Record<string, unknown>, steps: readonly Step[]): Timeline {
  let trace: TraceEvent[];
  try {
    trace = run(spec, params, steps);
  } catch (error) {
    return { entries: [], error: error instanceof Error ? error.message : String(error) };
  }

  const entries: TimelineEntry[] = [];
  let mountSetsLeft = Object.keys(params).length;
  let frameOpen = false;
  let frameQuiet = false;

  const closeFrame = () => {
    if (frameOpen && frameQuiet) entries.push({ kind: 'quiet', text: 'nothing happens' });
    frameOpen = false;
    frameQuiet = false;
  };
  const stimulus = (text: string) => {
    closeFrame();
    entries.push({ kind: 'you', text });
  };
  const answer = (text: string) => {
    entries.push({ kind: 'node', text });
    frameQuiet = false;
  };

  for (const e of trace) {
    switch (e.t) {
      case 'set':
        if (mountSetsLeft > 0) {
          mountSetsLeft--;
          entries.push({ kind: 'start', text: `${inputLabel(spec, e.port)} starts at ${showValue(e.value)}` });
        } else {
          stimulus(`You set ${inputLabel(spec, e.port)} to ${showValue(e.value)}`);
        }
        break;
      case 'in':
        mountSetsLeft = 0;
        stimulus(`You press ${inputLabel(spec, e.port)}`);
        break;
      case 'advance':
        mountSetsLeft = 0;
        stimulus(`Time moves ${e.ms} ms`);
        break;
      case 'act':
        mountSetsLeft = 0;
        stimulus(`A person does ${e.act}${e.value !== undefined ? ` ${showValue(e.value)}` : ''}`);
        break;
      case 'settle':
        mountSetsLeft = 0;
        closeFrame();
        entries.push({ kind: 'frame', text: 'the frame ends' });
        frameOpen = true;
        frameQuiet = true;
        break;
      case 'value':
        answer(`${outputLabel(spec, e.port)} → ${showValue(e.value)}`);
        break;
      case 'signal':
        answer(`${outputLabel(spec, e.port)} fires`);
        break;
      case 'outcome':
        answer(outcomeText(spec, e));
        break;
      default:
        answer(otherText(e));
    }
  }
  closeFrame();
  return { entries };
}

// ------------------------------------------------------------------------------------------------
// the modal's play (R33): the same trace, read as rows, port values and what to light

/** An output the node draws on its card, in declaration order. */
export interface OutputPort {
  port: string;
  label: string;
  signal: boolean;
}

export function outputsFor(spec: AnyNodeSpec): OutputPort[] {
  return Object.entries(spec.outputs).map(([port, decl]) => ({
    port,
    label: decl.displayName || port,
    signal: decl.type === 'signal'
  }));
}

/** True for a node whose behaviour moves with the clock — the only ones offered *Move time* and *Same frame*. */
export function usesClock(spec: AnyNodeSpec): boolean {
  return Boolean(spec.needs?.includes('clock'));
}

export interface RowOutcome {
  /** The input it answers, by display name. */
  label: string;
  value: 'done' | 'unchanged' | 'failure';
  error?: string;
}

/**
 * One row of *What happened*: what the person did in one frame (or what the node started with,
 * for the first row) and everything the node answered before the next thing they did.
 */
export interface TryRow {
  kind: 'load' | 'you';
  /** What was done, in a few words: "Increase Count", "Start Value 5", "Time moves 1000 ms". */
  what: string;
  /** What the node answered, one phrase each: "Current Count → 1", "Count Changed fires". */
  answers: string[];
  outcomes: RowOutcome[];
  /** The frame ended and nothing came out of it. */
  quiet: boolean;
}

export interface TryPlay {
  rows: TryRow[];
  /** Each value input as it stands after the last step (the start params, then every set). */
  inputs: Record<string, unknown>;
  /** Each value output's last sent value; a port nothing was sent on is absent. */
  outputs: Record<string, unknown>;
  /** The ports the LAST row reached — the ones the stage lights for a moment. */
  lit: { inputs: string[]; outputs: string[] };
  /** The interpreter refused a step; the rows are the steps before it. */
  error?: string;
}

function runLongestPrefix(
  spec: AnyNodeSpec,
  params: Record<string, unknown>,
  steps: readonly Step[]
): { trace: TraceEvent[]; error?: string } {
  try {
    return { trace: run(spec, params, steps) };
  } catch (first) {
    const error = first instanceof Error ? first.message : String(first);
    for (let k = steps.length - 1; k >= 0; k--) {
      try {
        return { trace: run(spec, params, steps.slice(0, k)), error };
      } catch {
        // a shorter prefix may still be refused (a mount-time error); keep going down
      }
    }
    return { trace: [], error };
  }
}

/** A value as a person reads it on a stepper or a switch: booleans as on / off. */
function setText(spec: AnyNodeSpec, port: string, value: unknown): string {
  const label = inputLabel(spec, port);
  if (typeof value === 'boolean') return `${label} ${value ? 'on' : 'off'}`;
  return `${label} ${showValue(value)}`;
}

/**
 * Plays `steps` from a fresh mount, as `playTimeline` does, and reads the trace the way the
 * modal draws it. Each stimulus that follows a frame end opens a new row; stimuli inside one
 * frame (*Same frame*) share their row. What the node sends before the first stimulus belongs to
 * the load row — which is why the modal starts its steps with one `settle`: the node's first frame,
 * as the app runs one when it mounts.
 */
export function playTry(spec: AnyNodeSpec, params: Record<string, unknown>, steps: readonly Step[]): TryPlay {
  const { trace, error } = runLongestPrefix(spec, params, steps);

  const rows: TryRow[] = [];
  const inputs: Record<string, unknown> = {};
  const outputs: Record<string, unknown> = {};
  let litInputs = new Set<string>();
  let litOutputs = new Set<string>();

  let mountSetsLeft = Object.keys(params).length;
  const load: TryRow = { kind: 'load', what: 'At load', answers: [], outcomes: [], quiet: false };
  rows.push(load);
  let row: TryRow = load;
  let frameEnded = false;
  let frameQuiet = false;

  const closeQuiet = () => {
    if (frameEnded && frameQuiet && row.kind === 'you' && row.answers.length === 0 && row.outcomes.length === 0) {
      row.quiet = true;
    }
  };
  const stimulus = (what: string, port?: string) => {
    if (row.kind === 'load' || frameEnded) {
      closeQuiet();
      row = { kind: 'you', what, answers: [], outcomes: [], quiet: false };
      rows.push(row);
      litInputs = new Set();
      litOutputs = new Set();
      frameEnded = false;
    } else {
      row.what = `${row.what} · ${what}`;
    }
    if (port !== undefined && port !== '') litInputs.add(port);
  };
  const answered = () => {
    frameQuiet = false;
  };

  for (const e of trace) {
    switch (e.t) {
      case 'set':
        inputs[e.port] = e.value;
        if (mountSetsLeft > 0) {
          mountSetsLeft--;
          load.answers.push(`${inputLabel(spec, e.port)} starts at ${showValue(e.value)}`);
        } else {
          stimulus(setText(spec, e.port, e.value), e.port);
        }
        break;
      case 'in':
        mountSetsLeft = 0;
        stimulus(inputLabel(spec, e.port), e.port);
        break;
      case 'advance':
        mountSetsLeft = 0;
        stimulus(`Time moves ${e.ms} ms`);
        break;
      case 'act':
        mountSetsLeft = 0;
        stimulus(`A person does ${e.act}${e.value !== undefined ? ` ${showValue(e.value)}` : ''}`);
        break;
      case 'settle':
        mountSetsLeft = 0;
        closeQuiet();
        frameEnded = true;
        frameQuiet = true;
        break;
      case 'value':
        outputs[e.port] = e.value;
        litOutputs.add(e.port);
        row.answers.push(`${outputLabel(spec, e.port)} → ${showValue(e.value)}`);
        answered();
        break;
      case 'signal':
        litOutputs.add(e.port);
        row.answers.push(`${outputLabel(spec, e.port)} fires`);
        answered();
        break;
      case 'outcome':
        row.outcomes.push({
          label: inputLabel(spec, e.port),
          value: e.value === 'done' || e.value === 'unchanged' ? e.value : 'failure',
          error: e.error
        });
        answered();
        break;
      default:
        row.answers.push(otherText(e));
        answered();
    }
  }
  closeQuiet();

  const lastIsYou = rows[rows.length - 1].kind === 'you';
  return {
    rows,
    inputs,
    outputs,
    lit: lastIsYou ? { inputs: [...litInputs], outputs: [...litOutputs] } : { inputs: [], outputs: [] },
    error
  };
}

/** An input the node draws on its card, in declaration order (signals and values together, as the canvas does). */
export interface InputPort {
  port: string;
  label: string;
  signal: boolean;
}

export function inputsFor(spec: AnyNodeSpec): InputPort[] {
  return Object.entries(spec.inputs).map(([port, decl]) => ({
    port,
    label: decl.displayName || port,
    signal: isSignalInput(decl)
  }));
}
