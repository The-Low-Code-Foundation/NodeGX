/**
 * TVW-004 — the editor-side half of Layers: what is on the screen, right now.
 *
 * Everything that decides a *row* lives in `layersTree.ts`, pure and graded over all 117 projects
 * on this machine before this file existed. This is the plumbing that module cannot be: the
 * subscriptions, the project walk, and the collapse state a person's presses leave behind.
 *
 * 🔴 **LAYERS READS BOTH SURFACES AND WRITES NEITHER**, exactly as `usePreviewStrip` does and for
 * the same reason — the phase's standing rule is that the app preview never moves because the
 * canvas did. A row's `Edit ›` switches the *canvas*; nothing here navigates the preview.
 *
 * ⚠️ **Rebuilt on node-library events as well as graph events.** The walk needs
 * `getVisualRootIds()`, which reads `allowAsChild` off each root's *resolved* type, and on project
 * open those types have not resolved yet — which filed 22 of 22 visual components under Logic when
 * slice 2 of TVW-001 trusted it ([[allowaschild-is-stale-until-the-node-library-loads]]). Same
 * debounce as the Components tab, for the same reason.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/hooks/useLayersTree
 */

import { NodeGraphContextTmp } from '@noodl-contexts/NodeGraphContext/NodeGraphContext';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ComponentModel } from '@noodl-models/componentmodel';
import { NodeLibrary } from '@noodl-models/nodelibrary';
import { ProjectModel } from '@noodl-models/projectmodel';
import { getIndexedPages } from '@noodl-utils/compilation/context/pages';

import { EventDispatcher } from '../../../../../../shared/utils/EventDispatcher';
import { benchTargetLabel } from '../../../VisualCanvas/previewScope';
import { pageForRoute, type ScreenPage } from '../../../VisualCanvas/screenRoute';
import {
  containmentCrumb,
  expandedForEditing,
  layersOfScreen,
  offScreenFooter,
  rowsWithChildren,
  visibleRows,
  type LayersFooter,
  type LayerComponent,
  type LayerNode,
  type LayerRow,
  type LayersTree
} from '../layersTree';

const GRAPH_EVENTS = ['Model.nodeAdded', 'Model.nodeRemoved', 'Model.parametersChanged'];
const LIBRARY_EVENTS = ['libraryUpdated', 'moduleRegistered', 'moduleUnregistered', 'typeAdded', 'typeRemoved'];
const PROJECT_EVENTS = ['componentAdded', 'componentRemoved', 'componentRenamed', 'rootNodeChanged'];
const AFTER_GRAPH_TYPE_UPDATE_MS = 20;

export interface LayersView {
  /** The rows actually on screen: the whole tree filtered by what is open. */
  rows: LayerRow[];
  /** Every row the walk produced, open or not — what the header's counts are about. */
  all: readonly LayerRow[];
  /** Which keys are open. */
  expanded: ReadonlySet<string>;
  /** Which rows have something under them, and therefore a caret. */
  withChildren: ReadonlySet<string>;
  toggle(key: string): void;
  /** The page the preview is showing, as a person would name it. */
  screenLabel: string;
  /** The component the canvas is on, by legacy name. */
  canvasComponent: string | undefined;
  /** True when the canvas's component is nowhere on this screen — the note's condition (§2). */
  canvasOffScreen: boolean;
  /** §2's containment crumb: the components from the screen down to the one being edited. */
  crumb: string[];
  /** §2's footer: what the canvas's component holds that this screen does not draw. */
  footer: LayersFooter | null;
  cyclic: boolean;
}

