import classNames from 'classnames';
import React from 'react';

// The row's own module: the `PropertyPanelInput` index pulls in `Icon`, which a tests-unit spec cannot load.
import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';

import { AlignPortLike, alignGlyphOf, alignRowsOf, valueOnPress } from '../model/alignRows';
import css from './AlignToolsInput.module.scss';

export interface AlignToolsInputProps {
  /** The ports this control edits, in port order — one row each. */
  ports: AlignPortLike[];
  /** alignComp → explicit value, or undefined when unset. */
  values: Record<string, string | undefined>;
  /** The flex direction is vertical: the item/content glyphs turn with it. */
  isVertical: boolean;
  /**
   * alignComp → the wire driving that port. Each row is one port, so each row chips on its own (FB-018): the
   * strip this replaced was several ports in one control and had no single connection to name.
   */
  connections?: Record<string, AlignConnection | undefined>;

  onChange: (comp: string, value: string) => void;
  onReset: (comp: string) => void;
}

export interface AlignConnection {
  label?: string;
  onClick?: () => void;
}

/**
 * The alignment ports — CHR-009 §2, slice 5.
 *
 * Was an unlabelled icon strip per group, off the label column. Now each port is a row of the column
 * like every other: its label, then one segmented track that fills the control column, one segment
 * per enum value (`model/alignRows.ts`). The pressed segment is the value in effect; the gutter's
 * reset dot says it was set.
 */
export function AlignToolsInput({ ports, values, isVertical, connections, onChange, onReset }: AlignToolsInputProps) {
  return (
    <div className={css['Root']}>
      {alignRowsOf(ports, values).map((row) => (
        <div key={row.comp} data-test={`align-row-${row.comp}`}>
          <PropertyPanelRow
            label={row.label}
            isChanged={row.isChanged}
            onReset={() => onReset(row.comp)}
            isConnected={Boolean(connections?.[row.comp])}
            connectionLabel={connections?.[row.comp]?.label}
            onConnectionClick={connections?.[row.comp]?.onClick}
          >
            <div className={css['Segment']} role="group" aria-label={row.label}>
              {row.options.map((option) => {
                const glyph = alignGlyphOf(row.comp, option.value);
                const rotate = isVertical && glyph ? glyph.rotate : null;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={classNames(
                      css['Option'],
                      option.pressed && css['is-pressed'],
                      !glyph && css['is-text'],
                      rotate && css[rotate === 'rotate2' ? 'is-rotate2' : 'is-rotate']
                    )}
                    aria-pressed={option.pressed}
                    data-align-comp={row.comp}
                    data-align-value={option.value}
                    title={`${row.label}: ${option.label}`}
                    onClick={() => {
                      const next = valueOnPress(row, option.value);
                      if (next !== null) onChange(row.comp, next);
                    }}
                  >
                    {glyph ? (
                      <span className={css['Glyph']} dangerouslySetInnerHTML={{ __html: glyph.markup }} />
                    ) : (
                      option.label
                    )}
                  </button>
                );
              })}
            </div>
          </PropertyPanelRow>
        </div>
      ))}
    </div>
  );
}
