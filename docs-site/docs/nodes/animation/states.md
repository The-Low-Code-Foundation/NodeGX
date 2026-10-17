---
title: "States"
---
Named state machine: define states and values, set each value per state, and outputs switch or tween when the state changes.

States is configured with two editable lists: `states` (state names, e.g. 'Hidden,Shown') and `values` (value names, e.g. 'opacity,tint'). From these the editor generates ports: each value becomes an output whose current setting depends on the active state, and each state gets ports to enter it and observe it. On a state change every value output updates — number and color values tween along per-state transition curves (default 300 ms ease-out bezier), while string, boolean and textStyle values switch instantly. The first state in the list is the initial state; it is applied at startup without firing `stateChanged`. This is the idiomatic node for coordinated show/hide and multi-property animations.

## When to use it

Reach for States whenever several properties must change together between named modes (open/closed, idle/loading/done) — it replaces the deprecated Animation and Transition nodes. For animating a single number toward a moving target use net.noodl.animatetovalue; for pure branching logic with no animated values use Condition or Switch.

## At a glance

| | |
|---|---|
| Category | Animation |
| Type name | `States` |
| Available in | browser |
| SSR compatibility | partial — The scheduler clock is frozen during server render; state transitions do not animate or complete there. |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 5 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `states` | Stringlist | — | Names of the states this node can be in; the node starts in the first |
| `useTransitions` | Boolean | `true` | Whether a state change animates its values or jumps straight to them |
| `values` | Stringlist | — | Names of the values that differ between states, each becoming an output |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `toggle` | Signal | — | Moves to the next state in the list, wrapping round after the last |

### What each input does

**States** (`states`)

- always: the list of states; while none is current, the first (or Start State) is entered at the end of the frame

**Values** (`values`)

- always: the values that differ between states, each an output; a value named as one of the node's outputs is refused and the editor is told

**Use Transitions** (`useTransitions`)

- always: whether the next move animates its values or jumps

**Toggle** (`toggle`)

- no States: refused, and Error says so → Failure
- already in, or already heading to, the next state → Unchanged
- otherwise it moves to the next state, wrapping round after the last, at the end of the frame — State Changed, then Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `currentState` | String | — | Which state the node is in now |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once a Toggle or To &lt;state> you triggered has moved the node, after State Changed |
| `stateChanged` | Signal | — | Fires on every state change except entering the first, which is where the node starts |
| `unchanged` | Signal | — | Fires when the node is already in the state you asked for, or already heading there in this pass |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Which state was asked for and which ones this node actually has |
| `failure` | Signal | — | Fires when a state was asked for that this node does not have, leaving it where it was |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Ports are generated from the "states" and "values" parameters: each value gets one input per state (`value-<state>-<value>`) and a current-value output; each state gets an activation signal input (`to-<state>`), a boolean output (`at-<state>`) and a signal output (`reached-<state>`). Once "states" is set the node also mints a single enum INPUT named `currentState` — the same name as the declared string output — which selects a state by name in one wire, without a signal port per state.

## Ports at runtime

All state- and value-specific ports are runtime-discovered: the viewer generates them from the `states` and `values` parameters and pushes them to the editor per instance. For each value V: an output named `V` (connections only; type chosen by a generated enum input `type-V` — number, string, boolean, color or textStyle, default number). For each state S and value V: an input `value-S-V` holding V's setting while in state S. For each state S: a signal input `to-S` (go to S), a boolean output `at-S` (true while S is active), a signal output `reached-S` (fires when the transition into S completes — immediately when there is no transition), and, while `useTransitions` is on, a curve input `transitiondef-S` (state-wide default) plus per-value overrides `transition-S-V` for number/color values. Separately, once `states` is set the node mints ONE enum input named `currentState`, sharing the name of the declared string output and defaulting to the first state; writing or wiring it moves the node to that state. An authoring tool should write `states`, `values`, `type-V` and `value-S-V` as parameters, and read `V`, `at-S` and `reached-S`. To change state it has two forms and they are not interchangeable: wire a signal to `to-S` when an event causes the change (a click, a `done`), and wire a VALUE to `currentState` when the state IS a value the component was handed (a `size`, a `tone`, a `Request Type`) — the second is one wire where the first would need one port per state plus a Condition chain. The runtime registers all of these names on demand.

