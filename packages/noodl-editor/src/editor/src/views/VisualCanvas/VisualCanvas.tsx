/**
 * The preview surface — one surface, two modes (BEN-004).
 *
 * Mode `app` is the live preview this file has always been: the project's own
 * viewer, filling a checkerboarded canvas. Mode `bench` mounts a single
 * component in isolation with its inputs settable (BEN-001), on a stage that is
 * visibly a bench.
 *
 * The four anti-disorientation rules from the phase README are load-bearing
 * here, not decoration:
 *
 * - **R1** one preview surface, two modes. This component. There is no second
 *   preview panel anywhere in the editor, and there must not be one — two live
 *   previews in two panels is the arrangement that guarantees a builder does
 *   not know which of them is the app.
 * - **R2** the bench never renders full-bleed. See `ComponentBench.module.scss`.
 * - **R3** the app preview is *not torn down* when you switch. Both stages are
 *   absolutely positioned siblings and the inactive one is hidden with
 *   `visibility`, so the app webview keeps running with its route, its scroll
 *   position and its half-filled form intact, and its layout box keeps a real
 *   size — which matters, because `CanvasView.updateViewportSize` computes
 *   zoom-to-fit from `getBoundingClientRect()` and a `display: none` ancestor
 *   would hand it a zero and a zero-width preview to come back to.
 *   ⚠️ Hiding, never closing: closing a webview CDP target white-screens the
 *   editor (POL-012).
 * - **R4** one always-present way back, in the same place in both modes. The
 *   scope chip is the leftmost control of the strip in both.
 */

import { useThrottle } from '@noodl-hooks/useThrottleState';
import classNames from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Keybindings } from '@noodl-constants/Keybindings';

import { benchComponent } from '@noodl-models/AiAssistant/authoring';
import { ProjectModel } from '@noodl-models/projectmodel';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import { PrimaryButton, PrimaryButtonSize } from '@noodl-core-ui/components/inputs/PrimaryButton';
import { Box } from '@noodl-core-ui/components/layout/Box';
import { Label, LabelSize } from '@noodl-core-ui/components/typography/Label';
import { Text } from '@noodl-core-ui/components/typography/Text';
import { useTrackBounds } from '@noodl-core-ui/hooks/useTrackBounds';

import { EventDispatcher } from '../../../../shared/utils/EventDispatcher';
import {
  BENCH_MOUNT_EVENT,
  activeCanvasComponentName,
  clearPendingBenchMount,
  revealBenchTarget,
  takePendingBenchMount
} from './benchRequest';
import { registerLivePreview, unregisterLivePreview } from '../SandboxSurface';
import { BENCH_FRAME_KEY, benchFrameStore, readBenchFrameDefault } from './benchFrameDefault';
import {
  BENCH_SCENARIOS_KEY,
  benchOpeningFrame,
  benchOpeningScenario,
  readBenchScenarios
} from './benchScenarios';
import { BOARD, CAPTION_JOIN, WORKBENCH, benchCaptionRest } from './benchWords';
import { boardCaptionRest } from './boardSurface';
import { ComponentBench } from './ComponentBench';
import { ComponentBoard } from './ComponentBoard';
import { BenchFrameControl, PreviewScopeControl } from './PreviewChrome';
import { stripToRender, type DetachedStripProps } from './detachedStrip';
import { publishPlacementOutline } from './placementOutline';
import { usePreviewStrip } from './usePreviewStrip';
import {
  APP_SCOPE,
  DEFAULT_BENCH_FRAME,
  benchSizeLabel,
  benchTargetLabel,
  isDivergedFromCanvas,
  showsAppPreview,
  showsBoard,
  type BenchFrame,
  type PreviewScope
} from './previewScope';
import css from './VisualCanvas.module.scss';

export interface VisualCanvasProps {
  onWebView: (webview: Electron.WebviewTag) => void;
  deviceName?: string;
  zoom: number;
  /** DES-001 — design mode is on, i.e. the app's own clicks are being swallowed. */
  designMode?: boolean;
  onExitDesignMode?: () => void;
  /** The last element clicked in design mode. `seq` re-fires the toast for a repeat click. */
  designSelection?: { label: string; seq: number };
}

