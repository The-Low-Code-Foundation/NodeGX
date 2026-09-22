# HLT-008 — the board, slice 3

**Built 2026-09-21 (session 10).** ✅ **On a driven session all six of Richard's defects are closed,
each by a gesture performed on the running board and read off the surface: 21/21 arms green on the
fixed build, 9/20 on the identical drive against HEAD's six source files.** 📋 **P93 AC7 — Richard's
WORTHY on the re-shot board, both themes — is the one criterion left, and it closes in P93.**

---

## 1. The number

`scripts/devtools/drive-hlt008-board.js`, fixture `tvw008-board-fixture.js --out "HLT-008 Board"`
(Primary Button 768 × auto with a scenario, Secondary Button stored 320 × 180, Ghost Button 768 × auto).

| arm — performed, then read | fixed | control (HEAD) |
|---|---|---|
| **B1** control: in App mode the reader sees `Workbench` (list heading) | ok | ok |
| **B1** board active: no chip, menu row, menu heading or picker heading says `Workbench` | ok — `Board · App preview · Board · Components` | **FAIL** — `Workbench board`, `Workbench` |
| **B2** 120px below a one-button frame's top edge is board | ok — frame 768 × **47** | **FAIL** — hit `webview`, frame 768 × 0 |
| **B2** control: 20px down the same column IS the frame's content | ok | ok |
| **B3** the gutter between two frames hit-tests to the board | ok | **FAIL** — `webview` |
| **B3** a wheel over the gutter pans | ok | **FAIL** — transform unchanged |
| **B3** ⌘+wheel over the gutter zooms | ok | **FAIL** |
| **B3** press on the gutter and drag pans | ok | **FAIL** |
| **B6** viewport identical before, during, after a frame drag | ok | **FAIL** — `48,48 → 93,83` |
| the frame moved under the pointer (reach) | ok | ok |
| **P93 AC5** re-run: nothing written to `bench.board` mid-drag | ok | ok |
| **P93 AC5** re-run: the release commits once | ok | ok |
| **B5** caption on its frame after the drop | ok | ok ⚠️ (see §3) |
| **B5** the frame's new box is its content | ok | ok ⚠️ |
| **B5** where the frame WAS is board again | ok | **FAIL** — `webview` |
| **B5** every frame's content is drawn where its border is (client DOM vs chrome) | ok | **FAIL** — client `[861,82]`, chrome `[861,35]`; Ghost at `[1184,262]`, chrome `[1184,0]` |
| **B4** press on the caption name that moves 72px does not leave the board | ok — chip `Board` | **FAIL** — chip `Primary Button` |
| **B4** same run: a press that does not move opens it on the Workbench | ok — chip `Ghost Button` | FAIL (already navigated by the arm above) |
| **P93 AC7** two theme shots of two different themes | ok | — |

Shots: `../../shots/hlt008-fixed-*.png` and `../../shots/hlt008-control-*.png` (same names, same
points in the drive). The AC7 pair for Richard is `hlt008-fixed-ac7-light.png` / `-ac7-dark.png`.

**Renderer log across every run of the session:** the only error class is the known `feed.json`
404 (HLT-004/HLT-013, classified correct). The half-second measuring poll added none — it runs
inside a `try` and behind a `.catch`, because `executeJavaScript` throws synchronously on a
`<webview>` that is not yet attached (the HLT-002/TVW-008 §10 family).

---

## 2. 🔴 What the task file got wrong — and the defect nobody named

§2 described six symptoms. **Measured, three of them are one mechanism and a fourth is a defect the
task never mentions.**

**(a) The white slab is the `<webview>`, not the frames.** The board renders every frame inside ONE
guest view sized to the union of all frames (`boardBounds`, with 768 for every content-sized
height). The guest's `body` is white, so the whole union painted as one slab — the 48px gutters
are *inside* it, which is Richard's "flush, no gutter" (B3). And a guest view takes every pointer
and wheel event over its whole box, so the board's own pan/zoom handlers heard nothing over any of
it — "eats the canvas until it cannot be panned". Measured before a line was written: a wheel over
a gutter panned **nothing** without a `clip-path` on the `<webview>` and **panned** with one, while
a wheel inside a frame still went to the client (it must — design mode selects by clicking there).

