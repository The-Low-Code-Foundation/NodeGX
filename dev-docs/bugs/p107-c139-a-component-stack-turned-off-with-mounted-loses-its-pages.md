---
id: P107-C139
title: A Component Stack turned off with Mounted and back on comes back at its start page — the pages pushed, and anything typed on them, are gone; ruled: keep them when an option is ticked
status: open
severity: low
area: runtime / Component Stack (packages/noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx — a remount resets the stack)
found: P107 NSP-016 s56, 2026-10-08 (ruled and filed 2026-10-08)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; the spec copies today's behaviour (R3)
kit: node-spec
---

**What a person sees.** A stack such as list, then detail, then edit, turned off with Mounted and back on, comes back at its start
page. Visible off and on keeps the pages. With Use Routes on, the reset rebuilds the page in the address, so only the history is lost.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), against the lean: "Keep them only when an option is ticked".** Today's behaviour
stays the default (Mounted removes the element entirely); a new option on the Component Stack keeps its pages through Mounted off and
on, as Keep When Leaving does (ISL-004's "Yes, if ticked"). It is a new input, so it needs a name, a description and its spec version.
