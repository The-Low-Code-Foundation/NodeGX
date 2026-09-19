# Phase 93 — Three views of one app

**Scoped:** 2026-09-17, from the proposal
[`future-projects/THREE-VIEWS-OF-ONE-APP.md`](../../future-projects/THREE-VIEWS-OF-ONE-APP.md) and
its mock [`future-projects/mocks/three-views-mock.html`](../../future-projects/mocks/three-views-mock.html)
(published at https://claude.ai/artifact/MKC17FNb6eTwa2fsdxvr37), read against `cline-dev` HEAD
`a2f5ce210`. **Status: 📋 scoped, nothing built. Prefix: `TVW`.**

> "It's a place that kind of sets NodeGX apart from all other low code editors. It doesn't reflect
> what's in your project folder. It doesn't reflect the DOM. It's a little space all by itself, a
> third way actually to organise components. […] a bit fucking stupid, but at the same time genius."
> — Richard, 2026-09-17, on the components panel

> "You've done it Watson. I think you've cracked it. The only thing I'd warn against is locking the
> visual nodes stack to the left side of the node canvas." — Richard, same day, on the proposal

**The proposal is the spec.** Read it first; it carries the diagnosis (§2, eleven measured rows), the
three options and why B (§3), the design surface by surface (§4), and the rulings (§7). This README
turns it into tasks and does not repeat it. The mock is the *look* every visual task is driven
against; scenario 2 (Hero on the canvas, Pricing in the preview) is the moment this phase exists for.

## 1. The person sentences

**The panel.**

> **Someone who opens a project sees two trees and knows which is which: Layers is what the page in
> the preview is made of, all the way down through the instances; Components is every part they
> have, grouped as pages, components and logic, each row saying where it is used or that it is not.**

**The preview.**

> **Someone who clicks a component and finds the preview still showing a page that does not contain
> it is told so, in one line, with the two doors out — the page it is on, or the Workbench — and
> which of those has the app's real data.**

**The canvas.**

> **Someone looking at a component's graph can see which nodes are its screen and which are its
> logic without knowing the convention, because the screen part is drawn as a region — wherever
> they chose to put it.**

**The bar.** A surface closes when Richard has looked at a screenshot and ruled it **WORTHY** (the
P81 protocol, kept by P92). The whole phase closes when someone who did not build it passes the
disorientation test that BEN-007 §C has been waiting on since August.

## 2. What is settled, and what this phase must not re-derive

The rulings in the proposal's §7 were accepted **as a whole** on 2026-09-17 ("you've cracked it").
One was corrected on the spot and is ruled outright. The rest inherit the acceptance; a task that
wants to depart from one asks, in plain words, before building.

| # | ruling | state |
|---|---|---|
| R-A | The word is **Layers** | inherited |
| R-B | Layers shows **the page in the preview, expanded through instances**, with the canvas's component lit as a region — never the canvas's own fragment again | inherited; the s2 correction that made the proposal work |
| R-C | Sheets retire from the UI; `#__cloud__` stays as the runtime section | inherited |
| R-D | The app preview **never moves because the canvas did**. A one-line strip says what it is not showing and offers the two doors, with the real-data / sample-values words | inherited; replaces the first draft's auto-Workbench |
| R-E | One panel, two tabs | inherited |
| R-F | The lane filter **dims, never hides** | inherited |
| R-G | The Workbench calls itself the Workbench — reverses FIX-019's one-string ruling | inherited; TVW-001 does the sweep |
| R-H | A `Logic` section exists; `empty` is the honest exception | inherited |
| R-I | The old component canvas returns as **the board**, a third Workbench target, never a third preview surface | inherited |
| R-J | 🔴 **Ruled.** The structure lane is drawn *around* the visual stack **wherever the user put it**. The stack is never pinned left; logic nodes stay free on every side with wires from either direction | ruled 2026-09-17 |

**Also settled, from the phases this one stands on** (do not relitigate):
- BEN R1–R5: one preview surface, two (now three) modes; the bench never full-bleed; the app preview
  is hidden, never unmounted; one always-present way back; bench inputs are preview state.
- FIX-018's instance look on the canvas (purple chip, diamond, stacked edge) stays; this phase adds
  the eyebrow and the door, not a new look.
- LGC-008: the trail is always visible. PAR-003: the trail is a breadcrumb, not open tabs. This phase
  changes what the crumbs *mean* when you arrive through an instance, not that.
- P92's scale (11/12/13/15/20 + 26), radii, tokens and the "Richard's look closes it" protocol.

## 3. The four numbers this phase moves

Measured at scoping from the code maps in the proposal's §2. Each is re-measured at TVW-010.

| # | number | at HEAD | end |
|---|---|---|---|
| 1 | Trees in the editor that list what is on the screen in the preview | **0** | 1 |
| 2 | Surfaces on which a placed component is called an *instance* | **0** | ≥ 3 (Layers row, canvas eyebrow, trail crumb) |
| 3 | Sentences shown when the canvas edits something the preview does not contain | **0** (one chip, bench case only) | 1, always, in the preview |
| 4 | Ways to organise the same component list | **4** (folder, sheet, kind, router) | 2 (role, folder) |

## 4. Tasks

**Order is dependency order.** TVW-001 first because it is the cheapest honesty and everything
visible after it is built on rows that already tell the truth. TVW-003 before TVW-004 because a tree
without shared selection is a second list, not a view.

### Track A — honesty, inside the surfaces that exist

| id | task | depends on |
|---|---|---|
| [TVW-001](./TVW-001-THE-PANEL-TELLS-THE-TRUTH.md) | The Components panel: highlight follows the canvas; `×N` / `unplaced` with *Used in*; sections by role with routes and the `not in a router` chip; sheets retired from the UI; *Open on the Workbench* promoted and the word swept (R-C, R-G, R-H) | — |
| [TVW-002](./TVW-002-THE-PREVIEW-SAYS-WHAT-IT-IS-NOT-SHOWING.md) | The strip in the preview, three shapes; `App \| Workbench` as a segmented control; the first instance outlined when the two agree; the app preview never moves because the canvas did (R-D) | TVW-001 |

### Track B — the missing tree

| id | task | depends on |
|---|---|---|
| [TVW-003](./TVW-003-ONE-SELECTION-THREE-SURFACES.md) | One selection model the canvas, the preview and (later) Layers subscribe to; design mode's preview → canvas link becomes two-way | — |
| [TVW-004](./TVW-004-LAYERS.md) | The Layers tab: the page in the preview, through every instance, with bands, the editing region, the note, the containment crumb and the footer (R-A, R-B, R-E) | TVW-001, TVW-003 |
| [TVW-005](./TVW-005-LAYERS-CAN-MOVE-THINGS.md) | Reorder and reparent from Layers on the page's own rows; refuse inside a band; drag a component from Components into Layers to place it | TVW-004 |

### Track C — the canvas

| id | task | depends on |
|---|---|---|
| [TVW-006](./TVW-006-THE-STRUCTURE-LANE.md) | The lane drawn around the stack wherever it is, the eyebrow, and the `All · Structure · Logic` filter that dims (R-F, R-J) | — |
| [TVW-007](./TVW-007-AN-INSTANCE-SAYS-WHAT-IT-IS.md) | The instance eyebrow and `Edit ›` on the node; the trail becomes containment when entered through an instance. **R-Z ruled (s19): the eyebrow is the COUNT ONLY, path on hover** — §2 fitted 0 of 2,385. **Slice 1 built (s20): the rules, the shared count source, the painter. 🔴 R-Z settled the text, not the ROW — four placements photographed and WITH RICHARD; `hover-only` ships meanwhile.** Slice 2 built (s21): the TRAIL — **AC3 ✅ AC4 ✅**, 53 specs / 12 mutants killed. Slice 3 built (s22): the HOVER and the `Edit ›` door, one surface — 80 specs / 16 mutants killed; 🔴 the door is NOT in the node's top-right 20×20, which is the connection-drag zone on 9,634 nodes. Left: AC1/AC2b/AC5 — all three need the drive (`drive-tvw007-hover.js`, written and UNRUN) | TVW-003 |

### Track D — the Workbench

| id | task | depends on |
|---|---|---|
| [TVW-008](./TVW-008-THE-BOARD.md) | **Reshaped by R-7 (s19): a PICKED set, placed by hand** — a third Workbench target holding the components you chose, side by side at their authored sizes, arrangement remembered. *Not* every component; §6 is why (0 of 99 projects fit at 100%). Slice 1 built | TVW-002 |

### The words, and the verdict

| id | task | depends on |
|---|---|---|
| [TVW-009](./TVW-009-THE-WORDS.md) | The five words everywhere; the three teaching sentences in their empty states; the rail tooltip; the vocabulary table as a docs page and a P73 step | TVW-001, TVW-002, TVW-004 |
| [TVW-010](./TVW-010-THE-DISORIENTATION-TEST.md) | BEN-007 §C run at last, by someone who did not build it, on the mock's five scenarios in the real editor; the after picture; Richard rules each surface WORTHY | everything |

## 5. Collisions

- **P92 (CHR)** owns the property panel and the launcher. This phase inherits its scale, tokens and
  row geometry (CHR-009's 30px rows, drawn chevron, one label column) for the Components and Layers
  rows and adds nothing to the scale. CHR-011's after picture and TVW-010's are different corpora.
- **P25 PNL-006** restyled the Components panel; its kind glyphs and indent guides are kept. Its
  "warning dot routes to Problems" follow-up is still open and is not this phase's.
- ⚠️ **TVW-008 stores a board in `project.metadata['bench.board']` — R5's THIRD knowing exception**,
  argued on the same test `bench.scenarios` and `bench.frame` passed: an arrangement someone made is
  authored intent, not session state.
- **P56 BEN** owns the bench. R1–R5 hold. TVW-002 and TVW-008 change the *scope control* and add a
  target; they do not touch the harness, inputs, outputs or scenarios. **BEN-007 §C closes here.**
- **P66 FIX-019** ruled the word *workbench* to one string. **R-G reverses that**; TVW-001 does the
  sweep and re-pins whatever spec pinned the caption.
- **P27 WFA-001 / P2 TASK-008** built sheets and the `hideSheets` machinery. R-C retires the UI, not
  the names; `#__cloud__` keeps its section. The WFA-001 F30 defect (mis-filed component) becomes
  unreachable rather than fixed.
- **P66 FIX-018** gave instances their look. TVW-007 adds the eyebrow and the door beneath it.
- **P59 LGC-008 / P24 PAR-003** ruled the trail always visible and a breadcrumb. TVW-007 keeps both.
- **P85** keeps asking for a design-system pass over the parts. TVW-008's board is where that
  happens; P85 is not changed.
- **P73** (the first tutorial) gains a step from TVW-009; P73 owns the tutorial's shape.
- **The MCP guidance** says "visual tree down a left column, logic in a right column". R-J makes that
  a default for auto-placed graphs, never a constraint. The `layout` doctrine text is not touched by
  this phase; a note is filed for P85's next loop.
- **`useSidePanelLayout`'s shared width** stops a 48px canvas jitter. The Layers tab is inside the
  same panel and does not change width.

## 6. Rules every task inherits

- 🔴 **Re-read the row at HEAD before writing on it.** Every `file:line` in the proposal is a
  2026-09-17 reading.
- 🔴 **Measure before you fix.** §3's four numbers are the baseline; re-count the artefact, never
  bump the literal ([[a-read-before-pointer-is-a-precondition-not-a-label]]).
- 🔴 **The app preview never moves because the canvas did.** Not to a route, not to the bench, not
  to the board. A task that finds it convenient to move it has found the disorientation.
- 🔴 **Drive the real thing**, both themes, on the packaged build or the dev stack over CDP
  (`NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 … --user-data-dir=<scratch>`). A jsdom spec is not a
  look. Screenshots go in `verdicts/<task>/<date>/`.
- 🔴 **Selection is one thing.** No surface messages another about what is selected; each reads the
  one model TVW-003 builds. A second selection store is the BCN-003 mistake.
- 🔴 **Editing editor `src/` full-reloads a peer's editor.** Say so first. One heavy job at a time.
- 🔴 **Do not scope by time.** Dependency order only, no estimates.
- The hex ratchet, the icon-url gate, the token check and the P92 scale gate stay green at every
  commit. The `test:ci` floor is whatever P88's last handoff records by name; a new red is yours.
- The close condition is Richard's look, and for the phase, the stranger's test.

## 7. The end condition

This phase closes when:
- TVW-010 has been run by someone who did not build any of it, on the five mock scenarios in the real
  editor, and they were not lost — measured by the §C protocol, not by asking;
- §3's four numbers read 1, ≥ 3, 1, 2 on the artefact;
- Richard has ruled Layers, the Components panel, the strip, the lane and the board **WORTHY**, each
  from a screenshot in `verdicts/`;
- every TVW task is built or recorded as disproved.

Not when the suite is green. It was green on the day this was scoped.

## 5. Where the phase stands (updated s22, 2026-09-19)

| id | built | driven |
|---|---|---|
| TVW-001 | ✅ | CLOSED — 8 ACs |
| TVW-002 | ✅ | CLOSED — 7 ACs |
| TVW-003 | ✅ | CLOSED — 6 ACs |
| TVW-004 | ✅ | AC1–5, AC7 green; **AC6's 20 shots SENT s18 — awaits Richard's look** |
| TVW-005 | ✅ | CLOSED — 6 ACs |
| TVW-006 | ✅ | AC1–4, AC6 green; **AC5's 18 shots SENT s18 — awaits Richard's look** |
| TVW-007 | slices 1–3 | **AC2, AC3, AC4 green.** AC2b BUILT s22 (hover + door) but **graded on the rendered surface, so it needs the drive** — as do AC1 and AC5; the placement's 4 shots are WITH RICHARD |
| TVW-008 | slice 1 | reshaped by R-7; slice 2 is the surface |
| TVW-009, TVW-010 | — | — |

**52 ACs closed** (s22 closed none: it built AC2b, whose criterion is a photograph). 🔴 **THREE verdicts are with Richard and nobody else can do any of them** —
TVW-004 AC6 (20 shots, s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placements (s20). The
first two close their tasks on the spot. **Do not re-send them.** The board is re-derived from the task files each session; this table is a
convenience, and the task files win where they disagree.
