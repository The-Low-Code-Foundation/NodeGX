# OWN-023 — the session that runs it (Opus 5.5)

> **s1 state (2026-10-19 ~18:35, Opus 5.5).** Rulings R1–R10 in (task §9.1: 3 arms, Bash on, **5** continues, $60,
> testers+scripts+Richard, each arm picks storage, judges outside, **builds tonight**, B's server warmed first (R9,
> P112-OWN023-COLDSERVER filed), wait for Richard's ffmpeg encodes (R10)). Step 0 ✅ (`checklist-outside.md`,
> `checklist-graded.md`), step 1 ✅ (`round-arm.mjs`, `audit-arm.mjs`, `judge.txt`, mock + 5 Haiku smokes, see
> `lab-notes.md`), step 2 ✅ (`harness/CLAUDE.md`, 8,805 B). `grade-url.mjs` built. **Step 3 running:**
> `run-arms.mjs` (background) in s1's scratchpad `98514a87-…/scratchpad/own023/rounds/{A,Aplus,B}`; progress in
> `rounds/chain.json`, `rounds/<arm>.log`, each arm's `arm.json`. The scratchpad is /private/tmp: copy each arm out
> (gallery) before a reboot. Next: gallery rows (A/A+ need their own dev server, by PORT), then Richard's three lines
> per app (C11) before any number, then graders.

**Written 2026-10-19 by Fable, who scoped it and ran nothing.** Say "Opus" in your first message. Read, in order: this
file; `../OWN-023-ONE-BRIEF-THREE-STRANGERS.md` (all of it; §2.1 the controls, §7 and §9 twice); `../own-018/round-claude.mjs`
and `peek-claude.mjs` (the Claude Code arm, the seal, the cost reading); `../own-019/gallery.mjs` (how an app is shown).
Then the memory index, lane 5. **Do not read `dev-docs/reviews/THE-MESSAGE-NODEGX-BESIDE-VIBE-CODING.md` until the
hats have written** (control C8): it argues for NodeGX, and your job is to measure.

## The stance

Richard: *"We must not be trying to PROVE that NodeGX is a good idea … approach this strange newbie repo we've
discovered called NodeGX and really evaluate if this might contain something we need more than just Claude Coding."*
Null hypothesis: Claude Code alone is enough. You run arms and assemble numbers. You don't conclude; hats, a stranger
writer and Richard do (C6, C7). Re-read §2.1 before each step. If you notice yourself wanting a round to come out a
particular way, write that down in `own-023/lab-notes.md` and carry on exactly as scripted.

## Before any round: the rulings

Ask Richard R1–R6 from the task file §9, in plain words, with the recommendations. Don't start a round on a guess.
If he's not there, build the plumbing (below) and the mock run, which need no ruling.

## The order of work

0. **The outside checklist** (C4): a fresh Opus 5.5 in a clean folder outside the repo, `hats/checklist-brief.md` and
   `brief.txt` only, no settings, no MCP. Save as `own-023/checklist-outside.md` unedited. Then write
   `own-023/checklist-graded.md`: the lines both lists have (reworded only to merge wording, never to add), and under a
   rule the lines only one list has, each marked `repo` or `outside`. Both sets are graded; they're reported apart.
