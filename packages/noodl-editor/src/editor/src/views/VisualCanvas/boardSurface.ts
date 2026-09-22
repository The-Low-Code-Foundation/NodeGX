/**
 * TVW-008 slice 2 — the rules the board's surface runs on, with no React in them.
 *
 * `benchBoard.ts` owns what is *stored* (the frames, their coordinates, what
 * reaches `project.json`). `componentBench.ts` owns what is *rendered* (the
 * harness, the export, the normalising bounds). This module is the third thing
 * and the one a person actually reads: the caption under each frame, the list
 * the picker draws, the viewport the board is looked at through, and the single
 * question of when the export has to be rebuilt.
 *
 * 🔴 **Pure, and it has to stay that way.** `ComponentBoard.tsx` imports `Icon`,
 * whose `require.context` fails ts-jest at load, so nothing written in that file
 * can be graded by a `tests-unit` spec — the same constraint that put
 * `readMenuComponents` in `previewScope.ts` rather than in `PreviewChrome.tsx`.
 * Nothing here may import the authoring barrel either: it reaches `ProjectModel`
 * and `Exporter`, which is why `benchParameterContent` lives in `benchInputs.ts`
 * and is graded from the Jasmine `tests/` tree instead.
 *
 * @module noodl-editor/views/VisualCanvas/boardSurface
 */

import { BOARD_GUTTER } from './benchBoard';
import { benchTargetLabel, type BenchTarget } from './previewScope';

/**
 * What a frame's caption says, in the pieces the surface draws separately.
 *
 * Returned as parts rather than as one string because the name carries its own
 * weight on screen — `benchCaption` splits for the same reason — and because a
 * spec that asserts the four answers separately says which one is wrong.
 */
export interface BoardFrameCaption {
  /** The component's leaf name. */
  label: string;
  /** `×4`, or `unplaced`. */
  usage: string;
  /** `360 × 200`, measured where the board has measured it. */
  size: string;
  /** `scenario: default`, or `no inputs set`. */
  values: string;
}

/** The separator between a caption's parts, exported so the joined form and the drawn one agree. */
export const CAPTION_SEPARATOR = ' · ';

/**
 * The word for a component nothing places.
 *
 * 🔴 **The components panel's word, imported as a decision rather than retyped
 * as a string.** `rowMetaFor` returns `{ tone: 'unplaced', text: 'unplaced' }`
 * and `RowMetaLabel` gives it the tooltip *Nothing in this app places this
 * component*. A board that said `×0`, or `unused`, would be a second dialect for
 * a fact the panel two columns away is already stating — which is the drift
 * `benchWords.ts` exists to prevent, arriving from the other direction.
 */
export const UNPLACED = 'unplaced';

/** What the caption says when the component has no saved scenario. */
export const NO_INPUTS_SET = 'no inputs set';

export interface BoardFrameCaptionInput {
  /** The component's legacy name. */
  target: string;
  /**
   * How many nodes in the project instantiate it.
   *
   * 🔴 **`usage.instances.length`, never `rowMetaFor`** — TVW-007 AC2's warning,
   * arriving on the surface where its population is *not* empty. `rowMetaFor`
   * hands a routed page its **route** instead of a count, so a page on the board
   * would be captioned `/about` where every other frame says how many times it
   * is placed. TVW-007 could measure that away (0 instance nodes point at a
   * routed page in 128 projects); this cannot, because §2 lets a page be picked.
   */
  instances: number;
  /** The frame's authored width — `bench.frame` or the 768 default. */
  width: number;
  /** The authored height, or `null` for *as tall as its content*. */
  height: number | null;
  /** The frame's real box once the board has one. See {@link boardSizeLabel}. */
  measured?: { width: number; height: number };
  /** The name of the first stored scenario, or `null`. */
  scenario: string | null;
}

