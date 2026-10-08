# Next session — P109 session 31

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 30 (2026-10-08, on `cline-dev`):** landed `7496d93f0`…`ddf76bce5` by compare-and-swap over P107's open edits:
ISL-031's **C79** (`7496d93f0`) and **C78** (`23d91e383`), ISL-048's **C101** (`534203afc`, high: a tap inside a Drag on a touch
screen) and the Page Router's **C115** (`6096fadae`), **C116** (`34218468a`), **C118** (`d85e4e6d9`), **C117** (`47f987ef6`), and
the page-model helper (`ddf76bce5`). Scoped **ISL-048** (`34c76830f`; C101–C118, then C119–C127 from P107 s58) and **ISL-049**
(the Repeater, C128–C131 from P107 s59) and **ISL-050** (the Columns, C132–C134 from P107 s60). **C77 is built and NOT landed** (branch `p109-c77-wip`, `a133d19b6`). Board: **23 of 50
closed**. Records: ISL-031 §11, ISL-048 §8.

## Do, in this order

1. **Land C77 (ISL-031's last row).** Branch `p109-c77-wip` (`a133d19b6`, based on the old C78 `695407efb` — cherry-pick it onto
   `cline-dev`; the runtime half is `drag-drop.ts` `elementChanged` + `react-component-node.ts` `setDOMElement`). The runtime half
   is right and its control is red on 14 / 110 / 110 / 23 / 12 scenarios (Text, Shape, Image, Group, Video). **The spec half strands
   ~630 interpreter mutants** (Text 215 at seed 13): with the tabindex on every element, whether an act's paint or the frame end
   made the new element shows nowhere. **P107's ruling (s30, by message): remove the state the fix made unobservable in the spec
   version that lands C77 — do not declare a class of equivalents ("a hole shaped exactly like C77"). Declare individually only a
   field another output still reads, and name that output. Keep C77's scenarios (remount / new Tag / late mount, each with a key
   or press after it) as the regression.** Tried and dropped in s30: keeping `attrsOn` set at every new element (no effect), and
   having every paint write all its keys (216 → 52 on the Text, all equivalent). Start by asking which state still has a reader:
   `elem` is read by the file drop's count (`depthOn`, `fileOn`, C81); `shownTag` decides when a new element is made; the act-time
   paint exists because "a person acts on a painted page". The mutant probe (below) tells you in 45 s per node.
2. **ISL-048 (22 left of 27).** Worst first: the Component Stack's never-answered requests (C107, C108, C109, C110, C111, C112) and
   their Use Routes twins (C119, C122, C124 — C124 is C115's twin: the same guarded decode), then C113, C114, C121, C123, C125, C127,
   the Drag's C102, C105, C106. **Ask in one batch** (plain words, what the node is, recommendation first): C103 and C104 (the
   Drag: draw every child or warn; pass CSS Class / Style through or drop the ports), C120 (which history a Pop leaves) and C126
   (a Reset with Use Routes: start page or the address). P107 rewrote the Page Stack spec (v2, `841f0dfe3`) — read it first.
3. **ISL-049** (the Repeater): C128 first (high, as proposed); ask C129, C130, C131 in the same batch as item 2's asks.
4. **ISL-050** (the Columns, P107 s60 `caee8df0b`): C133 first (high: a non-text Medium / Small Layout blanks the page), then C134;
   ask C132 with the batch above. C133 and C134 are known rows (C133 also WITHHELD): drop them with the scenario's `row` mark.
