/**
 * States (`States`) — read from `packages/noodl-viewer-react/src/nodes/std-library/states.ts`, the
 * scheduler its transition runs on (`packages/noodl-runtime/src/timerscheduler.ts`), `bezier-easing`
 * 1.1.1 (bezier-easing.ts here) and the shared colour reader (`color-reader.ts`, as color-blend.ts
 * reads it) on 2026-10-01 (NSP-013 s14).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE MACHINE, before the citations. `States` is a comma list of state names (the first is where
 * the node starts), `Values` a comma list of value names; the node is in ONE state, and each value
 * has, per state, the number, text, true/false, colour or text style that state names for it
 * (`value-<state>-<value>`). A request to move — `Toggle` (the next state, wrapping), `To <state>`,
 * a `currentState` value, a `startState`, or the States list arriving while the node is in no
 * state — is QUEUED, and the queue runs once at the frame's end (:640-699): every state the frame
 * passes through is settled at once and reported (`State Changed`, `Has Reached <state>`), and
 * only the last one animates. Asking for the state the frame is already heading to (the queue's
 * last entry, else the current state) is `Unchanged` at once and queues nothing (:674-680). At the
 * frame end each request is checked (:742-762): no States list at all → `Failure`
 * (`states/no-states`) for an invocation, silence otherwise; an empty name means the first state;
 * the state the node is already in → `Unchanged`; a name not in the list → the node stays where it
 * is, `Error` says what was asked for and which states exist (naming the nearest, nearest-name.ts),
 * and `Failure` (`states/unknown-state`) — pulsed bare when nobody invoked it (:736-740).
 *
 * The FIRST move jumps (:765-768, `jumpToState` :580-616): every value takes the state's value OR
 * 0 — whatever its type (:592) — `State` is set, `At <state>` ports are set, and `State Changed` does
 * NOT fire (:601-613). Every later move (:769-850): text, text styles and true/false (`undefined` →
 * false, else `!!`) are set at once; a number or a colour transitions on the state's curve for that
 * value (`transition-<state>-<value>`, else the state's `transitiondef-<state>`, else ease-out over
 * 300 ms, :791-797) unless that curve is 0 ms with 0 delay, `Use Transitions` is off, or the state is
 * one the frame only passes through — then it is set at once (:799-808). `State` moves at once and
 * `State Changed` fires; `Has Reached <state>` fires now if nothing animates (:839-843), else when
 * the run finishes (:255-258). `Done` follows an invocation's move (:849).
 *
 * THE RUN (timerscheduler.ts): one timer per node. Its `duration` is the longest curve's dur + delay,
 * its `delay` the SMALLEST curve delay or 0 (:813-814 — so never above 0). Starting a running timer
 * stops and queues it; a queued one stays queued (:43-50, :85-94). At each frame's end the timer pass
 * runs (`runTimers`, :116-198): a running timer whose start is reached calls `onStart` once per run,
 * then `onRunning(t)` with `t = (now − start) / duration` (1 when duration > 0 is false), clamped to
 * 1, and finishes at t ≥ 1 (`onFinish` → `Has Reached` the CURRENT state); a queued timer joins with
 * start = now + delay and, with a delay of exactly 0, runs `onStart` and `onRunning(0)` at once.
 * `onStart` (:161-195) reads the CURRENT state's targets and the values on screen when the move was
 * asked for; `onRunning` (:196-254) holds a value before its curve's delay, lands it after
 * delay + dur, and between eases it on the bezier (bezier-easing.ts) — a number linearly between
 * the two as `Number`s, a colour per channel, floored, as `#rrggbbaa`. A colour lands on the value
 * its state names (GAM-006 (b)); one the reader cannot read holds the colour on screen until then.
 * All arithmetic is JavaScript's on the raw values (a text `dur` concatenates, as Animate To Value's
 * Delay does — NSP-013 §6 C20).
 *
 * THE WORLD: the clock (the frame time). Colours: the viewer resolves a colour through the
 * project's colour styles first (`context.styles.resolveColor`, styles.ts :122-127); a project with
 * none hands the value back unchanged, which is what this spec writes — named palette colours are
 * not graded (§6.4). `var(--token)` reads through the document; a play has none, so only the
 * token's own fallback is read (color-blend.ts `readColor`).
 *
 * v2 (NSP-013 §6 C21, ruled "fix it" 2026-10-01): a transition that would animate along a curve the
 * bezier library refuses (not four finite numbers, or an x outside [0, 1] — any value a wire can
 * carry into a curve port: an object without `curve`, text, `true`) reads as the state's Default
 * transition — or, when the Default is the one refused or is unreadable too, the built-in ease-out
 * over 300 ms — and the node reports it once (`states/unreadable-transition`, not in the trace).
 * A transition that sets its value at once (0 ms and no delay, Use Transitions off, a state only
 * passed through) never reads its curve, so it is never refused. In v1 the runtime threw there:
 * the state did not move and no outcome was reported.
 */

