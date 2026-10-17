---
title: "Page Inputs"
---
Page Inputs: exposes the URL path and query parameters of the containing page as value outputs.

Page Inputs receives the navigation parameters delivered to the page component it sits in and republishes them as value outputs. Declare the expected names in the edit-only `pathParams` and `queryParams` string lists; each declared name becomes an output `pm-<name>` holding the value parsed from the URL (path placeholders like `{productId}` on the page's `urlPath`, or query-string entries) or passed by the Navigate node that opened the page. The Router pushes new values into these outputs on every navigation, including when only the parameters change while the page stays mounted.

## When to use it

Inside a Router page component, whenever the page needs data that lives in the URL — a record id, a tab name, a search term. It only receives values pushed by the navigation system, so it does nothing outside a page component; for values passed to ordinary component instances use Component Inputs.

## At a glance

| | |
|---|---|
| Category | Navigation |
| Type name | `PageInputs` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `pathParams` | Stringlist | — | Names of the braced segments in this page’s route, one output port each |
| `queryParams` | Stringlist | — | Names of query-string parameters to read from the URL, one output port each |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered, editor-adapter); the tables above may be incomplete for a given instance._

Output ports are the path/query parameters declared on the containing page component (PageInputsAdapter).

## Ports at runtime

All outputs are runtime-determined (runtime-discovered + editor-adapter, PageInputsAdapter): declaring a name in `pathParams`/`queryParams` registers an untyped `pm-<name>` output on demand. The values themselves arrive when the Router (or a route-enabled Component Stack) navigates to the containing page and calls into this node; a generator can only rely on the names it declared itself.

## Patterns

- `pm-<id>` → a Query Records filter input: the canonical detail page, where the record to show is chosen by the URL.

## Watch out for

- Using Page Inputs to receive values from a normal component instance — that is what Component Inputs is for; Page Inputs is only fed by navigation.

## Examples

**URL-driven detail page: Router, Page Inputs, Navigate To Path and External Link**

URL-style navigation end to end. A Router named 'Main' hosts /Home and /Product (its `pages` parameter is `{ routes, startPage }`); each page component is rooted by a Page node whose `urlPath` defines its URL pattern — /Product uses 'product/{productId}', so the id lives in the URL. On /Home, a Navigate To Path node (PageStackNavigateToPath) builds the URL from its `path` parameter: the '{productId}' placeholder becomes the `p-productId` input, set here as a parameter, and clicking the button pushes the compiled path into browser history, which the Router picks up. On /Product, a Page Inputs node declares `pathParams: "productId"` so the value parsed from the URL is exposed as its `pm-productId` output, wired into a Text. An External Link node (net.noodl.externallink) opens an outside URL in a new tab — external URLs never go through the Router.

## Related nodes

[Page](../visual/page.md), [Page Router](../visual/router.md), [Navigate](./router-navigate.md), [Navigate To Path](./page-stack-navigate-to-path.md), [Component Inputs](../component-utilities/component-inputs.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the page Router (`router`)

### Starting state

```json
{
  "params": {},
  "ports": []
}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/page-inputs.ts"
/**
 * Page Inputs (`PageInputs`) — read from `packages/noodl-viewer-react/src/nodes/navigation/page-inputs.ts`
 * on 2026-10-01 (NSP-015 s19).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node has no behaviour of its own. The Router that built its page
 * hands it the page's params (`_setPageParams`, world.ts ROUTE `page`) — at the build, and again when a
 * reset lands on the same page with other params — and each hand-off is MERGED into what it holds
 * (:55-60): every key handed is stored and its `pm-<key>` output, if the node has one, sends the value;
 * a key not handed keeps its old value (the Router's own TODO, router.tsx :520: "the old value will still
 * exist"). Nothing is cleared, nothing is coerced. Before any hand-off every output is `undefined` and
 * sends nothing.
 * The ports: one `pm-<name>` output per distinct non-empty name in Path Parameters and Query Parameters,
 * each split on `,` and NOT trimmed (setup :103-121) — derived from the params, so an editor can draw
 * them without a running viewer. Both lists are edit-only and do nothing else when written (:38-50).
 *
 * READ, worth a sentence: the Component Stack never calls `_setPageParams` — it hands a page its params as
 * the page component's own inputs (navigation-stack.tsx :974-977), so a Page Inputs inside a Component
 * Stack's page sends nothing (the docblocks at :54 and :82 say "the Router / Component Stack").
 */

import { defineNode, type OutputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

type State = {
  /** :30 `_internal.params` — every value handed, by name */
  params: Rec;
  /** the `pm-` outputs this node has — what `hasOutput` answers (:58) */
  ports: readonly string[];
};

/** setup :103-114 — the distinct non-empty names in both stringlists, in order, untrimmed. */
function paramNames(params: Rec): string[] {
  const names = new Set<string>();
  for (const key of ['pathParams', 'queryParams']) {
    const value = params[key];
    if (typeof value !== 'string') continue;
    for (const name of value.split(',')) if (name !== '') names.add(name);
  }
  return Array.from(names);
}

export const PageInputs = defineNode({
  type: 'PageInputs',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/page-inputs.ts',
  needs: ['router'],
  worldPool: {
    routers: [
      {},
      { page: [{ params: { id: 1 } }] },
      { page: [{ params: { id: 1, tab: 'a' } }, { at: 1, params: { id: 2 } }] },
      { page: [{ params: { id: 'x', extra: true } }, { at: 10, params: { id: 'x', tab: null } }] },
      { page: [{ at: 2, params: { tab: 'b', name: { first: 'A' } } }] }
    ],
    advances: [0, 1, 2, 10]
  },

  // :27-31 initialize
  state: { params: {}, ports: [] } as State,
  init: (_world, params) => ({ ports: paramNames(params).map((n) => 'pm-' + n) }),

  inputs: {
    // :33-41 — stored, read by nothing at run time
    pathParams: { type: 'stringlist', coerce: 'none', displayName: 'Path Parameters', group: 'Path Parameters', description: 'Names of the braced segments in this page’s route, one output port each', examples: ['id', 'id,tab', ''] },
    // :42-50
    queryParams: { type: 'stringlist', coerce: 'none', displayName: 'Query Parameters', group: 'Query Parameters', description: 'Names of query-string parameters to read from the URL, one output port each', examples: ['tab', 'tab,name', ''] }
  },

  outputs: {}
}).on(
  {},
  {
    derived: {
      inputs: () => ({}),
      // setup :115-121 — `pm-<name>`, type `*`, group Parameters; :69-72 the getter reads the stored value
      outputs: (params) => {
        const out: Record<string, OutputDecl<State>> = {};
        for (const name of paramNames(params)) {
          out['pm-' + name] = { type: '*', displayName: name, group: 'Parameters', description: 'The page parameter ' + name + ', as the Router handed it', from: (s) => s.params[name] };
        }
        return out;
      },
      on: () => ({ sendDerived: [] })
    },
    world: {
      // :55-60 `_setPageParams` — merge; flag `pm-<key>` for every key handed that has an output
      page: (s, _inputs, params) => {
        const keys = Object.keys(params);
        return { set: { params: { ...s.params, ...params } }, sendDerived: keys.map((k) => 'pm-' + k).filter((p) => s.ports.includes(p)) };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
