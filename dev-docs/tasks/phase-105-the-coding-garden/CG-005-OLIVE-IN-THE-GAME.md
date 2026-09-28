# CG-005 — Olive in the game: the ask-Olive blocks, the fallbacks, the exam gate

**Opened 2026-09-27**, scoped from TPL-012 §2.4 and §2.6. **Status: 🟢 session 3 (2026-09-28) — the page hooks built and driven: Olive page drive 16/16 (0 skip) on the primary; a voiced hint must still be the hint (`unfaithful`); the kit keeps a picked option whole; contract test 31/31 CPU, 30/31 Metal (P21 poem, variance — the exam withholds it).** Depends on
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
| 7 the dial | ✅ measured s2 on the real model, Metal and CPU (§7.1) · was 🟡 prepared | `olive-contract.mjs` now asserts, FR and EN, two runs at 0 identical and three at 1.2 ≥ 2 names; not run (real model). The stub's dial: 1 name at 0, 3 at 1.2, both languages (`olive-stub.test.js`). |
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

### 7.1 The orchestrator's runs on the merged tree (primary checkout, 2026-09-28 07:14–07:21, `af343f439`)

- **Gates:** `cg005Olive` + `cg002Engine` + `cg006Requests` **212/212** after the lane B/C reconciliation (`af343f439`:
  the EN probes P24–P34 claimed by their rungs; lane B's red pin on `lacks`/`containsAll` flipped green; the eggs goal
  needs `senses count_is` — the no-sensor program measured `met: false, missing: ["senses"]`). Shell `node --test` **69/69**.
- **Route drive** (`drive-laneC.sh route`, plain node, the stub): **4/4 PASS** — R-AC2 a hung rung falls back in 1.5–4 s,
  R-AC3 the mutant's blocklisted line refused, R-AC5 withheld then offered after a passing re-run, R-AC6 41 chars and a
  listed word refused with nothing reaching the model.
- **AC7, the dial, real model — ✅ both paths.** Metal: FR "same every time" `["Pipette","Pipette"]`, "surprise me"
  `["Follette","Folie","Olivette"]`; EN `["Pip","Pip"]` / `["Daisy","Tulipan","petal"]`. CPU: FR `["Pipette","Pipette"]` /
  `["Pipotus","Ella","⟂ cap"]`; EN `["Pip","Pip"]` / `["Mignon","Ela","Ela"]`.
