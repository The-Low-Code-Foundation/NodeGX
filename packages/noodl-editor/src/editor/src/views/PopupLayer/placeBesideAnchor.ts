import type { PopoutPosition } from '../popuplayer';

/**
 * The side a popout flips to when the one it asked for does not fit.
 *
 * It doubles as the arrow-class map: a popout placed *below* its anchor wears
 * the `top` arrow, and so on — which is the same table read the other way.
 */
export const OPPOSITE_POSITION: Record<PopoutPosition, PopoutPosition> = {
  bottom: 'top',
  top: 'bottom',
  left: 'right',
  right: 'left'
};

/**
 * P101 INS-003 — where a `showPopup` popup sits beside its anchor.
 *
 * The side it asked for, **flipped to the opposite side when that one hangs off the window and the
 * other is genuinely better**, then clamped into the window. `_positionPopout` has flipped popouts
 * this way for a long time; `showPopup` only clamped. From a panel on the LEFT that never mattered —
 * a `right` popup always had the canvas to open into. From the inspector on the RIGHT it did: the
 * Page Router's *Add new page* (`Pages.tsx`, `position: 'right'`) was clamped back into the window
 * **on top of its own button**, covering the Pages section, arrow pointing into the column (drive,
 * 2026-09-23, `phase-101-the-inspector/shots/06-add-page-popup-BEFORE.png`).
 *
 * Pure, and in its own module rather than in `popuplayer.ts`, so jest grades the arithmetic without
 * loading Electron, the file system and the modals that file imports.
 */
export function placeBesideAnchor(args: {
  position: PopoutPosition;
  anchor: { left: number; top: number; width: number; height: number };
  width: number;
  height: number;
  arrowSize: number;
  viewport: { width: number; height: number };
  margin: number;
}): { position: PopoutPosition; x: number; y: number } {
  const { anchor, width, height, arrowSize, viewport, margin } = args;

  const originFor = (side: PopoutPosition) => {
    switch (side) {
      case 'bottom':
        return { x: anchor.left + anchor.width / 2 - width / 2, y: anchor.top + anchor.height + arrowSize };
      case 'top':
        return { x: anchor.left + anchor.width / 2 - width / 2, y: anchor.top - height - arrowSize };
      case 'left':
        return { x: anchor.left - width - arrowSize, y: anchor.top + anchor.height / 2 - height / 2 };
      case 'right':
        return { x: anchor.left + anchor.width + arrowSize, y: anchor.top + anchor.height / 2 - height / 2 };
      default:
        return { x: 0, y: 0 };
    }
  };

  /** How far off the window a side puts the popup, along the one axis flipping can improve. */
  const overflowFor = (side: PopoutPosition, o: { x: number; y: number }) => {
    switch (side) {
      case 'bottom':
        return Math.max(0, o.y + height - (viewport.height - margin));
      case 'top':
        return Math.max(0, margin - o.y);
      case 'right':
        return Math.max(0, o.x + width - (viewport.width - margin));
      case 'left':
        return Math.max(0, margin - o.x);
      default:
        return 0;
    }
  };

  let position = args.position;
  let origin = originFor(position);
  const overflow = overflowFor(position, origin);
  if (overflow > 0 && OPPOSITE_POSITION[position]) {
    const flipped = OPPOSITE_POSITION[position];
    const flippedOrigin = originFor(flipped);
    if (overflowFor(flipped, flippedOrigin) < overflow) {
      position = flipped;
      origin = flippedOrigin;
    }
  }

  let { x, y } = origin;
  if (x + width > viewport.width - margin) x = viewport.width - margin - width;
  if (y + height > viewport.height - margin) y = viewport.height - margin - height;
  if (x < margin) x = margin;
  if (y < margin) y = margin;

  return { position, x, y };
}
