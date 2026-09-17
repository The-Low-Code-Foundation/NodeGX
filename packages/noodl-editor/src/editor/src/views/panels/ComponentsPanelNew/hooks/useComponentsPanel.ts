import { NodeGraphContextTmp } from '@noodl-contexts/NodeGraphContext/NodeGraphContext';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ComponentModel } from '@noodl-models/componentmodel';
import { NodeLibrary } from '@noodl-models/nodelibrary';
import { RouterAdapter } from '@noodl-models/NodeTypeAdapters/RouterAdapter';
import { ProjectModel } from '@noodl-models/projectmodel';
import { WarningsModel } from '@noodl-models/warningsmodel';

import { EventDispatcher } from '../../../../../../shared/utils/EventDispatcher';
import { buildKindIndex, ComponentKind, ComponentKindIndex } from '../componentKind';
import { CLOUD_PATH_PREFIX, pageGroups, SECTION_LABEL, SECTION_ORDER, sectionFor, SectionId } from '../componentSections';
import { buildUsageIndex, RouterPages, RowMeta, rowMetaFor, UsageIndex } from '../componentUsage';
import { CLOUD_SHEET, Sheet, TreeNode } from '../types';

/**
 * useComponentsPanel
 *
 * Main state management hook for ComponentsPanel.
 * Subscribes to ProjectModel and builds tree structure.
 *
 * Uses the PROVEN direct subscription pattern from UseRoutes.ts
 * instead of the abstracted useEventListener hook.
 */

// Events to subscribe to on ProjectModel.instance
const PROJECT_EVENTS = ['componentAdded', 'componentRemoved', 'componentRenamed', 'rootNodeChanged'];

/**
 * TVW-001 — the graph edits that change a row's meta: an instance placed or deleted (`×N`), a
 * component's first node or last one (`empty`), a Router's `pages` or a Page's `urlPath` edited
 * (the route, `not in a router`). Global, because they are raised by every graph in the project,
 * not by `ProjectModel` itself.
 */
const GRAPH_EVENTS = ['Model.nodeAdded', 'Model.nodeRemoved', 'Model.parametersChanged'];
const META_PARAMETER_OWNERS = new Set(['Router', 'Page']);

/**
 * TVW-001 (d) — the node-library changes after which a component's kind can change.
 *
 * 🔴 `ComponentModel.allowAsChild` reads each root's *cached* `node.type`. On project open the
 * panel's first walk runs before the library has resolved those types, so every visual component
 * read `allowAsChild === false` — kind `component`, which slice 2 files under `Logic` (driven
 * s7: 22 of 23 visual components in `Logic` on `Landing page test V2`; PNL-006's glyphs had been
 * wrong the same way, unseen). Each graph re-resolves its types in `scheduleUpdateTypes` — a
 * `setTimeout(1)` booked on these same events — so the rebuild waits past it.
 */
const LIBRARY_EVENTS = ['libraryUpdated', 'moduleRegistered', 'moduleUnregistered', 'typeAdded', 'typeRemoved'];
const AFTER_GRAPH_TYPE_UPDATE_MS = 20;

interface UseComponentsPanelOptions {
  hideSheets?: string[];
  /** Lock to a specific sheet - cannot switch (e.g., for Cloud Functions panel) */
  lockToSheet?: string;
}

interface FolderStructure {
  name: string;
  path: string;
  components: ComponentModel[];
  children: FolderStructure[];
}