/**
 * The size half of a caption.
 *
 * ⚠️ **Measured beats asked-for**, which is `benchSizeLabel`'s standing rule and
 * is load-bearing here rather than a nicety: the ordinary frame has
 * `height: null` — §6.4 measured **3 stored frames in 5,922 components** — so
 * for almost every frame on almost every board the only true height is the one
 * the runtime laid out. Before it has, the caption says `auto` and does not
 * invent `ESTIMATED_CONTENT_FRAME_HEIGHT`'s 768: that number exists to give the
 * root Group a scroll extent, and printing it beside a component would be the
 * tool stating a size the component never claimed.
 */
export function boardSizeLabel(width: number, height: number | null, measured?: { width: number; height: number }): string {
  if (measured) return `${Math.round(measured.width)} × ${Math.round(measured.height)}`;
  return `${width} × ${height === null ? 'auto' : height}`;
}

/** The caption under one frame, in parts. */
export function boardFrameCaption(input: BoardFrameCaptionInput): BoardFrameCaption {
  return {
    label: benchTargetLabel(input.target),
    usage: input.instances > 0 ? `×${input.instances}` : UNPLACED,
    size: boardSizeLabel(input.width, input.height, input.measured),
    values: input.scenario ? `scenario: ${input.scenario}` : NO_INPUTS_SET
  };
}

/** The same caption as one string — for a title attribute, and for grading the join. */
export function boardFrameCaptionText(input: BoardFrameCaptionInput): string {
  const parts = boardFrameCaption(input);
  return [parts.label, parts.usage, parts.size, parts.values].join(CAPTION_SEPARATOR);
}

/**
 * The strip caption, and the one string on this surface AC7 has already ruled on.
 *
 * 🔴 **It does not mention data, and that is the ruling rather than an
 * omission.** TVW-008 was written with the mock's wording — *"Every visual
 * component in its own frame, at its saved size, with its first scenario. Sample
 * values, not the app's data."* — and Richard cut exactly that sentence from the
 * single bench on 2026-09-18, because *sample* was doing two jobs within 44px:
 * the caption meant synthesised **input** values and the summary below meant
 * backend **records**. `benchWords.ts` records the ruling and the rule it left
 * behind: the data story is told **once**, and the surface that owns it is the
 * one already telling it.
 *
 * ⚠️ On the board that owner is the **frame caption**, not this line: `scenario:
 * default` / `no inputs set` says where each frame's values came from, per
 * frame, where the frame is. A strip sentence repeating it in a second
 * vocabulary is the defect AC7 closed, rebuilt one surface along.
 */
export function boardCaptionRest(frameCount: number): string {
  if (frameCount === 0) return '— nothing on it yet.';
  const counted = frameCount === 1 ? '1 component' : `${frameCount} components`;
  return `— ${counted}, side by side at their own sizes.`;
}

/** The empty board's heading. §2: the ordinary first sight, not an error. */
export const BOARD_EMPTY_TITLE = 'Put components side by side';

/**
 * What the empty board says.
 *
 * §6.1 measured **23% of projects** opening the board on nothing, and §2 gave it
 * no empty state at all. It is the second commonest outcome after "a handful of
 * frames", so it is written as the surface's own explanation rather than as a
 * failure — and it names the one question this surface answers that neither the
 * app preview nor the single bench can: *do these three look right together?*
 */
export const BOARD_EMPTY_BODY =
  'Pick two or three components to see them at their real sizes on one canvas — three versions of a button, say, that the running app never shows together.';

/** The button on the empty state, and the one in the strip once there are frames. */
export const BOARD_ADD = 'Add components';

/** What `Add all` offers, bounded by `canAddAll`. */
export const BOARD_ADD_ALL = 'Add all';

/** A row in the board's picker. */
export interface BoardPickerRow extends BenchTarget {
  /** Already on the board. §2: a component may appear once; picking it twice is the scenario's job. */
  placed: boolean;
}

