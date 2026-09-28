# CG-005 — Olive in the game: the ask-Olive blocks, the fallbacks, the exam gate

**Opened 2026-09-27**, scoped from TPL-012 §2.4 and §2.6. **Status: ⬜ not started.** Depends on
CG-002 and CG-004. Lanes B+C. **Session 2 (2026-09-28, lane C): 🟡 AC1–AC6 and AC8 measured in the specs; AC7 and the page clauses prepared, drives pending — §7.**

## 1. The person sentence

> **A child drops an "ask Olive" block into her program, fills its slots from a picker, chooses the
> shape of the answer, and the robot uses what Olive says — and when Olive is slow, wrong or absent, the
> program still runs and the child can see which it was.**

## 2. What it is

- **The block family** (in CG-001's palette, CG-002's model): `ask Olive` with a *rung* (which
  template), *slots* (from the garden word list; one ≤40-character text slot in band 10–12), a *shape*
  (a word · a number · yes/no · one of […] · a list of 3 · a sentence · a card with fields · blocks), and a
  *dial* (same every time ↔ surprise me, i.e. temperature 0 / 0.8 / 1.2). The answer lands in the
  program's `Olive says` sensor and, for `blocks`, as a proposed block list the child accepts or edits.
- **The run**: an `ask Olive` step parks the interpreter, shows the owl "thinking" (dots, no clock), the
  world keeps animating, and resumes on the reply or the fallback. At most one Olive call in flight.
- **The voiced hint**: the hint table's chosen key is sent as a rung (`voice-hint`) with the key and the
  language as slots; the written line shows at once and is replaced by the voiced one if it arrives in
  time and passes the checks. Never the other way round.
- **The fallbacks**: no model, timeout, a refused output → the written line, marked in the owl row with
  a small "Olive is resting" so the child can tell.
- **The exam gate**: the rungs a machine failed in Olive's exam are not offered in the palette; the
  Skills page shows them as "Olive can't do this here yet".
- **The stub Olive** for drives: the relay route answered by a deterministic table keyed by rung and
  slots, so every page drive runs without a model and asserts the exact text.
- **Try Olive** on Grown-ups: a fixed list of example asks, run through the real route.

## 3. Acceptance criteria

1. Each shape produces a valid value through the real route (contract test in CG-004) and the interpreter
   consumes it: a number drives `repeat n`, yes/no drives `if Olive says yes`, one-of drives a branch,
   blocks become a proposed list the child must accept.
2. A parked run resumes on the reply; on a 12 s timeout it resumes with the fallback and the owl row says
   so; the world's animation never stalls (a drive samples the robot's transition mid-wait).
3. The voiced hint never replaces a written line with a different key, and a voiced line failing the
   blocklist is dropped silently in favour of the written one (a mutant stub returning a listed word
   proves it).
4. With the model absent the whole ladder's green rungs still run on written lines; the 🎓 rungs show
   the canned failing answer so the lesson survives without a model.
5. The exam gate withholds a rung the exam failed and offers it after a re-run that passes (drive with
   a stub whose exam answers are switchable).
6. The slot picker in band 7–9 offers only words from the request's list; band 10–12's text slot refuses
   the 41st character and a listed word inline, before anything is sent.
7. The dial: at "same every time" two runs give the same word; at "surprise me" three runs give at least
   two different words (real route, contract test).
8. Every Olive rung has EN and FR templates and the exam covers both languages.

## 4. How to build it

- The rung table (template, slots, shape, temperature, must-contain, written answer; the exam's probes sit in
  `exam.js`) is one data file, `garden-desktop/shell/olive-templates.json` (this line named it
  `olive/rungs.json` before CG-004 built it), read by the shell (prompts) and by the generator (the palette
  and the Skills page, through `cg005Olive.ts`), so the two cannot drift.
- Precedent for the async step: TPL-010's coach route; for the parked run: the interpreter's `ask` step
  in CG-002.

## 5. Gates

`tests/cg005Olive.test.ts` over the interpreter with a fake reply source (AC1, AC2, AC4, AC5);
`drive-cg005-olive.js` on the pages with the stub (AC3, AC6); the contract test (AC1, AC7) in CG-004.

## 6. Traps

