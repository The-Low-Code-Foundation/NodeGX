# HLT-017 — verdict, 2026-09-22 (P99 s14)

**A card can be picked up and dropped on another column, or somewhere else in its own, in any
NodeGX app, with two checkboxes and no pixel arithmetic.** Richard's three rulings are built as
ruled: a see-through copy follows the pointer (R1), a ring fills beside a held finger (R2), and the
column opens a gap where the card will land (R3). Graded by one drive of the shipped kanban example
against the real viewer bundle in headless Chrome, with real mouse, touch and key input.

| | HEAD build | fixed build |
|---|---|---|
| press a card and drag it onto another column | nothing lifts, nothing moves | a copy lifts on the first few pixels; the original stays, faded |
| the column under the pointer | reports nothing (the ports do not exist) | `Drag Over` **true**, outlined; the other two **false** |
| hovering between Doing's 1st and 2nd card | — | cards 2–3 slide down 54px; the column grows by 54px |
| one card further down | — | the gap moves (card 2 back to 0, card 3 still 54px) |
| leaving the column / coming back | — | the gap closes / reopens |
| DOM mutations in any column while hovering | — | **0** childList, **0** characterData (19 style) |
| let go | card stays in To do | card is in Doing at position 3; `Dropped Value` `card-brief`, `Drop Index` **2**, `Dropped` ×1 on Doing only |
| same move, keyboard (Space, →, ↓, ↓, Enter) | — | identical result; 5 announcements, ending *"Dropped in Doing, position 3."* |
| same move, touch at 390×844 | — | hold 0.65s lifts; the page does not scroll under the copy; identical result |

**`scripts/devtools/drive-hlt017-drop.js`:** `--expect head` **5/5** (AC1 control) · fixed **43/43**,
0 console errors. Frames: `shots/hlt017-mid-drag-desktop.png`, `hlt017-mid-drag-phone.png`,
`hlt017-hold-ring-phone.png`, `hlt017-hold-lifted-phone.png`.

## 1. §2 was wrong about the workaround, and right about everything else

§2 and AC1 describe a *"V1 workaround (TPL-010)"* that works out the target day as *start day +
round(drag X ÷ column width)*. **It does not exist in the tree.** `templates/planner` has **0**
`Drag` nodes, as does every other template; the planner moves a block with its Move box (TPL-010
R2.3, `c22a9d70f`). So AC1's second clause, *"a block dropped onto a column of a different width
lands in the wrong day"*, has nothing to measure, and AC9's *"TPL-010's column arithmetic is
removed"* has nothing to remove. Everything else §2 said held: `Drag` knows nothing about targets,
DEF-029's zone takes only files, and no node could say "you may drop here".

⚠️ **§2 also missed a neighbour.** `library/modules/drag-to-reorder` ships a **Drag To Reorder** node:
a single self-rendered vertical list that emits a reordered array. It cannot move a card between
lists, cannot hold your own components, and installs no document listeners. It is not this
feature and it is not replaced by it. It is recorded here so the next reader does not rediscover it.

AC1's control is therefore the kanban on the HEAD build. The example renders its seed, the press
lands on the card, nothing lifts, no column reports anything, and the card does not move (5/5).

## 2. What was built

