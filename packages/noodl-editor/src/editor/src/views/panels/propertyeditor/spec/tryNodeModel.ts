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
