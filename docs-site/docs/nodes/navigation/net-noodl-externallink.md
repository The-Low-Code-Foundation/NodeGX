---
title: "External Link"
---
External Link: opens a URL outside the app — same tab or new tab — when its signal fires.

External Link leaves the app: when `do` fires, the browser navigates to `link`, in a new tab when `openInNewTab` is true. It performs no in-app routing. It reports `done` once the link has been handed to the browser, `failure` when there is no Link or a popup blocker refused the new tab, and `unchanged` during a server-side render where there is no browser to open anything in — with Open In New Tab off the page is replaced, so nothing downstream of `done` may still exist.

## When to use it

Documentation links, third-party checkout, mailto/tel URLs. For anything inside the app use Navigate or Navigate To Path, which keep SPA state alive.

## At a glance

| | |
|---|---|
| Category | Navigation |
| Type name | `net.noodl.externallink` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `link` | String | — | Web address to open; one with no scheme is resolved relative to the page the app is served from |
| `openInNewTab` | Boolean | `true` | Opens the link in a new tab; when off the current page is replaced and the app unloads |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `do` | Signal | — | Opens Link, or fires Failure if there is no Link or the link was opened outside a user action |

### What each input does

**Link** (`link`)

- always: kept; read by the next Do

**Open In New Tab** (`openInNewTab`)

- always: kept; read by the next Do

**Do** (`do`)

- no browser window (a server render): nothing opens → Unchanged
- no Link: Error says so, and nothing opens → Failure
- a new tab asked for outside a person's click or key: the browser blocks it, and Error says so → Failure
- otherwise: Link opens, in a new tab unless Open In New Tab is off → Done

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the link has been handed to the browser. It does not promise a tab appeared — nothing readable in the page does, once Open In New Tab is on. With it off the page is replaced, so nothing downstream of this may still exist |
| `unchanged` | Signal | — | Fires when there is no browser to open a link in — a server-side render, where there is nothing to do and nothing to fail at |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the link could not be opened, set just before Failure fires |
| `failure` | Signal | — | Fires when no Link was set, or when the link was opened outside a user action — the case a browser refuses a new tab for. A tab blocked for any other reason still reports Done |

## Watch out for

- Pointing External Link at the app's own routes — the full page reload throws away application state that Navigate would keep.

## Examples

**URL-driven detail page: Router, Page Inputs, Navigate To Path and External Link**

URL-style navigation end to end. A Router named 'Main' hosts /Home and /Product (its `pages` parameter is `{ routes, startPage }`); each page component is rooted by a Page node whose `urlPath` defines its URL pattern — /Product uses 'product/{productId}', so the id lives in the URL. On /Home, a Navigate To Path node (PageStackNavigateToPath) builds the URL from its `path` parameter: the '{productId}' placeholder becomes the `p-productId` input, set here as a parameter, and clicking the button pushes the compiled path into browser history, which the Router picks up. On /Product, a Page Inputs node declares `pathParams: "productId"` so the value parsed from the URL is exposed as its `pm-productId` output, wired into a Text. An External Link node (net.noodl.externallink) opens an outside URL in a new tab — external URLs never go through the Router.

**Turn rows into a file the browser downloads**

Two `JavaScriptFunction` nodes in series and no backend anywhere: the first folds an array of objects into CSV text, the second wraps that text in a `Blob` and hands `URL.createObjectURL` the result, and `External Link` opens it. That URL is the whole trick — it is a real, fetchable address that exists only inside this tab, so the download never leaves the browser and nothing has to be uploaded first. ⚠️ Compare it with `net.noodl.ToCSV` before reusing the conversion half: the built-in node handles quoting and embedded delimiters, which hand-rolled CSV usually does not. The half worth copying is the object-URL download.

## Related nodes