export function useComponentsPanel(options: UseComponentsPanelOptions = {}) {
  const { hideSheets = [], lockToSheet } = options;

  // Local state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  /**
   * TVW-001 (a) — the highlighted row is the component the canvas shows, however it got there
   * (canvas double-click, trail, tabs, ⌘[, X-Ray, Problems, Search, the bench). The panel no longer
   * keeps its own idea of what is selected: a click here switches the canvas, and the highlight
   * arrives back through the same event as every other door.
   */
  const [activeComponentName, setActiveComponentName] = useState<string | undefined>(
    () => NodeGraphContextTmp.nodeGraph?.activeComponent?.name
  );
  const [updateCounter, setUpdateCounter] = useState(0);
  /**
   * PNL-006: warnings change far more often than the project's shape does, and
   * on a different model. Counted separately so a warning appearing repaints the
   * dots without rebuilding the kind index.
   */
  const [warningCounter, setWarningCounter] = useState(0);
  const [currentSheetName, setCurrentSheetName] = useState<string | null>(lockToSheet || null);

  // Subscribe to ProjectModel events using DIRECT pattern (proven in UseRoutes.ts)
  // This bypasses the problematic useEventListener abstraction
  useEffect(() => {
    if (!ProjectModel.instance) {
      return;
    }

    // Create a group object for cleanup (same pattern as UseRoutes.ts)
    const group = { id: 'useComponentsPanel' };

    // Handler that triggers re-render
    const handleUpdate = () => {
      setUpdateCounter((c) => c + 1);
    };

    // Subscribe to all events (Model.on supports arrays)
    ProjectModel.instance.on(PROJECT_EVENTS, handleUpdate, group);

    // Cleanup: unsubscribe when unmounting
    return () => {
      if (ProjectModel.instance) {
        ProjectModel.instance.off(group);
      }
    };
  }, []); // Empty deps: ProjectModel.instance is a singleton that never changes, so subscribe once and cleanup on unmount

  /**
   * PNL-006 — the warning dot's data source.
   *
   * `WarningsModel` batches its `warningsChanged` notification through a
   * `setTimeout(1)`, so this fires once per burst rather than per warning.
   */
  useEffect(() => {
    const group = { id: 'useComponentsPanel.warnings' };
    WarningsModel.instance.on('warningsChanged', () => setWarningCounter((c) => c + 1), group);
    return () => {
      // `Model.off` returns the model; the cleanup must return void.
      WarningsModel.instance.off(group);
    };
  }, []);

  useEffect(() => {
    const group = { id: 'useComponentsPanel.activeComponent' };
    EventDispatcher.instance.on(
      'activeComponentChanged',
      ({ component }: { component?: ComponentModel }) => setActiveComponentName(component?.name),
      group
    );
    // The canvas may have switched between the first render and this subscription.
    setActiveComponentName(NodeGraphContextTmp.nodeGraph?.activeComponent?.name);
    return () => {
      EventDispatcher.instance.off(group);
    };
  }, []);

  useEffect(() => {
    const group = { id: 'useComponentsPanel.library' };
    let timer: ReturnType<typeof setTimeout> | undefined;
    NodeLibrary.instance.on(
      LIBRARY_EVENTS,
      () => {
        clearTimeout(timer);
        timer = setTimeout(() => setUpdateCounter((c) => c + 1), AFTER_GRAPH_TYPE_UPDATE_MS);
      },
      group
    );
    return () => {
      clearTimeout(timer);
      NodeLibrary.instance.off(group);
    };
  }, []);

  useEffect(() => {
    const group = { id: 'useComponentsPanel.graph' };
    EventDispatcher.instance.on(
      GRAPH_EVENTS,
      (e: { model?: { typename?: string } }, event?: string) => {
        if (event === 'Model.parametersChanged' && !META_PARAMETER_OWNERS.has(e?.model?.typename)) return;
        setUpdateCounter((c) => c + 1);
      },
      group
    );
    return () => {
      EventDispatcher.instance.off(group);
    };
  }, []);

  // Get all components (including placeholders) for sheet detection
  // IMPORTANT: Spread to create new array reference - getComponents() may return
  // the same mutated array, which would cause useMemo to skip recalculation
  const rawComponents = useMemo(() => {
    if (!ProjectModel.instance) return [];
    return [...ProjectModel.instance.getComponents()];
  }, [updateCounter]);

  // Get non-placeholder components for counting and tree display
  const allComponents = useMemo(() => {
    return rawComponents.filter((comp) => !comp.name.endsWith('/.placeholder'));
  }, [rawComponents]);

  // Detect all sheets from component paths (including placeholders for empty sheet detection)
  // Sheets are top-level folders starting with # (e.g., #Pages, #Components)
  // Note: Component names start with leading "/" (e.g., "/#Pages/Home")
  const sheets = useMemo((): Sheet[] => {
    const sheetSet = new Set<string>(); // All detected sheet folder names
    const sheetCounts = new Map<string, number>(); // folderName -> non-placeholder component count

    // First pass: detect all sheets (including from placeholders)
    rawComponents.forEach((comp) => {
      const parts = comp.name.split('/').filter((p) => p !== ''); // Remove empty strings from leading /
      if (parts.length > 0 && parts[0].startsWith('#')) {
        const sheetFolder = parts[0];
        sheetSet.add(sheetFolder);
      }
    });

    // Second pass: count non-placeholder components per sheet
    allComponents.forEach((comp) => {
      const parts = comp.name.split('/').filter((p) => p !== '');
      if (parts.length > 0 && parts[0].startsWith('#')) {
        const sheetFolder = parts[0];
        sheetCounts.set(sheetFolder, (sheetCounts.get(sheetFolder) || 0) + 1);
      }
    });

    // Count default sheet components (not in any # folder)
    const defaultCount = allComponents.filter((comp) => {
      const parts = comp.name.split('/').filter((p) => p !== '');
      return parts.length === 0 || !parts[0].startsWith('#');
    }).length;

    // Build sheet list with Default first
    const result: Sheet[] = [
      {
        name: 'Default',
        folderName: '',
        isDefault: true,
        componentCount: defaultCount
      }
    ];

    // Add detected sheets, filtering out hidden ones
    sheetSet.forEach((folderName) => {
      const displayName = folderName.substring(1); // Remove # prefix
      if (!hideSheets.includes(displayName) && !hideSheets.includes(folderName)) {
        result.push({
          name: folderName === CLOUD_SHEET.folderName ? CLOUD_SHEET.displayName : displayName,
          folderName,
          isDefault: false,
          componentCount: sheetCounts.get(folderName) || 0,
          isCloud: folderName === CLOUD_SHEET.folderName
        });
      }
    });

    /**
     * WFA-001: the cloud sheet is listed whether or not it exists yet.
     *
     * Sheets are derived from component names, so a project with no cloud
     * functions has no `#__cloud__` sheet — and "Add Sheet" refuses `#` in a
     * name, so there would be no way to author the first one. Synthesising the
     * entry (count 0) is what makes the door reachable; the tree itself is
     * untouched until something is actually created.
     */
    if (!hideSheets.includes(CLOUD_SHEET.folderName) && !hideSheets.includes('__cloud__')) {
      if (!result.some((s) => s.folderName === CLOUD_SHEET.folderName)) {
        result.push({
          name: CLOUD_SHEET.displayName,
          folderName: CLOUD_SHEET.folderName,
          isDefault: false,
          componentCount: 0,
          isCloud: true
        });
      }
    }

    // Sort non-default sheets alphabetically
    result.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [rawComponents, allComponents, hideSheets, updateCounter]);

  // Get current sheet object
  const currentSheet = useMemo((): Sheet | null => {
    if (currentSheetName === null) {
      // No sheet selected = show all (no filtering)
      return null;
    }
    return sheets.find((s) => s.folderName === currentSheetName || (s.isDefault && currentSheetName === '')) || null;
  }, [currentSheetName, sheets]);

  // Select a sheet
  const selectSheet = useCallback(
    (sheet: Sheet | null) => {
      // Don't allow switching if locked
      if (lockToSheet !== undefined) return;
      setCurrentSheetName(sheet ? sheet.folderName : null);
    },
    [lockToSheet]
  );

  /**
   * PNL-006: one walk of every graph, memoised against the same change counter
   * the tree is. Cheaper than what it replaced — see `componentKind.ts`.
   */
  const kindIndex = useMemo(() => buildKindIndex(ProjectModel.instance), [updateCounter]);

  /** TVW-001 (b) — instances, node counts and routers, from a fresh walk on the same counter. */
  const usage = useMemo(() => {
    const routers: RouterPages[] = [];
    const index: UsageIndex = ProjectModel.instance
      ? buildUsageIndex(ProjectModel.instance.getComponents(), routers)
      : new Map();
    return { index, routers };
  }, [updateCounter]);

  // Build tree structure with optional sheet filtering
  const treeData = useMemo(() => {
    if (!ProjectModel.instance) return [];
    // TVW-001 (d): the unfiltered view is sections by role. A selected sheet keeps the folder tree
    // until slice 4 retires sheets from the UI.
    if (currentSheet === null) {
      return buildSectionedTree(ProjectModel.instance, hideSheets, kindIndex, usage.index, usage.routers, warningCounter);
    }
    return buildTreeFromProject(ProjectModel.instance, hideSheets, currentSheet, kindIndex, usage.index, warningCounter);
  }, [updateCounter, hideSheets, currentSheet, kindIndex, usage, warningCounter]);

  // Toggle folder expand/collapse
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  // Handle item click
  const handleItemClick = useCallback(
    (node: TreeNode) => {
      if (node.type === 'section') return;
      if (node.type === 'component') {
        // Open component - trigger the NodeGraphEditor to switch to this component
        const component = node.data.component;
        if (component) {
          EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', {
            component,
            pushHistory: true
          });
        }
      } else {
        // It's a folder. TVW-001 (a): a plain folder is not something the canvas can show, so
        // clicking one highlights nothing — it only opens or closes.

        // BUG-6 FIX: If it's a component-folder, open the component too
        // Component-folders are folders that also have an associated component
        // (e.g., App with App/Header as a child)
        if (node.data.isComponentFolder && node.data.component) {
          EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', {
            component: node.data.component,
            pushHistory: true
          });
        }

        // Toggle folder expand/collapse
        toggleFolder(node.data.path);
      }
    },
    [toggleFolder]
  );

  return {
    treeData,
    expandedFolders,
    activeComponentName,
    toggleFolder,
    handleItemClick,
    // Sheet system
    sheets,
    currentSheet,
    selectSheet
  };
}

