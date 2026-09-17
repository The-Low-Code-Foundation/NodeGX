/**
 * ComponentsPanel
 *
 * Modern React component for displaying and managing project components.
 * Migrated from legacy jQuery/underscore.js View implementation.
 *
 * @module noodl-editor
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import { SearchInput } from '@noodl-core-ui/components/inputs/SearchInput';
import { MenuDialogWidth } from '@noodl-core-ui/components/popups/MenuDialog';
import { BasePanel } from '@noodl-core-ui/components/sidebar/BasePanel';

import { showContextMenuInPopup } from '../../ShowContextMenuInPopup';
import { ComponentTree } from './components/ComponentTree';
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
      title="Components"
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
    </BasePanel>
  );
}
