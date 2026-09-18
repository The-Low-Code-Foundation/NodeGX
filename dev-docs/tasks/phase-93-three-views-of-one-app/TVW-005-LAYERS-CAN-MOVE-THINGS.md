# TVW-005 — Layers can move things

Layers becomes a place to edit structure, not only read it. Proposal §4.2 (drag) and §4.3 (drag from
Components into Layers).

## 1. The person sentence

**Someone who drags the work strip above the hero in Layers sees the page reorder in the preview and
the node move on the canvas; someone who drags `Price Tag` from Components into Layers has placed it,
and the strip that said it was on no page is gone.**

## 2. The spec

| gesture | result | mechanism |
|---|---|---|
| drag a page-owned row above/below a sibling | reorder | `NodeGraphNode.insertChild` (`NodeGraphNode.ts:598`) via the editor's `attachNode`/`detachNode` (`nodegrapheditor.ts:534-540`), one `UndoQueue` group |
| drag a page-owned row onto a container row | reparent | same, gated by `ComponentModel.canCreateNode` (`componentmodel.ts:316-329`: `allowChildrenWithCategory`, `allowAsChild`) |
| drag a row that is **inside a band** | refused, with the row shaking and a tooltip: `This is part of Hero — edit Hero to change it` | Figma's rule; the alternative is editing a file the canvas is not showing |
| drag a component from the Components tab into Layers | a new instance node at that spot, selected | the same create path as dragging onto the canvas (`views/nodegrapheditor.drag.ts:98+ onDrop`), given a parent and an index instead of a canvas point. The tab does not switch during the drag; a drop target strip appears on the Layers tab header, and dropping on it opens Layers with the row selected |
| drag a **page** from Components into Layers | refused: `Pages go in a Router, not on another page` | pages are Router children |
| drag a logic component into Layers | refused: `Format price has no screen. Drop it on the canvas.` | |
| illegal reparent (a Text into an Image) | refused with the canvas's own warning text (`NodeGraphNode.ts:1008-1014`), never a new sentence | one legality rule |
| ⌥-drag | copy, not move | matches the canvas |

Drop indicators: a 2px `primary` line between rows for reorder; a `primary-bg` fill on a container row
for reparent; the band rows are never targets.

## 3. Scope

In: the table, undo/redo for every row of it, keyboard: ⌥↑/↓ reorders the selected row.

