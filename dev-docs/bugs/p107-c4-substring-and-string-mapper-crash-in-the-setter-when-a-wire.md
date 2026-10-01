---
id: P107-C4
title: Substring and String Mapper crash in the setter when a wire sends null
status: needs-ruling
severity: medium
area: runtime / Substring, String Mapper
found: P107 (the node says what it does) s4, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row C4) — the row names how it is reproduced and pinned
---

Substring and String Mapper crash in the setter when a wire sends null.

**Node:** Substring, String Mapper

**What, with the line:** Four setters call `value.toString()`: Substring `string` (:77), String Mapper `inputString` (:70) and both numbered families (:42, :54). `null` throws inside `setInputValue` — nothing stored, the frame dies at that write; Substring also throws on `undefined` (the others map it to `''`/`undefined`). Substring's description says it "raises an error rather than yielding an empty result"

**How it was found / where it is pinned:** scenarios marked `row` in `Substring.json` (2) and `String Mapper.json` (2); 26 + 37 generated sequences at 200; predicate: the throw's message names `toString` and the difference is at or one after the bad set (a param throws in `mount`, at index 0)

**Proposed answer:** **runtime bug**: `String(value)` for a string that has one, and a decision for null — abstain (what the spec models) or `''`. A wire never delivers `undefined` (`sendValue` drops it, node.ts :820) but a deleted parameter does (`_onNodeModelParameterUpdated` → the port's default, which Substring's `string` has: `''`)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
