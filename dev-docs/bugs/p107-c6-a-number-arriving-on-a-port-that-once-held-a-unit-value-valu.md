---
id: P107-C6
title: A number arriving on a port that once held a unit value ({ value, unit }) is merged into it
status: needs-ruling
severity: medium
area: runtime / node.ts setInputValue (every port)
found: P107 (the node says what it does) s4, 2026-09-30/10-01
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
