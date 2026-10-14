# OWN-019 — s6: the series on tgz31, by day (CARRYOVER's three, the Launch looks, the editor, Pack It)

**Written 2026-10-14 ~18:05 CEST by Opus (s5).** Read, in order: this file; the task file `../OWN-019-THE-VIBE-KIT.md`
§7 "s5"; `VIBE-AND-LARGE4.md` § "s5's new measurements"; the P112 README's R36–R39. Say "Opus" in your first message.

**Model:** Opus. Agent under test: **Mistral Large 4 only** (`mistral-large-4`, pinned) in Vibe 2.26.1, legacy harness,
the Vibe Code key (`MISTRAL_VIBE_API_KEY`, repo `.env`). Daytime only (before ~18:00).

## What s5 settled (2026-10-14, 14:00–18:05 CEST)

- **Every s4 lever is in, each with a regression that fails on HEAD** (on cline-dev; origin has them — a peer pushed
  at 17:47 — except s5's last lab commits):
  NOTELOOP `3153bb4fc` (NEXT.md written whole; the hook refuses a 4th note write), TAPHOLD `d256c1ab1` (s4 misread
  it: the tap never stopped the glide — a read straight after it did; the real defect was every off-screen target
  refused on a smooth-scrolling page), DESCRIBEINSIDE `620e6723e` (Q1's 42-s sitting: `describe` inside `arguments`,
  then an approval prompt ended headless Vibe; round-kit now records `approval`), RECORDERTAIL `bd149ba2c` (the proxy
  lost usage on calls whose last line was > 8 KB), the editor grader's 4 mutants `b090c30ec` (and its own port —
  its first control saved into the gallery's SE1; restored with Richard's OK), BACKENDSESSION `c04c1cc63` (R38).
- **R38 (Richard): "Preview starts it."** `npx @nodegx/preview <app>` starts the backend the project names and stops
  it with the preview; an agent's `provision_backend` adopts it (same pid, measured).