/**
 * The picker's rows: the bench's own list, marked with what is already on the board.
 *
 * ⚠️ **`benchTargets` and its exclusions, not a second list.** §2 names it
 * explicitly — same cloud exclusion, pages allowed but not defaulted in — and
 * the board having its own idea of what is pickable is how the two surfaces end
 * up disagreeing about what a component is.
 *
 * ⚠️ A placed row is **kept and marked**, never filtered out. A list that
 * silently shortens as you pick from it loses the one thing the picker is for on
 * a surface whose whole subject is comparison: seeing that `Primary Button` is
 * already there is the answer to *"did I add it?"*, and an absent row is not.
 */
export function boardPickerRows(
  targets: readonly BenchTarget[],
  placed: ReadonlySet<string>
): BoardPickerRow[] {
  return targets.map((target) => ({ ...target, placed: placed.has(target.name) }));
}

/** How the board is being looked at: the document's top-left in surface pixels, and the scale. */
export interface BoardViewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * The zoom range.
 *
 * 🔴 **Not §2's 25%–100%**, and R-7 is why: that floor existed to make an
 * every-component board fit, and §6.2 measured that it could not — 46% of
 * projects could not be shown whole at 25%. A picked set of two or three frames
 * has no fitting problem, so the range is simply what reading a component needs:
 * far enough in to check a label, far enough out to hold a handful of frames at
 * 768px each. There is deliberately **no fit-to-screen**: the arrangement is
 * something a person made, and a control that re-frames it on a whim is a
 * second opinion about a layout they already gave.
 */
export const MIN_BOARD_ZOOM = 0.1;
export const MAX_BOARD_ZOOM = 4;
/**
 * How far below the surface's top edge the board's first row starts.
 *
 * P99 HLT-008 — at `BOARD_GUTTER` the first frame's caption (drawn *above* its frame) sat at 27px,
 * under the `Add components` button pinned at 8px in the same corner: the first thing on the board
 * was a caption half-covered by the board's own control. This clears the button and the caption.
 */
export const BOARD_TOP_INSET = BOARD_GUTTER + 40;
export const DEFAULT_BOARD_VIEWPORT: BoardViewport = { x: BOARD_GUTTER, y: BOARD_TOP_INSET, zoom: 1 };

/** Clamped, and a non-finite zoom reads as 1 rather than as a blank board. */
export function clampBoardZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_BOARD_ZOOM, Math.max(MIN_BOARD_ZOOM, zoom));
}

/**
 * Zoom about a point, keeping whatever is under the pointer under the pointer.
 *
 * ⚠️ **The clamped zoom is what the offset is solved for**, not the requested
 * one. Solving with the requested factor and clamping afterwards drifts the
 * board sideways every time a scroll runs into the end of the range — the
 * gesture stops scaling but never stops moving, which reads as the board
 * slipping out from under the cursor.
 */
export function zoomBoardAt(viewport: BoardViewport, factor: number, pointer: { x: number; y: number }): BoardViewport {
  const zoom = clampBoardZoom(viewport.zoom * (Number.isFinite(factor) ? factor : 1));
  if (zoom === viewport.zoom) return viewport;

  // Where the pointer is in board coordinates, which must not move.
  const boardX = (pointer.x - viewport.x) / viewport.zoom;
  const boardY = (pointer.y - viewport.y) / viewport.zoom;

  return { x: pointer.x - boardX * zoom, y: pointer.y - boardY * zoom, zoom };
}

