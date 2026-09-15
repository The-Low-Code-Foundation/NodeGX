import classNames from 'classnames';
import React from 'react';

import { Slot } from '@noodl-core-ui/types/global';

import css from './Chip.module.scss';

export enum ChipVariant {
  Neutral = 'neutral',
  Accent = 'accent',
  Warning = 'warning',
  Danger = 'danger',
  Success = 'success',
  /**
   * CHR-005 — a pill that narrows a list (Templates' categories, Learning's shelf filters). The
   * only interactive variant: it renders a `<button aria-pressed>`, with its count in mono.
   */
  Filter = 'filter'
}

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  /** Optional leading icon (e.g. a warning triangle). */
  icon?: Slot;
  testId?: string;
  /** Filter only: how many rows choosing this leaves. */
  count?: number;
  /** Filter only. */
  isSelected?: boolean;
  /** Filter only. */
  onClick?: () => void;
}

/**
 * One canonical soft-bg / strong-fg chip. Replaces the ad-hoc badges scattered
 * across panels (mock reference uses: "Local only", "React 17 runtime").
 * Per phase law, `danger` is the only red variant.
 *
 * ⚠️ Hook-free: the launcher's Templates and Learning bodies are graded by
 * `tests-unit/support/renderElements`, which throws on a hook.
 */
export function Chip({ label, variant = ChipVariant.Neutral, icon, testId, count, isSelected, onClick }: ChipProps) {
  if (variant === ChipVariant.Filter) {
    return (
      <button
        type="button"
        className={classNames(css['Root'], css['is-variant-filter'], isSelected && css['is-selected'])}
        aria-pressed={Boolean(isSelected)}
        onClick={onClick}
        data-test={testId}
      >
        {label}
        {count !== undefined && <span className={css['Count']}>{count}</span>}
        {/* FB-002: the selected pill says so in TEXT as well as in fill, edge and colour — a
            selected state carried by fill alone shipped once at 1.16:1. */}
        {isSelected && <span className={css['Check']}>✓</span>}
      </button>
    );
  }

  return (
    <span className={classNames(css['Root'], css[`is-variant-${variant}`])} data-test={testId}>
      {icon && <span className={css['Icon']}>{icon}</span>}
      {label}
    </span>
  );
}
