import { useCallback, useEffect, useState } from 'react';

import { SidebarModel } from '@noodl-models/sidebar';
import { SidebarModelEvent } from '@noodl-models/sidebar/sidebarmodel';
import { EditorSettings } from '@noodl-utils/editorsettings';

/**
 * P101 INS-001 — the inspector column's width and collapsed state.
 *
 * Kept in `EditorSettings`, not per project: how wide someone likes their properties is a fact
 * about the person, and the left panel's per-project widths (PNL-003) are about what each
 * *project's* panels hold.
 */

/** The width the inspector opens at the first time — the left panel's default, so the two match. */
export const DEFAULT_INSPECTOR_WIDTH = 328;

/** Narrower than this and a property row's label and value no longer fit side by side. */
export const MIN_INSPECTOR_WIDTH = 260;

/** The strip a collapsed inspector leaves: room for the expand control and the word, nothing else. */
export const COLLAPSED_INSPECTOR_WIDTH = 32;

const WIDTH_KEY = 'inspector.width';
const COLLAPSED_KEY = 'inspector.collapsed';

function readWidth(): number {
  const stored = EditorSettings.instance.get(WIDTH_KEY);
  return typeof stored === 'number' && stored >= MIN_INSPECTOR_WIDTH ? stored : DEFAULT_INSPECTOR_WIDTH;
}

export interface InspectorLayout {
  /** The size the divider is given: the stored width, or the strip when collapsed. */
  dividerSize: number;
  dividerSizeMin: number;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onDividerSizeChanged: (size: number) => void;
}

export function useInspectorLayout(): InspectorLayout {
  const [width, setWidth] = useState<number>(readWidth);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => EditorSettings.instance.get(COLLAPSED_KEY) === true);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
    EditorSettings.instance.set(COLLAPSED_KEY, collapsed);
  }, []);

  /**
   * Selecting a node opens a collapsed inspector.
   *
   * Richard, drive A: *"when you click on a node the props come up or the panel pops out and props
   * come up."* A collapsed inspector that stayed shut on select would make the selection look dead
   * — which is the complaint this phase exists for. Deselecting never collapses it again: the
   * person closed it once, and opening it for them is as far as this goes.
   */
  useEffect(() => {
    const group = {};
    SidebarModel.instance.on(
      SidebarModelEvent.inspectorChanged,
      (panelId: string | undefined) => {
        if (panelId) setCollapsed(false);
      },
      group
    );
    return () => {
      SidebarModel.instance.off(group);
    };
  }, [setCollapsed]);

  /**
   * The divider reports every size it settles on — including the strip's, while collapsed. Only
   * an open inspector's size is the person's chosen width; storing the strip would reopen it at 32px.
   */
  const onDividerSizeChanged = useCallback(
    (size: number) => {
      if (isCollapsed || size < MIN_INSPECTOR_WIDTH) return;
      setWidth(size);
      EditorSettings.instance.set(WIDTH_KEY, size);
    },
    [isCollapsed]
  );

  return {
    dividerSize: isCollapsed ? COLLAPSED_INSPECTOR_WIDTH : width,
    dividerSizeMin: isCollapsed ? COLLAPSED_INSPECTOR_WIDTH : MIN_INSPECTOR_WIDTH,
    isCollapsed,
    setCollapsed,
    onDividerSizeChanged
  };
}
