# CG-006 — The requests: the coding tricks, the Olive ladder, and the moments worth ring-fencing

**Opened 2026-09-27**, scoped from TPL-012 §2.3 and §2.6. **Status: 🟡 session 3 — Richard's rulings built (rung 9 = "no letter e", no EN must-contain, every rung band 10–12, the name); AC6 closed (E3 E4 E5 E8 E9 E10 promoted to rungs 13–18 in the shipped tables, E2 E6 E7 dropped); the real-model re-run through the shipped table is prepared (§8); AC3 awaits Richard's FR read.** Depends on CG-002
(and CG-005 for §3). Lane B.

## 1. The person sentence

> **Every request is a person on the island asking for help; every request teaches exactly one new thing;
> the child can tell before she starts which trick it needs; and when Olive is part of it, the request
> is honest about what Olive will get wrong.**

## 2. The coding requests (the seven tricks)

Each row is one entry in the request array (CG-002's schema): islander, band, trick, map, goal, palette,
reward. The reference solution is part of the entry and the engine gate runs it.

| # | Trick | Request (islander) | Goal | Reward |
|---|---|---|---|---|
| 1 | Steps in order | Sami: walk the path to the post box | robot on the post-box tile | cap |
| 1b | Steps in order | Mamie Rose: water the tulip by the door | one tulip watered | sticker 🌷 |
| 2 | Repeat | Mamie Rose: water my three tulips (the mockup's) | three watered; the fold offered | sunflower hat |
| 2b | Repeat | Sami: lay the path stones, four in a row | four `put` on the path | seeds |
| 3 | Repeat until | Biscuit: walk to the wall, then turn | `until wall` used; robot at the wall | sticker 🐾 |
| 4 | If | Biscuit: feed me only if my bowl is empty (two bowls, one full) | the empty bowl filled, the full one untouched | crown |
| 5 | When | Biscuit: when I meow, come to the bowl | a `when meow` handler armed; the meow fires twice | bell |
| 6 | Counting | Mamie Rose: collect four eggs, then stop | `count +1` and `count = 4` used | basket |
| 7 | A trick with a name | Mamie Rose: water both rows the same way | a named trick called twice | garden gnome |

Free play is always open with every trick the band has.

## 3. The Olive rungs (TPL-012 §2.6, measured on the 0.8B)

Green rungs build on what she does consistently; 🎓 rungs make her fail on purpose and the child fixes it
with a program. All twelve are in TPL-012 §2.6's table; the entries here add only the request framing:

| # | Islander says | Block | Outcome |
|---|---|---|---|
| 1 | Sami: "tell Mamie Rose thank you, twice" | `say` | two different lines |
| 2 | Mamie Rose: "name my three new tulips" | `ask · a list of 3` + the dial | labels on the tulips |
| 3 | Sami: "I wrote Pip's route in words" | `ask · blocks` | Olive proposes, the child runs |
| 4 🎓 | Sami: "avance de trois cases, puis arrose" | `ask · blocks` | one block; fix with `repeat 3` |
| 5 | Biscuit's letter: "what does Biscuit want?" | `ask · one of` → `if Olive says croquettes` | the branch goes to the bowl |
| 6 🎓 | "is the thing ahead a flower?" | `if Olive says yes` | mostly right; ask three times, count the yeses |
| 7 🎓 | Mamie Rose: "how many tulips do I have?" | `ask · a number` | 6, 7, 7; the program counts 4 |
| 8 🎓 | Olive's maths test (band 10–12) | `ask · a number` | 2+3 ✓, 14+9 ✗ every time |
| 9 🎓 | "make Olive describe a tulip without the letter e" (ruling 2, 2026-09-28) | `ask · a sentence` + a checking program | she uses an e anyway (3/3 FR and EN); the program catches it |
| 10 🎓 | Olive's tall tales (band 10–12, canned) | none | confident wrong answers, checked in a book |
| 11 | Sami: "translate the note for my cousin" | `ask · in English` | FR → EN works; EN → FR shown as weaker |
| 12 | "a poem for my tulip" | `ask · two lines` | a sticker, sometimes silly |
| 13 | E3 "explain my program" | `ask · a sentence` (the blocks as a list word) | Olive reads the blocks back; the round trip is lossy |
| 14 | E4 "Olive tells the story of the run" | `ask · a sentence` (the run's trace) | the puddle in the story points at the step |
| 15 | E5 "name my trick" | `ask · a word` (the trick's body) | a name suggested; the child decides |
| 16 🎓 | E8 "put these words in order" | `ask · a list of 3` | never sorted (0/3); a program sorts |
| 17 🎓 | E9 "Olive's dictionary" | `ask · a sentence` | some definitions right, some made up (mixed: offered when they disagree) |
| 18 | E10 "Olive writes the letters" | `ask · a sentence`, must-contain the object | the wording changes, the thing asked for never does |

**Every rung is band 10–12** (ruling 4, 2026-09-28): band 7–9 keeps the owl's hints, game-chosen, and is offered no
rung.

## 4. The extra moments to ring-fence (added 2026-09-27 at Richard's ask)

Each is a request or a Skills-page card; each names the lesson and whether the readout already covers
it or a probe must be added to the exam first. A moment ships only after its probe is green (or reliably
red, for a 🎓).

| # | Moment | Lesson | Model behaviour needed | Status |
|---|---|---|---|---|
| E1 | **Olive forgets.** Ask her the name she gave the tulip a minute ago | a model has no memory; the program's variable does | certain by design (no context is kept) | ship |
| E2 | **Olive can't see the garden.** "Which way is the tulip?" with nothing in the slot, then with the map's row in the slot | she knows only what you tell her; that is the prompt | probe: does a one-line map in the slot yield `gauche`? | **dropped (§7.1)** |
| E3 | **Explain my program.** Blocks → a sentence ("Pip goes forward twice, turns left, waters") | reading code; the round trip words → blocks → words is lossy | probe: reshape, expected green | **promoted → rung 13** |
| E4 | **Olive narrates the run.** The trace → a sentence ("Pip watered the path and made a puddle") | reading a trace; debugging in words | probe: reshape, expected green | **promoted → rung 14** |
| E5 | **Name my trick.** The child's named block gets a name suggested from its body | naming; the model as a label-maker | probe: expected green | **promoted → rung 15** |
| E6 | **Rewrite it.** "Say it more politely / like a poem / shorter" on a given line | transformation vs invention | probe: expected green for polite/poem, red for "shorter" (a rule) | **dropped (§7.1)** |
| E7 | **Word → emoji** for stickers | reshaping into a symbol | probe: expected green | **dropped (§7.1)** |
| E8 🎓 | **Sort these words** | ordering is a rule; the program sorts | probe: expected red | **promoted → rung 16** |
| E9 🎓 | **Olive's dictionary.** Define a garden word (canned list) | small models make things up about the world | probe: expected mixed, shown as such | **promoted → rung 17** |
| E10 | **The letter generator.** Every request's spoken line is written by Olive from the request's data, so the island reads differently each play | flavour from data; the data is the truth (a must-contain check on the object) | probe: expected green with must-contain | **promoted → rung 18** |
| E11 | **Slow blocks.** A loop with an Olive block inside shows a "thinking" badge per iteration | a call costs time; ask once, remember the answer | certain by design | ship |
| E12 🎓 | **Two Olives disagree.** Ask twice at "surprise me", compare | variability; when to trust a single answer | certain by design (F2 in the readout) | ship |
| E13 🎓 | **The fence.** (Grown-ups page only, not a child activity) Olive's exam shows the off-topic probe's answer | why the game never lets a child type freely to her | H1–H3 in the readout | ship as a Grown-ups card |

**Not a moment, by ruling:** Olive never suggests the next block and never fixes a program. The hint
table does that from the state, and the research (TPL-012 finding 5) says a model doing it harms.

## 5. Acceptance criteria

1. Every request in §2 has a reference solution that the engine gate runs to its goal, in both bands
   where the band allows it.
2. Every Olive rung in §3 and every shipped moment in §4 has its exam probe with an expected answer, and
   the contract test's readout matches the column the request was designed on (green stays green, 🎓
   stays red).
3. Every string is in the word table in EN and FR, and the FR copy is read by Richard before the kids
   see it (he tests in French).
4. Rewards are cosmetic, never bought, and each names the islander it came from.
5. No request carries a timer, a score, a streak or a "you missed".
6. §4's "add probe" rows are either promoted to §3 with a probe or dropped, and the README's board says
   which.

## 6. Traps

A documented example description is published; an inert parameter in a corpus example teaches a lie;
the "Out:" line can hold the defect (read the goal predicate, not the blurb).

## 7. Session 2 — what was built (2026-09-27/28, lane B, worktree `cg006-requests`)

Three files under `packages/noodl-mcp/tests/`, plus one re-pinned line in `cg002Engine.test.ts`:

- `cg002Content.ts` (owned this session) — **10 requests** (the 8 of CG-002 + `tulip-door` = §2 row 1b and
  `path-stones` = row 2b, both band 7–9); `copyKeys.gift` on every request (the reward line that names the islander);
  **`OLIVE_RUNGS`** (the twelve §3 rungs as requests: islander, band, block, shape, rung-table ids, exam probe ids, card
  keys, and rung 9's `rule: 'awaiting-ruling'` with both candidates) + `OLIVE_RUNGS_JSON`; the word table **192 → 272
  keys** (80 new, EN + FR: 6 request lines, 10 gifts, 38 rung lines, 26 moment lines); `oliveRung8` reworded (it said
  "missed" / "raté": the AC5 gate caught it).
- `cg006Probes.ts` — §4 as probe DATA in `exam.js`'s `PROBES` shape: **28 probes** (E2–E10: 22; rung 9 G1/G2: 4; the
  EN thank-you A/B: 2), **13 proposed rung-table entries + 12 lists** in `olive-templates.json`'s shape (merged by
  `mergeTemplates`, never written into the shell's file), `MOMENTS` E1–E13 with a decision each, `RULINGS` (both
  unchosen), `meets` / `majority` / `decide`, and `EXAM_KIND_PATCH`.
- `cg006Requests.test.ts` — **82 tests, ~4 s**: `cd packages/noodl-mcp && npx jest tests/cg006Requests.test.ts`.
  `cg002Engine.test.ts` AC1 row count re-pinned 20 → 28: **105/105** (97 + 8 new rows).

| AC | Status | Measured by |
|---|---|---|
| 1 | ✅ measured | the 9 §2 rows map to 9 requests with §2's islander, trick and reward; **26 runs** (4 band 7–9 rows × 2 bands × 2 langs + 5 × 2) through the shipped `Logic/*` scripts, each `met: true`, 0 bumps, 0 puddles, < 100 ticks; band 7–9 runs the unrolled recording and every block is in `BAND_PALETTE[1]`. Every request fails on an empty program AND on a named plausible wrong program (9/9). Row 2: the band 10–12 recording (15 blocks) offers `repeat 3` (len 5), band 7–9 never; row 1b: the wrong turn makes 1 puddle; row 2b: four stones at (3–6, 3), basket empty. |
| 2 (§3) | ✅ measured as data | 12 rungs, 🎓 on 4 6 7 8 9 10, band 10–12 on 8 and 10; every rung-table id exists in `olive-templates.json` with the ladder its exam column says; every probe id exists in `exam.js` on the rung's own entries, green rungs have no `fail` probe, 🎓 rungs no `pass` probe, rungs 8 and 11 both; **0 orphan exam probes**. Card keys resolve EN + FR. The interpreter's shape consumption is CG-005's. |
| 2 (§4) | 🟡 prepared, model run pending | offline, 28/28: slots pass the shell's own `checkSlots` on the merged table, `compose` gives the declared shape with no `{slot}` left, a hand-written canned reply passes `checkOutput` and grades as its column (green met / 🎓 not met), and grades identically under `exam.js`'s `meetsOne` for the 6 kinds it knows. **Not a measurement of Olive**: `$SCRATCH/drive-laneB.sh` + `probe-cg006.mjs` run them on the real model (CPU then Metal); predictions in `$SCRATCH/EXPECTED-DRIVE.md`. |
| 3 | ✅ EN+FR / ⬜ Richard's read | 272 keys × 2 languages non-empty, `{b}` filled; the 114 request-facing keys EN ≠ FR, the FR uses « » and ’ (0 straight quotes) and a space before ! ? : ; (0 misses). **Richard reads the FR before the kids see it** — not gradeable here. |
| 4 | ✅ measured | 10/10 rewards are hat/sticker/seed/item, `from` = the islander, 10 distinct ids; every gift line names the islander AND the reward in EN and FR; 0 money words/fields (known-firing: 6/6 planted prices caught); a profile that finishes all 10 holds the 3 hats on its hat rail and the 7 others on its sticker page. |
| 5 | ✅ measured | 0 pressure words in 114 request-facing keys + 12 rung hints, EN and FR (timer, seconds, score, points, streak, in a row, missed, chrono, série, de suite, raté, manqué, vite…; whole-word, Unicode-aware); 0 time/score/streak/lives/deadline fields on requests or rungs. Known-firing: 7/7 EN + 8/8 FR planted lines caught, 0/6 false hits on the island's own phrases. |
| 6 | 🟡 prepared | E1 E11 E12 E13 ship with their evidence named; E2–E10 each carry probes (2–3 each) and `decision: 'awaiting-probe'` — **9/9 awaiting, 0 promoted, 0 dropped**: nothing was decided without the exam. `decide()` turns an exam's rows into promoted/dropped by §4's rule (green held / 🎓 reliably red / mixed disagrees) — tested both ways. The README's board says which after the orchestrator's run. |

**Arms: 10/10 killed** (`$SCRATCH/mut-summary.txt`): 1b's reference loses its turn (5 red), 2b's reward from the wrong
islander (2), a timer in a request line (1), a 🎓 probe designed green (1), `decide` inverted (1), an FR line emptied (1),
`lacks` ignores letters (5), `mergeTemplates` writes the shell's table (2), rung 6 marked green (1), `lacks` matching
substrings so "beau" = "eau" (1). Restored after each (`cp` from a backup); 187/187 after.

**Findings** (each measured; the owner named):
- 🔴 **G2 "never mention water" does NOT fail on the recorded readout.** TPL-012 §2.6 and CG-004 §7 finding a list G1
  and G2 as "failed 3/3". Re-graded from `results-2026-09-27-metal.txt` by this gate: **G1 broke its rule 3/3** (every
  reply has an e); **G2 kept its rule 3/3** ("Pip nettoie les plantes…", "Pip secouette les branches…" ×2, no water word).
  Both stay candidates for rung 9 (not chosen); the probe run on CPU decides. **Owner: Richard, the ruling.**
- 🔴 **The EN thank-you evidence is thin.** The battery's three A9 replies all say "grateful" and pass the current list;
  the two refusals in the contract test left no text (the route logs refused text since then). Candidate A (widen)
  and B (drop for EN) both accept a reply the current list refuses (`"I really appreciate…"` → `must-contain`).
  **Owner: Richard, the ruling; the orchestrator reads the route log after the next contract run.**
- 🔴 **`exam.js` cannot grade two of the new kinds.** `lacks` (G1, G2) and `containsAll` (E3) fall to `meetsOne`'s
  `default: false`, so a `mode: 'fail'` probe of those kinds passes whatever she says (measured: a reply with no e →
  this file `true`, `exam.js` `false`). `EXAM_KIND_PATCH` is the exact case text; the gate compiles it and checks it
  grades the same as `meets` on 30 cases. **Owner: CG-005 / lane C (`exam.js`)** before these probes go into the exam; the
  prepared runner grades with `meets` itself, so it does not wait.
- 🟡 **eggs-count's goal cannot say "`count = 4` used".** A program with one `count +1` and no `count = 4` anywhere
  (`pick fwd pick fwd pick fwd pick count+1`, count ends at 1) meets the goal (measured, `$SCRATCH/loophole.log`). The
  goal vocabulary has no predicate over a sensor slot. Fix: a `senses` goal (`[sensor, arg]` present in the program) in
  `GOAL_SCRIPT` + one goal row here. **Owner: `cg002Scripts.ts`'s owner (lane C this session) → next session.**
- 🟡 **The Olive rungs framed for band 7–9 cannot be placed there.** TPL-012 §2.6 offers every rung but 8 and 10 to
  band 7–9 (and CG-005 AC6 has a band 7–9 slot picker), but `BAND_PALETTE[1]` has no `say`, `ask` or `if`: **10 of 10**
  band 7–9 rungs are unreachable (measured). The data keeps the source's bands. **Owner: Richard (is Olive band 10–12
  only?) or CG-005 (widen band 1's palette by `ask`).**
- 🟡 The mockup's fold tie-break shows again: 2b's recording (`put fwd` × 4) folds to `repeat 2 { put fwd put fwd }`,
  not `repeat 4`. The gate asserts only "offered, covers 8". **Owner: Richard, the open CG-002 ruling.**
- E6 "shorter" is designed 🎓 but "under 5 words" was obeyed 6/6 in the contract test: at risk of being dropped by its
  probe. Owner: the probe run.

**Merge hazards:** `GardenRequest.copyKeys` gained a `gift` key (every request has one; a generator that types
`copyKeys` must accept it — lane A). Two new requests arrive through the generator; block ids of later requests'
reference programs shifted (no gate pins them). New exports `OLIVE_RUNGS` / `OLIVE_RUNGS_JSON` are not consumed yet
(the pages' Olive cards are CG-003/CG-005's). The gate READS lane C's `olive-templates.json`, `exam.js` and
`olive-check.js`: a renamed rung or probe id there turns a row here red with its name — that is the gate working.

### 7.1 The probe run on the real model (orchestrator, primary checkout, 2026-09-28 07:20)

`zsh drive-laneB.sh` after the cherry-pick (`5a6f0031a`): gates 187/187; `probe-cg006.mjs` through the shell's own
compose/check path, 28 probes × 3 samples, **CPU 2 threads** (the tablet's path; node-llama-cpp compiled its CPU build
first, because the shell's `npm ci` that morning had wiped `localBuilds`) and then **Metal**. Exit 0 both. The two paths
agree on every decision:

| moment | CPU | Metal | decision (`decide()`, §4's rule) | the readout |
|---|---|---|---|---|
| E2 can't see the garden | FR row 0/3 · EN row 3/3 | same | **dropped** | FR with the map row in the slot: "derrière" / "devant" / "devant" — never `gauche`; EN gets `left` 3/3. A FR-only failure: re-frame (the EN row works) or keep dropped |
| E3 explain my program | FR 3/3 · EN 2/3 | 3/3 · 3/3 | **promoted** | |
| E4 narrate the run | 3/3 · 3/3 | same | **promoted** | |
| E5 name my trick | 3/3 | 3/3 | **promoted** | "apt" recorded, 0/3 |
| E6 rewrite it | polite 1/3 ❌ · poem 3/3 · shorter 🎓 obeyed 3/3 ❌ | polite 0/3 · shorter obeyed 1/3 | **dropped** | "polite" adds a preamble and a question ("Voici une version plus polie : …"); "shorter" she does ("Moi, un chouette.") — so it cannot be the 🎓 |
| E7 word → emoji | tulipe 3/3 · lettre 0/3 | same | **dropped** | "lettre" → 🌻 / 🌻 / 🌷: only the garden's emoji. Re-frame to garden things only, or keep dropped |
| E8 🎓 sort | red 0/3 FR and EN | same | **promoted** | reliably wrong, as the lesson needs |
| E9 🎓 dictionary | mixed (rocher 3/3, arrosoir 0/3, chouette 0/3) | mixed (1/3, 0/3, 2/3) | **promoted** | shown as mixed, as designed |
| E10 letter generator | FR 2/3 · EN 3/3 | 3/3 · 3/3 | **promoted** | the must-contain on the object holds |

**For Richard's two rulings (measured, not chosen):**
- **Rung 9's rule:** G1 "no letter e" — she breaks it **3/3 FR and 3/3 EN on both paths**, so it works as the 🎓.
  G2 "never mention water" — she **keeps it 3/3** on both paths ("Pip fait planter des fleurs et des légumes dans un
  grand sentier vert."), so it does not work as a failure. The evidence points at G1.
- **The EN thank-you must-contain:** candidate A (a wider word list) met **2/3** on both paths ("Thank Mamie Rose for
  trusting you with the garden."); candidate B (no must-contain for EN) met **3/3**.

**Residual:** the `decision` fields in `cg006Probes.ts` `MOMENTS` still read `awaiting-probe`. The table above is the
evidence to flip them (6 promoted, 3 dropped), and §3 gains E3 E4 E5 E8 E9 E10 as rungs. Owner: CG-006, next session,
after Richard reads this table (E2 and E7 may be re-framed rather than dropped).


## 8. Session 3 — what was built (2026-09-28, lane CONTENT, worktree `cg-s3-content`, base `83888c07d`)

Richard's rulings of 2026-09-28 turned into the content, and AC6 closed. Files: `packages/noodl-mcp/tests/`
`cg002Content.ts`, `cg006Probes.ts`, `cg006Requests.test.ts`, `cg005Olive.ts` (words + one owl-row line),
`cg005Olive.test.ts`; `garden-desktop/shell/` `olive-templates.json`, `exam.js`, `olive-check.js`, `olive-stub.js`,
`tests/{exam,olive-check,olive-stub}.test.js`; `garden-desktop/tests/olive-contract.mjs` (two lines of text);
`drives/probe-cg006.mjs`, `drives/drive-probes.sh`.

**Re-measured before building** (the claims this section builds on):
- `exam.js` already carried `lacks` / `containsAll` (CG-005 took s2's `EXAM_KIND_PATCH`) — read at base.
- 🟡 §7's "10 of 10 band 7–9 rungs unreachable" measured the BLOCK list (`BAND_PALETTE[1]` has no `ask`), not the
  palette: at base `Logic/Palette` with `rungs: 'all'` offered **11 rungs to band 7–9** (as `ask:<rung>` entries) and 14
  to band 10–12. The page's rung gate reads `band` from the rung TABLE (`cg005Olive.ts` `OLIVE_SLIM`), never from
  `OLIVE_RUNGS` — so ruling 4 is a data edit in `olive-templates.json`; `cg002Scripts.ts`'s palette needs no edit.
- The voiced hints had ALREADY drifted: the shell said "Hello! Mamie Rose is waiting." and "{b} watered {w} of 3
  tulips", the page "Someone on the island is waiting." and "{b} did {w} of {t}"; FR apostrophes differed.

| Ruling / item | Status | Reading |
|---|---|---|
| 2 — rung 9 = G1 "no letter e" | ✅ measured (data) · 🟡 model re-run prepared | `OLIVE_RUNGS[9]` → table `no-letter-e` (n 9, band 2, 🎓, no slots), probes `R9-G1-fr` (from battery G1) and `R9-G1-en` (CG-006 §7.1), both `mode: 'fail'`, `lacks e`, 3 samples, in `exam.js`. `under-five-words`, P17/P32, `rungUnderFiveWords`, `or9LineG1/G2`, G2 `no-water` and its probes, `RULINGS`, the `rule`/`ruleCandidates` fields: **gone** (a spec greps the table, exam, words, probe data for 10 retired ids: 0 found). **G2 dropped, not kept as evidence**: the readout that decided it stays graded in the spec (G1 broke its rule 3/3, G2 kept it 3/3, from `results-2026-09-27-metal.txt`). `or9Line` / `oliveRung9` say "without the letter e". The stub's default exam is now `{}`: the readout agrees with the ladder on every rung. |
| 3 — EN thank-you, no must-contain | ✅ measured | `say-thanks.mustContain = { fr: ['merci'] }`; `compose` EN → `[]`, FR → `['merci']`; "I really appreciate you trusting me…" and §7.1's candidate-A miss "Thank Mamie Rose for…" pass EN; "Bonjour Mamie Rose…" is `must-contain` in FR. The candidates `say-thanks-en-wide/-none` and TY-A/TY-B are retired. P02 (the CPU red of s2) stays `{kind:'ok'}`, mode pass. |
| 4 — the rungs are band 10–12 only | ✅ measured | every rung-table entry `band: 2` except `voice-hint` (`band: 1`: the owl voices hints in both bands); every `OLIVE_RUNGS` row band 2 AND equal to its table entries' band (asserted, since the page reads the table). `Logic/Palette` `rungs:'all'`: **band 7–9 offers `[]`** (base: 11), band 10–12 all **20 table ids** = the 18 rung numbers, EN and FR; `Logic/Olive slots` at band 1 → `not-in-band` for all 20. `cg002Scripts.ts` read, needs no edit. The CG-005 band 7–9 picker clause (`no-typing`) is now unreachable for a rung (the band check comes first); left as defence in depth, its tests rewritten to the band 1 refusal and the band 10–12 narrowing. The Grown-ups copy never said Olive teaches 7–9 (0 lines). |
| item 3 / AC6 — promote the measured moments | ✅ measured (data) · 🟡 model re-run prepared | `MOMENTS`: E3 E4 E5 E8 E9 E10 **promoted** (rungs 13–18: `explain-program`, `narrate-run`, `name-trick`, `sort-words` 🎓, `define` 🎓 mixed, `letter`), E2 E6 E7 **dropped**, each with its §7.1 evidence; `decide()` over the §7.1 readings reproduces all nine decisions (E9-en, never run, tried both ways). The six rungs, their six lists and written answers are in the SHIPPED `olive-templates.json` (band 2); 16 probes in `exam.js` (11 asserted, from `CG-006 §7.1`; the unmeasured EN twins E5-en / E9-en and E3-count / E5-apt recorded, one sample). `OLIVE_RUNGS` rows n 13–18 with `mark` / `examColumn` from the measurement, `copyKeys.title/line` = the moment's own `mo*` keys, new `or13–18Lesson` + `oliveRung13–18` hints, EN + FR; palette titles and slot labels in `OLIVE_WORDS`. `cg006Probes.PROBES` takes a promoted probe FROM `exam.js` (field-for-field equality asserted), so there is one definition; the canned reply of each of the 18 shipped probes passes the shell's `checkSlots` / `compose` / `checkOutput` on the **shipped table itself** (not a merge) and grades as its column. The dropped moments' tables stay as evidence (`DROPPED_RUNGS`/`DROPPED_LISTS`, never shipped: asserted). **The exam's gate**: a new rung-table field `verdict: 'mixed'` (define) makes `runExam` grade that rung on its recorded set — offered when they DISAGREE (all right or all wrong → withheld). Stub: all 7 rungs offered on the readout; each switched to break its lesson → withheld alone, **7/7**. The E9-arrosoir expectation is `arroser`/`l'eau`, not `arros` (the headword "arrosoir" contains "arros", so the old one met whenever she repeated the word). |
| — the two paid-for exam traps, armed | ✅ measured | `exam.js` exports `KINDS`; a probe of a kind outside it can never pass (was: a 🎓 probe of an unknown kind passed vacuously), and cannot fake a mixed disagreement; `exam.test.js` builds a met and a not-met reply for EVERY probe's expectation and requires `met()` to tell them apart (51/51). A recorded probe on a 🎓 rung is graded the 🎓 way (count-tulips answered right → rung withheld). |
| item 3 (NEXT) — one source for the voiced hints | ✅ measured | `olive-templates.json` `hints` is the source; `cg002Content.ts` `HINTS` takes the seven voiced keys from it (`voiced()`, `VOICED_HINT_KEYS`) — a derivation, so the page line and the voiced line cannot drift. The JSON took the PAGE's wording (what the kids see; the page is unchanged). `{t}` (hintMissed's total) is now a `voice-hint` slot: `compose` fills it, the stub fills it, and `Logic/Owl row` sends `vars.t` (one line in `OWL_ROW_SCRIPT`). Spec: every placeholder of every voiced line is a slot `compose` fills, and the composed prompt contains the page's line with the same values, 7 keys × 2 languages. |
| 7 — the name | ✅ measured | `WORDS.brand` = `Olive’s Island` / `L’île d’Olive` (the file's typographic ’); `guD2` "A save code moves the family’s islands…", `saveCodeBad` "That code is not an island save." — 0 words say "Bot Garden" (asserted). The stub's "still opening" line too. Page hard-codes and `garden.json` are other lanes'. |

**Gates** (single specs, in the worktree): `cg006Requests` **83/83** (82 at base), `cg005Olive` **26/26** (25),
`cg002Engine` **105/105** (unchanged — no row pinned content that changed; no hunk in that file); shell `node --test`
**72/73** — the one red is `tests/config.test.js` (not this lane's file) pinning 15 rungs: see the merge hazard; with
its two-line change applied to a copy, 7/7.

**Arms: 17/17 killed** (`p105-s3-scratch/content/mut-summary.txt`, `mutate.py`; restored by `cp` after each, suites
green after): an unknown kind may pass; `lacks` removed; the mixed verdict always passes; a recorded 🎓 probe graded
pass = met; an unknown kind fakes the mixed set; the EN must-contain back; `poem` back to band 1; `define` loses
`verdict`; `hintStart` re-typed as a literal in `HINTS`; `compose` forgets `{t}`; the owl row drops `t`; the brand back
to "Bot Garden"; rung 16 designed green; rung 9 back to band 1; E6 promoted; the sort written answer sorted; E8-fr
designed green. **One control survives by design**: editing a voiced line in the JSON alone changes the page too (the
derivation) — nothing drifts, so nothing is red.

**Prepared, not run** (the orchestrator, primary checkout, after the cherry-pick; ONE heavy job):
`zsh dev-docs/tasks/phase-105-the-coding-garden/drives/drive-probes.sh` (`STEPS="1 2 3 4 5"`, logs in `$S`):
1. gates: jest 214/214; shell 73/73 once `config.test.js` takes the hazard (else 72/73); `probe-cg006.mjs --stub` →
   exit 0, "7/7 rungs offered; 11/11 asserted probes as designed" (measured in the lane).
2. `probe-cg006.mjs --cpu` (rung 9 + rungs 13–18, 18 probes, the shipped table and exam) → exit 0, "7/7 rungs offered".
   Predicted per §7.1: R9-G1 FR/EN not met (she writes an e) ✅; E3-fr/en met (EN was 2/3 on CPU: the likeliest red);
   E4 met; E5-fr ok; E8 not sorted ✅; define mixed (rocher met, arrosoir/chouette not) → OFFERED; E10-en met, E10-fr
   (2/3 on CPU) the second likeliest red.
3. The same on Metal → exit 0, 7/7.
4. `olive-contract.mjs --cpu` → the whole exam, **51 probes (fr 30, en 21), 31 asserted**: predicted "31/31 … PASS",
   exit 0, AC7 dial ok both languages. P02 (the s2 CPU red, must-contain) now passes (no EN must-contain); P15 (the s2
   Metal red, 2+3) is untouched and may stay red on Metal. Exam time grows by ~30 samples: ~80–100 s CPU, ~60–75 s
   Metal (s2: 48.3 / 36.8 s) — printed, not asserted.
5. `olive-contract.mjs` on Metal → as 4.

**Merge hazards (for the orchestrator):**
- 🔴 `garden-desktop/shell/tests/config.test.js` (not in this lane) line 84–86: `rungs.length` **15 → 21** and the ladder
  loop `n <= 12` → `n <= 18`:
  `assert.equal(rungs.length, 21, 'twelve rungs (two each for rungs 2 and 8), the six promoted moments (13–18, CG-006 s3), plus the hint voicing');`
  `for (let n = 1; n <= 18; n++) assert.ok(numbers.has(n), \`ladder rung ${n} present\`);` — whichever lane changes
  `config.name` for ruling 7 in the same file takes both.
- 🔴 `cg002Scripts.ts` (lane LOOK) `CHOOSE_HINT_SCRIPT` line ~653: `rung >= 1 && rung <= 12` → `rung >= 1 && rung <= 18`,
  or rungs 13–18 fall through to `hintMissed` after their run (their `oliveRung13–18` lines exist in `HINTS`).
- The generator (lane LOOK / orchestrator) picks up, by data only: 6 more palette rungs and their slot lists in
  `OLIVE_SLIM`; `Logic/Translate words` gains `or13Lesson…or18Lesson` and loses `or9LineG1/G2`; `Logic/Hint table` gains
  `oliveRung13…18`; `OLIVE_WORDS` gains 7 rung titles and 7 slot labels, loses `rungUnderFiveWords`. The seven voiced
  hint lines on the page are unchanged (the JSON took the page's wording).
- `cg002Content.ts` now reads `garden-desktop/shell/olive-templates.json` at import (like `cg005Olive.ts` already did).
- Contract changes: `exam.js` exports `KINDS`, `verdictOf`; a rung's exam result may carry `verdict: 'mixed'`; the
  `voice-hint` rung takes an optional `t`; `OliveRung` lost `rule`/`ruleCandidates`, gained `moment`, `examColumn:
  'mixed'`, `shape: 'one_word'`; `cg006Probes.ts` lost `RULINGS`, `PROPOSED_*`, `EXAM_KIND_PATCH`, `EXAM_KINDS`,
  `NEW_EXPECT_KINDS` and gained `DROPPED_*`, `SHELL_DIR`; its `meets`/`majority` ARE `exam.js`'s.
- `drive-cg005-olive.js` R-AC3 reads `templates.hints.hintWet` live: the wording moved with the JSON, so it holds.

**What a re-frame of the dropped moments would be** (none built; each is one list word or one table entry, and one
probe run): **E2** — the EN row worked 3/3 and the FR row never did (derrière / devant / devant): ask a `yes_no`
("La tulipe est-elle à gauche de Pip ?") with the row in the slot, or write the FR row as "à gauche de Pip : une tulipe";
the lesson (she knows only what the slot tells her) survives either way. **E7** — she maps garden words (tulipe 3/3) and
answers a non-garden word with a flower (lettre → 🌻 🌻 🌷): keep only garden words and their stickers (tulipe, chat,
œuf, and an emoji per word), and probe each word. **E6** — "shorter" she obeys, so it is a ✅ transformation, not a 🎓;
"politely" fails on its preamble ("Voici une version plus polie : …"): a re-frame asserts the polite words anywhere in
the reply rather than the reply alone.

**Residuals:**
- The real-model re-run (steps 2–5). Owner: orchestrator.
- The first-launch exam grows from 35 to 51 probes (≈ +30 samples): on the tablet (4–6× the CPU column) ~6–9 minutes in
  the background. Owner: CG-008 (measure it on the tablet; trim the recorded EN twins first if it matters).
- The owl row and the Hint table for rungs 13–18 need the `CHOOSE_HINT_SCRIPT` hazard above. Owner: lane LOOK / orchestrator.
- The six new rungs' cards on the Skills page and their requests (no request offers `rungs: [...]` with them yet; the
  palette gets them with `rungs: 'all'`). Owner: CG-003 / CG-005's page hooks.
- AC3: Richard reads the new FR lines (the six lessons, six hints, rung 9's line and hint, `L’île d’Olive`,
  guD2 / saveCodeBad, the palette words). Owner: Richard.
