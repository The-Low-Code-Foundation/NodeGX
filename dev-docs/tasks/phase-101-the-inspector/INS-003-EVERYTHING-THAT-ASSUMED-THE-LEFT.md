# INS-003 — Everything that assumed the properties panel lived on the left

**Opened 2026-09-23.** **Status: ✅ DONE s3 (2026-09-24) — rows 1–6 and both ACs. Two real defects fixed (row 2's popup on its own button; row 6's clipped number and Size Mode). Three pre-existing gaps recorded, not fixed (§5).** Depends on INS-001.

## 1. The person sentence

> **Every picker, popout and mode the properties panel had on the left works the same on the
> right — nothing opens off-screen, over its own anchor, or pointing the wrong way.**

## 2. The rows

1. **The 16 `position: 'right'` popouts.** They go through `PopupLayer.showPopout` →
   `_positionPopout`, which flips to the opposite side when the requested one overflows
   (`popuplayer.ts:890-903`) — so from a right-edge column they *should* open leftwards. Read from
   the code, **never seen**. Drive each and shoot it. The one that does not flip is the finding.
2. **`Pages.tsx`'s two `showPopup` calls** go through the clamp-only path (`popuplayer.ts:682`) —
   no flip. Read their `position` and drive them.
3. **Wide mode and the detached modes (PNL-009)** belong to the left panel. Decide what the
   inspector has: none, or its own. ⬜ probably a question for Richard with a shot.
4. **FIX-009's width group** (`useSidePanelLayout.tsx:180-210`) — its reason is gone. The legacy
   read leg stays (dropping it resets every user's width on upgrade); the comment and the group
   membership are corrected.
5. **Keyboard focus order** — Tab from the canvas used to reach Properties on the left.

6. 🔴 **Found on the drive, 2026-09-23: the property editor's numeric fields clip at the width
   Richard chose.** He dragged the inspector to **301px** (persisted — `inspector.width = 301`). At
   that width the Width/Height inputs are **18px wide for `100`, which needs 28** — the shot reads
   `1(`. Two more clip: `var(--space-3)` (70 of 101px) and `Include padding and border` (128 of
   193). **Not caused by the move**: the same editor in the left panel clips the same way below
   ~328 (its minimum is 240). **Made likelier by it**: the right column competes with the canvas,
   so people will run it narrow. The fix is in the property editor's row layout (the value column
   should not shrink a number below its digits), **not** a higher `MIN_INSPECTOR_WIDTH` that
   overrides a width the person chose.

## 3. Acceptance criteria

1. A shot per popout row, arrow pointing at its anchor, fully inside the window.
2. Nothing in the editor source refers to Properties being "in the side panel" without being true.

## 4. Measured s1 (2026-09-23)

**Row 1 — the `showPopout` pickers flip. ✅ seen, one of the 15.** The colour picker on `Section
head`'s swatch (anchor x 1218, window 1368) opened at x **973–1201** — to the LEFT of its swatch,
fully inside the window, arrow class `right` (what a left-placed popout wears)
([shot 05](shots/05-colour-picker-flips.png)). The other 14 `position: 'right'` sites all go through
the same `PopupLayer.showPopout` → `_positionPopout` call, so the flip is one mechanism graded once
on screen — ⚠️ **not 15 shots**, and a picker whose *content* misbehaves at the new position would
not be caught by this.

**Row 2 — 🔴 `Pages.tsx`'s *Add new page* was CLAMPED ONTO ITS OWN BUTTON. FIXED.**
- **Before:** Page Router selected, *Add new page* (x 1095–1329) pressed → popup at x **1136–1366**,
  **overlapping its anchor**, arrow class `left` pointing into the column; the Pages and Layout
  sections hidden under it ([shot 06](shots/06-add-page-popup-BEFORE.png)). `showPopup` computed the
  requested side and clamped; it never flipped. From the left panel it never had to.
