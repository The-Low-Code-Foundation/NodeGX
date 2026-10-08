---
id: P107-C110
title: A Reset during a back's animation empties the stack: the animation's end takes the new start page off it, and every push after is never answered
status: fixed
commit: e9a35da48
phase: P109
task: ISL-048
severity: medium
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `back` :1068-1078 — the transition's end calls `this._internal.stack.pop()`, popping whatever is last by then; `navigateAsync` :994-996 then reads `top.page` of an empty stack)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C110 — a Reset during a back's animation: when the animation ends it takes only the page it popped off the stack — the new start page stays, a push after is Done, and the same push again Unchanged" (and "row C110 — a Start Page the stack does not have: … a push onto it is Failure (stack empty)")
---

**What a person sees.** A Back button pops a page (the default 300 ms animation) and, within that time, something resets the stack
(a Home button wired to Reset, Components changing). The stack shows its start page and Stack Depth says 1 — but from then on every
Push Component To Stack does nothing and answers nothing, until the next reset.

**Where.** The back's end callback pops the LAST entry, not the one it animated. A reset in between replaced the stack with the start
entry, so the end pops that. A push then reads the top entry of an empty stack and throws (and so does any push onto a stack whose
reset failed — scenario "a push onto a stack with nothing on it …").

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** In the back's end, remove the entry it animated (`stack.indexOf(top)`), not the last one; and have `navigateAsync`
report a failure when the stack has nothing on it.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** A back's end takes the entry it animated off the stack (`indexOf(top)`), not
the last one; a push onto a stack with nothing on it (a reset that failed) is Failure `push-component-stack/stack-empty`. Page
Stack spec v7; a scenario added for the empty stack. Runtime 148 / 148 at seeds 13 and 20732; control red on exactly the 2 C110
scenarios.