/**
 * Build tree structure from ProjectModel
 *
 * @param project - The project model
 * @param hideSheets - Sheet names to hide (filter out)
 * @param currentSheet - If provided, filter to only show components in this sheet
 * @param kindIndex - PNL-006 kind/category per component name
 * @param warningGeneration - PNL-006; unused as a value, present so the tree is
 *   rebuilt when warnings change (the counts are read live below)
 */
function buildTreeFromProject(
  project: ProjectModel,
  hideSheets: string[],
  currentSheet: Sheet | null,
  kindIndex: ComponentKindIndex,
  usageIndex: UsageIndex,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warningGeneration: number
): TreeNode[] {
  const rootFolder: FolderStructure = {
    name: '',
    path: '/',
    components: [],
    children: []
  };

  // Get all components
  const components = project.getComponents();

  // First pass: Build folder structure from ALL components (including placeholders)
  // This ensures empty folders created via placeholders are visible
  components.forEach((comp) => {
    // Filter by hideSheets
    const sheet = getSheetForComponent(comp.name);
    if (hideSheets.includes(sheet)) {
      return;
    }

    /**
     * WFA-001: cloud components are never drawn in the flattened "All" tree.
     *
     * "All" strips the sheet prefix from every display path (below), so
     * `/#__cloud__/saveOrder` would be drawn at `/saveOrder`, sharing a folder
     * namespace with browser components and inheriting the browser create menu.
     * Two different runtimes must not be merged into one namespace — select the
     * Cloud Functions sheet to see them.
     */
    if (currentSheet === null && comp.name.startsWith(CLOUD_SHEET.pathPrefix)) {
      return;
    }

    // Apply current sheet filtering
    if (currentSheet !== null) {
      const parts = comp.name.split('/').filter((p) => p !== '');
      const firstPart = parts.length > 0 ? parts[0] : '';
      const isInSheetFolder = firstPart.startsWith('#');

      if (currentSheet.isDefault) {
        if (isInSheetFolder) return;
      } else {
        if (firstPart !== currentSheet.folderName) return;
      }
    }

    // Determine display path (strip sheet prefix if needed)
    let displayPath = comp.name;
    if (currentSheet === null) {
      const parts = comp.name.split('/').filter((p) => p !== '');
      if (parts.length > 0 && parts[0].startsWith('#')) {
        displayPath = '/' + parts.slice(1).join('/');
      }
    } else if (!currentSheet.isDefault) {
      const sheetPrefix = '/' + currentSheet.folderName + '/';
      if (comp.name.startsWith(sheetPrefix)) {
        displayPath = '/' + comp.name.substring(sheetPrefix.length);
      }
    }

    if (displayPath && displayPath !== '/') {
      // For placeholders: create folder structure but don't add to components array
      const isPlaceholder = comp.name.endsWith('/.placeholder');
      addComponentToFolderStructure(rootFolder, comp, displayPath, isPlaceholder);
    }
  });

  // Convert folder structure to tree nodes
  return convertFolderToTreeNodes(rootFolder, kindIndex, usageIndex);
}

