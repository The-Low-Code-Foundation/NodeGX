---
title: "Pop Component Stack"
---
Pop Component Stack: returns to the previous page on the stack, optionally handing result values back to the popper's caller.

When `navigate` fires, the top page is popped and the one beneath becomes visible with the reverse transition. The `results` list declares named values to pass back: they become inputs on this node, and the corresponding Push node that opened the page exposes them as outputs plus one signal per `backActions` entry — a lightweight way for a pushed page to answer the page that opened it.

## When to use it

The back/cancel/done affordance inside any pushed page. Pair result values with distinct back actions ('save' vs 'cancel') when the opener must react differently.

## At a glance

| | |
|---|---|
| Category | Navigation |
| Type name | `PageStackNavigateBack` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `backActions` | Stringlist | — | Names of the ways this component can be closed, one signal input each; the matching signal fires on the node that pushed it |
| `results` | Stringlist | — | Names of values to hand back to the node that pushed this component, one input port each |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `navigate` | Signal | — | Pops the enclosing Component Stack back to the component underneath |

### What each input does

**Results** (`results`)

- always: kept, and read by nothing here — the editor draws one Results port per name, and what those ports hold is what a pop hands back

**Back Actions** (`backActions`)

- always: kept, and read by nothing here — the editor draws one signal per name, each a Navigate that carries that name as its back action

**Navigate** (`navigate`)

