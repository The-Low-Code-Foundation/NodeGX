---
id: P109-S38-SSRNOPAGES
title: A server-rendered page logs "This Router has no Pages configured" as an error, twice, then draws the page anyway
status: fixed
commit: 30b0b276d
severity: medium
area: runtime / Router on the server render and the hydrate pre-settle (noodl-viewer-react/src/nodes/navigation/router.tsx `didMount` :144-164 → `RouterHandler.registerRouter` → `resetAsync` :525-533; triggered by `triggerDidMount`, noodl-runtime/src/nodes/componentinstance.ts :312-318)
found: P109 ISL-012 AC3 s38, 2026-10-10
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md §8 s38
regression: packages/noodl-viewer-react/tests/corpus/p109-s38-router-mount-before-pages.test.ts
---

A one-page project (App → Router with `pages: { startPage: "/Pages/Home", routes: ["/Pages/Home"] }`), deployed the way
the editor's Deploy → Self Hosting → Server-side rendering writes it (`deploy-from-disk --ssr`), then `npm install && npm run
build && npm start`. The page renders on the server and hydrates in the browser correctly, but:

- the server logs `[noodl] Router (/App): This Router has no Pages configured … [router/no-pages]` twice on the first request;
- the browser logs the same sentence as `console.error`, twice, on every load.

Measured beside two controls, same project, same build, s38:

| arm | Router errors in the browser | the page |
|---|---|---|
| the server render, hydrated (`data-ssr="1"`) | **2** | drawn, hydrated (the server's DOM adopted) |
| the same server with the stamp changed (`data-ssr="0"`): the browser renders afresh | 0 | drawn |
| the client-only folder (`public/`, served statically) | 0 | drawn |

So it is the server render and the hydrate pre-settle, the two paths that call `triggerDidMount` before React commits. Read,
not proven: `didMount` fires `registerRouter` → `reset()` while `_internal.pages` is still `undefined`, which reports
`router/no-pages`; the `pages` setter then sees `isMounted` and schedules the reset that draws the start page. The error is
false: nothing is wrong with the project.

Reach: every server-rendered or pre-rendered site with a Router, which is every multi-page one. A person reading the browser
console, or an agent reading the error bus, is told to fix a Router that has nothing wrong with it.

**Fixed 2026-10-10 (P109 s39, `30b0b276d`).** Re-measured on a fresh server-rendered deploy of the S18 drive's project: the
browser logged it once at `/` and the server on its first request, but not at `/robot` or `/olive`. S18 (`86d00461a`) had
made an unnamed Router match those URLs, so only a start-page fallback still read the empty Pages. The reading above was
right. A tokenless reset with no Pages yet now waits once for the inputs, and the Pages setter's reset joins it; a Router
whose Pages never land still reports, one update later; a pressed Reset is never deferred. Same deploy rebuilt: 0 on the
server, 0 in the browser on all three URLs, hydrated.
