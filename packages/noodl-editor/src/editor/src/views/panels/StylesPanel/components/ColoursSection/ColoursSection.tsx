import { useProjectDesignTokenContext } from '@noodl-contexts/ProjectDesignTokenContext';
import React, { useMemo, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { StylesModel } from '@noodl-models/StylesModel';
import { escapeHtml } from '@noodl-utils/escapeHtml';

import { IconName } from '@noodl-core-ui/components/common/Icon';

import PopupLayer from '../../../../popuplayer';
import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { InlineNameInput, StylesSection } from '../../shared';
import css from '../../StylesPanel.module.scss';
import { StyleRow, StyleSectionEmpty } from '../StyleRow';

/**
 * Colours, both layers, in one list — R2's ruling ("both, in one panel, each row badged with which
 * system it came from") applied to the one type where the two layers actually collide.
 *
 * 🔴 They collide for real, not decoratively. `resolveColor` is ONE string with THREE meanings and
 * it checks colour styles FIRST, so a colour style named `--primary` silently **shadows** the token
 * of that name. Listing them apart, in two panels, is how nobody ever found that out.
 */
export interface ColoursSectionProps {
  stylesModel: StylesModel | null;
  /** Bumped on every `stylesChanged`; read so the list re-derives rather than caching a stale copy. */
  revision: number;
}

export function ColoursSection({ stylesModel, revision }: ColoursSectionProps) {
  const { designTokens, styleTokensModel } = useProjectDesignTokenContext();
  const [isCreating, setIsCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  const styles = useMemo(() => {
    if (!stylesModel) return [];
    return stylesModel.getStyles('colors');
    // `revision` is the dependency that matters — the model object itself never changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylesModel, revision]);

  const usage = useMemo(() => {
    if (!stylesModel) return {};
    return stylesModel.styleUsageCounts('colors');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylesModel, revision]);

  const colourTokens = useMemo(
    () => designTokens.filter((t) => t.category === 'color-semantic' || t.category === 'color-palette'),
    [designTokens]
  );

  function onCreate(name: string) {
    setIsCreating(false);
    if (!name || !stylesModel) return;

    if (stylesModel.styleExists('colors', name)) {
      ToastLayer.showError(`A colour style called ${name} already exists`);
      return;
    }

    // 🔴 STY-005 §3 — the value stored is the value this panel was given, and there is no port
    // anywhere near it. Richard's defect ("no matter what colour you choose it adds it
    // transparent") was `resolveColor(props.color)` reading a *port's committed value* instead of
    // the wheel; a new style here starts from a stated default that a person then edits, so the
    // failure has nothing to read from and cannot occur.
    stylesModel.setStyle('colors', name, DEFAULT_NEW_COLOUR, {
      undo: true,
      label: `create colour style: ${name}`
    });
    ToastLayer.showSuccess(`Created colour style ${name}`);
  }

  function onRename(oldName: string, newName: string) {
    setRenaming(null);
    if (!newName || newName === oldName || !stylesModel) return;

    if (stylesModel.styleExists('colors', newName)) {
      ToastLayer.showError(`A colour style called ${newName} already exists`);
      return;
    }

    // `changeStyleName` rewrites every node and every Look that names it, so a rename here is not
    // a relabel that leaves dangling references behind.
    stylesModel.changeStyleName('colors', oldName, newName, { undo: true, label: 'rename colour style' });
  }

  function onDelete(name: string) {
    if (!stylesModel) return;
    const { nodeCount, variantCount } = usage[name] ?? { nodeCount: 0, variantCount: 0 };

    const remove = () => stylesModel.deleteStyle('colors', name, { undo: true, label: 'delete colour style' });

    if (nodeCount === 0 && variantCount === 0) {
      remove();
      return;
    }

    PopupLayer.instance.showConfirmModal({
      title: 'CONFIRM DELETE COLOUR STYLE',
      // A style name is authored by a person or by the AI and `ConfirmModal` renders this through
      // `dangerouslySetInnerHTML` — escaped for the same reason FIX-003 escaped its twin.
      message:
        `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>?<br>` +
        `It is used by ${describeUsage(nodeCount, variantCount)}.`,
      confirmLabel: 'Yes, delete',
      onConfirm: remove
    });
  }

  return (
    <StylesSection
      title="Colours"
      subtitle="Named colours this project uses. A style is yours to change; a token comes from the design token set."
      isFirst
    >
      {styles.length === 0 && colourTokens.length === 0 && (
        <StyleSectionEmpty>No colours yet.</StyleSectionEmpty>
      )}

      {styles.map(({ name, style }) =>
        renaming === name ? (
          <InlineNameInput
            key={name}
            placeholder="New name"
            initialValue={name}
            onCommit={(value) => onRename(name, value)}
            onCancel={() => setRenaming(null)}
          />
        ) : (
          <StyleRow
            key={name}
            name={name}
            value={style}
            swatch={ProjectModel.instance?.resolveColor(style) ?? style}
            layer="Style"
            usageCount={(usage[name]?.nodeCount ?? 0) + (usage[name]?.variantCount ?? 0)}
            menuItems={[
              { label: 'Rename', icon: IconName.Pencil, onClick: () => setRenaming(name) },
              { label: 'Delete', icon: IconName.Trash, isDangerous: true, onClick: () => onDelete(name) }
            ]}
          />
        )
      )}

      {isCreating ? (
        <InlineNameInput placeholder="New colour style name" onCommit={onCreate} onCancel={() => setIsCreating(false)} />
      ) : (
        <button type="button" className={css['AddButton']} onClick={() => setIsCreating(true)} data-test="add-colour-style">
          ＋ New colour style
        </button>
      )}

      {colourTokens.map((token) => (
        <StyleRow
          key={token.name}
          name={token.name}
          value={token.value}
          swatch={styleTokensModel?.resolveToken(token.name) ?? token.value}
          layer="Token"
          menuItems={[
            {
              label: 'Copy reference',
              endSlot: `var(${token.name})`,
              onClick: () => {
                navigator.clipboard?.writeText(`var(${token.name})`);
                ToastLayer.showSuccess(`Copied var(${token.name})`);
              }
            },
            {
              label: 'Reset to default',
              icon: IconName.Reset,
              // A default token has nothing to reset to, and a menu item that does nothing is
              // worse than one that says why it cannot.
              isDisabled: !token.isCustom,
              tooltip: token.isCustom ? undefined : 'This token is already the default',
              onClick: () => styleTokensModel?.deleteCustomToken(token.name, { undo: true })
            }
          ]}
        />
      ))}
    </StylesSection>
  );
}

/**
 * The colour a new style starts as.
 *
 * 🔴 NOT transparent and not empty. Both of those are the shape of Richard's defect — "it adds it
 * transparent and you have to set it again once it's in the list" — and a swatch that resolves to
 * nothing is also invisible in both themes, which is how the old picker managed to show nothing on
 * 8 of its 11 rows. A new style is a colour you can see and then change.
 */
export const DEFAULT_NEW_COLOUR = '#808080';

export function describeUsage(nodeCount: number, variantCount: number): string {
  const parts: string[] = [];
  if (nodeCount) parts.push(`${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}`);
  if (variantCount) parts.push(`${variantCount} ${variantCount === 1 ? 'Look' : 'Looks'}`);
  return parts.join(' and ');
}
