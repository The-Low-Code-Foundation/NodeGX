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


:::info Generated
This page is generated from `node-catalog-enriched.json`. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source enrichment instead.
:::