export function useLayersTree(): LayersView {
  const [counter, setCounter] = useState(0);
  const [route, setRoute] = useState<string | undefined>(() => readCurrentRoute());
  const [pages, setPages] = useState<readonly ScreenPage[]>([]);
  const [canvasComponent, setCanvasComponent] = useState<string | undefined>(
    () => NodeGraphContextTmp.nodeGraph?.activeComponent?.name
  );
  /**
   * The presses a person has made, as overrides — **not** the open set itself.
   *
   * 🔴 Keeping the open set as state would freeze the first screen's answer: the default is
   * *"the branch you are editing"* (Richard, 2026-09-18), so it has to move when the canvas moves.
   * An override map keyed by row key survives a rebuild, and a row that has never been pressed
   * keeps following the default.
   */
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  useEffect(() => {
    const group = { id: 'useLayersTree.route' };
    EventDispatcher.instance.on('viewer-navigated', (next: string) => setRoute(next), group);
    setRoute(readCurrentRoute());
    return () => {
      EventDispatcher.instance.off(group);
    };
  }, []);

  useEffect(() => {
    const group = { id: 'useLayersTree.activeComponent' };
    EventDispatcher.instance.on(
      'activeComponentChanged',
      ({ component }: { component?: ComponentModel }) => setCanvasComponent(component?.name),
      group
    );
    // The canvas may have switched between the first render and this subscription.
    setCanvasComponent(NodeGraphContextTmp.nodeGraph?.activeComponent?.name);
    return () => {
      EventDispatcher.instance.off(group);
    };
  }, []);

  useEffect(() => {
    const group = { id: 'useLayersTree.graph' };
    EventDispatcher.instance.on(GRAPH_EVENTS, () => setCounter((c) => c + 1), group);
    if (ProjectModel.instance) ProjectModel.instance.on(PROJECT_EVENTS, () => setCounter((c) => c + 1), group);
    return () => {
      EventDispatcher.instance.off(group);
      if (ProjectModel.instance) ProjectModel.instance.off(group);
    };
  }, []);

  useEffect(() => {
    const group = { id: 'useLayersTree.library' };
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

  /** The dev preview's own route table — the same identity expander the route pill passes. */
  useEffect(() => {
    let cancelled = false;
    if (!ProjectModel.instance) return undefined;

    getIndexedPages(ProjectModel.instance, {
      expandPaths: async (r) => [{ title: r.title, path: r.current.path, meta: {} }]
    })
      .then((indexed) => {
        if (!cancelled) setPages(indexed.map((page) => ({ path: page.path, componentName: page.componentName })));
      })
      .catch(() => {
        // A project mid-edit can fail to index; Layers then draws the root's own screen, which is
        // what the app shows when a route resolves to nothing.
        if (!cancelled) setPages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [counter]);

  const project = useMemo(() => readProject(counter), [counter]);
  const screenPage = useMemo(() => pageForRoute(route, pages, project.startPage), [route, pages, project.startPage]);

  const tree = useMemo<LayersTree>(() => {
    if (!project.root) return EMPTY_TREE;
    return layersOfScreen({
      root: project.root,
      screenPage,
      canvasComponent,
      components: project.components,
      labelOf: benchTargetLabel,
      labelOfNode: safeLabel,
      categoryOfNode: safeCategory
    });
  }, [project, screenPage, canvasComponent]);

  const expanded = useMemo(() => {
    const open = new Set(expandedForEditing(tree.rows));
    for (const [key, isOpen] of overrides) {
      if (isOpen) open.add(key);
      else open.delete(key);
    }
    return open;
  }, [tree, overrides]);

  const rows = useMemo(() => visibleRows(tree.rows, expanded), [tree, expanded]);
  const withChildren = useMemo(() => rowsWithChildren(tree.rows), [tree]);

  const toggle = useCallback(
    (key: string) => {
      setOverrides((current) => {
        const next = new Map(current);
        next.set(key, !expanded.has(key));
        return next;
      });
    },
    [expanded]
  );

  const crumb = useMemo(() => containmentCrumb(tree.rows, canvasComponent), [tree, canvasComponent]);
  const footer = useMemo(
    () => (canvasComponent ? offScreenFooter(project.components.get(canvasComponent)) : null),
    [project, canvasComponent]
  );

  return {
    rows,
    all: tree.rows,
    crumb,
    footer,
    expanded,
    withChildren,
    toggle,
    screenLabel: tree.screen ? benchTargetLabel(tree.screen) : '',
    canvasComponent,
    // 🔴 Asked of the rows, not of a second walk: the note must agree with the tree beside it, and
    // two walks disagree in exactly the window between an edit and a re-render.
    canvasOffScreen: Boolean(canvasComponent) && !tree.rows.some((row) => row.owner === canvasComponent),
    cyclic: tree.cyclic
  };
}

const EMPTY_TREE: LayersTree = { rows: [], screen: undefined, cyclic: false, unresolvedRouters: [] };

interface ProjectShape {
  root: string | undefined;
  components: Map<string, LayerComponent>;
  startPage: string | undefined;
}

/**
 * One walk of the project into the shape `layersTree` reads.
 *
 * ⚠️ The component's **live** graph roots are handed over as-is rather than copied: a
 * `NodeGraphNode` already answers `id`, `typename`, `children` and `parameters`, which is every
 * field the walk reads off a node. Copying them would cost a second traversal of every graph on
 * every keystroke-shaped edit, and would go stale the moment it finished.
 */
function readProject(_counter: number): ProjectShape {
  const project = ProjectModel.instance;
  if (!project) return { root: undefined, components: new Map(), startPage: undefined };

  const components = new Map<string, LayerComponent>();
  for (const component of project.getComponents()) {
    components.set(component.name, {
      name: component.name,
      roots: (component.graph?.roots ?? []) as unknown as LayerNode[],
      // 🔴 The model's own answer, never a re-derivation — see this file's header.
      visualRootIds: safeVisualRootIds(component)
    });
  }

  return { root: project.getRootComponent()?.name, components, startPage: readStartPage(project) };
}

/** What the Router opens at `/` — the same read `usePreviewStrip` makes of the first Router. */
function readStartPage(project: ProjectModel): string | undefined {
  let startPage: string | undefined;
  for (const component of project.getComponents()) {
    component.forEachNode((node) => {
      if (startPage || node.typename !== 'Router') return;
      const pages = node.parameters?.pages as { routes?: string[]; startPage?: string } | undefined;
      const candidate = pages?.startPage || pages?.routes?.[0];
      if (typeof candidate === 'string' && candidate) startPage = candidate;
    });
    if (startPage) break;
  }
  return startPage;
}

/**
 * `NodeGraphNode.label` is a getter that falls through to `type.labelForNode(node)`, so a node
 * whose module failed to load can throw here. Guarded: an unresolved type costs one row its name,
 * not the panel its React tree.
 */
function safeLabel(node: LayerNode): string | undefined {
  try {
    return (node as unknown as { label?: string }).label;
  } catch {
    return undefined;
  }
}

/**
 * The canvas category a node is painted with, normalised to the set `CanvasTheme` knows — the same
 * normalisation `componentKind.ts` applies, so a Layers glyph and a node card cannot disagree.
 */
const CANVAS_CATEGORIES = new Set(['component', 'visual', 'data', 'javascript']);

function safeCategory(node: LayerNode): string | undefined {
  try {
    const color = (node as unknown as { type?: { color?: string } }).type?.color;
    return color && CANVAS_CATEGORIES.has(color) ? color : undefined;
  } catch {
    return undefined;
  }
}

/** `CanvasView` writes the current route to a window global on every navigation. */
function readCurrentRoute(): string | undefined {
  const route = (window as unknown as { noodlEditorPreviewRoute?: string }).noodlEditorPreviewRoute;
  return typeof route === 'string' ? route : undefined;
}

function safeVisualRootIds(component: { graph?: { getVisualRootIds?: () => string[] } }): string[] {
  try {
    return component.graph?.getVisualRootIds?.() ?? [];
  } catch {
    return [];
  }
}
