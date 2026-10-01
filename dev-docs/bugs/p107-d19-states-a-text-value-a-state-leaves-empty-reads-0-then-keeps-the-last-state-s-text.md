---
id: P107-D19
title: States — a text or true/false value reads 0 in the starting state; a text a state leaves empty keeps the previous state's
status: needs-ruling
severity: medium
area: runtime / States
found: P107 NSP-013 s14, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.1g, §6.2
---

When a States node starts, every value takes its first state's value OR 0, whatever the value's type:
a String value the first state leaves empty reads the number 0 (a Text shows "0"), and a Boolean value
set to false reads 0. Later moves read the type properly — but a String value a state leaves empty is
`undefined`, which is never sent, so after A → B → A the text still shows B's text while the node is in A.
Measured: label empty in A, "hello" in B; start → label 0; to B → "hello"; back to A → still "hello".

Where: `packages/noodl-viewer-react/src/nodes/std-library/states.ts` :592 (`jumpToState`:
`stateParameters[prefix + v] || 0` for every type); :787 (`goToState`: a string value is set raw, so an
unset one is `undefined`).

Reproduce: `packages/nodegx-node-spec/scenarios/States.json`, "the first state's text that the state does
not name, and its false, are published as 0" — the runtime and the spec agree (R3 (a)).

Proposed: one rule per type in both paths — the type's empty value (`''` for text, `false` for true/false,
0 for a number) when a state names none.