- **Fix:** the placement moved out of `showPopup` into a pure function,
  [`PopupLayer/placeBesideAnchor.ts`](../../../packages/noodl-editor/src/editor/src/views/PopupLayer/placeBesideAnchor.ts),
  which flips to the opposite side when the requested one overflows **and the other is genuinely
  better** — the same rule `_positionPopout` uses — then clamps. `OPPOSITE_POSITION` moved with it
  (both paths share it). The arrow and its offset now follow the side the popup **ended on**.
  It is a module of its own because `popuplayer.ts` imports `Icon`, whose `require.context` stops
  jest before a row runs.
- **Spec:** `tests-unit/ins-003/placeBesideAnchor.test.ts`, 4 rows — the drive's own geometry, a
  popup with room staying put, a flip that would be worse NOT taken, a vertical flip. **Mutant —
  the old clamp-only behaviour — 2 red, both controls green.** ⚠️ The first version of the
  "no better" row was **my** wrong expectation (a 1500px popup at the right edge IS better off
  flipped: 417px of overflow against 1473) — corrected to geometry where flipping really is worse.
- **After, on screen**, with the running module checked for the flip (and for the mutant NOT being
  live — the mutant run had triggered rebuilds): popup at x **855–1085**, no overlap with its
  button, inside the window, arrow class `right` ([shot 07](shots/07-add-page-popup-AFTER.png)).
- Gates: both typechecks ✅, full editor jest **541 suites / 8,585 tests ✅** (8,581 + 4).
- ⚠️ `showPopup` is shared by every `showPopup` caller in the editor, not just `Pages.tsx`. The flip
  only changes a popup that **already hung off the window**; one that fitted is placed exactly as
  before (the control row). Not driven for other callers.

**Row 6 — narrow-width clipping:** recorded above; not fixed.

## 5. s3 (2026-09-24)

**Row 3 — wide/floating/full modes: the inspector gets none, by RI-1's own words.** The left panel
has five modes (`docked | wide | hidden | floating | full`, `useSidePanelLayout.tsx:61`); its header
buttons come through `PanelModeSlotProvider`. The inspector has a drag width and collapse — which is
what RI-1 asked for (*"permanently visible on the right side … collapsible if the user wants"*).
Floating would put Properties back **over** the canvas, the thing the move took it off. Recorded as
a decision, not asked as a ruling; it is one line to Richard in the session's report and reversible
if he wants a mode.

**Row 4 — FIX-009's width group: the code stays, the comment is rewritten.** After INS-001 nothing
swaps in the left slot, so `components` is the group's only live member. Both parts of the code
still have a job, measured from `storedWidthFor`/`persistWidth`:
- `selection-slot` is the key every width dragged **since** FIX-009 was written under. Renaming it,
  or taking `components` out of the group, resets every user's Layers/Components width.
- The legacy leg reads a pre-FIX-009 width stored under `PropertyEditor`/`PortEditor` — the same
  slot's width at the time — so it is still the right fallback for `components`.
The Jasmine `tests/sidepanel/widthGroups.spec.ts` grades exactly those two things and stays valid.
The docblock said the panels *"swap as the canvas selection changes"* and that *"deselect restores
whichever panel was active before"* — both false since INS-001. Rewritten to say what is true.

**AC2 — "nothing in the source says Properties is in the side panel when it isn't."** Grep over
`src/editor/src` for property panel/editor near sidebar/side panel/left, excluding P101's own
comments: **3 stale sites**, each a *behaviour* chosen because selecting a node used to take over
the left panel:

| site | behaviour | after P101 |
|---|---|---|
| `workflowTriggerNodes.ts` `disableSelect` on a trigger redraw (WFA-008) | a redrawn trigger is not selected | the unmount reason is gone; the flag keeps its first reason (a redraw is not a creation). Comment rewritten |
| `ProvenancePanel.tsx` `reveal` vs row click | click expands, the arrow jumps | the swap is gone; the two gestures stay because **Richard asked for both**. Comment rewritten |
| `RecordingOverlay.tsx` interaction rows | opens Provenance, does not select | selecting would now be safe; it is just not asked for. Comment rewritten |

No behaviour changed — each is still defensible on its own, and changing one is a product call, not
a consequence of the move.

