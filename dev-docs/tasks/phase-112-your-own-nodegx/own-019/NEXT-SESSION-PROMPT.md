# OWN-019 — s7: the series on tgz33, by day (CARRYOVER's three, the Launch looks, the editor, Pack It)

**Written 2026-10-14 ~18:05 CEST by Opus (s5); s6 (19:42–20:00, evening — no rounds) did steps 1–2 and updated this
file.** Read, in order: this file; the task file `../OWN-019-THE-VIBE-KIT.md` §7 "s5" and "s6"; `VIBE-AND-LARGE4.md`
§ "s5's new measurements"; the P112 README's R36–R39. Say "Opus" in your first message.

## ▶ s8 LIVE (2026-10-15 afternoon, Opus) — read this first

Richard (14:30): *"I need this Mistral thing to be proven out or dump it. So far I like it, so let's do what we can do
make it work, no compromises."* So s8 drives every open AC toward the AC8 verdict.

- **TE1b 13/13** (editor brief, Node 22, 4 sittings, 109 min, $7.56 list, finished 12:52 by itself) — the s7 series is
  complete: Launch 19/19 ×3 (AC5b), quiz 12/12 ×3 carryover clean (AC4), Pack It 12/12, editor 13/13. No kit commit
  between c52e01e4f and s8.
- **AC3 ("it checks itself") RUNNING** — `ac3lane.sh` A|B in the s8 scratchpad (`089d7f28-…/scratchpad/ac3/`): Large 4
  (tgz33, Vibe kit) is seeded with a finished quiz — the Sonnet yardstick (`control`) or one of its five planted mutants
  — and told `own-019/sentence-check-quiz.txt` ("check it against what I asked for, line by line; change nothing").
  Truth = today's grader on each (`ac3/pre/summary.txt`): control 12/12; noscore ✗score ✗best ✗keep ✗reload; notimer
  ✗order ✗timer ✗timeout and the play stops (4/12); nopersist ✗reload; nocolour ✗green ✗red; nodelay ✗green ✗red.
  Started 14:38 (A: control, noscore, nocolour; B: notimer, nopersist, nodelay); `ac3/v/lane.log`; each round's app is
  graded again after (`K-<m>-after.log`) to see whether it changed anything. Score each report line against the truth.