- **The contract test, exit 1 on both paths, 19/20 asserted** — the same shape as session 1 (the red moves): Metal red on
  **P15** maths-seeds (2+3 answered `[3,3]`; it was 5 on CPU and in s1); CPU red on **P02** the EN thank-you must-contain
  (Richard's open ruling; CG-006 §7.1 measured candidate B, no must-contain for EN, at 3/3). Exam 36.8 s Metal / 48.3 s
  CPU with the EN twins (`probes per language {"fr":20,"en":15}`); per probe 339–2523 / 503–3757 ms. P17
  (under-five-words) is now `record`, not asserted, so it no longer pretends to be a 🎓 she fails.
- **Owed:** the page clauses P-AC2/3/5/6 (`drive-laneC.sh pages`, `DEPLOY=`) wait for CG-003's hooks — the palette fed
  the request's `rungs`, `[data-owl-row]`, the slot message, a second Ask Olive for the voiced hint, the "Use them / No
  thanks" card.


## 8. Session 3 — what was built (lane HOOKS, worktree `cg-s3-hooks`, base `b16751f28`, 2026-09-28)

The page hooks §7.1 said were owed, so the page clauses can read PASS instead of SKIP (s2: 1 PASS, 4 SKIP). Files:
`packages/noodl-mcp/tests/` `cg005Olive.ts` (+`Logic/Voice hint`, `Logic/Proposal card`; Owl row, Olive slots changed),
`cg003Components.ts` (Workshop/Play hooks, `Skills/Olive line`), `cg003Scripts.ts` (+`Logic/Olive held`; Olive status
hands on `exam`; free play `rungs: 'all'`), `cg002Content.ts` (`rungs` on six requests — nothing else), `cg007Look.ts`
(four rules), the two specs; `scripts/devtools/drive-cg005-olive.js` (page part rewritten); `drives/drive-olive.sh`.

| Hook (§7.1 owed) | Status | Instrument and reading |
|---|---|---|
| 1 the palette fed the request's `rungs` — ruling 4 | ✅ spec + graph · 🟡 page | Six band 10–12 requests name their rungs (Biscuit's bowl: what-wants, is-it-a; Sami's letter: say-thanks, translate, letter; the wall: words-to-blocks, count-in-words; the meow: narrate-run; the eggs: count-tulips, maths-seeds, maths; the rows: name-one, name-three, name-trick, explain-program — each rung with the islander §3 frames it with and the trick it fits); free play offers `'all'`; the four band 7–9 requests none. Spec "ruling 4 on the requests": every named rung is a band-2 table rung on a band-2 request; Palette offers exactly them at 10–12 and `[]` at 7–9; free play 20 at 10–12, 0 at 7–9. Graph: `Start world.rungs → Palette.rungs` and a new `Olive status.exam → Palette.exam` (the exam gate was never fed on the page: AC5's page half had no input). **Content choice, not a ruling**: which request carries which rung is one array each in `cg002Content.ts` (CG-006 may move them). |
| 2 the owl row the drive finds | ✅ | One source of truth: the page's classes. The drive reads `.bg-owl-say` (the line) and `.bg-owl` (the row with its tags); the gate pins both classes and the owl column's order. No `data-` attribute added (a node cannot write one). |
| 3 the slot refusal beside the picker (AC6) | ✅ spec + graph · 🟡 page | `Logic/Olive slots` now takes the PROGRAM (and the kit's selected id): it judges the ask block the child is on, else the first one that would be refused; `show`, `blockId` out. `.bg-slot-msg` under the block list: "Fill in every slot first." on a new ask block, "Olive can’t use that word." / "Olive ne peut pas utiliser ce mot.", "Too long: 40 letters at most." — words already in `OLIVE_WORDS`, EN+FR. Nothing new is sent: Ask Olive already refused before sending (s2). |
| 4 the voiced hint, a second Ask Olive | ✅ spec (real route) + graph · 🟡 page | Owl row → `voiceSig` (the line as text: key, numbers, robot, language) → `Logic/Voice hint` (reads ONLY that text, so the answer can never re-ask) → a second `Logic/Ask Olive` → Owl row `voiced`. The row shows the voicing only if its `seq` is THIS line's signature (a late "1 of 3" is dropped when the row says "2 of 3"), clean, and still the hint: the page mirrors the shell's new `unfaithful` rule (question kept, the kid's robot named, no markdown). Through the real route: clean → "Hou hou ! …" shown; mutant → written, silent; the two real unfaithful replies of 2026-09-28 (FR markdown, EN no question) → route `unfaithful` → written, silent, both languages. |
| 5 "Use them / No thanks" on `Step.proposal` (AC1) | ✅ spec + graph · 🟡 page | `Logic/Proposal card` reads the RUN (`run.proposal`: Step publishes `proposal` on one tick only, so the Runner's output could not hold a card), shows while the ask is still in the program and the child has not answered (signature = run + ask + blocks). "Use them" → `Accept proposal.go` (its only trigger, gated) → the program; its `ran` then marks it answered; "No thanks" marks it answered. A new run proposes again; Start over hides it. The card sits in the owl's column (Olive is speaking), so at 390 it never pushes Play or the owl's top. |
| 6 thinking / resting tags | ✅ spec + graph · 🟡 page | Two tags in the owl column, violet ink on violet-2 (a new contrast pair, 7.84:1; the slot line coral on white, 4.61): "Olive is thinking" with three dots that fill (no clock; reduced motion stills them) while a run is parked OR the line's voicing is out (TPL-012: on the tablet a hint takes 5–10 s); "Olive is resting" when nothing is out and the program's last answer was a fallback of a question that was SENT (a slot the rules refused is not Olive resting; the slot line says why). |
| 7 (for P-AC5) Skills says it | ✅ spec + graph · 🟡 page | `Skills/Olive line` on Skills: "Olive can’t do this here yet: words into blocks" from the status door's exam, band 10–12 only, nothing when nothing failed. The status door now hands `exam` on (it read only the counts). |

**Numbers.** `cg005Olive` **33/33** (26 → 33), `cg003Template` **79/79** (69 → 79: 8 graph rows, 2 glue rows; two contrast
pairs added, lowest still 4.61), `cg002Engine` 115/115 and `cg006Requests` 84/84 unchanged (232/232 with Olive).
`npm run template:garden` exit 0 (engine pre-step green), 78 components (74 + 4), warnings `uncollapsible-multi-column` ×4
as before; pages ≤ 32 nodes. Route drive (`drive-cg005-olive.js route`, plain node): **4/4 PASS** after the change. In the
lane the generator and the gate ran with `NODEGX_KIT_EXTRACT=<primary>/packages/noodl-mcp/dist/kit-extract.cjs` and a
`--require` resolving `@nodegx/export` to its source; neither is needed on the primary.

**Arms 16/16 killed** (`p105-s3-scratch/hooks/arms.py`, `arms.txt`: file copied to scratch, one anchor mutated, the one
spec row run, the file copied back and `cmp`-checked): the row takes any answer (seq ignored); the mirror forgets the
question; the signature carries the answer (it would ask again); no thinking while the voicing is out; a refused slot
reads as resting; the card ignores the child's answer; the card outlives Start over; the slot line ignores the program; a
band 7–9 request carries a rung; the palette not told the exam; Voice hint fed the request object (it would loop); the
blocks go in when the run ends, not on Use them; the slot line never shows; Skills tells band 7–9; the status door drops
the exam; free play offers no rung.

**Found on the way.** 🔴 The exam gate had no input on the page: `Logic/Palette` takes `exam`, but nothing on the
Workshop fed it (only Grown-ups asked the status door, for the counts), so a rung the exam failed would have been offered —
P-AC5 could never have passed. 🔴 `Step.proposal` is a one-tick output (`delta.proposal`); a card fed from the Runner's
`proposal` would have vanished 420 ms after it appeared — the card reads `run.proposal`. 🟡 s2's P-AC2 asked for "the
robot's transition mid-wait": unreachable by construction (a park comes a tick, 420 ms, after the last move; the glide is
380 ms). The clause now measures the page alive while parked (the robot moved first, animation frames, the dots advancing).

**Prepared, not run** (the orchestrator, primary checkout, one heavy job; `$SCRATCH/hooks/EXPECTED-DRIVE.md`):
`OUT=<pages-out> zsh …/drives/drive-pages.sh` (makes `<pages-out>/deploy`), then
`DEPLOY=<pages-out>/deploy zsh …/drives/drive-olive.sh pages` → `{"pass":16,"fail":0,"skip":0}`, exit 0: P-AC6 ×4, P-AC1 ×3,
P-AC3 ×2, P-AC2 ×2, P-AC5, P-390, P-S3-R5, the setup line, 0 console errors. The page part now makes a band 10–12 player
and enters free play from the island (s2's `--workshop` reload landed on the island: AC8); `--workshop/--skills` are gone.
The main page drive keeps every finder (0 of its classes missing from the generated template); its in-Chrome stub answers
the new voicing POSTs with a line the page's own faithful rule refuses for all seven voiced keys, so its owl reads are
the written lines, as at base.

**Contract changes (merge hazards).** Additive: Owl row out `voiceSig`, `voiceRequest.seq`; Olive slots in `program`,
`selected`, out `show`, `blockId`; Olive status out `exam`; new `Logic/Voice hint` (in `sig`; out `request`, `due`),
`Logic/Proposal card` (in `run`, `program`, `handled`, `words`, `lang`; out `show`, `proposal`, `blocksText`, `sig`),
`Logic/Olive held` (in `exam`, `band`, `lang`, `words`, `botName`; out `held`, `show`, `text`), `Skills/Olive line`; a
`GardenRequest.rungs?`; `FREE_PLAY.rungs = 'all'`; a Variable `gardenProposalDone`. Changed meaning: the owl's `thinking`
is now "a question is out" (parked OR voicing), `resting` needs nothing out and a SENT question. `templates/bot-garden/**`
regenerated in the lane and left uncommitted.

**Residuals.**
- The page drive above, and its screenshots (`ac1-proposal`, `ac2-resting`, `ac5-skills`, `workshop-free-390`). Owner: orchestrator.
- The voicing POSTs on every new hint line even where no shell answers (a plain web deploy, the editor's preview): each is
  a 404 → the written line; harmless, but noisy in a console. Gate it on the status door's `running` if a web build ever
  ships. Owner: NONE this phase (the game ships in the shell).
- `Logic/Choose hint` still is not fed `oliveRung` / `oliveFallback` (the rung's lesson line and the hint `oliveResting`
  after an ask): the tags carry "resting" now; the after-run lesson line is not on the page. Owner: CG-003 / CG-006.
- The Skills page shows only what the exam withheld; the eighteen rungs as Skills cards (CG-006 §8 residual) are not built. Owner: CG-003.
- Which request carries which rung is a content choice made here; Richard or CG-006 may move any (one array each). Owner: CG-006.

### 8.1 The page drive, run: 14/17 on the primary, three reds, and 16/16 after (lane HOOKS, 2026-09-28)

The orchestrator's first run of `drive-olive.sh pages` (primary, `e0939f9cd`) read 14 PASS, 3 FAIL, and the wrapper exited 0
over a `pages.exit` of 1. Each red, from its evidence:

1. **P-AC2 "parked" (`stillParked: false`) and 2. P-AC2 "resting" absent (the owl said "Pip did 0 of 3") — 🔴 PRODUCT,
   one defect.** The screenshot showed the count-tulips block holding "tulip, tulip, rose, tulip, daisy, tulip," and the
   slot line "Pick a word from the list.": the KIT cut every slot value to 40 characters, picked options included
   (`setSlot`). The flower list is 45 characters, so the cut value was no longer on its list, the ask was refused before
   sending (`not-in-list`), nothing parked, and — rightly — no "resting" (a refused slot is not Olive resting). The
   "thinking" the clause saw was the hint's voicing. Reach: **15 options of five rungs** were unsendable from the picker
   (every `what-wants` line, both `flowerlists`, three `routes`, both `traces`, both `trick_bodies`). **Fix
   (`library/modules/garden-kit/src/kit.js`, rebuilt):** typed text is cut to the field's limit (≤ 40); a value picked from
   the options is kept whole. Gates: `cg001GardenKit` 20/20 (its setSlot row now pins both); new `cg005Olive` row "every
   word the picker offers survives the kit and can be sent" — every option of every rung, EN and FR, picked through the
   BUILT kit, still on its list and passing the page's check. Arm: the old cut restored → both specs red, listing the
   15 cut options (killed; restored and `cmp`-checked). The drive's parked clause now also requires the ask block to be
   the one running (`data-run="true"`), so a voicing's tag can no longer pass for a park.
3. **`tap palette ask:poem` not hit at (1131, 456) — INSTRUMENT.** Control run with the old timing: `elementFromPoint` →
   `DIV.gd-blocks gd-band2 gd-locked`, `locked: true`. The drive tapped the palette while the words-to-blocks run was
   still playing; the kit locks the palette during a run (`.gd-locked … pointer-events: none`), by design. Nothing
   covers the block. Fix in the drive: wait for the run to end before editing (`runOver`). The tap now reports what it
   hit and whether the list was locked.
4. **The wrapper's exit** is now the step's (`drive-olive.sh`: `exit $(cat $OUT/<step>.exit)`; gates: both specs), and
   `REPO` may be set, so it drives a worktree. `contract` now writes `contract.log`/`contract.exit`.

**Re-driven in the lane** (worktree rebased onto `e0939f9cd`, template regenerated — only the kit's copy changed; assembled,
deployed with the primary's `nodegx-deploy.cjs`, `p105-s3-scratch/hooks/drive-wt.sh`): **main page drive 148/148, exit 0;
Olive page drive `{"pass":16,"fail":0,"skip":0}`, wrapper exit 0** (the 17th line of the first run was the failed tap,
not a clause). P-AC2 now reads parked with the whole list in the block, x 0 → 1, 36 frames in 600 ms, the dots moving,
then "Olive is resting"; the hooks' contrast 4.61–13.86. Gates: `cg005Olive` 34/34, `cg001GardenKit` 20/20, `cg002Engine`
115/115, `cg006Requests` 84/84, `cg003Template` 79/79. Arms 17/17.

**Merge hazard:** the kit (`src/kit.js` and its built `index.js`) is lane LOOK's file, changed here on the orchestrator's
word (a product defect the drive found): `setSlot(list, id, key, value, max?)` — the fifth argument is new and optional.
`templates/bot-garden/noodl_modules/garden-kit/index.js` must be regenerated on the merged tree (left uncommitted).

### 8.9 The orchestrator's runs on the merged tree (primary checkout, 2026-09-28 12:12–13:50, on `cline-dev` at the commit named)

- **The real model through the shipped table** (`drives/drive-probes.sh`, steps 2–5, at `443a01e97`): contract **31/31 PASS on
  CPU** (P02, the EN thank-you, now passes — R7), **30/31 on Metal** (P21 poem: one line, not two, 2/3 — variance; the exam
  withholds the poem on that machine as designed).
- 🔴→✅ **A voiced hint had stopped being the hint in 3 of 6 recorded voicings**, every one `ok: true` under the old check:
  FR Metal "C'est une excellente question ! La réponse est : **Un tulipe !**…" (an answer, in markdown); EN on both paths
  "Pip was standing in front of a tree…" (the question gone). Fixed `e1667b3e1`: `compose` carries `keep {question, name}`,
  `checkOutput` refuses a voicing that drops the `?`, drops the robot's (renamable) name, or brings markdown → `unfaithful` →
  the written line. Test on the six real replies; arms 3/3. The hooks lane mirrored it on the page.
- Page clauses (`DEPLOY=… drive-olive.sh pages`) at `ff06f39b5`: **16/16, 0 skip, exit 0** (the first run on the merged tree
  read 14 pass + 2 fail + a failed tap: two were ONE product defect in the kit — a picked option cut to 40 characters, so 15
  options of five rungs were never sent — and one was the drive tapping a palette the kit locks during a run; §8.1).
