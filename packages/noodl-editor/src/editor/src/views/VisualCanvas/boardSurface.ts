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
export const DEFAULT_BOARD_VIEWPORT: BoardViewport = { x: BOARD_GUTTER, y: BOARD_GUTTER, zoom: 1 };

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
