# OWN-019 — the s4 sprint: the series that decides the claim

**Written 2026-10-14 07:50 CEST by Fable 5.1, from Richard's rulings that morning (R33–R35 below).** Read, in order:
this file; `VIBE-AND-LARGE4.md` (the field guide — its optimisation summary first); `../OWN-019-THE-VIBE-KIT.md` §6–§7
from "s3" on; the P112 README's R30–R35. Say "Opus" in your first message (the task's Model line).

**Model:** Opus. Agent under test: Mistral Large 4 (`mistral-large-4`, pinned) in Vibe 2.26.1 (the latest release,
checked 2026-10-14 against PyPI), on the Vibe Code subscription key (`MISTRAL_VIBE_API_KEY` in the repo `.env`), on
the legacy harness (the unified one hides the server's error text — upstream #1227, open).

**Run rounds in the daytime (before ~18:00 CEST) and write the hour on every result.** On 2026-10-13 Large 4 thought at
130–260 chars/s until 18:30 and ~50 after 20:00, with the cache at 9–41% (afternoon 60–76%) and two dropped streams.
Richard reads the evening slowness as launch traffic ("an 'at the moment' issue") and can live with cache misses; the
sprint records them and does not try to fix them.

## The sprint's aim, in one sentence

Finish our own rounds and experiments so that Richard can say — or not — **"Yes, Mistral Large 4 in Vibe is a great
way to build NodeGX apps, for €20 a month"** — and then, only after we are done, Richard opens Vibe himself and
builds one of the test apps in his own words (R35), and we compare.

## The rulings of 2026-10-14 (Richard, with Fable)

- **R33 — no fork.** Vibe is Apache-2.0 and both harnesses are public (the Rust core under `harness/core`), so a fork
  is possible; it is not worth it now: it would win little on cost (the model's thinking is the cost; editing history
  breaks Mistral's prefix cache), a little on reliability (3 of ~24 rounds: two dropped streams, one loop), and
  compatibility only once legacy is gone. The trigger that reopens it: **Mistral removes the legacy harness before
  fixing #1227 (error text) and #1240 (tools/list_changed)** — then stock Vibe can no longer run the kit. Until then:
  everything short of a fork is allowed — *"carte blanche on doing anything short of forking Vibe, and I'm happy to
  keep pushing a Mistral specific integration with our MCP."*
- **R34 — no Fable audit (AC8 as written is dropped).** *"I'm not sure we need a Fable review, this one is already
  pretty good."* The field guide is the audit; it keeps growing. AC8 is now the claim write-up (below).
- **R35 — the series, then Richard's own run, last.** Three or more briefs, each run three times, on one kit, while the
  integration keeps being tuned; and *"the final final test will be me opening Vibe and trying to build one of our
  test apps in my own words and I'll let you compare, but only after you've finished your own rounds and
  experiments."*

## What "yes, €20 a month" has to mean — four proofs

1. **It passes repeatedly:** three in a row on every brief, 12/12 or the brief's full count, `carryover` clean,
   finished by itself, no intervention. Pack It has it (pk2–pk4, s2). The quiz does not yet (AC4).
2. **On more than two kinds of app:** quiz = timing and logic; Pack It = data and storage; **Launch** (new, below) =
   look, forms, a faked network call, logic, storage. A fourth brief with more moving parts only if the third passes.
3. **The money is measured, not inferred.** Vibe's `cost_usd` is the real cost at list prices (verified s3; the launch
   sale halves it until ~2026-10-20). Nobody has yet read the subscription's own allowance before and after a round
   (no API for it, #1161) — **that reading is Richard's, in the Mistral console**. Ask him at round boundaries: one
   number before, one after; the round table gets an "allowance Δ" column. From that: apps per month.
4. **A person gets it, not the lab:** R35's run. Interactive Vibe never adds the headless "single pass" line
   (`system_prompt.py`, `-p` only), so the lab is harsher than real use on process-following.

## Where things are

- **The kit: tgz27** = R32's one-session taught kit (`23f96461e`; MCP at `f419f035c`; preview = tgz12's). A copy
  survives at `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/f0f280e3-b7ca-4f0d-986d-628ba0d5ccab/scratchpad/v/tgz27/`
  (checked 2026-10-14 07:40: the three tarballs are there; no commit has touched `packages/create-nodegx` or
  `packages/noodl-mcp/src` since). **Copy it into your own scratchpad first** — that folder belongs to a finished
  session and can vanish. If it is gone: create-nodegx is a plain `npm pack ./packages/create-nodegx` (relative path);
  the MCP from the `own018-s3-pack` worktree (still listed by `git worktree list`, at `f419f035c`) — replace its
  linked `packages/noodl-mcp/dist/*` with a real empty folder before `npm pack` (it points at the primary's build
  output and packing writes through it); preview from any earlier tgz folder. A new kit after a lever = tgz28, 29 …
- **The lab (`own-018/`):** `round-kit.mjs <root> <tgz-dir> <prompt-file> --kit vibe [--max-price N] [--stall-min N]
  [--sittings N --max-total $] [--record] [--temperature T] [--thinking high|low]`; `record-proxy.mjs --compare`;
  `peek.mjs`; `round-claude.mjs` (the Sonnet yardstick, API-equivalent cost, not money). `own-019/anatomy.mjs
  <root>…` (where time and tokens went; `--timeline`).
- **Graders:** `own-018/grade-quiz.mjs` (+ `mutate-quiz.mjs`), `own-019/grade-pack.mjs` (+ `mutate-pack.mjs`); both
  `<round-root> --tgz <tgz-dir>`, headless Chrome over the PACKED preview at phone size, reading only what a person sees.
- **Briefs:** `own-018/sentence-quiz.txt`, `own-019/sentence-pack.txt`, **`own-019/sentence-launch.txt` (new, Fable,
  2026-10-14 — read it before writing its grader; the agent never sees our files, so the brief's wording is the
  contract).**
- **Nothing running** at 07:31: no proxies on 8795/8796, no Vibe processes. q6 and o1 are read and recorded (s3).
- The field guide's "untried levers" (§7 of its summary) and E (open questions) are the lever list.

## The series — the rules that make nine rounds comparable

- **One kit for the whole series.** The claim is made on one kit version. Lever rounds run **between** series, never
  inside one; a lever adopted means a new tgz, and every brief that has not yet passed ×3 **on that tgz** runs again.
  (AC5 stands from s2 on tgz17–19; on the final kit Pack It gets one regression round, not three, unless it fails.)
- **Daytime, hour recorded, `--record` on every round** (the recorder is cheap and settles cache questions).
  `--max-price 10 --stall-min 45` for one-session rounds (v10 was stopped at $6 by the lab at its last step; o1 by a
  30-min watchdog mid-think at evening speed — both lab faults, not model failures).
- **Side by side at most two rounds** (ONE HEAVY JOB; the model side is Mistral's, but renders and drives are local).
- **Per round, in the table:** brief, kit, grade, how it ended (itself / lab / stall), minutes, hour started, Vibe $,
  cached %, tool calls, drives, longest think (KB, min), hook firings, **allowance Δ** when Richard read it, what it
  taught. `anatomy.mjs` on every round.
- **Every real miss → `dev-docs/bugs/` as found** (`node scripts/bugs.js`), kit lesson or runtime defect; every kit
  lesson for every agent unless it only suits one (the core first, the Vibe profile where Claude's words don't fit).
- **A grader's red is read before it is believed** — s2's first reads were 5/12 and 2/12 for grader faults
  (coordinates read before a line mounted; typing that moves a button). The brief's screens go in front of Richard
  (look verdicts are his): `render_report` or the grader's screenshots, phone and laptop, per round.

## Do, in order

1. **o2 — the quiz on tgz27 (one session, taught), daytime, `--record`, `--max-price 10 --stall-min 45`.** The first
   quiz-series round and the daytime answer to the s3 question (o1 designed the whole app in a 171 KB / 30-min think
   at evening speed and the watchdog cut it). Grade (`grade-quiz.mjs`), `anatomy.mjs`, hour, allowance Δ. If it
   passes: R32 holds, the series goes on. If it stalls in a whole-app think again at daytime speed: that is R32's
   cost measured — put the numbers (one session vs q6's sittings: time, $, grade) to Richard in plain words and let
   him rule before round 2.
2. **Brief 3 "Launch" — the grader before any round.** `own-019/grade-launch.mjs` from the brief's words, same lab
   rules as `grade-pack.mjs` (CDP presses at the element's centre, text read off SHOWN leaves, every press re-reads
   its target, settle after typing). Checks, one per sentence in the brief: `hero` (name, headline, pitch, the Join
   button); `scroll` (pressing it brings the form into the viewport); `features` (the three titles, each with two
   sentences); `pricing` (Monthly "€6 a month"; Yearly "€60 a year" and "Two months free"; toggling back); `faq`
   (tap Q2 opens it; tap Q3 opens it and closes Q2); `refuse` (empty name, then "ada@nowhere": "Please check your
   name and email", nothing sent); `sending` ("Sending…" shown within the second — a timed read, as CARRYOVER's);
   `joined` ("You're in, Ada — we'll write to ada@example.com"); `fail` ("bob@fail.test": "Something went wrong —
   please try again", and the fields still hold Bob / bob@fail.test); `reload` ("You're on the list, Ada" where the
   form was); `notyou` (the link brings the empty form back); and the **look** checks, measured not judged: `font`
   (body font-family is not the browser default / the preview's fallback), `palette` (≥3 distinct non-grey colours in
   use on backgrounds or text), `scale` (≥3 distinct font sizes), `contrast` (body text ≥ 4.5:1 on its background),
   `phone` (no horizontal overflow at 390 wide), `laptop` (the layout differs at 1280 — e.g. the features are not one
   column). **Prove it on a yardstick** (Sonnet via `round-claude.mjs`, core kit) and on mutants
   (`mutate-launch.mjs`, ≥10: nofont, nopalette, noscroll, notoggle, nofaq-close, novalidate, nosending, nofail,
   nokeep, nopersist, nonotyou) — each mutant fails exactly its declared checks, the control none. Only then L1.
3. **The series:** quiz ×3 (o2 counts if it passed), Launch ×3, Pack It ×1 on the final kit. Two side by side at most.
   After each Launch round: its phone and laptop screenshots to Richard — *"I'd like to see it have a style challenge
   and see what different creations it comes up with."* Three different looks is part of the result.
4. **Levers, one per round, between series** (each kept only if it measures better on grade, own-report vs grader,
   $, cache, time, interventions): `system_prompt_id` (a `.vibe/prompts/<name>.md` replaces Vibe's base prompt —
   drops the headless "single pass" line; measure what else it drops); `auto_compact_threshold` ≈118k (the kit
   declares a 1M window, so a long session never compacts; Large 4 may really serve 524k); a `post_agent` deny hook
   ("no `# Done` while a checklist line is unproven" — mechanism verified at `_loop.py:2214`, 3 retries per turn);
   the recorder retrying a dropped stream (`incomplete_stream` ended q1 and q2) and flagging a looping think (a loop
   repeats its 8-word phrases ~100%, a productive think ~1%) — both in the proxy, nothing in Vibe; temperature 0.2
   over more than one round (v7 was 12/12 with carryover and ~3 drives — inconclusive).
5. **The Mistral-specific integration, as the rounds show it:** after each round, mine the thinks for questions the
   notes don't answer (s3's `mine/` method: cluster the question sentences, read the ground truth in the runtime,
   answer in the node's notes — For Each got four that way); anything Large 4 reaches for and doesn't find
   (`describe` probes, invented names, reads of the runtime's source) is a candidate line in the MCP's Vibe profile
   or the kit's guides. Carte blanche here (R33).
6. **A fourth brief** only if Launch passes ×3: more moving parts — a multi-step flow whose state must survive going
   back, or a list with sorting, filtering and computed totals over Static Data.
7. **The claim write-up (AC8, reworded):** the round table, the four proofs with their numbers, the three Launch looks
   side by side, the open defects, the levers kept and dropped, the fork trigger — in plain words, for Richard to
   rule *yes* or *no*. Then **R35:** Richard runs `npm create nodegx-vibe` (from the final tgz), opens Vibe
   interactively, picks one of the three briefs and asks for it **in his own words**; we grade his app with that
   brief's grader, read his session with `anatomy.mjs`, and compare with the lab's rounds (his wording vs the brief,
   his interventions, time, $). AC6 closes on his words.

## The lab's own traps (every one has already cost a round)

A price cap on Vibe's count stops a passing round at its last step (v10) · a silence watchdog shorter than a productive
think cuts it off, and the right length depends on Mistral's speed that hour (v4, v8, o1) · an unsealed root turns a
stray read or write into an "ask" that ends `-p` (v5, v6) · a reply with no tool call ends `-p` (v1b) · any image in a
request turns Mistral's cache off (IMAGECACHE; the server runs `--screenshots-to-files`) · the wrong key draws on API
credit, not the plan (v1) · an evening round is not comparable with an afternoon one.

## End of session

The handoff (this file, rewritten), the task file's §7 and tables, the README row, the field guide's new measurements
in their sections, memory (`phase-112-your-own-nodegx.md` + any new trap as its own file with a MEMORY.md pointer),
commit by pathspec.