Out: multi-row drag. Dragging from Layers to the canvas (the canvas already shows the node). Renaming
in Layers (rows show the node's label; rename lives in the property panel, PNL-007).

## 4. Acceptance criteria

1. **(person)** Corpus project, Layers on Home. Drag the work strip above Hero: the preview shows the
   cards above the hero; the canvas shows the node moved in the stack; ⌘Z restores both. Drag
   `Eyebrow` (inside the Hero band) anywhere: refused with the sentence. Drag `Price Tag` from
   Components onto the Layers tab header, drop it under the work strip: it is placed, selected, drawn
   in the preview, and TVW-002's strip for it is gone; its Components row now reads `×1`.
2. A spec drives every row of the §2 table against `ProjectModel` and asserts the resulting
   `children[]` order and parent, and that each refused gesture leaves the graph byte-identical.
3. Every accepted gesture is one undo step; undo restores selection to the moved row.
4. The drop from Components creates the instance through the same code path as a canvas drop
   (assert by spying the shared function, not by comparing results).
5. Screenshots of the three drop indicators, both themes. **Richard rules WORTHY.**
6. `test:ci` at the floor.

## 5. Landmines

- `PopupLayer.startDragging` (`hooks/useDragDrop.ts:22-38`) is the panel's drag; the canvas's drag
  door is `nodegrapheditor.drag.ts`. Two drags, one drop function — do not write a third.
- A drop between two rows that belong to different owners (the last row inside a band and the next
  page-owned row) resolves to the page-owned position; the band's tail is not a slot.
- Reordering under a `For Each`'s template is reordering the *template component's* children — that
  is inside a band and refused.

## 6. Slice 1 — the decision, the mutation, and the gesture (s16, 2026-09-18)

Built: `layersDrag.ts` (pure), `layersDragApply.ts` (the two model calls), `useLayersDrag.ts` (the
gesture and the real legality gate), the row wiring and the three indicators in `LayersTree.tsx` /
`ComponentsPanel.module.scss`, `componentKind` on the Components tab's drag payload, and an
optional `placement` on the canvas's own `createNewNode`. `tests-unit/tvw-005` — **15 specs, 8
mutants, each caught**. `tsc --noEmit` 0.

**Not built, and it is the one §2 row with no code behind it:** the *drop-target strip on the Layers
tab header*. A component can be dragged from the Components tab into Layers only while the Layers
tab is the one showing. AC1's sentence drives the strip, so AC1 cannot close until it exists.

### 6.1 What the model made us do, in the order it made us do it

Four things the code had to be written around, each measured in the source rather than assumed:

- 🔴 **`NodeGraphModel.attachNode` begins `this.roots.indexOf(child)` and silently does nothing
  when the child is not a root.** A node must be **detached first**, always — there is no "move"
  call. And since detaching removes it from its old parent's `children[]`, the anchor's index is
  resolved **after** the detach, which makes a move within one parent and a move across two parents
  the same two lines.
- 🔴 **`NodeOperations.attachNode` / `detachNode` record NO undo outside a canvas drag.** They read
  `editor.interaction.dragNodesUndoGroup`, which exists only between `startDraggingNodes` and the
  mouse-up that ends it; anywhere else `args.undo` is falsy and the model writes nothing. A Layers
  drag routed through the editor's own helpers would move the node and leave **nothing to undo** —
  and would have looked completely correct until somebody pressed ⌘Z. The applier calls the model's
  `attachNode`/`detachNode` with its own `UndoActionGroup` instead.
- ⚠️ **An `UndoActionGroup` *constructed* with `do`/`undo` cannot be undone** (its pointer stays at
  0 — `undo-queue-model.ts:85`). The group is built empty and filled by the calls that already
  happened, which is what the model does with the group it is handed.
- 🔴 **`createNewNode` had no way to say where.** Its parent is whatever the canvas has
  `highlighted` and it appends last. §2 asks the Layers drop to use *the same create path*, so the
  door gained an optional `placement: { parent, index }` rather than growing a second creation
  function — the defaults (`ElementConfigRegistry.applyDefaults`), the seed (`seedNewNode`) and the
  `create` undo label all live behind that one door, and the editor's only other creation path
  (`NodePicker.utils.createNodeFunction`) has had to be taught each of them separately already.

### 6.2 A plan names an anchor, never an index

The tree draws **visual nodes only**; the graph's `children[]` can hold a `States` or a `Function`
parked under a Group. So a position computed from row positions is right on every fixture and wrong
on the first component that keeps a logic node under a visual one. A plan says *before this node* /
*after this node* / *append*, and the applier resolves it with `children.indexOf`.

### 6.3 The rule the refusals are actually made of

§2 says *a row inside a band is refused*. The rule that got built is one step wider and one step
simpler: **a row can be moved only while the canvas is editing the component that owns it** — which
is exactly the set TVW-004 already tints (AC3). It matters, and a spec holds it: the app **shell**
is drawn *above* every band in the tree, so a rule written as "rows below a band" would let a person
rearrange the shell from a page's Layers tab. It is refused with the same sentence the band gets,
naming its own component.

⚠️ **`LayerRow.tinted` is deliberately not what the decision reads.** It is computed the same way
today, and it is a *display* property: a structural rule that read it would follow the tint the day
the tint changes ([[a-client-property-read-as-a-fact-about-the-source]]).

### 6.4 Where the refusal is spoken

On the drag, not on the row: `PopupLayer.setDragMessage` writes on the thing following the cursor,
and a tooltip anchored to the row a person is dragging *away* from would be behind their own hand.
The row shakes on the drop, which is §2's word for it.

### 6.5 AC2 cannot be a jest spec, and here is the measurement that says so

AC2 asks for "a spec [that] drives every row of the §2 table against `ProjectModel`". It cannot:
`NodeGraphNode` imports `projectmodel` → `bugtracker`, which calls `platform.getUserDataPath()` at
module scope, so a spec that imports it reports **`Tests: 0 total`** — it fails to *run*
([[tests-0-total-can-mean-the-wrong-directory]]). Measured, not guessed: the probe is in this
session's scratchpad and every existing spec in `tests-unit` that touches this area imports a
*leaf* module for the same reason.

So AC2 splits: the **decision** for every row of the table is graded by `tests-unit/tvw-005`
(15 specs, 8 mutants), and the **resulting `children[]` order, the parent, the byte-identity of a
refused graph and the single undo step** are graded by the drive against the live `ProjectModel` —
which is the stronger half of the two anyway, since it uses the real models and the real undo queue.

## 7. Slice 1, driven — `drive-tvw005-drag.js`, 9 arms, 9 held (s16)

The gesture is dispatched as **mouse events**, not as calls into the hook: the 5px threshold, which
third of a row's height the pointer is in, and the row that stops propagation on mouse-up are the
claim. Against the corpus project, canvas on `/Pages/Main/Home`, whose `Page` node has three
instances under it.

| arm | reading |
|---|---|
| a legal drag carries no refusal sentence | hidden — the known-firing control for the two below |
| drag `Main Footer` above `Main Navbar` | `Main Footer \| Main Navbar \| Page Main` in the **model** |
| one ⌘Z puts it back | the three ids in their original order |
| a row **inside a band** refuses | `Header` (owned by `Main Navbar`): both graphs byte-identical |
| …and it says so | *This is part of Main Navbar — edit Main Navbar to change it* |
| a row **in the app shell** refuses | `Group` (owned by `/App`): both graphs byte-identical |
| …and it says so | *This is part of App — edit App to change it* |
| ⌥↓ on a focused row | `Page Main \| Main Navbar \| Main Footer` |
| the drive left the page as it found it | the original three |

### 7.1 🔴 The defect the drive found: the drag would not start if you moved DOWN

The 5px threshold was measured inside the pressed row's own `onMouseMove` — which is how the
Components tab does it, so it looked like the house pattern. A Layers row is **26px** high. Press in
the middle, move 13px *down*, and the next mouse event belongs to the row below, which has no press
of its own to compare against: the drag never begins and the person has done nothing. Downward is
the commonest direction there is in a tree.

**Measured**, not reasoned: a drag dispatched as `(x + 10, y + 10)` left `PopupLayer.isDragging()`
`false` with the handlers demonstrably bound to the row (`onMouseDown`, `onMouseMove`, `onMouseUp`
all present in its React props). The threshold is watched on the **window** now, from the press
until it is crossed or the button comes up. ⚠️ The same shape is still in `ComponentItem`; it is
not this task's to fix, and it is written down here because the next person to copy that pattern
should know.

### 7.2 What the instrument got wrong first, twice

- 🔴 **A row scrolled out of the panel answers `getBoundingClientRect()` with perfectly plausible
  coordinates**, and a press at them lands on `<html>`. Two runs read as *the drag will not start*
  when what was wrong was where the drive was pressing — `Main Footer` sits hundreds of rows below
  `Main Navbar` while `Page Main` is expanded. The drive now **collapses the siblings** (which is
  also what a person would do), scrolls each row into view, and refuses the arm unless
  `elementFromPoint` lands inside the row.
  [[a-rendered-surface-can-be-behind-a-blocker]]
- ⚠️ **The refusal arm's first version read an absence that was its own.** It looked for the drag
  message with a guessed selector and found nothing — which is indistinguishable from a build that
  says nothing. The class names are in `popuplayer.ts:363`. And the arm only means something beside
  the legal drag that shows **no** message, which is why that control is the first row of the table
  ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).

