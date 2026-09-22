/**
 * TVW-008 slice 2 — the board: a canvas you put chosen components on, side by
 * side, at their real sizes.
 *
 * ## One document, N frames, and where the line between them falls
 *
 * The export is **one** `<webview>` (`buildBoardExport`), so every frame's
 * content lives inside a single runtime document, positioned by its frame
 * Group's `marginLeft`/`marginTop`. Everything a person can grab — the border,
 * the caption, the drag, the door back to the single bench — is drawn by the
 * *editor*, over that document, from the same `boardFrameMounts` the export was
 * built from. Two readers, one answer; computing the chrome's geometry
 * separately is how captions end up half a frame from their frames.
 *
 * 🔴 **The caption strip is the handle, and the frame's body is not.** §2 asks
 * for three gestures on one frame — click it to bench it, drag it to arrange it,
 * and click *inside* it to select the element under the pointer — and the third
 * is a click that has to reach the `<webview>`. So the chrome is
 * `pointer-events: none` everywhere except the caption, which is the drag handle
 * *and* the door. This is TVW-007 s22's finding arriving on a second surface:
 * put the control where the gesture already is and the surface needs no
 * sub-region click dispatch at all.
 *
 * 🔴 **A drag moves the frame live and writes nothing.** Positions travel to the
 * running client as `parameterChanged` updates (`boardFrameMoveContents`) — the
 * mechanism an input edit already uses — and only the mouse-up calls
 * `commitMove`. Rebuilding the export from a dropped position would make the
 * runtime `location.reload()`, flashing the whole board because somebody nudged
 * one frame 8px; `boardExportSignature` is the one place that decides when a
 * rebuild is genuinely owed.
 *
 * @module noodl-editor/views/VisualCanvas/ComponentBoard
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import { Text, TextType } from '@noodl-core-ui/components/typography/Text';

import { boardBounds, boardFrameMounts, buildBoardExport } from '@noodl-models/AiAssistant/authoring';
import { ProjectModel } from '@noodl-models/projectmodel';

import { EventDispatcher } from '../../../../shared/utils/EventDispatcher';
import { ViewerConnection } from '../../ViewerConnection';
import { SANDBOX_PARTITION, SANDBOX_WEBVIEW_ATTRIBUTES, useSandboxViewer } from '../SandboxSurface';
import { instanceCountOf } from '../nodegrapheditor/canvas/instanceCounts';
import { boardFrameMoveContents } from './benchInputs';
import { canAddAll } from './benchBoard';
import { WORKBENCH } from './benchWords';
import { revealBenchTarget } from './benchRequest';
import {
  BOARD_ADD,
  BOARD_ADD_ALL,
  BOARD_MEASURE_EXPRESSION,
  BOARD_EMPTY_BODY,
  BOARD_EMPTY_TITLE,
  DEFAULT_BOARD_VIEWPORT,
  boardExportSignature,
  boardFrameCaption,
  boardClipPath,
  boardDocumentExtent,
  boardFrameBoxes,
  boardFrameCaptionText,
  boardPickerRows,
  isBoardDrag,
  readBoardMeasure,
  sameBoardMeasure,
  type BoardMeasured,
  panBoard,
  zoomBoardAt,
  type BoardViewport
} from './boardSurface';
import { BOARD_SCOPE, benchTargets, readMenuComponents, scopeChromeLabels, type PreviewScope } from './previewScope';
import { useBenchBoard } from './useBenchBoard';
import css from './ComponentBoard.module.scss';

export interface ComponentBoardProps {
  /** TVW-003 AC4 — design mode gives the board's client the editor bridge, as the bench's does. */
  designMode: boolean;
  /** Clicking a frame opens that component on the single bench. */
  onScopeChange: (scope: PreviewScope) => void;
  /** Reported so the chrome strip can say how many components are on it. */
  onFrameCountChange?: (count: number) => void;
}

