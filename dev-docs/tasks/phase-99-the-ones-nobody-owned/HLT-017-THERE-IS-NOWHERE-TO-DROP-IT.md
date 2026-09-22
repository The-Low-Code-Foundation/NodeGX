# HLT-017 — There is nowhere to drop it

✅ **BUILT 2026-09-22 (P99 s14).** See §7 for each criterion and the [verdict](./verdicts/HLT-017/2026-09-22/VERDICT.md). 📋 AC9 belongs to phase 78's planner stream.

🔴 **Opened 2026-09-21 from the planner stream (TPL-010), at Richard's request.** Driving the planner demo,
he said people will complain if a block cannot be dragged from one day column to another, kanban style.
Offered either a template-only workaround or a real drop target in the engine, he chose to file the engine
half here: *"Let's add the drop zone node to phase 99 in NodeGX please."* **Specced, not built.** Measured by
reading the source.

## 1. The person sentence

> **Someone building a board in NodeGX can let a person pick up a card and drop it on another column,
> or somewhere else in the same column. The column under the pointer lights up on the way, and the
> graph is told which card landed where. No arithmetic on pixel offsets.**

## 2. What is there today, measured 2026-09-21 (`cline-dev` HEAD `a8f0d9149`)

- **`Drag` moves an element and knows nothing about targets.** `nodes/visual/drag.ts` wraps
  `react-draggable` (`components/visual/Drag/Drag.tsx`). Its outputs are `Drag Started`, `Drag Moved`,
  `Drag Ended`, `Drag X/Y` and `Delta X/Y`. No output says what is under the pointer, and no node on the
  other end can say "you may drop here".
- **A drop target exists for files only.** DEF-029 (phase 77, SBR-007) added `Accept File Drops` to every
  visual node (`node-shared-port-definitions.ts` `addFileDropPorts`, ~901–1010; events in
  `pointerlisteners.ts` ~24–40), with the outputs `Drag Over` and `Dropped File(s)`. It runs on HTML5
  `dragover`/`drop` with a `DataTransfer` of files. Its own comment says `Drag` is *"a different feature
  and not a partial implementation of this one"*. So a drop zone is a shape the engine already has; there
  is just nothing to drop into it except files from the desktop.
- **The consequence, concretely:** the planner (`templates/planner`) has a `/Commands/Move block`
  command that already moves a block to another day. What is missing is the gesture. The V1 workaround
  (TPL-010) works out the target day as *start day + round(drag X ÷ column width)* on `Drag Ended`:
  - it depends on every column having the same width;
  - nothing lights up under the pointer;
  - it can't reorder within a column;
  - it does nothing on the phone layout, where the days stack.

  The Todo template and any kanban anyone builds hit the same wall.

## 3. The shape — recommended, to be ruled on (§5) before building

**Follow DEF-029's precedent: ports on every visual node, off by default, not a new wrapper node.**