/**
 * Add a component to the folder structure
 * @param displayPath - Optional override path for tree building (used when stripping sheet prefix)
 * @param skipAddComponent - If true, only create folder structure but don't add component (for placeholders)
 */
function addComponentToFolderStructure(
  rootFolder: FolderStructure,
  component: ComponentModel,
  displayPath?: string,
  skipAddComponent?: boolean
) {
  // Use displayPath for tree structure, but keep original component reference
  const pathForTree = displayPath || component.name;
  const parts = pathForTree.split('/');
  let currentFolder = rootFolder;

  // Navigate/create folder structure (all parts except the last one)
  for (let i = 0; i < parts.length - 1; i++) {
    const folderName = parts[i];
    let folder = currentFolder.children.find((c) => c.name === folderName);

    if (!folder) {
      folder = {
        name: folderName,
        path: parts.slice(0, i + 1).join('/'),
        components: [],
        children: []
      };
      currentFolder.children.push(folder);
    }

    currentFolder = folder;
  }

  // Add component to final folder (unless it's a placeholder - we only want the folder structure)
  if (!skipAddComponent) {
    currentFolder.components.push(component);
  }
}

/**
 * Convert folder structure to tree nodes
 */
function convertFolderToTreeNodes(
  folder: FolderStructure,
  kindIndex: ComponentKindIndex,
  usageIndex: UsageIndex
): TreeNode[] {
  const nodes: TreeNode[] = [];

  // Build a set of folder paths for quick lookup
  const folderPaths = new Set(folder.children.map((child) => child.path));

  // Sort folder children alphabetically
  const sortedChildren = [...folder.children].sort((a, b) => a.name.localeCompare(b.name));

  // Add folder children first
  sortedChildren.forEach((childFolder) => {
    // Skip root folder (empty name) from rendering as a folder item
    // The root should be transparent - just show its contents directly
    if (childFolder.name === '') {
      nodes.push(...convertFolderToTreeNodes(childFolder, kindIndex, usageIndex));
      return;
    }

    // Check if there's a component with the same path as this folder
    // This happens when a component has nested children (e.g., /test1 with /test1/child)
    const matchingComponent = folder.components.find((comp) => comp.name === childFolder.path);

    // A folder is only a "component-folder" if there's an actual component with the same path.
    // Having children (components inside) does NOT make it a component-folder - that's just a regular folder.
    const isComponentFolder = matchingComponent !== undefined;
    const info = matchingComponent ? kindIndex.get(matchingComponent.name) : undefined;
    const kind = info?.kind;

    const folderNode: TreeNode = {
      type: 'folder',
      data: {
        name: childFolder.name,
        path: childFolder.path,
        isOpen: false,
        isComponentFolder,
        component: matchingComponent, // Attach the component if it exists
        children: convertFolderToTreeNodes(childFolder, kindIndex, usageIndex),
        // Component type flags (only meaningful when isComponentFolder && matchingComponent exists)
        isRoot: kind === 'home',
        isPage: kind === 'page',
        isCloudFunction: kind === 'cloudfunction',
        isVisual: kind === 'visual' || kind === 'page' || kind === 'popup' || kind === 'home',
        kind,
        category: info?.category,
        warningCount: matchingComponent ? warningCountFor(matchingComponent) : 0,
        meta: matchingComponent ? metaFor(matchingComponent, kind ?? 'component', usageIndex) : null
      }
    };
    nodes.push(folderNode);
  });

  // Sort components alphabetically
  const sortedComponents = [...folder.components].sort((a, b) => a.localName.localeCompare(b.localName));

  // Add components (but skip any that are also folder paths)
  sortedComponents.forEach((comp) => {
    // Skip components that match folder paths - they're already rendered as folders
    if (folderPaths.has(comp.name)) {
      return;
    }

    nodes.push(componentNodeFor(comp, kindIndex, usageIndex));
  });

  return nodes;
}

