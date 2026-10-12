# NSP-016 — research: what a drag and a drop are, and what of them a spec can grade

**Written 2026-10-05 (P107 s43).** NSP-016 §7.6 left four visual nodes waiting on drag and drop: Text, Image, Circle and
Group. Video carries the same ports. This note reads the code (`noodl-viewer-react/src/drag-drop.ts`, 967 lines, and
`addDragDropPorts` / `addFileDropPorts` in `node-shared-port-definitions.ts` :946-1330). It measures what jsdom can play
and what the real Text node does in the runtime target's page. It ends with what the Text spec takes on first.

## 1. In short

- **Two features share the word "drop".** *Drag and drop* (HLT-017, 2026-09-22) moves an element onto another element.
  It is one controller on the `document`, with module-level state. *File drop* (DEF-029) takes a file dragged from the
  desktop. It is four React handlers on the element. They share nothing.
- **Little of the product uses them so far.** The 13 shelf templates hold 1,153 Text nodes and 1,653 Group nodes, and none
  of them sets a drag or drop port. One catalog example uses drag and drop (`vis-kanban-drag-between-columns`: a card with
  `dragKind: "card"`, a column with `acceptKind: "card"`). The Site Builder uses `acceptFileDrops` once. The ports are on
  every Text, Group, Image, Circle and Video, so they belong in those specs. They should not decide the order of work.
- **The keyboard drag can be played in full with no geometry.** Space lifts, the arrow keys move between zones and
  between slots, and Enter, Space, Escape or Tab ends the drag. A slot is a DOM child, not a box. Only the order of
  *zones* reads rectangles, and with one zone that order does not matter.
- **The pointer drag needs one thing jsdom lacks: `document.elementFromPoint`.** jsdom 26 does not define it, so every
  pointer lift throws in `track` right after Picked Up fires. With a stand-in that answers "the pointer is over the
  element the act names", lift, enter, leave, drop and cancel can all be played. **Drop Index from a pointer is geometry**
  (each slot's midpoint against the pointer; every jsdom rect is 0×0). It waits for NSP-017. From the keyboard it is
  graded.
- **A file drop can be played** with plain events carrying a stand-in `dataTransfer`. jsdom has `File` but no `DragEvent`
  or `DataTransfer`. A dropped file is already a trace value (`{ "$file": … }`, NSP-014 s30).
- **The probe found one product defect (P107-C77) and three gaps in the test face.** The defect: a Draggable element loses
  its keyboard pickup when its element is replaced (§4). The three face gaps were fixed this session (§5). Without those
  fixes the probe gave a different answer from one run to the next.

## 2. What a drag is (drag-drop.ts)

**Arming.** `Draggable` on adds the node to a module-level set (`draggables`). It installs the document listeners the first
time anything arms (`install`: `pointerdown` and `keydown` in the capture phase, plus a permanent non-passive `touchmove`).
It also adds `tabindex="0"` and `aria-roledescription` to the element once it exists (`whenMounted`: it asks each frame,
for 60 frames). `Accept Drops` on adds the node to `zones`. A deleted node leaves both sets (`forget`, armed once per node
by the setter). If a drag is under way, deleting its source cancels the drag, and deleting its zone leaves the zone.

**One gesture at a time.** The gesture lives in a module variable (`gesture`) and has three phases:

| phase | how it begins | how it moves on |
|---|---|---|
| `pending` | a `pointerdown` on (or inside) a live draggable element, not in a field (`input, textarea, select, contenteditable`); a mouse needs button 0 | a move of more than **4 px** lifts it; a `pointerup` cancels it quietly |
| `holding` | the same, when `Hold To Drag` says so (`touch`, the default: every pointer but a mouse; `always`; `never`). A ring is drawn and a timer is set for `Hold Time` seconds (default 0.5; not a finite number ≥ 0 → 0.5) | the timer lifts it; a move of more than **8 px** cancels it (the page scrolls instead); a `pointerup` or `pointercancel` cancels it quietly |
| `lifted` | `lift`: **Is Lifted** true, then **Picked Up**, then the graph is drained. A pointer lift also makes the see-through copy and calls `track` | each move tracks the zone under the pointer; `pointerup` drops; `pointercancel` cancels; Escape cancels |

Of the drag's own effects, only three reach a node's ports: **Is Lifted**, **Picked Up**, and the outcome of the drag.
The ring, the copy, the `data-ndl-*` attributes and the gap are page effects.

**The outcome.** `drop`:
- With a zone under the pointer (the innermost armed zone that **accepts** the source, walking out from the element
  under the pointer, never a zone inside the source): the zone's **Dropped Value** (the source's Drag Value *at the drop*),
  then **Drop Index**, then **Dropped** on the zone, **Landed** on the source; the gesture ends (the source's Is Lifted
  false; the zone's Drag Over false), then the zone's graph is drained, then the source's.
- With no zone: `cancel`. The gesture ends, and if it was lifted, **Cancelled** fires on the source.

A zone with an `Accept Kind` (comma-separated, trimmed) takes only a source whose `Drag Kind` (trimmed) is one of them.
A zone without one takes anything. A zone that refuses is passed over, so an outer zone that accepts can still take the
drop.

**Drag Over** (the `isDropTarget` output) on the zone is true from `enterZone` to `leaveZone`. **Drop Index** is the number
of the zone's slots (its element children, minus the source, minus `display: none` / `position: absolute | fixed`) whose
midpoint along the zone's axis (row: x; anything else: y) is before the pointer. `Make Room` slides the slots apart with
inline `translate`. It changes no port, and React never writes `translate`.

**The keyboard.** With no drag under way, Space on a focused, live draggable element lifts it (`keyboardLift`). The drag
starts in the innermost zone that contains the element, at the element's own position (or in the first zone in reading
order if it sits in none). Then:
- ArrowDown and ArrowUp move the index, clamped to 0…slots.
- ArrowLeft and ArrowRight move to the previous or next zone in reading order, keeping the index, clamped.
- Enter or Space drops, which cancels when the drag is in no zone.
- Escape cancels.
- Tab cancels, and the key does its usual job.

