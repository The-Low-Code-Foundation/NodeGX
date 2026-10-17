---
title: "Show Popup"
---
Show Popup: overlays a component on top of the app when triggered; the popup closes itself and can hand back results.

Show Popup instantiates `target` (a component) as an overlay above everything else when `show` fires. The popup component owns its dismissal: a Close Popup node inside it removes the overlay, fires this node's `Closed` signal, and delivers any declared result values as outputs here — plus one signal output per close action, so 'confirmed' and 'dismissed' can be told apart at the call site. `Closed` is a *later* event about a popup that opened — `done` is the one that says the `show` itself finished, and it fires the moment the popup is on screen. The popup is a modal dialog without any wiring: it is announced as a dialog (named by `accessibleName`, or by the first h1–h3 inside it), the page behind it is inert so Tab stays inside, focus moves into it on open and back to whatever opened it on close, and Escape closes the top popup and fires `Cancelled`.

## When to use it

Dialogs, sheets, confirmations — transient UI that must sit above the page and return an answer. For a persistent section of the page, conditional `mounted` on a Group is lighter; for full pages use Router or Component Stack.

## At a glance

| | |
|---|---|
| Category | Navigation |
| Type name | `NavigationShowPopup` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `accessibleName` | String | — | What a screen reader announces when the popup opens. Leave empty to use the first heading inside the popup |
| `closeOnEscape` | Boolean | `true` | Lets the person close the popup with the Escape key, which fires Cancelled. Turn off for a popup that must be finished or closed by its own buttons |
| `modal` | Boolean | `true` | A modal popup is a dialog: the page behind it cannot be used, focus moves into it and Escape closes it. Turn off for an overlay that is not a dialog, such as a toast |
| `stackPolicy` | Enum (`replace`, `stack`) | `replace` | Replace It closes the popup already showing, Show On Top opens this one over it |
| `target` | Component | — | Component to open as a popup; its Component Inputs become input ports on this node |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `show` | Signal | — | Opens Target as a popup |

### What each input does

**Target** (`target`)

- always: kept; the component the next Show opens

**When A Popup Is Open** (`stackPolicy`)

- always: kept (anything but Show On Top is Replace It); read by the next Show

**Close On Escape** (`closeOnEscape`)

- always: kept (only false turns it off); read by the next Show

**Modal** (`modal`)

- always: kept (only false turns it off); read by the next Show

**Accessible Name** (`accessibleName`)

- always: kept when it is text (anything else is none); read by the next Show

**Show** (`show`)

- always: Target opens as a popup at the frame's end; each press is answered there, Failure with Error when it cannot open

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `Cancelled` | Signal | — | Fires when the person closed the popup with the Escape key, so there are no Close Results |
| `Closed` | Signal | — | Fires when the popup was closed without a close action, after Close Results are up to date |
| `Dismissed` | Signal | — | Fires when another popup replaced this one before the user closed it, so there are no Close Results |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the popup has been opened. Closed and Dismissed are later events about the same popup, not this signal |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the popup did not open, set just before Failure fires |
| `failure` | Signal | — | Fires when no Target is set, or the component could not be opened |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Input ports mirror the component inputs of the target popup component; close-result outputs mirror its Component Outputs.

## Ports at runtime

Result-value outputs and per-close-action signals are generated from the Close Popup configuration inside the target component; the target's Component Inputs also surface as inputs here. All of it is project-content-determined.

## Patterns

- Confirmation dialog: show → popup's confirm/cancel close actions → distinct signals at the caller.

## Watch out for

- Closing a popup from outside it — dismissal belongs inside the popup component, where Close Popup works.
- Building a dialog as a custom React component to get Escape, focus handling or dialog semantics — Show Popup provides all three.

## Examples

**Show a popup and close it from inside with a close action**

The popup pair: a Show Popup node (NavigationShowPopup) opens the /Confirm Delete Dialog component as an overlay when the Delete-account button is clicked. The Close Popup node (NavigationClosePopup) lives INSIDE the popup component — it is the only way the popup ends itself. Its `closeActions` parameter declares 'confirm,cancel', which registers `closeAction-confirm` and `closeAction-cancel` signal inputs on Close Popup and matching signal outputs on the Show Popup node that opened it: the host reacts to `closeAction-confirm` without knowing anything about the dialog's internals. A close action both closes the popup and routes the outcome; plain `close` (not used here) would fire Show Popup's generic `Closed` output instead.

## Related nodes

