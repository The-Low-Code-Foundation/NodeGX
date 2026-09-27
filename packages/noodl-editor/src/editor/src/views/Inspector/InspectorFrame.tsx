import React from 'react';

import { FrameDivider, FrameDividerOwner } from '@noodl-core-ui/components/layout/FrameDivider';

import { Inspector } from './Inspector';
import { useInspectorLayout } from './useInspectorLayout';

/**
 * P101 INS-001 — the document on the left, the inspector on the right.
 *
 * `splitOwner={Second}` makes the size the inspector's, measured from the right edge, so widening
 * the window widens the canvas and leaves the inspector alone.
 *
 * 🔴 **Do not read `FrameDividerRects` from this divider** (`onDrag`, `onDragStart`, `onDragEnd`,
 * `onResize`). For a `Second` owner, `getFrameDividerRects()` hands `first` the right-hand cell and
 * `second` the left — positionally backwards. The CSS variables that actually lay the panes out
 * are correct, which is why the panes look right; a callback trusting the rects would not be.
 * Horizontal `Second` had only ever run in Storybook before this, and Storybook does not start in
 * this repo. Only `onSizeChanged` is used here, and it carries a number, not a rect.
 */
export function InspectorFrame({ children }: { children: React.ReactElement }) {
  const layout = useInspectorLayout();

  return (
    <FrameDivider
      horizontal
      splitOwner={FrameDividerOwner.Second}
      size={layout.dividerSize}
      sizeMin={layout.dividerSizeMin}
      onSizeChanged={layout.onDividerSizeChanged}
      first={children}
      second={<Inspector isCollapsed={layout.isCollapsed} onCollapsedChange={layout.setCollapsed} />}
    />
  );
}
