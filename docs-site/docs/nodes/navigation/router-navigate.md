---
title: "Navigate"
---
Navigate: tells a named Router to switch to a target page, passing typed path parameters, when its navigate signal fires.

Navigate drives a Router. When `navigate` is triggered it switches the router named in its `router` parameter to the page chosen in `target`, updating the URL if the router does. Path/query parameters declared by the target page become input ports on this node named `pm-<parameter>` — a target whose Page `urlPath` is `client/{clientId}` gives an input `pm-clientId` — so per-page data (an id, a tab name) is wired like any other value. `done` fires when the transition completes, `unchanged` when the router is already showing that page with those parameters, and `failure` when the target is not a page of that router; `completed` fires after all three. `openInNewTab` opens the target in a new browser tab instead of transitioning in place.

## When to use it

All URL-style page switching with a Router. For stack-style flows (push/pop with transitions, e.g. wizards or mobile-style drill-in) use Page Stack with PageStackNavigate instead; for external URLs use net.noodl.externallink.

## At a glance

| | |
|---|---|
| Category | Navigation |
| Type name | `RouterNavigate` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `openInNewTab` | Boolean | `false` | Opens the target page in a new browser tab instead of navigating this one |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `navigate` | Signal | — | Navigates the Router to Target Page |

### What each input does

**Open in new tab** (`openInNewTab`)

- always: whether the next navigation opens a new tab

**Navigate** (`navigate`)

- always: one navigation at the end of the frame, however many presses — Done (or Unchanged) for each when a router takes it, Error and Failure for each when none can; never answered while no router is on the page

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the Router has switched to the target page. ⚠️ If this node lives on the page being left it is destroyed with that page, so sequence anything that must survive the navigation from a node outside the Router |
| `unchanged` | Signal | — | Fires when the Router is already showing that page with those parameters, so it was not rebuilt |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the navigation did not happen, set just before Failure fires |
| `failure` | Signal | — | Fires when no Target Page is set, or the Router does not serve that page |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered, editor-adapter); the tables above may be incomplete for a given instance._

Ports are derived from the target router and the path parameters of the selected page component (RouterNavigateAdapter).

## Ports at runtime

Runtime-determined inputs (runtime-discovered + editor-adapter): the `router` and `target` choices come from the routers and pages that exist in the project, and each parameter declared by the chosen target page is registered as an input port named `pm-<parameter>` on demand. The port set therefore depends on project content, not the node type.

## Patterns

- Button `onClick` → `navigate` with `target` set on the node: the standard menu/link wiring.
- Record id from a list item → `pm-<parameter>` (e.g. `pm-clientId`), so the detail page can query its record from the URL.

## Watch out for

- Encoding app state in many routers when one router plus page parameters suffices; multiple routers are for genuinely independent regions.

## Examples

**Router page navigation from a button**

URL-style navigation: a Router hosts the app's pages (each page is a component, configured in the Router's `pages` parameter), and a Navigate node (RouterNavigate) switches it. The Button's `onClick` signal triggers `navigate`; which page to go to, and any path parameters, are set on the Navigate node's parameters — those ports are created from the Router's page configuration at edit time, which is why they are runtime-determined in the catalog.

## Related nodes

