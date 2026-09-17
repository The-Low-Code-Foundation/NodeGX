/**
 * PNL-006 — the tree's in-place name filter.
 *
 * Deliberately *not* a second Search panel. The Search panel searches parameter
 * values, CSS and node contents; this filters the tree you are already looking
 * at, by name, and nothing else. Two things follow from that:
 *
 *   - it never leaves the tree. No result list, no separate surface — the rows
 *     you keep are the same rows in the same places.
 *   - an empty result says *"no components match"*, never the tree's own
 *     "no components in project" placeholder. Those are different facts and the
 *     panel must not conflate them.
 *
 * Expansion state is NOT mutated while filtering. The hook returns an
 * *effective* expanded set, and the panel uses it instead of the user's own set
 * for as long as the query is non-empty. Clearing the field therefore restores
 * the previous expansion exactly, because it was never touched.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/hooks/useComponentFilter
 */

import { useMemo } from 'react';

import { TreeNode } from '../types';

export interface ComponentFilterResult {
  /** The tree to render — the full tree when the query is empty. */
  nodes: TreeNode[];
  /**
   * Folders to render expanded. While filtering this is every folder on a path
   * to a match; otherwise it is the caller's own set, untouched.
   */
  expandedFolders: Set<string>;
  /**
   * Rows that matched the query themselves. Rows in {@link nodes} that are not
   * in here are ancestors kept for context, and are rendered dimmed.
   * Empty when not filtering.
   */
  matched: Set<string>;
  /** True when a query is active — the panel's placeholder depends on it. */
  isFiltering: boolean;
  /** Number of rows that matched, for the "no results" state. */
  matchCount: number;
}

/** A tree node's stable identity — the same key the tree selects and expands by. */
function idOf(node: TreeNode): string {
  if (node.type === 'section') return `section:${node.data.id}`;
  return node.type === 'component' ? node.data.name : node.data.path;
}

function nameOf(node: TreeNode): string {
  if (node.type === 'section') return '';
  return node.type === 'component' ? node.data.localName : node.data.name;
}

/** Component rows under these nodes, each name once (a page two Routers list draws twice). */
function countRows(nodes: TreeNode[], seen = new Set<string>()): number {
  for (const node of nodes) {
    if (node.type === 'component') seen.add(node.data.name);
    else {
      if (node.type === 'folder' && node.data.component) seen.add(node.data.component.name);
      countRows(node.data.children, seen);
    }
  }
  return seen.size;
}

export function useComponentFilter(
  treeData: TreeNode[],
  query: string,
  expandedFolders: Set<string>
): ComponentFilterResult {
  return useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return {
        nodes: treeData,
        expandedFolders,
        matched: new Set<string>(),
        isFiltering: false,
        matchCount: 0
      };
    }

    const matched = new Set<string>();
    const expanded = new Set<string>();
    let matchCount = 0;

    /**
     * Returns the filtered copy of `node`, or `null` if neither it nor anything
     * below it matched.
     *
     * A folder whose own name matches keeps its whole subtree — typing a folder
     * name to see what is in it is the reason you would type a folder name. Its
     * descendants are not themselves matches, but they are not dimmed either:
     * dimming is reserved for rows kept purely as ancestry.
     */
    function walk(node: TreeNode, keepWholeSubtree: boolean): TreeNode | null {
      /* TVW-001 (d): a section is never a match (typing "logic" filters names, not roles) and never
         dims. It survives when something under it does, headed as before. */
      if (node.type === 'section') {
        const children = node.data.children.map((child) => walk(child, false)).filter(Boolean);
        if (children.length === 0) return null;
        // The count says what is under the heading now, not before the filter.
        return { type: 'section', data: { ...node.data, children, count: countRows(children), emptyText: undefined } };
      }

      const self = nameOf(node).toLowerCase().includes(needle);
      const id = idOf(node);

      if (node.type === 'component') {
        if (!self && !keepWholeSubtree) return null;
        if (self) {
          matched.add(id);
          matchCount++;
        }
        return node;
      }

      const keepAll = keepWholeSubtree || self;
      const children: TreeNode[] = [];
      for (const child of node.data.children) {
        const kept = walk(child, keepAll);
        if (kept) children.push(kept);
      }

      if (!self && !keepWholeSubtree && children.length === 0) return null;

      if (self) {
        matched.add(id);
        matchCount++;
      }
      // Every folder that survives is on a path to something worth seeing, so
      // it is open. This is the whole reason the effective set exists.
      expanded.add(id);

      return { type: 'folder', data: { ...node.data, children } };
    }

    const nodes: TreeNode[] = [];
    for (const node of treeData) {
      const kept = walk(node, false);
      if (kept) nodes.push(kept);
    }

    return { nodes, expandedFolders: expanded, matched, isFiltering: true, matchCount };
  }, [treeData, query, expandedFolders]);
}