/** Pan by a surface-pixel delta. Unclamped: §5 asks that a frame dragged far away stay reachable. */
export function panBoard(viewport: BoardViewport, dx: number, dy: number): BoardViewport {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return viewport;
  if (dx === 0 && dy === 0) return viewport;
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

/**
 * The drag threshold, in surface pixels, before a press on a frame becomes a move.
 *
 * §2: clicking a frame benches it, dragging it does not — so the two gestures
 * start identically and something has to separate them. TVW-005 found the
 * opposite failure on a 26px row, where a 13px threshold made an ordinary click
 * register as a drag; a frame is hundreds of pixels tall, so the risk here is
 * the other one, and the number is small enough that a deliberate drag is never
 * swallowed.
 *
 * ⚠️ **Measured in surface pixels, before the zoom divide.** A threshold applied
 * to board coordinates would be four times as hard to cross at 400% and a
 * quarter as hard at 25% — the same hand movement meaning different things
 * depending on how far out you happen to be looking.
 */
export const BOARD_DRAG_THRESHOLD = 4;

/** Whether a press that has moved this far is a drag rather than a click. */
export function isBoardDrag(dx: number, dy: number): boolean {
  return Math.abs(dx) >= BOARD_DRAG_THRESHOLD || Math.abs(dy) >= BOARD_DRAG_THRESHOLD;
}

/**
 * What the mounted export is a function of — and therefore when it must be rebuilt.
 *
 * 🔴 **Positions are deliberately NOT in this signature, and that is what keeps
 * a drag cheap.** A changed export makes the runtime call `location.reload()`
 * (`ViewerConnection.ts:581`), so an export rebuilt from every committed drop
 * would flash the whole board — every frame re-rendered, every scroll position
 * inside every component lost — each time somebody nudged one. Positions travel
 * instead as `parameterChanged` updates to each frame Group's
 * `marginLeft`/`marginTop`, which is the mechanism the single bench already uses
 * for an input edit and for exactly the same reason.
 *
 * ⚠️ **The origin IS in the signature**, and that is not an inconsistency.
 * `boardHarness` normalises every frame through `boardBounds`, so `marginLeft`
 * is `x - minX`: while `minX` holds, a live update and the harness agree. A drop
 * that moves a frame *past* the current top-left extreme changes `minX` for
 * everything, and a live update alone would then be computing its offset from an
 * origin the document no longer has — every other frame silently off by the
 * difference. That case rebuilds; it is the only one that does, and on a board
 * of frames laid out left to right it is the drag that goes furthest left.
 */
/**
 * The separator inside a signature's target list.
 *
 * ⚠️ A newline, because a component's legacy name cannot contain one and a
 * comma very nearly can: `['/A,B']` and `['/A', 'B']` would otherwise share a
 * signature, and the board would keep an export built for the wrong membership.
 * Written as an escape rather than as the character it stands for — the first
 * version of this line held a literal NUL byte, which type-checked, passed and
 * made `grep` treat the whole file as binary.
 */
const NAME_SEPARATOR = '\n';

export function boardExportSignature(
  frames: readonly { target: string }[],
  origin: { minX: number; minY: number }
): string {
  return `${frames.map((frame) => frame.target).join(NAME_SEPARATOR)}@${origin.minX},${origin.minY}`;
}

// ── P99 HLT-008 — the frames as a person sees them ──────────────────────────────────────────────

/**
 * The height a content-sized frame is *assumed* to be before the board has measured it.
 *
 * ⚠️ **An estimate, and named as one**, and since HLT-008 only a fallback. It used to be the
 * height every content-sized frame was *drawn* at: the board's one `<webview>` was sized to the
 * estimate and painted white across its whole box, so a `Primary Button` with no saved size stood
 * in a 768px white slab (Richard's B2). The editor now measures each frame's real box in the
 * running client ({@link BOARD_MEASURE_EXPRESSION}) and this number only stands in until the first
 * answer arrives. The root Group still needs it, because an absolutely positioned child contributes
 * nothing to its parent's size and the extent has to exist before anything has rendered.
 */
export const ESTIMATED_CONTENT_FRAME_HEIGHT = 768;

/** A `dimension` port value. `{ value, unit: 'px' }`, never a bare number — see `boardFrameParameters`. */
const px = (value: number) => ({ value, unit: 'px' });

/**
 * The CSS class every frame Group carries, so the editor can find and measure it in the client.
 *
 * A class rather than a DOM walk from `#root`, because the runtime's wrapper depth is the
 * runtime's business: a measurement that counted `div`s would break the first time the viewer
 * gained a wrapper, and it would break by measuring the wrong box rather than by failing.
 */
export const BOARD_FRAME_CLASS = 'nodegx-board-frame';

/** The per-frame class, carrying the frame's index in `boardFrameMounts` order. */
export const boardFrameClass = (index: number) => `${BOARD_FRAME_CLASS}-${index}`;

/**
 * The board root Group's parameters.
 *
 * 🔴 **`flexDirection: 'none'`, and until HLT-008 this said `layout: 'none'` — a port Group does
 * not have.** Group's layout input is named `flexDirection` (`group.ts`, *Layout* in the panel);
 * `none` is what calls `setLayout('none')`, which is what makes `Layout.size` give each child
 * `position: absolute`. `layout` was stored, exported and ignored, so every frame fell into the
 * default column: frame *n* was drawn below the sum of the heights of the frames before it, while
 * the editor drew its border and caption at the stored coordinate — content 46px under its own
 * frame on the fixture, and further on every frame after. The spec that pinned this read the
 * parameter back out of the harness (`parameters.layout === 'none'`) and passed on the defect; the
 * spec that replaces it grades every key against the node catalog's declared inputs for `Group`
 * ([[an-inert-parameter-in-a-corpus-example-teaches-a-lie]], arriving in the tool's own harness).
 */
export function boardRootParameters(extent: { width: number; height: number }): Record<string, unknown> {
  return {
    flexDirection: 'none',
    sizeMode: 'explicit',
    width: px(extent.width),
    height: px(extent.height)
  };
}

/**
 * One frame Group's parameters.
 *
 * - **`sizeMode`** named rather than defaulted: it decides whether `height` is read at all
 *   (`layout.ts`), which is BEN-001's warning about wrappers.
 * - **`{ value, unit: 'px' }`**: `width`/`height` are `dimension` ports whose default unit is `%`,
 *   so a bare `768` would be 768 percent.
 * - **`marginLeft`/`marginTop`** are the offsets from the root's origin — there are no `left`/`top`
 *   ports — normalised through the board's `minX`/`minY`.
 * - **`cssClassName`** is how the editor finds the frame to measure it. See {@link BOARD_FRAME_CLASS}.
 */
export function boardFrameParameters(
  frame: { x: number; y: number; width: number; height: number | null },
  origin: { minX: number; minY: number },
  index: number
): Record<string, unknown> {
  return {
    sizeMode: frame.height === null ? 'contentHeight' : 'explicit',
    width: px(frame.width),
    // Omitted when the content decides it: a height `contentHeight` ignores is a number nothing reads.
    ...(frame.height === null ? {} : { height: px(frame.height) }),
    marginLeft: px(frame.x - origin.minX),
    marginTop: px(frame.y - origin.minY),
    cssClassName: `${BOARD_FRAME_CLASS} ${boardFrameClass(index)}`
  };
}

/**
 * What the editor runs inside the board's client to read every frame's real box.
 *
 * Returns `[index, width, height]` triples as JSON. Offsets, not `getBoundingClientRect`: the
 * client document is never transformed (the editor scales the `<webview>` from outside), so layout
 * pixels are board pixels.
 */
export const BOARD_MEASURE_EXPRESSION = `JSON.stringify(Array.from(document.querySelectorAll('.${BOARD_FRAME_CLASS}')).map(function (el) {
  var m = /${BOARD_FRAME_CLASS}-(\\d+)/.exec(String(el.className));
  return [m ? Number(m[1]) : -1, el.offsetWidth, el.offsetHeight];
}))`;

/** A frame's measured box, by index. */
export type BoardMeasured = ReadonlyArray<{ width: number; height: number } | undefined>;

/**
 * Parse what {@link BOARD_MEASURE_EXPRESSION} answered. Anything unusable is simply not a
 * measurement — the caller keeps its estimate — because a board that refused to draw over a
 * malformed reply would be worse than one that drew the estimate.
 */
export function readBoardMeasure(raw: unknown, count: number): BoardMeasured {
  const out: Array<{ width: number; height: number } | undefined> = new Array(Math.max(0, count)).fill(undefined);
  let rows: unknown;
  try {
    rows = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error) {
    return out;
  }
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const [index, width, height] = row;
    if (!Number.isInteger(index) || index < 0 || index >= count) continue;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) continue;
    out[index] = { width, height };
  }
  return out;
}

