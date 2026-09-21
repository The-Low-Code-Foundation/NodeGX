/**
 * TVW-002 — the editor-side half of the strip: what the two surfaces are showing, right now.
 *
 * Everything that decides a *word* lives in `previewStripWords.ts`, `pageReach.ts` and
 * `screenRoute.ts`, all pure and all graded. This file is the plumbing those three cannot be: the
 * subscriptions, the project walk and the one navigation the strip is allowed to perform.
 *
 * 🔴 **THE STRIP READS BOTH SURFACES AND WRITES NEITHER.** The phase's standing rule is that the
 * app preview never changes route or mode because the canvas moved, and a hook that answers
 * "do these two disagree" is precisely the place where someone will later be tempted to "just fix
 * it" by moving one of them. The only write in this file is {@link PreviewStrip.goToPage}, which
 * runs from a click on a door. `benchRequest.ts` documents the same direction for the bench, and
 * for the same reason: `VisualCanvas` remounts on layout changes, so a render that navigated would
 * yank a surface back every time the user resized a panel.
 *
 * ⚠️ **Recomputed on node-library events as well as graph events, and that is not caution.**
 * The walk needs `getVisualRootIds()`, which reads `allowAsChild` off each root's *resolved* type.
 * On project open those types have not resolved yet, so every visual component answers "no visual
 * root" — P93's slice 2 drive caught exactly this filing 22 of 22 visual components under Logic
 * (`allowaschild-is-stale-until-the-node-library-loads`). A strip built on a stale read would tell
 * the user their page component was logic. The same `LIBRARY_EVENTS` + debounce the components
 * panel uses is why it does not.
 *
 * @module noodl-editor/views/VisualCanvas/usePreviewStrip
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { NodeLibrary } from '@noodl-models/nodelibrary';
import { getIndexedPages } from '@noodl-utils/compilation/context/pages';

import { EventDispatcher } from '../../../../shared/utils/EventDispatcher';
import { buildUsageIndex, type RouterPages } from '../panels/ComponentsPanelNew/componentUsage';
import { reachOfScreen, screensShowing, type ReachComponent, type ReachIndex } from './pageReach';
import { benchTargetLabel } from './previewScope';
import type { PlacementOutline } from './placementOutline';
import { previewStrip, seam, type StripModel } from './previewStripWords';
import { pageForRoute, type ScreenPage } from './screenRoute';

/** The events after which a component's placement, its Router or its roots can have changed. */
const GRAPH_EVENTS = ['Model.nodeAdded', 'Model.nodeRemoved', 'Model.parametersChanged'];
const LIBRARY_EVENTS = ['libraryUpdated', 'moduleRegistered', 'moduleUnregistered', 'typeAdded', 'typeRemoved'];
const AFTER_GRAPH_TYPE_UPDATE_MS = 20;

export interface PreviewStrip {
  strip: StripModel;
  /**
   * TVW-002 AC1 — the path the preview should outline, or `null`.
   *
   * Set only when the two surfaces **agree** and the canvas's component is placed somewhere on the
   * screen being shown: the quiet row says *"Hero is on Pricing"* and this says **where**. The
   * caller pushes it down the editor's existing selection channel, so the outline is the one the
   * preview already draws for a selected node rather than a fourth kind of line over the app.
   *
   * 🔴 A **path**, ending on the node that paints — not the id of the instance that places it. An
   * instance node has no DOM, so the obvious answer outlines nothing at all, silently. See
   * `pageReach`'s note on `firstRendered`; the drive is what found it.
   *
   * 🔴 **This hook does not push it.** Two writers to one guest highlight is a race, and the
   * editor already has a single writer for it (`EditorDocument`). See {@link PreviewStrip}'s
   * module note: the strip reads both surfaces and writes neither.
   */
  outline: PlacementOutline;
  /** Navigate the app preview to a page, from a door the user pressed. */
  goToPage: (page: string) => void;
  /** Hide this strip for this (component, screen) pair until the editor is restarted. */
  dismiss: () => void;
}

/**
 * The dismissal key — the **pair**, not the component.
 *
 * Dismissing "Hero isn't on Pricing" must not also dismiss "Hero isn't on Checkout": they are two
 * different facts and the second one is news. Keyed on the screen rather than the route so that
 * `/product/42` and `/product/7` are one page, which is what a person means by "yes, I know".
 */