### 7.3 Where AC1 stands

AC1's first two sentences are green — the reorder in the model, the canvas, and one ⌘Z; the refusal
with its sentence. Its third needs the **drop-target strip on the Layers tab header** (§6), which is
not built. The preview half of AC1 ("the preview shows the cards above the hero") is not yet an arm:
the reorder is read in the model, not in the viewer's DOM.

## 8. Slice 2 — the strip, and the one thing that turned out not to be ours (s17, 2026-09-18)

Built: `planTabHeaderDrop` / `screenRootRow` / `refuseByKind` in `layersDrag.ts`, the three header
handlers in `useLayersDrag.ts`, the strip itself in `ComponentsPanelReact.tsx` and
`ComponentsPanel.module.scss`, and a return value on `NodeOperations.createNewNode` so a caller with
no pointer can select what it made. `tests-unit/tvw-005` is **22 specs** (was 15); the seven new ones
were mutation-tested, **4 mutants, each caught**. `tsc --noEmit` 0.

### 8.1 What the strip means, and the door §2 closed

§2's fourth row asks for a drop-target strip on the Layers tab header, and the sentence beside it —
*"the tab does not switch during the drag"* — rules out the other way to build it. A spring-loaded
header (open Layers on hover, let the drag carry on into the tree) is the gesture AC1's third
sentence literally describes, and it is the one §2 says no to. So **the strip is a destination, not
a doorway**: dropping on it places the component at the **end of the screen's root** and opens
Layers with the new row selected, and moving it from there is ⌥↑/⌥↓ or a second drag — both of which
slice 1 already built.

