# IW-010 — The island in native nodes

**Status:** ⬜ scoped 2026-10-03 (P109 s8), **after IW-009** (the children play what exists first; a rebuild must not
move under their sitting). **Source:** Richard's ruling on [P109 ISL-005](../phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md)
(2026-10-02, **"Native nodes first"**), its [census](../phase-109-the-defects-the-island-found/ISL-005-CENSUS-2026-10-02.md),
and [ISL-007](../phase-109-the-defects-the-island-found/ISL-007-AN-APP-SPEAKS-TWO-LANGUAGES-WITHOUT-A-SCRIPT.md)'s AC4.
**Side:** template (`templates/bot-garden`, its generator `packages/noodl-mcp/tests/cg00*/ig00*/iw00*`).

Olive's Island is a program pasted into Functions: 88 of them, 3.2 MB, 93 % of it shared code copied in (the engine
in 20 places). Richard ruled that the island is rebuilt toward ordinary nodes and logic components, as a template task,
once the product gaps that forced the scripts are fixed. This is that task.

## 1. The person sentence

**Someone who opens the island in the editor can follow most of its logic as nodes and wires, and the engine lives in
one place: changing how a robot steps is one edit, not twenty.** Nothing a child sees changes.

## 2. What was measured (P109, cited, not re-measured here)

| reading | where |
|---|---|
| 88 Functions, 3,218,764 bytes; shared code pasted in 2,995,812 (93.1 %); `ENGINE` (95 KB) in **20** | census §1 |
| Verdicts: **26** native today (3 blocked by a missing operator), **33** fit a logic component, **29** real script (15 need shared code mid-logic) | census §3 |
| The a + b rows alone: 3.0 MB → about **1.24 MB**, engine copies 20 → **7** (estimate from the verdicts, not built) | census §3 |
| Words: `/Logic/Translate words` placed **16** times (244 KB component), `Data/Words` 760 rows (98 KB); only **94** wires leave Translate words (48 Text, 18 Button label, 28 component inputs), and **69 of 88** Functions make words themselves (fill / fillIn / lookups); 288 of 334 visible texts switch | ISL-007 §8 s7 (AC1), s8 |

## 3. Depends on (product, P109)

| gap | owner | state 2026-10-03 |
|---|---|---|
| Translation with no script | ISL-007 | ✅ built s8: the i18next add-on 1.1.0 (text as typed, missing words named). The page pattern is nightbook's `UI/Say` (Component Inputs → Translation → Text), placed where a Text would be; its Function is no longer needed |
| "Is in this list" in Array Filter | `P109-S5-ARRAYFILTERIN` | ✅ built s8: `in` / `nin` ("Is one of" / "Is not one of"), a wired Array or typed "a, b"; a nested field (`owner.id`) is NOT, and needs a ruling (`P109-S8-ARRAYFILTERPATH`) |
| Rows shared app-wide by id | ISL-003 | open (the template prefixes ids by hand) |
| ~~String Format's repeated placeholder~~ | — | not a gap (it fills every occurrence; P107-D2 owns the wrong comment) |

The ruling was asked with four gaps; it is **three**. Not re-asked: it does not change which way the choice points.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | The census re-run at the start (the template moves: it grew 31 % between 10-01 and 10-02). The verdict table is the plan. |
| AC2 | **The a-rows are native.** Each of the 26 (or what the re-run says) is nodes only, or nodes + Expression one-liners; the garden specs and every drive green after each slice. |
| AC3 | **One engine.** The b-rows call ONE `Logic/Engine` component through ports (census §4's E1…E8 ops); `ENGINE` text appears once outside the 15 c-rows that still need it mid-logic. Bytes and copies recorded beside census §1. |
| AC4 | **ISL-007 AC4, the words.** `Logic/Translate words` and `TRANSLATE_ALL_SCRIPT` deleted; words through the i18next add-on (`{x}` → `{{x}}`, 25 placeholders); Text words through a `Say`-shaped component; the 69 word-making Functions take their words from Translation nodes or keep only what the ruling leaves. `drive-isl007-words.js` re-run: ≥ 288 of 334 switch, 0 braces, beside the AC1 table. |
| AC5 | Nothing a child sees changed: `drive-ig004-island.js`, the Olive / Workshop / land drives, 3D, the deployed page — all at their pre-slice counts. |
| AC6 | What is left (the 15 c-rows) is written down for the "shared script file" decision the ruling put afterwards. |

## 5. Traps

- **A rebuild of a live template under a peer's drives.** Slice it; one slice green before the next.
- The generator writes the template: edit the generator, regenerate, `git diff` the template (ISL-019's stable ids make
  that diff readable).
- A Say component per word costs a component instance, not a node pair; a Button label is not a Text (18 of the 94
  wires) and keeps a Translation beside it.