**(b) 🔴 The harness set a port Group does not have.** `boardHarness` gave the root `layout: 'none'`
to make the frames absolute. Group's layout port is **`flexDirection`**. `layout` was stored,
exported and ignored, so every frame fell into the default column: frame *n* drew below the sum of
the heights before it, while the editor drew its border at the stored coordinate. On the fixture
Secondary's content sat **46px under its own border** before anyone touched it; after a drag, Ghost
sat 262px below where its caption said it was. That is half of B5 ("content separates from its
slab"). **The spec that pinned this read the literal back** — `parameters.layout === 'none'` — with
a comment above it saying *"Without this the frames stack in a column"*. They did. This is
[[an-inert-parameter-in-a-corpus-example-teaches-a-lie]] inside the tool's own harness, and exactly
HLT-009's class one layer down.

**(c) B2's "readBenchFrameDefault treats an absent height as fill the stage" is not what the board
does.** On the board an absent height is `contentHeight` — correct. The 768 was
`ESTIMATED_CONTENT_FRAME_HEIGHT` sizing the guest, painted white. And the editor's frame border was
**0px tall** for every content-sized frame (`height: 'auto'` over absolutely positioned children),
so the slab was the only thing saying where a frame was.

**(d) B6 is two handlers on one press**, as suspected: the caption is inside the surface, so its
`mousedown` also started a background pan, and the document moved under the frame being dragged.

**(e) B4** is the browser's ordinary click: the name is inside the drag handle and travels with the
pointer, so the release lands on the same button.

---

## 3. What shipped

| row | fix | where |
|---|---|---|
| B1 | every chrome word from `scopeChromeLabels(scope)`, an exhaustive switch on the mode; board row `Board`; list and picker heading `Components` on the board | `previewScope.ts`, `benchWords.ts`, `PreviewChrome.tsx`, `ComponentBoard.tsx` |
| (b) | harness parameters built by pure `boardRootParameters` / `boardFrameParameters` — `flexDirection: 'none'`, plus `cssClassName` so each frame can be found | `boardSurface.ts`, `componentBench.ts` |
| B2 | the editor measures every frame's real box in the client (`BOARD_MEASURE_EXPRESSION`, polled at 500ms, renders only on change); stored height > measured > estimate; the caption says `768 × 47`, not `768 × auto` | `boardSurface.ts` `boardFrameBoxes`, `ComponentBoard.tsx` |
| B3 | `clip-path: path(…)` on the `<webview>`, one subpath per frame box — paint **and** hit-test | `boardClipPath` |
| B5 | one live position (`live`) feeds the border, the clip and the extent during a drag; with (b) the content is where the border is | `boardFrameBoxes(…, live)` |
| B6 | the background pan ignores a press on `[data-board-handle]` or a button | `onBackgroundMouseDown` |
| B4 | a drag that crossed `BOARD_DRAG_THRESHOLD` (surface px) suppresses the click that follows it; `isBoardDrag` existed and had no caller | `ComponentBoard.tsx` |
| — | the opening view starts 88px down, so the first caption is not under `Add components` | `BOARD_TOP_INSET` |

**B2's gesture** is the Workbench's **Set as default size** (FIX-011), unchanged and reached from
the caption's name — AC2's *"the Workbench's, not a second mechanism"*. A frame the author sized is
drawn at that size; one they did not is drawn at its content.

**Specs:** `tests-unit/hlt-008/boardSlice3.test.ts` (22). Its first describe grades **every harness
parameter against the node catalog's declared inputs for `Group`**, with a known-firing control
(`layout` is not declared). Mutants: putting `layout` back → 2 red; putting `Workbench board` back
→ 2 red. `tests/canvas/board-export.test.ts` now pins `flexDirection` and the absence of `layout`.

⚠️ **Two control-build arms passed and are weaker than they look.** "Caption on its frame" passes
on HEAD because react-rnd always kept the caption on its (chrome) frame — the separation was the
*client* content, which the client-DOM arm catches (FAIL on control). "Its new box is its content"
passes on HEAD because the unclipped guest covered everything. The first version of "where the
frame WAS is board" also passed on HEAD: it remembered a *screen* point, and on HEAD the drag
panned the board (B6), so the point landed on the gutter. It now maps a *board* coordinate through
the viewport as it is after the drop, and fails on control.

---

## 4. Owned, not fixed

- **A wheel or ⌘+wheel over a frame's content still goes to the client**, not the board. That is
  what lets design mode select inside a frame; the board pans and zooms from every gutter and the
  surround. On a board of wide frames at 100% that is less room than a person may want. Not
  one of the six.
- **On the board, the scope menu's list heading reads `Components`** where it read `Workbench`. The
  rows still open a component on the Workbench, and the chip switches to its name when they do.
  That is the literal of AC1; Richard's AC7 look is the ruling on whether it reads right.
- **Light theme:** frames are white on the light board with a subtle border — worth his eye in the
  AC7 pair.
- ⚠️ **Drive capture trap:** with `Emulation.setDeviceMetricsOverride` at `deviceScaleFactor: 1`
  the guest (DPR 2) is composited at half size in a capture — three buttons crammed into the first
  frame. It is not a layout bug. The drive pins DSF 2.