⚠️ **AC1's third sentence should be read against that.** "Drop it under the work strip" cannot
happen in one gesture while the two tabs are exclusive; what a person does is drop on the strip and
then move it. Richard's call if that is not what §2 meant — the question is in §10.

🔴 **The root a drop lands in is the first row the CANVAS's component owns, and it is rarely the
top of the tree.** The app shell is drawn above every band, so "the top of Layers" is `/App` — a
component the canvas is not showing, on every page at once. It is also `find`, not `filter`: a
component may hold more than one visual root and only the first is ever drawn
([[a-component-instance-renders-only-its-first-visual-root]]). A spec holds both.

⚠️ **The refusals are the tree's own**, reached through `refuseByKind` and `planComponentDrop`
rather than written again — a page dropped on the strip is refused in the words it is refused in
anywhere else, and a spec asserts the two plans are `toEqual`, not merely the same shape. The one
new sentence is for the one new case: the canvas's component has **no screen to put it on**
(`no-canvas-screen`, its own code so a spec cannot confuse it with the dragged component having
none).

### 8.2 🔴 `stopPropagation` on the drop killed the cleanup everybody else's drag relies on

The strip's `onMouseUp` stopped propagation, for tidiness — nothing else wants that mouse-up. But
React dispatches from the root container, so stopping there stops the **native** event before
`body`, and `body` is where `PopupLayer` ends its own drag and where this panel clears the state
that draws the strip. One drop on the strip left it **armed for the life of the panel**.

**It is invisible inside a single run.** The drive's at-rest control is its first arm, and on the run
that created the state it had already passed. It was caught on the second consecutive run
([[a-post-drive-control-reads-the-state-the-drive-leaves]]) — and then the fix had to be proved on
two consecutive runs *with no rebuild between them*, because a reload resets React state and would
have proved the remount rather than the fix ([[a-control-pair-proves-what-you-varied-only]]).

⚠️ **The same shape is still on a Layers ROW's `onMouseUp`** (`LayersTree.tsx`), and it was left
alone deliberately. There the hook calls `PopupLayer.dragCompleted()` and `endDrag()` itself, so no
*state* is stranded; what is stranded is `PopupLayer`'s `dragListeners.abort()`, which means the
body-level `mousemove` that carries the drag ghost keeps running until the next drag replaces it.
One leaked listener, invisible, and fixing it costs a re-drive of two green suites — so it is
written down rather than changed. The rule is the general one: **before `stopPropagation()` in a
mouse-up that ends a drag, name the handler you are stopping. If you cannot name one, do not stop
it.**

### 8.3 What the instrument got wrong, and what was over the panel

- A row's `textContent` carries its usage meta as well as its name, so the drive compared the
  product's correct sentence against `"GTM - Send Page Viewunplaced has no screen…"` and called a
  green build red. The name comes off the `title` attribute now.
- 🔴 **webpack-dev-server's overlay is an `about:blank` iframe the size of the window at
  z-index 2147483647.** While it is up every row in the panel is drawn and none of them can be
  pressed; two arms went UNGRADED on it. The reachability guard caught it (it reported *drawn but
  not reachable*, which is what it is for) and the drive now waits it out.

## 9. ⚠️ RETRACTED — AC1's preview half is green, and the retraction is worth more than the finding

**This section said the opposite for most of s17, and the way it was wrong is the useful part.**

AC1 says *"sees the page reorder in the preview"*. It was filed as **blocked by a runtime defect**,
on three measurements taken in this order:

1. the drag reorders the **model** and one ⌘Z restores it — 10 arms;
2. the preview's **document order is unchanged**, 4 seconds later, read through the fiber →
   `noodlNode` → `parentNodeScope.componentOwner` walk;
3. **the same with no Layers code involved at all** — a move made straight against
   `NodeGraphModel.detachNode`/`attachNode`, the calls `NodeOperations` makes for a canvas drag —
   while a spy on `ViewerConnection.send` showed the editor **does** send `nodeDetached` +
   `nodeAttached` with `childIndex: 0`.

That is a careful elimination, and it concluded *"no programmatic move of a node is visible in the
preview, including the canvas's own drag"*. It was written into this file, into the handoff and into
a memory.

🔴 **It was all one stale webpack watcher.** The dev stack's watchers had been running for hours
across a peer's directory add-and-delete; the editor bundle was reporting `TS2307` for modules that
exist while `tsc -p packages/noodl-editor --noEmit` read **0**, and the viewer was stale in the same
way. After `dev:stop` and a cold relaunch, with **no code change**:

- the same raw-model probe reorders the preview **within 800ms**, and the undo puts it back;
- `drive-tvw005-drag.js` is **11/11**, the preview arm reading `document order was [5, 17, 86], now
  [23, 35, 5]`;
- and three arms of `drive-tvw005-strip.js` that had gone red the same evening — a quick drop on the
  strip placing nothing at all — are green, taking it to **20/20, twice back to back**.

⚠️ **Nothing in the original measurements was false.** Each one was a real reading of a running
build; they were readings of a *bundle* that no longer matched the source. Elimination over a
candidate list cannot save you when the thing missing from the list is the instrument itself
([[elimination-over-an-unchecked-candidate-list]]). The order that would have cost ten minutes
instead of an hour: **a renderer behaving impossibly is a question about the bundle before it is a
question about the code, and `tsc --noEmit` on the tsconfig `ts-loader` uses answers it in one
command.** See [[the-test-ci-contamination-window-is-the-webpack]], fourth section.

## 10. Where the ACs stand, and the two questions for Richard