1. **Plumbing, proven on a mock first** (OWN-020's zero-cost method): `round-arm.mjs` from `round-claude.mjs` with
   three modes (`--bare`, `--harness <file>`, `--nodegx <tgz-dir|registry>`), Bash on, the seal of task §4.1 (a round
   root, HOME inside it, reads and shells denied outside by rule, the path audit after), the relay (`Continue.` up to N,
   never reading output), `--model opus`, the cap. Prove with a scripted mock that: a run that ends with a question gets
   a `Continue.`; the Nth continue ends it; a path outside the root shows in the audit.
2. **The harness for A+**: a fresh Opus 5.5 (`claude -p`, no MCP, Bash off) given `hats/harness-brief.md`. Save its
   CLAUDE.md unedited as `own-023/harness/CLAUDE.md`, with its byte count beside the kit's files.
3. **The three builds, one day, daytime**, A then A+ then B. Each from an empty round root. Record per arm:
   `command.txt`, `agent.jsonl`, exit, API-equivalent $, wall time, turns, continues, the audit. Add each to the gallery
   under a letter (K, M, R, shuffled, the map kept in `own-023/arms.json` and shown to nobody until the hats).
4. **Grading**: `grade-url.mjs` (the scripted checks of task §5 over a URL: console errors, 390-px overflow on every
   route, reload persistence) on each; then two blind grader agents per app, outside the repo (`hats/README.md`'s
   setup), with `hats/grader.md` and `checklist-graded.md`. Disagreements to Richard. **Before Richard sees any
   number or hat**, give him the three URLs and nothing else, and ask for three lines per app in his words (C11);
   save them in the task file before anything else is shown to him.
5. **Follow-ups** F1–F4 (`followups/`), each a fresh stranger on a COPY of the arm's folder (the build stays as built),
   F3 with a real title and count from that app. F1's key search with OWN-015's method and its control. Re-grade after
   F1 and F2.
6. **The hats**: five fresh Opus 5.5 agents **outside the repo**, set up exactly as `hats/README.md` says, with the
   commissioning line from that file and nothing else from us. Save each verdict unedited in `own-023/verdicts/`.
7. **The table**: task §8 AC5's rows, every arm, each with its §7 prediction beside it, each kit defect B met as a
   cost in its row (C3) and filed `kit:` (memory: *every bug into the ledger*; file, don't fix mid-round). The C9
   asymmetry stated on every prompt-shaped row. Numbers only; no verdict sentence from you.
8. **The prose**: a fresh Opus 5.5 outside the repo with `hats/writeup-brief.md`, the table, the verdicts and
   Richard's before-and-after lines. Save unedited as `own-023/WRITEUP.md`.
9. **Richard's verdict**, his words, beside his three lines per app, in the task file. Only now read the message
   review, and write in it what the result changes.

## Traps already known

- `--allowedTools` pre-approves, it doesn't restrict; use `--disallowedTools` for what a clause depends on (memory).
- Opus has never run on the kit in this lab. A kit failure in B is a `kit:` bug and a row, not a reason to re-run B
  with a fix (that would be OWN-019's loop, and it would make B a different arm).
- `drive_page` has no file-input step (SP1 PLAN "Learned"); the checklist's line 1 allows a demo-file button beside a
  real picker for that reason. A/A+ with a real picker: the grader uses CDP's file chooser.
- The gallery copies an app with its backend's DB (SP1: ports rewritten so copies never collide with a live build).
  A and A+ may need a dev server per app; `gallery.mjs` only knows the NodeGX preview — add a `--serve <cmd>` or run
  them beside it, by PORT, never by name (memory: `pkill -f` kills a peer).
- The temptation that will come: B meets a kit defect, you know the fix, it's one line. Don't. File it, let B pay
  it, write it in the row. A re-run of B with a fix is a different arm and the comparison is gone (C3, C10).
- The other temptation: a brief or follow-up reads badly once an arm has run. Don't reword it for the next arm. Either
  re-run every arm with the fix or report the flaw (C10).
- Three Opus builds plus twelve follow-ups plus six graders plus five hats is a lot of subscription in one day. Watch
  the 5-hour window; the builds come first, the hats can wait a day.
- One heavy job at a time on this box (memory). The three builds run in sequence, not in parallel.

## What done looks like

AC1–AC6 of the task file: the table, the three apps in the gallery, the verdicts in `own-023/verdicts/`, `WRITEUP.md`
by a stranger with the answer in its first line (which may be "nothing"), Richard's verdict beside his first three
lines, and a NEXT-SESSION-PROMPT here saying what the message review and nodegx.io now have to change, in either
direction.
