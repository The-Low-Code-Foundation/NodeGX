---
id: P107-C5
title: Boolean, Number, String and Color variables ignore a first Value of 0
status: fixed
commit: e3c322aa5
phase: P109
task: ISL-027
severity: medium
area: runtime / Variables
found: P107 (the node says what it does) s4, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Number.json "a FIRST value of 0 is stored and fires Changed; 1 then stores (v2, C5)" (and one more in each of Boolean, String, Color, Number)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row C5) — the row names how it is reproduced and pinned
---

Boolean, Number, String and Color variables ignore a first Value of 0.

**Node:** Boolean, Number, String, Color

**What, with the line:** `initialize` seeds `latestValue = 0` (variablebase.ts :121) and the value setter compares against it (DEF-046, :164-168). So a FIRST Value of `0` is never stored (a String handed the number 0 stays `''`, a Boolean stays unset), and a `Set` pulsed before any Value stores that seed through `cast`: `'0'` in a String, the NUMBER 0 in a Color, `false` in a Boolean — Changed fires and Done is reported for a value nobody sent

**How it was found / where it is pinned:** by reading; pinned in every Variable's scenarios (*a FIRST value of 0 is ignored*; *Set before any Value stores the seed*) and `tests/batch.test.ts`; the spec models it (the runtime wins)

**Proposed answer:** **runtime bug**: seed `latestValue = undefined` (:121 gives no reason for 0). Then the first 0 is a change (`valueDidChange(undefined, 0)`), and a Set before any Value abstains (`setValueTo(undefined)` returns false → `unchanged`), which is what the contract's own table says (:249-254)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Start with no remembered value".** A first 0 is stored and fires Changed like any other value. Set before any value reports that nothing changed. A one-line change, and an app that relied on Set storing the hidden 0 would see the Variable keep its starting value instead. The question as asked: *"Should a Variable start with no remembered value, so a first 0 is stored and Set before any value does nothing?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s22, ISL-027), as ruled.** `variablebase.ts` seeds `latestValue` as `undefined`: a first 0 is stored and fires Changed, and a Set before any Value abstains and reports Unchanged. One line serves all four (Color's viewer node shares the base). The specs (v2) and eight scenarios say it; `tests/batch.test.ts`'s pin is rewritten. Runtime at 20732 and 13: all four conform. Control (HEAD's `variablebase.ts`): the eight scenarios fail, plus 76 / 60 / 60 / 55 generated.