| AC | state |
|---|---|
| 1 | ✅ all three sentences driven — the reorder, the preview, the refusal, and the strip (§11's positioned drop) |
| 2 | ✅ decision: 22 specs. Order, parent, byte-identity, one undo step: 11 + 20 driven arms |
| 3 | driven for a move, for ⌥↓ and for the strip's placement — one ⌘Z each |
| 4 | **driven by a spy** on `NodeOperations.createNewNode`: one call, `{parent: <page id>, index: 3}` |
| 5 | ✅ **WORTHY** (Richard, 2026-09-18: *"Looks good"*). 10 shots, both themes, in `verdicts/TVW-005/2026-09-18` |
| 6 | ✅ **2985 specs, 8 failures, seed 19733, HEAD `1d342bc6` — the floor BY NAME** (2 NDA-017, 3 SUB-006, 3 SUB-011), readout mtime checked, none mine |

⚠️ The `test:ci` run at 21:22 is the **second** attempt. The first exited 1 having compiled nothing:
the editor's `test:ci` webpack typechecks `tests/ai/**`, and the checkout held a peer's in-flight
`VocabElement` change that spec had not caught up with
([[the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests]]). Reported with file:line, fixed
by them, re-measured here. ⚠️ **The harness reported that first run as exit 0** while the log ended
`TESTCI_EXIT=1` — gate on the number in the log.

**Both questions were put to Richard on 2026-09-18 and both are answered.**

- **AC5 — WORTHY.** *"Looks good."* ⚠️ The thing worth flagging was flagged and passed anyway: the
  reparent fill sits inside the region TVW-004 already tints, so in light theme it is a pale purple
  on a pale purple (`3-reparent-fill--light.png`).
- **AC1's third sentence — §11.** The gesture changed rather than the sentence; see below.

## 11. 🔴 RICHARD'S RULING: the tab springs open, and §2's sentence loses (2026-09-18)

Asked which of the two readings §2's fourth row should have, Richard answered:

> *"Were it possible to position the element at the right level of another component's interior
> elements without the second drag, that'd be ideal no?"*

Asked to choose between spring-loading the tab, revealing Layers inside the Components tab during a
drag, and keeping the two-step, he chose **spring-load**. Asked whether *"another component's
interior"* meant dropping INSIDE a placed component — which the band rule refuses — he chose
**no: position among the rows of the component the canvas is editing.**

**So two things are now settled, and one of them overturns the spec:**

1. 🔴 **§2's *"The tab does not switch during the drag"* is overruled.** Resting a component on the
   Layers tab for {@link SPRING_MS} (500ms) opens Layers **under the live drag**, and the existing
   row indicators and `planComponentDrop` take it from there. The strip keeps **both** meanings —
   let go and it lands at the end of the screen, hold and you aim — so nothing that was driven at
   s17 stopped being true.
2. ✅ **The band rule stands, untouched.** A drop into another component's interior is still refused
   in the same words. What the ruling asked for is the right *level* within the canvas's own
   component, which is what a positioned drop gives.

### 11.1 The three things the spring had to be built around

- 🔴 **Armed only when the drop would LAND.** The timer is set in `onTabHeaderOver`'s *ok* branch
  and nowhere else. A page held on the strip must not open a tree that will refuse it wherever it
  is let go — a drive arm holds one there for 1.1s and asserts the tab does not move.
- 🔴 **Armed once, not per `mousemove`.** Resting still is the gesture, and a resting pointer still
  emits moves; a timer restarted by each one never fires.
- 🔴 **The teardown listener is CAPTURE phase.** A Layers row that claims a drop calls
  `stopPropagation`, and React dispatches from the root container — so the bubbling listener that
  clears `componentDragging` would not run on the one gesture that matters most. This is §8.2's
  defect arriving by a second door, and it was closed before it could ship
  ([[stoppropagation-on-a-drop-kills-a-shared-drags-cleanup]]).

### 11.2 An abandoned spring puts the tab back

The tab switch is part of a gesture, so a gesture that does nothing undoes it: if the drag ends
without placing, the panel returns to the tab the person was on. If it places, Layers is where they
now want to be and it stays. ⚠️ The decision is taken on a **macrotask after** the mouse-up, because
the capture-phase listener runs *before* the row's drop handler has said whether anything landed.

### 11.3 What became reachable, and what it cost

Dropping a component **on a Layers row** was written in slice 1 (`planComponentDrop`, 4 specs) and
was **unreachable** until now: the tab it needs could not be open while the drag was alive. Reaching
it exposed one real gap — a placed node is selected by a **composed** path (`pathUnder`), because
the row for a node that did not exist a moment ago is not in the list the plan was made against, so
`onMoved`'s find-the-row-by-id quietly selected nothing.

### 11.4 The drive, and the hour spent measuring a cached module graph

`drive-tvw005-strip.js` grew five arms for the ruling. On the first run against the spring, **three
arms that had been green all evening went red** — a quick drop on the strip placed nothing at all —
while every spring arm passed. Four probes went into that before the cause turned up, and none of
them was the code:

- ⚠️ **The instrument's first fault was real and worth keeping.** The "quick" drop waited 240ms and
  then took a CDP round trip before releasing, which put the release at ~500ms — exactly
  `SPRING_MS`. The tab sprang, its handlers came off with it, and the drop landed on nothing. The
  dwell is a parameter now and the sample is taken *before* it.
- 🔴 **But the reds survived that fix, and the cause was `packages/noodl-editor/.webpack-cache`.**
  The renderer was being served a **stale module graph**: it still held a directory a peer had
  deleted and a resolution cache that predated the one they added, so the editor bundle reported
  four `TS2307`s for modules that are on disk — while `tsc -p packages/noodl-editor --noEmit` was
  exit 0 on the same tsconfig `ts-loader` uses. Two sessions' work read as broken; neither was.
  [[the-test-ci-contamination-window-is-the-webpack]]

🔴 **The lesson is the order of the two checks.** A renderer that behaves impossibly is a question
about the *bundle* before it is a question about the code, and `tsc --noEmit` against the same
tsconfig is the one-command way to tell them apart. Four probes, a bisect and a message accusing a
peer's tree all came before that command. ⚠️ And a probe that does not reload the page measures
whatever the page still holds — the stale-listener duplicates in the probe's own log said so twice
before it was noticed ([[a-control-pair-proves-what-you-varied-only]]).
