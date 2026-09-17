/**
 * ComponentTree
 *
 * Recursively renders the component/folder tree structure.
 */

import React from 'react';

import { TreeNode } from '../types';
import { ComponentItem } from './ComponentItem';
import { FolderItem } from './FolderItem';
import { SectionHeader } from './SectionHeader';

interface ComponentTreeProps {
  nodes: TreeNode[];
  level?: number;
  onItemClick: (node: TreeNode) => void;
  onCaretClick: (folderId: string) => void;
  expandedFolders: Set<string>;
  /** TVW-001 (a): the component the canvas shows — the only thing a row highlights for. */
  activeComponentName?: string;
  onMakeHome?: (node: TreeNode) => void;
  onDelete?: (node: TreeNode) => void;
  onDuplicate?: (node: TreeNode) => void;
  onRename?: (node: TreeNode) => void;
  onOpen?: (node: TreeNode) => void;
  onDragStart?: (node: TreeNode, element: HTMLElement) => void;
  onDrop?: (node: TreeNode) => void;
  canAcceptDrop?: (node: TreeNode) => boolean;
  onAddComponent?: (template: TSFixme, parentPath?: string) => void;
  onAddFolder?: (parentPath?: string) => void;
  // Rename mode props
  renamingItem?: TreeNode | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameConfirm?: () => void;
  onRenameCancel?: () => void;
  onDoubleClick?: (node: TreeNode) => void;
  /**
   * PNL-006 — rows that matched the filter themselves. Anything rendered while
   * this is non-null and *not* in it is ancestry kept for context, and is
   * dimmed. Null (the default) means no filter is active and nothing dims.
   */
  matched?: Set<string> | null;
  /**
   * WFA-001 — which runtime the create menus author for. TVW-001 (e): it comes from the section a
   * row sits under, not from a selected sheet; `'cloud'` only inside `Cloud functions`.
   */
  runtimeType?: 'browser' | 'cloud';
}

export function ComponentTree({
  nodes,
  level = 0,
  onItemClick,
  onCaretClick,
  expandedFolders,
  activeComponentName,
  onMakeHome,
  onDelete,
  onDuplicate,
  onRename,
  onOpen,
  onDragStart,
  onDrop,
  canAcceptDrop,
  onAddComponent,
  onAddFolder,
  renamingItem,
  renameValue,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onDoubleClick,
  matched = null,
  runtimeType = 'browser',
}: ComponentTreeProps) {
  return (
    <>
      {nodes.map((node) => {
        /* TVW-001 (d): a section is a heading over rows at the same depth — it adds no indent, and
           the rows under it author for the section's runtime (the cloud section's create menus make
           cloud components). */
        if (node.type === 'section') {
          return (
            <React.Fragment key={`section:${node.data.id}`}>
              <SectionHeader section={node.data} />
              {node.data.children.length > 0 && (
                <ComponentTree
                  nodes={node.data.children}
                  level={level}
                  onItemClick={onItemClick}
                  onCaretClick={onCaretClick}
                  expandedFolders={expandedFolders}
                  activeComponentName={activeComponentName}
                  onMakeHome={onMakeHome}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onRename={onRename}
                  onOpen={onOpen}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  canAcceptDrop={canAcceptDrop}
                  onAddComponent={onAddComponent}
                  onAddFolder={onAddFolder}
                  renamingItem={renamingItem}
                  renameValue={renameValue}
                  onRenameChange={onRenameChange}
                  onRenameConfirm={onRenameConfirm}
                  onRenameCancel={onRenameCancel}
                  onDoubleClick={onDoubleClick}
                  matched={matched}
                  runtimeType={node.data.runtimeType}
                />
              )}
            </React.Fragment>
          );
        }

        const id = node.type === 'component' ? node.data.name : node.data.path;
        const isDimmed = matched !== null && !matched.has(id);

        // Check if this item is being renamed
        const isRenaming =
          renamingItem &&
          ((node.type === 'component' && renamingItem.type === 'component' && node.data.id === renamingItem.data.id) ||
            (node.type === 'folder' && renamingItem.type === 'folder' && node.data.path === renamingItem.data.path));

        if (node.type === 'folder') {
          return (
            <FolderItem
              key={node.data.path}
              folder={node.data}
              level={level}
              isExpanded={expandedFolders.has(node.data.path)}
              isSelected={!!node.data.component && node.data.component.name === activeComponentName}
              onCaretClick={() => onCaretClick(node.data.path)}
              onClick={() => onItemClick(node)}
              onDelete={onDelete}
              onRename={onRename}
              onDragStart={onDragStart}
              onDrop={onDrop}
              canAcceptDrop={canAcceptDrop}
              onDoubleClick={onDoubleClick}
              onAddComponent={onAddComponent}
              onAddFolder={onAddFolder}
              isRenaming={isRenaming}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
              onOpen={onOpen}
              onMakeHome={onMakeHome}
              onDuplicate={onDuplicate}
              isDimmed={isDimmed}
              runtimeType={runtimeType}
            >
              {expandedFolders.has(node.data.path) && node.data.children.length > 0 && (
                <ComponentTree
                  nodes={node.data.children}
                  level={level + 1}
                  onItemClick={onItemClick}
                  onCaretClick={onCaretClick}
                  expandedFolders={expandedFolders}
                  activeComponentName={activeComponentName}
                  onMakeHome={onMakeHome}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onRename={onRename}
                  onOpen={onOpen}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  canAcceptDrop={canAcceptDrop}
                  onAddComponent={onAddComponent}
                  onAddFolder={onAddFolder}
                  renamingItem={renamingItem}
                  renameValue={renameValue}
                  onRenameChange={onRenameChange}
                  onRenameConfirm={onRenameConfirm}
                  onRenameCancel={onRenameCancel}
                  onDoubleClick={onDoubleClick}
                  matched={matched}
                  runtimeType={runtimeType}
                />
              )}
            </FolderItem>
          );
        } else {
          return (
            <ComponentItem
              key={node.data.id}
              component={node.data}
              level={level}
              isSelected={node.data.name === activeComponentName}
              onClick={() => onItemClick(node)}
              onMakeHome={onMakeHome}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onRename={onRename}
              onOpen={onOpen}
              onDragStart={onDragStart}
              onDrop={onDrop}
              canAcceptDrop={canAcceptDrop}
              onDoubleClick={onDoubleClick}
              onAddComponent={onAddComponent}
              onAddFolder={onAddFolder}
              isRenaming={isRenaming}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
              isDimmed={isDimmed}
              runtimeType={runtimeType}
            />
          );
        }
      })}
    </>
  );
}
