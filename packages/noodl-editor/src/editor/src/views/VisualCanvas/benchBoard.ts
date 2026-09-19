/**
 * TVW-008 — what is on the comparison board, and where.
 *
 * The board is a **picked set**, not the project. That is R-7, and it is a
 * ruling made against a measurement rather than a taste: a board of *every*
 * visual component fits on screen at 100% in **0 of 99** projects on this
 * machine, needs a zoom below the specified 25% floor in **46%** of them, and
 * reaches 15,048 × 16,240px — 244 megapixels of live DOM — at the top of the
 * distribution. See TVW-008 §6.2 and §6.3 for the whole census.
 *
 * What survived the reshape is the thing Richard actually wanted it for:
 * *"do they really fit together?"*. That is a question about a **chosen set**,
 * and the full-page preview already answers it for components that share a
 * screen. What nothing else in this product can answer is *"show me these three
 * button variants side by side"* — in the running app those three are never on
 * screen together.
 *
 * ## Why the rules are here and not in the surface
 *
 * The module's usual reason, stated in `previewScope.ts` and `benchScenarios.ts`
 * and earned twice in this phase: **a rule only a live driver can check is a
 * rule that does not get checked.** Everything that decides what reaches
 * `project.json` is a pure function here, so a spec grades it. The surface owns
 * the drag; it owns none of the arithmetic.
 *
 * ## The R5 exception, argued rather than assumed
 *
 * R5 is *preview state, never project state*. `bench.scenarios` was the first
 * knowing exception and `bench.frame` the second, both on the argument that **a
 * set of input values, and a default size, are authored intent** — facts about
 * the component, not about the session someone looked at it in.
 *
 * A board's membership and layout is the **third**, on exactly that test:
 * "these five belong side by side, in this arrangement" is a fact about the
 * project. It survives the session because it was never about the session.
 *
 * ⚠️ **Project metadata, not component metadata.** A board spans components and
 * belongs to none of them; hanging it off one of its members would make the
 * board disappear when that member is deleted, which is not what deleting a
 * component means.
 *
 * @module noodl-editor/views/VisualCanvas/benchBoard
 */

/**
 * The project-metadata key the board is stored under.
 *
 * Namespaced `bench.` beside `bench.scenarios` and `bench.frame` because it is
 * the same surface's state and because project metadata is a flat bag shared
 * with everything that has ever wanted to hang something off a project.
 */
export const BENCH_BOARD_KEY = 'bench.board';

/** One component on the board, at the place someone put it. */
export interface BoardFrame {
  /**
   * The component's **legacy name** (`/Components/Card`) — the form
   * `buildBenchExport` resolves and the form a node uses to instantiate a
   * project component. A display label stored here is how the board ends up
   * unable to find what it is showing; `previewScope.ts` makes the same point
   * about `PreviewScope['target']` and for the same reason.
   */
  target: string;
  x: number;
  y: number;
}

/**
 * What is stored under {@link BENCH_BOARD_KEY}.
 *
 * ⚠️ **An object wrapping the array, rather than a bare array**, and that shape
 * is deliberate: TVW-008 §7.1 defers *more than one board per project* as a live
 * question, and a `boards: []` key can join this record later **without a
 * migration**. A bare array would have made the second board a format change.
 */
export interface BenchBoardStore {
  frames: BoardFrame[];
}

/**
 * How far from the origin a frame may sit.
 *
 * Positions are user data that comes back from disk unvalidated, and TVW-008 §5
 * asks for a frame dragged somewhere absurd to still be **reachable**. At 100%
 * a frame at 20,000 is already some twenty screens away, which is far enough to
 * be a mistake and near enough that panning gets you there. Clamped on the way
 * **in**, as `readBenchFrameDefault` clamps a hand-edited width, so the surface
 * never receives a coordinate its own controls could not have produced.
 */
export const MIN_BOARD_COORD = -20000;
export const MAX_BOARD_COORD = 20000;

/** The gap left between frames when the board lays a newly picked one out. */
export const BOARD_GUTTER = 48;

/**
 * The size of project past which `Add all` stops being offered.
 *
 * §6.1: 33% of projects have 1–6 pickable components, and for those a picked
 * board and an every-component board are the same board — so the shortcut is
 * real and worth having. Past a dozen it starts building the surface §6.2
 * measured and R-7 rejected, one press at a time.
 */
export const ADD_ALL_LIMIT = 12;

const clampCoord = (value: number) => Math.min(MAX_BOARD_COORD, Math.max(MIN_BOARD_COORD, Math.round(value)));

/**
 * The frames stored on a project, or `[]` when there are none.
 *
 * Tolerant in one direction only, like `readBenchScenarios` and
 * `readBenchFrameDefault`: this reads JSON a human can edit, version control can
 * merge and an MCP write path can rewrite, and the failure mode of a throw is a
 * preview surface that will not open at all. Anything that is not a usable frame
 * is simply not a frame.
 *
 * Three things are enforced here rather than trusted:
 *
 * - **a target names something**, and a non-string or empty one is dropped;
 * - **no duplicates** — first occurrence wins, because {@link addBoardFrame}
 *   refuses the second and a file containing one was not written by this code;
 * - **coordinates are finite and in range**. A missing or junk coordinate reads
 *   as `0` rather than dropping the frame: the component was on the board, and
 *   losing it entirely over a bad number would be the larger lie.
 */
