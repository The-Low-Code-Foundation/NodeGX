---
title: "Close Popup"
---
Close Popup: dismisses the popup this node lives in, sending named results and a close action back to the opener.

Close Popup works only inside a component shown via Show Popup: when `close` fires it removes the overlay. The `results` list declares values handed back (each becomes an input here and an output on the Show Popup node), and `closeActions` declares named reasons, each surfacing as its own signal at the opener — the mechanism for confirm/cancel semantics.

## When to use it

Every dismissal affordance inside a popup: confirm buttons, cancel crosses, backdrop clicks (via the backdrop Group's onClick). It has no effect outside a popup.

## At a glance

| | |
|---|---|
| Category | Navigation |
| Type name | `NavigationClosePopup` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `closeActions` | Stringlist | — | Names of the ways this popup can be closed, one signal input each; the matching signal fires on the Show Popup node |
| `results` | Stringlist | — | Names of values to hand back to the Show Popup node that opened this popup, one input port each |
| `targetComponent` | Component | — | Which popup to close when popups are nested; leave blank to close the nearest enclosing one |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `close` | Signal | — | Closes the popup and hands back any Results |

### What each input does

**Popup** (`targetComponent`)

- always: kept (blank: the nearest popup it sits in); read by the next close

**Results** (`results`)

- always: kept; names the Results ports

**Close Actions** (`closeActions`)

- always: kept; names the close-action signals

**Close** (`close`)

- always: at the frame's end the popup it sits in closes, handing back the Results — Failure with Error when it sits in no such popup

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the popup has been closed and any Results have been handed back |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the popup was not closed, set just before Failure fires |
| `failure` | Signal | — | Fires when this node is not inside an open popup, or Popup names one it is not inside |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Output ports mirror the close-result values declared by the popup being closed.

## Ports at runtime

The result-value inputs are generated from the `results` list on the instance — configuration-determined.

## Examples

**Show a popup and close it from inside with a close action**

The popup pair: a Show Popup node (NavigationShowPopup) opens the /Confirm Delete Dialog component as an overlay when the Delete-account button is clicked. The Close Popup node (NavigationClosePopup) lives INSIDE the popup component — it is the only way the popup ends itself. Its `closeActions` parameter declares 'confirm,cancel', which registers `closeAction-confirm` and `closeAction-cancel` signal inputs on Close Popup and matching signal outputs on the Show Popup node that opened it: the host reacts to `closeAction-confirm` without knowing anything about the dialog's internals. A close action both closes the popup and routes the outcome; plain `close` (not used here) would fire Show Popup's generic `Closed` output instead.

## Related nodes

[Show Popup](./navigation-show-popup.md), [Pop Component Stack](./page-stack-navigate-back.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- popups (`popup`)

### Starting state

```json
{
  "resultValues": {},
  "pending": []
}
```

### How actions report back

Each time Close is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/close-popup.ts"
/**
 * Close Popup (`NavigationClosePopup`) — read from `packages/noodl-viewer-react/src/nodes/navigation/closepopup.ts`
 * on 2026-10-02 (NSP-015 s20).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Close` and every close action defer the work to the frame's end (:122-131,
 * :171-188, :294-298) — every press in a frame is answered, all with the ONE outcome of ONE close. A close action's
 * press keeps its port's name as the action, and the last one pressed in the frame is the one handed; it is taken
 * by that close, so the next close without one hands none (:260-268). The node then finds the popup it closes
 * (:206-247), walking out from its own component through the popups it sits inside (world.ts POPUP `inside`,
 * nearest first) — a popup opened from inside another popup sits inside that one too (row C31, fixed in P109
 * ISL-028: the runtime's walk went from a popup to the root and never reached the outer popup):
 *   - Popup set (`value || undefined`, :97-99): the popup of that name among them, or Failure
 *     `close-popup/target-not-found` with Error `This node is not inside a popup named "<Popup>"`, followed by
 *     ` — it is inside: <names>` when it sits inside any (:216-229) — never a fall back to the nearest one;
 *   - Popup unset: the nearest, or Failure `close-popup/no-popup-in-scope` when it sits inside none (:238-244).
 * Found: the popup's close handler is called with the action and the Results values — a `popup` event, the
 * values the node's own live object, canonical at the call (world.ts POPUP) — and every press is Done (:291-292).
 * The handler is the popup's: what the popup and the Show Popup that opened it do next is graded on Show Popup
 * and in the graph. Error keeps its last message — nothing clears it.
 * The ports: `result-<name>` (a value) and `closeAction-<name>` (a signal) for each name in Results and Close
 * Actions, split on `,` and untrimmed (setup :327-367) — from this node's own params, so drawable without a viewer.
 * Results and Close Actions are stored and read by nothing else (:102-121).
 *
 * READ, NOT GRADED HERE: the callback `showPopup` hands the Close Popups at a popup's top level (`_setCloseCallback`,
 * :160-165) is that popup's own handler, which the walk finds as the nearest anyway (world.ts POPUP).
 */

import { defineNode, type InputDecl, type ValueInputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

type State = {
  /** :43 `_internal.targetComponent` */
  targetComponent: unknown;
  /** :36 `_internal.results` — stored, read by nothing */
  results: unknown;
  /** :37 `_internal.closeActions` — likewise */
  closeActions: unknown;
  /** :69 `_internal.resultValues` — the `result-` values by name */
  resultValues: Rec;
  /** :38 `_internal.closeAction` — the last close action pressed, as its port name */
  closeAction: string | undefined;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :53 `pendingCloseOutcomes` — the port of each press this frame, in press order */
  pending: readonly string[];
};

// :299-315 `registerInputIfNeeded`
const resultPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Results', examples: ['A', 2, '', null, { a: 1 }] });
const closeActionPort = (name: string): InputDecl => ({ type: 'signal', outcome: true, displayName: name, group: 'Close Actions', description: 'Closes the popup with the close action ' + name });

function discover(port: string): InputDecl | undefined {
  if (port.startsWith('result-')) return resultPort();
  if (port.startsWith('closeAction-')) return closeActionPort(port.slice('closeAction-'.length));
  return undefined;
}

const NO_POPUP = 'No popup in scope to close — this node only works inside a component opened as a popup';

export const ClosePopup = defineNode({
  type: 'NavigationClosePopup',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/closepopup.ts',
  needs: ['popup'],
  worldPool: {
    popups: [{}, { inside: ['Popup'] }, { inside: ['Popup', 'Outer'] }, { inside: ['Inner', 'Popup'] }]
  },

  // :68-70 initialize
  state: { targetComponent: undefined, results: undefined, closeActions: undefined, resultValues: {}, closeAction: undefined, error: undefined, pending: [] } as State,
  // :142-145 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :92-101 — `value || undefined`
    targetComponent: {
      type: 'component',
      coerce: 'none',
      displayName: 'Popup',
      group: 'General',
      description: 'Which popup to close when popups are nested; leave blank to close the nearest enclosing one',
      examples: ['Popup', 'Outer', 'Nope', '', null]
    },
    // :102-111 — a parameter (allowEditOnly), stored and never read
    results: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Results',
      group: 'Results',
      description: 'Names of values to hand back to the Show Popup node that opened this popup, one input port each',
      examples: ['name', 'name,ok', 'a, b', '']
    },
    // :112-121 — likewise
    closeActions: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Close Actions',
      group: 'Close Actions',
      description: 'Names of the ways this popup can be closed, one signal input each; the matching signal fires on the Show Popup node',
      examples: ['Save', 'Save,Cancel', '']
    },
    // :122-132
    close: { type: 'signal', outcome: true, displayName: 'Close', group: 'Actions', description: 'Closes the popup and hands back any Results' }
  },

  outputs: {
    // :146-154
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the popup was not closed, set just before Failure fires' }
  }
}).on(
  {
    targetComponent: (_s, v) => ({ says: 'always: kept (blank: the nearest popup it sits in); read by the next close', set: { targetComponent: v || undefined }, send: [] }),
    results: (_s, v) => ({ says: 'always: kept; names the Results ports', set: { results: v }, send: [] }),
    closeActions: (_s, v) => ({ says: 'always: kept; names the close-action signals', set: { closeActions: v }, send: [] }),
    // :127-131, :171-188 — answered at the frame's end
    close: (s) => ({ says: "always: at the frame's end the popup it sits in closes, handing back the Results — Failure with Error when it sits in no such popup", set: { pending: [...s.pending, 'close'] }, send: [], outcome: 'deferred' })
  },
  {
    // :260-293 — one close for the frame's presses
    afterInputs: (s, _inputs, world) => {
      if (s.pending.length === 0) return { send: [] };
      const action = s.closeAction; // :267-268 — taken by this close
      const all = (outcome: 'done' | 'failure', error?: string) => s.pending.map((port) => (error === undefined ? { port, outcome } : { port, outcome, error }));
      const done = { pending: [] as readonly string[], closeAction: undefined };
      // :206-247 — the walk: the popups the node sits inside, nearest first
      const candidates = world.popupsInside();
      const wanted = s.targetComponent;
      let popup: string | undefined;
      if (wanted) {
        popup = candidates.find((name) => name === wanted);
        if (popup === undefined) {
          const error = 'This node is not inside a popup named "' + String(wanted) + '"' + (candidates.length ? ' — it is inside: ' + candidates.join(', ') : '');
          return { set: { ...done, error }, send: ['error'], outcomes: all('failure', 'close-popup/target-not-found') };
        }
      } else if (candidates.length === 0) {
        return { set: { ...done, error: NO_POPUP }, send: ['error'], outcomes: all('failure', 'close-popup/no-popup-in-scope') };
      } else popup = candidates[0];
      // :291-292 — the handler, with the action and the node's live Results values; then Done
      return { set: done, send: [], popup: { op: 'close', popup, action, results: s.resultValues }, outcomes: all('done') };
    },
    derived: {
      // setup :327-367 — one `result-` per Results name, one `closeAction-` signal per Close Actions name
      inputs: (params) => {
        const ports: Record<string, InputDecl> = {};
        // :374-375 — each Results port is labelled with its name (NSP-020 s80, oracle (a): the label was missing)
        if (params.results) for (const p of String(params.results).split(',')) ports['result-' + p] = { ...resultPort(), displayName: p };
        if (params.closeActions) for (const p of String(params.closeActions).split(',')) ports['closeAction-' + p] = closeActionPort(p);
        return ports;
      },
      // :157-159 — stored raw under the name after the prefix
      on: (s, port, value) => ({ set: { resultValues: { ...s.resultValues, [port.slice('result-'.length)]: value } }, send: [] }),
      // :294-298 — the close action is the PORT's name; a press like Close's
      signal: (s, port) => ({ set: { closeAction: port, pending: [...s.pending, port] }, send: [], outcome: 'deferred' }),
      discover,
      candidates: ['result-name', 'result-ok', 'closeAction-Save', 'closeAction-Cancel']
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
