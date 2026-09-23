# Phase 101 — The inspector: properties get their own side

**Scoped:** 2026-09-23, from Richard's own drive of a 0.3.0 build (P100 §6.2, drive A), against
`cline-dev` HEAD `d7aad8a78`.
**Status: 🟡 INS-001 + INS-002 BUILT and RULED WORTHY by Richard on his drive (2026-09-23: *"It looks fucking awesome, well done, works great"*); INS-002 AC2 ✅ both halves; Jasmine `test:ci` at the floor on the whole pile (s3, 2026-09-24). INS-003 ✅ (s3): narrow-width Width/Height and Size Mode no longer clip. **Left: INS-004 on INS-003 — Richard's look at a narrow inspector (a % Width row wraps `Fixed` under the field below ~315px).**
**Prefix: `INS`.** **Ruled into existence by P100 R7 — "Panel move now, it's a watershed" — against
the recommendation to bank it. 0.3.0 waits on this phase.**

> "I'm wondering if this is a sign, destiny calling and telling us 'guys, you need to put the props
> panel as a new menu on the right side, because it's kind of a separate thing that takes over from
> everything else, but it could actually be used in conjunction with stuff on the left panels.' If
> you think about it, it's the only panel that can't be 'accessed' from the left icons menu, and it
> maybe should actually be permanently visible on the right side, saying 'no node selected' or
> something, collapsible if the user wants, and when you click on a node the props come up or the
> panel pops out and props come up. [...] But also, make sure that if I click a root node in the
> left layers or components panel, that the props come up. I shouldn't have to click it in the left
> layers menu, THEN also click the node itself in the node canvas."
> — Richard, 2026-09-23

## 1. The person sentence

> **Someone working in Styles, Layers, the backend or any other left-hand panel clicks a node —
> on the canvas, in Layers, anywhere — and its properties appear on the right, while the thing they
> were doing on the left stays exactly where they left it.**

## 2. Why this is right, from the code rather than the taste

The left rail answers *"what is in this app"* — components, styles, data, warnings, history. The
properties panel answers *"what is this one thing I'm pointing at."* Those are different axes.
Panels on one axis are supposed to compete for one slot; two axes sharing one slot is the defect,
and the codebase has been paying for it:

