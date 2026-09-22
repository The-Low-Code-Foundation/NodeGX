# Phase 93 — next session

**Written 2026-09-20, end of session 28.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built TVW-004/005; s18 built and drove TVW-006; s19 got two rulings and reshaped
TVW-008; s20–22 built TVW-007's eyebrow, trail and hover; s23 built TVW-008's surface; s24 drove
TVW-007's hover; s25 closed TVW-007 AC1/AC6 and TVW-008 AC8; s26 drove TVW-008 for the first time;
s27 built the bench's opening-scenario fix and closed TVW-008 AC4.
**s28 BUILT TVW-009 SLICE 1 — the vocabulary gate, the twenty-string sweep, the create menu and the
MCP briefing. AC2, AC3 and AC4 closed.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ | **AC1–AC4, AC6 green. ONLY AC5 (Richard's WORTHY) is left** |
| TVW-008 | The board | ✅ slices 1–2 | 🔴 **AC7 NOT WORTHY (s29).** Six defects — slice 3 is **P99 `HLT-008`**; the ACs stay here and P93 waits on it |
| TVW-009 | The words | ✅ **slice 1** | **AC2, AC3, AC4 ✅. Left: AC1 (a drive), AC5 (P73's step), AC6** |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 65** (62 at s27; s28 added TVW-009 **AC2**, **AC3**, **AC4**).

## 🔴 Start here

1. **Build TVW-009 slice 2.** §7 of the task file lists it. The cheapest first job is **AC5**
   (P73's tutorial step — read P73's board first; P73 owns the tutorial's shape) and **§2.4's docs
   page**, for which *you must find where the editor docs live* — §2.4 says "or wherever the editor
   docs live, find first", and s28 did not resolve it. **AC1 needs a drive** on a fresh install with
   the blank template, and it is the only part a drive can grade.
2. **FOUR verdicts are with Richard and nobody else can do any of them**, unchanged since s27:
   TVW-004 AC6 (20 shots, s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placement shots (s20),
   TVW-008 AC7 (six shots in `verdicts/tvw-008/`). The first two close their tasks on the spot; the
   last two are each the *only* thing left on their task. **Do not re-send them.** No ruling file
   had landed at s28.
3. **If Richard has ruled on TVW-007's placement**: the winner becomes a constant,
   `eyebrowPlacement.ts` is **deleted** with the three losing branches in `instanceEyebrow.ts`.
   🔴 A switch that outlives its verdict is a second copy of a decision.
4. Two §9.6 items no AC names are still owed on TVW-008: **selection through a frame**, and the
   `Add all` bound **explained** in the picker rather than merely enforced. Neither blocks an AC.

## 🔴 What s28 got WRONG, and how it was caught

**The sweep renamed a surface an explicit ruling had protected.** `InterfaceRailsOverlay.ts` is the
**Blockly logic run bench**, not the Workbench — and s28 rewrote its note to *"The Workbench runs
these blocks here in the editor"*. That **merges two names Richard ruled apart on 2026-09-17**
(*swap the jargon, do not rename it*) and breaks **VFN-011 acceptance criterion 3**: "Workbench"
claims the surface mounts the real app on sample values, which is the opposite of what it does.

It was caught **only** because the memory `two-surfaces-are-called-the-bench` was opened while
writing an unrelated index pointer. **Nothing in TVW-009's task file carried the ruling**, and §2.1
is a *word-shaped* criterion: it hands you one list of occurrences and implies one answer.

✅ **Reverted, and now enforced rather than remembered.** `scripts/vocabulary-ratchet.js` carries
`blockly-run-bench` and `community-bench` as named, path-scoped rules that print their reason.
🔴 **Before sweeping a product word, grep the MEMORY directory for it, not only the source.**

## What slice 1 is — TVW-009 §6 has the whole of it

- **`scripts/vocabulary-ratchet.js`** — a **gate at 0**, not a falling baseline, because the debt
  was twenty strings and the same change swept them. `npm run vocabulary`, wired into `pr.yml`.
- 🔴 **"User-visible" is a question about CONTEXT, not text.** `grep -rac sandbox` over the two
  roots returns **1192** (Electron's `sandbox:` option, `@noodl/runtime/src/sandbox/types` imports,
  `data-test` hooks); the **TypeScript AST** plus a context classifier returns **20**. A regex gate
  would have been red on day one against strings nobody can fix, and would have been switched off.
  **Comments are not AST nodes**, so it cannot redden on prose explaining a rename.
- 🔴 **`bench` names three surfaces** — the Workbench, the Blockly run bench, the community's Bench
  (`/api/v1/bench/threads`, FB-002). **Exactly one was renamable.**
- 🔴 **AC3 found a live defect.** `createMenu` picked the cloud template by comparing
  `template.label` to a constant — the exact failure `ComponentTemplates.cloudFunction`'s own
  comment predicted for "the day someone rewords a menu entry". Renaming the labels would have
  minted a **second `New cloud function` row** and nothing else would have failed. `templateId` now
  carries that identity, the row's test id and the `Component Created` telemetry dimension.
- 🔴 **AC4's lane sentence cost 23 resident MCP tokens and the surface had 6 free.** **Funded, not
  bumped** — `toolDisclosure.test.ts`'s header says `SURFACE_TOKEN_BUDGET` must not be renegotiated
  a third time. The briefing's identifier clause duplicated `get_project_info`'s note (**P77 D48**,
  owner NONE since 2026-09-02, now **SPENT — do not look for that saving again**). **8,274 → 8,255,
  25 free.** A spec asserts the **survivor**, because deleting a fact on the claim that another
  surface carries it, without checking that surface, is how a fact leaves the product.

## 🔴 What s28 learned the hard way

### A mutant that SURVIVES can mean your comment names a mechanism that is not there

The `bench` pattern was written `/(?<!work)\bbench\b/i` with a comment calling the lookbehind
load-bearing. Removing it killed **nothing** — because `\b` already cannot match inside "Workbench"
(there is no boundary between `k` and `b`). The arm was passing for the right answer and the wrong
reason. **Deleted, and re-mutating the `\b` itself kills 3 arms.** 3 mutants killed, 1 survived, and
the survivor was the finding.

### The temporary-index commit trap is real, and the reset is not optional

Confirmed again, with numbers: immediately after `update-ref`, `git diff --cached --stat` showed
**27 files, 982 deletions** — the whole commit **backwards**. A peer running `git commit` would have
reverted this session's work under their name. ✅ `git reset -q HEAD -- <only your paths>` cleared
it; the tree then held **46** entries, the peers' work, untouched (73 before the commit).

## The gates, as of s28

- `npm run vocabulary` — **all six words 0**, exit 0; 134 exemptions under 10 named rules.
- `tests-unit/tvw-009/vocabularyRatchet.test.ts` **22 specs**; `noodl-mcp/tests/tvw009Vocabulary.test.ts`
  **10 specs**; `tests/components/createMenu.spec.ts` **+4 jasmine arms**.
- `typecheck:editor` **0**, `typecheck:editor-tests` **0**, `typecheck:mcp` **0**.
- **`test:main` 524 suites / 8397 specs, exit 0** — was 523 / 8375, so the delta is exactly the
  +1 suite and +22 specs this session adds and nothing stopped loading.
- ✅ **`test:ci` RUN AND AT THE FLOOR** — **3019 specs, 8 failures, exactly the eight by name**
  (3 SUB-006, 3 SUB-011, 2 NDA-017), seed **61157** — a **sixth** distinct seed confirming the same
  set. 3015 → 3019 is exactly AC3's four jasmine arms. ⚠️ Run *before* the Blockly revert; that
  revert restores HEAD's own string and touches no jasmine spec, and `test:main` was re-run green
  after it.
- **noodl-mcp: 7 suites / 9 tests failing — the pre-existing floor**, measured on both arms (this
  session's MCP edits reverted, then restored). `toolDisclosure` was an 8th and it **was** ours.
- ⚠️ **`typecheck:core-ui` is red with 45 unresolved-module errors** (`@noodl-viewer-cloud/execution-history`,
  `@noodl-versioning`, `@noodl-store/*`, `@nodegx/export/ledger`) — **none naming a file s28
  touched**. It has no `pretypecheck` hook, so it wants `build:types` output this checkout does not
  have. Pre-existing. Do not inherit it as a blocker without re-measuring.

## Committing

🔴 The working tree carries other sessions' work (**46** entries at s28). **Commit through a
temporary index with a compare-and-swap** — `BASE=$(git rev-parse HEAD)`, `GIT_INDEX_FILE`,
`read-tree $BASE`, `update-index --add` **naming your paths** (untracked included; a pathspec commit
skips them), `write-tree`, `commit-tree -p $BASE`, `update-ref HEAD $NEW $BASE` — **and then
`git reset -q HEAD -- <your paths>`**. Confirm `git diff --cached --stat | wc -l` is **0** and keep
a control that the tree is not simply empty. **Re-read `HEAD` immediately before each commit.**
⚠️ `scripts/devtools/` holds peers' untracked drive scripts — never `git add` that directory.
⚠️ `packages/noodl-editor/tests/index.bundle.js` is an untracked build artefact containing full
source; it poisons any repo-wide grep. Exclude it, and never stage it.
