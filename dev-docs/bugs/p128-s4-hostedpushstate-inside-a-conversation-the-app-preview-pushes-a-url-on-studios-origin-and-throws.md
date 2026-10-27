---
id: P128-S4-HOSTEDPUSHSTATE
title: Inside a conversation (Studio's /panel at the host's origin), the app preview's router pushes a URL on Studio's origin into the host's document and throws SecurityError
status: open
severity: low
area: "nodegx-studio `editor/serve.mjs` `panelHtml` (rewrites `runtimeBase` to Studio's absolute origin) and the in-page preview's router (`@nodegx/preview`, the runtime's `pushState`); NodeGX `packages/noodl-mcp/src/studio/panelHtml.ts` makes the same rewrite"
found: Beta sweep s21 (P128 S4), 2026-10-27, the STU-082 sandbox census (todo-list copy, fake MCP Apps host)
evidence: "MEASURED: in the hosted arm only, the page logged `SecurityError: Failed to execute 'pushState' on 'History': A history state object with URL 'http://127.0.0.1:<studio>/runtime/sign-in' cannot be created in a document with origin 'http://127.0.0.1:<host>' and URL 'http://127.0.0.1:<host>/panel.html'`; the same drive of Studio opened directly logged nothing. NOT MEASURED: what the person sees (whether the preview stays on the first page instead of Sign in); the panel still came up `ready todo-list pages=2`"
owner: none
---

Seen while driving the census, not chased. Next step is the consequence: open the todo copy's preview in the hosted
panel and in Studio directly, and compare which page each shows after the start-up redirect.
