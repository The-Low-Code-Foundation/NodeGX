import classNames from 'classnames';
import React from 'react';

// The row's own module: the `PropertyPanelInput` index pulls in `Icon`, which a tests-unit spec cannot load.
import { PropertyPanelRow } from '@noodl-core-ui/components/property-panel/PropertyPanelInput/PropertyPanelRow';

import { ScopeRow } from '../model/scopeRows';
import css from './PropertyTabs.module.scss';

export interface PropertyTabsProps {
  row: ScopeRow;
  onTabClicked: (tab: string) => void;
}

/**
 * The scope picker above a tab group's rows (`Border Style`, `Corner Radius`) — CHR-009 slice 7.
 *
 * Was a right-aligned strip of 32px icons with no label, off the column. Now a row of the label
 * column: `Edge` / `Corner`, then one segmented track (slice 5's shape), the selected side pressed and
 * a mark on each side that holds its own value (`model/scopeRows.ts`). It picks which rows show; it
 * writes nothing, so it has no reset dot.
 */
export function PropertyTabs({ row, onTabClicked }: PropertyTabsProps) {
  return (
    <div data-test="scope-row">
      <PropertyPanelRow label={row.label}>
        <div className={css['Segment']} role="group" aria-label={row.label}>
          {row.segments.map((segment) => (
            <button
              key={segment.tab}
              type="button"
              className={classNames(css['Option'], segment.pressed && css['is-pressed'], !segment.glyph && css['is-text'])}
              aria-pressed={segment.pressed}
              data-tab={segment.tab}
              data-set={segment.isSet ? 'true' : undefined}
              title={segment.isSet ? `${segment.title} (set)` : segment.title}
              onClick={() => onTabClicked(segment.tab)}
            >
              {segment.glyph ? (
                <span className={css['Glyph']} dangerouslySetInnerHTML={{ __html: segment.glyph }} />
              ) : (
                segment.title
              )}
              {segment.isSet && <span className={css['SetMark']} />}
            </button>
          ))}
        </div>
      </PropertyPanelRow>
    </div>
  );
}