import { defineNode, type OutputDecl, type WorldView } from '../spec';
import { bezierAccepts, bezierEasing } from './bezier-easing';
import { readColor } from './color-blend';
import { EaseCurves } from './ease-curves';
import { nearestName } from './nearest-name';

type Rec = Record<string, unknown>;
type RGBA = [number, number, number, number];
/** A transition curve as it arrives: `{ curve: [x1, y1, x2, y2], dur, delay }`, raw — anything a wire carries. */
type Curve = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** One queued request: the state asked for, and the INPUT that invoked it (absent on the setter routes, :60-72). */
interface Request {
  state: unknown;
  port?: string;
}

type State = {
  /** :278 — `undefined` until the list arrives; `[]` for an empty one. */
  states: string[] | undefined;
  /** :303 */
  values: string[] | undefined;
  state: unknown;
  startState: unknown;
  useTransitions: unknown;
  /** `currentValues` (:43) — every value output AND every `at-<state>`, one namespace (:859). */
  current: Rec;
  /** `stateParameters` (:45) — every `value-…`, `transition…` and `duration-…` input, by port name. */
  params: Rec;
  /** `stateParameterTypes` (:47) — every `type-<value>` input, by port name. */
  types: Rec;
  /** `startValues` (:48) — the values on screen when the last animated move was asked for. */
  startValues: Rec;
  /** `transitionFuncs` (:52) — the curve each value's bezier was last built from (:811). */
  funcCurves: Rec;
  valuesAreInitialised: boolean;
  queue: Request[];
  /** `hasScheduledGoToState` (:80) */
  scheduled: boolean;
  error: string | undefined;
  /** The timer (:158-259): its own slots, then the scheduler's bookkeeping, then what `onStart` writes on it. */
  tCurves: Record<string, Curve> | undefined;
  tDuration: unknown;
  tDelay: unknown;
  tQueued: boolean;
  tRunning: boolean;
  tStart: unknown;
  tCalledOnStart: boolean;
  tWasStopped: boolean;
  tStartValues: Rec;
  tTargetValues: Rec;
  tValueTypes: Rec;
  tUnreadable: Rec;
  /** The derived outputs this instance has (`hasOutput`, :257, :842, :860) — fixed at mount from the graph's parameters. */
  outputs: string[];
};

/** :91 */
const DEFAULT_DURATION = 300;
/** :793-797 */
const DEFAULT_CURVE = { curve: [0.0, 0.0, 0.58, 1.0], dur: 300, delay: 0 };
/** :132 — a value cannot take one of these names (the `values` setter refuses it, :316-323). */
const RESERVED_OUTPUTS = ['failure', 'stateChanged', 'done', 'unchanged', 'completed'];
/** :135 */
const UNKNOWN_STATE_CODE = 'states/unknown-state';
const NO_STATES_CODE = 'states/no-states';
const NO_STATES_MESSAGE = 'This States node has no states defined, so there is nowhere to go';

/**
 * The lists the generator draws for `States` and `Values` (both panel-only). Every name in them is
 * a derived output the runtime target registers at mount (`derived.outputs`), as a graph wiring
 * every port would — so a list that arrives mid-play reaches ports that exist on both sides.
 */
