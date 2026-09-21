import classNames from 'classnames';
import React, { useEffect, useState, useRef } from 'react';

import { PropertyPanelBaseInput } from '@noodl-core-ui/components/property-panel/PropertyPanelBaseInput';
import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';
import { PropertyPanelSelectInput } from '@noodl-core-ui/components/property-panel/PropertyPanelSelectInput';
import { ScrubBinding, useDragToScrub } from '@noodl-core-ui/components/property-panel/scrub';

import css from './NumberUnitInput.module.scss';

export interface NumberUnitInputProps {
  label: string;
  /** The numeric part, as a string ('' when unset) */
  value: string;
  unit: string;
  units: string[];

  isChanged?: boolean;
  isConnected?: boolean;
  /** FB-018: the source driving this port, for the binding chip. */
  connectionLabel?: string;
  /** FB-018: click-to-navigate to the driving node. */
  onConnectionClick?: () => void;
  dataIdentifier?: string;

  /** Dimension rows show the Fixed checkbox when the unit is % */
  showFixed?: boolean;
  isFixed?: boolean;
  isPercent?: boolean;

  /** Commit the typed text (may include a unit suffix, e.g. '50%') */
  onCommit: (text: string) => void;
  /** A unit was picked from the dropdown; commits with the currently displayed text */
  onUnitChange: (unit: string, currentText: string) => void;
  onFixedToggle?: () => void;
  onReset?: () => void;
  /** FB-016 scope 4 — the transform-origin crosshair is drawn while this field holds focus. */
  onFocus?: () => void;
  onBlur?: () => void;

  /**
   * FB-022 — drag-to-scrub on the **value half only**.
   *
   * 🔴 The unit stays a dropdown and a scrub never touches it. A gesture that could change
   * `px` to `%` would be silently reinterpreting the number under a different meaning, which
   * is the coercion question FB-019 owns and settled the other way.
   */
  scrub?: ScrubBinding;

  /** CHR-009 §12.4 — an unset per-side field shows what it inherits from all sides, muted. */
  placeholder?: string;

  /**
   * HLT-012 — open the design-token picker for this parameter, anchored to the button.
   *
   * ⚠️ **Absent means the parameter has no scale**, and then no button is drawn at all. The
   * decision is `fieldOffersTokens(portName)` in the row, never a guess here: 86 ports in the
   * shipped catalog reach this component and only 64 have a token category that fits one.
   */
  onOpenTokenPicker?: (anchor: HTMLElement) => void;
  /** Whether the stored value IS a token — the button says so, since the value box just shows text. */
  isToken?: boolean;
}

/**
 * The token button's mark: `{ }` around a dot, drawn rather than set in type.
 *
 * ⚠️ A text glyph here would be counted by the type-scale ratchet and would sit on the UI font's
 * baseline rather than the field's, which is the reason `MarginPaddingInput` draws its arrows.
 */
function TokenGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M4.6 1.6C3.4 1.6 3.2 2.4 3.2 3.4V4.6C3.2 5.4 2.8 6 1.8 6C2.8 6 3.2 6.6 3.2 7.4V8.6C3.2 9.6 3.4 10.4 4.6 10.4M7.4 1.6C8.6 1.6 8.8 2.4 8.8 3.4V4.6C8.8 5.4 9.2 6 10.2 6C9.2 6 8.8 6.6 8.8 7.4V8.6C8.8 9.6 8.6 10.4 7.4 10.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