## Patterns

- Button `onClick` → `to-<state>` to enter a specific state; `toggle` when there are exactly two states.
- One value output → a Group's `opacity` and another → Color Blend `blendValue`: several properties animate together from a single state change.
- `at-<state>` (boolean) → `visible` or `enabled` inputs: gate UI on the current state as a level.
- `Component Inputs.<enum>` → `States.currentState` (the enum INPUT): the component takes its variant as a parameter and the state machine holds the per-variant values. This is how a `size`/`tone`/`type` port reaches a States node in one wire — `library/prefabs` uses it in toast (`Type`), xano (`Request Type`, `Auth Token Storage`) and media-query (`Debugger Position`).
- `reached-<state>` (signal) → a follow-up action: sequence work after the transition finishes ( `stateChanged` fires at the start, `reached-` at the end).

## Watch out for

- Comparing `currentState` strings in an Expression to derive booleans — the generated `at-<state>` outputs already provide them.
- One signal input per state plus a Condition or Switch chain to pick between them, where the state is simply a value the component was given — wire that value to the `currentState` enum input instead.
- Wiring `stateChanged` where 'animation done' is meant; it fires when the change starts. Use `reached-<state>`.

## Examples

**States: a collapsible panel with transitioned values**

States is the interaction state machine: the `states` parameter names the states ('collapsed,expanded'), the `values` parameter names the outputs each state assigns ('panelHeight'), and with `useTransitions` on, changing state tweens each value. `toggle` flips between two states; the per-value output drives the layout input (number→dimension cast gives pixels). Signal outputs per state and `stateChanged` are registered from the same configuration — this is the current replacement for the deprecated Animation node.

**One size port, three sizes: a variant selector wired into States**

The component a page places three times at three sizes, without three components. `size` is a `Component Inputs` port wired straight into `States.currentState` — 🔴 that port is TWO ports sharing one name: a static string **output** that reports the current state, and, once `states` is set, a generated **enum input** that selects one by name. The input is the wire that makes a variant port work, and a chain of `Condition` nodes each setting one property is the same idea written badly. The `values` parameter (`padX,padY,labelSize`) mints one input per state per value (`value-small-padX`) and one output per value, so each state assigns the whole set at once and the graph carries no branch. `showDot` is the other half of a real interface: chrome chosen at the instance, not by making a second component. And the badge publishes `clicked`, so the page can act on a press — a component that only draws is a component the page has to work around.

**Blink a button, and stop cleanly**

A strobe is a good miniature of a hard problem: something that keeps running after the signal that started it, and therefore has to be stopped by something other than the thing that started it. A `Javascript2` node owns the interval, a `Switch` turns it on and off, a `States` node carries the two appearances, and a `Number` makes the period an input instead of a literal. ⚠️ The half people leave out is the reset — stopping an interval without restoring the state leaves the button frozen in whichever half of the blink it happened to be in, which looks like a different bug entirely. This one restores it.

**One button component that drives any editor command**

A toolbar has a dozen buttons that differ only in a label, an icon and the name of the command they run — so this makes them one component with those three as inputs. A `States` node turns the button's type into its label, a `JavaScriptFunction` calls the matching command on the editor instance, and `Component Outputs` reports back whether the mark is currently active so the button can render as pressed. The lesson is not about Tiptap: it is that 'twelve buttons' and 'one button placed twelve times' are the same screen, and only one of them is editable later. 🔴 A component parameter arrives ONLY through a `Component Inputs` node whose ports are plugged `output` — that inversion is what makes this work, and it is the single most common thing to get backwards.

## Related nodes