function componentNodeFor(
  comp: ComponentModel,
  kindIndex: ComponentKindIndex,
  usageIndex: UsageIndex,
  isStartPage?: boolean
): TreeNode {
  const info = kindIndex.get(comp.name);
  const kind = info?.kind ?? 'component';
  const warningCount = warningCountFor(comp);

  return {
    type: 'component',
    data: {
      id: comp.id,
      name: comp.name,
      localName: comp.localName,
      component: comp,
      isRoot: kind === 'home',
      isPage: kind === 'page',
      isCloudFunction: kind === 'cloudfunction',
      // "Can this be placed in, or made, a visual tree" — the question the
      // context menu's "Make Home" actually asks.
      isVisual: kind === 'visual' || kind === 'page' || kind === 'popup' || kind === 'home',
      kind,
      category: info?.category ?? 'default',
      hasWarnings: warningCount > 0,
      warningCount,
      meta: metaFor(comp, kind, usageIndex),
      isStartPage,
      path: comp.name
    }
  };
}

const CLOUD_EMPTY_TEXT = 'None yet. Cloud functions run on your backend, not in the browser.';

/**
 * TVW-001 (d) — the unfiltered tree: sections by role, the user's folders inside each.
 *
 * - `Pages` is flat, in Router order (`pageGroups`); a folder would break the order the Router
 *   gives. With two Routers — or one Router and pages none lists — each group is headed.
 * - `Components` and `Logic` are the folder tree of their own members. A folder whose components
 *   split across sections draws in each section it has members in; its placeholder (an empty folder
 *   made from the `+` menu) draws in `Components`.
 * - `Cloud functions` keeps full `/#__cloud__/…` paths on its rows, so rename, drag and create act
 *   on the real name with no sheet prefix, and its create menus author cloud components. It is
 *   drawn even when empty (WFA-001: otherwise nothing says the runtime exists).
 * - Sheet folders (`#Name`) are stripped from display as the unfiltered view always did; slice 4
 *   turns them into ordinary folders.
 *
 * A section with no rows is not drawn, except `Cloud functions`.
 */
