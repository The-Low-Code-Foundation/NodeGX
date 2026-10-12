---
id: P107-C116
title: A Page Router whose Url path is null shows nothing and never answers a Reset; a Navigate to it shows the page but never pushes its URL or answers
status: fixed
commit: 34218468a
phase: P109
task: ISL-048
severity: low
area: runtime / Page Router (noodl-viewer-react/src/nodes/navigation/router.tsx `_trimUrlPart` :42-46 — `url[0]` on null; called wherever `_internal.urlPath !== undefined`: `matchPageFromUrl` :827, `getRelativeURL` :691)
found: P107 NSP-016 s57, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.18; recorded on the runtime target (NSP-016 s57 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Router.json "Url path null is no Url path: the router shows its page and answers its Reset (row C116, fixed in P109 ISL-048)"
---

**What a person sees.** Url path is wired, and the wire carries null (an empty record field, a cleared value). The Page Router goes
blank and a Reset never reports. A Navigate to it builds and shows the page, but the address bar does not change and the Navigate
never fires Done — a Back then leaves the app.

**Where.** `_trimUrlPart` reads `url[0]`; the guards test `urlPath !== undefined`, so null reaches it and throws inside the
request — in `resetAsync` before anything is shown, in `_buildPage` after the page is on and before `pushState` and `hasNavigated`.

**How to reproduce.** Play the `regression:` scenario on the runtime target; "navigate with Url path null: …" is the navigate half.

**Proposed fix.** Treat a Url path that is not text as none (`typeof urlPath === 'string'`), or coerce it in the setter. Small.
