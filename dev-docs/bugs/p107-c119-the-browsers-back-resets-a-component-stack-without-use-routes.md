---
id: P107-C119
title: The browser's Back or Forward sends every Component Stack on the page back to its start page, Use Routes or not
status: fixed
commit: b5b06bcb6
phase: P109
task: ISL-048
severity: medium
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `didMount` :182-198 adds the `popstate` listener whatever `_internal.useRoutes` says; `onScheduleReset` → `scheduleReset`)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C119 — ROUTES: Use Routes OFF — a push, then the person's Back: the stack does not hear it — Detail stays on top, Stack Depth 2"
---

**What a person sees.** An app uses a Component Stack for tabs or a wizard, with Use Routes off. The person presses the browser's Back
(or follows an in-page `#anchor` link, which a browser also announces with `popstate`). Every Component Stack on the page drops what it
shows and rebuilds its start page. Nothing asked it to.

**Where.** `didMount` subscribes `onScheduleReset` to `popstate` on every stack. `useRoutes` is only read later, in `matchPageFromUrl`
and `_updateUrlWithTopPage`. A stack that does not use the URL still resets when the URL moves.

**How to reproduce.** Play the `regression:` scenario on the runtime target: after a push, Stack Depth 2, a traverse to `#/x` brings
Stack Depth 1 and Top Component Name Home. The spec copies the behaviour (R3).

**Proposed fix.** Subscribe to `popstate` only while Use Routes is on (and subscribe or unsubscribe when it changes while mounted), or
have the listener return early when `!this._internal.useRoutes`.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed (the second reading).** The `popstate` / `hashchange` listener returns at once
when Use Routes is off, read at the event so turning it on or off while mounted holds. Page Stack spec v14. Runtime 150 / 150 at
seeds 13 and 20732; control red on exactly the C119 scenario.