/** Whether two measurements are the same picture — so a poll that changed nothing renders nothing. */
export function sameBoardMeasure(a: BoardMeasured, b: BoardMeasured): boolean {
  if (a.length !== b.length) return false;
  return a.every((box, i) => {
    const other = b[i];
    if (!box || !other) return box === other;
    return Math.round(box.width) === Math.round(other.width) && Math.round(box.height) === Math.round(other.height);
  });
}

/** One frame's box in the board document's own pixels (after the `minX`/`minY` shift). */
export interface BoardFrameBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** False while the height is still {@link ESTIMATED_CONTENT_FRAME_HEIGHT}. */
  measured: boolean;
}

/**
 * Every frame's box as a person sees it: where it is (including mid-drag), and how tall it really is.
 *
 * 🔴 **One function feeds the border, the caption, the clip and the extent**, so the four cannot
 * disagree — B5 was the white slab staying where the frame had been while the caption and content
 * moved, i.e. two readers of a frame's position with two answers.
 *
 * - A stored height wins (the author said so); then the client's measurement; then the estimate.
 * - `live` is the frame being dragged and where it is now, in document pixels.
 */
export function boardFrameBoxes(
  mounts: ReadonlyArray<{ x: number; y: number; width: number; height: number | null }>,
  origin: { minX: number; minY: number },
  measured: BoardMeasured,
  live?: { index: number; x: number; y: number } | null
): BoardFrameBox[] {
  return mounts.map((mount, index) => {
    const seen = measured[index];
    const height = mount.height ?? (seen ? seen.height : ESTIMATED_CONTENT_FRAME_HEIGHT);
    const moving = live && live.index === index;
    return {
      x: moving ? live.x : mount.x - origin.minX,
      y: moving ? live.y : mount.y - origin.minY,
      width: mount.width,
      height: Math.max(1, Math.round(height)),
      measured: mount.height !== null || !!seen
    };
  });
}

