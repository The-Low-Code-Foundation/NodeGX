import classNames from 'classnames';
import React from 'react';

// The row's own module: the `PropertyPanelInput` index pulls in `Icon`, which a tests-unit spec cannot load.
import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';

import { SizeAxis, SizeMode, axesOf, withAxis } from '../model/sizeModeAxes';
import css from './SizeModeInput.module.scss';

type TooltipValue = string | { standard?: string; extended?: string };

export interface SizeModeInputProps {
  /** The row label — the port's display name (`Size Mode`), which FB-021's "Show …" link also names. */
  label?: string;
  value: string | undefined;
  isDefault: boolean;
  tooltips: {
    explicit?: TooltipValue;
    contentHeight?: TooltipValue;
    contentWidth?: TooltipValue;
    contentSize?: TooltipValue;
  };
  onChange: (value: string) => void;
  onReset?: () => void;
}

function tooltipText(tooltip: TooltipValue | undefined): string | undefined {
  if (tooltip === undefined) return undefined;
  return typeof tooltip === 'object' ? tooltip.standard : tooltip;
}

// Inline SVG rather than `Icon`: `Icon` makes a `tests-unit` spec fail TO RUN (FLD-017), and these
// four glyphs are the whole vocabulary of the control.
const GIVEN: Record<SizeAxis, React.ReactNode> = {
  width: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M1 2.5v7M11 2.5v7M3 6h6M4.5 4.5 3 6l1.5 1.5M7.5 4.5 9 6 7.5 7.5" />
    </svg>
  ),
  height: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2.5 1h7M2.5 11h7M6 3v6M4.5 4.5 6 3l1.5 1.5M4.5 7.5 6 9l1.5-1.5" />
    </svg>
  )
};
const FITS: Record<SizeAxis, React.ReactNode> = {
  width: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2.5 2 1 2v8h1.5M9.5 2H11v8H9.5" />
      <rect x="4" y="4.25" width="4" height="3.5" rx=".5" />
    </svg>
  ),
  height: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 2.5V1h8v1.5M2 9.5V11h8V9.5" />
      <rect x="4.25" y="4" width="3.5" height="4" rx=".5" />
    </svg>
  )
};

function AxisSegment({
  axis,
  value,
  tooltips,
  onChange
}: {
  axis: SizeAxis;
  value: string | undefined;
  tooltips: SizeModeInputProps['tooltips'];
  onChange: (value: SizeMode) => void;
}) {
  const axes = axesOf(value);
  const fits = axes ? (axis === 'width' ? axes.widthFits : axes.heightFits) : null;

  return (
    <div className={css['Axis']} role="group" aria-label={axis === 'width' ? 'Width' : 'Height'}>
      <span className={css['AxisLetter']} aria-hidden>
        {axis === 'width' ? 'W' : 'H'}
      </span>
      <div className={css['Segment']}>
        {[false, true].map((segmentFits) => {
          const next = withAxis(value, axis, segmentFits);
          return (
            <button
              key={String(segmentFits)}
              type="button"
              className={classNames(css['Option'], fits === segmentFits && css['is-pressed'])}
              aria-pressed={fits === segmentFits}
              data-size-axis={axis}
              data-size-fits={segmentFits}
              // The title is the mode this press produces, in the node's own words ("Text width &
              // explicit height") — the port's tooltips already name the content per node type.
              title={tooltipText(tooltips[next]) ?? next}
              onClick={() => {
                if (next !== value) onChange(next);
              }}
            >
              {segmentFits ? FITS[axis] : GIVEN[axis]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * How a visual node is sized — CHR-009 §2 "dimensions".
 *
 * Was four 30px icon boxes centred on a 50px strip with no label, and a reset dot floating at its
 * right edge ("four resizing icons + a stray dot"). Now a row of the label column like every other:
 * `Size Mode`, then a `W` and an `H` segment, each "given | fits the content". The value written is
 * still one of the port's four enum values (`model/sizeModeAxes.ts`).
 *
 * The controls are real `<button>`s with `aria-pressed`, so FB-021's jump to a gating control now
 * focuses a control on this row instead of falling back to the row (`revealGateTarget`).
 */
export function SizeModeInput({ label = 'Size Mode', value, isDefault, tooltips, onChange, onReset }: SizeModeInputProps) {
  return (
    <PropertyPanelRow label={label} isChanged={!isDefault} onReset={onReset}>
      <div className={css['Root']} data-test="size-mode">
        <AxisSegment axis="width" value={value} tooltips={tooltips} onChange={onChange} />
        <AxisSegment axis="height" value={value} tooltips={tooltips} onChange={onChange} />
      </div>
    </PropertyPanelRow>
  );
}