export function dismissalKey(canvasComponent: string, screenPage: string | undefined): string {
  return `${canvasComponent}\u0000${screenPage ?? ''}`;
}

/**
 * @param canvasComponent the node graph's component, by legacy name — `activeCanvasComponentName`.
 * @param enabled false while the bench is showing: the bench has its own caption and its own
 *   divergence chip, and two accent claims on one surface is two answers to "what am I looking at".
 */
export function usePreviewStrip(canvasComponent: string | undefined, enabled: boolean): PreviewStrip {
  const [counter, setCounter] = useState(0);
  /**
   * ⚠️ Session state, never persisted and never project state (R5). A strip that stayed dismissed
   * across a restart would be an explanation the editor had silently decided you no longer need.
   */
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const [route, setRoute] = useState<string | undefined>(() => readCurrentRoute());
  const [pages, setPages] = useState<readonly ScreenPage[]>([]);

  useEffect(() => {
    const group = { id: 'usePreviewStrip.route' };
    // The editor's own record of where the preview got to — set by `CanvasView` on `load-commit`
    // and by `setCurrentRoute`, so a navigation the *app* performed is seen as well as one the
    // route pill did. Seeded too, because this surface mounts long after the preview started.
    EventDispatcher.instance.on('viewer-navigated', (nextRoute: string) => setRoute(nextRoute), group);
    setRoute(readCurrentRoute());
    return () => {
      EventDispatcher.instance.off(group);
    };
  }, []);

  useEffect(() => {
    const group = { id: 'usePreviewStrip.graph' };
    // 🔴 HLT-003 — deferred, because a graph event can arrive **during another
    // component's render**.
    //
    // These three events are emitted from model construction, not only from user
    // edits: `NodeGraphModel.fromJSON` → `addRoot` → `Model.notifyListeners`. And
    // one caller builds graph models *inside a `useMemo`* — `ComponentBoard`'s
    // `buildBoardExport`, which runs in the render phase on purpose (see its
    // note on `boardExportSignature`). So on the first board mount this listener
    // ran with React mid-render and bumped state belonging to `VisualCanvas`,
    // which is the whole of "Cannot update a component (`VisualCanvas`) while
    // rendering a different component (`ComponentBoard`)" — one event per
    // session, in every session that opened the board, since the board shipped.
    //
    // A microtask cannot interrupt a synchronous render, so the bump lands after
    // the render completes and before paint: the strip recomputes in the same
    // frame it would have, and nothing about *what* it computes changes. Fixing
    // it at the subscriber rather than at `buildBoardExport` is deliberate —
    // this hook is the thing that turns a global event into React state, so it
    // is the thing that owes React the phase discipline, and any other
    // render-phase producer is covered by the same line.
    //
    // ⚠️ The two listeners above are left immediate on purpose: `viewer-navigated`
    // is emitted by `CanvasView` on `load-commit` and by the route pill, neither
    // of which is a render, and no measured event attributes to them. If one ever
    // does, it wants this same treatment rather than a second mechanism.
    EventDispatcher.instance.on(GRAPH_EVENTS, () => queueMicrotask(() => setCounter((c) => c + 1)), group);
    return () => {
      EventDispatcher.instance.off(group);
    };
  }, []);

  useEffect(() => {
    const group = { id: 'usePreviewStrip.library' };
    let timer: ReturnType<typeof setTimeout> | undefined;
    NodeLibrary.instance.on(
      LIBRARY_EVENTS,
      () => {
        clearTimeout(timer);
        timer = setTimeout(() => setCounter((c) => c + 1), AFTER_GRAPH_TYPE_UPDATE_MS);
      },
      group
    );
    return () => {
      clearTimeout(timer);
      NodeLibrary.instance.off(group);
    };
  }, []);

  /**
   * The dev preview's own route table.
   *
   * ⚠️ Asynchronous because `getIndexedPages` is — it asks for dynamic routes to be expanded. The
   * identity expander is what `useRoutes` passes for the route pill, and it keeps `{id}` in the
   * path so `pageForRoute` can match a real `/product/42` against it.
   */
  useEffect(() => {
    let cancelled = false;
    if (!ProjectModel.instance) return undefined;

    getIndexedPages(ProjectModel.instance, {
      expandPaths: async (route) => [{ title: route.title, path: route.current.path, meta: {} }]
    })
      .then((indexed) => {
        if (!cancelled) setPages(indexed.map((page) => ({ path: page.path, componentName: page.componentName })));
      })
      .catch(() => {
        // A project mid-edit can fail to index; the strip then says "this screen" rather than
        // naming a page, which is the honest fallback and not a crash on the preview surface.
        if (!cancelled) setPages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [counter]);

  /**
   * ⚠️ **Gated on `enabled`, and that is not a micro-optimisation.** Since AC5 this hook runs in two
   * places — `VisualCanvas` for the docked preview and `EditorDocument` for the detached one — and
   * exactly one of them is live at a time. Ungated, the other would walk every component of the
   * project on every graph event for an answer nobody reads. On the corpus fixture that is 165
   * components per keystroke-shaped edit.
   */
  const project = useMemo(() => (enabled ? readProject(counter) : EMPTY_PROJECT), [counter, enabled]);

  const screenPage = useMemo(
    () => pageForRoute(route, pages, project.startPage),
    [route, pages, project.startPage]
  );

  /**
   * One walk of the screen, shared by the sentence and the outline.
   *
   * ⚠️ Hoisted out of the strip memo when AC1 landed, so that both answers come from the **same**
   * walk. Computed twice, the sentence could say "Hero is on Pricing" off one pass while the
   * outline pointed at a node id from another — and the two would disagree only in the window
   * between a graph edit and a re-render, which is the hardest kind of wrong to see.
   */
  const reach = useMemo(
    () => (project.root ? reachOfScreen(project.root, screenPage, project.components) : undefined),
    [project.root, project.components, screenPage]
  );

  const strip = useMemo(() => {
    if (!enabled || !canvasComponent || !project.root || !reach) return IDLE;
    // 🔴 A dismissal removes the SENTENCE, not the SEAM. Richard ruled the row always drawn on
    // 2026-09-18, so the dismissed state is the quiet row rather than no row — otherwise pressing
    // `×` would silently delete the separator he had asked for the same morning, and the boundary
    // would be there or not depending on which components you had already acknowledged.
    if (dismissed.has(dismissalKey(canvasComponent, screenPage))) return IDLE;

    const onScreen = reach.renders.has(canvasComponent);
    const component = project.components.get(canvasComponent);
    // `sectionFor`'s own definition of logic: at least one node, and no root that draws.
    const isLogic = Boolean(component) && component.visualRootIds.length === 0 && component.roots.length > 0;

    const { renders, mounts, repeated } = screensShowing(canvasComponent, project.root, project.pages, project.components);

    return previewStrip({
      canvasLabel: benchTargetLabel(canvasComponent),
      canvasComponent,
      screenLabel: screenPage ? benchTargetLabel(screenPage) : '',
      screenPage,
      onScreen,
      isLogic,
      // Richard, 2026-09-18 — a component a repeater draws says so. Read off the SCREEN's own walk
      // rather than `screensShowing`'s any-page answer: a component repeated on Pricing and placed
      // once on Home must not say "once per item" while the preview is showing Home.
      repeated: reach.repeated.has(canvasComponent),
      showingPages: renders.map(asPage),
      runningPages: mounts.map(asPage),
      // Only consulted when no screen shows it. `it's only inside X, which no page shows` is a
      // different fact from `nothing places it`, and 1094 components in this machine's corpus are
      // the first rather than the second.
      placedIn: (project.parentsOf.get(canvasComponent) ?? []).map(asPage)
    });
  }, [enabled, canvasComponent, screenPage, project, dismissed, reach]);

  /**
   * Where to draw it — `null` unless the strip is quiet *and* there is a drawn placement to point
   * at.
   *
   * ⚠️ **Gated on the strip's own shape, not on `renders` alone.** The two cases with no placement
   * — the root component and the routed page — are exactly the two the quiet row words as *"X is
   * the screen the preview is showing"*, and `firstRendered` has no entry for either
   * (`pageReach`'s own note). Reading `renders` directly here would ask for an outline in the one
   * case where there is nothing that could be outlined.
   */
  const outline = useMemo(() => {
    if (!enabled || !canvasComponent || !reach) return null;
    if (strip.shape !== 'agree' || strip.tone !== 'quiet') return null;

    return reach.firstRendered.get(canvasComponent) ?? null;
  }, [enabled, canvasComponent, reach, strip]);

  const goToPage = useCallback(
    (page: string) => {
      const path = pages.find((p) => p.componentName === page)?.path;
      if (!path) return;

      // The same channel the route pill and the lesson layer use, so the docked preview, the
      // detached window and the editor's own record of the route all move together — rather than
      // this surface reaching for a `CanvasView` it does not have.
      EventDispatcher.instance.emit('setPreviewRoute', { url: routePrefix() + path });
    },
    [pages]
  );

  const dismiss = useCallback(() => {
    if (!canvasComponent) return;
    setDismissed((current) => new Set(current).add(dismissalKey(canvasComponent, screenPage)));
  }, [canvasComponent, screenPage]);

  return { strip, outline, goToPage, dismiss };
}

/**
 * The seam with no sentence on it — bench mode, no project, and a dismissed pair.
 *
 * ⚠️ **Bench mode gets the wordless row deliberately.** The Workbench caption already says what it
 * is showing, one row above; a second claim on the same surface is the "two answers to *what am I
 * looking at*" defect this file's `enabled` flag exists to prevent. The boundary still needs
 * marking there, so the row stays and the words go.
 */
const IDLE: StripModel = seam();

const EMPTY_PROJECT: ProjectShape = {
  root: undefined,
  components: new Map(),
  parentsOf: new Map(),
  pages: [],
  startPage: undefined
};

const asPage = (name: string) => ({ page: name, label: benchTargetLabel(name) });

/**
 * `CanvasView` writes the current route to a window global on every navigation, which is the only
 * record of it that survives this surface being unmounted and remounted by a layout change.
 */
function readCurrentRoute(): string | undefined {
  const route = (window as unknown as { noodlEditorPreviewRoute?: string }).noodlEditorPreviewRoute;
  return typeof route === 'string' ? route : undefined;
}

/**
 * The prefix a route needs in this project — `/#` for a hash project, which is the runtime's
 * default when `navigationPathType` was never set. Same rule as `UseRoutes`.
 */
function routePrefix(): string {
  const type = ProjectModel.instance?.getSettings()?.navigationPathType;
  return type === undefined || type === 'hash' ? '/#' : '';
}

interface ProjectShape {
  root: string | undefined;
  components: ReachIndex;
  /** Which components place an instance of each component — `buildUsageIndex`'s own answer. */
  parentsOf: Map<string, string[]>;
  /** Every page component, in Router order then the unrouted ones — `screensShowing`'s input. */
  pages: string[];
  /** What the Router opens at `/`. */
  startPage: string | undefined;
}

/** One walk of the project into the shape `pageReach` reads. Memoised on the change counter. */
function readProject(_counter: number): ProjectShape {
  const project = ProjectModel.instance;
  if (!project) return EMPTY_PROJECT;

  const components = project.getComponents();
  const index = new Map<string, ReachComponent>();

  for (const component of components) {
    index.set(component.name, {
      name: component.name,
      roots: component.graph?.roots ?? [],
      // 🔴 The model's answer, not a re-derivation — see the module note on `allowAsChild`.
      visualRootIds: safeVisualRootIds(component)
    });
  }

  const routers: RouterPages[] = [];
  const usage = buildUsageIndex(components, routers);

  const pages: string[] = [];
  for (const router of routers) for (const route of router.routes) if (!pages.includes(route)) pages.push(route);
  for (const [name, entry] of usage) if (entry.hasPageNode && !pages.includes(name)) pages.push(name);

  const parentsOf = new Map<string, string[]>();
  for (const [name, entry] of usage) {
    const parents: string[] = [];
    for (const instance of entry.instances) if (!parents.includes(instance.parent)) parents.push(instance.parent);
    parentsOf.set(name, parents);
  }

  return {
    root: project.getRootComponent()?.name,
    components: index,
    parentsOf,
    pages,
    startPage: routers[0]?.startPage
  };
}

/**
 * `getVisualRootIds` touches `root.type`, which resolves to an `UnknownNodeType` for a node from a
 * module that failed to load. Guarded so an unresolved type costs the strip its sentence rather
 * than taking the preview surface's React tree down — this file's own neighbourhood has a
 * `useTrackBounds` throw in its history that did exactly that.
 */
function safeVisualRootIds(component: { graph?: { getVisualRootIds?: () => string[] } }): string[] {
  try {
    return component.graph?.getVisualRootIds?.() ?? [];
  } catch {
    return [];
  }
}
