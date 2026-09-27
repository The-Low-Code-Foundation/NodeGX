import { parseHref } from '@noodl-hooks/useParsedHref';
import classNames from 'classnames';
import React, { FocusEventHandler, MouseEventHandler } from 'react';
import { platform } from '@noodl/platform';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import { UnsafeStyleProps } from '@noodl-core-ui/types/global';

import { ActivityIndicator, ActivityIndicatorColor } from '../../common/ActivityIndicator';
import css from './PrimaryButton.module.scss';

export enum PrimaryButtonVariant {
  Cta = 'cta',
  Muted = 'muted',
  MutedOnLowBg = 'muted-on-low-bg',
  Ghost = 'ghost',
  Danger = 'danger',
  /** CHR-005 — a label with no fill and no edge until hovered ("Open project…"). The launcher's third button. */
  Text = 'text'
}

export enum PrimaryButtonSize {
  Default = 'default',
  Small = 'small'
}

export interface PrimaryButtonProps extends UnsafeStyleProps {
  label: string;
  variant?: PrimaryButtonVariant;
  size?: PrimaryButtonSize;
  href?: string;
  icon?: IconName;
  /**
   * CHR-005 — an inline SVG drawn before the label, for a surface that must render without webpack
   * (`Icon` reads `require.context`). Ignored when `icon` is set.
   */
  glyph?: React.ReactNode;

  isDisabled?: boolean;
  isLoading?: boolean;
  isFitContent?: boolean;
  isGrowing?: boolean;

  hasLeftSpacing?: boolean;
  hasRightSpacing?: boolean;
  hasBottomSpacing?: boolean;
  hasTopSpacing?: boolean;
  hasXSpacing?: boolean;

  onClick?: MouseEventHandler<HTMLButtonElement>;
  onMouseEnter?: MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onBlur?: FocusEventHandler<HTMLButtonElement>;

  testId?: string;
}

export function PrimaryButton({
  label,
  variant = PrimaryButtonVariant.Cta,
  size = PrimaryButtonSize.Default,
  href,
  icon,
  glyph,

  isDisabled,
  isLoading,
  isFitContent,
  isGrowing,

  hasLeftSpacing,
  hasRightSpacing,
  hasBottomSpacing,
  hasTopSpacing,
  hasXSpacing,

  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,

  testId,

  UNSAFE_className,
  UNSAFE_style
}: PrimaryButtonProps) {
  // 🔴 HOOK-FREE since CHR-005. The launcher's Templates body renders this under
  // `tests-unit/support/renderElements`, which calls components with no React dispatcher; a
  // `useMemo` here made every spec of that body throw instead of grade. Both values are cheap.
  const activityColor =
    variant === PrimaryButtonVariant.Muted ? ActivityIndicatorColor.Light : ActivityIndicatorColor.Dark;

  const parsedHref = parseHref(href);

  return (
    <button
      className={classNames([
        css['Root'],
        (hasXSpacing || hasLeftSpacing) && css['has-left-spacing'],
        (hasXSpacing || hasRightSpacing) && css['has-right-spacing'],
        hasBottomSpacing && css['has-bottom-spacing'],
        hasTopSpacing && css['has-top-spacing'],
        isFitContent && css['is-fit-content'],
        isGrowing && css['is-growing'],
        css[`is-variant-${variant}`],
        css[`is-size-${size}`],
        UNSAFE_className
      ])}
      onClick={(e) => {
        if (isLoading) return;
        if (parsedHref) platform.openExternal(parsedHref);
        if (onClick) onClick(e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={isDisabled}
      data-test={testId}
      style={UNSAFE_style}
    >
      <span className={classNames([css['Label'], isLoading && css['is-loading']])}>
        {icon && (
          <Icon
            icon={icon}
            size={size === PrimaryButtonSize.Small ? IconSize.Small : undefined}
            UNSAFE_className={css['Icon']}
          />
        )}
        {!icon && glyph && <span className={css['Glyph']}>{glyph}</span>}
        {label}
      </span>
      {/*
        FLD-017 — mount the dots only while they mean something.

        `.Spinner` hides itself with `opacity: 0`, and an `opacity: 0` element
        still animates: only `display: none` and being out of the tree stop a
        CSS animation. So every PrimaryButton on screen was running three
        `bouncedelay 1.4s infinite` dots forever. Measured in the packaged
        build with a project open: `document.getAnimations()` returned three,
        all of them the Deploy button's, with nothing loading.

        The wrapper keeps its opacity transition, so the fade IN is unchanged —
        the child is in the tree from the first frame of it. What is given up is
        a 200ms fade OUT at the end of a load, which is the cheapest thing here.
      */}
      <div className={classNames([css['Spinner'], isLoading && css['is-loading']])}>
        {isLoading && <ActivityIndicator color={activityColor} />}
      </div>
    </button>
  );
}
