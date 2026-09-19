import React from 'react';

import { IconSize } from '@noodl-core-ui/components/common/Icon';
import { IconButtonVariant } from '@noodl-core-ui/components/inputs/IconButton';
import { ContextMenu } from '@noodl-core-ui/components/popups/ContextMenu';
import { MenuDialogProps } from '@noodl-core-ui/components/popups/MenuDialog';

import css from './StyleRow.module.scss';

/**
 * Which storage layer a row came from. R2 ruled that the panel shows **both**
 * systems with every row badged, and R-D added *what uses it* beside the badge:
 * "a person is looking at two layers in one list and the badge is the only thing
 * that makes that honest".
 */
export type StyleLayer = 'Style' | 'Token' | 'Look';

export interface StyleRowProps {
  name: string;
  /** What the row resolves to, printed under the name. A hex, a `var(--token)`, or a summary. */
  value?: string;
  /** Drawn when the row has a colour worth showing. Omitted entirely for text styles and Looks. */
  swatch?: string;
  layer: StyleLayer;
  /**
   * How many nodes name this. `undefined` means *not counted* and prints nothing;
   * `0` means *counted, and nothing uses it* and prints "unused".
   *
   * 🔴 The two are not the same reading and must not collapse into one blank cell —
   * a panel that draws nothing for both says "nothing uses this" about a row it
   * never asked about. See `StylesModel.styleUsageCounts`.
   */
  usageCount?: number;
  menuItems: MenuDialogProps['items'];
  testId?: string;
}

export function StyleRow({ name, value, swatch, layer, usageCount, menuItems, testId }: StyleRowProps) {
  return (
    <div className={css['Root']} data-test={testId} data-style-row={name} data-style-layer={layer}>
      {swatch !== undefined && (
        <div className={css['Swatch']}>
          <div className={css['SwatchFill']} style={{ backgroundColor: swatch }} />
        </div>
      )}

      <div className={css['Text']}>
        <span className={css['Name']}>{name}</span>
        {value ? <span className={css['Value']}>{value}</span> : null}
      </div>

      <span className={css['Badge']} data-test={`style-row-badge-${name}`}>
        {layer}
      </span>

      {usageCount !== undefined && (
        <span
          className={[css['Usage'], usageCount === 0 && css['is-unused']].filter(Boolean).join(' ')}
          data-test={`style-row-usage-${name}`}
          title={usageCount === 1 ? 'Used by 1 node' : `Used by ${usageCount} nodes`}
        >
          {usageCount === 0 ? 'unused' : `${usageCount}×`}
        </span>
      )}

      <div className={css['MenuSlot']}>
        <ContextMenu
          menuItems={menuItems}
          variant={IconButtonVariant.SemiTransparent}
          size={IconSize.Tiny}
          testId={`style-row-menu-${name}`}
        />
      </div>
    </div>
  );
}

/** What a section draws instead of a list when the project has none of that thing yet. */
export function StyleSectionEmpty({ children }: { children: React.ReactNode }) {
  return <div className={css['Empty']}>{children}</div>;
}
