# IG-004 — The island as a world: plots, pinned programs, robots seen working

**Opened 2026-09-28**, from README §1 global point 1 and ruling R1 (the sentence TPL-012 §2.3 promised and
P105 R10 dropped). **Status: ⬜ not started.** Depends on IG-002 (the vocabulary), IG-007 (the renderer it is
drawn with; the 2D `Garden` is the fallback and the test renderer). Lane B. **The biggest task in the phase.**

## 1. The person sentence

> **A child opens her island and sees it whole: the plot she finished last week, with her robot still
> watering the row; the islander on the next plot waiting; a fenced plot she cannot enter yet. She pans
> to the waiting one, and when she wins it her robot stays there, working, while she zooms out to watch
> both.**

## 2. What it is

- **One island per kid: a 24×16 grid** (384 tiles; the mockup IG-000 fixes the exact layout: sea around,
  the house, the pond, the rock field, six plots of 8×6 with paths between). Its base map is a Static Data
  in `cg003Content.ts`; each request's map becomes **the plot's tiles**, stamped at the request's `plot:
  {x, y}` (schema field, `cg002Content.ts`). The Workshop shows the plot only (the camera framed on 8×6),
  the Island shows everything.
- **Save model v4** (`cg002Scripts.ts`, migration from v3 that keeps every field): per profile,
  `island.plots: { [requestId]: { program, robotId, wonAt } }` and `island.robots` (IG-005; v4 ships with
  the one robot). `placed` goes (never written). The save code packs it; the Grown-ups paste box restores it.
- **A won plot keeps its program.** `Complete request` writes `program` and `robotId` into the plot. The
  robot is **pinned**: it is drawn on that plot on the Island page and is not available for another request
  until the child unpins it from My robots ("bring {name} home"), which clears the plot's program and leaves
  its things as they were won (the tulips stay watered, the path stays laid).
- **The island tick.** One `Logic/Island tick` script on one timer (`Step Ms × 2` on the Island page): it holds
  one engine world for the whole island (all plots' things, all pinned robots) and calls `step` for each
  pinned run in turn. When a pinned run ends, the **plot resets**: its things return to the request's start
  state and the robot to its start tile, then the run restarts — the robot is seen working forever, the plot
  is seen done. No Olive on the island tick: every ask takes the fallback (as `runToEnd` does).
- **The Island page** (`cg003Components.ts` `Pages/Island`) is rebuilt on the renderer: the whole island,
  the islanders as things with a bubble when their request is open, a padlock on a plot whose request the
  band or the tricks do not yet allow, a tap on a plot opens its request card, a "find my robots" button.
  The sea with pins goes; the pins' scenery becomes island tiles.
- **Free play** is a seventh plot, "the garden", never pinned.

## 3. Acceptance criteria

1. Save v3 → v4 migration: a v3 save code from P105 pastes and restores every profile, done request, hat and
   sticker; the engine gate has one v3 fixture per band.
2. Engine gate: two pinned runs on one world step in turn without touching each other's robot; a pinned run
   that ends resets its plot's things and restarts; 200 ticks with three pinned runs stay under 5 ms a tick
   in the bare `vm` (the tick is on the tablet's CPU beside Olive).
3. Page drive (2D `Garden` as the drive renderer, IG-007 §5): win tulips → the Island shows the robot on the
   tulips' plot stepping; open path-stones → the robot is "at work on the tulips" and the card offers "bring
   {name} home" → the robot is free, the tulips stay watered.
4. The Island renders every plot from the requests' maps; a request whose `plot` overlaps another fails the
   content gate at generate time.
5. A plot the band cannot do shows the padlock and a one-line reason ("Cobble can lay stones — Sami lends him
   after the letter", IG-005) in both languages.
6. 24×16 with three robots animating: p95 frame ≤ 33 ms on the tablet in the 3D renderer (IG-007 AC3 reads it),
   and ≤ 50 ms at CPU ×4 on the Mac in the 2D renderer (the CG-001 AC9 method).
7. Both languages, both sizes, 0 console errors; the save code round-trips through the Grown-ups box; the
   packaged Mac app's upgrade drive (P105 CG-004) passes over a v3 save.

## 4. How to build it

The save model and migration first, with the gate; then the island world and the tick in the engine; then
the schema field and the base map; then the Island page on the renderer behind a `renderer` States node
(`3d | 2d`, IG-007 decides at runtime); the Workshop keeps its scene but reads the plot from the island. A
new mockup screen (IG-000) is graded before the page is built.

## 5. Gates

As IG-001 §5, plus: the engine tick timing in the `vm`, the migration fixtures, the packaged upgrade drive.
The page drive runs on the 2D renderer (headless, no GPU); one 3D screenshot on the Mac is looked at.

## 6. Traps

A `Variable` is global by NAME (P105 D57): the pinned runs need an id each, not one `gardenRun`. The island
tick and the Workshop Runner must never both step the same robot: the Workshop takes the plot's robot OUT
of the tick while the request is open. `island.placed` was never written by anything — do not migrate it,
drop it. An on-load migration owes its own save (`an-on-load-migration-owes-its-own-save`).
