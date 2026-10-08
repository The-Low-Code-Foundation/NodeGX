# P107 — next session

**Written 2026-10-08 (s57).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s57's record is
[NSP-016 §7.18](NSP-016-VISUAL-NODES.md) (the Page Router); s56's is §7.17 (the Component Stack).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **16 of 19 conform. The Page Router v1 (s57)** on both targets. Left: Repeater (`For Each`), Component Children, Columns (geometry). The Component Stack's Use Routes is v2 (the seam it needed exists now). AC4 waits for NSP-017 | `aa8abb06f` … s57 |
| NSP-023 the spec without React | ✅ all six ACs (s50); s57 added the Page Router's page model | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes refreshed s57: an additive format change) | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**122 of 147 conform on the runtime (83.0%)**: T5 16/19.

## What s57 settled

1. **The world's LOCATION is on a visual play's page.** In a play whose world has a location, the page's window is that browser:
   its `history.pushState`, `open`, a `popstate` / `hashchange` dispatched on it and their listeners are the world's (the face's
   `installPage(location)`); `window.location` stays jsdom's (Unforgeable) — pages read the bare `location`, which was the world's.
   The person's Back / Forward is `WorldLocation.traverse` (and a patch's `traverse`): the href moves, nothing is recorded, `popstate`
   runs. This is what the Component Stack's Use Routes v2 needs.
2. **The Page Router conforms** (page-router.ts, 136 scenarios, acts `navigate` and `traverse`). Format, additively: `answer` gains
   `navigate` and `page` (`params`: what a Page Inputs is handed); an `AnswerCall` may be a `history` or `open` call, recorded in its
   place (several builds land at one yield); `WorldView.href()`; `WorldPool.locations` (drawn only when a pool names some).
3. **The project's page index lists only NAMED Routers** (noodl-editor `utils/exporter/router.ts` `getRouterIndex`): an unnamed router
   matches no URL — P109-S18 seen from the runtime. Most scenarios place the router as `Main`; three `UNNAMED` ones say the rest.
4. **Children Count in a mounting frame**: late only for what the MOUNT starts (React's commit runs after the frame's last update
   pass); what the frame's callbacks started before the paint is counted at once — the spec's `early`. (C114's rule, made precise —
   the Component Stack's spec still says the coarser rule and passes; check it there if a seed finds it.)
5. **A spec sends an output at its flag** when one reducer can flag it twice (two builds at a yield: "About" then `undefined` — the wire
   keeps "About"). `view.send(port, state)`, s9's mechanism.
6. **Rows C115–C118**, all open, ledger: C115 (medium — a malformed escape in a link's query blanks every Page Router), C116 (low —
   Url path null), C117 (medium — after a Navigate, Back to the same page with other parameters keeps the old ones: `currentPageComponent`
   is written only by a reset), C118 (low — a blank-named Navigate queued before the router mounts is never replayed).
7. **The Button's mutant at seed 20734** (today's rotation; P109's D30 branch, the Text Input's s56 twin) killed by two scenarios —
   the Blur is the reader.

**Readings (2026-10-08).** Interpreter with mutants (136 scenarios): at 200 on seeds 20734, 20733, 13, 20729,
20735, 20736, 20741, 20742, 20745 — CONFORMS, every mutant killed or declared (4 declared) — and at 10,000 on 20733 and 20734 (369 /
373, 393 / 397). Runtime: the 136 scenarios side by side with the interpreter, identical; CONFORMS at 200 on 20734 and 13 and at 10,000
on 20734 (0 divergences, 105 s); the runtime conformance test (`NSP_ONLY` = Router, Page Stack, RouterNavigate, PageInputs,
PageStackNavigateToPath, External Link, Show Popup, Button, Drag; seed 20734) all CONFORM — Router 349 / 353, Button 690 / 698 (the
declared); runtime target + graph 106 / 106; the node-spec package suite 22 suites, 955 passed (stranger rounds 1–4, catalog parity,
page model, visual batch); both packages' tsc clean.

## What s58 does

1. **Tell P109 about C115–C118** once (R16 makes them theirs), and check its progress on C96–C114. When one is fixed, its scenario's
   behaviour moves with it (a spec version) in the same commit.
2. **The next visual node**: the Repeater (`For Each` — DEFINITIONS + collections + per-item ports + its own async creation), or the
   Component Stack's Use Routes v2 now that the location is on the page (smaller: the stack reads `location` at a reset and pushes on a
   push — read navigation-stack.tsx's `useRoutes` paths first). Component Children has no ports.
3. **Write the matrix first** (s51, s56, s57): every request × paint × an observer frame; then run mutants at ten seeds and 10,000 —
   each seed still finds a combination.

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- **New, optional (s55):** should a Drag's Start Drag X that arrives as text ("50") be read as a number?
- **New (s56):** should turning a Component Stack's Mounted off and on keep its pages? Today it rebuilds its start page.
- **New (s57), for P109 to weigh with S18:** should an unnamed Page Router be in the project's index (match its URL), or should the
  editor always name one? Today it shows its start page for every URL.
- **R7, R8, R4's confirmation and G1**, and NSP-017's question about the templates' CSS sheets, as before.

## Before you start

- **R11 / R12:** keep React out of the spec. Run `tests/page-model.test.ts` for a new visual spec (and add its model).
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>`; never `git add -A`, never `git stash`; one heavy job at a time. **P109 (peer `opennoodl-1e`) runs conformance back
  to back from `p109-c83`** — ask it for a window (it pauses its loop within minutes) and wait on its PID in a background command that
  runs your gate after it. **The `/next` state file is P109's.**
- **The runtime conformance test's `beforeAll` plays every listed spec:** always set `NSP_ONLY`. Its seed is the UTC day's (20734 on
  2026-10-08). A probe pair that served well this session: a jest file that plays a JSON list of cases on the runtime target and the
  interpreter and prints both traces side by side, and one that runs `runConformance` on the runtime with `scenarios: []` — both
  deleted before the commit (zz-*; the census counts zz files).
- A Router scenario needs a `world.viewport` (a router reads the URL; no viewport, no location). An ABSENCE scenario needs a firing
  control beside it. A new ACT kind goes in the face and the spec's `acts`.
