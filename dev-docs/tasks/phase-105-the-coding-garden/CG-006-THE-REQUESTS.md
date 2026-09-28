# CG-006 — The requests: the coding tricks, the Olive ladder, and the moments worth ring-fencing

**Opened 2026-09-27**, scoped from TPL-012 §2.3 and §2.6. **Status: 🟡 session 2 — AC1, AC4, AC5 measured; AC2 §3 as data; AC2 §4 + AC6 probes prepared (model run pending); AC3 awaits Richard's FR read (§7).** Depends on CG-002
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
| 9 🎓 | "make Olive answer in under 5 words" | a rule slot + a word-count checker | the sentence is ignored, the shape holds |
| 10 🎓 | Olive's tall tales (band 10–12, canned) | none | confident wrong answers, checked in a book |
| 11 | Sami: "translate the note for my cousin" | `ask · in English` | FR → EN works; EN → FR shown as weaker |
| 12 | "a poem for my tulip" | `ask · two lines` | a sticker, sometimes silly |

## 4. The extra moments to ring-fence (added 2026-09-27 at Richard's ask)

Each is a request or a Skills-page card; each names the lesson and whether the readout already covers
it or a probe must be added to the exam first. A moment ships only after its probe is green (or reliably
red, for a 🎓).

| # | Moment | Lesson | Model behaviour needed | Status |
|---|---|---|---|---|
| E1 | **Olive forgets.** Ask her the name she gave the tulip a minute ago | a model has no memory; the program's variable does | certain by design (no context is kept) | ship |
| E2 | **Olive can't see the garden.** "Which way is the tulip?" with nothing in the slot, then with the map's row in the slot | she knows only what you tell her; that is the prompt | probe: does a one-line map in the slot yield `gauche`? | add probe |
| E3 | **Explain my program.** Blocks → a sentence ("Pip goes forward twice, turns left, waters") | reading code; the round trip words → blocks → words is lossy | probe: reshape, expected green | add probe |
| E4 | **Olive narrates the run.** The trace → a sentence ("Pip watered the path and made a puddle") | reading a trace; debugging in words | probe: reshape, expected green | add probe |
| E5 | **Name my trick.** The child's named block gets a name suggested from its body | naming; the model as a label-maker | probe: expected green | add probe |
| E6 | **Rewrite it.** "Say it more politely / like a poem / shorter" on a given line | transformation vs invention | probe: expected green for polite/poem, red for "shorter" (a rule) | add probe |
| E7 | **Word → emoji** for stickers | reshaping into a symbol | probe: expected green | add probe |
| E8 🎓 | **Sort these words** | ordering is a rule; the program sorts | probe: expected red | add probe |
| E9 🎓 | **Olive's dictionary.** Define a garden word (canned list) | small models make things up about the world | probe: expected mixed, shown as such | add probe |
| E10 | **The letter generator.** Every request's spoken line is written by Olive from the request's data, so the island reads differently each play | flavour from data; the data is the truth (a must-contain check on the object) | probe: expected green with must-contain | add probe |
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
