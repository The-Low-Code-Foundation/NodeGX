# CG-002 — The engine: the interpreter, the fold, the hints, the save

**Opened 2026-09-27**, scoped from TPL-012 §2–§3. **Status: 🟢 session 1 built, session 2 wired (2026-09-28) — AC1–AC9 measured green in the engine gate (105/105 on `cline-dev` with CG-006's requests); `npm run template:garden` runs this gate before it writes anything (CG-003).** Depends on nothing. Lane B.

## 1. The person sentence

> **The robot does exactly what the blocks say, one step per tick; the game notices the repetition in a
> recording and offers to fold it; every hint is chosen by a rule from the state the game already knows;
> and a family's garden survives a restart, an upgrade and a move to another computer.**

## 2. What it is

Function scripts shipped as named `Logic/*` components, generated from
`packages/noodl-mcp/tests/cg002Scripts.ts` (the TPL-007 pattern: one source, one gate, one generator), plus
the data they read:

- **The program model.** Blocks: `fwd`, `left`, `right`, `water`, `pick`, `put`, `say`, `repeat n {…}`,
  `until <sensor> {…}`, `if <sensor> {…}`, `when <event> {…}`, `count +1`, `count = n?` (a sensor),
  `trick <name> {…}` and `do <name>`, and the `ask Olive · <rung> · <slots> · <shape>` family (CG-005).
  Sensors: `wall ahead`, `tulip ahead`, `bowl empty`, `basket full`, `count = n`, `Olive says yes/x`.
- **The interpreter.** `flatten` with block ids, `step` (one primitive per tick, driven by GAM-013's
  `Repeat` node), a guard on `until` (40 iterations), `when` handlers armed by the world, named tricks
  as inlined bodies, `ask Olive` as an async step that parks the run until the answer or the fallback
  arrives (CG-005). Every step returns the world delta and the block id to glow.
- **The world.** The ASCII map + things + robots as one JSON; `apply(delta)`; sensors read it; a request's
  goal is a predicate over it ("every tulip watered", "the letter is at the post box").
- **The fold.** The mockup's `findRepeat` (runs of one block, repeated sequences up to six long, best
  coverage wins) plus a second pass inside a container. Never applied without the child's *Fold it*.
- **The hint table.** Keys by state: empty program, an unfolded repetition, a goal unmet with the count
  of what was done, a bump, a puddle, a Predict miss, a done-with-many-blocks, and per-rung Olive keys.
  Each key has an EN and an FR written line. Olive (CG-005) may voice a key; the table is the truth.
- **The requests.** A schema: id, islander, band, trick(s) it needs, the map, the things, the robot's
  start, the goal predicate, the palette, the reward, the copy keys. Content lives in CG-006.