[Navigate](./router-navigate.md), [Navigate To Path](./page-stack-navigate-to-path.md), [Cloud File](../cloud-services/cloud-file.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the page URL, and whether a person caused the action (`location`)

### Starting state

```json
{
  "openInNewTab": true
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/external-link.ts"
/**
 * External Link (`net.noodl.externallink`) — read from
 * `packages/noodl-viewer-react/src/nodes/std-library/externallink.ts` on 2026-10-01 (NSP-015 s16).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` asks the browser to open Link (world.ts LOCATION) and
 * answers at once, the first of these that holds:
 *   - no window — a server render — is Unchanged, and nothing is opened (:46-49);
 *   - no Link (`undefined`, `null` or `''`) is Failure `external-link/no-link`, Error
 *     "No link to open", and nothing is opened (:60-64);
 *   - otherwise the link is handed to `window.open(link, target, features)` as it is (:100):
 *     target `_blank` when Open In New Tab is `true` or unset, `_self` for anything else (:53);
 *     features `noopener,noreferrer` when Open In New Tab is truthy, `''` when not (:52). The two
 *     reads disagree for a truthy value that is not `true` (`'yes'`, `1`): the same tab, with the
 *     new-tab features. Then, if the target is `_blank` and the browser says the press was NOT a
 *     person's (`userActivation.isActive === false`), Failure `external-link/blocked` with Error
 *     "The browser blocked opening a new tab" — the open is still made (:97-111); otherwise Done
 *     (:114). A browser that cannot say (no `userActivation`) is Done.
 * Link and Open In New Tab are stored raw (no setter); Open In New Tab starts `true`, its default
 * (node.ts seeds defaults). Error keeps its last message — nothing clears it — and is sent each
 * time it is set (:62, :104).
 */

import { defineNode } from '../spec';

const NO_LINK = 'No link to open';
const BLOCKED = 'The browser blocked opening a new tab';

type State = {
  link: unknown;
  openInNewTab: unknown;
  /** :5-7 `_internal.lastError` */
  error: string | undefined;
}

export const ExternalLink = defineNode({
  type: 'net.noodl.externallink',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/externallink.ts',
  needs: ['location'],

  state: { link: undefined, openInNewTab: true, error: undefined } as State,
  // :116-127 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :17-22 — stored raw
    link: {
      type: 'string',
      coerce: 'none',
      displayName: 'Link',
      group: 'Values',
      description: 'Web address to open; one with no scheme is resolved relative to the page the app is served from',
      examples: ['https://example.com', 'relative/page', '', null, 5]
    },
    // :23-29 — read through `getInputValue` (:51), which holds the declared default from creation (nodedefinition.ts :539); the setter never runs for a default
    openInNewTab: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Open In New Tab',
      group: 'Values',
      description: 'Opens the link in a new tab; when off the current page is replaced and the app unloads',
      examples: [true, false, undefined, 'yes', 0]
    },
    // :30-115
    do: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Opens Link, or fires Failure if there is no Link or the link was opened outside a user action' }
  },

  outputs: {
    // :133-141
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the link could not be opened, set just before Failure fires' }
  }
}).on({
  link: (_s, v) => ({ says: 'always: kept; read by the next Do', set: { link: v }, send: [] }),
  openInNewTab: (_s, v) => ({ says: 'always: kept; read by the next Do', set: { openInNewTab: v }, send: [] }),
  do: (s, _i, world) => {
    if (!world.viewport()) return { says: 'no browser window (a server render): nothing opens', send: [], outcome: 'unchanged' }; // :46-49
    const features = s.openInNewTab ? 'noopener,noreferrer' : ''; // :52
    const target = s.openInNewTab === true || s.openInNewTab === undefined ? '_blank' : '_self'; // :53
    const link = s.link;
    if (link === undefined || link === null || link === '') {
      return { says: 'no Link: Error says so, and nothing opens', set: { error: NO_LINK }, send: ['error'], outcome: 'failure', error: 'external-link/no-link' }; // :60-64
    }
    const activation = world.userActivation(); // :97
    const blocked = target === '_blank' && typeof activation === 'boolean' && !activation; // :98
    const open = { url: link, target, features }; // :100
    if (blocked) return { says: "a new tab asked for outside a person's click or key: the browser blocks it, and Error says so", set: { error: BLOCKED }, send: ['error'], open, outcome: 'failure', error: 'external-link/blocked' }; // :102-111
    return { says: 'otherwise: Link opens, in a new tab unless Open In New Tab is off', send: [], open, outcome: 'done' }; // :114
  }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