[Page Router](../visual/router.md), [Page Inputs](./page-inputs.md), [Page](../visual/page.md), [Push Component To Stack](./page-stack-navigate.md), [External Link](./net-noodl-externallink.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the page Router (`router`)

### Starting state

```json
{
  "pageParams": {},
  "openInNewTab": false,
  "scheduled": false,
  "presses": 0,
  "requests": [],
  "answered": []
}
```

### How actions report back

Each time Navigate is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/router-navigate.ts"
/**
 * Navigate (`RouterNavigate`) — read from `packages/noodl-viewer-react/src/nodes/navigation/router-navigate.ts`
 * and `router-handler.ts` on 2026-10-01 (NSP-015 s19).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Navigate` defers its work to the frame's end (:46-48, :112-128) — every
 * press in a frame is answered, all with the ONE outcome of ONE navigate handed to the Routers (world.ts
 * ROUTE), made against the frame's final inputs: `{ router, target, params, openInNewTab }` (:129-147), each
 * as stored — Router and Target `undefined` until written, `params` the `pm-` values by name, Open in new tab
 * `!!value` (:57-59), `false` until written (:39). The handler hands it on ONE MILLISECOND later (a world
 * timer, router-handler.ts :53) and only then is it answered — never in the frame that asked:
 *   - a failure (the Router's own checks: no Target, a Target that is not one of its pages) sets Error to its
 *     message and is Failure with its code AT ONCE (:144-146, :104-111);
 *   - `done` / `unchanged` settle the presses at the end of the frame the answer lands in (:134-143) — so when two
 *     navigates are answered in one millisecond, a LATER one's Failure is reported before an earlier one's Done
 *     (found by the deep run, s19: the first spec settled both in arrival order).
 * A navigate no router answers to (world.ts ROUTE: one registered name takes everything; otherwise the name
 * as handed, a blank one as Main — v3, row C118: v1 and v2 had no `Main` rule on this side) is queued and, in a play, never
 * answered. One settle per navigate even when two routers share the name (:99-103). Error keeps its last
 * message — nothing clears it.
 * The ports: `router` (an enum of the project's Routers, drawn only when there are two or more), `target`
 * (the Router's pages) and `pm-<name>` (the target page's Page Inputs) come from the PROJECT (the editor's
 * RouterNavigateAdapter), not from this node's params — so at play they are registered on first write
 * (:158-176), as the runtime registers them. NSP-021 (s87): `derived.inputs` draws them from the project the way
 * the adapter does, for an editor with no viewer; no runtime hook announces them, so the ADAPTER is the oracle
 * (oracle (c), `noodl-editor/tests-unit/nsp-020/adapter-ports.test.ts`).
 *
 * READ, NOT GRADED HERE (the stand-in router answers by script; NSP-015 §6.2):
 *   - row C29 (fixed, P109 ISL-028): `params` was the node's LIVE object, which the Router keeps as
 *     `currentParams` and compares with the next navigate's — from the same node, the same object, so a new
 *     `pm-` value read as "already showing". The node now hands a copy (:134); graded in the viewer
 *     (`isl-028-a-second-press-with-new-parameters.test.ts`).
 */

import { defineNode, type InputDecl, type PortContext, type ValueInputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

/** One navigate handed and not yet handed on (the handler's 1 ms). */
type Request = Readonly<{ presses: number; router: unknown; target: unknown; openInNewTab: unknown }>;

type State = {
  /** `_internal.router` (dynamic port) — `undefined` until written */
  router: unknown;
  /** `_internal.target` (dynamic port) — `undefined` until written */
  target: unknown;
  /** :38 `_internal.pageParams` — the `pm-` values by name */
  pageParams: Rec;
  /** :39 `_internal.openInNewTab` */
  openInNewTab: boolean;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :117-118 `hasScheduledNavigate` */
  scheduled: boolean;
  /** :114-115 `pendingOutcomes.length` — the presses this frame's navigate answers */
  presses: number;
  /** navigates handed, waiting for the handler's +1 ms, oldest first */
  requests: readonly Request[];
  /** :134-143 — Done / Unchanged answers waiting for the frame's end (`scheduleAfterInputsHaveUpdated`), in arrival order */
  answered: ReadonlyArray<Readonly<{ outcome: 'done' | 'unchanged'; presses: number }>>;
};

// :158-176 `registerInputIfNeeded` — `registerInput(name, { set })`: no type, no conversion, stored raw
const targetPort = (): ValueInputDecl => ({ type: 'component', coerce: 'none', displayName: 'Target Page', group: 'General', examples: ['/Home', '/Detail', '', null, '/Nope'] });
const routerPort = (): ValueInputDecl => ({ type: 'enum', enums: [], coerce: 'none', displayName: 'Router', group: 'General', examples: ['Main', 'Other', '', null] });
const pageParamPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Parameters', examples: [1, 2, 'a', '', null] });

/** nameListParameter.ts `parseNameList` — a string split on `,` (untrimmed, empty names kept), a list of strings as it is, anything else nothing. */
const nameList = (v: unknown): readonly string[] => (typeof v === 'string' ? v.split(',') : Array.isArray(v) && v.every((e) => typeof e === 'string') ? (v as string[]) : []);

/**
 * NSP-021 (s87) — RouterNavigateAdapter.ts `updatePortsForNode` :25-93, from the project with no viewer: Router, an enum
 * of the Routers' names, when there are two or more (:28-42); the Router read is the node's, else the first one's (:44-49
 * — the adapter WRITES it); Target Page, the pages of every Router under that name, each once (:52-68); then a `pm-` input
 * typed `string` for each distinct name in the Target's Page Inputs' Path and Query Parameters, in order (:70-91). The
 * context's Routers are named as the runtime names them (blank is `Main`); the adapter skips a Router with no name —
 * 0 of 125 Routers in Richard's projects have none. Without Routers (the play's context, or a project with none) nothing
 * is drawn: the adapter would still draw an empty Target picker (1 project of 44 with a Navigate).
 */
function drawnInputs(params: Rec, context: Readonly<PortContext>): Record<string, InputDecl> {
  const routers = context.routers;
  if (!routers || routers.length === 0) return {};
  const ports: Record<string, InputDecl> = {};
  if (routers.length > 1) ports.router = { ...routerPort(), enums: routers.map((r) => r.name) };
  const routerName = params.router === undefined ? routers[0].name : params.router;
  const pages: string[] = [];
  for (const r of routers) if (r.name === routerName) for (const p of r.pages) if (!pages.includes(p)) pages.push(p);
  ports.target = { ...targetPort(), enums: pages };
  const target = typeof params.target === 'string' ? context.components?.[params.target] : undefined;
  const names: string[] = [];
  for (const pi of target?.nodes?.PageInputs ?? []) for (const n of [...nameList(pi.pathParams), ...nameList(pi.queryParams)]) if (!names.includes(n)) names.push(n);
  for (const n of names) ports['pm-' + n] = { ...pageParamPort(), type: 'string', displayName: n };
  return ports;
}

function discover(port: string): InputDecl | undefined {
  if (port === 'target') return targetPort();
  if (port === 'router') return routerPort();
  if (port.startsWith('pm-')) return pageParamPort();
  return undefined;
}

const NO_TARGET = { failure: { code: 'navigate/no-target-page', message: 'No Target Page is set on this Navigate node' } } as const;
const NOT_A_PAGE = { failure: { code: 'navigate/page-not-found', message: '"/Nope" is not a page of this Router — check the Target Page against the Router\'s Pages' } } as const;

export const RouterNavigate = defineNode({
  type: 'RouterNavigate',
  // v2 (NSP-015 s19, the same session): a Done or Unchanged is reported at the end of the frame its answer lands in,
  // a Failure at once — so when two navigates are answered in one millisecond, a later one's Failure comes before an
  // earlier one's Done. v1 reported every answer at once, in arrival order. Found by the 10,000 deep run.
  // v3 (P109 ISL-050 s33, for ISL-048's C118 `d85e4e6d9`): a blank or unset Router is Main when two names are registered — the handler
  // reads `name || 'Main'` as `registerRouter` does. C118 moved the handler and the Router spec (v4) but not this one.
  version: 3,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/router-navigate.ts',
  needs: ['router'],
  worldPool: {
    routers: [
      {},
      { names: ['Main'] },
      { names: ['Main'], answers: [{ match: { noTarget: true }, answer: NO_TARGET }, { match: { target: '/Nope' }, answer: NOT_A_PAGE }, { match: { target: '/Detail', openInNewTab: false }, answer: 'unchanged' }] },
      { names: ['Other'] },
      { names: ['Main', 'Main'], answers: [{ answer: 'unchanged' }] },
      { names: ['Main', 'Other'], answers: [{ match: { noTarget: true }, answer: NO_TARGET }] }
    ],
    advances: [0, 1, 2, 10]
  },

  // :37-40 initialize; the declared default reaches `_inputValues`, never the setter
  state: { router: undefined, target: undefined, pageParams: {}, openInNewTab: false, error: undefined, scheduled: false, presses: 0, requests: [], answered: [] } as State,
  // :71-79 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :42-49
    navigate: { type: 'signal', outcome: true, displayName: 'Navigate', group: 'Actions', description: 'Navigates the Router to Target Page' },
    // :50-60 — `!!value`
    openInNewTab: {
      type: 'boolean',
      default: false,
      coerce: 'none',
      displayName: 'Open in new tab',
      group: 'General',
      description: 'Opens the target page in a new browser tab instead of navigating this one',
      examples: [true, false, 'yes', 0, null]
    }
  },

  outputs: {
    // :80-88
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the navigation did not happen, set just before Failure fires' }
  }
}).on(
  {
    openInNewTab: (_s, v) => ({ says: 'always: whether the next navigation opens a new tab', set: { openInNewTab: !!v }, send: [] }),
    // :46-48, :112-128 — every press is answered once the handler hands the frame's navigate on, or (no router) never
    navigate: (s) => ({
      says: 'always: one navigation at the end of the frame, however many presses — Done (or Unchanged) for each when a router takes it, Error and Failure for each when none can; never answered while no router is on the page',
      set: { scheduled: true, presses: s.presses + 1 },
      send: [],
      outcome: 'pending'
    })
  },
  {
    // The frame's end, in the runtime's callback order: first the Done / Unchanged answers that landed since the last
    // frame (:134-143 — each registered when its answer landed, before any press of this frame registered its own),
    // then :119-127, :129-133 — ONE navigate for the frame's presses, handed now and handed on at +1 ms (router-handler.ts :53)
    afterInputs: (s) => {
      if (!s.scheduled && s.answered.length === 0) return { send: [] };
      const outcomes = s.answered.flatMap((a) => Array.from({ length: a.presses }, () => ({ port: 'navigate', outcome: a.outcome })));
      if (!s.scheduled) return { set: { answered: [] }, send: [], outcomes };
      const request: Request = { presses: s.presses, router: s.router, target: s.target, openInNewTab: s.openInNewTab };
      return {
        set: { scheduled: false, presses: 0, requests: [...s.requests, request], answered: [] },
        send: [],
        outcomes,
        route: { router: s.router, target: s.target, params: s.pageParams, openInNewTab: s.openInNewTab },
        after: [{ ms: 1, tag: 'route' }]
      };
    },
    derived: {
      inputs: drawnInputs,
      needs: ['routers', 'components'],
      // :149-157 — target, router and `pm-` stored raw
      on: (s, port, value) => {
        if (port === 'target') return { set: { target: value }, send: [] };
        if (port === 'router') return { set: { router: value }, send: [] };
        return { set: { pageParams: { ...s.pageParams, [port.slice(3)]: value } }, send: [] };
      },
      discover,
      candidates: ['target', 'router', 'pm-id', 'pm-name']
    },
    world: {
      // router-handler.ts :53-66 — the oldest navigate is handed on; the routers under the resolved name answer it
      timer: (s, _inputs, _tag, world) => {
        const [request, ...rest] = s.requests;
        const answer = world.routeAnswer(request.router, request.target, request.openInNewTab);
        if (answer === undefined) return { set: { requests: rest }, send: [] }; // queued — never answered in a play
        // :134-143 — Done / Unchanged wait for the frame's end; a later navigate's Failure (below, at once) overtakes them
        if (answer === 'done' || answer === 'unchanged') return { set: { requests: rest, answered: [...s.answered, { outcome: answer, presses: request.presses }] }, send: [] };
        // :144-146, :104-111 reportFailure — at once: Error first, then Failure
        const failures = Array.from({ length: request.presses }, () => ({ port: 'navigate', outcome: 'failure' as const, error: answer.failure.code }));
        return { set: { requests: rest, error: answer.failure.message }, send: ['error'], outcomes: failures };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