A live region announces each step. During a pointer drag, only Escape is read.

**Two traps in the module that a target must respect.** (1) Its state is **process-wide**: `gesture`, the two sets, and
`installed`. A gesture that outlives its page captures the next page's keys (§5, fix 3). (2) It calls bare `setTimeout`,
`getComputedStyle` and `new DOMRect`, and calls `window.requestAnimationFrame` through `window`. A target supplies each,
or the code fails or runs at the wrong time.

## 3. What a file drop is (`addFileDropPorts`)

`Accept File Drops` on makes the element answer four drag events, but only when the drag carries files
(`dataTransfer.types` includes `"Files"`):
- `dragenter`: depth + 1, and **Is Dragging Over** becomes true (sent only when it changes).
- `dragover`: prevents the default, so the element accepts the drop.
- `dragleave`: depth − 1 (never below 0), and Is Dragging Over becomes false at 0.
- `drop`: stops propagation (the innermost zone takes the drop), depth 0, Is Dragging Over false. The dropped files are
  filtered by **Accepted file types**: comma-separated `.ext`, `type/*` or an exact MIME type, compared lower-cased; empty
  means every file.
  - Some files pass: **File** (the first), **Files**, **File Name**, **File Type** and **File Size In Bytes** are flagged,
    and **Files Dropped** fires.
  - None pass: Files becomes `[]`, File becomes `undefined`, the five are flagged, and **Files Rejected** fires.

The pointer drain (pointerlisteners.ts :173-186) wraps these handlers, so the graph is drained right after each one. That
is the Text Input's person-patch shape. Every rule here is the node's own logic, and none of it needs geometry.

## 4. Measured on the real Text node (the probe, 2026-10-05)

A throwaway `zz` test played the real Text node (`nodes/visual/text.ts`) through the runtime target's page, with a
stand-in spec that only declares the ports. The traces were printed. After the three face fixes in §5:

| case | what fired |
|---|---|
| not draggable; focus, Space | nothing (the control) |
| Draggable at the placing; focus, Space; Escape | Is Lifted true, **Picked Up**; then Is Lifted false, **Cancelled** |
| the same, Enter instead of Escape (no zone on the page) | Picked Up; then **Cancelled** (a drop with no zone is a cancel) |
| Draggable set after the first frame; focus, Space | Picked Up |
| placed with Mounted off, mounted after 3 frames; focus, Space | Picked Up |
| **Mounted off then on (3 frames after); focus, Space** | **nothing** — row C77 |
| **Tag changed to `h1`; focus, Space** | **nothing** — row C77 |
| **placed with Mounted off, mounted after 70 frames; focus, Space** | **nothing** — row C77 (`whenMounted` gave up at 60) |
| Draggable off then on after a remount; focus, Space | Picked Up (setting it again adds the attributes again) |
| press, release, click (Draggable on) | Pointer Down, Pointer Up; Pointer Down, Pointer Up, Click — the face sends no pointer events yet (§6) |
| touch, wait 600 ms, lift (Draggable on) | Pointer Down; Pointer Up — no lift, for the same reason |

