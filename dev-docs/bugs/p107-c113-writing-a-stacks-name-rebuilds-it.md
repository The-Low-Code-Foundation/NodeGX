---
id: P107-C113
title: Writing a Component Stack's Name — even the name it already has — rebuilds it at its start page, losing every page pushed
status: scheduled
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx Name setter :255-269 — deregisters and registers again; `registerPageStack` (navigation-handler.ts :62-104) resets a stack nothing waits for)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "writing Name — even the name it has — rebuilds the stack at its start page (row C113)"
---

**What a person sees.** A Component Stack's Name is wired (from a variable, a component input) and the wire sends again — the same
value. The stack jumps back to its start page and its history is gone.

**Where.** The setter does not compare: it always deregisters and registers, and registering resets.

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** Return early when the name is unchanged (`(value || 'Main') === (this._internal.name || 'Main')`).