export function NumberUnitInput({
  label,
  value,
  unit,
  units,
  isChanged,
  isConnected,
  connectionLabel,
  onConnectionClick,
  dataIdentifier,
  showFixed,
  isFixed,
  isPercent,
  onCommit,
  onUnitChange,
  onFixedToggle,
  onReset,
  onFocus,
  onBlur,
  scrub,
  placeholder,
  onOpenTokenPicker,
  isToken
}: NumberUnitInputProps) {
  const [displayedValue, setDisplayedValue] = useState(value ?? '');
  // ⚠️ A scrub does not go through `commitIfChanged`. That path goes to the view's
  // `updateValue`, which reaches `parent.setParameter` and therefore records an undo entry
  // every time — one per pixel, if a drag were routed through it.
  const dragToScrub = useDragToScrub(scrub);
  const tokenButtonRef = useRef<HTMLButtonElement>(null);

  const hasUnitChoice = (units?.length ?? 0) > 1;
  const staticUnit = unit || units?.[0] || '';

  useEffect(() => {
    setDisplayedValue(value ?? '');
  }, [value]);

  function commitIfChanged() {
    if (displayedValue !== (value ?? '')) {
      onCommit(displayedValue);
    }
  }

  return (
    // FB-018 AC1 — this is the row the test user hit. Width was a fully editable
    // field with a 1px outline while a connection drove it, so typing a width
    // rendered and then reverted, and nothing on screen explained why.
    <PropertyPanelRow
      label={label}
      isChanged={isChanged}
      onReset={onReset}
      isConnected={isConnected}
      connectionLabel={connectionLabel}
      onConnectionClick={onConnectionClick}
    >
      <div className={css['Line']}>
        <div className={css['Field']}>
          <PropertyPanelBaseInput
            type="text"
            isNumeric
            className={css['Value']}
            value={displayedValue}
            placeholder={placeholder}
            isChanged={isChanged}
            isConnected={isConnected}
            isScrubbable={Boolean(scrub)}
            dataIdentifier={dataIdentifier}
            onChange={(text) => setDisplayedValue(String(text))}
            onMouseDown={dragToScrub.onMouseDown}
            onFocus={() => onFocus && onFocus()}
            onBlur={() => {
              commitIfChanged();
              onBlur && onBlur();
            }}
            onKeyDown={(e) => e.key === 'Enter' && commitIfChanged()}
          />
          {/* FH-014. About half the unit-bearing ports declare exactly one unit
            (21x ['px'], 4x ['%'], 1x ['deg'] — Font Size, Padding, Border Width,
            the Shadow numbers, Rotation...). A dropdown offering one immutable
            choice is noise, so those render a static unit label instead. */}
          {hasUnitChoice ? (
            <div className={css['UnitPicker']}>
              <PropertyPanelSelectInput
                value={unit}
                properties={{ options: units.map((u) => ({ label: u, value: u })) }}
                onChange={(u) => onUnitChange(String(u), displayedValue)}
                hasHiddenCaret
                hasSmallText
              />
            </div>
          ) : (
            Boolean(staticUnit) && <span className={css['Unit']}>{staticUnit}</span>
          )}
          {/* HLT-012 — the design-token affordance. `isConnected` hides it for the same reason
              `PropertyPanelRow` replaces the whole control while a wire drives the port: nothing
              picked here would survive the connection. */}
          {onOpenTokenPicker && !isConnected && (
            <button
              type="button"
              ref={tokenButtonRef}
              className={classNames(css['TokenButton'], isToken && css['is-token'])}
              title={isToken ? `${value} — pick a different design token` : 'Pick a design token'}
              aria-label="Pick a design token"
              data-test={`token-button-${dataIdentifier}`}
              // 🔴 `mouseDown`, not `click`: the value input commits on blur, and a click that
              // first blurs a field holding a half-typed number would write it on the way to
              // opening the picker. Preventing the default keeps the focus where it was.
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenTokenPicker(tokenButtonRef.current || (e.currentTarget as HTMLElement));
              }}
            >
              <TokenGlyph />
            </button>
          )}
        </div>

        {/* CHR-009 (Richard, s17): only drawn while the value is a %, the one unit it changes anything for
            (`layout.ts` turns a % in a row/column into a flex share unless it is fixed). On px the field
            takes the whole control column. A stored `isFixed` on a px value is inert and left alone. */}
        {showFixed && isPercent && (
          <button
            type="button"
            className={css['Fixed']}
            aria-pressed={Boolean(isFixed)}
            title="Keep this size fixed instead of a share of the parent"
            onClick={() => onFixedToggle && onFixedToggle()}
          >
            Fixed
          </button>
        )}
      </div>
    </PropertyPanelRow>
  );
}