- **`packages/noodl-viewer-react/src/drag-drop.ts`**, one controller on the document. It holds two
  registries of armed nodes, read through `getDOMElement()` at event time (DEF-029's rule, for
  DEF-029's reason). Its listeners are installed the first time any node arms either checkbox, and
  gesture listeners are added only for the length of a gesture. It is kept out of
  `pointerlisteners.ts` on purpose: `blockTouch` and `clickBubbling` govern React's sixteen pointer
  events, and a card whose Click is wired must still be pickable.
- **Ports** (`addDragDropPorts`, on Group, Text, Image, Circle and Video, beside `File Drop`). There
  is one checkbox per side, and everything else is dynamic:
  - **Drag Source** inputs: `Draggable`, `Drag Value`, `Drag Kind`, `Hold To Drag` (`touch` / `always`
    / `never`), `Hold Time` (0.5s).
  - **Drag Source** outputs: `Picked Up`, `Landed`, `Cancelled`, `Is Lifted`.
  - **Drop Zone** inputs: `Accept Drops`, `Accept Kind`, `Make Room` (on), `Zone Name`.
  - **Drop Zone** outputs: `Dropped`, `Dropped Value`, `Drop Index`, `Drag Over`.
- **The example**, `docs/node-catalog/examples/vis-kanban-drag-between-columns.json`. It has three
  Arrays, one `For Each` per column, and one `Move card` Function per column that takes the card out
  of its Array and inserts it into this one at `Drop Index`. Each Column publishes `Card Dropped` /
  `Card Id` / `Index` for whatever owns the board to persist. The drive loads this file verbatim, so
  the drive grades what a person copies.
- **Docs**: `docs-site/docs/concepts/drag-source.md` and `drop-zone.md` (one page per port group,
  AC8), the regenerated node reference for the five nodes, and Group's enrichment citing the
  example. `Drag`'s enrichment no longer offers itself for "reorder handles" and names the
  offset-arithmetic anti-pattern.

### Decisions made in building, for Richard's eye

1. **The gap grows the column.** Translates alone pushed the last card out of its column, over the
   footer on a desktop and into the next column on a phone. The drive's first frames showed it, and
   no count could have. A `::after` spacer on the zone grows it by the gap. It is a pseudo-element,
   so it adds no child: Drop Index and the no-re-render rule both count children. It is also the
   gap itself when the drop is at the end.
2. **Hovering over the card's own slot opens no gap.** The faded original already stands there.
   The first phone run showed why this matters and not only that it is tidier: at pickup the
   pointer is over that slot, a gap opened there grew the column, and on a phone every column under
   it moved 54px under the finger. The card then landed one place lower than aimed.
3. **Drop Index leaves the dragged card out.** It is the index to insert at once the card is
   removed. That is why one Function handles a move and a reorder. Arm B grades it: a card dragged
   below its only neighbour reports **1**, not 2.
4. **The ring is `var(--primary)`, not `--accent`.** In every shipped token set, `--accent` is the
   shadcn wash (a near-background grey). A ring in it is invisible on a card. This takes the ruling's
   *"accent"* to mean the project's accent colour, not the token of that name.
5. **Both groups fold into Advanced CSS** (`propertyPanelTiers.ts`), as DEF-029's `File Drop` did,
   for the same reason: a Group is not a drop zone by nature. It is a one-line revert per group if
   Richard wants `Draggable` on the first screen.
6. **Keyboard zones are in reading order, row by row.** Left-first was wrong the first time it was
   driven: a probe box under the board sat further left than the second column, so → jumped out of
   the board.

## 3. What the drive caught that nothing else would have

- 🔴 **A dead output.** `cancel()` signalled `'cancelled'` on a port declared `dragCancelled`.
  Everything typechecked, the ports existed, and `signal()` checks `hasOutput` first, so the misspelt
  name was silence, not an error. Arm D's `Cancelled` counter read 0. The spec now reads every name
  `drag-drop.ts` passes to `signal`/`publish` out of the source and fails on an undeclared one. The
  mutant (the original bug) is red and has been restored.
- 🔴 **The example's Function threw** `Outputs.moved is not a function` on every drop: a signal output
  exists only once something is wired to it. The move itself had already happened, so every
  card-position row passed. The console-error row is the one that failed.
- ⚠️ **Three instrument faults:** Chrome serialises `translate: 0px 0px` as `0px` (the first zero
  checks failed a correct build); a gap target measured mid-hover is translated, so aiming at it
  lands one card further on (targets are now computed from resting boxes); the card locator matched
  wrappers.

## 4. Gates

- `noodl-viewer-react` jest: **124 suites / 1,644 tests**, green (was 123/1,637, plus
  `hlt017-drag-and-drop-ports`, 7).
- Editor `tests-unit` census moves, each by exactly the new ports (plus HLT-012's, below): FB-021 365→**400** gated inputs,
  354→**389** explained (7 inputs × 5 nodes, remainder unmoved at 11); FB-017 Group 19→**21**
  headings, 9→**11** advanced, basic unmoved at 10; CHR-007 snapshot **+45** rows (9 × 5), nothing
  else moved.
- `catalog:check`, `catalog:merge:check`, `catalog:groups:check`, `docs:nodes:check`: up to date.
- `catalog:examples`: **109/109.** It was 107/109 on `HEAD`'s catalog: `agent-sse-chat-stream` and
  `agent-store-shared-state` wired a Text Input output named `text`, which does not exist. A Text
  Input's value output is `onTextChanged`, and the catalog's own dynamic-port note names it as one
  of the node's two value ports. That is a one-word repoint in each file, so it was fixed here
  rather than filed.
- Templates, via `noodl-mcp`'s `validateOnDisk`: **all ten template directories at 0 errors.**
  DEF-029's specs: `def029-file-drop` green inside the viewer suite, `sbr007FileDrop` **15/15**.
- `@noodl/mcp`, final run: **9 failed / 2,261 passed in 8 suites.** Earlier in the session it read
  8 / 2,262 in 7 suites. Accounted by name:
  - `nodeDocBudget` was red on HEAD (Group 14,315 against the 14,300 ratchet). This row added +1,246
    to it. The ratchet moved to **16,200** with both numbers attributed in the spec (headroom 639,
    P81's convention). It is green now.
  - `CMP-001 AC2` is red on HEAD at **38** against a pinned 33. The example moves it to **39**,
    because its Column publishes the drop. Left red: the literal is CMP-001's, and its spec says
    re-measure with `measure-interfaces.py` before moving it.
  - `nodeIdAllocation`, `cn004`, `cmp004Parts`, `def038SettledTemplates` and `d54ThemePresetIdentity`
    name nothing of this row's. There are 0 mentions of any drag or drop port in their output. This
    is s11's "red on HEAD at 8" population.
  - ⚠️ **`provision` and `projectOwnsBackend` (DSG-007) are flaky together and green apart.** Across
    five runs of the pair, 0–2 specs were red, and a different one each time. Alone, each passes
    (11/11, 12/12). Both write backend runtime records, and neither imports anything this row
    touched. Not attributed here, and not filed as a defect: a pair that shares state under
    parallel workers wants a row of its own if it recurs in CI.
- **`test:main`: 536/536 suites, 8,542/8,542 tests, exit 0.** The first run was 535/536. HLT-012's
  population census read 167 numeric ports against a pinned 166. That is this row's `holdTime`,
  which has no units and so never reaches a token field. The 86 and the 64 did not move, which
  shows the rule table was not asked about it. The literal moved with that written beside it.
- **`test:ci`: 3,036 specs, 8 failures = the floor by name** (3 SUB-006, 3 SUB-011, 2 NDA-017), seed
  04634, fresh `test-results.json` 08:26:49Z.

## 5. Left, with owners

- **AC9 (the planner uses it) belongs to phase 78's planner stream**, per §6. It is smaller than
  written: there is no column arithmetic to remove (§1), only blocks to arm and Day columns to make
  zones, and a `Move block` command that already exists.
- **Not built, deliberately:**
  - auto-scroll when a card is held near the edge of a scrolling column;
  - dragging several cards at once;
  - a drop animation from the copy into the gap. The copy disappears and the re-render puts the card
    where the gap was.
