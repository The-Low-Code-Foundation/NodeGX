/**
 * FB-002 / FB-013 — one filter pill, drawn once, with its selected state on something you can see.
 *
 * ## 🔴 CHR-012 (2026-09-15) — the pill IS the launcher's `Chip`, and this is the adapter
 *
 * Richard looked at the Community tab beside Templates and Learning and ruled it *"still looks like
 * shit"*. One reason was a second chip: a small boxed `.FilterPill` beside CHR-005's
 * `Chip variant=Filter`. Two pills for one job is the look phase 92 exists to remove, so the three
 * community surfaces (Bench, People, Chat) now draw `Chip`, and this component only adapts their
 * pill model to it.
 *
 * ## What FB-002 bought survives, because `Chip`'s filter variant was built from the same rule
 *
 * The shared `.FilterPill` once carried its selected state by **fill alone**, measured live at
 * **1.36:1** against its panel — every label legible and which pill was on invisible.
 *
 * - 🔴 **The selected state is on the EDGE** (`primary`), with the wash and the label tone moving
 *   with it; the fill is no longer load-bearing. `fb-002/filter-pill-state` grades that edge
 *   against BOTH its sides, on the grounds the pill now sits on, reading the token names out of
 *   `Chip.module.scss` rather than restating them.
 * - 🔴 **The edge width does not change between states**, so selecting a filter does not reflow the
 *   row and the list does not appear to jump.
 * - ⚠️ **The ✓ is `aria-hidden`.** Colour may not be the only carrier of a state (WCAG 1.4.1), so
 *   the pill says it in text too — but the button carries `aria-pressed`, and a ✓ in the accessible
 *   name would announce *"Solved 3 ✓, pressed"*.
 *
 * @module noodl-core-ui/components/community/CommunityFilterPill
 */

import React from 'react';

import { Chip, ChipVariant } from '@noodl-core-ui/components/common/Chip';

/**
 * The shape every filter pill on every community surface arrives as.
 *
 * ⚠️ Structural on purpose: the Bench, People and Chat each declare their own pill type
 * (`CommunityFilterPill` in `CommunityDirectoryView`, `CommunityChatFilterPill` in
 * `CommunityChatView`) and all three are this shape. This component takes the shape rather than
 * any one of those names, so it does not make three view models depend on each other.
 */
export type FilterPillModel = {
  key: string;
  label: string;
  count: number;
  active: boolean;
};

export interface FilterPillProps {
  filter: FilterPillModel;
  onSelect: (key: string) => void;
  /**
   * ⚠️ Optional because the people directory never had one. Bench and Chat name their pills for
   * the drives that click them, and a drive that cannot address a pill cannot verify a filter.
   */
  dataTest?: string;
}

export function FilterPill({ filter, onSelect, dataTest }: FilterPillProps) {
  return (
    <Chip
      variant={ChipVariant.Filter}
      label={filter.label}
      count={filter.count}
      isSelected={filter.active}
      testId={dataTest}
      onClick={() => onSelect(filter.key)}
    />
  );
}
