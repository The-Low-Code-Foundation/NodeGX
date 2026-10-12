---
id: P107-D9
title: Value Changed's "including the first time it arrives" is false for undefined
status: fixed
commit: dd317dbb7
phase: P109
task: ISL-027
severity: low
area: runtime / Value Changed
found: P107 (the node says what it does) s4, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Value Changed.json "a first arrival of undefined is NOT a change" (its reason now quotes the new sentence)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row D9) — the row names how it is reproduced and pinned
---

Value Changed's "including the first time it arrives" is false for undefined.

**Node:** Value Changed

**What, with the line:** Description (:47): "including the first time it arrives". `lastValue` starts `undefined` (:15), so a first arrival of `undefined` is not a change (`undefined === undefined`)

**How it was found / where it is pinned:** scenario *a first arrival of undefined is NOT a change*

**Proposed answer:** **intended** (a wire never delivers `undefined`); the sentence could say "a value"

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Reword the description".** The sentence says 'including the first time a value arrives'. No behaviour changes and nothing can break. The question as asked: *"Should the description be reworded to match what the node does, or should the node change to match the description?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s22, ISL-027), as ruled "Reword the description".** The sentence now says "including the first time a value arrives" in the viewer node, the spec, the docs page and both generated catalogs (`catalog:check` and `catalog:merge:check` up to date). No behaviour changed.