const STATE_LISTS = ['A,B', 'A,B,C', 'B,A', 'A', ''];
const VALUE_LISTS = ['x', 'x,y', 'y,label,on'];
const VALUE_TYPES = ['number', 'string', 'boolean', 'color', 'textStyle'];

/** The editor's split of a list parameter (:908, :944) — a non-string reads as none. */
function listOf(value: unknown): string[] {
  return typeof value === 'string' && value ? value.split(',') : [];
}
function universe(param: unknown, lists: readonly string[]): string[] {
  return [...new Set([...listOf(param), ...lists.flatMap(listOf)])];
}

/** :101-114 `setRGBA`, through the reader (color-blend.ts `readColor`) */
function setRGBA(result: RGBA, color: unknown): boolean {
  if (color === 'transparent' || !color) {
    result[3] = 0;
    return true;
  }
  const rgba = readColor(color);
  if (!rgba) return false;
  result[0] = rgba[0];
  result[1] = rgba[1];
  result[2] = rgba[2];
  result[3] = rgba[3];
  return true;
}
/** :116-123 */
function componentToHex(c: number) {
  const hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}
function rgbaToHex(rgba: RGBA) {
  return '#' + componentToHex(rgba[0]) + componentToHex(rgba[1]) + componentToHex(rgba[2]) + componentToHex(rgba[3]);
}
/** styles.ts :122-127 for a project with no colour styles: the value itself. */
const resolveColor = (color: unknown) => color;

// ------------------------------------------------------------------------------------------------
// the working copy every reducer mutates, and what it pulses and reports

type Pulse = 'stateChanged' | 'failure' | { derived: string };
interface Out {
  pulses: Pulse[];
  outcomes: Array<{ port: string; outcome: 'done' | 'unchanged' | 'failure'; error?: string }>;
  world: WorldView;
}

/**
 * `flagOutputDirty(name)` (node.ts :832-835) — the output is SENT now, with what it reads now. A
 * frame end that writes a value three times (0, then false, then nothing) leaves the wire on the
 * last DEFINED one; reading once at the end would see only the last (`WorldView.send`). Only where
 * the port exists: a target registers exactly `derived.outputs`.
 */
function flag(w: State, name: string, out: Out): void {
  if (name === 'currentState' || name === 'error' || w.outputs.includes(name)) out.world.send(name, w);
}

function draft(s: Readonly<State>): State {
  return {
    ...s,
    states: s.states ? [...s.states] : s.states,
    values: s.values ? [...s.values] : s.values,
    current: { ...s.current },
    params: { ...s.params },
    types: { ...s.types },
    startValues: { ...s.startValues },
    funcCurves: { ...s.funcCurves },
    queue: [...s.queue],
    outputs: [...s.outputs],
    tStartValues: { ...s.tStartValues },
    tTargetValues: { ...s.tTargetValues },
    tValueTypes: { ...s.tValueTypes },
    tUnreadable: { ...s.tUnreadable }
  };
}

/** `Has Reached <state>` — only where the port exists (:257, :842). */
function reached(w: State, out: Out): void {
  const port = 'reached-' + w.state;
  if (w.outputs.includes(port)) out.pulses.push({ derived: port });
}

// timerscheduler.ts :43-57 `start` / `stop` (+ `stopTimer` :96-114, `scheduleTimer` :85-94)
function stop(w: State): void {
  w.tRunning = false;
  w.tQueued = false;
  w.tCalledOnStart = false;
  w.tWasStopped = true;
}
function start(w: State): void {
  if (w.tRunning) stop(w);
  if (!w.tQueued) w.tQueued = true;
}

/** :852-862 */
function updateAtStatePorts(w: State, out: Out): void {
  for (const s of w.states ?? []) {
    w.current['at-' + s] = w.state === s;
    flag(w, 'at-' + s, out);
  }
}

/** :634-639 */
function failNoStates(w: State, port: string, out: Out): void {
  w.error = NO_STATES_MESSAGE;
  flag(w, 'error', out);
  out.outcomes.push({ port, outcome: 'failure', error: NO_STATES_CODE });
}

