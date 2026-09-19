import React from 'react';

import type { HoverCardAnchor } from '../../nodegrapheditor/canvas/instanceHover';
import css from './InstanceHoverCard.module.scss';

/**
 * The height the anchor is computed against — see `hoverCardAnchor`.
 *
 * Applied inline rather than set in the stylesheet so there is exactly one number: a height in
 * the CSS and a constant in the placement maths is the same drift `titlebarLabelHeight()` and the
 * painter were caught in at s20, where the card was measured for one wrap and painted with
 * another.
 */
export const INSTANCE_HOVER_CARD_HEIGHT = 30;

export interface InstanceHoverCardProps {
  /** `Sections/Hero` — the component's path, folder included. */
  path: string;
  /** `· 3×`, or null when the index has nothing to say. */
  count: string | null;
  anchor: HoverCardAnchor;
  onEdit: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/**
 * TVW-007 AC2b — what an instance node says about itself, and the door into it.
 *
 * R-Z left the card carrying a count and no name, so this surface is the only place the
 * component's identity appears. It is one line: the path, the count in the component hue, and
 * `Edit ›`.
 *
 * **The button is a real `<button>`**, not a painted rectangle. Three things follow that would
 * not otherwise: it can be reached with the keyboard once focus is on it, a screen reader has
 * something to announce, and AC2b can be graded the way it asks to be — `elementFromPoint` on
 * the rendered pixel rather than a handler that fired.
 *
 * The pointer handlers are the other half of the close condition (`nextHoverState`): the card
 * keeps itself open while the pointer is on it, which is what makes the door pressable at all.
 */
export function InstanceHoverCard({ path, count, anchor, onEdit, onPointerEnter, onPointerLeave }: InstanceHoverCardProps) {
  const translate = `translate(${anchor.alignX === 'right' ? '-100%' : '0'}, ${
    anchor.alignY === 'above' ? '-100%' : '0'
  })`;

  return (
    <div
      className={css.Card}
      data-test="instance-hover-card"
      data-align-x={anchor.alignX}
      data-align-y={anchor.alignY}
      style={{ left: anchor.x, top: anchor.y, transform: translate, height: INSTANCE_HOVER_CARD_HEIGHT }}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <span className={css.Path} data-test="instance-hover-path" title={path}>
        {path}
      </span>
      {count && (
        <span className={css.Count} data-test="instance-hover-count">
          {count}
        </span>
      )}
      <button className={css.Edit} data-test="instance-hover-edit" onClick={onEdit}>
        Edit
        <span className={css.Chevron} aria-hidden="true">
          ›
        </span>
      </button>
    </div>
  );
}
