import classNames from 'classnames';
import React from 'react';

import { BindingChip } from '@noodl-core-ui/components/property-panel/BindingChip';
import { Slot } from '@noodl-core-ui/types/global';

import css from './PropertyPanelInput.module.scss';

export interface PropertyPanelRowProps {
  isChanged?: boolean;
  label: string;
  children: Slot;
  /** When set and the value is changed from its default, a dot is shown that resets the value on click */
  onReset?: () => void;

  /**
   * FB-018. The rows that are not built out of `PropertyPanelInput` — the number+unit
   * row (Width/Height), the picker rows (image, font, component, identifier, text
   * style, source file) and the icon row — reach the binding chip through here.
   *
   * 🔴 THIS IS A SEAM, NOT A SECOND IMPLEMENTATION. Those rows had `isConnected`
   * already and spent it on a 1px outline around a field that stayed fully editable,
   * so typing into a connected Width silently wrote a value the connection would
   * overwrite. Rather than teach three components to draw a chip — three chances to
   * drift from the one `PropertyPanelInput` draws — they each pass the connection
   * down to the row they were already wrapping themselves in.
   */
  isConnected?: boolean;
  /** The source label for the chip, e.g. "CallCF · Result". */
  connectionLabel?: string;
  /** Click-to-navigate to the driving node; the chip is read-only without it. */
  onConnectionClick?: () => void;
}

/**
 * CHR-009 §2 "connection state" — the row's one mark, drawn in a gutter left of the label.
 *
 * Was a 7px dot AFTER the label text, inside the label box — so it moved with the label's length,
 * and once CHR-009 R6 made the label `overflow: hidden` for its ellipsis, a long label could clip
 * its own reset dot. In the gutter every row's mark sits on one x, and the label column starts at
 * the same x whether a row has a mark or not.
 *
 * - **connected** → a filled `primary` dot with a wash ring (the mockup's `.dot.on`). Not clickable:
 *   the binding chip beside it is the click, and names the source.
 * - **changed from its default** → the reset dot, as before (same class, same title, same click).
 * - neither → nothing. ⚠️ The mockup draws an OUTLINED dot on every row; that was not built, because
 *   the rows that do not draw through this component (legacy `.property-row`s, the align strip, the
 *   margin/padding box, `Variant`/`State`) would have had no ring and the gutter would read as a
 *   pattern with holes. Recorded in CHR-009 §8 for Richard's look.
 *
 * Exported for `PropertyPanelInput`, the other row that draws a label.
 */
export function GutterDot({
  isConnected,
  showsChanged,
  onReset
}: {
  isConnected?: boolean;
  showsChanged?: boolean;
  onReset?: () => void;
}) {
  if (isConnected) return <span className={css['ConnectedDot']} title="Connected" data-test="gutter-connected" />;
  if (showsChanged && onReset) return <span className={css['ResetDot']} title="Reset to default" onClick={onReset} />;
  return null;
}

export function PropertyPanelRow({
  isChanged,
  label,
  children,
  onReset,
  isConnected,
  connectionLabel,
  onConnectionClick
}: PropertyPanelRowProps) {
  // The chip REPLACES the row's controls rather than sitting beside them. For the
  // number+unit row that also retires the unit dropdown and the Fixed checkbox while
  // connected, which is correct: they edit parts of a value the connection supplies
  // whole.
  const showsChanged = isChanged && !isConnected;

  return (
    <div className={css['Root']}>
      <GutterDot isConnected={isConnected} showsChanged={showsChanged} onReset={onReset} />
      <div className={classNames(css['Label'], showsChanged && css['is-changed'])} title={label}>
        {label}
      </div>
      <div className={css['InputContainer']}>
        {isConnected ? <BindingChip source={connectionLabel} onClick={onConnectionClick} /> : children}
      </div>
    </div>
  );
}