/** :708-741 */
function failUnknownState(w: State, state: unknown, port: string | undefined, out: Out): void {
  const states = w.states || [];
  const suggestion = nearestName(state as string, states);
  w.error =
    'Cannot go to state "' +
    state +
    '" — this node has no such state. Its states are: ' +
    (states.length > 0 ? states.join(', ') : '(none defined)') +
    '.' +
    (suggestion ? ' Did you mean "' + suggestion + '"?' : '');
  flag(w, 'error', out);
  if (port) out.outcomes.push({ port, outcome: 'failure', error: UNKNOWN_STATE_CODE });
  else out.pulses.push('failure');
}

/**
 * :640-699 `scheduleGoToState`. Returns `unchanged` when the request is already where the frame is
 * heading and an invocation asked (reported at once, :678), `deferred` when an invocation's request
 * was queued (its outcome is the frame end's), nothing for a setter's.
 */
function schedule(w: State, state: unknown, port?: string): 'unchanged' | 'deferred' | undefined {
  const pendingTarget = w.queue.length > 0 ? w.queue[w.queue.length - 1].state : w.state;
  if (state && pendingTarget === state) return port ? 'unchanged' : undefined;
  w.queue.push(port ? { state, port } : { state });
  w.scheduled = true;
  return port ? 'deferred' : undefined;
}

/** :580-616 `jumpToState` — the first move */
function jumpToState(w: State, state: unknown, out: Out): void {
  if (!w.states) return;
  if (!state) state = w.states[0];
  if (w.state === state) return;
  stop(w);
  const prefix = 'value-' + state + '-';
  for (const v of w.values ?? []) {
    w.current[v] = w.params[prefix + v] || 0; // :592 — `|| 0` whatever the type
    flag(w, v, out);
  }
  w.state = state;
  flag(w, 'currentState', out);
  if (w.valuesAreInitialised) out.pulses.push('stateChanged');
  w.valuesAreInitialised = true;
  updateAtStatePorts(w, out);
}

