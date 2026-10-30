---
id: P128-S4-HOSTEDPUSHSTATE
title: Inside a conversation (Studio's /panel at the host's origin), the app preview's router pushes a URL on Studio's origin into the host's document and throws SecurityError
status: fixed
commit: nodegx-studio be3a9c5
regression: ../nodegx-studio/editor/hosted-check.mjs "the app's redirect to Sign in moves the frame there and is logged, with no SecurityError from its history"
severity: low
area: "nodegx-studio `editor/serve.mjs` `panelHtml` (rewrites `runtimeBase` to Studio's absolute origin) and the in-page preview's router (`@nodegx/preview`, the runtime's `pushState`); NodeGX `packages/noodl-mcp/src/studio/panelHtml.ts` makes the same rewrite"
found: Beta sweep s21 (P128 S4), 2026-10-27, the STU-082 sandbox census (todo-list copy, fake MCP Apps host)
evidence: "MEASURED: in the hosted arm only, the page logged `SecurityError: Failed to execute 'pushState' on 'History': A history state object with URL 'http://127.0.0.1:<studio>/runtime/sign-in' cannot be created in a document with origin 'http://127.0.0.1:<host>' and URL 'http://127.0.0.1:<host>/panel.html'`; the same drive of Studio opened directly logged nothing. NOT MEASURED: what the person sees (whether the preview stays on the first page instead of Sign in); the panel still came up `ready todo-list pages=2`"
owner: none
---

Seen while driving the census, not chased. Next step is the consequence: open the todo copy's preview in the hosted
panel and in Studio directly, and compare which page each shows after the start-up redirect.

## 2026-10-30: the consequence measured, fixed in Studio's probe

Driven on a todo copy with its backend, Studio opened directly and inside the gate's fake MCP Apps host. **What a
person sees did not change:** both arms end on Sign in, and Studio follows the redirect ("The app's own logic went from
Todo to Sign in"). What broke, hosted only: the SecurityError is thrown out of the router's `_updateUrlWithTopPage`
(`noodl-viewer-react` `router.tsx:926`, no guard) in the middle of a navigation, and the frame's URL stays
`/panel.html`. So Studio's probe never logged the page move (its `pushState` wrapper called `nav()` after the push that
threw), and "queries on open" counted the Sign in page's requests under `/panel.html`; `pageShownByApp`, which reads the
frame's path, could not name the page either.

Fixed in `editor/probe.js` (Studio's script first in the runtime's `index.html`, never in a deployed app): a push the
browser refuses as cross-origin is pushed again as the same path on the frame's own origin, named absolutely (a bare
path resolves against the frame's `<base>`, Studio's origin, and throws again: the first try did exactly that). Hosted
now: frame at `/runtime/sign-in`, the probe's navs `["/panel.html", "/runtime/sign-in"]`, no SecurityError. check:hosted
38/38 with a line for it; with HEAD's probe that line FAILS (37/38, the SecurityError and `moved: false`).

Seen once while driving, not filed: in one direct run of four, Studio's page picker stayed on Todo while the app was on
Sign in (no toast; the next three runs followed). If it comes back, it is `followApp` missing the router's event.
