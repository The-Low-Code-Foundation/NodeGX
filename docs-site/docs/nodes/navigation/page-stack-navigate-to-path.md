---
title: "Navigate To Path"
---
Navigate To Path: jumps to an arbitrary URL path within the app, driving whichever routers match the path.

Navigate To Path performs URL-level navigation: when `navigate` fires, the app's location changes to `path`, and the Router hierarchy resolves it exactly as if the user had typed the URL — including nested routers and page parameters embedded in the path. `queryNames` declares query-string values to attach; each name becomes an input. `openInNewTab` opens the path in a new tab instead.

## When to use it

Cross-cutting jumps where composing router+page choices is clumsier than stating the destination path ('/projects/123/settings'), deep links, and programmatic redirects. For navigation within one known router, Navigate (RouterNavigate) is more explicit and survives page renames better.

## At a glance

| | |
|---|---|
| Category | Navigation |
| Type name | `PageStackNavigateToPath` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `openInNewTab` | Boolean | `false` | Opens the path in a new browser tab instead of navigating this one |
| `path` | String | — | Path to navigate to; wrap a segment in braces, as in /product/{id}, to get an input port for it |
| `queryNames` | Stringlist | — | Names of query-string parameters to append, one input port each; a parameter left unset is omitted from the URL |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `navigate` | Signal | — | Navigates to Path, filling in any brace placeholders from their input ports |

### What each input does

**Path** (`path`)

- always: kept; read by the next Navigate — each {name} in it is filled from its parameter port as written (an unset one as nothing), and a value that is not text counts as no Path

**Query** (`queryNames`)

- always: kept; read by the next Navigate — one name=value after a ? for each name whose port holds a value, each encoded; an unset or null one is left out

**Open in new tab** (`openInNewTab`)

- always: whether the next Navigate opens a new tab or moves this one

**Navigate** (`navigate`)

- always: one navigation at the end of the frame, however many presses, from the frame's final Path, parameters and Query — no Path is Error and Failure for each press; otherwise the URL is built (after a # unless the project routes by path) and, with Open in new tab, handed to a new tab (Done; the browser blocking it is Error and Failure), else pushed into the address (Done; a push the browser refuses is Error and Failure); with no window, Unchanged

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the new path has been pushed to the browser history. Navigating in this window replaces the page, so nothing downstream of this may still exist |
| `unchanged` | Signal | — | Fires when there is no browser history to push to — a server-side render, where there is nothing to do and nothing to fail at |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the navigation did not happen, set just before Failure fires |
| `failure` | Signal | — | Fires when no Path is set, or the browser blocked the new tab |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Ports depend on the target page and its declared path parameters.

## Ports at runtime

Query-parameter inputs are generated from the `queryNames` list on the instance — configuration-determined.

## Examples

**URL-driven detail page: Router, Page Inputs, Navigate To Path and External Link**

URL-style navigation end to end. A Router named 'Main' hosts /Home and /Product (its `pages` parameter is `{ routes, startPage }`); each page component is rooted by a Page node whose `urlPath` defines its URL pattern — /Product uses 'product/{productId}', so the id lives in the URL. On /Home, a Navigate To Path node (PageStackNavigateToPath) builds the URL from its `path` parameter: the '{productId}' placeholder becomes the `p-productId` input, set here as a parameter, and clicking the button pushes the compiled path into browser history, which the Router picks up. On /Product, a Page Inputs node declares `pathParams: "productId"` so the value parsed from the URL is exposed as its `pm-productId` output, wired into a Text. An External Link node (net.noodl.externallink) opens an outside URL in a new tab — external URLs never go through the Router.

## Related nodes

