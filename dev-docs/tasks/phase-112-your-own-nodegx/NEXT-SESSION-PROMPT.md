# Phase 112 — next session

**Written 2026-10-02 at scoping, HEAD `3bb2e084e`.** Nothing in the task files is built. The prototype is: it is the
evidence the phase was scoped from, kept in `prototype/`.

## The board (re-derived from the task files, 2026-10-02)

| task | state |
|---|---|
| OWN-000 the prototype, measured | ⬜ never built |
| OWN-001 the format leaves the editor | ⬜ never built |
| OWN-002 the spec in a page | ⬜ never built |
| OWN-003 one way to run a graph | ⬜ never built (step 1 is a measurement, no ruling needed) |
| OWN-004 the real app beside it | ⬜ never built |
| OWN-005 the look, as a projection | ⬜ never built |
| OWN-006 the editor suite | ⬜ never built |
| OWN-007 the brief | ⬜ never built |
| OWN-008 three strangers | ⬜ never built |
| OWN-009 Richard's own | ⬜ never built |
| OWN-010 every bug teaches the kit | 🟡 ledger half built 2026-10-02 (`kit:` / `regression:` in `scripts/bugs.js`, rule in `dev-docs/bugs/README.md`); backlog untagged (76 suggestions), changelog and release gate wait for the packages |

**Built and driven:** only the prototype. `prototype/build.sh` then `dist/orbit.html#selftest` (must be 0 / 3, each
"Not yet" with its reason) and `#demo` (must be 3 / 3). Both read that way in headless Chrome on 2026-10-02 at
`3bb2e084e`, from the repo copy.

## What scoping settled

- **The format's home is `@nodegx/project-contract`**, not a new package: P107 NSP-021 §5 already said so. OWN-001
  moves, it does not rewrite.
- **The screen does not wait for visual specs.** `@noodl/preview` already renders a v2 project with no editor process
  (README §1 reading 5). R4 asks it in plain words.
- **The real problem on a real app is not the editor, it is how little runs in a page:** 19 of the todo template's 531
  nodes as the prototype ran them (rough count). The biggest lever is one shared `World` per graph (the prototype gave
  each node its own), the second is the real engine (R1).
- **NSP-021's census and round trip are built once**, by OWN-000 and OWN-006, and cited from both phases.

## What to do next, in order

0. **Whenever a session touches a package, tag its bugs** (`node scripts/bugs.js kits --suggest`), re-measuring each
   before writing its regression (OWN-010 §3.2).

1. **OWN-000.** `NEEDS.md` from `prototype/page.html` line by line, then `scripts/own/census.js` with the P107 census
   rule. It corrects README §1 reading 6 or confirms it.
2. **OWN-003 step 1**, the measurement: does `@noodl/runtime` run headless in a page, how big, what fails. Then ask R1
   with the numbers.
3. **OWN-001, OWN-002, OWN-005** in parallel lanes if a peer is free; OWN-001 touches the editor and the MCP, so run the
   editor's `test:ci` once, alone.

## Rulings owed by Richard (README §8, plain words there)

R1 what runs a graph outside the app (measure the real engine first) · R2 publish the kit to npm at 0.x · R3 the
method served by the `nodegx` MCP server and nodegx.io · R4 the real preview instead of waiting for visual specs ·
R5 the NodeGX look as an optional, generated package · R6 an open blocker stops a package release; lesser bugs ship as known issues.