export function readBenchBoard(stored: unknown): BoardFrame[] {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return [];
  const candidate = (stored as Partial<BenchBoardStore>).frames;
  if (!Array.isArray(candidate)) return [];

  const seen = new Set<string>();
  const frames: BoardFrame[] = [];

  for (const entry of candidate) {
    if (!entry || typeof entry !== 'object') continue;
    const target = (entry as Partial<BoardFrame>).target;
    if (typeof target !== 'string' || target.length === 0) continue;
    if (seen.has(target)) continue;
    seen.add(target);

    const rawX = (entry as Partial<BoardFrame>).x;
    const rawY = (entry as Partial<BoardFrame>).y;
    frames.push({
      target,
      x: typeof rawX === 'number' && Number.isFinite(rawX) ? clampCoord(rawX) : 0,
      y: typeof rawY === 'number' && Number.isFinite(rawY) ? clampCoord(rawY) : 0
    });
  }

  return frames;
}

/**
 * The value handed to `ProjectModel.setMetaData`, and the only one this module
 * produces.
 *
 * `undefined` for an empty board clears the key entirely rather than storing
 * `{ frames: [] }`, so a project whose board was emptied is byte-identical to
 * one that never had a board. The same courtesy `benchFrameStore` pays a
 * component whose default size was removed: no key, no diff, nothing for a
 * reviewer to wonder about.
 */
export function benchBoardStore(frames: BoardFrame[]): BenchBoardStore | undefined {
  if (frames.length === 0) return undefined;
  return { frames: frames.map((frame) => ({ target: frame.target, x: frame.x, y: frame.y })) };
}

/**
 * Put a component on the board, to the right of everything already on it.
 *
 * `widthOf` is the component's frame width — its `bench.frame` or the 768
 * default — because the next free x depends on how wide the current rightmost
 * frame actually is, not on how wide frames are in general. §6.4 measured that
 * **3 of 5,922** components carry a stored width, so the default is the
 * overwhelmingly common case and the stored one is the exception; both go
 * through the same arithmetic here so neither can drift.
 *
 * 🔴 **A duplicate is refused by returning the array that came in**, not a copy
 * of it. That identity is load-bearing: React bails a state update out on
 * `Object.is`, so a refusal costs no render — and the same property makes
 * "picking it twice does nothing" gradeable by a spec rather than by watching a
 * screen. Showing one component twice is what a *scenario* is for; two frames of
 * the same component with the same inputs are the same picture.
 */
export function addBoardFrame(frames: BoardFrame[], target: string, widthOf: (target: string) => number): BoardFrame[] {
  if (typeof target !== 'string' || target.length === 0) return frames;
  if (frames.some((frame) => frame.target === target)) return frames;

  let nextX = 0;
  for (const frame of frames) {
    const right = frame.x + widthOf(frame.target) + BOARD_GUTTER;
    if (right > nextX) nextX = right;
  }

  return frames.concat([{ target, x: clampCoord(nextX), y: 0 }]);
}

/**
 * Take a component off the board.
 *
 * Identity-stable when the target is not there, for {@link addBoardFrame}'s
 * reason. ⚠️ The remaining frames are **not** re-packed: someone arranged them,
 * and closing the gap would rearrange an arrangement they made on purpose.
 */
export function removeBoardFrame(frames: BoardFrame[], target: string): BoardFrame[] {
  if (!frames.some((frame) => frame.target === target)) return frames;
  return frames.filter((frame) => frame.target !== target);
}

/**
 * Move a frame to where it was dropped.
 *
 * 🔴 **This is the commit, and it must be called on mouse-up and nowhere else.**
 * `ProjectModel.setMetaData` calls `scheduleProjectSave()` itself
 * (`projectmodel.ts:1322`), so a surface that called this per mousemove would
 * dirty the project on every pixel of every drag — which is precisely the defect
 * FIX-011's fourth acceptance criterion exists to catch, arriving on a surface
 * where dragging is the whole point rather than an edge case. TVW-008 AC5 is
 * that control, re-run here.
 *
 * Junk coordinates keep the frame where it is rather than throwing or moving it
 * to `NaN` — `clampBenchWidth`'s rule, and for the same phase-55 reason.
 */
export function moveBoardFrame(frames: BoardFrame[], target: string, x: number, y: number): BoardFrame[] {
  const current = frames.find((frame) => frame.target === target);
  if (!current) return frames;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return frames;

  const nextX = clampCoord(x);
  const nextY = clampCoord(y);
  if (nextX === current.x && nextY === current.y) return frames;

  return frames.map((frame) => (frame.target === target ? { target: frame.target, x: nextX, y: nextY } : frame));
}

/** Whether the `Add all` shortcut is worth offering. See {@link ADD_ALL_LIMIT}. */
export function canAddAll(pickableCount: number): boolean {
  return pickableCount > 0 && pickableCount <= ADD_ALL_LIMIT;
}

/**
 * Drop frames whose component no longer exists.
 *
 * A board outlives the components on it: someone deletes `Price Tag` and the
 * board still names it. Left alone the export would carry an instance node of a
 * type nothing defines, which is the `unknown-instance-parameter` shape of
 * defect — a node aimed at something that is not there, rendering nothing,
 * reported as nothing.
 *
 * ⚠️ Called when the board is **read and rendered**, never as a repair pass over
 * the file. A component missing because a project is mid-load is not a component
 * that was deleted, and a repair pass cannot tell the difference.
 */
export function boardFramesPresentIn(frames: BoardFrame[], componentNames: Set<string>): BoardFrame[] {
  if (frames.every((frame) => componentNames.has(frame.target))) return frames;
  return frames.filter((frame) => componentNames.has(frame.target));
}