[Animate To Value](./net-noodl-animatetovalue.md), [Color Blend](../interpolation/color-blend.md), [Condition](../logic/condition.md), [Switch](../logic/switch.md), [Group](../visual/group.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 5. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "useTransitions": true,
  "current": {},
  "params": {},
  "types": {},
  "startValues": {},
  "funcCurves": {},
  "valuesAreInitialised": false,
  "queue": [],
  "scheduled": false,
  "tDuration": 300,
  "tDelay": 0,
  "tQueued": false,
  "tRunning": false,
  "tCalledOnStart": false,
  "tWasStopped": false,
  "tStartValues": {},
  "tTargetValues": {},
  "tValueTypes": {},
  "tUnreadable": {},
  "warnings": {},
  "warnedTransitions": {}
}
```

### How actions report back

Each time Toggle is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| a state was asked for that is not in the list, and no state in the list has been asked for since | — | `states/unknown-state` |
| a Toggle or a To arrived with no States list | — | `states/no-states` |
| a move would have animated along a transition that is not a curve | — | `states/unreadable-transition` |
| a value is named as one of the node's own outputs | — | `states/reserved-port-name` |

### Version history

- **Version 5**: What the node tells the editor is now in this spec: an unknown state (until a known one is asked for), no States list, an unreadable transition and a value named as one of the node's outputs. The runtime has always told it. Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/states.ts"
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
 * NOT fire (:601-613). Every later move (:769-850): text (`undefined` → `''`, v4), text styles and true/false (`undefined` →
 * false, else `!!`) are set at once; a number or a colour transitions on the state's curve for that
 * value (`transition-<state>-<value>`, else the state's `transitiondef-<state>`, else ease-out over
 * 300 ms, :791-797) unless that curve is 0 ms with 0 delay, `Use Transitions` is off, or the state is
 * one the frame only passes through — then it is set at once (:799-808). Every later move first stops a run still going
 * (v3, row C22; the timer is otherwise only restarted when something animates). `State` moves at once and
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
 * over 300 ms — and the node reports it once (`states/unreadable-transition`, in the trace since v5).
 * A transition that sets its value at once (0 ms and no delay, Use Transitions off, a state only
 * passed through) never reads its curve, so it is never refused. In v1 the runtime threw there:
 * the state did not move and no outcome was reported.
 *
 * THE EDITOR (v5, NSP-019 R35). What the node tells the editor is declared in `diagnostics`. Its reports reach the editor
 * through the error bus (`raiseRuntimeError` → runtimeerror.ts :177-186 `createEditorWarningSubscriber` → `sendWarning`,
 * keyed by the code), where the editor shows them as it shows a `setDiagnostic` sentence. A later raise of the same code
 * replaces the sentence. Only one is ever withdrawn: `states/unknown-state` is cleared when a request names a state in the
 * list (`scheduleGoToState` :722-724, before the already-heading-there check). The others stay until the node is deleted:
 * `states/no-states` (a Toggle or a To with no States list, `_failNoStates` :691-696 through the outcome's raise),
 * `states/unreadable-transition` (once per port and curve, :616-635), `states/reserved-port-name` (a value named as one of
 * the node's outputs, :349-355). `states/unreadable-color` (:597-614) asks the browser's `CSS.supports`, which a play does
 * not have, so this spec does not raise it; a target with a page that raises it diverges, which is the right reading.
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
  /** v5 — what the editor shows now, by key (THE EDITOR above); replaced, never edited in place. */
  warnings: Record<string, string>;
  /** :619-623 `warnedUnreadableTransitions` — the port + curve pairs already reported */
  warnedTransitions: Record<string, true>;
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
const RESERVED_NAME_CODE = 'states/reserved-port-name';
const UNREADABLE_TRANSITION_CODE = 'states/unreadable-transition';

/**
 * The lists the generator draws for `States` and `Values` (both panel-only; `examples`). NSP-020 s82: they pad nothing
 * any more — a value output exists once the `values` setter registers it (:338-358; both targets re-derive after the
 * write), and an `At` / `Has Reached` port exists only when a wire asks for it (`onWire`; `outputCandidates` below is
 * what a generated sequence may wire).
 */
const STATE_LISTS = ['A,B', 'A,B,C', 'B,A', 'A', ''];
const VALUE_LISTS = ['x', 'x,y', 'y,label,on'];
const VALUE_TYPES = ['number', 'string', 'boolean', 'color', 'textStyle'];
/** states.ts — the words the Types dropdowns show */
const VALUE_TYPE_LABELS: Readonly<Record<string, string>> = { number: 'Number', string: 'String', boolean: 'Boolean', color: 'Color', textStyle: 'Text Style' };

/** The editor's split of a list parameter (:908, :944) — a non-string reads as none. */
function listOf(value: unknown): string[] {
  return typeof value === 'string' && value ? value.split(',') : [];
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
 * the port exists (`hasOutput`, :257, :842, :860): a value output once `values` registered it, an
 * `at-` port once a wire asked for it (NSP-020 s82).
 */
function flag(w: State, name: string, out: Out): void {
  if (name === 'currentState' || name === 'error' || out.world.hasOutput(name)) out.world.send(name, w);
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
    tStartValues: { ...s.tStartValues },
    tTargetValues: { ...s.tTargetValues },
    tValueTypes: { ...s.tValueTypes },
    tUnreadable: { ...s.tUnreadable }
  };
}

/** `Has Reached <state>` — only where the port exists (:257, :842): a wire asked for it (`onWire`). */
function reached(w: State, out: Out): void {
  const port = 'reached-' + w.state;
  if (out.world.hasOutput(port)) out.pulses.push({ derived: port });
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

/** `raiseRuntimeError` reaching the editor (THE EDITOR above): the key's sentence, replacing any before it. */
function warn(w: State, key: string, message: string): void {
  w.warnings = { ...w.warnings, [key]: message };
}

/** :616-635 `warnUnreadableTransition` — once per port and curve as written */
function warnUnreadableTransition(w: State, port: string, transition: Curve): void {
  let shown: string;
  try {
    shown = JSON.stringify(transition);
  } catch (e) {
    shown = String(transition);
  }
  const key = port + ':' + shown;
  if (w.warnedTransitions[key]) return;
  w.warnedTransitions = { ...w.warnedTransitions, [key]: true };
  warn(
    w,
    UNREADABLE_TRANSITION_CODE,
    `The transition "${port}" is set to ${shown}, which is not a curve, so moves into that state use ` +
      `the state's Default transition instead. Set it in the curve editor, or as { curve: [x1, y1, x2, y2], dur, delay } ` +
      `with both x between 0 and 1.`
  );
}

