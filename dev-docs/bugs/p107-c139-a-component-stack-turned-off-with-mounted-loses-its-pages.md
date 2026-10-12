---
id: P107-C139
title: A Component Stack turned off with Mounted and back on comes back at its start page — the pages pushed, and anything typed on them, are gone; ruled: keep them when an option is ticked
status: fixed
commit: c22c9aceb
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (packages/noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx — a remount resets the stack)
found: P107 NSP-016 s56, 2026-10-08 (ruled and filed 2026-10-08)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; the spec copies today's behaviour (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "Keep Pages When Unmounted ticked: Mounted off and on keeps the pages pushed — Stack Depth stays 2, nothing rebuilt (v17, row C139)"
---

**What a person sees.** A stack such as list, then detail, then edit, turned off with Mounted and back on, comes back at its start
page. Visible off and on keeps the pages. With Use Routes on, the reset rebuilds the page in the address, so only the history is lost.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), against the lean: "Keep them only when an option is ticked".** Today's behaviour
stays the default (Mounted removes the element entirely); a new option on the Component Stack keeps its pages through Mounted off and
on, as Keep When Leaving does (ISL-004's "Yes, if ticked"). It is a new input, so it needs a name, a description and its spec version.

**Fixed 2026-10-09 (P109 ISL-048 s34, `c22c9aceb`).** A new input beside Use Routes, **Keep Pages When Unmounted**
(`keepPagesWhenUnmounted`, default off). With it ticked, a mount that finds the stack still holding its pages skips the handler's
mount reset, so the stack comes back on the page that was on top, and a push that waited while it was off lands on those pages. It
still starts again when, while off, something happened that would have reset a mounted stack: its Components written, its Name moved
to another key, or (with Use Routes) the address moved by a Back or Forward it could not hear — the address is the stack's, so it
wins. Page Stack spec v17, seven scenarios; three behavioural controls each red on exactly their own scenarios.