- **AC3 results so far (truth = today's grader on each seed; "report" = Large 4's own final words, `ac3/report.py`):**
  · **K-control** (29 min, $1.28): 22/23 lines work, one defect — a one-frame flash at each question change. **Real:
    painted frames prove it** (GRADERFLASH, `426d759a8`): the grader is blind to it. App unchanged (12/12 after).
  · **K-notimer** (31 min, $1.72): fails exactly timer + timeout (17 s at "10s"); played round the hang and passed what the
    grader marked "not reached"; reported WATCHINSIDE (`426d759a8`, fixed). App unchanged (4/12 after).
  · **K-noscore** (37 min, $1.50): "the score never goes up … 'Award point' … no wire leaves it" = the planted cut; best
    "mechanism pass, fails in practice" (it seeded 4 itself to prove the reload). App unchanged (8/12 after).
  · **K-nopersist** (sitting 1, 29 min): "the best score does not survive a reload … localStorage is empty … kept only in
    page memory" = the planted cause; + the flash. **But sitting 2 changed the app** (after-grade 12/12): its NEXT.md said
    "owner reviews the audit and decides which failures to fix", the lab sent the bare "Continue.", and it read that as
    "carry on from NEXT.md — I'll fix both failures". Stopped by s8 at 82 min ($4.27). The other four wrote no NEXT.md,
    so their sitting 2 got the brief again and re-checked with zero graph writes. **Finding for the claim:** its check
    reports are honest; a bare "Continue." can override "don't fix yet" (1 of 5). Kit lesson to measure: AGENTS.md —
    when NEXT.md says the person decides, "continue" is not their decision; ask. Lab: a check round = 1 sitting.
  · **K-nocolour** (44 min, $1.71): green + red fail; "styleA/B/C … ignore all three [inputs]" = the planted cause;
    "new question starts clean — vacuous, re-check after the fix". App unchanged (10/12 after).
  · **K-nodelay** (50 min, $2.35): "after about a second … FAIL … the 'Reveal delay' timer … duration 0" = the planted
    cause (it attributes it to the advance line; grade-quiz fails green/red and PASSES advance — its timing starts
    after a 300 ms sleep, a grader hole). Zero graph writes in both sittings (10/12 after).
  · **AC3 verdict: 6/6 planted defects named, five with the exact planted cause; no false report; one real defect the
    grader cannot see (the yardstick's flash) and one kit defect (WATCHINSIDE) found; 1 of 6 changed the app — only
    under the lab's bare "Continue." after its own note said the owner decides.** Cost $1.28–2.35 per check
    (≈ €0.04–0.07 real). Ready for the AC8 write-up.
- **AC4 re-read with painted frames** (`own-019/flash-grade.mjs`): T2/T3/T1b clean, R3 fires, the yardstick fires 4/4.
- **tgz35** = tgz34 + WATCHINSIDE (`render-harness/drive-steps.js` only), proven from the tarball (nested never → fails;
  unknown key → refused; tgz33 passes both silently).
- **`--relay`** (`604af5bbf`) for Richard's own-prompt complex-app round (his idea, 15:20): smoke resumed the same
  session ($0.02). Waiting for his prompt.
- **LETTEREDGE fixed** (`2ba01d07f`): render_report `text-against-edge` + the vocabulary's layout line. Gallery corpus
  from source: TL2 fires (7 chips, 1280 + 390), the other 25 apps silent. **tgz34** (`ac3/../tgz34`) = tgz33 + that
  one change (MCP only; the pack worktree `own019-s4-pack` is c52e01e4f + the cherry-pick, staged, uncommitted);
  proven from the tarball: TL2 fires, TL1 silent. Not yet in a Launch round (no third concurrent round beside AC3:
  Vibe's 429 crash, #1235) → **a Launch on tgz34 first thing next daytime**.
- **`create-nodegx-vibe` built** (`9a2d8551b`): `packages/create-nodegx/vibe/` (outside the workspaces), runs
  create-nodegx `--vibe`, pinned to the same version; publish-npm.sh publishes it last. The registry had none (404) —
  AC6 and AC7 had nothing to run. Publishing it needs a 0.2.2 of the kit (mcp carries row-gap, DRIFTTALLPART and
  LETTEREDGE; registry 0.2.1's MCP shasum ≠ tgz33's) — Richard's step (R11).
- **CARRYOVER:** Vibe half met (T2, T3, T1b clean on tgz33); stays open for the core kit, which has no checklist step.
- **Money, second clean window (Richard, ~14:51): console €84.23.** Since the €57.16 reading (2026-10-14 16:06) the
  recorder counts $63.70 list — s5 after 16:06 $20.57 + the whole s7 series $41.96 (T1 4.01, T2 2.60, T3 6.32, T1b
  3.38, TL1 3.19, TL2 4.89, TL3 4.69, TP1 4.14, TE1 1.18, TE1b 7.56) + AC3 to 14:51 $1.17 (per call, list 1.36 / 0.14
  cached / 4.18 out per M; the recorder matches the round table to the cent on T2, TL1, TE1b). €27.07 ÷ $63.70 =
  **€0.425 per list $** — s5's window said ≈ €0.42. Real money (R: €18 buys the €255 allowance, ×0.0706): **€0.030 per
  list $** → a quiz €0.08–0.19, a Launch page €0.10–0.15, the editor €0.23; €255 ≈ $600 list ≈ 150 Launch pages a month.
- **Look verdicts complete (Richard, ~14:55):** TL1 "I like a lot, no notes"; TL3 "looks great"; TL2 the week strip
  (LETTEREDGE, fixed — render_report fires on TL2 alone of the three). AC5b's three looks: two clean, one defect the
  kit now names.

## ▶ s7 LIVE (2026-10-15, from 06:00 CEST)

The series is RUNNING, from the timer (`s7start.sh`, scratchpad `447c4862-…`): lanes A (T1–T3, TE1) and B (TL1–TL3,
TP1) started 06:00:58. Everything logs to `v/lane.log`. Three lab faults found and fixed this morning:
- **NODE20** (`4f2af625a`): the timer's lanes found `/usr/local/bin/node` v20 → every grader died ("WebSocket is not
  defined"). `regrade.sh watch` (nohup) regrades each round under Node 22 as it ends; graders now refuse Node < 22.
- **HEROPILL** (`4f2af625a`): the Launch grader failed TL1's hero (top-bar pill) and laptop (text beside a photo).
  Fixed and proven: TL1 control 19/19 + `nohero`/`nolaptop` mutants exact (`tchk/`); s6's control + 12 mutants 13/13.
- **PROXYDIES** (`cfe371e46`, high): a stream broken after its headers killed the recording proxy; **T1 lost to it**
  (8/12, stopped by the lab). Rounds started before 07:30 (T2, TL2) still run the OLD proxy. **T1b** (`s7t1b.sh`,
  nohup) replaces T1 when lane A ends.

**Results at 11:05 (all Large 4, tgz33, every round finished by itself):** Launch **TL1 19/19, TL2 19/19, TL3 19/19**
(AC5b's three in a row; 45/72/69 min, $3.19/4.89/4.69 list) · quiz **T2, T3, T1b 12/12, carryover clean ×3** (AC4's
three; T1 = PROXYDIES lab loss) · Pack It **TP1 12/12** · editor **TE1 0/13 = lab loss** (NODE20: backend needs Node ≥ 22.13;
SEEDDONE, `225198677`) → **TE1b started 11:03 on Node 22** (`s7te1b.sh`). Richard's look verdicts: **TL2 — "a weird artifact" in the hero's week strip** (letters against the chip edge →
LETTEREDGE, open, `73c129730`); TL1 chosen for the show-off deploy instead (`netlify/driftwood-tl1` + `.zip`, static
serve checked at 390 and 1280, Fraunces + Instrument Sans load from Google Fonts, no errors); TL3 not yet.
**Show-off deploy (Richard, 11:00):** TL2 via the kit's own `nodegx-deploy` (tgz33) → `NodeGX test projects/OWN-019
Mistral apps/netlify/driftwood-tl2` (+ `.zip`) for Netlify Drop; static serve checked: 1280 and 390 (CDP emulation)
render, no overflow, DM Sans loaded, no console errors.

Results so far: **TL1 19/19** (06:00, 45 min, $3.19 list, 2 sittings) — the first Launch with ✓gaps ✓align;
screenshots opened to Richard 07:40 (verdict not yet recorded). T1 = lab loss. Gallery: TL1 on 4816.

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

1. ✅ **s6: the lab is version-agnostic (`ac3effdd5`).** `own-018/kit-tarball.mjs` finds `<pkg>-<version>.tgz` by
   package name (none or two = refusal); 30 sites in 10 scripts use it; the three round scripts require create-nodegx's
   pin to equal the packed server's version (a mixed 0.2.1-create + 0.2.0-mcp kit is refused, measured). round-kit
   `--dry` = create + rewrite + command.txt, no Vibe. Dry creates pass on tgz30 (0.2.0) and tgz31 (0.2.1).
2. ✅ **s6: tgz32 packed at `ac3effdd5`** — `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/af093de6-cf64-4c6a-ae7c-061079ac7fcc/scratchpad/tgz32`
   (copy it into your own scratchpad). = tgz31 + the one `row-gap` line: same file lists for all three packages; the
   only content diff is that line, bundled three times in mcp (`noodl-mcp.cjs`, `render-harness/drive-steps.js`,
   `measure-from-disk.js`). Proven from the tarballs (copies in s6's `proof/`):
   - **three sizes:** render_report renders desktop | 768x1024 | phone with no `viewports` argument.
   - **row-gap:** RL1 fires on its three feature rows ("01" … 217 px, 18% of the 1176 px row) on tgz31 AND tgz32;
     RL3's hero drawing (`"" and ""`, 473 px, 62%) fires on tgz31 and is silent on tgz32.
   - **list watch:** R1 (Lisbon → Q2, watch Sydney/Canberra/Melbourne) one row per target, all white, PASSED; the
     known-firing control o2 FAILED at the watch — Lisbon's green on **Sydney** 955–1013 ms (R3's miss, by position).
   - **preview starts the backend:** SE1 copy (own backends dir via `NODEGX_BACKENDS_DIR`, port moved 8578 → 8681
     because the gallery's keeper holds 8578, its stale `runtime.json` removed) → "✓ started the app's backend" and
     GET 200; SIGINT the preview → the backend pid gone, 8681 closed; started again → back, 200; `--no-backend`
     control → 000.
2b. ✅ **s6: tgz33 = `c52e01e4f`** (same folder's sibling: `…/af093de6-…/scratchpad/tgz33`) = tgz32 + **DRIFTTALLPART**
   (R40, below): `alignment-drift` now reads a section holding ONE tall part (a form card, a 3-line headline). Same file
   lists; the only diff is that clause, bundled three times. From the tarball: RL1's WAITLIST eyebrow named (302 px),
   RL2b unchanged. Gallery corpus from source: exactly that one new finding. **But the Launch control (`lctl`, Sonnet's
   Driftwood) now drifts too:** its hero's "DRIFTWOOD" wordmark sits 528 px left of the centred 3-line headline (the
   headline was the hidden tall part) — all 12 mutants carry it. Richard: yes, a drift. **The control is now s6's `lchk/c/driftwood`**
   (wordmark centred), mutants `lchk/lmut2` (control as `ctl`) — use these, not s5's `lchk/lctl` / `lmut`.
   Graded on tgz33 (grader at `c52e01e4f`): control 19/19, all 12 mutants exact — 13/13 (`lchk/mutants.log`).
3. **The series on tgz33, Large 4, by day, two at a time:** quiz ×3 (**CARRYOVER needs 3 clean in a row on one kit**),
   Launch ×3 (do they still drift/gap now that render_report says so?), the editor brief ×1 (`--seed` q6, the
   BACKENDSESSION brief — "start it again tomorrow" is now true; grade it AND restart the preview once by hand to see
   the backend come back), Pack It ×1. `s5lane.sh` in the s5 scratchpad is the template (cutoffs 17:00 / 16:30).
   Peek every ~20 min; read every red before believing it (s5: 3 of 4 Launch reds were the grader's).
   ✅ **Staged (s7 prep, 2026-10-14 ~20:40, evening — no rounds):** `s7lane.sh` (A = T1–T3 + TE1, B = TL1–TL3 + TP1;
   names free in the gallery) and a copy of tgz33, both in
   `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/447c4862-bd83-453b-9eae-ded58fea38d1/scratchpad`.
   `--dry` creates of all four briefs on it exit 0, each on `nodegx-mcp-0.2.1.tgz` (`dry/`); no kit commit since
   `c52e01e4f`. **On a timer (Richard, 22:58 — moved from 09:00 to 06:00 so he has rounds to look at when he wakes):** `s7start.sh` (nohup, pid in `s7start.pid`) waits until 2026-10-15
   06:00, then runs both lanes under `caffeinate -i`; everything logs to `v/lane.log`. First check: is it there and did
   lanes A and B start? If the pid is gone before 06:00, start `zsh s7lane.sh A` and `B` by hand.
4. **After each Launch round:** its phone / 768 / laptop shots to Richard for the look verdict (`open -a Preview`, never
   a link). s6 opened RL1, RL2b, RL3 at all three sizes (rendered on tgz32, `proof/shots/`) — **ask for his verdict if
   it is not recorded in the task file yet.** ✅ Recorded for RL1, RL2b, RL3 (s6, 20:05): all three "a nice looking
   landing page"; the one complaint is RL1's feature rows (number far left, big space, text — the gap `row-gap` now
   reports). He did not raise the eyebrow drift (`align` ✗ on all three) — ask him whether it matters before
   treating `align` as a look failure in the claim.
5. **Console readings** at quiet boundaries (ask in plain text; s5's ≈ €0.42/list $ needs a second clean window).
   **Window 2, from the recorder (s7 prep):** after the 16:06 reading (€57.16) s5 spent **$20.57 list** — R3 4.17
   (0.22 of its 4.39 was before 16:06), RL2 0.03, RL2b 6.82, RL3 9.55 (per-call `sent` × the kit's list prices; every
   round total matches the table to the cent). No Mistral round since. At €0.42/$ the console would read ≈ €65.8.
   **The real price (Richard, 2026-10-14 ~20:50): the €255 monthly allowance costs €18 a month, tax included** ⇒ ×0.0706
   on every console €: a quiz (€1.0–1.8) ≈ **€0.07–0.13**, a landing page (€2.9–4.0) ≈ **€0.20–0.28**; s4+s5's whole
   day (≈ €35) ≈ €2.50. Capacity: ≈ 64 landing pages or ≈ 140 quizzes a month. If the rate doubles after the sale
   (~10-20), the per-app price doubles and the capacity halves. Use these figures in AC8.
6. **The claim write-up (AC8)** once tgz33's series is in, then **R35: Richard's own run, last.**

## Needs Richard

- **npm 0.2.1.** A peer's bump (`c2eab03bf`) carries every s5 kit change; origin/cline-dev has them (pushed 17:47).
  Publishing is Richard's (the release peer was told what 0.2.1 carries: opennoodl-a4, 17:58). s5's last commits
  (lab + docs, after 17:47) are local until the next push.
- ✅ R40: the eyebrow drift IS a look failure, and so is the control's hero wordmark (s6, both "yes").
- Console readings.

## Where things are

- **s6 scratchpad:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/af093de6-cf64-4c6a-ae7c-061079ac7fcc/scratchpad`
  — `tgz32` (+ a copy of `tgz31`), `dry/` (the two dry creates), `proof/` (the app copies, render/watch answers,
  `run-preview.sh`, `se1home/`, `shots/RL1|RL2b|RL3`). The pack worktree `OpenNoodl-worktrees/own019-s4-pack` is at
  `ac3effdd5`.
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
