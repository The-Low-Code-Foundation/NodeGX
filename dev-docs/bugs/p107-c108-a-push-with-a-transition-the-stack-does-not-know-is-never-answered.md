---
id: P107-C108
title: A push with a transition the stack does not know (a wired Transition such as "Fade") is never answered, and the page it built is dropped
status: scheduled
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `navigateAsync` :1001 — `new Transitions[args.transition.type || 'Push'](…)` throws for a type the registry (transitions.ts) has not)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "a push with a transition there is no such thing as (Fade) is never answered; the next push is Done (row C108)"
---

**What a person sees.** Push Component To Stack's Transition is an enum, but a wire can hand it any text. With a value the stack
has no transition for, the press does nothing and no outcome fires.

**Where.** The transition is made after the page is built, with `new` on whatever the registry holds under that name. A replace
checks the registry first (`!!Transitions[transitionType]`, :843) and falls back to no animation; a push does not.

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** Do what a replace does: an unknown type plays no animation (or Push), and the push is Done.
