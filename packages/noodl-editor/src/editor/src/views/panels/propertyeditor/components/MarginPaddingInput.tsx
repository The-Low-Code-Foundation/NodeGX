import classNames from 'classnames';
import React, { useRef, useState } from 'react';

import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';
import { scrubStepForUnit, useDragToScrub } from '@noodl-core-ui/components/property-panel/scrub';

// REL-014 — the parse, the display text and the side split all live in
// `marginPaddingEdit` rather than here, because this component calls hooks and
// no runner in this checkout can evaluate it. Re-exported so the existing
// importers of these names do not have to move.
import {
  MARGIN_PADDING_AXES,
  MARGIN_PADDING_UNITS,
  MarginPaddingAxis,
  MarginPaddingParam,
  MarginPaddingSide,
  MarginPaddingValue,
  axisComps,
  commitMarginPaddingEdit,
  commitMarginPaddingPairEdit,
  edgeNameOf,
  editTextOf,
  effectiveValueOf,
  isZeroValue,
  fieldTextOf,
  pairDisplayOf,
  scrubStartOf,
  sideOf,
  unitOf
} from './marginPaddingEdit';
import css from './MarginPaddingInput.module.scss';

export { sideOf };
export type { MarginPaddingParam, MarginPaddingSide, MarginPaddingValue };

type Values = Record<string, MarginPaddingParam | undefined>;
type WriteOpts = { drag?: boolean; oldValues?: Values };

export interface MarginPaddingInputProps {
  /**
   * comp ('margin-top', 'padding-left', ...) → explicit value or undefined.
   *
   * REL-014: a value may be a `var(--token)` string. `TextInputConfig` stamps four
   * of them onto every new Text Input, so this is the ordinary case rather than
   * the exotic one.
   */
  values: Values;
  defaults: Record<string, MarginPaddingParam>;
  /** CHR-009 AC4 — per group, whether the four per-edge fields are showing. */
  expanded: Record<MarginPaddingSide, boolean>;
  onToggleExpanded: (side: MarginPaddingSide) => void;

  onUpdate: (
    comp: string,
    value: MarginPaddingParam | undefined,
    opts?: { drag?: boolean; oldValue?: MarginPaddingParam }
  ) => void;
  /** Several sides — a `↕`/`↔` pair — as one undo step. */
  onUpdateComps: (comps: string[], value: MarginPaddingParam | undefined, opts?: WriteOpts) => void;
  /** Clear every side of one group, as one undo step. */
  onResetSide: (side: MarginPaddingSide) => void;
}

const SIDES: { side: MarginPaddingSide; label: string }[] = [
  { side: 'margin', label: 'Margin' },
  { side: 'padding', label: 'Padding' }
];

/** Which way an arrow glyph points. `vertical`/`horizontal` are the double-headed pair glyphs. */
type Glyph = MarginPaddingAxis | 'top' | 'bottom' | 'left' | 'right';

/**
 * Drawn, not a font glyph: `↕` in the UI font sits on a different baseline from the mono value
 * beside it and renders at a size the type-scale gate would count.
 */