A Text's first frame also sends the value outputs of both drop features: **Is Dragging Over**, **Drag Over** and
**Is Lifted**, all false, whatever the ports are set to. The getters are on the definition whether or not the editor
shows the ports (the dynamic ports are an editor matter).

**Row P107-C77** ([the ledger](../../bugs/p107-c77-a-draggable-element-loses-its-keyboard-pickup-when-its-element-is-replaced.md),
medium): the attributes that make the element keyboard-reachable are added once, to the first element, so a new element
lacks them.

## 5. Three face gaps the probe found, fixed (node-spec-target.ts)

1. **The page had no window while the params were set.** The face put `window` and `document` on the host only when it
   put the node on the page, after the node was made and its params applied. `setDraggable` found no `document`
   (`install` returned early) and no `window` (`whenMounted` returned), so **Draggable set at the placing never armed**.
   An app sets params with a window present. Now a node whose spec needs `person` is made with the page installed.
2. **`requestAnimationFrame` ran on wall-clock time.** The page's globals replaced the world's frame clock (the next
   frame's start, `installPopups`) with jsdom's `pretendToBeVisual` one, and drag-drop calls `window.requestAnimationFrame`
   anyway. So `whenMounted` ran "whenever the event loop got there". In the first probe run, the same case lifted in one
   play and not in the next. `installPage()` now keeps the world's clock on the host and on jsdom's `window`.
3. **A node's teardown ran after the page was gone.** `dispose` took the page off (globals and all), then deleted the node.
   Its delete listener (`forget` → `cancel` → `finish`) threw at `document.documentElement`, so a gesture the play left
   lifted survived into the **next** play, and that play's Space went to it. The globals now come off after the teardown
   (`releasePage`).

Fixes 1 and 2 change when the face installs the page for all 8 visual nodes that already conform, so all 8 were re-run
(seed 13, all CONFORMS).

**Later the same session (NSP-016 §7.8), building the Text, the face gained what §6 lists, and one more fix:**

4. **The browser's hit test.** A pointer act lands on the element under the pointer, and an element with `pointer-events:
   none` or `visibility: hidden` is never that element (`underPointer`). `focus()` refuses a hidden element (Chromium
   `IsFocusableStyle`), whether a person or a node's own Focus action calls it. jsdom had delivered both, so **all 8
   conforming visuals had been graded on a page where a hidden control could be clicked and focused.** Seven of them
   diverged once the rule was in, and each spec now says what the browser does (§7.8).
5. **Pointer events**, sent before the compatibility events, with `pointerType` and `pointerId`.
6. **`elementFromPoint`**, which returns the element the last pointer act landed on.
7. **The window is left clean.** Every listener a play adds to the shared `window` comes off with its page. A drop's
   `swallowNextClick` removes its own listener with a `setTimeout(0)` on the world's clock. A play that ended before that
   timer fired left the listener on the window, and it **ate a click in a later play**. The side-by-side probe showed the
   runtime dropping a Click that the spec fired, in 3 of 50 scenarios, and only when the whole file was played in one run.

## 6. What jsdom can play (measured, jsdom 26.1.0)

| needed | jsdom | what the face does |
|---|---|---|
| `pointerdown` / `pointerup` / `pointermove` with `pointerType`, `pointerId`, `button`, `clientX/Y` | **no `PointerEvent`** — but a `MouseEvent` named `pointerdown` with `pointerType` defined on it reaches a capture listener with both read correctly (measured) | **built (s43)**: the press, release, click, touch and lift acts send the browser's pointer events before the compatibility events (`pointerdown` → `mousedown`, `pointerup` → `mouseup` → `click`; for a finger `pointerdown` → `touchstart`, `pointerup` → `touchend`). No component has an `onPointer*` handler, and the 8 re-runs confirmed it |
| a move past the slop | — | **built (s50)**: a `move` act (`mouse` or `touch`) — a `pointermove` 10 px from the press point, over the element the act names, then `mousemove` / `touchmove` |
| `document.elementFromPoint` | **undefined** | **built (s43)**: returns the element the last pointer act landed on, after the hit test. A face choice, like the keyboard slide and the keyboard pick: an act names *what* is under the pointer, never *where* |
| element rectangles | all 0×0 | none. Drop Index from a pointer is geometry and waits for NSP-017. The keyboard grades the index |
| `getComputedStyle` (flex direction, gaps, `display`) | yes, from inline style (`flexDirection: row`, `columnGap: 8px` measured); `translate` reads `""`, which the code takes as 0 | **built (s43)**: as a global (drag-drop calls it bare) |
| `new DOMRect` | yes, as `window.DOMRect` | **built (s43)**: as a global (`restingRect`) |
| focus on a `tabindex="0"` `<div>` | yes | — |
| the hold timer | bare `setTimeout`, which is the world's (`installWorld` owns the timers) | **measured (s43)**: it runs on the world's clock (lifted at an advance of 500, not 499). In the spec it is `after` with the tag `hold` |
| `DragEvent` / `DataTransfer` | **neither** (jsdom has `File`) | **built (s50)**: `fileEnter` (carrying a list of `$file`s; an empty list is a drag of text), `fileLeave` and `fileDrop` acts, run as HTML's drag-and-drop model runs them: the target moves first (a `dragleave` at the old one, a `dragenter` at the new), then a `dragover`; a let go is a `drop` when that `dragover` was cancelled, else a `dragleave`. Each event is a `MouseEvent` with a stand-in `dataTransfer` (`types` holds `Files` exactly when it carries a file). React reads `dataTransfer` off the native event (measured: the Text's file scenarios agree with the spec on the runtime) |

## 7. What a spec can say, per node

- **The source side is the node's own.** For a lone Draggable node a spec grades: arming (Draggable at the placing, later,
  off and on; C77's remounts), the keyboard lift and its four endings, the touch hold (the `hold` timer: lift at Hold Time,
  a lift or an 8 px move before it cancels quietly), the mouse lift (a move past 4 px), and a drop over nothing (Cancelled).
  Hold To Drag, Hold Time, Drag Value and Drag Kind are stored and read at the gesture.
- **The zone side needs a source on the page.** This is s42's design: the spec declares the page (`acts.*.values`), the
  face builds real nodes (a Draggable sibling, a Text with a `Drag Value` and a `Drag Kind`), and an act of the zone's
  carries the drag. Drop Index needs slots, so it is the **Group's** to grade (its children are the slots, also on its
  page). A Text zone has no element children, so its index is always 0.
  **Built for the Text in s51** (NSP-016 §7.12): three cards on the page beside it, each a real Draggable Text with its own
  Drag Value and Drag Kind, in its own container; `grab` (the mouse), `pickUp` (the keyboard) and `away` (the pointer onto
  nothing). The Text's existing acts (`move`, `release`, `click`, `key`) carry a card's gesture, because it is the module's
  one gesture.
- **A source and a zone in one play** sit on one page, one process-wide gesture. A target must end every gesture with its
  play (§5, fix 3).
- **The file drop is the node's own logic**: the type filter, the depth count, the two signals and the five values. Three
  acts whose values are lists of `$file`s.
- **Is Lifted, Drag Over and Is Dragging Over are value outputs sent in the first frame** (false), like the Slider's.
- Not graded until NSP-017: Drop Index from a pointer, Make Room's gap, zone order by reading position (more than one
  zone, by the keyboard's arrows), the copy and the ring.

## 8. Recommendation

1. **Text next**, in two steps, each conforming before the next starts.
   - **(a)** Its own logic: Text and Tag (on the page), the six pointer outputs (Click, Pointer Down, Pointer Up, Pointer
     Enter, Hover Start, Hover End, with the hover visual state), Mounted, the Bounding Box outputs, and both drop
     features' inputs stored. In this step the person acts are the Icon's plus the pointer events. The keyboard lift and
     its endings are graded, with C77 in the scenarios. The first frame's three false values are graded too.
   - **(b)** The face's `move` and the file acts, with a Draggable sibling on the page for the zone side. *(Built: s50 the
     move and the file acts, s51 the zone side.)*
2. Re-run all 8 conforming visuals on the runtime (200, seeds 13 and 20730) **after the face's §5 fixes and again after
   the pointer events**. Both change what every visual play sees.
3. **Then Group**: a page with children that are slots, plus the drop index from the keyboard. **Then Image and Circle**,
   which are the Text with another look. Video waits for media.

## 9. Not measured here

- What a `pointercancel` from a browser scroll looks like (the face has no
  scroll).
- ~~`swallowNextClick`~~ — measured in s43: the swallow eats exactly ONE click, wherever it lands, and expires when the world's clock
  passes the `setTimeout(0)` (an advance of 1, not of 0). A settle does not move the clock, so in the face a click several frames
  after a drop is still eaten where a browser would have turned its event loop between them. A face choice, pinned by the
  scenario "the swallow expires when the event loop turns past it".
- The live region's words (not on the wire) and `Zone Name` (read only into them).
- Two zones ordered by reading position (rects), and nested zones (the innermost taker): these need a page with layout.
