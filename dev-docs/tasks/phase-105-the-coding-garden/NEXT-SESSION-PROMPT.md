# Phase 105 — next session

> ### 📋 2026-09-28 (CG s3) — RICHARD RULED, THE GAME IS "OLIVE'S ISLAND", EVERY DRIVE GREEN ON THE MERGED TREE — START HERE
>
> - **Done on `cline-dev` (`83888c07d` → `ff06f39b5`, then the docs commit):** Richard's rulings R5–R15 (README §2, each
>   with the question it answered) built by five lanes (CONTENT, LOOK, DESKTOP, then HOOKS and BACKUP) plus the
>   orchestrator's fixes. The game is **"Olive's Island" / "L'île d'Olive"** everywhere a person sees it (slugs stay
>   `bot-garden`, `garden-desktop`, `garden-kit`); one island per kid (save model v3, migrated with its own save); the
>   Island is the mockup's sea with pins; every text ≥ 4.5:1 (darker fills); Olive lessons are band 10–12 only; rung 9 is
>   "no letter e"; the EN thank-you has no word check; rungs 13–18 promoted from the measured moments; Olive's page hooks;
>   the nightly backup copies the REAL save and a Restore menu brings it back.
> - **Readings taken this session (primary checkout, 2026-09-28):**
>   - `ff06f39b5`: garden specs **332/332** (cg001 20, cg002 116, cg003Template 79, cg005 34, cg006 83); `template:garden`
>     exit 0, 78 components, two runs hash-identical (checked at `5d51e4018`); page drive **148/148** exit 0 (EN+FR, 1368 +
>     390, 0 console / 0 network errors); Olive page drive **16/16, 0 skip**, exit 0; packaged `Olive's Island.app` upgrade
>     drive **PASS 10/10** with the model (Ada/Bolt kept 0.0.1 → 0.0.2; `island-backup-2026-09-28.json` holds Ada/Bolt as
>     stored JSON and as a code). Without the model (at `6acf90060`+): **PASS**, the ask answers `no-model`.
>   - Shell `node --test` **89/89** after the backup lane (`c4a2470e1`).
>   - `443a01e97`, the real model through the shipped table: contract **31/31 CPU**, **30/31 Metal** (P21 poem, variance);
>     `probe-cg006` **6/7 offered on each path** — rung 14 withheld on CPU, rung 9 on Metal (below).
> - **Where the last handoff was wrong:** the fold ruling moved **8** fixtures, not 6. "Rung 9's G1 fails 3/3 EN on both
>   paths" does not reproduce on Metal: she KEPT "no letter e" 2/3 in English ("A vibrant tulip sits tall against a sunny
>   sky."), so the exam withholds rung 9 on a Mac GPU (it offers it on CPU, the tablet's path). "10 of 10 band 7–9 rungs
>   unreachable" had measured the block list; the palette offered 11 (moot now: R8).
> - **Defects found and fixed this session:** 3 of 6 real voiced hints passed every check and had stopped being the hint
>   (an answer in markdown; a story with no question) → `unfaithful` (`e1667b3e1`) · the kit cut a PICKED slot option to 40
>   characters, so 15 options of five rungs were never sent (`0166329e6`) · rungs 13–18 fell through to `hintMissed`
>   (`5d51e4018`) · at 390 the island's labels collided (`b16751f28`) · the backup copied an empty SQLite database while
>   the family lived in browser storage (`bc36c1f59`, R14) · `build-app.js` still built the to-do template and a refused
>   deploy exited 0 (`06ed8650a`) · the Olive drive wrapper exited 0 on a red drive.
>
> **For Richard (human, not code):**
> 1. **Look at it** — the look is graded against the mockup by him, not by the ACs. Screenshots:
>    `../OpenNoodl-worktrees/p105-s3-scratch/final/pages/shots/` (the island, Workshop, Profiles at 1368 and 390; `mockup-*.png`
>    beside them), or run the packaged app `garden-desktop/shell/dist/mac-arm64/Olive's Island.app`.
> 2. **Read the French** (CG-006 AC3), now including rungs 13–18's lines (`cg002Content.ts` WORDS, `cg003Content.ts`).
> 3. **Two minutes by hand:** the Restore menu's native dialogs (CG-004 §8.1 has the steps; CDP cannot press them).
> 4. **Say yes to pushing** the workflow branch for the first Windows run (`git push origin <commit>:refs/heads/p105-garden-desktop`,
>    CG-008) — outward-facing, so ask.
>
> **Session 4, in order:**
> 1. **CG-008 on Windows**, once Richard says push: the run, its step summary, the installed app driven; then the tablet.
>    The app has **no icon** (`electron-builder`: "default Electron icon is used") — make one from the kit's new `icon.png`.
> 2. **The Grown-ups paste box** for a save code (the code is shown but nothing decodes it; words `saveCodePaste` /
>    `saveCodeBad` exist; wire `Logic/Decode save code` + the App store's write) — the second restore path.
> 3. **The after-run rung lesson line**: `Choose hint` is not fed `oliveRung` / `oliveFallback` on the page, so the
>    `oliveRung1–18` lines never show (CG-005 §8 residual). Then the **18 rungs as Skills cards** (CG-003).
> 4. **Rung 9 on Metal**: if the lesson must show on every machine, probe another rule she breaks in EN too (CG-006 §8.9).
> 5. Small: the mockup's **Free play card** on the island; the **Mac Edit menu** (Cmd+C/V in text boxes, unmeasured);
>    the request↔rung mapping is lane HOOKS's choice (CG-006 may move it).
>
> - **Traps paid for this session:** a drive WRAPPER's exit is not the drive's — read `<step>.exit` and its mtime ·
>   `git worktree remove` of a worktree with a symlinked `node_modules` removed only the link (checked: primary's 272 entries
>   intact) · a lane's test count is its worktree's — recount on the primary before quoting · a probe that passed last
>   session is a sample, not a property: re-run it on both paths before building on it.
> - **Known reds that are not ours:** as in s1/s2 (`noodl-mcp` whole-suite 8 suites red at the base; `library:check` 80/81
>   on the untracked `nightbook-kit`). Not re-measured.
> - **Worktrees:** none left (branches `cg-s3-*` kept; every commit is on `cline-dev`). Scratch with every lane's
>   EXPECTED files, logs and screenshots: `../OpenNoodl-worktrees/p105-s3-scratch/`. The common brief:
>   `../OpenNoodl-worktrees/p105-COMMON-BRIEF-s3.md`.
> - **End of session:** `/next` — this block rewritten, README §4 from the task files, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.
