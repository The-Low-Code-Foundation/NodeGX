---
id: P107-C6
title: A number arriving on a port that once held a unit value ({ value, unit }) is merged into it
status: fixed
commit: ebeefb060
phase: P109
task: ISL-026
severity: medium
area: runtime / node.ts setInputValue (every port)
found: P107 (the node says what it does) s4, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Value Changed.json "a primitive after a unit object arrives as sent, so a repeated 2 fires once, not on every write (ISL-026, C6)" (and one each in Log, HTTP, Variable2, StreamBuffer, Model2)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row C6) — the row names how it is reproduced and pinned
---

A number arriving on a port that once held a unit value ({ value, unit }) is merged into it.

**Node:** Value Changed, Log — and every `*` / `number` port

**What, with the line:** node.ts `setInputValue` (:410-420): once a port has held a `{ value, unit }` object, every later value that is not `NaN` is MERGED into a fresh copy — `2` arrives as `{ value: 2, unit: 'px' }`, `null` as `{ value: null, unit: 'px' }`, `true` as `{ value: true, … }`. Value Changed then fires on every repeated `2` (a new object each time); Log's Value passes the merged object through. The comment says "inputs with units always expect objects"; a `*` port never asked for one

**How it was found / where it is pinned:** generated, first run, Value Changed seed rotation 20726; scenarios marked `row` in `Value Changed.json` and `net.noodl.Log.json`; 4 + 4 sequences at 200; predicate: a unit object set on the port, then a later set on the same port of something that is not one, difference after it

**Proposed answer:** **a ruling, R7 (README §7)**: is the merge a PORT RULE every target must copy (then it moves into the adapter contract and the interpreter, and the stranger's target implements it) or a runtime quirk to narrow to ports that DECLARE units? Recommendation: narrow — a `*` port that turns primitives into unit objects is a defect class no author can predict

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Only on size inputs".** Inputs built for sizes keep the behaviour; every other input receives exactly what was sent. A small change in the core of the runtime, shipped on its own. An app that relied on a generic input keeping the unit would see plain numbers instead. The question as asked: *"Should this unit-sticking behaviour apply only to inputs that are meant to hold sizes?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s22, ISL-026), as ruled "Only on size inputs".** `node.ts` merges a later value into a held `{ value, unit }` only on a port whose type declares `units`, in both places: `setInputValue` and the first-update queue. Every other port receives exactly what was sent. The six row scenarios lost their mark and were renamed to say what now happens (each name checked against the spec's trace); the five per-node known rows, the Object node's, and `C6_ANY_PORT` are gone from `conformance.test.ts`, with their predicates. Runtime, seed 20732, every spec in 17 `NSP_ONLY` groups: all CONFORM, 0 generated divergences without `C6_ANY_PORT`, so nothing it absorbed was still firing. Control (HEAD's `node.ts`): exactly the six scenarios fail. Reach of the one change a person could see: a component instance's input port has no type, so a size passed through a component input now arrives as the bare number when a wire replaces it. In 170 local projects, 4,792 component instances hold 491 unit-valued parameters and none of them also has a wire into the same port.