- **The save model.** Family → profiles (name, band, language, face, robot look) → the island (which
  requests are done, what stands where, the tricks' seed/sprout/bloom state) → the save code (base64 of
  the model with a version, like Rocket School's v3). Written through the local backend when the shell
  is present (CG-004), through `localStorage` + `KeepStorage` when it is not (the PWA later).
- **The word table.** EN/FR as one Static Data, every string keyed, both bands' labels.

## 3. Acceptance criteria

1. The gate generates every request in CG-006's list and runs its reference solution to the goal, in both
   languages and both bands: green means every request is solvable by its own reference program.
2. `step` is deterministic: the same program on the same world gives the same sequence of deltas across
   200 seeds, including `until` with the guard and nested `repeat`.
3. The fold: given 30 recorded programs (fixtures), the suggestion matches the expected fold for all 30,
   and folding then unfolding (the child taps ✕ on the repeat) restores the sequence.
4. Every hint key resolves to a non-empty line in both languages; the chooser picks the expected key for
   12 named states (fixtures), and never a "tell me" line, because none exists.
5. A save code written by the model decodes to an identical model; a v1 code still decodes when the model
   is v2 (the migration owes its own save — the P100 lesson).
6. Sensors read the world only: no script reaches the DOM; `Olive says …` is a sensor over the last
   answer, so a program can be gated on it without the kit knowing Olive exists.
7. The Predict step: given a program and a world, `predictEnd` returns the tile the robot ends on; the
   game compares the child's tap with it.
8. Two robots: two programs step in turn on one world without sharing a Variable (D57).
9. No script contains a backtick in a comment; the generator's gate greps for it.

## 4. How to build it

- Precedent: `tpl007Scripts.ts` (23 scripts) and `tpl007Engine.test.ts` (115 gates), `tpl007Curriculum.ts`
  as the shape for the request array.
- Port the mockup's interpreter, `findRepeat` and `askOwl` from `bot-garden.html`; they are the reference
  behaviour the ACs were written from.
- Keep the world JSON small: the tablet parses it on every tick.

## 5. Gates

`tests/cg002Engine.test.ts` (AC1–AC9), run by `npm run template:garden`'s pre-step so a graph change
cannot ship an engine regression.

## 6. Traps

`Function` `Outputs` publish only on change (use a fresh object per tick); a `Variable` is global by
name; `flagOutputDirty` on a signal never; an `await` on a callback-style write is a no-op; a repeated
row sends one signal per update and the second wins.

## 7. Session 1 — what was built (2026-09-27, lane B, worktree `cg002-engine`)

Three files under `packages/noodl-mcp/tests/`, the TPL-007 shape (scripts as exported template-literal strings with
literal `Inputs.x` / `Outputs.y` lines, one `Logic/*` component each, `runScript`/`portsOf` as the harness):

- `cg002Scripts.ts` — 18 scripts: `Logic/New run`, `Step`, `Apply delta`, `Sense`, `Goal met`, `Find repeat`, `Fold`,
  `Unfold`, `Predict end`, `Choose hint`, `Hint line`, `Hint table`, `Palette`, `Add profile`, `Complete request`,
  `Encode save code`, `Decode save code`, `Translate words` (generated one line per word). The shared `ENGINE` block
  (world, sensors, flatten, step, apply, goal) is inlined into the five scripts that run a program.
- `cg002Content.ts` — the request schema (`id, islander, band, tricks, map, things, robotStart, schedule?, goal,
  palette, reward, copyKeys, referenceProgram`), 8 requests (the three D3 ones plus one per remaining trick), 21 hint
  keys EN+FR, 182 word keys EN+FR (both bands' block labels: `b*` the word, `c*` the caption).
- `cg002Engine.test.ts` — 97 tests, 3.3 s: `cd packages/noodl-mcp && npx jest tests/cg002Engine.test.ts`.

| AC | Status | Measured by |
|---|---|---|
| 1 | ✅ measured | 20 rows (8 requests × {en, fr} × every band from the request's own up: 2 open at band 7–9, 6 at 10–12 only) each run to `met: true`, 0 bumps, 0 puddles, ≤ 41 ticks; a band-1 row runs the unrolled program and every block is checked against the band's palette |
| 2 | ✅ measured | 200 seeded programs (81 with an `until`, 85 with a nested `repeat`, 81 hitting the guard; longest 574 ticks, mean 123 — counted on the emitted spec by `$SCRATCH/sample.js`) → identical deltas, glows and world twice; the guard runs a never-true `until` body exactly 40 times; `repeat 3 { repeat 2 { fwd } }` = 6 moves |
| 3 | ✅ measured | 30 fixtures → expected `{i, len, count, containerId}`; the 27 foldable ones fold then unfold to the same shape; the folded tulip program ends on the same world as the recording |
| 4 | ✅ measured | 21 keys × 2 languages non-empty and different, no "tell me" (EN/FR); 12 named states → the expected key; the ladder (done > bump > puddle) asserted; `MANY_BLOCKS` measured on the artefact (8 → `hintDone`, 9 → `hintDoneMany`) |
| 5 | ✅ measured | a two-profile family with a done request encodes to a 250-char `BG1.` code and decodes `toEqual`; re-encode byte-identical; a hand-built v1 code decodes with defaults and `migrated: true`; its re-save is v2 and `migrated: false` |
| 6 | ✅ measured | no script text contains `document`/`window`/`localStorage`/`sessionStorage`/`navigator`/`Noodl.`/`fetch(`; `olive_says` reads only `value`/`text` of the last answer (yes/oui, no/non, a one-of word; a fallback with no value is false); an `ask` parks with `{seq, rung, slots, lang, shape, temperature}`, drops a stale `seq`, resumes on the matching one |
| 7 | ✅ measured | the tulip program predicts (6,3) d=1, tap there hits, beside misses; a wall-walker ends at (7,3) with 2 bumps; an empty program ends where it starts; an `ask` predicts along the fallback |
| 8 | ✅ measured | two runs alternate on one world: pip (3,3) count 3, bo (4,1) count 0, ticks 10 and 6; no script text names `Noodl.Variables`/`Objects`/`Arrays`/`globalThis` |
| 9 | ✅ measured | every script text: no backtick, no `${` |

**Arms: 12/12 killed** (`$SCRATCH/mut-summary.txt`): left turns the wrong way (14 red), off-map not blocked (5),
until guard ×10 (2), findRepeat tie-break inverted (9), a bump beats done (1), migration never asks for its save (1),
predictEnd returns the start (3), the run held under one global name (34; the two AC8 behavioural tests red, the text gate green — a behavioural kill), unfold lays out n−1 copies (27),
`olive_says` ignores the answer (1), step returns the same run object (1), the code says v1 (2). Restored after each;
97/97 after.

**Decisions taken here** (say so if overturned):
- The **program block** is `{ id, t, n?, body?, slots? }`; `slots` holds `sensor`+`arg` (until/if), `event` (when),
  `name` (trick/do), `text` (say), `rung`/`args`/`shape`/`dial` (ask). A `repeat` with `slots.n === 'olive'` takes its
  count from the last answer (CG-005 AC1). Sensors: `wall_ahead tulip_ahead bowl_empty basket_full count_is olive_says`.
- The **world** is `{ map: rows, things: [{kind, x, y, watered?, food?}], robots: [{id, x, y, d, carry, basket?}],
  events: [], schedule: [{tick, event}] }`; `d` is 0–3 clockwise from up. Blocking: `W R T H` tiles, tulips and bowls.
  Every action acts on the **tile ahead** (water, pick, put, feed a bowl). A puddle forms on any in-bounds tile that is
  not water and has no tulip — including a rock (README §1's sentence); the mockup puddles only on walkable tiles.
- **`step` returns a delta; `apply` is the only writer** of the world, so the kit can animate from the delta and two
  robots share one world. A `when` handler is spliced in at the top of the tick whose scheduled event fires; a run with
  handlers idles until the schedule is exhausted. The `ask` step parks until an answer whose `seq` matches (or has none).
- **The save model** is v2: `{ v, family, profiles: [{id, name, band, lang, face, robot, tricks, stickers, hats}],
  island: {done, placed, activeId} }`; v1 is the same without `tricks`/`stickers`/`hats`/`placed`. `Decode` reports
  `migrated` so the page saves at once (the P100 lesson). A request done by either profile is done (D2); each profile
  blooms its own tricks and keeps its own hats.
- **The hint ladder**: empty · pattern (cover ≥ 4, no container yet) · Olive resting · Predict miss · done / done-many
  (> 8 blocks) · bump · puddle · the rung just played · missed ({w} of {t}) · start.

**Findings** (each is a residual with an owner):
- 🔴 **The mockup's `until` never loops**: `runStep` splices the body after the `until` and moves past it, so the body
  runs once and the 40-guard is dead. The engine loops (as §2.3 and "walk to the wall" need). Owner: CG-007, when the
  mockup is used as the look reference only — no code to change; the gate pins the engine's behaviour.
- 🟡 **The mockup's tie-break** (equal coverage → the LONGER sequence wins) makes `F F F F` fold to `repeat 2 { F F }`
  and `F L R F L R F L R F L R` to `repeat 2 { F L R F L R }`, not `4 ×`. Ported as-is and pinned by fixtures 2, 6,
  12, 24, 25, 29. A child would probably expect the higher count. **Owner: Richard, a ruling**; one comparison to flip
  and six fixtures to re-derive.
- `ENGINE` is inlined into five scripts (~17 KB each, ~85 KB of script in the template). One-time parse, not per tick;
  the per-tick cost is the world JSON, which stays under 1 KB for the mockup map. Owner: NONE unless the tablet says so
  (CG-001 AC9 / CG-008).
- `world.events` (the page's queued events, e.g. a tapped Biscuit) are consumed by the first run that ticks; with two
  robots the first handler wins. `schedule` is per tick and reaches both. Owner: CG-003 if a page needs both to hear it.
- **Not done here, by design**: the `npm run template:garden` pre-step that runs this gate is CG-003's (the generator
  does not exist yet); the `Logic/*` components themselves are generated there from `FUNCTION_SCRIPTS`. No drive: the
  engine is pure and every AC is graded in the spec. Requests beyond the eight are CG-006's; the Olive rungs' content
  and the stub Olive are CG-005's (the interpreter's `ask` step and the `olive_says` sensor are here for them).


## 8. Session 3 — the save model: one island per kid (lane LOOK, 2026-09-28; ruling 8)

**The model is v3** (`SAVE_VERSION = 3`): each profile carries `island: { done, placed }`; the family keeps `activeId`.
`model.island` is the island ON SCREEN — `activeId` plus `done`/`placed` DERIVED from the active profile (the very same
arrays, so every reader of `model.island.done` reads the playing kid's, and a writer to it writes hers). `modelOf`
re-derives it on every read and never reads it back from a v3 model, so a stale copy in storage cannot leak into anyone's
island. `Complete request` marks the kid who played; a sibling's island still offers the request. `activate(model, id)`
is the one place the island on screen follows the chosen kid (Add profile, Select profile). The code packs each kid's
island in her row (`[…, hats, done, placed]`); `d`/`pl` are gone. `ROBOT_NAME_MAX = 16` is exported for the name boxes.

**The migration rule (a v1 or v2 family had one island): EVERY existing profile keeps what the family had done and
placed.** Least surprising: nobody loses a request they finished together; from now on each kid's island moves on its
own. It applies to a stored MODEL (`modelOf`) and to a CODE (`Decode save code`, `migrated: true`). **The migration
owes its own save:** `migrationDue(raw)` is true for a stored model older than v3 with anyone in it; `Read family`
publishes it as `migrated`, and every page writes the migrated model back at once (CG-003 §8), so the next read
migrates nothing and a re-encoded code is v3.

| Row (AC5, `cg002Engine.test.ts`) | Status | Numbers |
|---|---|---|
| one island per kid | ✅ | A finishes the tulips: A `['tulips-three']`, B `[]`; the island on screen is B's; through the store and back, A on screen reads hers (the same array); done twice = once; no profile given = the active kid |
| a stale family-level copy never leaks | ✅ | a v3 model with `island.done` tampered reads each kid's own; `migrationDue` false |
| v3 round-trip | ✅ | code < 600 chars, `v: 3`, no `d`/`pl`, each row's `[12]`/`[13]` her island; decode `toEqual`; re-encode byte-identical; `migrated: false` |
| a v2 code | ✅ | two kids both get `['tulips-three','path-postbox']` and the placed stone, as two arrays (not one shared); tricks/stickers/hats kept; `migrated: true`; its re-save is v3 and not a migration |
| a v1 code | ✅ | the family's done to the kid, `placed: []`, defaults; re-save not a migration |
| a stored v2 model | ✅ | `migrationDue` true → `modelOf` v3 by the rule → written back: `migrationDue` false and `modelOf` unchanged; known-firing: null/empty not due, v1 due |
| the robot's name | ✅ | kept to 16 |

**Gate: 115/115** (was 105; the AC5 block is rewritten, lane CONTENT's rows untouched; the three imports this block reads
are one separate import line). **Arms (in-spec, anchor must occur once): 5/5 killed** — the migration gives the family's
island to the active kid only; a v3 model read from the family-level copy; Complete request marks every kid; the
migration never due; encode drops a kid's done. Lane CONTENT's `cg006Requests.test.ts` (which reads
`model.island.done` after the active kid completes) stays green through the derived island: 107/107 with cg005.