function buildSectionedTree(
  project: ProjectModel,
  hideSheets: string[],
  kindIndex: ComponentKindIndex,
  usageIndex: UsageIndex,
  routers: RouterPages[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warningGeneration: number
): TreeNode[] {
  const roots: Record<Exclude<SectionId, 'pages'>, FolderStructure> = {
    components: { name: '', path: '/', components: [], children: [] },
    logic: { name: '', path: '/', components: [], children: [] },
    cloud: { name: '', path: '/', components: [], children: [] }
  };
  const counts: Record<SectionId, number> = { pages: 0, components: 0, logic: 0, cloud: 0 };
  const pages: ComponentModel[] = [];

  for (const comp of project.getComponents()) {
    if (hideSheets.includes(getSheetForComponent(comp.name))) continue;

    const isCloud = comp.name.startsWith(CLOUD_PATH_PREFIX);
    const isPlaceholder = comp.name.endsWith('/.placeholder');
    if (isPlaceholder) {
      addComponentToFolderStructure(isCloud ? roots.cloud : roots.components, comp, isCloud ? comp.name : displayPathFor(comp.name), true);
      continue;
    }

    const section = sectionFor(comp.name, kindIndex.get(comp.name)?.kind ?? 'component', usageIndex.get(comp.name));
    counts[section]++;
    if (section === 'pages') {
      pages.push(comp);
    } else if (section === 'cloud') {
      addComponentToFolderStructure(roots.cloud, comp, comp.name);
    } else {
      const displayPath = displayPathFor(comp.name);
      if (displayPath !== '/') addComponentToFolderStructure(roots[section], comp, displayPath);
    }
  }

  const byName = new Map(pages.map((p) => [p.name, p]));
  const groups = pageGroups(
    pages.map((p) => p.name),
    routers
  );
  const headed = groups.length > 1;
  const pageChildren: TreeNode[] = [];
  for (const group of groups) {
    const rows = group.pages.map((row) => componentNodeFor(byName.get(row.name), kindIndex, usageIndex, row.isStart));
    if (!headed) {
      pageChildren.push(...rows);
      continue;
    }
    pageChildren.push({
      type: 'section',
      data: {
        id: `pages:${group.router ?? ''}`,
        section: 'pages',
        variant: 'router',
        label: group.router ?? 'Not in a router',
        count: rows.length,
        runtimeType: 'browser',
        children: rows
      }
    });
  }

  // The cloud tree is built on full names; its rows are what is inside the `#__cloud__` folder.
  const cloudTree = convertFolderToTreeNodes(roots.cloud, kindIndex, usageIndex);
  const cloudFolder = cloudTree.find((n) => n.type === 'folder' && n.data.path === CLOUD_PATH_PREFIX.slice(0, -1));
  const cloudChildren = cloudFolder?.type === 'folder' ? cloudFolder.data.children : [];

  const children: Record<SectionId, TreeNode[]> = {
    pages: pageChildren,
    components: convertFolderToTreeNodes(roots.components, kindIndex, usageIndex),
    logic: convertFolderToTreeNodes(roots.logic, kindIndex, usageIndex),
    cloud: cloudChildren
  };

  const tree: TreeNode[] = [];
  for (const id of SECTION_ORDER) {
    if (id === 'cloud' && (hideSheets.includes(CLOUD_SHEET.folderName) || hideSheets.includes('__cloud__'))) continue;
    if (children[id].length === 0 && id !== 'cloud') continue;
    tree.push({
      type: 'section',
      data: {
        id,
        section: id,
        variant: 'section',
        label: SECTION_LABEL[id],
        count: counts[id],
        runtimeType: id === 'cloud' ? 'cloud' : 'browser',
        emptyText: children[id].length === 0 ? CLOUD_EMPTY_TEXT : undefined,
        children: children[id]
      }
    });
  }
  return tree;
}

/** The unfiltered view's display path: a top-level `#Sheet` folder is not drawn (slice 4 changes this). */
function displayPathFor(name: string): string {
  const parts = name.split('/').filter((p) => p !== '');
  if (parts.length > 0 && parts[0].startsWith('#')) return '/' + parts.slice(1).join('/');
  return name;
}

/** TVW-001 (b) — the row's right-hand meta; the route is asked of the Router adapter only for a routed page. */
function metaFor(component: ComponentModel, kind: ComponentKind, usageIndex: UsageIndex): RowMeta | null {
  const usage = usageIndex.get(component.name);
  const route = usage?.routedBy.length ? RouterAdapter.getPageInfoForComponents([component.name])[0]?.path : undefined;
  return rowMetaFor(kind, usage, route);
}

/**
 * PNL-006 — errors and warnings on a component, from `WarningsModel`.
 *
 * **Do not add `excludeGlobal` back.** It was here on the reasoning that a per-row
 * dot should mean "something is wrong *in here*" rather than repeating what the
 * top bar already counts — but that is not what the flag does. `showGlobally`
 * means "also list this project-wide"; it does not mean "not attached to a
 * component". Every health warning sets it — `node-missing-type`,
 * `node-not-child`, `con-no-source-port`, 18 of the 33 `setWarning` call sites —
 * and all of them are raised *against a component*. Excluding them left the count
 * at zero for precisely the warnings worth pointing at, so the dot could
 * essentially never render.
 *
 * Measured 2026-07-28 against `nodegx-qa-fixture`, whose two `Markdown` nodes are
 * unresolved: the top bar read **2** and the tree rendered **0** dots. PNL-006's
 * assertion D had never proven otherwise — it had been skipping for want of a
 * project that carries a warning, which is the whole reason that fixture exists.
 *
 * NOTE (documented in PNL-006-NOTES): this is a different source from the
 * Problems panel, which renders `ProjectValidationService`'s semantic
 * diagnostics. That is why the dot does not route there.
 */
function warningCountFor(component: ComponentModel): number {
  try {
    return WarningsModel.instance.getNumberOfWarningsForComponent(component, {
      levels: ['error', 'warning']
    });
  } catch {
    return 0;
  }
}

/**
 * Extract sheet name from component name
 * Note: Component names start with leading "/" (e.g., "/#Pages/Home")
 */
function getSheetForComponent(componentName: string): string {
  const parts = componentName.split('/').filter((p) => p !== '');
  if (parts.length > 0 && parts[0].startsWith('#')) {
    return parts[0].substring(1); // Return sheet name without # prefix
  }
  return 'default';
}

/* PNL-006: `checkIsPage`, `checkIsCloudFunction` and `checkIsVisual` are gone.
   Two of the three could never return anything but a constant —
   `checkIsCloudFunction` matched a node type name (`'Cloud Function'`) that does
   not exist in the codebase, so it was always false, and `checkIsVisual` was its
   negation, so it was always true. `componentKind.ts` replaces all three with
   one walk and derivations that can actually be wrong. */
