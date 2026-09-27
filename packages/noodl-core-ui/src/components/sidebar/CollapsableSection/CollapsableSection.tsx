import classNames from 'classnames';
import React, { ReactNode, useState } from 'react';

import { IconName } from '@noodl-core-ui/components/common/Icon';
import { IconButton, IconButtonState, IconButtonVariant } from '@noodl-core-ui/components/inputs/IconButton';
import { Collapsible } from '@noodl-core-ui/components/layout/Collapsible';
import { SectionVariant } from '@noodl-core-ui/components/sidebar/Section';
import { UnsafeStyleProps } from '@noodl-core-ui/types/global';

import css from './CollapsableSection.module.scss';

export interface CollapsableSectionProps extends UnsafeStyleProps {
  variant?: SectionVariant;
  title?: string;
  /**
   * The state the section STARTS in, read once. Uncontrolled: the section owns its open state
   * from then on and a later change to this prop does nothing. Every caller before P103 CMG-005
   * uses it this way and keeps doing so.
   */
  isClosed?: boolean;
  /**
   * P103 CMG-005 — the controlled form. When this is a boolean the section draws exactly this
   * state and asks `onCollapsedChange` to change it; something outside the section (the Styles
   * panel's `revealStyle`) can then open it. `undefined` leaves the section uncontrolled.
   */
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Rendered as `data-section-id`, so a route can find the section in the DOM. */
  sectionId?: string;

  hasGutter?: boolean;
  hasBottomSpacing?: boolean;
  hasVisibleOverflow?: boolean;
  hasTopDivider?: boolean;

  actions?: ReactNode;
  children?: ReactNode;
}

export function CollapsableSection({
  variant = SectionVariant.Default,
  title,
  isClosed,
  isCollapsed: controlledCollapsed,
  onCollapsedChange,
  sectionId,

  hasGutter,
  hasBottomSpacing,
  hasVisibleOverflow,
  hasTopDivider,

  actions,
  children,

  UNSAFE_className,
  UNSAFE_style
}: CollapsableSectionProps) {
  const [ownCollapsed, setOwnCollapsed] = useState<boolean>(!!isClosed);
  const isControlled = typeof controlledCollapsed === 'boolean';
  const isCollapsed = isControlled ? controlledCollapsed : ownCollapsed;

  function toggle() {
    const next = !isCollapsed;
    if (!isControlled) setOwnCollapsed(next);
    onCollapsedChange?.(next);
  }

  return (
    <section
      className={classNames([
        css['Root'],
        css[`is-variant-${variant}`],
        hasVisibleOverflow && css['has-visible-overflow'],
        hasTopDivider && css['has-top-divider'],
        UNSAFE_className
      ])}
      style={UNSAFE_style}
      data-section-id={sectionId}
      data-section-open={isCollapsed ? 'false' : 'true'}
    >
      {(Boolean(title) || Boolean(actions)) && (
        <div
          onClick={toggle}
          className={classNames([css['Header'], css[`is-variant-${variant}`], css['is-collapsable']])}
        >
          {/* PNL-005: a plain span for the same reason as `PanelHeader.Title` —
              `Label` is `display: block; white-space: pre`, so a long section
              title could not ellipsise and pushed the caret out of the panel. */}
          <div className={css['Title']} title={title}>
            {title}
          </div>
          {/* A header action (the ＋ of CMG-002, the reset of CMG-004) must not also toggle the
              section: the click stops at the actions slot. */}
          {Boolean(actions) && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
          <IconButton
            icon={IconName.CaretUp}
            variant={IconButtonVariant.Transparent}
            state={isCollapsed ? IconButtonState.Rotated : null}
          />
        </div>
      )}

      <Collapsible isCollapsed={isCollapsed}>
        <div
          className={classNames([
            css['Body'],
            css[`is-variant-${variant}`],
            hasGutter && css['has-gutter'],
            hasBottomSpacing && css['has-bottom-spacing'],
            hasVisibleOverflow && css['has-visible-overflow']
          ])}
        >
          {Boolean(children) && children}
        </div>
      </Collapsible>
    </section>
  );
}
