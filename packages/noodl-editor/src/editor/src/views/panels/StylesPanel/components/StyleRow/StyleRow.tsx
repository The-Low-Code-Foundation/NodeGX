import React from 'react';

import { IconSize } from '@noodl-core-ui/components/common/Icon';
import { IconButtonVariant } from '@noodl-core-ui/components/inputs/IconButton';
import { ContextMenu } from '@noodl-core-ui/components/popups/ContextMenu';
import { MenuDialogProps } from '@noodl-core-ui/components/popups/MenuDialog';

import { usageListTitle, wearerLabel, wearerLocation } from '../../format';
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
  /**
   * P94 STY-006 — what names this style, drawn under the row when `isUsageOpen`.
   *
   * 🔴 **The count is NOT derived here.** `usageCount` and this list arrive from one walk
   * (`styleWearersIn`), so the row prints a number it was given and lists the entries it was
   * given; recomputing either from the other here would put a third opinion on the screen.
   */
  wearers?: StyleWearerList;
  /**
   * Whether the list is open. 🔴 **Controlled by the SECTION, not by the row.**
   *
   * A row that held its own open/closed state would be a row no gate in this package could render
   * open — `renderToStaticMarkup` runs no effects and dispatches no events, and there is no jsdom
   * here to click with. Lifting it makes the row a pure function of its props and AC4 gradeable.
   * It also means opening one row can close another, which is what a narrow rail wants.
   */
  isUsageOpen?: boolean;
  /** Pressing the count. Absent (or a zero count) leaves the count as plain text — AC3. */
  onToggleUsage?: () => void;
  /** Pressing one node entry. Absent leaves every entry unpressable. */
  onGoToWearer?: (wearer: StyleRowWearer) => void;
  menuItems: MenuDialogProps['items'];
  testId?: string;
}

/** One node that names this style, and where it is. Mirrors `StylesModel.usage`'s `Wearer`. */
export interface StyleRowWearer {
  componentName: string;
  nodeId: string;
  label: string;
  typename: string;
}

/**
 * What names a style: nodes, and Looks.
 *
 * 🔴 **They are two lists on purpose.** A node is somewhere on a canvas a person can be taken to; a
 * Look is a rule with nowhere to go. Flattening them into one array would mean either drawing a
 * Look as pressable and landing nowhere, or drawing every entry unpressable and losing the task.
 */
export interface StyleWearerList {
  nodes: StyleRowWearer[];
  variants: { name: string; typename: string }[];
}

export function StyleRow({
  name,
  value,
  swatch,
  layer,
  usageCount,
  wearers,
  isUsageOpen,
  onToggleUsage,
  onGoToWearer,
  menuItems,
  testId
}: StyleRowProps) {
  // AC3: a count is a door only when there is something behind it. `unused` opens nothing, and a
  // section that never passed a handler gets the plain text STY-005 shipped.
  const canOpenUsage = onToggleUsage !== undefined && usageCount !== undefined && usageCount > 0;
  const showWearers = canOpenUsage && isUsageOpen && wearers !== undefined;

  const usageText = usageCount === 0 ? 'unused' : `${usageCount}×`;

  /**
   * 🔴 **"Used by 3 nodes" is a LIE on a row where one of the three is a Look**, and `usageCount`
   * is deliberately nodes *plus* Looks — the sections add them so one number answers "does anything
   * depend on this". When the row knows the breakdown it says it; only a row given a bare count
   * (a caller that passed no `wearers`) falls back to the plural guess.
   *
   * Rule 2 of the design — *no bare values, every field names its source* — is about the property
   * panel, but a tooltip that names the wrong KIND of user is the same failure one surface over.
   */
  const usageTitle = wearers
    ? usageListTitle(wearers.nodes?.length ?? 0, wearers.variants?.length ?? 0)
    : usageCount === 1
    ? 'Used by 1 node'
    : `Used by ${usageCount} nodes`;

  return (
    <div className={css['Wrapper']} data-style-row-wrapper={name}>
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

        {usageCount !== undefined &&
          (canOpenUsage ? (
            <button
              type="button"
              className={[css['Usage'], css['UsageButton'], isUsageOpen && css['is-open']]
                .filter(Boolean)
                .join(' ')}
              data-test={`style-row-usage-${name}`}
              data-usage-open={isUsageOpen ? 'true' : 'false'}
              aria-expanded={isUsageOpen ? 'true' : 'false'}
              title={`${usageTitle} — press to see which`}
              onClick={onToggleUsage}
            >
              {usageText}
            </button>
          ) : (
            <span
              className={[css['Usage'], usageCount === 0 && css['is-unused']].filter(Boolean).join(' ')}
              data-test={`style-row-usage-${name}`}
              title={usageTitle}
            >
              {usageText}
            </span>
          ))}

        <div className={css['MenuSlot']}>
          <ContextMenu
            menuItems={menuItems}
            variant={IconButtonVariant.SemiTransparent}
            size={IconSize.Tiny}
            testId={`style-row-menu-${name}`}
          />
        </div>
      </div>

      {showWearers && <StyleRowWearers name={name} wearers={wearers} onGoToWearer={onGoToWearer} />}
    </div>
  );
}

/**
 * P94 STY-006 — the list under a row: what names this style, and where.
 *
 * 🔴 **Nodes are pressable and Looks are not**, and the difference is drawn, not only wired. A
 * Look entry that looked identical to a node entry and did nothing on press would be worse than no
 * list at all — the person would conclude the whole feature is broken on the first Look they hit.
 */
function StyleRowWearers({
  name,
  wearers,
  onGoToWearer
}: {
  name: string;
  wearers: StyleWearerList;
  onGoToWearer?: (wearer: StyleRowWearer) => void;
}) {
  const nodes = wearers.nodes ?? [];
  const variants = wearers.variants ?? [];

  return (
    <div className={css['Wearers']} data-test={`style-row-wearers-${name}`}>
      <div className={css['WearersTitle']}>{usageListTitle(nodes.length, variants.length)}</div>

      {nodes.map((wearer) => (
        <button
          type="button"
          // 🔴 Keyed by node id, never by label — two unnamed Texts in one component print the
          // same thing, and React would then draw one of them.
          key={wearer.nodeId}
          className={css['Wearer']}
          data-test={`style-row-wearer-${name}`}
          data-wearer-node={wearer.nodeId}
          data-wearer-component={wearer.componentName}
          title={`Go to ${wearerLabel(wearer)} in ${wearer.componentName}`}
          onClick={() => onGoToWearer?.(wearer)}
        >
          <span className={css['WearerName']}>{wearerLabel(wearer)}</span>
          <span className={css['WearerWhere']}>{wearerLocation(wearer.componentName)}</span>
        </button>
      ))}

      {variants.map((variant) => (
        <div
          key={`${variant.typename}/${variant.name}`}
          className={css['WearerLook']}
          data-test={`style-row-wearer-look-${name}`}
          // Said in the row, not only in a tooltip: a tooltip is invisible to anyone who does not
          // hover, and this sentence is the reason the entry does not respond to a press.
          title="A Look is a rule, not a place on a canvas"
        >
          <span className={css['WearerName']}>{variant.name}</span>
          <span className={css['Badge']}>Look</span>
        </div>
      ))}
    </div>
  );
}

/** What a section draws instead of a list when the project has none of that thing yet. */
export function StyleSectionEmpty({ children }: { children: React.ReactNode }) {
  return <div className={css['Empty']}>{children}</div>;
}