- **R39 (Richard, on RL1's laptop rows): "Yes to all of the above" + three screenshot sizes.** LAPTOPGAPS:
  render_report reports `row-gap` and `alignment-drift` at desktop and renders desktop/768×1024/phone by default
  (`262698308` + `ed121860d` — the first cut sent "tablet", which the real CLI refused on every call; caught by a real
  run, never packed); get_style_vocabulary's `layout` rules; the Launch grader's `gaps` + `align` (19 checks now).
- **WATCHONE `7f6bee6d9`:** `watch: { look: [T, …] }` reads every answer; the kit says watch them all.
- **Grader corrections (each read before believed, each re-proven: s4 control 19/19, 12/12 mutants exact):** hero
  dropped a pitch containing "Driftwood"; laptop wanted +2 side-by-side pairs; font read only the body (a shipped
  display face on the headline now counts — a first widening let `nofont` pass, caught by the mutant).
- **Money (proof 3):** console €51.54 (14:30) → €57.16 (16:06) over ≈ $13.5 Vibe list ⇒ **≈ €0.42 per list $**
  (list ÷ 2, then $→€). s4's "÷ 2, number for number" was against the recorder's low sum — superseded.

## The series on tgz30 (`b090c30ec`) — graded, all Large 4, all by day

| Round | Brief | Start | Sittings | Min | $ list | Cached | Grade | Notes |
|---|---|---|---|---|---|---|---|---|
| R1 | quiz | 14:22 | 1 | 39 | 2.45 | 92% | **12/12, carryover ✓** | watched Sydney; hook stopped one reach past `# Done` |
| R2 | quiz | 15:03 | 2 | 59 | 3.94 | 88% | **12/12, carryover ✓** | |
| R3 | quiz | 16:03 | 2 | 66 | 4.39 | 82% | 12/12, **carryover ✗** | watched Canberra; the flash was on Sydney → WATCHONE |
| RL1 | Launch | 14:22 | 3 | 100 | 7.27 | 86% | 17/19 (✗gaps ✗align) | 17/17 on s4's checks; Richard's screenshot = LAPTOPGAPS |
| RL2 | Launch | 16:04 | 4 | 2 | 0.15 | — | — | **lab failure:** Mistral's stream died 27 s in |
| RL2b | Launch | 16:14 | 2 | 87 | 6.82 | 86% | 18/19 (✗align) | replaces RL2; Fraunces headings, Inter body |
| RL3 | Launch | 16:06 | 3 | 132 | 9.55 | 81% | 18/19 (✗align) | ran past 18:00; first read ✗gaps = its hero DRAWING (no words either side) → row-gap now needs text on one side |

Not run (past the daylight cutoffs): the editor brief (RE1), Pack It (RP1). **CARRYOVER on tgz30: 2 of 3.** Launch on
tgz30: all three pass every behaviour check; all three drift an eyebrow off a centred heading; RL1 the row gaps.
Grades: `own-018/grade-quiz.mjs`, `own-019/grade-launch.mjs` (19 checks) at `09ae8b14c`. Gallery (http://localhost:4800)
has R1–R3 (4810, 4811, 4813), RL1 (4812), RL2b (4814), RL3 (4815).

## Do, in order

1. **Make the lab version-agnostic (first — tgz31 can't run without it).** The packages are now **0.2.1** (a peer's
   `c2eab03bf`, 17:46: "npm 0.2.1"); 25 references in 10 lab scripts hardcode `…-0.2.0.tgz`, and round-kit rewrites
   the literal `"@nodegx/mcp@0.2.0"` pin (create-nodegx 0.2.1 pins `@nodegx/mcp@0.2.1`). Find the tarball by package
   name (`nodegx-mcp-*.tgz`) and the pin by regex. Prove on tgz30 (0.2.0) AND tgz31 (0.2.1) with a dry create.
2. **tgz31 is packed but one fix behind — repack as tgz32 at s5's last commit** (the `row-gap` rule that ignores a
   drawing landed after it, from RL3). tgz31: `…/5d7e516e-…/scratchpad/tgz31` = `09ae8b14c` (preview packed fresh — it now ships
   `dist/backend/cli.js`; the worktree's `noodl-preview/dist` symlink into the primary was removed first). File lists
   vs tgz29: preview +backend/cli.js; mcp +62 starter-asset files (a peer's: Inter, Lucide, starter imagery); nothing
   removed. 🔴 tgz31 is more than s5's levers — it carries peers' TWOLOADERS (`9e40fc5ab`), CLOUDCALLNAME and the
   starter assets. Copy it into your own scratchpad. Prove each s5 fix from the tarballs (`own-019/mcp-call.mjs`), as
   s5 did for tgz30: the three sizes and `row-gap` on RL1's app; a list `watch`; a preview that starts a backend.
3. **The series on tgz31, Large 4, by day, two at a time:** quiz ×3 (**CARRYOVER needs 3 clean in a row on one kit**),
   Launch ×3 (do they still drift/gap now that render_report says so?), the editor brief ×1 (`--seed` q6, the
   BACKENDSESSION brief — "start it again tomorrow" is now true; grade it AND restart the preview once by hand to see
   the backend come back), Pack It ×1. `s5lane.sh` in the s5 scratchpad is the template (cutoffs 17:00 / 16:30).
   Peek every ~20 min; read every red before believing it (s5: 3 of 4 Launch reds were the grader's).
4. **After each Launch round:** its phone / 768 / laptop shots to Richard for the look verdict (still owed for RL1,
   RL2b, RL3 — he has seen RL1's feature rows and asked for LAPTOPGAPS).
5. **Console readings** at quiet boundaries (ask in plain text; s5's ≈ €0.42/list $ needs a second clean window).
6. **The claim write-up (AC8)** once tgz31's series is in, then **R35: Richard's own run, last.**

## Needs Richard

- **npm 0.2.1.** A peer's bump (`c2eab03bf`) carries every s5 kit change; origin/cline-dev has them (pushed 17:47).
  Publishing is Richard's (the release peer was told what 0.2.1 carries: opennoodl-a4, 17:58). s5's last commits
  (lab + docs, after 17:47) are local until the next push.
- The look verdicts on RL1, RL2b, RL3.
- Console readings.

## Where things are

- **s5 scratchpad:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/5d7e516e-4c12-4421-9a2c-2e6af7d4ecdc/scratchpad`
  — `tgz30`, `tgz31`, `v/` (every round, `lane.log`, `allowance.txt`), `s5lane.sh`, `s5rl2b.sh`, `lchk/` (the Launch
  control `lctl`, the 12 mutants `lmut`, copies of RL1/RL2b/GL1), `emut/` (the editor mutants), `layout-corpus.js`
  (row-gap/drift across the gallery), `gallery-SE1-before-restore.db`.
- **s4 scratchpad** (`70374c3f-…`): tgz27–29, the s4 rounds, `run-mutants.mjs`.
- **Gallery:** http://localhost:4800 — `node own-019/gallery.mjs list|serve|stop`. Still running at 18:05 (previews +
  E1/SE1 backend keepers). The SE1 row restored (s5).
- **Lab:** `own-018/round-kit.mjs` (now: `approval` outcome; a sitting with no NEXT.md gets the brief again),
  `own-018/record-proxy.mjs` (whole-line SSE), `own-019/grade-launch.mjs` (19), `grade-editor.mjs` (own port; refuses
  a backend that didn't start), `mutate-editor.mjs` (4 mutants).

## The lab's traps (s5 added five)

A stubbed CLI in a spec cannot see an argument the real CLI refuses — run the real thing once · a grader's copy of a
backend keeps the original's port: if anything holds it, the grade talks to THAT database · a check that widens can
let a mutant through — re-run the mutants after every grader change · a read straight after a tap on a smooth page
reads the glide · headless Vibe ends silently (exit 0, "finished") on an approval prompt. Older: a grade that SAVES
works on a copy · `scroll-behavior: smooth` turns `scrollTop =` into a glide · a lane is silent until it ends.

## End of session

This file rewritten for s7; the task file's §7; the README row; the field guide's measurements; memory
(`phase-112-your-own-nodegx.md`); commit by pathspec.