/**
 * The `clip-path` that cuts the board's one `<webview>` down to its frames.
 *
 * 🔴 **This is B3, B5 and half of B2 in one declaration, and it is a hit-test fix before it is a
 * paint fix.** The board draws every frame inside ONE `<webview>` sized to the union of all of
 * them. Painted, that box was a single white slab with the 48px gutters *inside* it — Richard's
 * "flush, no gutter". And a guest view takes every pointer and wheel event over its whole box, so
 * the board's own pan and zoom handlers saw nothing over any of it — "the slabs eat the canvas
 * until it cannot be panned". Measured on the running board before this was written: a wheel over
 * a gutter panned **nothing** without the clip and **panned** with it, while a wheel inside a frame
 * still went to the client either way (it has to: design mode selects by clicking inside a frame).
 *
 * One subpath per frame, all the same winding, so overlapping frames union rather than cancel.
 * Coordinates are the `<webview>`'s own, before the board's zoom transform, which is what makes the
 * clip hold at every zoom.
 */
export function boardClipPath(boxes: readonly BoardFrameBox[]): string {
  if (boxes.length === 0) return 'inset(100%)';
  const r = (n: number) => Math.round(n);
  const sub = boxes.map((b) => `M${r(b.x)} ${r(b.y)}H${r(b.x + b.width)}V${r(b.y + b.height)}H${r(b.x)}Z`);
  return `path('${sub.join(' ')}')`;
}

/** The board document's size: every frame's box, measured, and never smaller than the export's extent. */
export function boardDocumentExtent(
  boxes: readonly BoardFrameBox[],
  exportExtent: { width: number; height: number }
): { width: number; height: number } {
  let width = exportExtent.width;
  let height = exportExtent.height;
  for (const box of boxes) {
    width = Math.max(width, box.x + box.width);
    height = Math.max(height, box.y + box.height);
  }
  return { width: Math.max(1, Math.ceil(width)), height: Math.max(1, Math.ceil(height)) };
}