**Row 5 — keyboard focus order: measured, better than before, nothing to fix in P101.** Nothing in
the editor handles Tab (`KeyCode.Tab` is only defined), so the order is the DOM's: left panel →
document → inspector. Driven with real `Input.dispatchKeyEvent` Tabs on one CDP connection with
focus emulation, after a trusted click on the `Wordmark` node on the canvas:
- The click leaves focus on `<body>` — the graph canvas is `tabIndex = -1`, focusable by script,
  never a Tab stop.
- **Tab ×9** walks the canvas overlay and bottom bar (Record, zoom, fit, …); **Tab 10 is the
  inspector** (its collapse button), then the node name, the header icons, the Properties tab.
  Before P101 Properties sat *before* the document in the DOM, so forward Tab from the canvas never
  reached it at all.
- ⚠️ **Shift+Tab from the canvas goes into the embedded preview and stays there** — every further
  Shift+Tab moves inside the webview's own page. Not P101's (the preview was always between the
  canvas and the left panel); recorded, not fixed.
- ⚠️ **The inspector's collapse button has no accessible name.** Nor does any `IconButton` in the
  editor: it takes no `aria-label`/`title`, and the left panel's mode buttons wrap it in a hover
  `Tooltip`, which names nothing either. An editor-wide gap in `IconButton`, not the move's.

**Row 6 — narrow-width clipping: FIXED, two rows.**
- **Width/Height (`NumberUnitInput`).** The number was the only part of the row allowed to shrink:
  at 301px it got **18px for `100` (needs 28)** beside a 46px `Fixed` ([shot 08](shots/08-narrow-rows-BEFORE.png)).
  The label column could not give — it is fixed by CHR-009 R6 so every control's left edge lines
  up. Now the value has a floor of `calc(3ch + 8px)` (with `width: 0` and a zero basis, so an
  `<input>`'s ~150px intrinsic width stays out of the sum), `Fixed` wraps under the field when the
  track cannot hold both, and a row that draws `Fixed` passes `alignTop` so its label sits on the
  field's line. Three digits is the most that fits at the inspector's **260px minimum** (track
  ≈ 87px beside unit + token button); four would clip the token button there.
- **Size Mode (`SizeModeInput`)** — found in this session's shot, not in s1's list: its two axes
  need a 135px track, so below **~323px** the row's `overflow: hidden` cut the H segment — **22 of
  26px at 301**. The H axis now wraps under W, same `alignTop`.
- **Drive** (drive copy, `Wordmark` selected, inspector width forced in the page and then restored
  to Richard's saved 301):

  | inspector | Width field | clipped | `Fixed` | Size Mode buttons hidden | rows | label on the first line |
  |---|---|---|---|---|---|---|
  | before, 301 | 18px | **yes** | same line | **1 of 4** | 30 | — |
  | 260 (min) | 29px | no | wraps | 0 of 4 | 60 | ✅ |
  | 301 | 70px | no | wraps | 0 of 4 | 60 | ✅ ([shot 09](shots/09-narrow-rows-AFTER.png)) |
  | 328 (default) | 45px | no | same line | 0 of 4 | 30 | ✅ |
  | 400 | 117px | no | same line | 0 of 4 | 30 | ✅ |

  A px row (Border Radius) stays one line and aligned at every width.
- **Spec** `tests-unit/ins-003/numberFieldFloor.test.ts`, 4 rows, **source pins only** — the
  component uses hooks and cannot render in this jest, and jsdom has no layout, so the drive above
  is the grade. Mutant (floor → `0`, wrap removed): the 2 NumberUnitInput CSS rows red, the control row green.
- Gates: both typechecks ✅, editor jest **546 suites / 8,639 tests ✅**. `test:ci` not re-run for
  this delta: CSS plus one optional prop, and no Jasmine spec names either component.
- ⚠️ **Not fixed:** a token value shown as text (`var(--space-3)`, 70 of 101px) still ellipsises in
  a narrow field, and a long toggle label (`Include padding and border`) ellipsises by CHR-009 R6's
  own rule, with its full text in `title`.

**INS-003 is done** apart from the three ⚠️ lines above, none of which the move caused.
