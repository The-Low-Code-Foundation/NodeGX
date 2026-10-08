---
id: P107-C110
title: A Reset during a back's animation empties the stack: the animation's end takes the new start page off it, and every push after is never answered
status: scheduled
phase: P109
task: ISL-048
severity: medium
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `back` :1068-1078 — the transition's end calls `this._internal.stack.pop()`, popping whatever is last by then; `navigateAsync` :994-996 then reads `top.page` of an empty stack)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "a Reset during a back's animation: when the animation ends it takes the NEW start page off the stack, and every push after is never answered (row C110)"
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