- **Source side: `Draggable` (checkbox) + `Drag Value` (any).** When this is on, pressing and moving the
  element picks it up. `Drag Value` is what it carries (the planner sends the block's id). An optional
  `Drag Kind` string lets a zone accept cards and refuse something else.
- **Target side: `Accept Drops` (checkbox) + optional `Accept Kind`.** When this is on, the element
  reveals the following outputs:
  - `Drag Over` (boolean, true while something acceptable hovers);
  - `Dropped` (signal);
  - `Dropped Value` (the source's `Drag Value`);
  - `Drop Index`: where among this zone's direct children it landed, so a column can reorder.
  
  The innermost armed zone under the pointer wins, and a zone that takes a drop stops it there. That is
  DEF-029's nesting rule and `clickBubbling`'s.
- **Pointer events, not HTML5 drag-and-drop.** HTML5 DnD does not fire on touch, so it would repeat the
  phone gap the workaround has. Hit-test with `elementFromPoint` against armed zones. The dragged thing is
  drawn as a floating copy above the page, and the original stays where it is, faded, until the graph
  moves the data. The engine never moves the data itself: the graph's command does, as it does now, so a
  refused or failed move leaves nothing half-done.
- **Keyboard and screen readers:** a picked-up card can be moved with the arrow keys and dropped with
  Enter, and an announcement says where it is. Without that, a drag-only board is unusable for some
  people. The planner keeps its "Move to…" as well.
- **The Drag node stays as it is.** It is a free-movement gesture (sliders, swipe panels) and is not
  being replaced.

## 4. Acceptance criteria

1. **The control first.** On the planner demo at HEAD, pressing a block and dragging it onto another
   day's column does not move it. With the V1 workaround, a block dropped onto a column of a different
   width lands in the wrong day. Record both.
2. **The fix, on a driven session with real pointer events:**
   - a card dragged from Monday to Wednesday lands in Wednesday;
   - Wednesday's `Drag Over` is true while the card hovers and false after;
   - `Dropped Value` equals the card's `Drag Value`;
   - a drop between the second and third card gives `Drop Index` 2.
3. **Nesting:** a zone inside a zone takes the drop, and the outer one fires nothing.
4. **Kinds:** a zone whose `Accept Kind` differs from the source's `Drag Kind` never turns `Drag Over`
   true and never fires `Dropped`.
5. **Touch and the hold ring (R2):** the same drive under touch emulation, on a 390-wide layout, succeeds.
   - A press held for 0.5 s shows the ring filling beside the finger and lifts the copy.
   - A press released at 0.3 s picks nothing up and shows no leftover ring.
   - A finger that moves before the ring fills scrolls the list instead.
   - With a mouse, a drag picks up at once.
5a. **The gap (R3):** hovering over Thursday between its second and third block opens a gap there
   before the drop, read off the children's transforms mid-drag. Moving the pointer down one block
   moves the gap, and leaving the column closes it. On drop the block lands in the gap, and none of
   Thursday's rows is re-rendered while hovering. Screenshots mid-drag show the copy, the gap and the
   faded original together.
6. **Keyboard:** Space to pick up, the arrows, Enter to drop. It lands in the same place as the pointer
   drive, and the live region announces it.
7. **Nothing changes for existing projects:**
   - a node with both boxes off renders byte-for-byte what it did;
   - the seven shipped templates validate at 0 errors;
   - DEF-029's file-drop drive still passes.
8. **Docs:** a page per port group, plus a kanban example in the example library built from these ports
   alone.
9. **The planner uses it:**
   - TPL-010's column arithmetic is removed;
   - blocks drag between days and reorder within a day;
   - it is driven on a deployed build at 1280×900, 1423×680 and 390×844.
10. **Gates:** it runs `test:ci` **and** `test:main` (§7), and the verdict names both.

## 5. Rulings — ✅ all three RULED by Richard, 2026-09-22

| # | question, in plain words | ruling |
|---|---|---|
| R1 | You drag Tuesday's "Bramble: design review" block over Thursday. Does the real block slide across under your finger (Trello), or does a see-through copy follow you while the original stays faded on Tuesday until you let go? | ✅ **The copy.** *"A copy sounds cool."* If the move fails or you drop it on nothing, the original is still exactly where it was |
| R2 | On a phone, touching a block and moving your finger scrolls the day list. How do you pick a block up? | ✅ **Press and hold for half a second, with a ring beside the pointer or finger that fills up as you hold.** *"With a little half second loading spinner thing that charges up as you hold next to the cursor so you get visual feedback about what's happening."* The ring appears as soon as the press starts; when it is full, the copy lifts. Moving too far, or letting go early, cancels it, and the ring disappears without picking anything up |
| R3 | You drop a block between the 10:00 and 14:00 blocks on Thursday. Should it land there in that order, or does the day keep its own order (by time)? | ✅ **Where you dropped it, and the other blocks make room.** *"If we can do adding it where it's dropped, and it displaces other blocks, that'd be an awesome example for the NodeGX community."* While you hover, Thursday's blocks slide apart to open a gap where the block will land. Moving along the column moves the gap, and leaving the column closes it. When you drop, the block takes the gap |

**What the rulings add to §3:**

- **The hold ring is part of the engine, not the template.** It is drawn beside the pointer and takes the
  project's accent token. A `Hold To Drag` port (default: on for touch, off for mouse) sets whether it is
  used, and `Hold Time` defaults to 0.5 s. A mouse drag still picks up at once, as a desktop person expects.
- **The gap is part of the engine too.** An `Accept Drops` zone with `Make Room` on (default: on)
  animates its direct children aside to open a gap the size of the dragged copy at `Drop Index`, using
  transforms only. Nothing is re-rendered and the graph's data is untouched until `Dropped` fires. A
  person watching sees the gap before they let go; the graph sees one signal after. A zone with
  `Make Room` off keeps its children still and only reports the index.
- **The community example is a deliverable, not a nice-to-have.** The kanban in AC8 must show all three:
  copy, hold ring, gap.

## 6. Owner and neighbours

- **The owner is this row.** Found in TPL-010 (phase 78), where the V1 workaround ships.
- **P77's DEF-029 is the precedent this task follows, not its owner.** Its file drop stays as it is, and
  the two must not fight over `onDragOver`.
- The planner's switch-over (AC9) is committed in phase 78's stream once this row is built. Its own
  commits, with only its own paths staged.

## 7. Outcome, 2026-09-22 (s14) — each criterion

Drive: `node scripts/devtools/drive-hlt017-drop.js`. It drives the shipped kanban example, and the
fixed build passes **43/43**. `--expect head` passes **5/5**.

| AC | result |
|---|---|
| 1 | ✅ **The control holds on the kanban:** on HEAD nothing lifts, no column reports, and the card does not move. ⚠️ **The second clause measures nothing.** The *"V1 workaround"* it describes is not in the tree: `templates/planner` has 0 `Drag` nodes, and so does every other template |
| 2 | ✅ Mouse, To do → Doing between its 2nd and 3rd card. The card lands there. `Drag Over` is true on Doing only while the card hovers, and false everywhere after. `Dropped Value` = `card-brief`, `Drop Index` = **2**, and `Dropped` fires ×1 on Doing only |
| 3 | ✅ A drop on the inner zone fires inner 1, outer 0. A drop on the outer zone fires outer 1 |
| 4 | ✅ Over a `photo` zone, a `card` source never turns `Drag Over` true and never fires `Dropped`. The source fires `Cancelled` instead |
| 5 | ✅ At 390×844 under touch, the ring shows at 0.12s. A release at 0.3s leaves nothing lifted and no ring. A finger that moves first scrolls the page (0 → 237) and lifts nothing. A 0.65s hold lifts the copy. The page does not scroll under it, and the card lands where AC2's did. With a mouse the card picks up on the first few pixels |
| 5a | ✅ The gap opens between the 1st and 2nd card, moves when the pointer moves down one card, closes on leaving the column and reopens on return, and every card stays inside the column. **0** childList and **0** characterData mutations while hovering. Frames are in `shots/hlt017-*` |
| 6 | ✅ Space, →, ↓, ↓, Enter lands where AC2 did, with the same `Drop Index` 2. There are 5 announcements, ending *"Dropped in Doing, position 3."* Escape puts a card back |
| 7 | ✅ A Group with both boxes off has byte-identical markup to HEAD. All ten template directories validate at 0 errors. `def029-file-drop` and `sbr007FileDrop` (15/15) are green |
| 8 | ✅ `docs-site/docs/concepts/drag-source.md` and `drop-zone.md` are written. The node reference is regenerated. `vis-kanban-drag-between-columns` is the example: copy, ring and gap, built from the ports alone |
| 9 | 📋 **Phase 78's, per §6.** It is smaller than written: there is no arithmetic to remove. Blocks need `Draggable`, the Day lists need `Accept Drops`, and `Dropped` needs wiring to the existing `Move block` |
| 10 | See the verdict §4 for `test:ci` and `test:main`, by name |