5. ISL-013 slice 2, ISL-018 AC5, ISL-012 AC3 (unchanged from s29's list). **Track G** (ISL-039 … ISL-047) waits on Richard's order.

## How to work beside P107 (s29's rules, still true)

- P107 grades the specs in the same tree and often has OPEN edits on `conformance.test.ts`, `page-model.helper.ts`,
  `node-spec-target.ts`, `equivalent-mutants.ts`. Build in a worktree (`scripts/devtools/make-worktree.sh <name> HEAD
  /Users/richardosborne/vscode_projects/OpenNoodl-worktrees`), grade there, cherry-pick onto a landing worktree cut from the
  current `cline-dev`, run the gates there, and land by compare-and-swap (recipe below). Tell P107 the hashes after.
- One heavy job at a time: P107 runs long jest batches in the primary tree (`ps` for `jest` before starting yours).

## What s30 learned (read before touching a modelled row)

- **A modelled row is not a known row.** C77, C78 and every Component Stack / Router / Repeater row are COPIED by the spec (R3), so
  a fix is a spec version, not a `KNOWN_ROWS` drop. Find which scenarios it changes by diffing every scenario's interpreter trace
  before and after the spec change (s30's `zz-s30-alltrace.test.ts`: `play(interpreterAdapter(...))` per scenario, values and
  signals, written to JSON); rename only the changed ones whose NAMES claim the old outcome — a matrix name that describes the setup
  stays true. Note the trace filter: answers (`navigate`, `page`) are not values or signals, so a probe on the runtime with a control
  finds those the trace diff misses.
- **A fix to a modelled row strands mutants — measure before the runtime grade.** Interpreter probe, 45 s on the Text:
  `runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed, mutants: true, equivalent:
  EQUIVALENT_MUTANTS[type] })` at seeds 13 and 20732 (s30's `zz-s30-mut.test.ts`, scratch only). C78 stranded 27 on the Text: dead
  state first (`pointerAt`, writes of `inZone: false` where it was always false), then scenarios that read the rest (a click a
  swallow eats while it ends a pending press; a held finger, then a mouse click; the SECOND card, so a swapped example is not the
  same card), then 3 declarations where the twin writes what the state already holds. C117 stranded 2 on the Router (a reset now
  Done where it threw): one scenario killed both.
- **A swap-branch mutant returns the sibling's whole recorded patch** — values and all (`runner/mutants.ts` `mutatePatch`). Two
  branches that write the same values in a state that already holds them are equivalent; no scenario kills that.
- **The page model names every state key** (`tests/page-model.helper.ts` G1): removing or renaming spec state turns
  `page-model.test.ts` red. It is in the spec-package gate list below; s30 met it at the landing gate.
- `make-worktree.sh` worktrees: `p109-s30-head`, `p109-s30-c78`, `p109-isl031-drag`, `p109-c101`, `p109-s30-land` are spent (the
  branches hold nothing unlanded except `p109-c77-wip`). Remove them with `git worktree remove` when convenient.

## Gate readings taken s30 (2026-10-08)

- **C79** (`e333ed24d`, landed as `7496d93f0`): runtime Text, Shape, Image, Group conform at 13 and 20732. Control: HEAD's
  react-component-node.ts red on exactly the 20 C79 scenarios.
- **C78** (`695407efb`, landed as `23d91e383`): runtime Text, Shape, Image, Group, Video conform at 13 and 20732; interpreter mutants
  at 13 and 20732 all killed or declared (Text 2,710 / 2,717, Shape 1,821 / 1,830, Image 1,850 / 1,859, Group 8,944 / 8,966, Video
  3,110 / 3,119). Control: drag-drop.ts before, red on 27 / 28 / 27 / 28 / 9 of the scenarios naming it.
- **C101, C115–C118** (landed as `534203afc`…`47f987ef6`): Router 137 / 137 on the runtime at 13 and 20732; Router interpreter
  mutants 445 / 449, 0 survivors at both seeds; controls red on exactly 8, 2, 17, 29 (Router) and 7 (C101's jsdom regression).
  **Drag at seed 20732: one surviving mutant (afterInputs drop-set, `willUnmount`, `snapToPositionX.do:done`) that is there before
  any P109 change** — P107's, reported to them; Drag at 13 conforms.
- **Landing tree** (`ddf76bce5`): spec package page-model, page-model-plants, catalog-parity, schema, batch-visual, world, stranger
  — first run 491 / 515 passed (18 skipped), the 6 red all `page-model.test.ts` G1 on C78's and C117's removed or renamed state;
  after the helper fix `page-model.test.ts` alone re-run, 19 / 19 (the other six suites were green in the first run);
  viewer 1,815 / 1,815, viewer tsc 0; spec tsc 0.
- `bugs.js check`: the same five problems as s28/s29, none from s30's rows.

## Decisions for Richard (not yours)

- **Track G's order** (asked s29, not answered): ISL-039 data-loss blockers, ISL-040 security holes, or ISL-013 slice 2 first.
- **The asks in items 2–4** (C103, C104, C120, C126, C129, C130, C131, C132) — one batch when those tasks are next.
- Carried from s29: the layout of an unlabelled control in a real browser; `P109-S24-SIGNINWITHERRORKEPT`,
  `P109-S22-BUILTINBOUNDARY`, `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing
  `cline-dev`, publishing the Garden kits at the origin.

## Handed over (owed by another phase)

- **P18 (export):** none of s30's fixes were checked on the exported app (pointer events at Opacity 0, the self-drop, a tap inside a
  Drag, the router's query decode, null Url path, blank-named navigate, parameters after Back). Plus s29's list.
- **P107:** the Drag's surviving mutant at seed 20732 (above). C100 (a `<video>` takes no pointer) still open.
- **Release notes, add (s30):** an invisible element no longer catches clicks after its Pointer Events is written; a drag never
  drops an element on itself; a button or field inside a Drag works on a touch screen; a link with `%zz` in its query no longer
  blanks the page; a Page Router with a null Url path works; a Navigate pressed before the router is on the page arrives; after a
  Navigate, Back to the same page with other parameters shows them.

## Recipes

- **Landing over a peer's open edit (s30, exact):** cut a landing worktree from current `cline-dev`, cherry-pick, gate. Then in the
  primary tree: snapshot each dirty landing path (`cp p <scratch>/p.peer`), `git show <old HEAD>:p > p.base`, `git show <new>:p >
  p.mine`, `git merge-file -p p.peer p.base p.mine > p.merged` (resolve an adjacent-hunk conflict by hand: theirs + yours); check the
  multiset of changed lines `diff(p.mine, p.merged)` equals `diff(p.base, p.peer)`. Then in ONE command: `cmp` each peer file
  against its snapshot (abort if it moved), `git update-ref refs/heads/cline-dev <new> <old>`, `git checkout HEAD -- <each clean
  landing path>`, `git reset -q -- <dirty paths>`, copy the merged files in.
- **A control:** back up the file by name, `git show <commit before>:$f > $f`, run the probe, restore in the same command and `cmp`.
- **A fast runtime probe:** a throwaway test calling `runConformance(spec, withViewerNodes(runtimeTarget()), { sequences: 0,
  mutants: false, scenarios })` with `loadScenarios(type)` filtered by name (s30's `zz-s30-probe.test.ts`, never committed). Without
  `known`, a Video scenario needing a pointer fails on C100 — mark such scenarios `"row": "NSP-016 §6 C100"` as the others are.