function EdgeGlyph({ glyph }: { glyph: Glyph }) {
  const up = 'M5 1.5 L2.5 4 M5 1.5 L7.5 4';
  const down = 'M5 8.5 L2.5 6 M5 8.5 L7.5 6';
  const paths: Record<Glyph, string> = {
    vertical: `M5 1.5 V8.5 ${up} ${down}`,
    horizontal: 'M1.5 5 H8.5 M1.5 5 L4 2.5 M1.5 5 L4 7.5 M8.5 5 L6 2.5 M8.5 5 L6 7.5',
    top: `M5 1.5 V8.5 ${up}`,
    bottom: `M5 1.5 V8.5 ${down}`,
    left: 'M1.5 5 H8.5 M1.5 5 L4 2.5 M1.5 5 L4 7.5',
    right: 'M1.5 5 H8.5 M8.5 5 L6 2.5 M8.5 5 L6 7.5'
  };
  return (
    <svg className={css['Glyph']} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d={paths[glyph]} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** The per-edge toggle: a box with its four edges marked, filled when the edges are split. */
function ExpanderGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="3.5" y="3.5" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M4 1 H8 M4 11 H8 M1 4 V8 M11 4 V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

interface BoxFieldProps {
  glyph: Glyph;
  /** What the field shows while not being typed into. */
  shownText: string;
  /** What typing starts from — a token in full, so committing it unchanged stores the same string. */
  editText: string;
  placeholder?: string;
  title: string;
  unit: string;
  isZero: boolean;
  isChanged: boolean;
  /** A mixed pair: no unit suffix. */
  hideUnit?: boolean;
  dataComp: string;
  /** Returns what to put back in the box on a refusal, or `null` when the edit was taken. */
  onCommit: (text: string, unit: string) => string | null;
  scrubStart: MarginPaddingValue;
  onScrub: (value: MarginPaddingValue, phase: 'begin' | 'move' | 'end') => void;
}

/**
 * One value field on the label column's track: glyph, mono value, unit suffix — slice 1's
 * number+unit field at the panel's one control height, 26px.
 */
function BoxField({
  glyph,
  shownText,
  editText,
  placeholder,
  title,
  unit,
  isZero,
  isChanged,
  hideUnit,
  dataComp,
  onCommit,
  scrubStart,
  onScrub
}: BoxFieldProps) {
  // `null` while not editing: the field then shows `shownText`, which follows the model.
  const [draft, setDraft] = useState<string | null>(null);
  const startedFrom = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);

  const scrub = useDragToScrub({
    step: scrubStepForUnit(scrubStart.unit),
    value: scrubStart.value,
    onScrubBegin: () => onScrub(scrubStart, 'begin'),
    onScrub: (value) => onScrub({ value, unit: scrubStart.unit }, 'move'),
    onScrubEnd: (value) => onScrub({ value, unit: scrubStart.unit }, 'end')
  });

  /**
   * Commit the draft if it changed. Returns whether the box should keep its draft (a refusal).
   *
   * ⚠️ Enter commits and then blurs, and the blur's handler belongs to the SAME render — it
   * sees the same `draft`. Moving `startedFrom` to what was just committed is what stops the
   * blur committing it a second time (a second undo entry for one keystroke).
   */
  function commitDraft(text: string | null = draft): boolean {
    if (text === null || text === startedFrom.current) return false;
    startedFrom.current = text;
    const restored = onCommit(text, unit);
    if (restored === null) return false;
    // AC4 of REL-014 — nothing was written, so nothing upstream will re-seed the box.
    setDraft(restored);
    startedFrom.current = restored;
    return true;
  }

  return (
    <div className={classNames(css['Field'], isChanged && css['is-changed'])} title={title} data-comp={dataComp}>
      <span className={css['GlyphBox']}>
        <EdgeGlyph glyph={glyph} />
      </span>
      <input
        ref={inputRef}
        type="text"
        className={classNames(css['Value'], isZero && draft === null && css['is-zero'])}
        value={draft === null ? shownText : draft}
        // An unset side types from empty; what it inherits stays visible as the placeholder.
        placeholder={placeholder ?? (draft !== null && editText === '' ? shownText : undefined)}
        aria-label={title}
        onMouseDown={scrub.onMouseDown}
        onFocus={() => {
          startedFrom.current = editText;
          setDraft(editText);
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          commitDraft();
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (!commitDraft()) inputRef.current?.blur();
          } else if (e.key === 'Escape') {
            // The blur below runs in this render and would commit `draft`; mark it as the
            // start so it reads as unchanged and nothing is written.
            if (draft !== null) startedFrom.current = draft;
            e.currentTarget.blur();
          }
        }}
      />
      {/* 🔴 Text, not a control, and only for a unit that is not px. At 328px a field has ~60px, and
          a `px` always drawn left ~18px for the value (`120` read `1…`); a px ↔ % toggle drawn on
          hover took clicks meant for the value (`120` + Enter stored `0%`). The unit is typed:
          `50%`. A mixed pair has no one unit. */}
      {!hideUnit && unit !== MARGIN_PADDING_UNITS[0] && <span className={css['Unit']}>{unit}</span>}
    </div>
  );
}

/**
 * CHR-009 §2 "paired values" — the box-model editor as two rows of the label column.
 *
 * Was a 150px drawing: a dashed margin ring around a padding block, eight 40px value boxes, an
 * inline edit box that opened over them and a lock per group. It took ~145px of the panel and
 * was the one control whose values sat off the label column.
 *
 * - **Collapsed:** `Margin` and `Padding` each show `↕` (top + bottom) and `↔` (left + right).
 *   A pair whose two sides differ shows an empty field marked `mixed`; typing sets both.
 * - **Expanded** (the per-edge button): four fields, `↑ ↓` over `← →`, each one side.
 * - A drag on a field scrubs it (FB-022), writing both sides of a pair; one undo step per gesture.
 * - POL-012's "set all four together" lock is gone: the pair row is that control, split by axis.
 */