A `.catch()` misses a synchronous throw (the route handler); a window opened after the event attributes
nothing (arm the drive's listener before the press); a self-healing defect is invisible to every arm that
completes — add the abandoned arm (a reply arriving after the run was reset must be dropped).

## 7. Session 2 — what was built (lane C, worktree `cg005-olive`, 2026-09-28)

**Built.** Page side, `packages/noodl-mcp/tests/`: `cg005Olive.ts` (new) — the rung table read from the shell, the four
Olive scripts as `OLIVE_SCRIPTS` (`Logic/Ask Olive` async, the one script with `fetch`; `Logic/Olive slots`;
`Logic/Owl row`; `Logic/Accept proposal`), `OLIVE_WORDS` (38 keys EN+FR), `OLIVE_HELPERS` (the shell's own
`checkSlots`/`blocked`/`writtenAnswer` embedded by SOURCE, so page and shell cannot drift); `cg002Scripts.ts` — the
`ask` step takes a kit-shaped block (`t: 'ask:<rung>'`, flat string slots; no dial → the rung's own temperature), a run
carries `runId` and drops a reply stamped with another run, a `blocks` answer becomes `run.proposal` / `delta.proposal`
and is never spliced, `PALETTE_SCRIPT` gains the rung entries and the exam gate (`rungs`, `exam`, `narrow` in;
`olive`, `offered`, `withheld`, `heldHere` out), `GOAL_SCRIPT` gains `senses` (lane B's finding 2); `cg005Olive.test.ts`
(new). Shell side, `garden-desktop/shell/`: `olive-stub.js` (new: the stub Olive — deterministic by rung + slots,
switchable exam verdicts per rung, a mutant mode, `hang`, and `serve` for page drives with `POST /__stub/set` and
`GET /__stub/calls`; `GARDEN_OLIVE_STUB=1|mutant` in `main.js` for an Electron drive), `olive-written.js` (new),
`olive-templates.json` (+ `written` for 14 rungs × 2 languages, `band: 2` on rungs 8 and 10, `flower_names` as band
7–9's poem picker), `exam.js` (12 EN probes, a recorded probe on a 🎓 rung graded the 🎓 way, `withheldRungs`, lane B's
`lacks`/`containsAll` kinds), `olive-check.js` / `owl.js` (the rung and slot values ride to the engine for the stub),
`tests/olive-stub.test.js` (new); `garden-desktop/tests/olive-contract.mjs` (+ AC7, EN and FR). Prepared:
`scripts/devtools/drive-cg005-olive.js`.

| AC | Status | Instrument and reading |
|---|---|---|
| 1 shapes consumed | ✅ measured | `npx jest tests/cg005Olive.test.ts` through the real script, `fetch`, relay, route and stub: number → `repeat` walks 6 (the stub's 6 for 4 tulips); yes/no → `oui` walks 1, `non` 0, EN `yes` 1; one-of → `croquettes` x=2, `lettre` turns left, EN `kibble`; blocks → `proposal {askId:1, blocks:[fwd,left,water]}`, 0 turns / 0 splashes run, program length unchanged; "Use them" inserts ids 3–5 after the ask and the re-run ends at (1,2) with 1 puddle. The real model's shapes: CG-004's contract test (19/20). |
| 2 timeout, resting | ✅ measured (spec) / 🟡 world animation prepared | page timeout = `garden.json` `olive.timeoutMs` 12 000 (asserted equal); a hung stub with the page limit at 80 ms → `{fallback, reason:'timeout', value:6}` ≥ 75 ms, the step resumes, owl row `thinking` "Olive réfléchit" while parked, then `resting` "Olive se repose" / "Olive is resting"; the shell's own timeout (60 ms), no shell (`no-shell`, a sync throw too) and a 503 all fall back with the written answer. **Abandoned arm:** two runs both parked on seq 1; run A's late reply `{seq:1, run:A}` leaves run B waiting (tick 0, no answer); B's own resumes. The sprite still moving while parked: `drive-cg005-olive.js pages` P-AC2. |
| 3 voiced hint | ✅ measured (spec + route drive) | a voiced line for `hintWet` shown for `hintWet` only: for `hintBump` and for the other language the written line stays; the mutant stub through the real route → `{fallback, reason:'blocklist'}`, row = written, `resting` false (silent); a listed word that reached the page anyway (an older shell) is dropped by the row's own blocklist. `drive-cg005-olive.js route`: **4/4 PASS** (run in the lane, plain node). |
| 4 no model | ✅ measured | 18 asserted exam probes graded against the written answers by the exam's own `meetsOne`: every ✅ met, every 🎓 not met; no model through the route: 14 rungs × 2 languages → `no-model` + the written value/text, 0 engine calls; "three squares" → proposal `[fwd]`, 4 tulips → walks 6, "red tulip a flower" → walks 1, row resting. |
| 5 exam gate | ✅ measured | exam through the doors with `words-to-blocks` switched to fail → palette `withheld [under-five-words, words-to-blocks]`, 12 offered, no `ask:words-to-blocks`; `engine.set` pass + re-run on the same doors → offered, `status.exam.at` changed. No results → nothing withheld (14 in band 10–12, 11 in band 7–9). Page clause P-AC5 prepared. |
| 6 slots before sending | ✅ measured (spec + route drive) / 🟡 page prepared | band 7–9: options exactly the request's narrowed words, no text field on any of the 14 rungs, a typed poem name → `no-typing`, rung 8 → `not-in-band`; band 10–12: `max 40`, 40 chars ok, 41 → `too-long` "Trop long : 40 lettres au plus.", `stupide` / `Crap` → `blocklist`; four refused asks → `sent:false`, 0 fetches, 0 stub calls, then a valid one sent once. The embedded `checkSlots` equals the shell's on 11 cases. |
| 7 the dial | 🟡 prepared | `olive-contract.mjs` now asserts, FR and EN, two runs at 0 identical and three at 1.2 ≥ 2 names; not run (real model). The stub's dial: 1 name at 0, 3 at 1.2, both languages (`olive-stub.test.js`). |
| 8 EN and FR | ✅ measured | every rung: prompt, written answer (not voice-hint), stub answer and ≥1 exam probe in each language (the 12 EN probes are RECORDED, one sample each, until a contract run says what she does in English); every palette rung's title and slot label in `OLIVE_WORDS`, none colliding with CG-002's keys. |

**Numbers.** `cg005Olive.test.ts` **25/25** (0.8 s); `cg002Engine.test.ts` **97/97** after the engine edits; shell
`node --test tests/*.test.js` **68/68** (59 + 9). **Arms 12/12 killed** (`scratchpad/laneC/mut-summary.txt`): run-id
check dropped, proposal auto-applied, owl row ignores the key, owl row skips its blocklist, client sends before
validating, palette ignores the exam, exam grades a recorded 🎓 probe by `met`, slots ignore the band, a 🎓 canned answer
made right (4 red), the client timeout never fires, `lacks` removed, `senses` always met — restored after each, suites
green after. The stub exam: 61 calls, 20/20 asserted as the ladder says, only rung 9 withheld.

**Found and fixed here.** 🔴 `exam.js` graded a RECORDED probe `pass = met` on every rung, so rung 9 ("under 5 words"),
which she obeys, came out PASS and would have been OFFERED — CG-004 §7 said the gate withholds it; it did not. The
ladder now comes from the rung table. CG-002's ask step sent `slots` as a list and a fixed `temperature: 0`; the route
wants an object and the rung's own temperature — both fixed without changing CG-002's pinned rows (97/97).

**Contract changes (merge hazards).** Additive only: a block `t` may be `ask:<rung>`; the run gains `runId`, `proposal`,
`sensed`; a Step output `proposal`; New run input/output `runId`; Palette inputs `rungs`/`exam`/`narrow` and outputs
`olive`/`offered`/`withheld`/`heldHere`; the answer may carry `run` (dropped when it names another run) and `reason`;
`compose()` returns `rung` and `values`; `garden-desktop/shell/package.json` line 29 (`build.files`) adds
`olive-stub.js`, `olive-written.js`. The generator (CG-003) must spread **`OLIVE_SCRIPTS`** beside `FUNCTION_SCRIPTS`
(kept out of it: `Ask Olive` calls `fetch`, CG-002 AC6) and **`OLIVE_WORDS`** into the word table.

**Residuals.**
- AC7 on the real model, and the EN twins' readings: `drive-laneC.sh contract` / `contract-cpu`. Owner: orchestrator.
- Page clauses P-AC2/3/5/6: `drive-laneC.sh pages` on CG-003's deploy. Needs from CG-003 (lane A): the request's `rungs`
  into `Logic/Palette`, `[data-owl-row]` fed by `Logic/Owl row`, `Logic/Olive slots`' `message` shown beside the picker,
  a second `Ask Olive` for `voiceRequest`, the "Use them / No thanks" card on `Step.proposal`. Owner: CG-003.
- The kit: `BlockList` shows no inline slot error (the page must, or the kit takes a `SlotErrors` port) and inserts an
  `ask:<rung>` block with no slots (the picker fills them). Owner: CG-003 / lane A (the kit is theirs).
- Lane B: the eggs request's goal needs `{ name: 'senses', args: ['count_is', 1] }` and `'senses'` in the goal-name union
  (`cg002Content.ts`). The shell's `hints` (7 keys, voiced) are a second copy of CG-002's hint lines and can drift.
  Owner: CG-006.
- Rung 9's rule and the EN thank-you must-contain stay Richard's rulings (unchanged; the stub's default mirrors the
  readout, so rung 9 is withheld). The first-launch exam grows by 12 single samples (~1 min on the tablet). Owner: CG-008.
