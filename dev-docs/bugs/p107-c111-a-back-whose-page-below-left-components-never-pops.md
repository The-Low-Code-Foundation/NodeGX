---
id: P107-C111
title: A Pop whose page below is no longer in the Components list throws: the pusher hears the results and the page below comes back, but the stack never pops
status: fixed
commit: 62b89308b
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `back` :1056-1065 — `addChild(top.from)` and the pusher's back callback run before `_findPage(stack[length - 2].pageId).label` throws)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C111 — a Pop, then Components changed to leave out the page below, in one frame: the Pop is refused (Failure, page not found) before anything moves — the pusher hears nothing — and the reset starts the stack at Detail"
---

**What a person sees.** The Components list is edited (or wired) so the page under the top one is gone, and a Pop runs in the same
frame. The node that pushed the page fires its back action and results; the page below appears again behind the top one; but the
stack never pops — Top Component Name and Stack Depth do not move, and the Pop answers nothing.

**Where.** `back` does its visible work first and names the page below last; the name lookup throws.

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** Look the page below up first, and refuse the back (Failure) when it cannot be found.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** The back looks the page below up first and refuses (`pop-component-stack/page-not-found`)
before anything moves; `_findPage` by id treats an entry whose row the Components list no longer has as not found (`pageRef.label`
threw). Page Stack spec v8.

**The regression scenario was not reaching the row.** The recorded scenario changed Components BEFORE the Pop in the same frame:
the reset the Components write schedules is queued first, so it rebuilt the stack and the Pop found no page the stack pushed —
the same trace before and after the fix. It is renamed for what it shows, and the regression is the Pop FIRST, then the
Components change (at the session's base: the pusher hears the results, the Pop is never answered). Runtime 149 / 149 at seeds
13 and 20732; control red on exactly that scenario.