export function MarginPaddingInput({
  values,
  defaults,
  expanded,
  onToggleExpanded,
  onUpdate,
  onUpdateComps,
  onResetSide
}: MarginPaddingInputProps) {
  // The values from before a scrub, for the one undo step at its end. A ref, not state: the
  // drag writes continuously and every write re-renders this component from the view.
  const scrubBefore = useRef<Values | null>(null);

  function scrubComps(comps: string[], value: MarginPaddingValue, phase: 'begin' | 'move' | 'end') {
    if (phase === 'begin') {
      scrubBefore.current = { ...values };
      return;
    }
    if (phase === 'move') {
      onUpdateComps(comps, value, { drag: true });
      return;
    }
    // ⚠️ The old values are the ones captured when the drag began, not whatever is in the
    // model now: the drag has been writing *without* undo, so by this point the model already
    // holds the dragged value and an undo built from it would restore the drag.
    onUpdateComps(comps, value, { oldValues: scrubBefore.current || undefined });
    scrubBefore.current = null;
  }

  function pairField(side: MarginPaddingSide, axis: MarginPaddingAxis) {
    const comps = axisComps(side, axis);
    const shown = pairDisplayOf(side, axis, values, defaults);
    const first = effectiveValueOf(comps[0], values, defaults);
    const pairName = axis === 'vertical' ? 'Top and bottom' : 'Left and right';
    const isToken = shown.kind === 'same' && typeof shown.value === 'string';

    return (
      <BoxField
        key={axis}
        glyph={axis}
        shownText={shown.kind === 'same' ? fieldTextOf(shown.value) : ''}
        editText={shown.kind === 'same' ? editTextOf(shown.value) : ''}
        placeholder={shown.kind === 'mixed' ? 'mixed' : undefined}
        title={
          shown.kind === 'mixed'
            ? `${pairName} ${side}: ${shown.description}`
            : `${pairName} ${side}${isToken ? `: ${shown.value}` : ''}`
        }
        unit={unitOf(first, MARGIN_PADDING_UNITS[0])}
        isZero={shown.kind === 'same' && isZeroValue(shown.value)}
        isChanged={comps.some((comp) => values[comp] !== undefined)}
        hideUnit={shown.kind === 'mixed'}
        dataComp={`${side}-${axis}`}
        scrubStart={scrubStartOf(values[comps[0]], defaults[comps[0]], MARGIN_PADDING_UNITS[0])}
        onScrub={(value, phase) => scrubComps(comps, value, phase)}
        onCommit={(text, unit) => {
          let restored: string | null = null;
          commitMarginPaddingPairEdit({
            side,
            axis,
            text,
            unit,
            values,
            defaults,
            onUpdateComps: (targets, value) => onUpdateComps(targets, value),
            onRefuse: (back) => (restored = back)
          });
          return restored;
        }}
      />
    );
  }

  function edgeField(comp: string) {
    const own = effectiveValueOf(comp, values, defaults);
    const edge = comp.slice(comp.indexOf('-') + 1) as Glyph;
    const isToken = typeof own === 'string';

    return (
      <BoxField
        key={comp}
        glyph={edge}
        shownText={fieldTextOf(own)}
        editText={editTextOf(values[comp])}
        placeholder={values[comp] === undefined ? editTextOf(defaults[comp]) || undefined : undefined}
        title={`${edgeNameOf(comp)} ${sideOf(comp)}${isToken ? `: ${own}` : ''}`}
        unit={unitOf(own, MARGIN_PADDING_UNITS[0])}
        isZero={isZeroValue(own)}
        isChanged={values[comp] !== undefined}
        dataComp={comp}
        scrubStart={scrubStartOf(values[comp], defaults[comp], MARGIN_PADDING_UNITS[0])}
        onScrub={(value, phase) => scrubComps([comp], value, phase)}
        onCommit={(text, unit) => {
          let restored: string | null = null;
          commitMarginPaddingEdit({
            comp,
            text,
            unit,
            values,
            onUpdate: (target, value) => onUpdate(target, value),
            onRefuse: (back) => (restored = back)
          });
          return restored;
        }}
      />
    );
  }

  return (
    <div className={css['Root']}>
      {SIDES.filter(({ side }) => Object.keys(defaults).some((comp) => sideOf(comp) === side)).map(
        ({ side, label }) => {
          const isExpanded = expanded[side];
          const isChanged = Object.keys(values).some((comp) => sideOf(comp) === side && values[comp] !== undefined);

          return (
            <div key={side} data-test={`marginpadding-row-${side}`}>
              <PropertyPanelRow label={label} isChanged={isChanged} onReset={() => onResetSide(side)}>
                <div className={classNames(css['Track'], isExpanded && css['is-expanded'])}>
                  {isExpanded
                    ? MARGIN_PADDING_AXES.flatMap((axis) => axisComps(side, axis).map(edgeField))
                    : MARGIN_PADDING_AXES.map((axis) => pairField(side, axis))}
                  <button
                    type="button"
                    className={css['Expander']}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `Set ${side} in pairs` : `Set each ${side} edge separately`}
                    title={isExpanded ? `Set ${side} in pairs` : `Set each ${side} edge separately`}
                    data-test={`marginpadding-expand-${side}`}
                    onClick={() => onToggleExpanded(side)}
                  >
                    <ExpanderGlyph />
                  </button>
                </div>
              </PropertyPanelRow>
            </div>
          );
        }
      )}
    </div>
  );
}
