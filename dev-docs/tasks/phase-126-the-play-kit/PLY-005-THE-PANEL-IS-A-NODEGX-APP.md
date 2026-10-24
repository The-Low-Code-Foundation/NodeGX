# PLY-005 — The panel is a NodeGX app

**Phase:** [126](README.md). **Depends on:** PLY-002, and lane 2's Studio V1 (the claim is a person editing in Studio).

## What

The NodeGX half, held to what Richard ruled it is for: *"it opens up the possibility for easier game editing and
tweaking in the future, not that it makes the development faster."*

- **The world is one kit node.** A `Game World` node (in `@nodegx/three-kit` or beside it) hosts a PLY-002 game: the
  engine's state comes out as outputs, verbs go in as signals. Inside it the code is the game's own. No per-frame
  logic in the graph.
- **The panel is components.** Shop, roster, stats, plan, settings, title and pause menus are NodeGX components over
  those outputs. They are what a person opens in Studio and changes: a price, a label, a new menu row, a colour.
- **The records are the backend.** Saves, profiles and async shared state (Threadspace's `net.mjs` shape) go in
  lane 6's backend, not localStorage.
- `npx @nodegx/play new --nodegx` writes this shape; the plain starter stays the default.

Read before building: OWN-023 round 2 (`../phase-112-your-own-nodegx/own-023/ROUND-2-THE-GALA.md` §9). Wrapping the
whole game in a NodeGX page proves nothing; converting the panel does. The B2 run split the code rather than shrinking
it. The claim here is editability, so measure editability.

## Acceptance

- **AC1.** The PLY-002 starter, built with `--nodegx`, plays the same as without it (the drive's screenshots match within
  tolerance, and the state checks are equal).
- **AC2.** A person who does not code changes three things in Studio (a price, a label, one new menu row) with no code
  edit, and the game shows them on the next play. Richard first, then a stranger in lane 3's person test if it runs.
- **AC3.** A save survives a reload through the backend, and a second profile does not see the first's save.