- always: one pop at the end of the frame for each press, in press order — the first carries the last back action pressed since the last pop (then cleared) and every Results value, to the node that pushed this page; Done when the stack goes back to the page below (this page leaves at the transition's end), Unchanged when the stack is at its first page, Error and Failure when it is still animating or when this node is not inside a page a Page Stack pushed

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the stack has popped this component. ⚠️ This node is destroyed with the component it pops, so sequence anything that must survive the pop from the node that pushed it |
| `unchanged` | Signal | — | Fires when the Component Stack is already showing its first component, so there was nothing to pop |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the stack did not pop, set just before Failure fires |
| `failure` | Signal | — | Fires when this node is not inside a pushed component, or a navigation is still animating |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Result ports depend on the "backActions" style parameters of the containing Page Stack.

## Ports at runtime

The result-value inputs are generated from the `results`/`backActions` lists on the node instance — runtime-determined by configuration.

## Examples

**Push and pop a Component Stack (wizard flow)**

Stack-style navigation: a Page Stack (Component Stack) named 'Checkout' hosts two components, defined in its `pages` parameter with `pageComp-<id>` entries mapping each page to a component in this file. Inside /Cart, a Push Component To Stack node (PageStackNavigate) pushes /Confirm with a transition when the Continue button is clicked. Inside /Confirm, a Pop Component Stack node (PageStackNavigateBack) pops back: the Back button triggers its plain `navigate` signal, while the Place-order button triggers the `backAction-confirmed` signal input declared via the `backActions` parameter — that same action surfaces as the `backAction-confirmed` signal output on the Push node in /Cart, where it fires an Event Sender. This is the round-trip: back actions are declared on the Pop node inside the pushed component and consumed on the Push node that pushed it.

## Related nodes

[Component Stack](../visual/page-stack.md), [Push Component To Stack](./page-stack-navigate.md), [Close Popup](./navigation-close-popup.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a Component Stack (`stack`)

### Starting state

```json
{
  "resultValues": {},
  "pending": []
}
```

### How actions report back

Each time Navigate is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/pop-component-stack.ts"
/**
 * Pop Component Stack (`PageStackNavigateBack`) — read from
 * `packages/noodl-viewer-react/src/nodes/navigation/navigate-back.ts` on 2026-10-01 (NSP-015 s18).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Navigate` and every `backAction-<name>` signal are presses of one
 * action (:43-50, :180-183), each with its own outcome; all the presses of a frame are answered at the
 * frame's end (:101-121), in press order, by one POP each (:135-169) — so two presses in a frame pop
 * twice, and the stack tells the second what it tells a pop while it is still animating (world.ts STACK:
 * the n-th pop's answer is the script's). A pop:
 *   - takes the back action — the LAST `backAction-<name>` pressed since the last pop, as its full port
 *     name (`backAction-Save`) — and clears it, whether or not anything is popped (:143-144), so only the
 *     first pop of a frame carries one;
 *   - with no stack to pop — the node does not sit in a page a Component Stack pushed (no back callback,
 *     :146-152) — is Failure `pop-component-stack/no-stack-in-scope`, Error "No Component Stack to pop …";
 *   - otherwise hands the stack `{ backAction, results }` (:154-157; `results` is every `result-<name>`
 *     value written so far, by name — the Results parameter only decides which ports the editor draws)
 *     and answers with what the stack returns: Done (`{ ok: true }`, :168), Unchanged (the stack is at its
 *     first page, :164) or Failure with the stack's code and message (still animating, :165).
 * Failure sets Error first (:170-176); Error keeps its last message — nothing clears it.
 * The `result-<name>` and `backAction-<name>` ports are what the editor draws from Results and Back
 * Actions, split on `,`, untrimmed (:211-250), and any such name is registered on first write (:184-200);
 * a result is stored raw (:177-179).
 */

import { defineNode, type InputDecl, type ValueInputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

const NO_STACK = 'No Component Stack to pop — this node only works inside a component that a Component Stack pushed';

type State = {
  /** :57-59 `_internal.results` — the Results parameter, kept and never read */
  results: unknown;
  /** :67-69 `_internal.backActions` — likewise */
  backActions: unknown;
  /** :98 `_internal.resultValues` — the `result-` values by name */
  resultValues: Rec;
  /** `_internal.backAction` — the last back action pressed, as its port name */
  backAction: string | undefined;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :107-108 `pendingOutcomes` — the port of each press this frame, in press order */
  pending: readonly string[];
};

// :184-200 `registerInputIfNeeded`
const resultPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Results', examples: ['x', 2, '', null, { a: 1 }] });
const backActionPort = (name: string): InputDecl => ({ type: 'signal', outcome: true, displayName: name, group: 'Back Actions', description: 'Closes this component with the back action ' + name });

function discover(port: string): InputDecl | undefined {
  if (port.startsWith('result-')) return resultPort();
  if (port.startsWith('backAction-')) return backActionPort(port.slice('backAction-'.length));
  return undefined;
}

const TRANSITIONING = { failure: { code: 'pop-component-stack/transition-in-progress', message: 'Ignored — the Component Stack is still animating the previous navigation' } } as const;

export const PopComponentStack = defineNode({
  type: 'PageStackNavigateBack',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/navigate-back.ts',
  needs: ['stack'],
  worldPool: {
    stacks: [{}, { back: 'done' }, { back: ['done', TRANSITIONING] }, { back: 'unchanged' }, { back: TRANSITIONING }, { back: ['done', 'done', 'unchanged'] }]
  },

  // :97-99 initialize
  state: { results: undefined, backActions: undefined, resultValues: {}, backAction: undefined, error: undefined, pending: [] } as State,
  // :77-86 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :43-50
    navigate: { type: 'signal', outcome: true, displayName: 'Navigate', group: 'Actions', description: 'Pops the enclosing Component Stack back to the component underneath' },
    // :51-60 — a parameter (allowEditOnly), stored and never read
    results: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Results',
      group: 'Results',
      description: 'Names of values to hand back to the node that pushed this component, one input port each',
      examples: ['x', 'x,y', 'a, b', '']
    },
    // :61-70 — likewise
    backActions: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Back Actions',
      group: 'Back Actions',
      description: 'Names of the ways this component can be closed, one signal input each; the matching signal fires on the node that pushed it',
      examples: ['Save', 'Save,Cancel', '']
    }
  },

  outputs: {
    // :87-95
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the stack did not pop, set just before Failure fires' }
  }
}).on(
  {
    results: (_s, v) => ({ says: 'always: kept, and read by nothing here — the editor draws one Results port per name, and what those ports hold is what a pop hands back', set: { results: v }, send: [] }),
    backActions: (_s, v) => ({ says: 'always: kept, and read by nothing here — the editor draws one signal per name, each a Navigate that carries that name as its back action', set: { backActions: v }, send: [] }),
    // :43-50, :101-121 — answered at the frame's end
    navigate: (s) => ({
      says: "always: one pop at the end of the frame for each press, in press order — the first carries the last back action pressed since the last pop (then cleared) and every Results value, to the node that pushed this page; Done when the stack goes back to the page below (this page leaves at the transition's end), Unchanged when the stack is at its first page, Error and Failure when it is still animating or when this node is not inside a page a Page Stack pushed",
      set: { pending: [...s.pending, 'navigate'] },
      send: [],
      outcome: 'deferred'
    })
  },
  {
    // :101-121 — one pop per press, in press order (:118)
    afterInputs: (s, _inputs, world) => {
      if (s.pending.length === 0) return { send: [] };
      const outcomes: Array<{ port: string; outcome: 'done' | 'unchanged' | 'failure'; error?: string }> = [];
      const back: Array<{ action: unknown; results: unknown }> = [];
      let error = s.error;
      s.pending.forEach((port, i) => {
        const action = i === 0 ? s.backAction : undefined; // :143-144 — taken and cleared by the first pop
        const answer = world.backAnswer(back.length);
        if (answer === undefined) {
          error = NO_STACK; // :146-152
          outcomes.push({ port, outcome: 'failure', error: 'pop-component-stack/no-stack-in-scope' });
          return;
        }
        back.push({ action, results: s.resultValues }); // :154-157
        if (answer === 'done') outcomes.push({ port, outcome: 'done' }); // :168
        else if (answer === 'unchanged') outcomes.push({ port, outcome: 'unchanged' }); // :164
        else {
          error = answer.failure.message; // :165, :170-176
          outcomes.push({ port, outcome: 'failure', error: answer.failure.code });
        }
      });
      const failed = outcomes.some((o) => o.outcome === 'failure');
      return { set: { pending: [], backAction: undefined, error }, send: failed ? ['error'] : [], back, outcomes };
    },
    derived: {
      // :211-250 `_updatePorts` — one `result-` per Results name, one `backAction-` signal per Back Actions name
      inputs: (params) => {
        const ports: Record<string, InputDecl> = {};
        // :227-228 — each Results port is labelled with its name (NSP-020 s80, oracle (a): the label was missing)
        if (params.results) for (const p of String(params.results).split(',')) ports['result-' + p] = { ...resultPort(), displayName: p };
        if (params.backActions) for (const p of String(params.backActions).split(',')) ports['backAction-' + p] = backActionPort(p);
        return ports;
      },
      // :177-179 — stored raw under the name after the prefix
      on: (s, port, value) => ({ set: { resultValues: { ...s.resultValues, [port.slice('result-'.length)]: value } }, send: [] }),
      // :180-183 — the back action is the PORT's name; a press like Navigate's
      signal: (s, port) => ({ set: { backAction: port, pending: [...s.pending, port] }, send: [], outcome: 'deferred' }),
      discover,
      candidates: ['result-x', 'result-y', 'backAction-Save', 'backAction-Cancel']
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