/**
 * TVW-002 AC5 — the two props that are set only when this copy is the **detached** preview
 * window's. See `detachedStrip.ts`; the same component renders in both windows.
 */
export type VisualCanvasAllProps = VisualCanvasProps & DetachedStripProps;

export function VisualCanvas({
  onWebView,
  deviceName,
  zoom,
  designMode,
  onExitDesignMode,
  designSelection,
  previewStrip,
  onStripAction
}: VisualCanvasAllProps) {
  const webviewRef = useRef<Electron.WebviewTag>(null);
  const containerRef = useRef(null);

  const webviewBounds = useThrottle(useTrackBounds(webviewRef), 100);
  const containerBounds = useThrottle(useTrackBounds(containerRef), 100);

  const [crashed, setCrashed] = useState(false);
  const [style, setStyle] = useState({});
  const [showViewportSize, setShowViewportSize] = useState(false);

  /**
   * Which of the two modes is showing, and the frame the bench renders into.
   *
   * Both are **preview state, never project state** (R5) and neither is
   * persisted: reopening a project into a component bench, with no memory of
   * having asked for one, is the disorientation this phase is about.
   */
  const [scope, setScope] = useState<PreviewScope>(APP_SCOPE);
  const [frame, setFrame] = useState<BenchFrame>(DEFAULT_BENCH_FRAME);
  /** The bench frame's measured box — see `ComponentBench`'s `onFrameMeasured`. */
  const [benchMeasured, setBenchMeasured] = useState<{ width: number; height: number } | undefined>(undefined);
  /**
   * ⚠️ **Kept as the discriminant comparison on purpose, not tidied into
   * `showsBench(scope)`.** TypeScript narrows a union through a `const` that
   * aliases a discriminant check, so `scope.target` type-checks inside
   * `isBench && …`. A helper returning `boolean` throws that away, and the four
   * reads of `scope.target` below stop compiling. The predicate exists for the
   * callers that only want the answer; this one wants the narrowing too.
   */
  const isBench = scope.mode === 'bench';
  /**
   * 🔴 **TVW-008 §6.5 — this is not `!isBench`, and the difference is six
   * behaviours.** Every question below used to be asked as `!isBench`, which was
   * right while there were two modes and silently wrong the moment there were
   * three: the preview strip, the design chrome and the viewport read-out all
   * describe *a route and a viewport*, which the board has neither of. Adding
   * the third variant compiled clean and changed all of them, so the question is
   * asked of the mode directly now — `showsAppPreview` switches exhaustively, and
   * a fourth mode is six compile errors instead of six silent changes.
   */
  const isApp = showsAppPreview(scope);

  /**
   * TVW-008 — the third mode. Read through the predicate rather than as
   * `!isApp && !isBench`, which is the shape §6.5 measured six of.
   */
  const isBoard = showsBoard(scope);

  /**
   * How many components are on the board, for the strip caption.
   *
   * Reported up from `ComponentBoard` rather than read here, because
   * `bench.board` has exactly one reader and a second one would be a second
   * thing to keep in step with an undo.
   */
  const [boardFrameCount, setBoardFrameCount] = useState(0);

  /**
   * FIX-019 — which component the node graph is on, so the strip can say when
   * that is not the one the bench is showing.
   *
   * ⚠️ **A derivation, never a store**, and seeded rather than only subscribed.
   * `VisualCanvas` mounts and remounts long after a component is already open,
   * so a value that waited for the next `activeComponentChanged` would report
   * "nowhere" — and the chip would be missing exactly when someone opened the
   * bench from a canvas they were already on. Same shape `useActiveComponentId`
   * and `ExecutionOverlay` use, deliberately.
   *
   * This subscription does **not** move the canvas. The decoupling stays; see
   * `benchRequest.ts` for why a render must never navigate.
   */
  const [canvasComponent, setCanvasComponent] = useState<string | undefined>(activeCanvasComponentName);

  useEffect(() => {
    const eventGroup = {};
    EventDispatcher.instance.on(
      'activeComponentChanged',
      () => setCanvasComponent(activeCanvasComponentName()),
      eventGroup
    );
    // Re-seeded on entering the bench as well as on mount: the mount seed can
    // be `undefined` when this surface is built before the node graph is, and
    // nothing would correct it until the user next navigated.
    setCanvasComponent(activeCanvasComponentName());
    return () => EventDispatcher.instance.off(eventGroup);
  }, [isBench]);

  const diverged = isDivergedFromCanvas(scope, canvasComponent);

  /**
   * TVW-002 — the sentence between the two surfaces.
   *
   * Shown for the app and nothing else, deliberately: the bench already says what it is showing in
   * its caption and says when the canvas has moved away with its own chip, and the board says what
   * is on it. A third claim on the same surface is a third answer to "what am I looking at", which
   * is the confusion this phase is closing. ⚠️ Was `!isBench` until TVW-008 — see `isApp`.
   */
  const { strip: localStrip, outline, goToPage, dismiss } = usePreviewStrip(canvasComponent, isApp);

  /**
   * TVW-002 AC5 — the detached window renders the editor's answer; the docked one computes its own.
   *
   * 🔴 **`undefined` is not `null`.** `previewStrip === undefined` means nobody is pushing to this
   * copy, so it is the docked one and `localStrip` is the answer. `null` means the editor pushed
   * and had nothing to say — which still draws the wordless seam, because the seam belongs to the
   * boundary and not to the sentence. Written `?? localStrip` rather than `|| localStrip` for
   * exactly that distinction.
   *
   * ⚠️ In the detached window `localStrip` is always `IDLE` anyway (no node graph, no project
   * model), so this is not a race between two live answers — it is one answer and one placeholder.
   */
  const isDetached = Boolean(onStripAction);
  const strip = stripToRender(previewStrip, localStrip);

  /**
   * TVW-002 AC1 — publish where the canvas's component sits on the screen, for `EditorDocument` to
   * merge with the author's own selection. See `placementOutline.ts` for why this surface publishes
   * rather than draws.
   *
   * ⚠️ The cleanup publishes `null`. This component unmounts on every layout change (the reason
   * `benchRequest.ts` decouples the bench at all), and an outline left behind would sit on the app
   * with nothing on screen still claiming it.
   */
  useEffect(() => {
    publishPlacementOutline(outline);
    return () => publishPlacementOutline(null);
  }, [outline]);

  /**
   * FIX-011 — the component's own default size, read on the way in and written
   * only by the button.
   *
   * It lives here rather than in `ComponentBench` because **this** component
   * owns `frame`, and a stored size that had to travel up through
   * `onFrameChange` would be a second writer of one piece of state — which is
   * how the frame and the strip would end up disagreeing about how wide it is.
   */
  const [hasDefaultSize, setHasDefaultSize] = useState(false);
  /** Named rather than inlined into the deps array, so the effect below reads. */
  const benchTarget = scope.mode === 'bench' ? scope.target : undefined;

  useEffect(() => {
    if (!benchTarget) return;

    const component = ProjectModel.instance ? benchComponent(ProjectModel.instance, benchTarget) : undefined;
    const stored = readBenchFrameDefault(component?.getMetaData(BENCH_FRAME_KEY));
    setHasDefaultSize(Boolean(stored));

    /**
     * TVW-008 AC4 — the scenario the bench opens on has a width, and it wins.
     *
     * ⚠️ **Only ever *applied* when there is one.** Falling back to `DEFAULT_BENCH_FRAME` here
     * would reset the frame every time you pointed the bench at a component that has neither a
     * scenario frame nor a stored default — silently throwing away a width the user set moments
     * ago, which is the frame control's own version of the reported bug. That rule is now
     * {@link benchOpeningFrame}'s `current` argument, which is why this is a functional update:
     * the effect is keyed on the target, so a `frame` read from the closure would be the width
     * from whenever the target last changed rather than the one on screen.
     *
     * 🔴 The *values* are seeded by `ComponentBench` and the *width* here, and they must not swap:
     * child effects run before parent effects, so a width set in the child would be overwritten by
     * this one without either file saying so.
     */
    // No interface is passed, and none is needed: `iface` only filters the *values*, and the only
    // field read here is the scenario's own recorded frame. Which scenario it is — the first — is
    // the one rule, and it is asked of the one function the bench asks.
    const opening = benchOpeningScenario(readBenchScenarios(component?.getMetaData(BENCH_SCENARIOS_KEY)));
    if (stored || opening) setFrame((current) => benchOpeningFrame(opening, stored, current));
  }, [benchTarget]);

  /**
   * ⚠️ **The only write on this surface that reaches `project.json` besides a
   * scenario save**, and it is reached from a button and from nothing else. A
   * resize handle must never call this — see `benchFrameDefault.ts`.
   */
  const setDefaultSize = useCallback(() => {
    if (scope.mode !== 'bench' || !ProjectModel.instance) return;

    const component = benchComponent(ProjectModel.instance, scope.target);
    if (!component) return;

    component.setMetaData(BENCH_FRAME_KEY, benchFrameStore(frame));
    setHasDefaultSize(true);
  }, [frame, scope]);

  /**
   * DES-001 — design mode said on the surface it applies to.
   *
   * The only cue used to be the segmented control in the top bar, two panels
   * away from the pointer, so people clicked a button, got nothing (the
   * inspector eats the event in the capture phase) and read it as broken. The
   * frame is the standing answer, the toast is the answer to a specific click.
   *
   * Scoped to the app preview deliberately: the bench has its own accent strip
   * for its own claim, and two accent claims on one surface is two answers to
   * "what am I looking at". The board is the same case as the bench.
   */
  const showDesignChrome = Boolean(designMode) && isApp;
  const [selectionToast, setSelectionToast] = useState<string | null>(null);

  useEffect(() => {
    if (!showDesignChrome || !designSelection) {
      setSelectionToast(null);
      return;
    }

    setSelectionToast(designSelection.label);
    const timeout = setTimeout(() => setSelectionToast(null), 3200);
    return () => clearTimeout(timeout);
  }, [showDesignChrome, designSelection?.seq, designSelection?.label]);

  /**
   * BEN-004 §6 — the entry the feature will actually be used through:
   * components panel → right-click → "Preview in isolation". The panel is a
   * different React root, so the existing global bus carries it.
   *
   * The claim on mount is the other half: a request made while the preview was
   * detached fires before this surface exists, so `benchRequest` parks it and
   * this picks it up once `EditorDocument` has re-attached.
   */
  useEffect(() => {
    const eventGroup = {};
    EventDispatcher.instance.on(
      BENCH_MOUNT_EVENT,
      (args: { target?: string }) => {
        if (!args?.target) return;
        // Handled live, so nothing is left parked for the next mount.
        clearPendingBenchMount();
        setScope({ mode: 'bench', target: args.target });
      },
      eventGroup
    );

    const parked = takePendingBenchMount();
    if (parked) setScope({ mode: 'bench', target: parked });

    return () => EventDispatcher.instance.off(eventGroup);
  }, []);

  useEffect(() => {
    onWebView(webviewRef.current);

    if (webviewRef.current) {
      webviewRef.current.addEventListener('crashed', () => {
        setCrashed(true);
      });
    }
  }, [webviewRef]);

  /**
   * UNI-011 AC3 — put the **app** preview in the capture registry.
   *
   * 🔴 It was never in it, and the drive is what found that. `livePreviewCapture` was built for
   * BLD-014, whose two hosts are the AI sandbox surfaces — `ComponentBench` and
   * `AuthoringPreviewDocument` — so `registerLivePreview` had exactly those two callers and
   * `hasLivePreview()` returned **false** with a preview running in front of the user. UNI-011's
   * own note that *"both halves already exist"* was true of a different preview from the one AC3
   * means: the app preview is the surface whose port values the other half reads.
   *
   * ⚠️ Registered here rather than beside `onWebView` above, because that effect also runs on
   * `restart()` and a double `add` to a `Set` is silent — the cleanup is what has to be paired,
   * and pairing it needs an effect that owns nothing else.
   *
   * The registry is newest-last and `captureLivePreview` takes the last, so opening a bench over
   * this canvas still captures the bench: the app preview is *hidden, never unmounted* (R3), so it
   * stays registered, and the bench mounts after it.
   */
  useEffect(() => {
    const element = webviewRef.current;
    if (!element) return undefined;
    registerLivePreview(element);
    return () => unregisterLivePreview(element);
  }, [webviewRef]);

  function restart() {
    if (webviewRef.current) {
      setCrashed(false);
      onWebView(webviewRef.current);
    }
  }

  useEffect(() => {
    if (!webviewBounds || !containerBounds) {
      return;
    }

    if (webviewBounds.width > containerBounds.width && webviewBounds.height > containerBounds.height) {
      setStyle({});
    } else if (webviewBounds.width > containerBounds.width) {
      setStyle({ flexDirection: 'row', alignItems: 'center' });
    } else if (webviewBounds.height > containerBounds.height) {
      setStyle({ flexDirection: 'column', alignItems: 'center' });
    } else {
      setStyle({ alignItems: 'center', justifyContent: 'center' });
    }
  }, [webviewBounds, containerBounds]);

  useEffect(() => {
    if (!webviewBounds) {
      return;
    }

    setShowViewportSize(true);

    const timeout = setTimeout(() => {
      setShowViewportSize(false);
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, [containerBounds, webviewBounds]);

  return (
    <div className={css.Background} data-preview-mode={scope.mode}>
      {/* R1/R4: the scope control is the leftmost thing in the strip, and the
          strip is in the same place in both modes. It is how you get into the
          bench and it is the only way out — a second "exit" affordance would be
          a second answer to the same question. */}
      <div
        className={classNames(css.Chrome, isBench && css['is-bench'], showDesignChrome && css['is-design'])}
        data-test="preview-chrome"
      >
        <PreviewScopeControl
          scope={scope}
          onScopeChange={setScope}
          getComponents={() => ProjectModel.instance?.getComponents() ?? []}
        />

        {showDesignChrome && (
          <div className={css.DesignBanner} data-test="design-mode-banner">
            <Icon icon={IconName.Pencil} size={IconSize.Small} UNSAFE_className={css.DesignBannerIcon} />
            <span className={css.DesignBannerText}>
              <strong>Design mode</strong>
              <span>&nbsp;— click an element to edit it. The app is not running.</span>
            </span>
            {/* The way out, on the surface the confusion happens on — the top
                bar's toggle is the same switch, two panels away. */}
            <button className={css.DesignBannerExit} onClick={onExitDesignMode} data-test="design-mode-exit">
              <Icon icon={IconName.PlayCircle} size={IconSize.Small} />
              <span>Preview</span>
              <span className={css.DesignBannerKey}>{Keybindings.TOGGLE_PREVIEW_MODE.label}</span>
            </button>
          </div>
        )}

        {isBench && (
          <>
            {/* R2's persistent strip: what is mounted, and that it is isolated.
                Said in words as well as drawn, because the words are what a
                user repeats when they file a bug about it.

                TVW-001 (f) / R-G — and the word it hands them is now the
                surface's own name. FIX-019 had it describe itself without
                naming itself; a person who cannot name it cannot ask for it.
                The strings live in `benchWords.ts` so this, the panel's menu
                row and the scope picker cannot drift into three dialects. */}
            <div className={css.BenchCaption} data-test="bench-caption">
              <strong>{WORKBENCH}</strong>
              <span>
                {CAPTION_JOIN}
                {benchCaptionRest(benchTargetLabel(scope.target))}
              </span>
            </div>

            {/*
              FIX-019 — the canvas is not on the component the bench is showing,
              said where the confusion happens, with the way back attached.

              ⚠️ **Assertive, not a passive read-out.** It appears only on
              divergence, which is why it costs the strip nothing in the common
              case — BEN-004's drive measured this strip clipping at 640px, and
              a permanent "canvas: X" would spend width it has already been
              measured short of. On the `DesignBannerExit` precedent above.

              The click navigates the *canvas*, never the bench: `revealBenchTarget`
              is the same call the components panel makes, `pushHistory` and all,
              so Back works afterwards.
            */}
            {diverged && (
              <button
                className={css.BenchDiverged}
                onClick={() => revealBenchTarget(scope.target)}
                // `canvasComponent` is non-empty whenever `diverged` is true —
                // but this file's own history is a `useTrackBounds` throw that
                // took the whole preview surface's React tree down, so the
                // guard costs nothing and the tree stays up.
                title={`The node graph is showing ${
                  canvasComponent ? benchTargetLabel(canvasComponent) : 'another component'
                } — go back to the benched component`}
                data-test="bench-diverged"
              >
                <Icon icon={IconName.ArrowLeft} size={IconSize.Small} />
                <span>Back to {benchTargetLabel(scope.target)}</span>
              </button>
            )}

            <BenchFrameControl
              frame={frame}
              onFrameChange={setFrame}
              onSetDefaultSize={setDefaultSize}
              hasDefaultSize={hasDefaultSize}
            />
            <div className={css.BenchSize} data-test="bench-size">
              {benchSizeLabel(frame, benchMeasured)}
            </div>
          </>
        )}

        {/*
          TVW-008 — the board's half of the same row, in the same voice: the
          surface names itself and then says what is on it.

          🔴 **It does not mention data, and that is AC7's ruling rather than an
          omission.** `boardCaptionRest` carries the reasoning: Richard cut
          "Sample values." from the bench caption on 2026-09-18 because *sample*
          meant two things within 44px, and on the board the frame captions
          already say where each frame's values came from, per frame.
        */}
        {isBoard && (
          <div className={css.BenchCaption} data-test="board-caption">
            <strong>{BOARD}</strong>
            <span>
              {CAPTION_JOIN}
              {boardCaptionRest(boardFrameCount)}
            </span>
          </div>
        )}
      </div>

      <div className={classNames(css.Stages, showDesignChrome && css['is-design'])}>
        {/* PAR-003: size tag per mock — `1280 × 800 · 100%`, mono, top-right.
            Lives inside the stage so it floats over the preview rather than
            over the chrome strip above it. */}
        {showViewportSize && isApp && webviewBounds && (
          <div className={css.ViewportInfo}>{`${deviceName ? deviceName + ' · ' : ''}${Math.floor(
            webviewBounds.width
          )} × ${Math.floor(webviewBounds.height)} · ${Math.floor(zoom * 100)}%`}</div>
        )}

        {/*
          R3 — hidden, never unmounted. `visibility: hidden` keeps the element's
          layout box, so the route, the scroll position and the half-filled form
          all survive a round trip *and* the zoom-to-fit arithmetic keeps
          measuring a real rectangle.
        */}
        <div
          className={classNames(css.WebviewContainer, !isApp && css['is-hidden'])}
          style={style}
          ref={containerRef}
          data-test="app-preview"
        >
          <webview
            className={css.Webview}
            ref={webviewRef}
            // @ts-expect-error. Typings think this is a boolean. It's not, html attributes are strings.
            disablewebsecurity="true"
            webpreferences="allowRunningInsecureContent, enableRemoteModule"
          />
        </div>

        {/* `onFrameChange` has exactly one caller — a scenario carrying the
            width it was saved at (BEN-005). The frame lives here rather than in
            the bench because the chrome strip's control writes it too, and the
            two have to be the same number. */}
        {isBench && (
          <ComponentBench
            target={scope.target}
            frame={frame}
            onFrameChange={setFrame}
            onFrameMeasured={setBenchMeasured}
            designMode={Boolean(designMode)}
          />
        )}

        {/* TVW-008 slice 2 — one `<webview>`, N frames, and the chrome the
            editor draws over it. Mounted only in board mode, so the board's
            client exists only while somebody is looking at it. */}
        {isBoard && (
          <ComponentBoard
            designMode={Boolean(designMode)}
            onScopeChange={setScope}
            onFrameCountChange={setBoardFrameCount}
          />
        )}

        {/* Answers the click at the pointer. `pointer-events: none` — it sits
            over the app, and a design-mode click that lands on the explanation
            of design mode instead of on the element under it would be its own
            small betrayal. */}
        {selectionToast && (
          <div className={css.DesignToast} data-test="design-mode-toast">
            <strong>Selected {selectionToast}</strong>
            <span>Editing it in the property panel. Switch to Preview to click it for real.</span>
          </div>
        )}
      </div>

      {/*
        TVW-002 — what the preview is NOT showing, said AT THE BOUNDARY: the last row of the
        preview column, directly above the frame divider that separates the app from the node
        canvas. Proposal §2 row 11: the canvas and the preview show two different things and the
        editor has never had a sentence between them.

        🔴 **Richard moved it here on 2026-09-18, and the reason is the whole task.** §2 said "one
        line under the preview caption"; driven, that put the sentence ~300px away from the edge
        where the two surfaces actually meet — where an eye slides from the app straight onto the
        graph without anything marking the change. A separator has to be at the seam to be one.
        Never over the app (§2's own rule): it is a row in the column, so it takes its height.

        ⚠️ It stays inside `VisualCanvas` rather than moving to the top of the node graph, which is
        where the boundary also is. Three reasons, all structural: the sentence is about what the
        PREVIEW is showing (R4 keeps the way back on this surface); the node graph is a legacy
        non-React view; and in the detached layout the graph is the only thing in the window, so a
        strip there would describe a preview that is somewhere else entirely.

        ⚠️ In the `vertical` layout (the lessons default) the two surfaces meet at a VERTICAL edge,
        so no horizontal row can sit in it. This is then simply the preview's last row.

        🔴 **This is what is shipped INSTEAD of moving the preview.** The rule is that the app
        preview never changes route or mode because the canvas did, and every door below is a
        thing the *user* pressed. See `usePreviewStrip`.

        🔴 **UNCONDITIONAL — ruled by Richard on 2026-09-18, and the re-drive is what asked him.**
        The row used to render only when the two surfaces disagreed. Moving it to the seam made a
        separator of it, and a separator that comes and goes is not one: `tvw002-agree-no-strip`
        shows the app's hero image abutting the canvas's dotted grid with nothing between them, in
        the case that is the COMMON one. The shape decides the row's `tone` now, not its existence
        — `quiet` when they agree (surface colour, a short reassuring sentence, no doors), `notice`
        when they do not. See `StripTone`.
      */}
      <div
        className={css.Strip}
        data-test="preview-strip"
        data-shape={strip.shape}
        data-tone={strip.tone}
        data-detached={isDetached ? 'true' : undefined}
      >
        <span className={css.StripText}>
          <strong>{strip.lead}</strong>
          {strip.rest ? ' ' : ''}
          <span>{strip.rest}</span>
        </span>

        {strip.doors.map((door) =>
          door.kind === 'goto' ? (
            <button
              key={`goto:${door.page}`}
              className={css.StripDoor}
              onClick={() =>
                onStripAction ? onStripAction({ kind: 'goto', page: door.page }) : goToPage(door.page)
              }
              data-test="preview-strip-goto"
            >
              {door.label}
            </button>
          ) : (
            <button
              key="bench"
              className={css.StripDoor}
              /* Detached, the bench cannot be shown in this window at all: BEN-004 made it a mode of
                 the DOCKED surface, and `VisualCanvas` is not rendered in the editor while the
                 preview is detached. The editor's own handler re-attaches and mounts it, which is
                 the behaviour the menu item has had since BEN-004 — the door inherits it rather
                 than growing a second answer. */
              onClick={() =>
                onStripAction
                  ? onStripAction({ kind: 'bench' })
                  : canvasComponent && setScope({ mode: 'bench', target: canvasComponent })
              }
              data-test="preview-strip-bench"
            >
              {door.label}
            </button>
          )
        )}

        {/* Per pair, for the session — `dismissalKey`. Not an icon: a `×` needs no legend and
            this strip has already spent its width on a sentence.

            ⚠️ On the `quiet` row there is nothing to dismiss, and offering the button anyway would
            invite someone to press it to get rid of a separator that is deliberately permanent. */}
        {strip.tone === 'notice' && (
          <button
            className={css.StripDismiss}
            onClick={() => (onStripAction ? onStripAction({ kind: 'dismiss' }) : dismiss())}
            title="Dismiss — until you open this component on this page again"
            aria-label="Dismiss"
            data-test="preview-strip-dismiss"
          >
            ×
          </button>
        )}
      </div>

      {Boolean(crashed) && (
        <div className={css.Crashed}>
          <div className={css.CrashedContent}>
            <Label size={LabelSize.Big} hasBottomSpacing>
              Aw, Snap!
            </Label>
            <Text>Something went wrong while displaying this web page.</Text>
            <Box hasTopSpacing>
              <PrimaryButton size={PrimaryButtonSize.Small} label="Try again." onClick={restart} />
            </Box>
          </div>
        </div>
      )}
    </div>
  );
}
