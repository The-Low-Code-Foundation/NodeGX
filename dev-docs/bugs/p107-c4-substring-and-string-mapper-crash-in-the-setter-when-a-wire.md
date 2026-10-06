---
id: P107-C4
title: Substring and String Mapper crash in the setter when a wire sends null
status: fixed
commit: 4851100a2 f94bc681d
phase: P109
task: ISL-026
severity: medium
area: runtime / Substring, String Mapper
found: P107 (the node says what it does) s4, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Substring.json "null on String is empty text: Result is ''"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Read it as empty text".** The result becomes empty, as a person would expect from an empty input. Four small changes, plus a rewrite of Substring's description. The question as asked: *"When these nodes receive an empty value, should they treat it as empty text?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), as ruled.** Substring's String setter reads null and undefined as `''`;
String Mapper's Input String and both numbered families read null as `''` (undefined keeps its old meaning: `''` on
the numbered ports, "no input string" on Input String). Substring's String description now says *"an empty value
(null) counts as empty text"*; the catalog, the enriched catalog, the docs page and the cloud node library are
regenerated. Both specs are v2, the five C4 scenarios say the intent (two in `Substring.json`, three in
`String Mapper.json`), and the known rows and their predicates are gone. Runtime 200: both conform, mutants 9 / 9 and
3 / 3. (`f94bc681d` removed a duplicate `const isNull` that a65b077a8 carried and 4851100a2 kept.)