[Navigate](./router-navigate.md), [Page Router](../visual/router.md), [Page Inputs](./page-inputs.md), [External Link](./net-noodl-externallink.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the page URL, and whether a person caused the action (`location`)
- the project's settings (`project`)

### Starting state

```json
{
  "openInNewTab": false,
  "params": {},
  "query": {},
  "scheduled": false,
  "presses": 0
}
```

### How actions report back

Each time Navigate is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/navigate-to-path.ts"
/**
 * Navigate To Path (`PageStackNavigateToPath`) — read from
 * `packages/noodl-viewer-react/src/nodes/navigation/navigate-to-path.ts` on 2026-10-01 (NSP-015 s17).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Navigate` defers its answer to the frame's end (:96-98, :120-141)
 * — every press in a frame is answered, all with the ONE outcome of ONE navigation, made against the
 * frame's final inputs. That navigation, the first of these that holds:
 *   - no Path (`undefined`) is Failure `navigate-to-path/no-path`, Error "No path to navigate to",
 *     with or without a window (:150-160);
 *   - otherwise the URL is built (:162-192): every `{name}` in Path (letters, digits, `_`; one
 *     replacement per occurrence) is replaced, first occurrence first, by `String(<p-name>)` — `''`
 *     for a parameter never set — inserted as written (v2, D20: a `$&` or `$$` in a value is text, not
 *     a replacement pattern); the project's `navigationPathType` (world.ts PROJECT) puts the result
 *     after a `#` when it is unset or `'hash'`, and in the path for anything else; the Query names,
 *     split on `,` and neither trimmed nor de-duplicated, add `name=value` for each whose value is
 *     neither `undefined` nor `null`, name and value each through `encodeURIComponent` (v2, D21), joined
 *     by `&` after a `?`. The URL is `path` + `?query` + `#hash`, each only when present;
 *   - no window — a server render — is Unchanged, and nothing is opened or pushed (:199-202);
 *   - Open In New Tab (truthy, :88-90) hands the URL to `window.open(url, '_blank')` — no features
 *     (:205); a `null` handle (world.ts LOCATION: the popup blocker refused) is Failure
 *     `navigate-to-path/blocked`, Error "The browser blocked opening a new tab" (:206-215);
 *   - otherwise the URL is pushed (`history.pushState({}, '', url)`, :218) and the node dispatches
 *     `popstate` on the window itself (:219) — a push fires none — and is Done (:222).
 * The `p-<name>` and `q-<name>` ports are registered on first write (:230-245) and the editor draws
 * one per unique placeholder in Path and one per Query name (:270-310); each stores its value raw.
 * Error keeps its last message — nothing clears it — and is sent each time it is set.
 *
 * TWO ROWS (NSP-015 §6.2), where the runtime THROWS inside the frame-end callback — the scheduler
 * logs it (nodecontext.ts :466-472) and every press of that frame goes unanswered, for good:
 *   C24 — FIXED in P109 ISL-026 (ruled "Treat it as no path"): a Path that is not text (`null`, a number) is no
 *         Path (Failure `navigate-to-path/no-path`) on both; the runtime once threw at `.match`.
 *   C25 — FIXED in P109 ISL-028 (ruled "Report a clear failure"): a push the browser refuses (a path on another
 *         origin — `https://…` or `//…` with the `path` type; world.ts LOCATION) is recorded, then answered Failure
 *         `navigate-to-path/refused`, Error "The browser refused to navigate to this path", on both; the runtime once
 *         threw out of the frame-end callback.
 */

import { defineNode, type ValueInputDecl, type WorldView } from '../spec';

const NO_PATH = 'No path to navigate to';
const BLOCKED = 'The browser blocked opening a new tab';
const REFUSED = 'The browser refused to navigate to this path';

type State = {
  path: unknown;
  queryNames: unknown;
  openInNewTab: boolean;
  /** :224-226 `_internal.params` — the `p-` values by placeholder name */
  params: Readonly<Record<string, unknown>>;
  /** :227-229 `_internal.query` — the `q-` values by query name */
  query: Readonly<Record<string, unknown>>;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :129-140 `hasScheduledNavigate` */
  scheduled: boolean;
  /** :122-125 `pendingNavigateOutcomes.length` — the presses this frame's navigation answers */
  presses: number;
};

/** :162-168 — every `{name}` in order, a repeated one each time it appears. */
function placeholders(path: string): string[] {
  return (path.match(/\{[A-Za-z0-9_]*\}/g) ?? []).map((m) => m.replace('{', '').replace('}', ''));
}

/** :162-192 — the URL a navigation hands the browser. */
export function compileUrl(path: string, params: Readonly<Record<string, unknown>>, queryNames: unknown, query: Readonly<Record<string, unknown>>, world: WorldView): string {
  let formatted = path;
  for (const name of placeholders(path)) {
    const v = params[name];
    // the first occurrence; a function replacement, so a `$` in the value is inserted as written (v2, D20)
    const text = v !== undefined ? String(v) : '';
    formatted = formatted.replace('{' + name + '}', () => text);
  }
  const type = world.projectSettings().navigationPathType; // :176
  const hash = type === undefined || type === 'hash';
  const parts: string[] = [];
  if (queryNames !== undefined) {
    for (const q of (queryNames as string).split(',')) {
      const v = query[q];
      // v2 (D21): null is unset like undefined; name and value encoded, as the Router decodes them
      if (v !== undefined && v !== null) parts.push(encodeURIComponent(q) + '=' + encodeURIComponent(String(v)));
    }
  }
  return (hash ? '' : formatted) + (parts.length >= 1 ? '?' + parts.join('&') : '') + (hash ? '#' + formatted : '');
}

// :235-245 — `registerInput(name, { set })`: no type, no conversion; the editor draws `type: '*'` (:284, :298)
const parameterPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Parameter', examples: ['42', 7, '', null, 'a b', '$&'] });
const queryPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Query', examples: ['x', 2, '', null, 'a&b'] });

export const NavigateToPath = defineNode({
  type: 'PageStackNavigateToPath',
  // v2 (P109 ISL-028, rows D20 "Insert values as written" and D21 "Encode, and skip null"): a parameter value is
  // inserted into Path as written — v1 expanded `$&`, `$$`, `` $` `` and `$'` in it — and each Query name and value is
  // encoded with `encodeURIComponent`, a `null` value left out like an unset one — v1 appended `name=value` raw, so a
  // value with `&` or `#` broke the URL, and a null arrived as the text 'null'.
  version: 2,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/navigate-to-path.ts',
  needs: ['location', 'project'],
  worldPool: {
    projectSettings: [{}, { navigationPathType: 'hash' }, { navigationPathType: 'path' }]
  },

  // :55-60 initialize
  state: { path: undefined, queryNames: undefined, openInNewTab: false, params: {}, query: {}, error: undefined, scheduled: false, presses: 0 } as State,
  // :104-115 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :62-70 — stored raw
    path: {
      type: 'string',
      coerce: 'none',
      displayName: 'Path',
      group: 'General',
      description: 'Path to navigate to; wrap a segment in braces, as in /product/{id}, to get an input port for it',
      examples: ['/product/{id}', '/home', '/a/{x}/{x}', 'https://other.example/x', '//other.example', '', null, 5]
    },
    // :71-80 — stored raw; a parameter (allowEditOnly), so text
    queryNames: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Query',
      group: 'Query',
      description: 'Names of query-string parameters to append, one input port each; a parameter left unset is omitted from the URL',
      examples: ['page', 'page,sort', 'a, b', '']
    },
    // :81-91 — `!!value`; `initialize` sets `false` (:59) — a declared default never runs its setter (nodedefinition.ts :539)
    openInNewTab: {
      type: 'boolean',
      default: false,
      coerce: 'none',
      displayName: 'Open in new tab',
      group: 'General',
      description: 'Opens the path in a new browser tab instead of navigating this one',
      examples: [true, false, undefined, 'yes', 0]
    },
    // :92-100
    navigate: { type: 'signal', outcome: true, displayName: 'Navigate', group: 'Actions', description: 'Navigates to Path, filling in any brace placeholders from their input ports' }
  },

  outputs: {
    // :116-125
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the navigation did not happen, set just before Failure fires' }
  }
}).on(
  {
    path: (_s, v) => ({ says: 'always: kept; read by the next Navigate — each {name} in it is filled from its parameter port as written (an unset one as nothing), and a value that is not text counts as no Path', set: { path: v }, send: [] }),
    queryNames: (_s, v) => ({ says: 'always: kept; read by the next Navigate — one name=value after a ? for each name whose port holds a value, each encoded; an unset or null one is left out', set: { queryNames: v }, send: [] }),
    openInNewTab: (_s, v) => ({ says: 'always: whether the next Navigate opens a new tab or moves this one', set: { openInNewTab: !!v }, send: [] }),
    // :96-98, :120-141 — every press is answered at the frame's end
    navigate: (s) => ({
      says: "always: one navigation at the end of the frame, however many presses, from the frame's final Path, parameters and Query — no Path is Error and Failure for each press; otherwise the URL is built (after a # unless the project routes by path) and, with Open in new tab, handed to a new tab (Done; the browser blocking it is Error and Failure), else pushed into the address (Done; a push the browser refuses is Error and Failure); with no window, Unchanged",
      set: { scheduled: true, presses: s.presses + 1 },
      send: [],
      outcome: 'deferred'
    })
  },
  {
    // :143-223 — ONE navigation for the frame's presses, each answered with its outcome
    afterInputs: (s, _inputs, world) => {
      if (!s.scheduled) return { send: [] };
      const reset = { scheduled: false, presses: 0 };
      const answer = (outcome: 'done' | 'unchanged' | 'failure', error?: string) =>
        Array.from({ length: s.presses }, () => (error === undefined ? { port: 'navigate', outcome } : { port: 'navigate', outcome, error }));
      // :150-160 — and C24 (fixed, ISL-026): a Path that is not text is no Path
      if (typeof s.path !== 'string') {
        return { set: { ...reset, error: NO_PATH }, send: ['error'], outcomes: answer('failure', 'navigate-to-path/no-path') };
      }
      const url = compileUrl(s.path, s.params, s.queryNames, s.query, world);
      if (!world.viewport()) return { set: reset, send: [], outcomes: answer('unchanged') }; // :199-202
      if (s.openInNewTab) {
        const open = { url, target: '_blank' }; // :205 — no features
        if (!world.opens('_blank', undefined)) {
          return { set: { ...reset, error: BLOCKED }, send: ['error'], open, outcomes: answer('failure', 'navigate-to-path/blocked') }; // :206-215
        }
        return { set: reset, send: [], open, outcomes: answer('done') }; // :222
      }
      // C25 (fixed, ISL-028): a push the browser refuses is recorded, then answered Failure
      if (!world.pushes(url)) {
        return { set: { ...reset, error: REFUSED }, send: ['error'], push: { url }, outcomes: answer('failure', 'navigate-to-path/refused') };
      }
      return { set: reset, send: [], push: { url }, dispatch: 'popstate', outcomes: answer('done') }; // :218-222
    },
    derived: {
      // :270-310 `_updatePorts` — one `p-` per unique placeholder in Path, one `q-` per Query name
      inputs: (params) => {
        const ports: Record<string, ValueInputDecl> = {};
        // :297-312 — each labelled with its name (NSP-020 s80, oracle (a): the labels were missing)
        if (typeof params.path === 'string') for (const name of placeholders(params.path)) ports['p-' + name] = { ...parameterPort(), displayName: name };
        if (typeof params.queryNames === 'string') for (const q of params.queryNames.split(',')) ports['q-' + q] = { ...queryPort(), displayName: q };
        return ports;
      },
      // :224-229 — stored raw under the name after the prefix
      on: (s, port, value) =>
        port.startsWith('p-') ? { set: { params: { ...s.params, [port.slice(2)]: value } }, send: [] } : { set: { query: { ...s.query, [port.slice(2)]: value } }, send: [] },
      // :230-245 — any `p-` or `q-` name is registered on first write; nothing else
      discover: (port) => (port.startsWith('p-') ? parameterPort() : port.startsWith('q-') ? queryPort() : undefined),
      candidates: ['p-id', 'p-x', 'q-page', 'q-sort', 'q- b']
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
