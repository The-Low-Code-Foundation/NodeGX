/**
 * TVW-008 slice 2 — `bench.board` as the surface holds it.
 *
 * The board's membership and its layout are **project state**, not preview
 * state, and §2 argues that at length: *"these five belong side by side"* is
 * authored intent by the same test that made `bench.scenarios` and `bench.frame`
 * project state. This hook is the only thing in the surface that writes it.
 *
 * 🔴 **Every write here reaches disk.** `ProjectModel.setMetaData` calls
 * `scheduleProjectSave()` itself (`projectmodel.ts:1339`), which is why §2 says a
 * drag never writes and AC5 exists to prove it: the commit functions below are
 * called on mouse-up and from a menu, never from a move handler. There is no
 * "save the board" button and there must not be one — the project autosave is
 * the save.
 *
 * @module noodl-editor/views/VisualCanvas/useBenchBoard
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { DEFAULT_BENCH_WIDTH } from './previewScope';
import { BENCH_FRAME_KEY, readBenchFrameDefault } from './benchFrameDefault';
import {
  BENCH_BOARD_KEY,
  addBoardFrame,
  benchBoardStore,
  boardFramesPresentIn,
  moveBoardFrame,
  readBenchBoard,
  removeBoardFrame,
  type BoardFrame
} from './benchBoard';

import { EventDispatcher } from '../../../../shared/utils/EventDispatcher';

const EVENT_GROUP = {};

/** The frames on the project, dropped to those whose component still exists. */
function readFrames(): BoardFrame[] {
  const project = ProjectModel.instance;
  if (!project) return [];

  const stored = readBenchBoard(project.getMetaData(BENCH_BOARD_KEY));
  // At read time, never as a repair pass: a component deleted and restored by an
  // undo would otherwise have been silently evicted from the board in between.
  return boardFramesPresentIn(stored, new Set(project.getComponents().map((component) => component.name)));
}

/**
 * The width a newly picked frame is laid out against.
 *
 * The component's authored size when it has one, and the same 768 default the
 * export uses otherwise — §6.4 measured **3 stored frames in 5,922 components**,
 * so the default is the case, not the exception. Read from the same place
 * `boardFrameMounts` reads it so a frame is never laid out clear of a width the
 * export then disagrees with.
 */
function widthOfComponent(target: string): number {
  const component = ProjectModel.instance?.getComponentWithName(target);
  if (!component) return DEFAULT_BENCH_WIDTH;
  return readBenchFrameDefault(component.getMetaData(BENCH_FRAME_KEY))?.width ?? DEFAULT_BENCH_WIDTH;
}

export interface BenchBoard {
  frames: BoardFrame[];
  /** The legacy names on the board, for the picker's `placed` marks. */
  placed: Set<string>;
  add: (target: string) => void;
  addMany: (targets: readonly string[]) => void;
  remove: (target: string) => void;
  /** The drop. §2/AC5: the **only** thing a drag calls, and only on mouse-up. */
  commitMove: (target: string, x: number, y: number) => void;
}

export function useBenchBoard(): BenchBoard {
  const [frames, setFrames] = useState<BoardFrame[]>(() => readFrames());

  // Re-read when anything else writes the key — an undo, an MCP authoring pass,
  // or a second preview panel in the detached layout. The board is project
  // state, so this surface is a view of it rather than its owner.
  useEffect(() => {
    const reread = () => setFrames(readFrames());
    EventDispatcher.instance.on(
      ['ProjectModel.metadataChanged', 'Model.componentRemoved', 'Model.componentAdded'],
      reread,
      EVENT_GROUP
    );
    return () => EventDispatcher.instance.off(EVENT_GROUP);
  }, []);

  /**
   * The one write path.
   *
   * ⚠️ **Identity-compared before it writes.** Every function in `benchBoard.ts`
   * returns the *same array* when it changed nothing — a duplicate pick, a
   * no-op drop, a removal of something absent — and that is not a micro
   * optimisation here: without this check a drag that ends one pixel from where
   * it started would dirty the project and arm an autosave, which is the exact
   * behaviour AC5 is written to catch.
   */
  const write = useCallback(
    (next: BoardFrame[]) => {
      if (next === frames) return;
      ProjectModel.instance?.setMetaData(BENCH_BOARD_KEY, benchBoardStore(next));
      setFrames(next);
    },
    [frames]
  );

  const add = useCallback((target: string) => write(addBoardFrame(frames, target, widthOfComponent)), [frames, write]);

  const addMany = useCallback(
    (targets: readonly string[]) =>
      // One write for the whole batch: `Add all` on a twelve-component project
      // is one authored decision, and twelve `setMetaData` calls would be twelve
      // `scheduleProjectSave`s for it. `addBoardFrame` folds, so each frame is
      // still laid out clear of the one before it.
      write(targets.reduce((acc, target) => addBoardFrame(acc, target, widthOfComponent), frames)),
    [frames, write]
  );

  const remove = useCallback((target: string) => write(removeBoardFrame(frames, target)), [frames, write]);

  const commitMove = useCallback(
    (target: string, x: number, y: number) => write(moveBoardFrame(frames, target, x, y)),
    [frames, write]
  );

  const placed = useMemo(() => new Set(frames.map((frame) => frame.target)), [frames]);

  return { frames, placed, add, addMany, remove, commitMove };
}
