import classNames from 'classnames';
import React from 'react';

import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';

import { isSpriteIconValue, type IconSetValue } from '../../../../../../shared/utils/iconsets';
import { IconGlyphPreview } from './IconGlyphPreview';
import css from './IconInput.module.scss';

/**
 * What the field names a stored icon by, `''` when nothing is chosen. A sprite: its symbol id. A font glyph: its code
 * without the `icon-` every lucide class carries (`icon-home` → `home`); a code that is a bare codepoint (a PUA glyph,
 * which prints as a box in the panel's font) → `U+F015`.
 */
export function iconValueName(value: IconSetValue | undefined): string {
  if (!value) return '';
  if (isSpriteIconValue(value)) return value.symbolId || '';
  const code = typeof value.code === 'string' ? value.code : '';
  if (!code) return '';
  if (!/[A-Za-z0-9]/.test(code)) {
    return [...code].map((ch) => 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');
  }
  return code.replace(/^icon-/, '');
}

/**
 * A stored icon parameter. Structurally `Noodl.Icon` — NDA-007 §1's union — because that is what
 * lands in project JSON and flows down the port. A font value carries no `kind`, which is how an
 * existing project's parameters keep their exact shape.
 */
export type IconValue = IconSetValue;

export interface IconInputProps {
  label: string;
  value?: IconValue;

  isChanged?: boolean;
  /**
   * FB-018. `IconType` computed this and then never passed it — so an icon port
   * driven by a connection was the one row that showed NOTHING at all, not even
   * the outline the other unchipped rows had.
   */
  isConnected?: boolean;
  /** The source driving this port, for the binding chip. */
  connectionLabel?: string;
  /** Click-to-navigate to the driving node. */
  onConnectionClick?: () => void;
  dataIdentifier?: string;

  /** Open the icon picker popout. `anchor` is the thumbnail element. */
  onOpenPicker: (anchor: HTMLElement) => void;
  onReset?: () => void;
}

/**
 * The icon property row: a label plus a clickable thumbnail box that shows
 * the currently selected icon and opens the icon picker popout.
 */
export function IconInput({
  label,
  value,
  isChanged,
  isConnected,
  connectionLabel,
  onConnectionClick,
  dataIdentifier,
  onOpenPicker,
  onReset
}: IconInputProps) {
  const name = iconValueName(value);
  return (
    <PropertyPanelRow
      label={label}
      isChanged={isChanged}
      onReset={onReset}
      isConnected={isConnected}
      connectionLabel={connectionLabel}
      onConnectionClick={onConnectionClick}
    >
      <div
        className={css['IconField']}
        data-identifier={dataIdentifier}
        onClick={(e) => {
          e.stopPropagation();
          onOpenPicker(e.currentTarget);
        }}
      >
        {name ? (
          <>
            {/* One renderer for the thumbnail and the picker cell — NDA-007 §3. This used to be a
                third independent copy of the font splat, so a sprite value showed as an empty box. */}
            <span className={css['Glyph']}>
              <IconGlyphPreview value={value} size={14} />
            </span>
            <span className={css['Name']}>{name}</span>
          </>
        ) : (
          <span className={classNames(css['Name'], css['is-placeholder'])}>None</span>
        )}
      </div>
    </PropertyPanelRow>
  );
}
