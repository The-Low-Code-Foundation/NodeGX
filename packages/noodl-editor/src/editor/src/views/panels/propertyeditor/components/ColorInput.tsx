import React, { useEffect, useState } from 'react';

import { PropertyPanelBaseInput } from '@noodl-core-ui/components/property-panel/PropertyPanelBaseInput';
import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';

import { colorFieldPartsOf } from '../model/colorField';
import css from './ColorInput.module.scss';

export interface ColorInputProps {
  label: string;
  /** The value as stored ('#RRGGBB', '#RRGGBBAA', a color style name, or undefined) */
  value: string | undefined;
  /** The resolved CSS color for the swatch */
  resolvedColor: string | undefined;

  isChanged?: boolean;
  isConnected?: boolean;
  /** FB-018: the source driving this port, for the binding chip. */
  connectionLabel?: string;
  /** FB-018: click-to-navigate to the driving node. */
  onConnectionClick?: () => void;

  onCommit: (text: string) => void;
  /** Click on the swatch — opens the color picker */
  onOpenColorPicker: (anchor: HTMLElement) => void;
  /** Click on the text input — opens the color style picker */
  onOpenStylePicker: (anchor: HTMLElement) => void;
  onFilter?: (text: string) => void;
  onEnter?: () => void;
  onReset?: () => void;
  dataIdentifier?: string;
  /** CHR-009 §12.4 — an unset per-side field shows the colour it inherits from all sides, muted. */
  placeholder?: string;
}

export interface ColorFieldViewProps {
  value: string | undefined;
  /** What the text input shows — the typed text while editing. */
  displayedValue: string;
  resolvedColor: string | undefined;
  isChanged?: boolean;
  isConnected?: boolean;
  dataIdentifier?: string;
  placeholder?: string;
  onTextChange: (text: string) => void;
  onTextClick: (anchor: HTMLElement) => void;
  onTextBlur: () => void;
  onTextEnter: () => void;
  onSwatchClick: (anchor: HTMLElement) => void;
}

/**
 * CHR-009 §2 "colour": one 26px field — the swatch inside it, the hex in mono, the alpha as the suffix
 * (`model/colorField.ts`). No hooks, so `tests-unit` can walk what it draws.
 */
export function ColorFieldView({
  value,
  displayedValue,
  resolvedColor,
  isChanged,
  isConnected,
  dataIdentifier,
  placeholder,
  onTextChange,
  onTextClick,
  onTextBlur,
  onTextEnter,
  onSwatchClick
}: ColorFieldViewProps) {
  const parts = colorFieldPartsOf(value);

  return (
    <div className={css['Field']}>
      <button
        type="button"
        className={css['Swatch']}
        title="Pick a colour"
        aria-label="Pick a colour"
        onClick={(e) => {
          e.stopPropagation();
          // The picker opens to the right of its anchor. Anchored on the swatch — now at the field's LEFT —
          // it covered the hex and alpha it edits (s19 drive); anchored on the field it clears the row, as
          // the old thumbnail at the column's right edge did.
          onSwatchClick(e.currentTarget.parentElement ?? e.currentTarget);
        }}
      >
        <span className={css['SwatchFill']} style={{ backgroundColor: resolvedColor }} />
      </button>
      <PropertyPanelBaseInput
        type="text"
        className={`${css['Value']} ${parts.isHex ? css['is-hex'] : ''}`}
        value={displayedValue}
        placeholder={placeholder}
        isChanged={isChanged}
        isConnected={isConnected}
        dataIdentifier={dataIdentifier}
        dataType="color"
        onChange={(text) => onTextChange(String(text))}
        onClick={(e) => {
          e.stopPropagation();
          onTextClick(e.currentTarget);
        }}
        onFocus={(e) => e.stopPropagation()}
        onBlur={() => onTextBlur()}
        onKeyDown={(e) => e.key === 'Enter' && onTextEnter()}
      />
      {parts.alpha !== null && (
        <span className={css['Alpha']} title="Opacity — change it in the colour picker">
          {parts.alpha}
        </span>
      )}
    </div>
  );
}

export function ColorInput({
  label,
  value,
  resolvedColor,
  isChanged,
  isConnected,
  connectionLabel,
  onConnectionClick,
  onCommit,
  onOpenColorPicker,
  onOpenStylePicker,
  onFilter,
  onEnter,
  onReset,
  dataIdentifier,
  placeholder
}: ColorInputProps) {
  const shownText = colorFieldPartsOf(value).text;
  const [displayedValue, setDisplayedValue] = useState(shownText);

  useEffect(() => {
    setDisplayedValue(shownText);
  }, [shownText]);

  function commitIfChanged() {
    if (displayedValue !== shownText) {
      onCommit(displayedValue);
    }
  }

  return (
    <PropertyPanelRow
      label={label}
      isChanged={isChanged}
      onReset={onReset}
      isConnected={isConnected}
      connectionLabel={connectionLabel}
      onConnectionClick={onConnectionClick}
    >
      <ColorFieldView
        value={value}
        displayedValue={displayedValue}
        resolvedColor={resolvedColor}
        isChanged={isChanged}
        isConnected={isConnected}
        dataIdentifier={dataIdentifier}
        placeholder={placeholder}
        onTextChange={(text) => {
          setDisplayedValue(text);
          onFilter && onFilter(text);
        }}
        onTextClick={onOpenStylePicker}
        onTextBlur={commitIfChanged}
        onTextEnter={() => {
          commitIfChanged();
          onEnter && onEnter();
        }}
        onSwatchClick={onOpenColorPicker}
      />
    </PropertyPanelRow>
  );
}