/** `set` for a reducer that may have moved the editor's sentences: the key only when it did (a drop-set mutant must mean something). */
function editorSet(s: Readonly<State>, w: State): Partial<State> {
  return w.warnings !== s.warnings ? { warnings: w.warnings } : {};
}

/** :691-696 */
function failNoStates(w: State, port: string, out: Out): void {
  w.error = NO_STATES_MESSAGE;
  flag(w, 'error', out);
  warn(w, NO_STATES_CODE, NO_STATES_MESSAGE); // the outcome's raise (node.ts :1102-1113)
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
  warn(w, UNKNOWN_STATE_CODE, w.error); // :786
  if (port) out.outcomes.push({ port, outcome: 'failure', error: UNKNOWN_STATE_CODE });
  else out.pulses.push('failure');
}

/**
 * :640-699 `scheduleGoToState`. Returns `unchanged` when the request is already where the frame is
 * heading and an invocation asked (reported at once, :678), `deferred` when an invocation's request
 * was queued (its outcome is the frame end's), nothing for a setter's.
 */
function schedule(w: State, state: unknown, port?: string): 'unchanged' | 'deferred' | undefined {
  // :722-724 — a request naming a state in the list withdraws the editor's unknown-state sentence, whatever happens next
  if (state && w.states && w.states.indexOf(state as string) !== -1 && w.warnings[UNKNOWN_STATE_CODE] !== undefined) {
    const rest = { ...w.warnings };
    delete rest[UNKNOWN_STATE_CODE];
    w.warnings = rest;
  }
  const pendingTarget = w.queue.length > 0 ? w.queue[w.queue.length - 1].state : w.state;
  if (state && pendingTarget === state) return port ? 'unchanged' : undefined;
  w.queue.push(port ? { state, port } : { state });
  w.scheduled = true;
  return port ? 'deferred' : undefined;
}

/** `typedStateValue` — a true/false or a text as every move publishes it, the first entry too (ISL-002) */
function typedStateValue(type: unknown, value: unknown): { value: unknown } | undefined {
  if (type === 'boolean') return { value: value === undefined ? false : !!value };
  if (type === 'string') return { value: value === undefined ? '' : value }; // v4 (row D19 ruled "Send empty text")
  if (type === 'textStyle') return { value };
  return undefined;
}

