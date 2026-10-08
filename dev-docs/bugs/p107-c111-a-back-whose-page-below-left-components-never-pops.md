---
id: P107-C111
title: A Pop whose page below is no longer in the Components list throws: the pusher hears the results and the page below comes back, but the stack never pops
status: scheduled
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `back` :1056-1065 — `addChild(top.from)` and the pusher's back callback run before `_findPage(stack[length - 2].pageId).label` throws)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "Components changed to leave out the page below, and a Pop in the same frame: the pusher hears the results, the page below comes back, but the stack never pops (row C111)"
---

**What a person sees.** The Components list is edited (or wired) so the page under the top one is gone, and a Pop runs in the same
frame. The node that pushed the page fires its back action and results; the page below appears again behind the top one; but the
stack never pops — Top Component Name and Stack Depth do not move, and the Pop answers nothing.

**Where.** `back` does its visible work first and names the page below last; the name lookup throws.

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** Look the page below up first, and refuse the back (Failure) when it cannot be found.