| what the one slot has cost | where |
|---|---|
| **The takeover itself.** `switchToNode` puts the node's panel into the only slot and stashes `previousActiveId`; `hidePanels` restores it. That is Richard's annoyance, entire | [`sidebarmodel.tsx`](../../../packages/noodl-editor/src/editor/src/models/sidebar/sidebarmodel.tsx) `switchToNode` / `hidePanels` |
| **A flag to stop the takeover** — `keepSidePanel` — because selecting from Layers made Properties *replace Layers on the first click in it*. TVW-004 found it by reading a screenshot and fixed it by **suppressing Properties** for any selection made from a panel. **That suppression IS Richard's second complaint**: he clicked `The paragraph` in Layers, it lit up, and no properties came | [`canvasSelection.ts:77-91`](../../../packages/noodl-editor/src/editor/src/models/selection/canvasSelection.ts#L77-L91) `keepsSidePanel` |
| **A second flag** (`disableHidePanels`) because the first did not reach the deselect, and **two fixes that guarded the wrong call site** before P94 STY-006 measured the right one | [`SelectionActions.ts:185-199`](../../../packages/noodl-editor/src/editor/src/views/nodegrapheditor/SelectionActions.ts#L185-L199) |
| **A width rule written around the alternation** — `components` declares no `defaultWidth` *because* it and `PropertyEditor` alternate in one slot and any difference jittered the canvas 48px | [`router.setup.ts:100-104`](../../../packages/noodl-editor/src/editor/src/router.setup.ts#L100-L104) |
| **A width group written around the swap** — FIX-009 stores `components`, `PropertyEditor` and `PortEditor` under one key, because storing them apart moved the divider — and the canvas — on every select and deselect | [`useSidePanelLayout.tsx:180-210`](../../../packages/noodl-editor/src/editor/src/pages/EditorPage/useSidePanelLayout.tsx#L180-L210) |
| **A rule that clears the canvas selection when any non-node panel opens** (FH-008), so a highlight never outlives the panel explaining it. Left alone after the move, **opening Styles would blank the inspector** | [`EditorEventBindings.ts:223-232`](../../../packages/noodl-editor/src/editor/src/views/nodegrapheditor/EditorEventBindings.ts#L223-L232) |
| **The asymmetry Richard named**: `PropertyEditor` is registered `transient`, so `getVisibleItems()` filters it off the rail. It is the one panel with no icon — the product already treats it as a different kind of thing | `sidebarmodel.tsx` `getVisibleItems` |

**So the move is not a new feature laid on top. It deletes the reason for two flags, a width group,
a deselect rule and a class of regression, and the selection that TVW-004 had to suppress can simply happen.**

## 3. The seam, measured 2026-09-23

- **One mount.** The whole editor is `FrameDivider(first=<SidePanel/>, second=<Document/>)` in
  [`EditorPage.tsx:409`](../../../packages/noodl-editor/src/editor/src/pages/EditorPage/EditorPage.tsx#L409).
  A right column is a second divider around `<Document/>`, not a rebuild.
- **One chokepoint for "show a node's panel".** `SelectionActions.ts:210` → `switchToNode`, and
  `:93` → `hidePanels`. Nothing else in the editor calls either.
- **Node panels are a category, not one panel.** `getNodePanelName` sends a node to
  `PropertyEditor` **unless its type declares `panels`** (e.g. `PortEditor`, or `none`). The right
  column hosts whatever `getNodePanelName` answers — never a hard-coded `PropertyEditor`.
- **The selection model exists.** TVW-003's `selectionStore` (sources `canvas | preview | layers |
  panel`) is built, and Layers already writes to it
  ([`ComponentsPanelReact.tsx:136-139`](../../../packages/noodl-editor/src/editor/src/views/panels/ComponentsPanelNew/ComponentsPanelReact.tsx#L136-L139)).
  **This phase subscribes the inspector to it; it does not build a second store.** A second
  selection store is the BCN-003 mistake P93 already names.
- **Popouts already flip.** The property panel's pickers go through `PopupLayer.showPopout` →
  `_positionPopout`, which flips to the opposite side when the requested one overflows
  ([`popuplayer.ts:890-903`](../../../packages/noodl-editor/src/editor/src/views/popuplayer.ts#L890-L903)).
  16 sites ask for `right`; from a right-edge column they should turn to `left` on their own.
  🔴 **"Should" is read from the code, not seen** — INS-003 drives every one. Only `Pages.tsx` uses
  the clamp-only `showPopup` (2 sites).
- **Width machinery exists and is per panel, per project, persisted** —
  [`useSidePanelLayout.tsx`](../../../packages/noodl-editor/src/editor/src/pages/EditorPage/useSidePanelLayout.tsx)
  (PNL-003). The inspector gets its own instance of the same rules, not a copy of the numbers.
- **The property editor is big — 167 files, 26,537 lines — and none of it needs to change** to move.
  That is the point of moving the *slot* rather than the panel.

## 4. Rulings

| # | question | ruling |
|---|---|---|
| **RI-1** | Where do a node's properties live? | ✅ **Right side, permanently visible, collapsible; says "no node selected" when nothing is.** Richard, 2026-09-23, verbatim above |
| **RI-2** | When a node is selected, what happens to the left panel? | ✅ **Nothing.** It is the whole complaint: *"it could actually be used in conjunction with stuff on the left panels."* |
| **RI-3** | Clicking a node in Layers or Components — do its properties show? | ✅ **Yes.** *"I shouldn't have to click it in the left layers menu, THEN also click the node itself."* |
| **RI-4** | A narrow window: the canvas loses the inspector's width. At the 1368px window of drive A, 52 rail + 328 left + ~328 right leaves **~660px** for preview and canvas together. Auto-collapse below some width, or always keep what the person set? | ⬜ **not asked** — INS-001 measures real widths first and puts the question with the numbers in it |

## 5. The tasks

| id | task | depends on | why |
|---|---|---|---|
| **[INS-001](INS-001-THE-SECOND-SLOT.md)** | The second slot: a right-hand column that hosts node panels, with its own width, collapse and empty state; `switchToNode` writes there and `hidePanels` stops touching the left | — | the move itself. RI-1, RI-2 |
| **[INS-002](INS-002-SELECTING-FROM-A-PANEL-SHOWS-THE-NODE.md)** | Selection from any source shows the node's properties; `keepsSidePanel` and `disableHidePanels` lose their reason and are removed; and why a Layers row in a component not being edited did not move the canvas | INS-001 | RI-3, and Richard's first Layers complaint |
| **[INS-003](INS-003-EVERYTHING-THAT-ASSUMED-THE-LEFT.md)** | Everything that assumed the properties panel lived on the left: the 16 `right` popouts, wide mode, the detached modes (PNL-009), the P93 alternation width rule, keyboard focus order | INS-001 | a move is only done when nothing still points at the old address |
| **[INS-004](INS-004-RICHARD-DRIVES-IT.md)** | The drive: Richard repeats drive A on the moved build and rules WORTHY | 001–003 | 🔴 **the only AC that grades the person sentence.** Every arm can be green while the thing on screen is wrong — P93 TVW-008 is the fifth time that happened |

## 6. 🔴 Cross-phase effects a later session must not be surprised by

- **P93 TVW-004's `keepsSidePanel` is removed by INS-002.** It was correct for a one-slot editor; it
  is the defect in a two-slot one. P93's board gets a line saying so.
- **P100 waits on this phase** (R7). The 0.3.0 release notes (UPG-006) get a headline they did not
  have: *properties moved to the right.* That is a change every existing user will see on first
  open, which P100's own person sentence says must be *told*, not discovered.

## 7. Out of scope

- **Redesigning the property editor's contents.** P92 owns how panels look. This phase moves the
  slot and changes nothing inside the 26,537 lines.
- **Moving any other panel.** The argument in §2 is about the selection axis; every left-rail panel
  is on the project axis and stays.
- **Multi-selection properties.** Whatever the property editor does for two selected nodes today,
  it does on the right.
