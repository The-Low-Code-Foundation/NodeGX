# CMP-006 — The round-trip census

**Opened 2026-09-24.** **Status: ✅ MEASURED s1 (2026-09-24) — [CMP-006-READOUT.md](CMP-006-READOUT.md). Rewrite 0 in every corpus; Looks and templates text 0; 330 projects on this machine, one text value (`#29201933`, not a shadow, 10 drive fixtures). Spec `tests-unit/cmp-006/round-trip-census.test.ts` (both mutants redden it; codec identity asserted); script `scripts/devtools/cmp006-project-census.ts`.** Depends on CMP-002…005's codecs.

## 1. The person sentence

> **Someone upgrading to 0.3.0 opens a shadow they wrote by hand in 0.2.x, and it is either shown
> in the composer exactly as it was or shown as the text they wrote — never quietly changed.**

## 2. What to count

Every token value of the five composer types (shadow, gradient, easing, duration, font family) in:

1. `DEFAULT_TOKENS` (28 values: 7 + 5 + 5 + 8 + 3).
2. **The shipped Looks and the MCP's own output**: every token value in
   `models/StylePresets/presets/*.ts` (the four Looks; Playful's four purple shadows are the
   known case), and every token value any MCP composition, recipe or example writes. This is the
   corpus most likely to be in a **brand-new** project, so it is graded first, not last.
3. Every shipped template and prefab that carries tokens (`models/template/templates/*.content.json`,
   Site Builder's `siteTheme.ts` output, the prefab shelf).
4. **Every NodeGX-format project on this machine** — the same **217** P100 UPG-001 counted, read
   through the same loader, **both project formats**
   ([[a-project-scan-must-read-both-project-formats]]: `textStyles` and tokens live in sidecars).

For each value, one of four outcomes:

| outcome | meaning |
|---|---|
| **visual** | `decode` succeeds, every part of it is pickable, and `encode(decode(v)) === v` |
| **visual, kept literal** | as above, but at least one part rides RC-6's literal path (a *Custom* chip). Counted apart so the size of that population is known, and so a codec that *only* passes by keeping literals is visible |
| **text** | `decode` returns `null`; the row keeps its text box and offers *Replace with a preset* |
| 🔴 **rewrite** | `decode` succeeds but `encode` gives a different string. **Must be 0.** A rewrite is the defect this phase must never ship |

## 3. Acceptance criteria

1. A table per type and per corpus: values seen, visual, visual-kept-literal, text, rewrite, with
   the **rewrite column at 0** and the denominators printed (not *"all"*).
2. The census is a spec that runs in `test:main` over (1), (2) and (3), with (4) as a script whose
   readout is committed. The spec reddens when a mutant `encode` writes `0px` for `0`
   ([[a-gate-can-have-a-hole-shaped-like-the-defect]]), **and** when a mutant colour reader
   re-serialises a kept literal (`rgba(0,0,0,.1)` → `rgba(0, 0, 0, 0.1)`).
3. **Corpus (2) has a text column of 0.** The product's own Looks and its own agent never write a
   value the composer cannot open. A value that does is a defect in the Look or the recipe, fixed
   at the source, or a shape the codec learns.
4. Every **text** value that appears **3 or more times** across the projects is either taught to
   its codec (read and written back in its own spelling) or has its reason written here.
5. The `validate_project` check in CMP-009 and this census import **the same codec module**, and
   the spec asserts that by identity (one import path, no copy), so the two can never drift
   ([[a-second-copy-of-a-palette-drifts-silently]]).