export function ComponentBoard({ designMode, onScopeChange, onFrameCountChange }: ComponentBoardProps) {
  const board = useBenchBoard();
  const [viewport, setViewport] = useState<BoardViewport>(DEFAULT_BOARD_VIEWPORT);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  /**
   * P99 HLT-008 — the frame being dragged and where it is now, in document pixels.
   *
   * 🔴 B5: the drag used to move the caption (react-rnd) and the content (a `parameterChanged` to
   * the client) while the white box the frame occupied stayed where it was, because nothing else
   * knew the frame was moving. Now the one live position feeds the chrome, the clip and the extent.
   */
  const [live, setLive] = useState<{ index: number; x: number; y: number } | null>(null);
  /** Every frame's real box, as the client laid it out. See `BOARD_MEASURE_EXPRESSION`. */
  const [measured, setMeasured] = useState<BoardMeasured>([]);
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  /**
   * 🔴 B4 — a press on a caption's name that became a drag must not also open the component.
   * The name sits inside the drag handle, the frame travels with the pointer, so the release lands
   * on the same button and the browser calls that a click. Set by a drag that crossed the
   * threshold, consumed by the click that follows it.
   */
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressOpenRef = useRef(false);

  /**
   * The project revision this surface last rebuilt against.
   *
   * The board's export is a snapshot like the bench's, and a Refresh means the
   * same thing here: rebuild everything the export froze that no delta
   * describes. Ordinary graph edits reach the running client on the editor's own
   * `modelUpdate` stream — the board's export contains the components it is
   * showing, so an edit to one of them arrives without a rebuild, exactly as it
   * does on the single bench.
   */
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const eventGroup = {};
    EventDispatcher.instance.on('viewer-refresh', () => setRevision((value) => value + 1), eventGroup);
    return () => EventDispatcher.instance.off(eventGroup);
  }, []);

  useEffect(() => onFrameCountChange?.(board.frames.length), [board.frames.length, onFrameCountChange]);

  /**
   * Every stored frame resolved: its box, its values, the scenario they came
   * from. The **same** call the export makes, which is why it is imported from
   * `componentBench.ts` rather than reproduced here.
   */
  const resolved = useMemo(
    () => (ProjectModel.instance ? boardFrameMounts(ProjectModel.instance, board.frames) : { mounts: [], missing: [], unknownParams: [] }),
    [board.frames, revision]
  );
  const mounts = resolved.mounts;
  const bounds = useMemo(() => boardBounds(mounts), [mounts]);

  /**
   * 🔴 **Rebuilt on membership and origin, never on a position.** See
   * `boardExportSignature` — this `useMemo`'s dependency list is the whole of
   * AC5's cheapness, and adding `board.frames` to it would reload the runtime on
   * every drop.
   */
  const signature = boardExportSignature(mounts, bounds);
  const result = useMemo(
    () => (ProjectModel.instance && mounts.length > 0 ? buildBoardExport({ project: ProjectModel.instance, frames: board.frames }) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, revision]
  );

  const viewer = useSandboxViewer({ json: result?.json, useSampleData: true, signedIn: true, designMode });
  const clientId = viewer.clientId;

  const attachWebview = useCallback(
    (element: Electron.WebviewTag | null) => {
      webviewRef.current = element;
      viewer.attachWebview(element);
    },
    [viewer.attachWebview]
  );

  /**
   * Ask the client how big each frame really is.
   *
   * 🔴 **B2's defect was a guess drawn as a size.** A frame with no saved height is sized by its
   * content, which only the client knows; the board used to draw the 768px estimate instead, so
   * one button stood in a stage-height white slab. A poll rather than an event because the
   * content changes for reasons the board does not see (an edit arriving on `modelUpdate`, a font
   * loading), and one `executeJavaScript` every half second on a surface holding a handful of
   * frames is nothing. A poll that changed nothing renders nothing (`sameBoardMeasure`).
   *
   * ⚠️ `executeJavaScript` **throws synchronously** on a `<webview>` that is not attached or not
   * yet `dom-ready` — the defect that once unmounted this whole preview (`applyInspectScript`). So
   * the call is inside a `try` as well as behind a `.catch`, and both mean "not yet".
   */
  const frameCount = mounts.length;
  useEffect(() => {
    if (!result?.json || frameCount === 0) return;
    let cancelled = false;
    const poll = () => {
      const element = webviewRef.current;
      if (!element) return;
      let reply: Promise<unknown> | undefined;
      try {
        reply = element.executeJavaScript(BOARD_MEASURE_EXPRESSION);
      } catch (error) {
        return;
      }
      reply
        ?.then((raw) => {
          if (cancelled) return;
          const next = readBoardMeasure(raw, frameCount);
          setMeasured((current) => (sameBoardMeasure(current, next) ? current : next));
        })
        .catch(() => undefined);
    };
    poll();
    const timer = window.setInterval(poll, 500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [result, frameCount]);

  const boxes = useMemo(() => boardFrameBoxes(mounts, bounds, measured, live), [mounts, bounds, measured, live]);
  const extent = useMemo(() => boardDocumentExtent(boxes, bounds), [boxes, bounds]);
  const clipPath = useMemo(() => boardClipPath(boxes), [boxes]);

  /** Push a frame's position to the running client. Two parameters, no rebuild. */
  const sendPosition = useCallback(
    (index: number, x: number, y: number) => {
      for (const content of boardFrameMoveContents(index, x, y)) {
        ViewerConnection.instance.sendModelUpdateToClient(clientId, content);
      }
    },
    [clientId]
  );

  /**
   * Re-assert every frame's position on the live client.
   *
   * Covers the two cases a drag handler cannot: a position that changed without
   * one (an undo, an MCP write, the other preview panel in the detached layout),
   * and the moment after a rebuild, where the client has re-imported an export
   * whose offsets are correct but whose origin may have moved under the frames
   * that did not move. Idempotent, and two messages per frame on a surface
   * bounded at a handful of them.
   */
  useEffect(() => {
    if (!clientId || dragging) return;
    mounts.forEach((mount, index) => sendPosition(index, mount.x - bounds.minX, mount.y - bounds.minY));
  }, [clientId, mounts, bounds, dragging, sendPosition]);

  const targets = useMemo(
    () => benchTargets(readMenuComponents(() => ProjectModel.instance?.getComponents() ?? [])),
    // The list must be fresh when the picker opens, not a snapshot from whenever
    // the board last laid out — `readMenuComponents`' own note says why.
    [pickerOpen, revision]
  );
  const rows = useMemo(() => boardPickerRows(targets, board.placed), [targets, board.placed]);

  const onWheel = useCallback((event: React.WheelEvent) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (event.metaKey || event.ctrlKey) {
      setViewport((current) => zoomBoardAt(current, Math.pow(0.999, event.deltaY), pointer));
      return;
    }
    setViewport((current) => panBoard(current, -event.deltaX, -event.deltaY));
  }, []);

  /**
   * Panning the board by dragging its background.
   *
   * ⚠️ **The listeners go on `window`, and a shield goes over the `<webview>`.**
   * A guest view receives the moves that cross it and this document sees
   * nothing, so `window` alone leaves a pan that stops the instant the pointer
   * touches a frame. `ComponentBench`'s resize drag pays for the same lesson and
   * its note is the longer version.
   */
  const onBackgroundMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0 && event.button !== 1) return;
    /**
     * 🔴 P99 HLT-008 B6 — a press on a frame's caption is a frame drag, not a pan. The caption is
     * inside this surface, so its `mousedown` bubbled here too and BOTH ran: react-rnd moved the
     * frame with the pointer while this moved the whole document the same way under it, which a
     * person sees as the canvas sliding off in the opposite direction to their drag. Buttons are
     * excluded for the same reason: a press on one is a press, not the start of a pan.
     */
    const target = event.target as Element | null;
    if (target && typeof target.closest === 'function' && target.closest('[data-board-handle], button')) return;
    const start = { x: event.clientX, y: event.clientY };
    let last = start;
    setDragging('');

    const move = (moveEvent: MouseEvent) => {
      setViewport((current) => panBoard(current, moveEvent.clientX - last.x, moveEvent.clientY - last.y));
      last = { x: moveEvent.clientX, y: moveEvent.clientY };
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setDragging(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, []);

  const openOnBench = useCallback(
    (target: string) => {
      onScopeChange({ mode: 'bench', target });
      revealBenchTarget(target);
    },
    [onScopeChange]
  );

  const empty = board.frames.length === 0;

  return (
    <div className={css.Root} data-test="component-board">
      <div
        className={css.Surface}
        ref={surfaceRef}
        onWheel={onWheel}
        onMouseDown={onBackgroundMouseDown}
        data-test="board-surface"
      >
        <div
          className={css.Document}
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
            width: `${extent.width}px`,
            height: `${extent.height}px`
          }}
        >
          {result?.json ? (
            <webview
              className={css.Webview}
              ref={attachWebview}
              // 🔴 P99 HLT-008 — the one `<webview>` is cut down to its frames, so the gutters are
              // the board's again: painted as the board, and answering the board's pan and zoom.
              // See `boardClipPath` for the measurement that says this moves hit-testing too.
              style={{ clipPath }}
              data-test="board-webview"
              // eslint-disable-next-line react/no-unknown-property
              partition={SANDBOX_PARTITION}
              // eslint-disable-next-line react/no-unknown-property
              preload={viewer.preload}
              src={viewer.src}
              {...SANDBOX_WEBVIEW_ATTRIBUTES}
            />
          ) : null}

          {/* Over the guest view for the duration of any drag, so the moves stay
              in this document. See `onBackgroundMouseDown`. */}
          {dragging !== null && <div className={css.DragShield} data-test="board-drag-shield" />}

          {mounts.map((mount, index) => {
            const box = boxes[index];
            const seen = measured[index];
            const captionInput = {
              target: mount.target,
              instances: instanceCountOf(mount.target),
              width: mount.width,
              height: mount.height,
              // Measured beats asked-for: `768 × 46`, not `768 × auto`.
              measured: seen,
              scenario: mount.scenario
            };
            const caption = boardFrameCaption(captionInput);

            return (
              <Rnd
                key={mount.target}
                className={css.Frame}
                scale={viewport.zoom}
                position={{ x: box.x, y: box.y }}
                // The border is the frame's REAL box. With `height: 'auto'` over absolutely
                // positioned children it was 0px tall, so a content-sized frame had no border at
                // all and the white slab was the only thing saying where it was.
                size={{ width: box.width, height: box.height }}
                enableResizing={false}
                dragHandleClassName={css.Caption}
                onDragStart={(_event, data) => {
                  dragStartRef.current = { x: data.x, y: data.y };
                  suppressOpenRef.current = false;
                  setDragging(mount.target);
                }}
                onDrag={(_event, data) => {
                  setLive({ index, x: data.x, y: data.y });
                  sendPosition(index, data.x, data.y);
                }}
                onDragStop={(_event, data) => {
                  const start = dragStartRef.current;
                  dragStartRef.current = null;
                  // Surface pixels, before the zoom divide — `BOARD_DRAG_THRESHOLD`'s own rule.
                  if (start && isBoardDrag((data.x - start.x) * viewport.zoom, (data.y - start.y) * viewport.zoom)) {
                    suppressOpenRef.current = true;
                  }
                  setLive(null);
                  setDragging(null);
                  // The only write. `moveBoardFrame` returns the same array for
                  // a no-op, so a click that wobbled does not dirty the project.
                  board.commitMove(mount.target, data.x + bounds.minX, data.y + bounds.minY);
                }}
                data-test={`board-frame-${mount.target}`}
              >
                <div className={css.FrameBorder} />
                <div
                  className={css.Caption}
                  title={boardFrameCaptionText(captionInput)}
                  data-board-handle
                  data-test={`board-caption-${mount.target}`}
                >
                  <button
                    type="button"
                    className={css.CaptionName}
                    onClick={() => {
                      // B4: the release of a drag is not a request to leave the board.
                      if (suppressOpenRef.current) {
                        suppressOpenRef.current = false;
                        return;
                      }
                      openOnBench(mount.target);
                    }}
                    title={`Open ${caption.label} on the ${WORKBENCH}`}
                    data-test={`board-open-${mount.target}`}
                  >
                    {caption.label}
                  </button>
                  <span className={css.CaptionMeta}>{caption.usage}</span>
                  <span className={css.CaptionMeta}>{caption.size}</span>
                  <span className={css.CaptionMeta}>{caption.values}</span>
                  <button
                    type="button"
                    className={css.CaptionRemove}
                    onClick={() => board.remove(mount.target)}
                    title={`Take ${caption.label} off the board`}
                    aria-label={`Take ${caption.label} off the board`}
                    data-test={`board-remove-${mount.target}`}
                  >
                    <Icon icon={IconName.Close} size={IconSize.Tiny} />
                  </button>
                </div>
              </Rnd>
            );
          })}
        </div>

        {empty && (
          <div className={css.Empty} data-test="board-empty">
            <Icon icon={IconName.Columns} size={IconSize.Large} />
            <strong>{BOARD_EMPTY_TITLE}</strong>
            <Text textType={TextType.Secondary}>{BOARD_EMPTY_BODY}</Text>
            <button type="button" className={css.EmptyAdd} onClick={() => setPickerOpen(true)} data-test="board-empty-add">
              <Icon icon={IconName.Plus} size={IconSize.Small} />
              <span>{BOARD_ADD}</span>
            </button>
          </div>
        )}

        {/* A frame naming a component that is gone is already dropped by
            `boardFramesPresentIn`; this says so rather than letting the board
            quietly shorten. */}
        {resolved.missing.length > 0 && (
          <div className={css.Missing} data-test="board-missing">
            <Text textType={TextType.Secondary}>
              {resolved.missing.length === 1
                ? `One frame is not shown: “${resolved.missing[0]}” is no longer in this project.`
                : `${resolved.missing.length} frames are not shown: their components are no longer in this project.`}
            </Text>
          </div>
        )}
      </div>

      {!empty && (
        <button type="button" className={css.Add} onClick={() => setPickerOpen((open) => !open)} data-test="board-add">
          <Icon icon={IconName.Plus} size={IconSize.Small} />
          <span>{BOARD_ADD}</span>
        </button>
      )}

      {pickerOpen && (
        <BoardPicker
          heading={scopeChromeLabels(BOARD_SCOPE).boardPickerHeading ?? ''}
          rows={rows}
          onPick={board.add}
          onUnpick={board.remove}
          onAddAll={() => board.addMany(rows.filter((row) => !row.placed).map((row) => row.name))}
          canAddAll={canAddAll(rows.length)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

interface BoardPickerProps {
  /** P99 HLT-008 B1 — was a hardcoded `Workbench` on a list that adds to the board. */
  heading: string;
  rows: ReturnType<typeof boardPickerRows>;
  onPick: (target: string) => void;
  onUnpick: (target: string) => void;
  onAddAll: () => void;
  canAddAll: boolean;
  onClose: () => void;
}

/**
 * The picker: the bench's own list, multi-select, staying open as you pick.
 *
 * ⚠️ **It does not close on a pick**, unlike `PreviewScopeControl`'s, and that
 * is the difference between choosing one thing and assembling a set. A picker
 * that dismissed itself would make putting three buttons side by side — the
 * sentence this whole task exists for — three round trips.
 */
function BoardPicker({ heading, rows, onPick, onUnpick, onAddAll, canAddAll, onClose }: BoardPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className={css.Picker} ref={rootRef} role="listbox" aria-multiselectable data-test="board-picker">
      <div className={css.PickerHead}>
        <span data-test="board-picker-heading">{heading}</span>
        {canAddAll && (
          <button type="button" className={css.PickerAddAll} onClick={onAddAll} data-test="board-add-all">
            {BOARD_ADD_ALL}
          </button>
        )}
      </div>
      {rows.length === 0 && (
        <div className={css.PickerEmpty}>
          <Text textType={TextType.Secondary}>This project has no components to put on a board yet.</Text>
        </div>
      )}
      {rows.map((row) => (
        <button
          key={row.name}
          type="button"
          role="option"
          aria-selected={row.placed}
          className={classNames(css.PickerRow, row.placed && css['is-placed'])}
          onClick={() => (row.placed ? onUnpick(row.name) : onPick(row.name))}
          data-test={`board-pick-${row.name}`}
        >
          <Icon icon={row.placed ? IconName.Check : IconName.Component} size={IconSize.Small} />
          <span className={css.PickerRowLabel}>{row.label}</span>
          {row.folder ? <span className={css.PickerRowHint}>{row.folder}</span> : null}
        </button>
      ))}
    </div>
  );
}