[Close Popup](./navigation-close-popup.md), [Component Stack](../visual/page-stack.md), [Group](../visual/group.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- popups (`popup`)

### Starting state

```json
{
  "popupParams": {},
  "closeResults": {},
  "scheduled": false,
  "presses": 0,
  "opened": 0,
  "stack": [],
  "leaving": []
}
```

### How actions report back

Each time Show is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/show-popup.ts"
/**
 * Show Popup (`NavigationShowPopup`) — read from `packages/noodl-viewer-react/src/nodes/navigation/showpopup.ts`
 * and `packages/noodl-runtime/src/nodecontext.ts` (`showPopup`, `_dismissOpenPopups`, `cancelTopPopup`) on
 * 2026-10-02 (NSP-015 s20).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Show` defers its work to the frame's end (:122-131, :202-219) — every press in
 * a frame is answered, all with the ONE outcome of ONE show made against the frame's final inputs. With no Target
 * (`undefined` or `null`, :226) Error is set and every press is Failure `show-popup/no-target`, and nothing is
 * handed. Otherwise the popup is handed to the runtime (world.ts POPUP) — `{ target, params, stackPolicy,
 * closeOnEscape, modal, accessibleName }` (:249-254): Target as stored, the `popupParam-` values by name, When A
 * Popup Is Open `replace` unless set to `stack`, Close On Escape and Modal on unless set to `false`, Accessible
 * Name only when a string was set. What the runtime does with it is the popup STACK, which this spec keeps for the
 * popups this node opened (nodecontext.ts :1212-1330):
 *   - no popup host: nothing opens, and every press is Done (:1213, :288-301);
 *   - `replace`: every popup on the stack is dismissed FIRST, each telling its opener `Dismissed` (:1240-1242,
 *     :1220-1236); then the new popup takes a slot on top (:1243);
 *   - the component builds: Done (:288-290); it does not: Error is set to `The popup "<target>" could not be
 *     opened: <why>` and every press is Failure `show-popup/target-failed` (:291-297), and its slot is given back
 *     (v2, row C30 — v1 kept it: a later Replace It reported Dismissed for it, and on top it took Escape).
 * NOT REACHED BY ONE NODE'S PLAY (the world answers a show at once): a popup replaced while it is still being built —
 * two Show Popups pressed in one frame — tells its opener Dismissed and nothing else; Done means the popup opened
 * (row C32, fixed in P109 ISL-028: it also reported Done). Graded by `scenarios/graph/t12-popups.json`.
 * LATER, what the person does (world.ts POPUP `events`) — a close through the popup's Close Popup, or Escape (the
 * top popup whose Modal is on, and only when its Close On Escape is on and it was built, :1183-1195) — takes the
 * popup off the stack at the START of the next frame (:1284-1300) and only then tells this node: a close's
 * results become Close Results (every `closeResult-` port named in them is sent, :266-271), then its action's
 * signal or `Closed` (:273-274 — an action this node has no port for sends nothing at all); an Escape is
 * `Cancelled` (:255-257). The first close or Escape aimed at a popup wins; one aimed at a popup no longer open does
 * nothing. Error keeps its last message — nothing clears it.
 * The ports: `popupParam-<name>` (the target component's inputs) and `closeResult-<name>` / `closeAction-<name>`
 * (from the Close Popups inside it) come from the PROJECT (setup :341-416), not from this node's params —
 * NSP-020's case. Inputs are registered on first write (:303-312); an output exists only when a wire registered it
 * (:313-329) and every send asks for it (:270; `sendSignalOnOutput` of an output that is not there sends nothing). NSP-020
 * s84: a play names its wires (`wiredOutputs`); a generated sequence wires from Results `name,ok` and Close Actions
 * `Save,Cancel` (`outputCandidates`).
 */

import { defineNode, type OutputDecl, type SignalOutputDecl, type ValueInputDecl, type ValueType } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

/** One of this node's slots on the context's popup stack (nodecontext.ts `PopupStackEntry`). */
type Slot = Readonly<{
  /** the ordinal of the popup among those this node opened (a build that failed holds no slot: v2, C30) */
  n: number;
  modal: boolean;
  closeOnEscape: boolean;
  /** a close or an Escape is on its way: it leaves at the next frame's start */
  leaving: boolean;
}>;

/** What the next frame's start tells this node about a popup leaving (:1284-1307). */
type Leave = Readonly<{ n: number; kind: 'closed'; action: unknown; results: Rec } | { n: number; kind: 'cancelled' }>;

type State = {
  /** :20 `_internal.target` — `undefined` until written */
  target: unknown;
  /** :22 `_internal.stackPolicy` — `undefined` until written (the declared default never runs the setter) */
  stackPolicy: 'replace' | 'stack' | undefined;
  /** :24 */
  closeOnEscape: boolean | undefined;
  /** :28 */
  modal: boolean | undefined;
  /** :26 */
  accessibleName: string | undefined;
  /** :53 `_internal.popupParams` */
  popupParams: Rec;
  /** :54 `_internal.closeResults` */
  closeResults: Rec;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :21 `hasScheduledShow` */
  scheduled: boolean;
  /** :38 `pendingShowOutcomes.length` */
  presses: number;
  /** how many popups this node has opened (built) */
  opened: number;
  /** this node's slots on the popup stack, bottom first */
  stack: readonly Slot[];
  /** popups leaving at the next frame's start, in the order they were closed */
  leaving: readonly Leave[];
};

// :303-312 `registerInputIfNeeded` — `registerInput(name, { set })`: no type, no conversion, stored raw
const popupParamPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Params', examples: [1, 'a', '', null, { id: 2 }] });

/** The Close Popup ports a generated sequence may wire (see the header): Results `name,ok`, Close Actions `Save,Cancel`. */
const RESULTS = ['name', 'ok'] as const;
const ACTIONS = ['closeAction-Save', 'closeAction-Cancel'] as const;

/** :313-329 registerOutputIfNeeded — a Close Result reads the results the popup handed back; a Close Action is a signal. */
const closeResult = (name: string, type: ValueType | 'signal' = '*'): OutputDecl<State> => ({ type: type === 'signal' ? '*' : type, displayName: name, group: 'Close Results', description: 'The close result ' + name + ', as the popup handed it back', from: (s) => s.closeResults[name] });
const closeAction = (name: string): SignalOutputDecl => ({ type: 'signal', displayName: name, group: 'Close Actions', description: 'Fires when the popup was closed with this close action' });
const listOf = (v: unknown): string[] => (typeof v === 'string' ? v.split(',') : []);

const NO_TARGET = 'No Target component is set on this Show Popup node';

export const ShowPopup = defineNode({
  type: 'NavigationShowPopup',
  // v2 (P109 ISL-028, row C30 ruled "Give the place back"): a popup whose build failed gives its slot back. v1 kept
  // it: a later Replace It told this node Dismissed for a popup that never opened, and on top it took Escape away
  // from the popup beneath.
  version: 2,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/showpopup.ts',
  needs: ['popup'],
  worldPool: {
    popups: [
      {},
      { components: ['Popup'] },
      { host: false },
      { components: ['Popup', 'Other'], events: [{ at: 1, close: { results: { name: 'A', ok: true } } }, { at: 5, escape: true }] },
      { components: ['Popup'], events: [{ at: 2, escape: true }, { at: 2, escape: true }, { at: 10, close: { action: 'closeAction-Save', results: { ok: false, extra: 1 } } }] },
      { components: ['Other'], events: [{ at: 1, close: { action: 'closeAction-Nope', results: {} }, popup: 0 }, { at: 3, close: { action: 'closeAction-Cancel' }, popup: 1 }, { at: 3, escape: true }] },
      { components: ['Popup', 'Other'], events: [{ at: 1, close: { action: '', results: { name: null } } }, { at: 1, close: { results: { name: 'B' } } }, { at: 4, escape: true }, { at: 6, close: { results: { ok: 1 } }, popup: 0 }] }
    ],
    advances: [0, 1, 2, 5, 10]
  },

  // :52-55 initialize; every declared default reaches `_inputValues`, never the setter
  state: {
    target: undefined,
    stackPolicy: undefined,
    closeOnEscape: undefined,
    modal: undefined,
    accessibleName: undefined,
    popupParams: {},
    closeResults: {},
    error: undefined,
    scheduled: false,
    presses: 0,
    opened: 0,
    stack: [],
    leaving: []
  } as State,
  // :176-179 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :57-65 — stored raw
    target: { type: 'component', coerce: 'none', displayName: 'Target', group: 'General', description: 'Component to open as a popup; its Component Inputs become input ports on this node', examples: ['Popup', 'Other', 'Nope', '', null] },
    // :66-81 — `stack` or else `replace`
    stackPolicy: {
      type: 'enum',
      enums: ['replace', 'stack'],
      default: 'replace',
      coerce: 'none',
      displayName: 'When A Popup Is Open',
      group: 'General',
      description: 'Replace It closes the popup already showing, Show On Top opens this one over it',
      examples: ['replace', 'stack', 'other', null]
    },
    // :87-96 — `value !== false`
    closeOnEscape: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Close On Escape',
      group: 'General',
      description: 'Lets the person close the popup with the Escape key, which fires Cancelled. Turn off for a popup that must be finished or closed by its own buttons',
      examples: [true, false, 0, 'false', null]
    },
    // :103-112 — `value !== false`
    modal: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Modal',
      group: 'General',
      description: 'A modal popup is a dialog: the page behind it cannot be used, focus moves into it and Escape closes it. Turn off for an overlay that is not a dialog, such as a toast',
      examples: [true, false, 0, null]
    },
    // :113-121 — a string, or else `undefined`
    accessibleName: {
      type: 'string',
      coerce: 'none',
      displayName: 'Accessible Name',
      group: 'General',
      description: 'What a screen reader announces when the popup opens. Leave empty to use the first heading inside the popup',
      examples: ['Pick a date', '', 5, null]
    },
    // :122-131
    show: { type: 'signal', outcome: true, displayName: 'Show', group: 'Actions', description: 'Opens Target as a popup' }
  },

  outputs: {
    // :141-146
    Closed: { type: 'signal', displayName: 'Closed', group: 'Events', description: 'Fires when the popup was closed without a close action, after Close Results are up to date' },
    // :147-152
    Dismissed: { type: 'signal', displayName: 'Dismissed', group: 'Events', description: 'Fires when another popup replaced this one before the user closed it, so there are no Close Results' },
    // :158-163
    Cancelled: { type: 'signal', displayName: 'Cancelled', group: 'Events', description: 'Fires when the person closed the popup with the Escape key, so there are no Close Results' },
    // :180-188
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the popup did not open, set just before Failure fires' }
  }
}).on(
  {
    target: (_s, v) => ({ says: 'always: kept; the component the next Show opens', set: { target: v }, send: [] }),
    stackPolicy: (_s, v) => ({ says: 'always: kept (anything but Show On Top is Replace It); read by the next Show', set: { stackPolicy: v === 'stack' ? 'stack' : 'replace' }, send: [] }),
    closeOnEscape: (_s, v) => ({ says: 'always: kept (only false turns it off); read by the next Show', set: { closeOnEscape: v !== false }, send: [] }),
    modal: (_s, v) => ({ says: 'always: kept (only false turns it off); read by the next Show', set: { modal: v !== false }, send: [] }),
    accessibleName: (_s, v) => ({ says: 'always: kept when it is text (anything else is none); read by the next Show', set: { accessibleName: typeof v === 'string' ? v : undefined }, send: [] }),
    // :127-130, :202-219 — every press is answered at the frame's end
    show: (s) => ({ says: "always: Target opens as a popup at the frame's end; each press is answered there, Failure with Error when it cannot open", set: { scheduled: true, presses: s.presses + 1 }, send: [], outcome: 'deferred' })
  },
  {
    afterInputs: (s, _inputs, world) => {
      if (!s.scheduled && s.leaving.length === 0) return { send: [] };
      // The next frame's start (:1287-1300), in the order the popups were closed: each leaves the stack, then tells this node
      let stack = s.stack;
      let closeResults = s.closeResults;
      const pulses: Array<'Closed' | 'Dismissed' | 'Cancelled' | { derived: string }> = [];
      const flagged = new Set<string>();
      for (const l of s.leaving) {
        stack = stack.filter((slot) => slot.n !== l.n);
        if (l.kind === 'cancelled') {
          pulses.push('Cancelled'); // :255-257
          continue;
        }
        // :266-275 — the results replace Close Results; each named port is flagged; then the action, or Closed
        closeResults = l.results;
        for (const key of Object.keys(l.results)) if (world.hasOutput('closeResult-' + key)) flagged.add('closeResult-' + key); // :270
        if (!l.action) pulses.push('Closed');
        else if (typeof l.action === 'string' && world.hasOutput(l.action)) pulses.push({ derived: l.action });
        // an action with no port: `sendSignalOnOutput` finds no output and sends nothing (node.ts)
      }
      const base = { stack, closeResults, leaving: [] as readonly Leave[] };
      const sendDerived = [...flagged].sort();
      if (!s.scheduled) return { set: base, send: [], sendDerived, pulses };
      // :220-232 — the frame's show, for every press of the frame
      const presses = s.presses;
      const all = (outcome: 'done' | 'failure', error?: string) => Array.from({ length: presses }, () => (error === undefined ? { port: 'show', outcome } : { port: 'show', outcome, error }));
      const shown = { ...base, scheduled: false, presses: 0 };
      if (s.target == undefined) {
        return { set: { ...shown, error: NO_TARGET }, send: ['error'], sendDerived, pulses, outcomes: all('failure', 'show-popup/no-target') };
      }
      const stackPolicy = s.stackPolicy ?? 'replace';
      const popup = { op: 'show' as const, target: s.target, params: s.popupParams, stackPolicy, closeOnEscape: s.closeOnEscape !== false, modal: s.modal !== false, accessibleName: s.accessibleName };
      const answer = world.popupAnswer(s.target);
      // nodecontext.ts :1213 — no host: nothing opens; the promise resolves (:288-290)
      if (answer === 'nohost') return { set: shown, send: [], sendDerived, pulses, popup, outcomes: all('done') };
      // :1240-1242 — `replace` dismisses every popup on the stack first, each told Dismissed (:1220-1236)
      if (stackPolicy === 'replace') {
        for (let i = 0; i < stack.length; i++) pulses.push('Dismissed');
        stack = [];
      }
      // :1243 — the new slot, on top, before the build
      if (answer === 'opened') {
        const slot: Slot = { n: s.opened, modal: popup.modal, closeOnEscape: popup.closeOnEscape, leaving: false };
        return { set: { ...shown, stack: [...stack, slot], opened: s.opened + 1 }, send: [], sendDerived, pulses, popup, outcomes: all('done') };
      }
      // :291-297 — the build failed; its slot is given back (v2, C30)
      const error = 'The popup "' + String(s.target) + '" could not be opened: ' + answer.error;
      return { set: { ...shown, stack, error }, send: ['error'], sendDerived, pulses, popup, outcomes: all('failure', 'show-popup/target-failed') };
    },
    derived: {
      // NSP-020 s84 — what the editor draws (setup :345-416): the Target component's inputs as `popupParam-` ports, typed as
      // the component types them; then, for each Close Popup node inside it, its Close Actions as signals and its Results as
      // values typed by the component's output of that name (else `*`), each once. At play the context has no components: an
      // input is registered by its first write, an output by a wire
      inputs: (params, context) => {
        const out: Record<string, ValueInputDecl> = {};
        const c = typeof params.target === 'string' ? context.components?.[params.target] : undefined;
        for (const [name, port] of Object.entries(c?.inputs ?? {})) out['popupParam-' + name] = { ...popupParamPort(), type: port.type === 'signal' ? '*' : port.type, displayName: name };
        return out;
      },
      outputs: (params, context) => {
        const out: Record<string, OutputDecl<State>> = {};
        const c = typeof params.target === 'string' ? context.components?.[params.target] : undefined;
        for (const close of c?.nodes?.NavigationClosePopup ?? []) {
          for (const a of listOf(close.closeActions)) if (!('closeAction-' + a in out)) out['closeAction-' + a] = { ...closeAction(a), onWire: true };
          for (const r of listOf(close.results)) if (!('closeResult-' + r in out)) out['closeResult-' + r] = { ...closeResult(r, c?.outputs[r]?.type), onWire: true } as OutputDecl<State>;
        }
        return out;
      },
      needs: ['components', 'wiredOutputs'],
      discoverOutput: (port) => (port.startsWith('closeResult-') ? closeResult(port.slice('closeResult-'.length)) : port.startsWith('closeAction-') ? closeAction(port.slice('closeAction-'.length)) : undefined),
      outputCandidates: [...RESULTS.map((r) => 'closeResult-' + r), ...ACTIONS],
      // :196-198 — stored raw under the name after the prefix
      on: (s, port, value) => ({ set: { popupParams: { ...s.popupParams, [port.slice('popupParam-'.length)]: value } }, send: [] }),
      discover: (port) => (port.startsWith('popupParam-') ? popupParamPort() : undefined),
      candidates: ['popupParam-title', 'popupParam-id']
    },
    world: {
      // What the person did, at its time (world.ts POPUP): marks the popup leaving; the next frame's start tells this node
      popup: (s, _inputs, event) => {
        if (event.kind === 'escape') {
          // nodecontext.ts :1183-1195 — the top MODAL popup, and only it
          const top = [...s.stack].reverse().find((slot) => slot.modal);
          if (!top || !top.closeOnEscape || top.leaving) return { send: [] };
          return { set: { stack: s.stack.map((slot) => (slot === top ? { ...slot, leaving: true } : slot)), leaving: [...s.leaving, { n: top.n, kind: 'cancelled' }] }, send: [] };
        }
        // the handler of the n-th popup opened (absent: the last); one no longer open, or already leaving, does nothing (:1289)
        const n = event.popup ?? s.opened - 1;
        const slot = s.stack.find((x) => x.n === n);
        if (!slot || slot.leaving) return { send: [] };
        return { set: { stack: s.stack.map((x) => (x === slot ? { ...x, leaving: true } : x)), leaving: [...s.leaving, { n, kind: 'closed', action: event.action, results: event.results }] }, send: [] };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
