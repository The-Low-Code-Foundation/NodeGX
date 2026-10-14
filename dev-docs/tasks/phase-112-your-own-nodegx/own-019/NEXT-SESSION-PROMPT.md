# OWN-019 — s5: the levers into tgz30, then the Large 4 series on it

**Written 2026-10-14 ~14:05 CEST by Opus (s4), from Richard's rulings at ~13:50 (R36, R37 below).** Read, in order:
this file; the task file `../OWN-019-THE-VIBE-KIT.md` §7 "s4" entries; `VIBE-AND-LARGE4.md` § "s4's new measurements";
the P112 README's R33–R37. Say "Opus" in your first message.

**Model:** Opus. Agent under test: **Mistral Large 4 only** (`mistral-large-4`, pinned) in Vibe 2.26.1 on the legacy
harness, the Vibe Code subscription key (`MISTRAL_VIBE_API_KEY`, repo `.env`). **No GLM, no Sonnet rounds (R36).**

## What s4 settled (2026-10-14, 09:10–14:00 CEST)

- **Daytime works.** Large 4 thought at 306–406 chars/s (s3's afternoon 130–260, evening ~50); cache 85–91% per round
  (s3 evening 9–41%). o1's 30-min stall was the evening, not R32: o2 (same tgz27) designed the app in one 103 KB think
  in 5.6 min and finished by itself. **R32 (one session, taught) holds.**
- **Every miss was the agent's TOOLS, not its checklist.** o2 (tgz27) 11/12, carryover not clean: its checklist had the
  right lines; `read: { look }` waits to settle (missed a 55 ms flash) and there was no reload (it navigated to
  `/start`). Fixed: `drive_page` `watch` + `reload` (WATCHMOMENT, RELOADHERE, `5f8dee6d7`). **Q1 on tgz29: 12/12,
  carryover clean, by itself; it used watch ×3 and reload ×3 and built a reset-first component.**
- **Launch is a pass and a look Richard liked.** L1 (tgz28) **17/17** by itself, 90 min, $5.12 list — Fraunces + DM
  Sans painted, its own palette and drawn product vignettes. Richard: *"Fuck it actually looks good, blow me over
  with a feather."* (look verdict, R35's style challenge.)
- **The editor bonus works — with an intervention.** Richard's ask: a second session on a finished quiz adds an
  editor kept "for everyone on this computer". E1 (Large 4, seeded with q6): chose the local backend, proved the
  record contract on a scratch page first, app **13/13** (`grade-editor.mjs`) — then **67 min failing to edit its own
  NEXT.md** (NOTELOOP; 18 of 23 `edit`s refused) until the lab stopped it at 13:36.
- **Comparisons, then dropped (R36):** GLM-5.3 quiz 12/12 (47 min), Launch **12/17** (error line shown before any
  press, `ada@nowhere` accepted and saved, no chosen font); Sonnet quiz 12/12 (15 min), editor 13/13 (27 min). Richard:
  *"GLM performed woefully. Sonnet isn't much better. Focus on Large 4 for now and get that right."*
- **Kit defects found and fixed (all pushed to origin by 13:58):** NODETYPEWORDS, NESTEDCALLTOOL, PRESETFONTS
  (`cda7ea056`), WATCHMOMENT, RELOADHERE (`5f8dee6d7`). **Open:** NOTELOOP, BACKENDSESSION (high), TAPHOLD,
  CARRYOVER (needs 3 clean rounds on a `watch` kit — Q1 is 1).
- **Where the plan of record was wrong, and what was done instead:**
  - "Grader red = the app's fault" was wrong FOUR times today — each read before believed, each the grader's: a `\S`
    escape in a template (hero), a palette rule counting the template's own slate/blue, an instant press + the
    grader's own `scrollTop` gliding under a page's `scroll-behavior: smooth` (L1 scroll), and the editor grader
    saving its edit INTO the round's backend (a regrade then found no Portugal), reloading the editor screen, and
    racing question 2's buttons. All fixed and committed; Launch grader re-proven (control 17/17, 12/12 mutants).
  - **The series did not run on one kit.** The fixes landed mid-morning: o2 tgz27, L1 tgz28, Q1/E1 tgz29. Richard
    then ruled levers first (R37) — so **nothing yet counts toward "three in a row on one kit"**; tgz30 starts it.
  - The comparison lane's notifications only fire when the whole lane ends: rounds ran 2 h unwatched and E1 looped
    67 min. **Check running rounds yourself** (peek + journal age) at least every ~20 min.

## Readings taken (with date and commit)

| Round | Kit | Started | Grade | Ended | Min | $ list | Cached | Tools | Longest think |
|---|---|---|---|---|---|---|---|---|---|
| o2 quiz | tgz27 | 09:10 | 11/12, carryover ✗ | itself (hand-over at 100 calls) | 52 | 3.64 | 86% | 136 | 103 KB |
| L1 launch | tgz28 | 09:50 | **17/17** | itself | 90 | 5.12 | 89% | 202 | 94 KB |
| Q1 quiz | tgz29 | 10:14 | **12/12**, carryover ✓ | itself (3 sittings; #2 did nothing in 42 s) | 56 | 3.49 | 91% | 152 | 117 KB |
| E1 editor | tgz29 | 11:10 | **13/13** | **lab stop** 13:36 (NOTELOOP) | 146 | 5.77+ | 88% | 112+ | 161 KB |
| G1 quiz (GLM) | tgz29 | 11:47 | 12/12 | itself | 47 | 5.01* | 97% | 262 | 133 KB |
| GL1 launch (GLM) | tgz29 | 12:52 | 12/17 | itself | 49 | 6.73* | 98% | 367 | 125 KB |
| S1 / SE1 (Sonnet) | tgz29 | 12:36 / 11:20 | 12/12 / 13/13 | itself | 15 / 27 | API-eq 6.54 (SE1) | 98% | — | — |

\* GLM's Vibe $ uses third-party list prices ($1.40/$4.40, unverified). Q2 and SL1 were started and **stopped by
R37** (not results). Grades: `own-018/grade-quiz.mjs`, `own-019/grade-launch.mjs`, `own-019/grade-editor.mjs` at
`42bab1d60`. **Console allowance (Richard):** 09:12 €30.90 · 10:14 €32.74 · 10:47 €34.49 — €3.59 over o2 + part of
L1/Q1 ≈ the recorder's $7.10 list ÷ 2: **the console € tracks Vibe's list $ halved (the launch sale) number for
number.** A quiz ≈ €1.8 of allowance → ~140/month in the sale, ~70 after (~2026-10-20). The recorder read L1 at $2.29
where Vibe said $2.70 for its sitting 1 — unexplained (lever 5).

**npm:** the 0.2.0 changelog (`54a0ce946`, a peer, 13:47) lists watch/reload, preset fonts, call_tool and
BACKENDSESSION; **the registry still served 0.1.0 at 13:58** (`npm view @nodegx/mcp version`). Publishing is Richard's.

## Do, in order

1. **The levers → kit tgz30** (one commit each, test with a control that fails on HEAD, bug row updated):
   1. **NOTELOOP** (`dev-docs/bugs/p112-own019-noteloop-…`): Vibe AGENTS.md — NEXT.md is written whole with
      `write_file`, never patched; the hand-over hook (`profiles/vibe/hooks/hand-over.mjs`) counts doc edits after
      this session wrote NEXT.md and past ~3 answers "the notes are done — stop". Test both (a 4th edit refused; the
      first three pass; an earlier session's NEXT.md closes nothing).
   2. **TAPHOLD** (open): `drive_page`'s tap leaves L1's smooth scroll at 2–201 px where a held CDP press or a touch
      tap reaches 3788 (measured on `…/v/L1/work/apps/driftwood`). Holding 100 ms inside drive-steps did NOT fix it —
      try the pre-press locate/stability loop and focus emulation first. Fix only what you can reproduce.
   3. **BACKENDSESSION** (open, high): `noodl-preview` starts the project's own local backend when its endpoint is
      loopback and the backend exists under `~/.noodl/backends` — the gallery's `keep` command
      (`own-019/gallery.mjs`) is a working reference (packed MCP + `provision_backend` by name reuses the data). Ask
      Richard before changing what `npx noodl-preview` does if it is more than starting what the project already
      names. Without it, the editor brief's "start it again tomorrow" is false for a person.
   4. **Q1's empty sitting:** sitting 2 ran 42 s and left NEXT.md unchanged (`…/v/Q1/agent2.jsonl`) — read why.
   5. **Recorder vs Vibe $:** L1 $2.29 (recorder) vs $2.70 (Vibe, sitting 1). Does the proxy miss calls (streams
      without usage)? Proof 3 needs the per-round money right.
   6. **The editor grader's mutants** (it has a control — the seed fails `editbutton` — but no mutants): ≥4 on SE1's
      or E1's app (browser-only storage → `shared`/`restart`; colours ignored; seconds ignored; marker ignored).
   Then pack **tgz30** in `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/own019-s4-pack` (`git -C …
   checkout --detach <commit>`; delete any symlinks in `packages/noodl-mcp/dist` first; `npm pack` mcp and
   create-nodegx; preview = tgz29's). Diff its file list against tgz29's and prove each fix from the tarball
   (`own-019/mcp-call.mjs`), as s4 did.
2. **The series on tgz30, Large 4 only, daytime (before ~18:00), two at a time:** quiz ×3, Launch ×3, the editor
   brief ×1–3 (the fourth kind of app — proof 2), Pack It ×1 regression. `round-kit.mjs … --kit vibe --record
   --max-price 10 --stall-min 45 --sittings 4 --max-total 20` (editor: `--seed <q6 copy>`; s4's is
   `…/scratchpad/v/seed-q6/capital-quiz`, or copy the gallery's `q6/capital-quiz`). Grade every round, read every
   red before believing it, add it to the gallery, peek every ~20 min (journal age + last calls) — a loop with tool
   calls never trips the stall watchdog. Ask Richard for a console reading at a quiet boundary.
3. **After each Launch round:** its phone/laptop screens to Richard (the gallery's shots, or `drive-steps.js …
   --viewport 390x2600 --out-dir … [{screenshot}]`) — three different looks is part of the result.
4. **The claim write-up (AC8)** when the series is in: round table, the four proofs with numbers (per-app € from the
   console), the looks side by side, open defects (BACKENDSESSION first), levers kept/dropped, the fork trigger.
   Then **R35: Richard's own run, last.**

## Needs Richard (not an agent's call)

- **npm publish of 0.2.0** — the packages on origin carry s4's fixes; the registry has 0.1.0.
- **BACKENDSESSION's shape** if the fix changes what `noodl-preview` does beyond starting the project's own backend.
- **Console readings** at round boundaries (proof 3).
- The look verdicts on each Launch round.

## Where things are

- **Kits:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/70374c3f-d9d2-431a-b6da-907fd33896c9/scratchpad/v/tgz27, tgz28, tgz29`
  (tgz29 = `5f8dee6d7`: s4's five fixes; tgz28 = `cda7ea056`). **Copy what you need into your own scratchpad first**;
  the gallery also keeps every kit it served under `…/OWN-019 Mistral apps/tgz/`.
- **The gallery (Richard's ask: "a locally running version of every app … summarised at the end"):**
  `~/vscode_projects/NodeGX test projects/OWN-019 Mistral apps/`, index **http://localhost:4800**, apps 4801–4809
  (q6, o2, Q1, L1, SE1, G1, S1, E1, GL1); E1/SE1 have their backends kept alive. `node own-019/gallery.mjs
  add <round> <root> --tgz <dir> --brief <name> [--model …] [--note …]`, `serve` (restarts all, detached — still
  running from s4), `stop`, `list`. Add every s5 round; the summary at the end is owed.
- **The lab:** `own-018/round-kit.mjs` (now `--model`, `--seed`), `own-018/round-claude.mjs` (`--seed`),
  `own-018/grade-quiz.mjs`, `own-019/grade-launch.mjs` (+ `mutate-launch.mjs`, control = l0's look replayed through
  tgz28: `…/scratchpad/v/lctl/driftwood`), `own-019/grade-editor.mjs` (grades a copy; restarts the backend under the
  round's HOME), `own-019/mcp-call.mjs` (call the packed server's tools on an app), `own-019/anatomy.mjs`,
  `own-018/peek.mjs`. Briefs: `own-018/sentence-quiz.txt`, `own-019/sentence-pack.txt`, `sentence-launch.txt`,
  **`sentence-editor.txt`** (new).
- **Nothing running** at 14:00 except the gallery (previews + 2 backend keepers; `node own-019/gallery.mjs stop`).

## The lab's own traps (s4 added four)

A grade that SAVES (the editor) mutates the round unless it works on a copy · a page's `scroll-behavior: smooth` turns
a grader's `scrollTop = y` into a glide (use `scrollTo({ behavior: 'instant' })`) · an instant CDP press can cancel a
smooth scroll its click starts (hold ~100 ms) · a lane script notifies only when the whole lane ends — check rounds
yourself. Older: a price cap stops a passing round at its last step · a silence watchdog cuts a productive think ·
an unsealed root ends `-p` · images turn Mistral's cache off · the wrong key draws API credit · evening ≠ afternoon.

## End of session

This file rewritten for s6; the task file's §7; the README row; the field guide's measurements; memory
(`phase-112-your-own-nodegx.md`); commit by pathspec.