/** :742-851 `goToState` */
function goToState(w: State, state: unknown, settleImmediately: boolean, port: string | undefined, out: Out): void {
  if (!w.states) {
    if (port) failNoStates(w, port, out);
    return;
  }
  if (!state) state = w.states[0];
  if (w.state === state) {
    if (port) out.outcomes.push({ port, outcome: 'unchanged' });
    return;
  }
  if (w.states.indexOf(state as string) === -1) {
    failUnknownState(w, state, port, out);
    return;
  }
  if (!w.valuesAreInitialised) {
    jumpToState(w, state, out);
    if (port) out.outcomes.push({ port, outcome: 'done' });
    return;
  }
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let delay: any = 0;
  let dur: any = 0;
  const curves: Record<string, Curve> = {};
  for (const v of w.values ?? []) {
    w.startValues[v] = w.current[v]; // :777
    const type = w.types['type-' + v];
    if (type === 'boolean') {
      const b = w.params['value-' + state + '-' + v];
      w.current[v] = b === undefined ? false : !!b; // :782-783
      flag(w, v, out);
    } else if (type === 'string' || type === 'textStyle') {
      w.current[v] = w.params['value-' + state + '-' + v]; // :787
      flag(w, v, out);
    } else {
      const ownPort = 'transition-' + state + '-' + v;
      const defaultPort = 'transitiondef-' + state;
      let c: Curve = w.params[ownPort];
      let fromPort = ownPort;
      if (!c) {
        c = w.params[defaultPort] || DEFAULT_CURVE; // :791-797
        fromPort = defaultPort;
      }
      const setsAtOnce = (k: Curve) => (k.dur === 0 && k.delay === 0) || !w.useTransitions || settleImmediately;
      // v2 (C21): a refused curve reads as the state's Default, else the built-in one
      if (!setsAtOnce(c) && !bezierAccepts(c.curve)) {
        const stateDefault: Curve = w.params[defaultPort];
        c = fromPort === ownPort && stateDefault && (setsAtOnce(stateDefault) || bezierAccepts(stateDefault.curve)) ? stateDefault : DEFAULT_CURVE;
      }
      if (setsAtOnce(c)) {
        w.current[v] = w.params['value-' + state + '-' + v]; // :807
        flag(w, v, out);
      } else {
        w.funcCurves[v] = c.curve; // :811
        curves[v] = c;
        delay = Math.min(delay, c.delay); // :813
        dur = Math.max(dur, c.dur + c.delay); // :814
      }
    }
  }
  if (dur > 0 || delay > 0) {
    w.tCurves = curves; // :825-828
    w.tDuration = dur;
    w.tDelay = delay;
    start(w);
  }
  w.state = state;
  flag(w, 'currentState', out);
  out.pulses.push('stateChanged');
  updateAtStatePorts(w, out);
  if (dur == 0 && delay == 0) reached(w, out); // :839-843
  if (port) out.outcomes.push({ port, outcome: 'done' }); // :849
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** :161-195 `onStart` — the CURRENT state's targets, the values on screen when the move was asked for */
function onStart(w: State): void {
  const prefix = 'value-' + w.state + '-';
  w.tTargetValues = {};
  w.tStartValues = {};
  w.tValueTypes = {};
  w.tUnreadable = {};
  for (const v in w.tCurves) {
    const type = w.types['type-' + v];
    if (type === 'number' || type === undefined) {
      w.tValueTypes[v] = 'number';
      w.tStartValues[v] = w.startValues[v];
      w.tTargetValues[v] = w.params[prefix + v] || 0;
    } else if (type === 'color') {
      w.tValueTypes[v] = 'color';
      const from = resolveColor(w.startValues[v] || '#000000');
      const to = resolveColor(w.params[prefix + v] || '#000000');
      const s: RGBA = [0, 0, 0, 255];
      const t: RGBA = [0, 0, 0, 255];
      const fromRead = setRGBA(s, from);
      const toRead = setRGBA(t, to);
      // :190-191 `warnUnreadableColor` — reports only where `CSS.supports` can be asked; a play has no page
      if (!fromRead || !toRead) w.tUnreadable[v] = fromRead ? to : from;
      w.tStartValues[v] = s;
      w.tTargetValues[v] = t;
    }
  }
}

/** :196-254 `onRunning` */
function onRunning(w: State, t: number, out: Out): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const ms = t * (w.tDuration as any);
  for (const v in w.tCurves) {
    const c = w.tCurves[v];
    const holding = ms < c.delay || (w.tValueTypes[v] === 'color' && w.tUnreadable[v] !== undefined && ms < c.delay + c.dur);
    if (holding) {
      const onScreen = w.startValues[v];
      w.current[v] = w.tValueTypes[v] !== 'color' ? w.tStartValues[v] : typeof onScreen === 'string' && onScreen !== '' ? onScreen : rgbaToHex(w.tStartValues[v] as RGBA);
    } else if (ms >= c.delay + c.dur) {
      const authored = w.params['value-' + w.state + '-' + v];
      w.current[v] = w.tValueTypes[v] !== 'color' ? w.tTargetValues[v] : authored !== undefined && authored !== null && authored !== '' ? authored : rgbaToHex(w.tTargetValues[v] as RGBA);
    } else {
      const _t = bezierEasing(w.funcCurves[v] as number[])((ms - c.delay) / c.dur);
      if (w.tValueTypes[v] === 'number') {
        w.current[v] = EaseCurves.linear(Number(w.tStartValues[v]), Number(w.tTargetValues[v]), _t);
      } else if (w.tValueTypes[v] === 'color') {
        const rgba0 = w.tStartValues[v] as RGBA;
        const rgba1 = w.tTargetValues[v] as RGBA;
        const rgba2: RGBA = [0, 0, 0, 255];
        rgba2[0] = Math.floor(EaseCurves.linear(rgba0[0], rgba1[0], _t));
        rgba2[1] = Math.floor(EaseCurves.linear(rgba0[1], rgba1[1], _t));
        rgba2[2] = Math.floor(EaseCurves.linear(rgba0[2], rgba1[2], _t));
        rgba2[3] = Math.floor(EaseCurves.linear(rgba0[3], rgba1[3], _t));
        w.current[v] = rgbaToHex(rgba2);
      }
    }
    flag(w, v, out); // :252
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** timerscheduler.ts :116-198 `runTimers` for this node's one timer */
function runTimers(w: State, now: number, out: Out): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  if (w.tRunning && now >= (w.tStart as any)) {
    if (!w.tCalledOnStart) {
      onStart(w); // :133-136
      w.tCalledOnStart = true;
    }
    const d = w.tDuration as any;
    const t = d > 0 ? (now - (w.tStart as any)) / (d * 1) : 1.0; // :139-143
    let localT = t * 1 - Math.floor(t * 1); // :147-150
    if (t >= 1.0) localT = 1.0;
    onRunning(w, localT, out);
    if (!(t < 1.0 && w.tRunning) && !w.tWasStopped) {
      w.tRunning = false; // :168-174
      w.tCalledOnStart = false;
      reached(w, out); // :255-258 onFinish — the state the node is in NOW
    }
  }
  if (w.tQueued) {
    w.tStart = (now as any) + (w.tDelay as any); // :180
    w.tRunning = true;
    w.tWasStopped = false;
    w.tQueued = false;
    if (w.tDelay === 0) {
      onStart(w); // :185-194
      w.tCalledOnStart = true;
      onRunning(w, 0, out);
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ------------------------------------------------------------------------------------------------
// the ports

/** A value's declared type for the editor (:914) — the five the type selector offers, else number. */
function valueType(params: Readonly<Rec>, v: string): 'number' | 'string' | 'boolean' | 'color' | 'textStyle' {
  const t = params['type-' + v];
  return t === 'string' || t === 'boolean' || t === 'color' || t === 'textStyle' ? t : 'number';
}

/**
 * :1071-1087 and the value outputs (:907-920) — for every name the generator's lists can bring, as a
 * fully wired graph would have them: a target registers each at mount.
 */
function derivedOutputs(params: Readonly<Rec>): Record<string, OutputDecl<State>> {
  const out: Record<string, OutputDecl<State>> = {};
  for (const v of universe(params.values, VALUE_LISTS)) {
    if (RESERVED_OUTPUTS.includes(v) || v === 'currentState' || v === 'error') continue;
    out[v] = { type: valueType(params, v), from: (s) => s.current[v], displayName: v, group: 'Values' };
  }
  for (const st of universe(params.states, STATE_LISTS)) {
    out['at-' + st] = { type: 'boolean', from: (s) => s.current['at-' + st], displayName: 'At ' + st, group: 'Current state' };
    out['reached-' + st] = { type: 'signal', displayName: 'Has Reached ' + st, group: 'Current state' };
  }
  return out;
}

const toState = (s: string) => ({ type: 'signal' as const, outcome: true, displayName: 'To ' + s, group: 'Go to state', description: 'Moves the node to the ' + s + ' state' });
const curvePort = (displayName: string, group: string) => ({
  type: '*' as const,
  coerce: 'none' as const,
  default: DEFAULT_CURVE,
  examples: [DEFAULT_CURVE, { curve: [0, 0, 1, 1], dur: 100, delay: 0 }, { curve: [0.42, 0, 0.58, 1], dur: 200, delay: 50 }, { curve: [0, 0, 1, 1], dur: 0, delay: 0 }, { curve: [0, 0, 1, 1], dur: 100, delay: -50 }],
  displayName,
  group,
  description: 'How this value moves into the state: the curve, its duration and its delay, in milliseconds'
});

/**
 * :456-526 `registerInputIfNeeded` — the names the node accepts on first write, by prefix, in the
 * order it tests them. Any other name is no input at all.
 */
function discover(port: string) {
  if (port.indexOf('to-') === 0) return toState(port.substring(3));
  if (port === 'startState') return { type: '*' as const, coerce: 'none' as const, displayName: 'Start State' };
  if (port === 'currentState') return { type: '*' as const, coerce: 'none' as const, displayName: 'State', group: 'States' };
  if (port.indexOf('type-') === 0) return { type: 'enum' as const, enums: VALUE_TYPES, default: 'number', coerce: 'none' as const, editOnly: true, displayName: port.substring(5), group: 'Types' };
  if (port.indexOf('value-') === 0) return { type: '*' as const, coerce: 'none' as const, displayName: port.split('-')[2] };
  if (port.search(/duration-/g) === 0) return { type: 'number' as const, coerce: 'none' as const, displayName: 'Duration' };
  if (port.search(/transition/g) === 0) return curvePort('Transition', 'Transitions');
  return undefined;
}

export const States = defineNode({
  type: 'States',
  // v2 (NSP-013 s16, row C21 ruled "fix it"): a transition that would animate along a curve that is not
  // four finite numbers with both x in [0, 1] reads as the state's Default transition (or, when the
  // Default is the one refused or is refused too, ease-out over 300 ms). v1 set such a value at once.
  version: 2,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/states.ts; packages/noodl-runtime/src/timerscheduler.ts; node_modules/bezier-easing (1.1.1); packages/noodl-viewer-react/src/color-reader.ts',
  needs: ['clock'],
  worldPool: { advances: [0, 1, 16, 50, 100, 150, 299, 300, 301, 1000] },
  outcomes: ['done', 'unchanged', 'failure'], // :425-429

  // :145-267 initialize — transitions on, no state, a timer of 300 ms, delay 0, neither queued nor running
  state: {
    states: undefined,
    values: undefined,
    state: undefined,
    startState: undefined,
    useTransitions: true,
    current: {},
    params: {},
    types: {},
    startValues: {},
    funcCurves: {},
    valuesAreInitialised: false,
    queue: [],
    scheduled: false,
    error: undefined,
    tCurves: undefined,
    tDuration: DEFAULT_DURATION,
    tDelay: 0,
    tQueued: false,
    tRunning: false,
    tStart: undefined,
    tCalledOnStart: false,
    tWasStopped: false,
    tStartValues: {},
    tTargetValues: {},
    tValueTypes: {},
    tUnreadable: {},
    outputs: []
  } as State,
  init: (_w, params) => ({ outputs: Object.keys(derivedOutputs(params)) }),
  // :268-270
  inspect: (s) => `Current state: ${s.state}`,

  inputs: {
    // :272-290
    states: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      examples: STATE_LISTS,
      displayName: 'States',
      group: 'States',
      description: 'Names of the states this node can be in; the node starts in the first'
    },
    // :291-328
    values: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      examples: VALUE_LISTS,
      displayName: 'Values',
      group: 'Values',
      description: 'Names of the values that differ between states, each becoming an output'
    },
    // :329-358
    toggle: { type: 'signal', outcome: true, displayName: 'Toggle', group: 'Go to state', description: 'Moves to the next state in the list, wrapping round after the last' },
    // :359-369 — stored raw, read for its truthiness
    useTransitions: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Use Transitions',
      group: 'General',
      description: 'Whether a state change animates its values or jumps straight to them'
    }
  },

  outputs: {
    // :372-380
    currentState: { type: 'string', from: (s) => s.state, displayName: 'State', group: 'Current State', description: 'Which state the node is in now' },
    // :381-386
    stateChanged: { type: 'signal', displayName: 'State Changed', group: 'Current State', description: 'Fires on every state change except entering the first, which is where the node starts' },
    // :405-413
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Which state was asked for and which ones this node actually has' }
  }
}).on(
  {
    // :277-289
    states: (s, v) => {
      const w = draft(s);
      w.states = v ? (v as unknown as string).split(',') : [];
      if (w.states.length > 0 && !w.state) schedule(w, w.startState || w.states[0]);
      return { set: { states: w.states, queue: w.queue, scheduled: w.scheduled } };
    },
    // :296-327 — a reserved name is refused on the error channel and gets no output; every other name's output exists already
    values: (_s, v) => ({ set: { values: v ? (v as unknown as string).split(',') : [] } }),
    // :365-368
    useTransitions: (_s, v) => ({ set: { useTransitions: v } }),
    // :333-357
    toggle: (s) => {
      const w = draft(s);
      if (!w.states || w.states.length === 0) {
        w.error = NO_STATES_MESSAGE; // :339-345 → :634-639
        return { set: { error: w.error }, outcome: 'failure', error: NO_STATES_CODE };
      }
      const idx = w.states.indexOf(w.state as string);
      const nextIdx = (idx + 1) % w.states.length;
      if (schedule(w, w.states[nextIdx], 'toggle') === 'unchanged') return { outcome: 'unchanged' }; // :678 — nothing queued
      return { set: { queue: w.queue, scheduled: w.scheduled }, outcome: 'deferred' };
    }
  },
  {
    derived: {
      // :901-1100 updatePorts — what the editor draws for these params
      inputs: (params) => {
        const states = listOf(params.states);
        const values = listOf(params.values);
        const out: Record<string, ReturnType<typeof discover> & object> = {};
        for (const v of values) out['type-' + v] = discover('type-' + v)!;
        for (const st of states) {
          for (const v of values) {
            const t = valueType(params, v);
            out['value-' + st + '-' + v] = { type: t, coerce: 'none', displayName: v, group: st + ' Values' } as never;
          }
          if (values.length > 0 && params.useTransitions !== false) {
            out['transitiondef-' + st] = curvePort('Default', st + ' Transitions');
            for (const v of values) {
              const t = params['type-' + v];
              if (t === undefined || t === 'number' || t === 'color') out['transition-' + st + '-' + v] = curvePort(v, st + ' Transitions');
            }
          }
          out['to-' + st] = toState(st);
        }
        if (states.length > 0) {
          out.currentState = { type: 'enum', enums: states, default: (params.startState as string) || states[0], coerce: 'none', displayName: 'State', group: 'States' } as never;
        }
        return out;
      },
      outputs: derivedOutputs,
      // :474-526 — the value setters
      on: (s, port, value) => {
        const w = draft(s);
        if (port === 'startState') {
          w.startState = value; // :480-481
          schedule(w, value);
          return { set: { startState: w.startState, queue: w.queue, scheduled: w.scheduled } };
        }
        if (port === 'currentState') {
          schedule(w, value); // :487
          return { set: { queue: w.queue, scheduled: w.scheduled } };
        }
        if (port.indexOf('type-') === 0) return { set: { types: { ...s.types, [port]: value } } }; // :492
        if (port.indexOf('value-') === 0) {
          const parts = port.split('-'); // :497-499
          w.params[port] = value;
          if (w.state === parts[1]) w.current[parts[2]] = value; // :504-508
          return { set: { params: w.params, current: w.current } };
        }
        return { set: { params: { ...s.params, [port]: value } } }; // :511-525 duration-…, transition…
      },
      // :462-473 — `to-<state>`
      signal: (s, port) => {
        const w = draft(s);
        if (schedule(w, port.substring(3), port) === 'unchanged') return { outcome: 'unchanged' }; // :678 — nothing queued
        return { set: { queue: w.queue, scheduled: w.scheduled }, outcome: 'deferred' };
      },
      discover,
      candidates: ['currentState', 'startState', 'to-A', 'to-B', 'to-Z', 'value-A-x', 'value-B-x', 'transitiondef-B', 'transition-B-x', 'type-x']
    },
    // the frame: the queued moves (:688-698), then the scheduler's timer pass (timerscheduler.ts :116-198)
    afterInputs: (s, _i, world) => {
      const w = draft(s);
      const out: Out = { pulses: [], outcomes: [], world };
      if (w.scheduled) {
        w.scheduled = false;
        const requested = w.queue;
        w.queue = [];
        for (let i = 0; i < requested.length; i++) goToState(w, requested[i].state, i < requested.length - 1, requested[i].port, out);
      }
      runTimers(w, world.now(), out);
      return { set: w, pulses: out.pulses, outcomes: out.outcomes };
    }
  }
);
