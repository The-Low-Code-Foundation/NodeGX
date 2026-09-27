# CG-002 — The engine: the interpreter, the fold, the hints, the save

**Opened 2026-09-27**, scoped from TPL-012 §2–§3. **Status: ⬜ not started.** Depends on nothing. Lane B.

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
