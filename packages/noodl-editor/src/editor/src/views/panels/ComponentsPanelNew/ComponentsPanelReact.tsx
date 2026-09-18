/**
 * ComponentsPanel
 *
 * Modern React component for displaying and managing project components.
 * Migrated from legacy jQuery/underscore.js View implementation.
 *
 * @module noodl-editor
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import { SearchInput } from '@noodl-core-ui/components/inputs/SearchInput';
import { MenuDialogWidth } from '@noodl-core-ui/components/popups/MenuDialog';
import { BasePanel } from '@noodl-core-ui/components/sidebar/BasePanel';

import { ProjectModel } from '@noodl-models/projectmodel';
import { selectionStore } from '@noodl-models/selection/selectionStore';

import { EventDispatcher } from '../../../../../shared/utils/EventDispatcher';
import { benchTargetLabel } from '../../VisualCanvas/previewScope';
import { showContextMenuInPopup } from '../../ShowContextMenuInPopup';
import { ComponentTree } from './components/ComponentTree';
import { LayersTree } from './components/LayersTree';
import { useLayersTree } from './hooks/useLayersTree';
import { defaultTabFor, flipTab, instancesOf, PANEL_TITLE, TAB_LABEL, tabSubjectFor, type PanelTab } from './layersTab';
import { showUsedInPopover } from './showUsedInPopover';
import type { LayerRow } from './layersTree';
import css from './ComponentsPanel.module.scss';
import { buildCreateMenuItems, CreateContext, createMenuTitle } from './createMenu';
import { useComponentActions } from './hooks/useComponentActions';
import { useComponentFilter } from './hooks/useComponentFilter';
import { useComponentsPanel } from './hooks/useComponentsPanel';
import { isCloudNode, useDragDrop } from './hooks/useDragDrop';
import { useRenameMode } from './hooks/useRenameMode';

/**
 * ComponentsPanel displays the project's component tree with folders,
 * allowing users to navigate, create, rename, and organize components.
 */
