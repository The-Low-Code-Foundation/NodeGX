---
id: P107-C113
title: Writing a Component Stack's Name — even the name it already has — rebuilds it at its start page, losing every page pushed
status: fixed
commit: 2cc6d1dd7
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx Name setter :255-269 — deregisters and registers again; `registerPageStack` (navigation-handler.ts :62-104) resets a stack nothing waits for)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C113 — writing Name, the name the stack already has, keeps its pages: Detail stays on top, Stack Depth 2"
---

**What a person sees.** A Component Stack's Name is wired (from a variable, a component input) and the wire sends again — the same
value. The stack jumps back to its start page and its history is gone.

**Where.** The setter does not compare: it always deregisters and registers, and registering resets.

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** Return early when the name is unchanged (`(value || 'Main') === (this._internal.name || 'Main')`).

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed, on the handler's key.** The Name setter stores a value whose key
(`String(value || 'Main')`, what `NavigationHandler` holds the stack under) is unchanged and returns: no deregister, no register, no
reset. Page Stack spec v15. Of 150 scenarios two traces changed (this one, and blank or null is Main), both renamed; two ROUTES
scenarios whose names claimed the register's reset trace the same: one renamed, one now writes another name (Other), so it still
plays the register's reset beside popstate's. Runtime 150 / 150 at seeds 13 and
20732; interpreter mutants 0 survivors at both; control red on exactly the 2 scenarios whose trace changed.
