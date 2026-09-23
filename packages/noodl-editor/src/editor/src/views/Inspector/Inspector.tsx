import { nextTick } from 'process';
import React, { useEffect, useState } from 'react';

import { SidebarModel } from '@noodl-models/sidebar';
import { SidebarModelEvent } from '@noodl-models/sidebar/sidebarmodel';

import { ErrorBoundary } from '@noodl-core-ui/components/common/ErrorBoundary';
import { IconName } from '@noodl-core-ui/components/common/Icon';
import { IconButton, IconButtonVariant } from '@noodl-core-ui/components/inputs/IconButton';
import { PanelModeSlotProvider } from '@noodl-core-ui/components/sidebar/PanelHeader';

import css from './Inspector.module.scss';

export interface InspectorProps {
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

/** The inspector's current contents, read from the model rather than kept in parallel. */
function readInspector(): { id: string | undefined; element: React.ReactElement | null } {
  const id = SidebarModel.instance.InspectorId;
  const factory = SidebarModel.instance.getInspector();
  return { id, element: factory ? factory() : null };
}

/**
 * P101 INS-001 — the column on the right that shows the selected node's panel.
 *
 * Richard, drive A (2026-09-23): *"put the props panel as a new menu on the right side, because
 * it's kind of a separate thing that takes over from everything else, but it could actually be
 * used in conjunction with stuff on the left panels."* The left rail's panels are about the
 * project; this one is about the thing you are pointing at. It is always here — empty says so —
 * and collapsing it is the person's choice.
 *
 * It draws whatever `SidebarModel` put in the inspector slot: Properties for most nodes, and any
 * node type's own panel (`PortEditor`, …) for the rest. It never names `PropertyEditor` itself.
 *
 * `data-panel-id` is kept on the wrapper because the property editor finds its own inputs through
 * it (`propertyeditor.ts:206`).
 */
export function Inspector({ isCollapsed, onCollapsedChange }: InspectorProps) {
  const [{ id, element }, setContents] = useState(readInspector);

  useEffect(() => {
    const group = {};

    SidebarModel.instance.on(SidebarModelEvent.inspectorChanged, () => setContents(readInspector()), group);

    // Hot reload rebuilds every panel's factory; the inspector's is one of them.
    SidebarModel.instance.on(SidebarModelEvent.HotReload, () => nextTick(() => setContents(readInspector())), group);

    return () => {
      SidebarModel.instance.off(group);
    };
  }, []);

  if (isCollapsed) {
    return (
      <div
        className={css['Strip']}
        data-test="inspector-strip"
        onClick={() => onCollapsedChange(false)}
        title="Show properties"
      >
        <IconButton
          variant={IconButtonVariant.Transparent}
          icon={IconName.CaretLeft}
          testId="inspector-expand"
          onClick={() => onCollapsedChange(false)}
        />
        <span className={css['StripLabel']}>Properties</span>
      </div>
    );
  }

  const collapseButton = (
    <IconButton
      variant={IconButtonVariant.Transparent}
      icon={IconName.CaretRight}
      testId="inspector-collapse"
      onClick={() => onCollapsedChange(true)}
    />
  );

  /*
   * A node panel draws its own header (`BasePanel` for Properties, `PanelHeader` for Ports), so
   * the inspector draws none over it — the first drive showed "Properties" twice, stacked. The
   * collapse control goes into the panel's own header through the same mode slot the left panel
   * uses for its dock/float buttons. The inspector's own header exists only for the empty state.
   */
  if (id && element) {
    return (
      <div className={css['Root']} data-test="inspector">
        <div key={id} data-panel-id={id} className={css['PanelItem']}>
          <PanelModeSlotProvider slot={collapseButton}>
            <ErrorBoundary showTryAgain onTryAgain={() => setContents(readInspector())}>
              {element}
            </ErrorBoundary>
          </PanelModeSlotProvider>
        </div>
      </div>
    );
  }

  return (
    <div className={css['Root']} data-test="inspector">
      <div className={css['Header']}>
        <span className={css['Title']}>Properties</span>
        {collapseButton}
      </div>
      <div className={css['Empty']} data-test="inspector-empty">
        <span className={css['EmptyTitle']}>No node selected</span>
        <span>Select a node on the canvas, in the preview or in Layers to see its properties here.</span>
      </div>
    </div>
  );
}
