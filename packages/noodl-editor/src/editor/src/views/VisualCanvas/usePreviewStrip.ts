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
import { previewStrip, type StripModel } from './previewStripWords';
import { pageForRoute, type ScreenPage } from './screenRoute';

/** The events after which a component's placement, its Router or its roots can have changed. */
const GRAPH_EVENTS = ['Model.nodeAdded', 'Model.nodeRemoved', 'Model.parametersChanged'];
const LIBRARY_EVENTS = ['libraryUpdated', 'moduleRegistered', 'moduleUnregistered', 'typeAdded', 'typeRemoved'];
const AFTER_GRAPH_TYPE_UPDATE_MS = 20;

export interface PreviewStrip {
  strip: StripModel;
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
    EventDispatcher.instance.on(GRAPH_EVENTS, () => setCounter((c) => c + 1), group);
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

  const project = useMemo(() => readProject(counter), [counter]);

  const screenPage = useMemo(
    () => pageForRoute(route, pages, project.startPage),
    [route, pages, project.startPage]
  );

  const strip = useMemo(() => {
    if (!enabled || !canvasComponent || !project.root) return IDLE;
    if (dismissed.has(dismissalKey(canvasComponent, screenPage))) return IDLE;

    const reach = reachOfScreen(project.root, screenPage, project.components);
    const onScreen = reach.renders.has(canvasComponent);
    const component = project.components.get(canvasComponent);
    // `sectionFor`'s own definition of logic: at least one node, and no root that draws.
    const isLogic = Boolean(component) && component.visualRootIds.length === 0 && component.roots.length > 0;

    const { renders, mounts } = screensShowing(canvasComponent, project.root, project.pages, project.components);

    return previewStrip({
      canvasLabel: benchTargetLabel(canvasComponent),
      screenLabel: screenPage ? benchTargetLabel(screenPage) : '',
      screenPage,
      onScreen,
      isLogic,
      showingPages: renders.map(asPage),
      runningPages: mounts.map(asPage)
    });
  }, [enabled, canvasComponent, screenPage, project, dismissed]);

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

  return { strip, goToPage, dismiss };
}

const IDLE: StripModel = { shape: 'agree', lead: '', rest: '', doors: [] };

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
  /** Every page component, in Router order then the unrouted ones — `screensShowing`'s input. */
  pages: string[];
  /** What the Router opens at `/`. */
  startPage: string | undefined;
}

/** One walk of the project into the shape `pageReach` reads. Memoised on the change counter. */
function readProject(_counter: number): ProjectShape {
  const project = ProjectModel.instance;
  if (!project) return { root: undefined, components: new Map(), pages: [], startPage: undefined };

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

  return {
    root: project.getRootComponent()?.name,
    components: index,
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