/** :580-616 `jumpToState` — the first move */
function jumpToState(w: State, state: unknown, out: Out): void {
  if (!w.states) return;
  if (!state) state = w.states[0];
  if (w.state === state) return;
  stop(w);
  const prefix = 'value-' + state + '-';
  for (const v of w.values ?? []) {
    const typed = typedStateValue(w.types['type-' + v], w.params[prefix + v]);
    w.current[v] = typed ? typed.value : w.params[prefix + v] || 0; // `|| 0` for numbers and colours only (ISL-002)
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
  stop(w); // v3 (row C22 ruled "Stop the running animation"): every later move stops a run still going
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let delay: any = 0;
  let dur: any = 0;
  const curves: Record<string, Curve> = {};
  for (const v of w.values ?? []) {
    w.startValues[v] = w.current[v]; // :777
    const typed = typedStateValue(w.types['type-' + v], w.params['value-' + state + '-' + v]);
    if (typed) {
      w.current[v] = typed.value;
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
        warnUnreadableTransition(w, fromPort, c); // :873
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

/** :1151-1165 — the `At <state>` and `Has Reached <state>` ports: drawn from the States list; at play only where a wire asks (`onWire`). */
const atPort = (st: string): OutputDecl<State> => ({ type: 'boolean', from: (s) => s.current['at-' + st], displayName: 'At ' + st, group: 'Current state', onWire: true });
const reachedPort = (st: string): OutputDecl<State> => ({ type: 'signal', displayName: 'Has Reached ' + st, group: 'Current state', onWire: true });

/**
 * `updatePorts` :977-1000 (the value outputs — no display name, group Values, typed by `type-<v>`) and :1151-1165 (the two
 * per state). The editor's list for these params; a target registers the values (the `values` setter does, :338-358 —
 * re-derived after each write) and, of the state ports, only the wired ones (nodescope.ts :150).
 */
function derivedOutputs(params: Readonly<Rec>): Record<string, OutputDecl<State>> {
  const out: Record<string, OutputDecl<State>> = {};
  for (const v of listOf(params.values)) {
    if (RESERVED_OUTPUTS.includes(v) || v === 'currentState' || v === 'error') continue; // :316-323 refused by the setter
    out[v] = { type: valueType(params, v), from: (s) => s.current[v], group: 'Values' };
  }
  for (const st of listOf(params.states)) {
    out['at-' + st] = atPort(st);
    out['reached-' + st] = reachedPort(st);
  }
  return out;
}

/** :465-480 `registerOutputIfNeeded` — a wire brings any name into being; the two the spec can say something about. */
function discoverOutput(port: string): OutputDecl<State> | undefined {
  if (port.startsWith('at-')) return atPort(port.slice(3));
  if (port.startsWith('reached-')) return reachedPort(port.slice(8));
  return undefined;
}

const toState = (s: string) => ({ type: 'signal' as const, outcome: true, connectionsOnly: true, displayName: 'To ' + s, group: 'Go to state', description: 'Moves the node to the ' + s + ' state' });
const curvePort = (displayName: string, group: string, dflt: unknown = DEFAULT_CURVE) => ({
  type: 'curve' as const,
  coerce: 'none' as const,
  default: dflt,
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
  if (port.indexOf('type-') === 0) return { type: 'enum' as const, enums: VALUE_TYPES, labels: VALUE_TYPE_LABELS, default: 'number', coerce: 'none' as const, editOnly: true, displayName: port.substring(5), group: 'Types' };
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
  // v3 (P109 ISL-032, row C22 ruled "Stop the running animation"): every move after the first stops a run still going, so
  // a move that sets every value at once lands where it says and Has Reached fires once; v2 let the old run land its target.
  // v4 (P109 ISL-032, row D19 ruled "Send empty text"): a text a state leaves empty is sent as empty text on every move into
  // it, the first entry too; v3 left it unset, so the wire kept the previous state's text.
  // v5 (NSP-019 R35): what the node tells the editor is declared (`diagnostics`); nothing on a wire moves.
  version: 5,
  changes: [
    {
      version: 5,
      says: 'What the node tells the editor is now in this spec: an unknown state (until a known one is asked for), no States list, an unreadable transition and a value named as one of the node\'s outputs. The runtime has always told it',
      row: 'NSP-019 R35 (P107 s103)',
      migration: { none: 'Only the editor is told, and the runtime already told it. Nothing a wire carries changes' }
    }
  ],
  // THE EDITOR (above): each key shows the last sentence raised under it
  diagnostics: {
    'states/unknown-state': { says: 'a state was asked for that is not in the list, and no state in the list has been asked for since', message: (_i, s) => s.warnings[UNKNOWN_STATE_CODE] },
    'states/no-states': { says: 'a Toggle or a To arrived with no States list', message: (_i, s) => s.warnings[NO_STATES_CODE] },
    'states/unreadable-transition': { says: 'a move would have animated along a transition that is not a curve', message: (_i, s) => s.warnings[UNREADABLE_TRANSITION_CODE] },
    'states/reserved-port-name': { says: 'a value is named as one of the node\'s own outputs', message: (_i, s) => s.warnings[RESERVED_NAME_CODE] }
  },
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
    warnings: {},
    warnedTransitions: {}
  } as State,
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
      return {
        says: 'always: the list of states; while none is current, the first (or Start State) is entered at the end of the frame',
        set: { states: w.states, queue: w.queue, scheduled: w.scheduled, ...editorSet(s, w) }
      };
    },
    // :296-327 — a reserved name is refused on the error channel and gets no output; every other name's output exists already
    values: (s, v) => {
      const w = draft(s);
      w.values = v ? (v as unknown as string).split(',') : [];
      for (const name of w.values) {
        if (RESERVED_OUTPUTS.indexOf(name) !== -1) warn(w, RESERVED_NAME_CODE, `"${name}" is one of the node's own output ports and cannot also be a value — rename the value`); // :349-355
      }
      return { says: 'always: the values that differ between states, each an output; a value named as one of the node\'s outputs is refused and the editor is told', set: { values: w.values, ...editorSet(s, w) } };
    },
    // :365-368
    useTransitions: (_s, v) => ({ says: 'always: whether the next move animates its values or jumps', set: { useTransitions: v } }),
    // :333-357
    toggle: (s) => {
      const w = draft(s);
      if (!w.states || w.states.length === 0) {
        w.error = NO_STATES_MESSAGE; // :372-378 → :691-696
        warn(w, NO_STATES_CODE, NO_STATES_MESSAGE);
        return { says: 'no States: refused, and Error says so', set: { error: w.error, ...editorSet(s, w) }, outcome: 'failure', error: NO_STATES_CODE };
      }
      const idx = w.states.indexOf(w.state as string);
      const nextIdx = (idx + 1) % w.states.length;
      if (schedule(w, w.states[nextIdx], 'toggle') === 'unchanged') return { says: 'already in, or already heading to, the next state', set: editorSet(s, w), outcome: 'unchanged' }; // :678 — nothing queued
      return {
        says: 'otherwise it moves to the next state, wrapping round after the last, at the end of the frame — State Changed, then Done',
        set: { queue: w.queue, scheduled: w.scheduled, ...editorSet(s, w) },
        outcome: 'deferred'
      };
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
              // :1030 — a value's own curve defaults to the state's Default transition as set
              if (t === undefined || t === 'number' || t === 'color') out['transition-' + st + '-' + v] = curvePort(v, st + ' Transitions', params['transitiondef-' + st] || DEFAULT_CURVE);
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
          return { set: { startState: w.startState, queue: w.queue, scheduled: w.scheduled, ...editorSet(s, w) } };
        }
        if (port === 'currentState') {
          schedule(w, value); // :487
          return { set: { queue: w.queue, scheduled: w.scheduled, ...editorSet(s, w) } };
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
        if (schedule(w, port.substring(3), port) === 'unchanged') return { set: editorSet(s, w), outcome: 'unchanged' }; // :678 — nothing queued
        return { set: { queue: w.queue, scheduled: w.scheduled, ...editorSet(s, w) }, outcome: 'deferred' };
      },
      discover,
      candidates: ['currentState', 'startState', 'to-A', 'to-B', 'to-Z', 'value-A-x', 'value-B-x', 'transitiondef-B', 'transition-B-x', 'type-x'],
      // NSP-020 s82 — the state ports a generated sequence may wire (the states STATE_LISTS can bring)
      discoverOutput,
      outputCandidates: ['A', 'B', 'C'].flatMap((st) => ['at-' + st, 'reached-' + st]),
      // :338-358 — the `values` setter registers each value output as the list is written: the one param whose write moves a port
      rederive: ['values']
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
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