export function ComponentsPanel() {
  const { treeData, expandedFolders, activeComponentName, toggleFolder, handleItemClick } = useComponentsPanel();

  const {
    handleMakeHome,
    handleDelete,
    handleDuplicate,
    performRename,
    handleOpen,
    handleDropOn,
    handleDropOnRoot,
    handleAddComponent,
    handleAddFolder
  } = useComponentActions();

  /**
   * TVW-001 (e): the guard is unconditional now. It used to be `currentSheet === null`, because on
   * a selected sheet every row's path had the sheet prefix stripped and the cloud boundary was
   * therefore invisible to it. There is one view left, and its paths are real names.
   */
  const { draggedItem, startDrag, canDrop } = useDragDrop({ guardCloudBoundary: true });

  const { renamingItem, renameValue, startRename, setRenameValue, cancelRename, validateName } = useRenameMode();

  /**
   * PNL-006 — the in-place name filter.
   *
   * The query is the only new state. The filter derives an *effective* expansion
   * set from it rather than writing to `expandedFolders`, so clearing the field
   * restores the previous expansion exactly — there is nothing to restore,
   * because nothing was overwritten.
   */
  const [filterQuery, setFilterQuery] = useState('');
  const filtered = useComponentFilter(treeData, filterQuery, expandedFolders);

  /**
   * TVW-004 — which of the two tabs is showing.
   *
   * `null` means *nobody has chosen*, and then §2's rule decides from what the canvas has open:
   * Layers for a page or a placed visual, Components otherwise. A person's choice is remembered
   * for the session (R-E) and from then on the canvas no longer moves the tab under them.
   */
  const [chosenTab, setChosenTab] = useState<PanelTab | null>(null);
  const tabSubject = useMemo(() => tabSubjectFor(treeData, activeComponentName), [treeData, activeComponentName]);
  const tab: PanelTab = chosenTab ?? defaultTabFor(tabSubject);
  const layers = useLayersTree();

  /**
   * 🔴 **THERE IS NO NOTE IN THIS PANEL, and that is a ruling** (Richard, 2026-09-18).
   *
   * §2 asked for one: TVW-002's sentence, under the header, when the canvas's component is not on
   * the screen Layers is showing. It was built, and the drive's screenshot showed **the identical
   * sentence and the same two doors twice, 188px apart** — once here and once on the strip at the
   * preview's edge. Asked why the panel needed its own copy, Richard answered that the strip *is*
   * the separator between canvas and preview and exists precisely so nobody wonders why they
   * cannot see the component they have selected.
   *
   * ⚠️ **And detaching does not create a case for one**: the detached window renders the strip
   * itself, with its doors (R-M, 2026-09-18). The sentence is therefore always on screen
   * somewhere, and a second copy in this panel is a duplicate in every layout there is.
   *
   * What the panel says instead is what only the panel can: the **crumb** — where on this screen
   * the thing you are editing sits, and how many other places it is placed.
   */

  /** The places the Components tab already counted — the crumb's `in N places` and its popover. */
  const layersPlaces = useMemo(
    () => instancesOf(treeData, layers.canvasComponent),
    [treeData, layers.canvasComponent]
  );

  /** ⌘⇧L, from the editor's keybinding registry — it opens this panel first, then flips. */
  useEffect(() => {
    const group = { id: 'ComponentsPanel.flipTab' };
    EventDispatcher.instance.on('componentsPanel.flipTab', () => setChosenTab((current) => flipTab(current ?? tab)), group);
    return () => {
      EventDispatcher.instance.off(group);
    };
  }, [tab]);

  /** A Layers row's `›`, double-click or `Enter`: open that component on the canvas. */
  const handleEditComponent = useCallback((componentName: string) => {
    const component = ProjectModel.instance?.getComponentWithName(componentName);
    if (!component) return;
    EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component, pushHistory: true });
  }, []);

  /**
   * A Layers row is a node **in a particular instance of a component**, which is what TVW-003's
   * path identity is for: the canvas highlights the definition's node, the preview outlines only
   * the one copy the whole path names.
   */
  const handleSelectRow = useCallback((row: LayerRow) => {
    const component = row.owner ? ProjectModel.instance?.getComponentWithName(row.owner) : undefined;
    selectionStore.select('layers', component ?? null, [row.path]);
  }, []);

  const handleHoverRow = useCallback((row: LayerRow | null) => {
    selectionStore.setHover('layers', row ? row.path : null);
  }, []);

  // Handle rename action from context menu
  const handleRename = useCallback(
    (node: TSFixme) => {
      startRename(node);
    },
    [startRename]
  );

  // Handle rename confirmation
  const handleRenameConfirm = useCallback(() => {
    if (!renamingItem || !renameValue) {
      return;
    }

    // Check if name actually changed
    if (renamingItem.type === 'section') return cancelRename();
    const currentName = renamingItem.type === 'component' ? renamingItem.data.localName : renamingItem.data.name;

    if (renameValue === currentName) {
      // Name unchanged, just exit rename mode
      cancelRename();
      return;
    }

    // Validate the NEW name
    const validation = validateName(renameValue);
    if (!validation.valid) {
      console.warn('Invalid component name:', validation.error);
      return; // Stay in rename mode so user can fix
    }

    // Perform the actual rename
    const success = performRename(renamingItem, renameValue);
    if (success) {
      cancelRename();
    }
  }, [renamingItem, renameValue, validateName, performRename, cancelRename]);

  // Direct drop handler - bypasses useDragDrop state system for immediate execution
  // This matches how handleDropOnRoot works (which is reliable)
  const handleDirectDrop = useCallback(
    (targetNode: TSFixme) => {
      if (draggedItem) {
        handleDropOn(draggedItem, targetNode);
      }
    },
    [draggedItem, handleDropOn]
  );

  // Handle mouse up on Tree background - this is the root drop fallback
  // If an item is a valid drop target, its handleMouseUp calls stopPropagation
  // So if we receive mouseUp here, it means no item claimed the drop
  const handleTreeMouseUp = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PopupLayer = require('@noodl-views/popuplayer').default;

    // If we're dragging and no specific item claimed the drop, it's a root drop
    if (draggedItem && PopupLayer.instance.isDragging()) {
      // TVW-001 (d): in the sectioned tree "root" is the browser root, so a cloud row dropped on
      // empty space would leave `#__cloud__` and stop being a function. Not a move this offers.
      if (isCloudNode(draggedItem)) {
        PopupLayer.instance.dragCompleted();
        return;
      }
      handleDropOnRoot(draggedItem);
    }
  }, [draggedItem, handleDropOnRoot]);

  /**
   * SPR-005 — the project root's create menu, built once for both doors onto it.
   *
   * Empty space is the root of the tree — a folder context, not a component one. Passing
   * `forParentType` makes the templates' own `parentTypes` declarations load-bearing instead of
   * inert. TVW-001 (e): `runtimeType` is `browser` and no longer varies, because the sheet that
   * used to make it `cloud` is gone. A cloud function is still creatable from here — `createMenu`
   * offers it with the cloud folder as its destination rather than this one.
   */
  const rootCreateContext: CreateContext = useMemo(() => ({ forParentType: 'folder', runtimeType: 'browser' }), []);

  /**
   * SPR-005 — the one create menu, opened from the header "+" or from a
   * right-click on empty space.
   *
   * `attachTo` is what separates the two: a menu opened from a button anchors to
   * the button (and can therefore be driven by a script), a right-click menu
   * anchors to the cursor. Both render the same items, so the visible door and
   * the hidden one cannot drift apart.
   */
  const openRootCreateMenu = useCallback(
    (attachTo?: HTMLElement) => {
      showContextMenuInPopup({
        title: createMenuTitle(rootCreateContext),
        items: buildCreateMenuItems(rootCreateContext, {
          onAddComponent: handleAddComponent,
          onAddFolder: handleAddFolder
        }),
        width: MenuDialogWidth.Default,
        attachTo
      });
    },
    [rootCreateContext, handleAddComponent, handleAddFolder]
  );

  // Handle right-click on empty space - Show create menu
  const handleTreeContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openRootCreateMenu();
    },
    [openRootCreateMenu]
  );

  /**
   * SPR-005 — the visible half of the same gesture.
   *
   * F83's finding was not that creating a cloud function was impossible, it was
   * that nothing on screen said it could be done. A "+" in the panel header is
   * the affordance every other tree in this editor has; it opens the menu that
   * already existed rather than adding a second way to create anything.
   */
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const handleHeaderCreateClick = useCallback(() => {
    openRootCreateMenu(createButtonRef.current ?? undefined);
  }, [openRootCreateMenu]);

  return (
    /* PNL-005: the panel's own 36px `bg-3` bar is gone — this is the shared
       `PanelHeader`. TVW-001 (e) took the sheet selector out of its action slot,
       leaving the create button as the only control there.
       `UNSAFE_content_style` drops `BasePanel`'s horizontal inset so the tree
       rows stay full-bleed (their hover and selection fills run to the panel
       edge); PNL-006 owns the tree itself and can take the inset back if it
       wants one. */
    <BasePanel
      title={PANEL_TITLE}
      isFill
      UNSAFE_content_style={{ paddingInline: 0, paddingTop: 0 }}
      headerSlot={
        <>
          {/* SPR-005: the create affordance, visible without a right-click. Its
              tooltip names the destination, so where a new component lands is
              legible before the menu is even open. */}
          <button
            ref={createButtonRef}
            type="button"
            className={css['HeaderAction']}
            onClick={handleHeaderCreateClick}
            aria-label={createMenuTitle(rootCreateContext)}
            title={createMenuTitle(rootCreateContext)}
            data-test="components-panel-create"
          >
            <Icon icon={IconName.Plus} size={IconSize.Tiny} />
          </button>
        </>
      }
    >
      {/* TVW-004 — two tabs, one panel. The rail entry and the panel are titled `Project`; the
          tab says which of the two views of it you are looking at. Not two rail entries: the
          hinge actions jump between the two trees, and a jump between tabs in one panel is a
          thing a person can see happen (proposal §4.1). */}
      <div className={css['TabBar']} data-test="panel-tabs">
        {(['layers', 'components'] as PanelTab[]).map((id) => (
          <button
            key={id}
            type="button"
            className={classNames(css['Tab'], { [css['TabActive']]: tab === id })}
            onClick={() => setChosenTab(id)}
            data-test={`panel-tab-${id}`}
            data-active={tab === id ? 'true' : 'false'}
          >
            {TAB_LABEL[id]}
          </button>
        ))}
      </div>

      {tab === 'layers' ? (
        <>
          {/* §2's header: which screen these rows are, and which surface it is the screen of. */}
          <div className={css['LayersHeader']} data-test="layers-header">
            <span className={css['LayersHeaderScreen']} data-test="layers-header-screen">
              Layers · {layers.screenLabel || 'no screen'}
            </span>
            <span className={css['LayersHeaderWhere']}>in the preview</span>
          </div>

          {/* §2's containment crumb — the "go to parent" the canvas does not have. Read back up the
              rows, so it names the copy on screen rather than one of the component's parents
              picked from a usage walk. */}
          {layers.crumb.length > 1 && (
            <div className={css['LayersCrumb']} data-test="layers-crumb">
              <span className={css['LayersCrumbPath']}>
                {layers.crumb.map((component, index) => (
                  <React.Fragment key={component}>
                    {index > 0 && <span className={css['LayersCrumbSep']}>›</span>}
                    <button
                      type="button"
                      className={css['LayersCrumbStep']}
                      onClick={() => handleEditComponent(component)}
                      data-test="layers-crumb-step"
                    >
                      {benchTargetLabel(component)}
                    </button>
                  </React.Fragment>
                ))}
              </span>
              {layersPlaces.length > 1 && (
                <button
                  type="button"
                  className={css['LayersCrumbPlaces']}
                  onClick={(e) => showUsedInPopover(layersPlaces as TSFixme, e.currentTarget)}
                  data-test="layers-crumb-places"
                >
                  in {layersPlaces.length} places ▾
                </button>
              )}
            </div>
          )}

          <div className={classNames(css['Tree'], css['LayersTree'])} data-test="layers-tree">
            <LayersTree
              view={layers}
              onEditComponent={handleEditComponent}
              onSelectRow={handleSelectRow}
              onHoverRow={handleHoverRow}
            />
          </div>

          {/* §2's footer. Its WORDING follows a measurement, not the spec's phrase: 268 of this
              machine's components hold a second visual root whose nodes are not logic and are
              still not on screen. See `offScreenFooter`. */}
          {layers.footer && (
            <div className={css['LayersFooter']} data-test="layers-footer">
              {layers.footer.text}
            </div>
          )}
        </>
      ) : (
        <>
      {/* PNL-006: the filter is pinned under the shared header — it does not
          scroll with the tree, and it is name-only. The Search panel searches
          parameter values and CSS; this does not duplicate it. */}
      <div className={css['FilterBar']}>
        <SearchInput
          placeholder="Filter components"
          value={filterQuery}
          onChange={setFilterQuery}
          UNSAFE_style={{ width: '100%' }}
        />
      </div>

      {/* Component tree - right-click for create menu, mouseUp on background triggers root drop */}
      <div
        className={css['Tree']}
        data-test="component-tree"
        onContextMenu={handleTreeContextMenu}
        onMouseUp={handleTreeMouseUp}
      >
        {filtered.nodes.length > 0 ? (
          <ComponentTree
            nodes={filtered.nodes}
            expandedFolders={filtered.expandedFolders}
            matched={filtered.isFiltering ? filtered.matched : null}
            activeComponentName={activeComponentName}
            onItemClick={handleItemClick}
            onCaretClick={toggleFolder}
            onMakeHome={handleMakeHome}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onRename={handleRename}
            onOpen={handleOpen}
            onDragStart={startDrag}
            onDrop={handleDirectDrop}
            canAcceptDrop={canDrop}
            onAddComponent={handleAddComponent}
            onAddFolder={handleAddFolder}
            renamingItem={renamingItem}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameConfirm={handleRenameConfirm}
            onRenameCancel={cancelRename}
            onDoubleClick={handleRename}
          />
        ) : filtered.isFiltering ? (
          /* An empty *result* is a different fact from an empty project, and
             saying the wrong one is how a filter convinces someone their work
             has vanished. */
          <div className={css['PlaceholderMessage']} data-test="component-tree-no-matches">
            <span>
              No components match <span className={css['PlaceholderQuery']}>“{filterQuery.trim()}”</span>
            </span>
            <span>Clear the filter to see the whole tree.</span>
          </div>
        ) : (
          /* TVW-001 (e): reached only by a project with nothing in it at all. The empty *cloud*
             section is no longer one of these — it is always drawn, with its own empty text under
             its heading (`CLOUD_EMPTY_TEXT`), because a heading that disappears when empty cannot
             tell anyone the runtime exists. */
          <div className={css['PlaceholderMessage']} data-test="component-tree-empty">
            <span>No components yet</span>
            <span>Use + in the panel header to create one.</span>
          </div>
        )}
      </div>
        </>
      )}
    </BasePanel>
  );
}
