---
id: P107-S82-STATESLOADGATE
title: States announces its dynamic ports at load only when States is set — a node saved with Values alone shows no value outputs or Type pickers until any parameter is edited
status: open
severity: low
area: runtime / States, the editor announcement (`packages/noodl-viewer-react/src/nodes/std-library/states.ts` `setup` :1242-1262 — `nodeAdded.States` gated on `node.parameters.states`, `parameterUpdated` not)
found: P107 NSP-020 s82, 2026-10-11 — oracle (a)'s "values without states" case on the States row, the first L3 row switched on (§6.6)
evidence: `npx jest test/node-spec/nsp-020-ports-parity.test.ts -t States` at the s82 tree — case `values without states` (`{ values: 'x' }`): the spec draws `input type-x` and `output x`, the hook announces nothing; pinned in `nsp-020-module-table.ts` under this id, so a fix is noticed
kit: node-spec
---

At `nodeAdded` the hook calls `updatePorts` only `if (node.parameters.states)` (:1248-1250). On `parameterUpdated` it
calls it for `useTransitions`, `states`, `values`, any `transition*` and any `type-*` with no such guard
(:1252-1260). `updatePorts` itself draws the value outputs and their Type pickers from Values alone (:977-1000) — so
the same node shows two different port lists depending on whether its Values were written before or after the
project was loaded. The spec (`states.ts` `derived`) says the edit path: Values alone draw the value outputs and the
Type pickers, which is also what the `values` setter registers at play (:338-358).

**What a person sees:** open a project whose States node has Values but no States yet; the node shows no value
outputs and no Type pickers in the panel. Type anything into any of its parameters and they appear.

**Fix (P109's, R16):** drop the `if (node.parameters.states)` guard at :1248 so the load path announces what the edit
path announces (the spec's list). Then the two pinned lines in `nsp-020-module-table.ts` stop firing and the
stale-pin check says so; remove them in the same commit.
