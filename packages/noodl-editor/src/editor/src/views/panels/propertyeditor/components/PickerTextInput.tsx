import React, { useEffect, useState } from 'react';

import { PropertyPanelBaseInput } from '@noodl-core-ui/components/property-panel/PropertyPanelBaseInput';
import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';
import { TokenChip } from '@noodl-core-ui/components/property-panel/TokenChip';

export interface PickerTextInputProps {
  label: string;
  value: string;

  isChanged?: boolean;
  isConnected?: boolean;
  /** FB-018: the source driving this port, for the binding chip. */
  connectionLabel?: string;
  /** FB-018: click-to-navigate to the driving node. */
  onConnectionClick?: () => void;

  /** Commit the typed value (blur / Enter, only when actually changed) */
  onCommit: (value: string) => void;
  /** Open the picker popout. `anchor` is the input element. */
  onOpenPicker: (anchor: HTMLElement) => void;
  /** Live filter as the user types while the picker is open */
  onFilter?: (text: string) => void;
  onEnter?: () => void;
  onReset?: () => void;
  dataIdentifier?: string;
  /**
   * P103 CMG-009 — the row holds a design token (`fontFamily: 'var(--font-sans)'`, which the
   * editor stamps on every new Text). Drawn as a chip in place of the text box: the token's name
   * and what it resolves to; pressing it opens the same picker; ✕ puts the resolved value in.
   */
  tokenName?: string;
  tokenValue?: string;
  onDetachToken?: () => void;
  tokenActions?: React.ReactNode;
}

/**
 * The shared row shape of the legacy font/image/identifier/component rows:
 * a text input that commits on change, opens a picker popout on click, and
 * live-filters the picker while typing.
 */
export function PickerTextInput({
  label,
  value,
  isChanged,
  isConnected,
  connectionLabel,
  onConnectionClick,
  onCommit,
  onOpenPicker,
  onFilter,
  onEnter,
  onReset,
  dataIdentifier,
  tokenName,
  tokenValue,
  onDetachToken,
  tokenActions
}: PickerTextInputProps) {
  const [displayedValue, setDisplayedValue] = useState(value ?? '');

  useEffect(() => {
    setDisplayedValue(value ?? '');
  }, [value]);

  function commitIfChanged() {
    if (displayedValue !== (value ?? '')) {
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
      {tokenName ? (
        <TokenChip
          name={tokenName}
          value={tokenValue}
          onOpen={(anchor) => onOpenPicker(anchor)}
          onDetach={onDetachToken}
          actions={tokenActions}
          dataTest={`token-chip-${dataIdentifier}`}
        />
      ) : (
      <PropertyPanelBaseInput
        type="text"
        value={displayedValue}
        isChanged={isChanged}
        isConnected={isConnected}
        dataIdentifier={dataIdentifier}
        onChange={(text) => {
          setDisplayedValue(String(text));
          onFilter && onFilter(String(text));
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenPicker(e.currentTarget);
        }}
        onFocus={(e) => e.stopPropagation()}
        onBlur={() => commitIfChanged()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitIfChanged();
            onEnter && onEnter();
          }
        }}
      />
      )}
    </PropertyPanelRow>
  );
}
