# P107 — next session

**Written 2026-10-08 (s58).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s58's record is
[NSP-016 §7.19](NSP-016-VISUAL-NODES.md) (the Component Stack's Use Routes); s57's is §7.18 (the Page Router).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **16 of 19 conform. The Component Stack v2 (s58): Use Routes** on both targets. Left: Repeater (`For Each`), Component Children, Columns (geometry). AC4 waits for NSP-017 | `aa8abb06f` … s58 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (no format change in s58) | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**122 of 147 conform on the runtime (83.0%)**, unchanged: the Component Stack already counted; v2 grades what v1 left undriven.

## What s58 settled

1. **The Component Stack v2 — Use Routes** (component-stack.ts, 145 scenarios, four acts: `push`, `replace`, `back`, `traverse`).
   Every reset with Use Routes on reads the URL; a push, a replace and a back's end push the top page's URL; the stack hears `popstate`
   whatever Use Routes says. `pagePath-<id>` is a derived input when `useRoutes === true`. **No format change**: s57's seam (the
   location on the page, `traverse`, `history` answers) carried it. 29 probe cases matched first try; the 47 `ROUTES:` matrix
   scenarios matched first try; no generated sequence diverged at six seeds or at 10,000.
2. **Rows C119–C127**, all open, ledger. C119 (medium — the browser's Back resets every Component Stack, Use Routes or not), C120
   (medium — a Pop pushes a new history entry, so Back shows the popped page alone; a Replace adds one too), C121 (low — the last page's
   query stays in the address), C122 (medium — query parameters unencoded; a `%` empties the stack at the next reset), C123 (low — a
   page asked for by its label has the URL `#`), C124 (medium — a malformed escape in the query or a path part empties the stack: C115's
   twin), C125 (low — a Path wired null: C116's twin), C126 (low — Reset shows the URL's page, not the start page; a ruling), C127
   (low — the catalog has no `pagePath-<pageId>`, so the MCP cannot give a page a Path).
3. **Where the handoff was right, checked:** the visual batch passed on top of P109's C81 fix (52fdaf088) before anything was built on
   it — 35 / 35 with the page model.

**Readings (2026-10-08, on the s58 tree; HEAD a6caefdde + this session's files).** Visual batch + page model before the build: 35 / 35
(604 s). Interpreter with mutants (145 scenarios): CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742,
20745, 7 — every mutant killed but the one declared — and at 10,000 on 20734 (801 / 802) and 20733 (840 / 841). Runtime: the 47 new
scenarios side by side with the interpreter, identical; `NSP_ONLY="Page Stack"` CONFORMS at 200 on 20734 (791 / 792), 13, 20733,
20729, 7, 20735 — 0 divergences each — and at 10,000 on 20734 (0 divergences, 110 s). The runtime conformance test (`NSP_ONLY` = Page Stack, PageStackNavigate, PageStackNavigateBack, PageStackNavigateToPath, Router, RouterNavigate, PageInputs; seed 20734) all CONFORM — Page Stack 791 / 792, Router 349 / 353, Pop 1184 / 1193 (the declared); runtime target + graph 106 / 106; the node-spec package suite 22 suites, 955 passed (stranger rounds 1–4, catalog parity, page model, visual batch; `-w 2`); both packages' tsc clean.

## What s59 does

1. **Tell P109 the new rows** if s58's message did not land (peer `opennoodl-1e`; one short line: C119–C127 are filed, P107's, open).
   When one of C96–C127 is fixed, its scenario's behaviour moves with it (a spec version) in the same commit — P109 does that for its own.
2. **The next visual node: the Repeater** (`For Each` — DEFINITIONS + collections + per-item ports + its own async creation). It is
   the last of the three that place children with ports (Component Children has none; Columns waits for geometry). Read
   `noodl-viewer-react/src/nodes/std-library/data/foreach.tsx` and s15's DEFINITIONS first; the Component Stack's queue machinery is the
   nearest model for its async creation.
3. **Write the matrix first** (s51, s56, s57, s58): every request × paint × an observer frame; then run mutants at ten seeds and 10,000.

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- **New (s58), C120:** when the app's own Back button pops a Component Stack page, should the browser's history step back too (so the
  browser's Back goes where the person expects), or should the popped page's entry just be replaced? Today a new entry is added.
- **New (s58), C126:** with Use Routes on, should a Component Stack's Reset go to the start page (what its description says), or
  re-read the address (what it does, and what the Page Router's Reset does)?
- **New, optional (s55):** should a Drag's Start Drag X that arrives as text ("50") be read as a number?
- **New (s56):** should turning a Component Stack's Mounted off and on keep its pages? Today it rebuilds its start page.
- **New (s57), for P109 to weigh with S18:** should an unnamed Page Router be in the project's index, or should the editor always name one?
- **R7, R8, R4's confirmation and G1**, and NSP-017's question about the templates' CSS sheets, as before.

## Before you start

- **R11 / R12:** keep React out of the spec. Run `tests/page-model.test.ts` for a new visual spec (and add its model).
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`. **P109 (peer `opennoodl-1e`) runs the runtime conformance test in a loop
  from its worktrees**, so there is never a gap to wait for: queue a heavy run behind the peer's current PID in a background command,
  and run the node-spec suite with `-w 2` (the visual batch alone is ~600 s in one worker and bounds the wall time; seven workers put
  the load at 15 on 8 cores for no gain). **The `/next` state file is P109's.**
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's (20734 on
  2026-10-08). The probe pair (s57, s58): a jest file in `noodl-runtime/test/node-spec/` that plays a JSON list of cases on the runtime
  target and the interpreter (`play` + `new World(script)`) and prints both traces, and one in `nodegx-node-spec/tests/` that runs
  `runConformance` with mutants at a list of seeds — both deleted before the commit (zz-*; the census counts zz files).
- A scenario that turns Use Routes on needs a `world.viewport` (no viewport, no location). An ABSENCE scenario needs a firing control
  beside it. A new ACT kind goes in the face and the spec's `acts`.
