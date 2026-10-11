---
id: P107-S82-STATESVALUEPORT
title: States — a `value-<state>-<v>` written while the node is in that state throws when `v` is not in Values (no such output port), and the setter dies with it
status: open
severity: low
area: runtime / States (`packages/noodl-viewer-react/src/nodes/std-library/states.ts` `registerInputIfNeeded`, the `value-` branch :530-541 — `_this.flagOutputDirty(valueName)` with no `hasOutput` check)
found: P107 NSP-020 s82, 2026-10-11 — the first runtime conformance run after the padding came out of the States spec (§6.6)
evidence: `NSP_SEED=20737 NSP_ONLY=States npx jest test/node-spec/conformance.test.ts` at the s82 tree — four generated sequences, each `runtime threw: Node States doesn't have a port named x`; e.g. params `{ states: 'A,B,C', 'transition-B-x': '', 'type-x': 'number' }` (no Values), steps `settle, set transitiondef-B 0, settle, set value-A-x {}, settle`. Declared as a known row in `conformance.test.ts` (`KNOWN_ROWS.States`), counted on every run.
kit: node-spec
---

The `value-<state>-<v>` input exists for any `v` the port name carries (`registerInputIfNeeded` accepts the prefix,
:530), but the OUTPUT `v` exists only once the Values list has named it (the `values` setter, :338-358, is the one
caller of `registerOutputIfNeeded` on this path). The setter does not check: while the node is in `<state>` it writes
`currentValues[v]` and calls `flagOutputDirty(v)`, and `node.ts` throws `Node States doesn't have a port named <v>`
for an output the node does not have. The throw leaves the setter.

**How a person reaches it:** a project whose States node once had `x` in Values, with `value-A-x` set or wired, and
whose Values list was then edited (`x` removed or renamed without the rename being detected): the saved
`value-A-x` parameter stays, and the first write to it while the node is in A throws inside `setInputValue`. Under
the editor the node's error channel shows it; in a deployed app the update that carried the write dies.

**Why the spec did not find it before s82:** `derived.outputs` was padded with every value name the generator's lists
could bring, and the runtime target registered them all at mount — so the output always existed on the runtime side
and the flag never threw. NSP-020 §6.5 / §6.6: the padding was a stand-in for a graph that wires everything, which no
graph is.

**Fix (P109's, R16):** `if (_this.hasOutput(valueName)) _this.flagOutputDirty(valueName);` beside the write — the
check every other send on this node already makes (:257, :842, :860). The spec needs no change: its `value-` reducer
sends what exists (`send` absent, so every output the instance has), which is the fixed behaviour. When fixed, drop
`KNOWN_ROWS.States` in `conformance.test.ts` in the same commit, so its `known` count reading 0 is the regression.
