---
id: P107-C107
title: A push, replace or Reset to a page whose component the project does not have is never answered — the caller's Navigate hangs with no Done and no Failure
status: fixed
commit: 4b29cb7f0
phase: P109
task: ISL-048
severity: medium
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `navigateAsync` :974, `replaceAsync` :860, `resetAsync` :550 — `await this.nodeScope.createNode(pageInfo.component)` rejects; nodecontext.ts `getComponentModel` :621-625)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C107 — a push to a page whose component the project does not have is Failure (not found); the next push is Done" (and its replace and Start Page twins)
---

**What a person sees.** A Component Stack's page points at a component that was renamed or deleted. Pressing the button wired to
Push Component To Stack does nothing, and nothing the author wired to its Done, Unchanged or Failure fires: the press is lost.

**Where.** Every check that answers a refusal (no components, still animating, no such page, already showing) runs before the
stack builds the page. Building it (`createNode`) throws for a component the project does not have, inside the async request, so
the rejection goes nowhere: the queue moves on and the caller is never told.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3) — the request answers nothing.

**Proposed fix.** Catch the build in `navigateAsync` / `replaceAsync` / `resetAsync` and report `component-stack/component-not-found`
(the caller's `hasFailed`, the Reset's Failure) — the same code the not-found check already uses.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** The build is caught in `navigateAsync`, `replaceAsync` and `resetAsync` and answered
with the not-found code the earlier check uses: a push or replace Failure `push-component-stack/component-not-found` (the page
container made for it is deleted), a Reset Failure `component-stack/component-not-found` that leaves the stack empty (C112's
`_resetLeftEmpty`). Page Stack spec v4; two scenarios added (a replace, a Start Page). Runtime 147 / 147 at seeds 13 and 20732;
control red on exactly the 3 C107 scenarios. Found while writing the replace's: P109-S31-REPLACEDROPSPAGE.
