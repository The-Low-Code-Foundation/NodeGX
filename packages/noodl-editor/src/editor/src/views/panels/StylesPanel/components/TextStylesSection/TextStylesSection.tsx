import React, { useMemo, useState } from 'react';

import { StylesModel } from '@noodl-models/StylesModel';
import { escapeHtml } from '@noodl-utils/escapeHtml';

import { IconName } from '@noodl-core-ui/components/common/Icon';

import PopupLayer from '../../../../popuplayer';
import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { InlineNameInput, StylesSection } from '../../shared';
import css from '../../StylesPanel.module.scss';
import { StyleRow, StyleSectionEmpty } from '../StyleRow';
import { describeUsage } from '../ColoursSection/ColoursSection';

export interface TextStylesSectionProps {
  stylesModel: StylesModel | null;
  revision: number;
}

export function TextStylesSection({ stylesModel, revision }: TextStylesSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  const styles = useMemo(() => {
    if (!stylesModel) return [];
    return stylesModel.getStyles('text');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylesModel, revision]);

  const usage = useMemo(() => {
    if (!stylesModel) return {};
    return stylesModel.styleUsageCounts('text');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylesModel, revision]);

  function onCreate(name: string) {
    setIsCreating(false);
    if (!name || !stylesModel) return;

    if (stylesModel.styleExists('text', name)) {
      ToastLayer.showError(`A text style called ${name} already exists`);
      return;
    }

    // 🔴 Token-authored, not a hard-coded pixel size. A text style created here is the shape the
    // whole phase is arguing for — every field NAMES its source (design §2 rule 2) — and a new one
    // that starts life as `16px` teaches the opposite on the first row a person ever makes.
    stylesModel.setStyle('text', name, { ...DEFAULT_NEW_TEXT_STYLE }, {
      undo: true,
      label: `create text style: ${name}`
    });
    ToastLayer.showSuccess(`Created text style ${name}`);
  }

  function onRename(oldName: string, newName: string) {
    setRenaming(null);
    if (!newName || newName === oldName || !stylesModel) return;

    if (stylesModel.styleExists('text', newName)) {
      ToastLayer.showError(`A text style called ${newName} already exists`);
      return;
    }

    stylesModel.changeStyleName('text', oldName, newName, { undo: true, label: 'rename text style' });
  }

  function onDelete(name: string) {
    if (!stylesModel) return;
    const { nodeCount, variantCount } = usage[name] ?? { nodeCount: 0, variantCount: 0 };

    const remove = () => stylesModel.deleteStyle('text', name, { undo: true, label: 'delete text style' });

    if (nodeCount === 0 && variantCount === 0) {
      remove();
      return;
    }

    PopupLayer.instance.showConfirmModal({
      title: 'CONFIRM DELETE TEXT STYLE',
      message:
        `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>?<br>` +
        `It is used by ${describeUsage(nodeCount, variantCount)}.`,
      confirmLabel: 'Yes, delete',
      onConfirm: remove
    });
  }

  return (
    <StylesSection
      title="Text styles"
      subtitle="A bundle of font settings a Text or a Button can wear by name."
    >
      {styles.length === 0 && <StyleSectionEmpty>No text styles yet.</StyleSectionEmpty>}

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
            value={summariseTextStyle(style)}
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
        <InlineNameInput placeholder="New text style name" onCommit={onCreate} onCancel={() => setIsCreating(false)} />
      ) : (
        <button type="button" className={css['AddButton']} onClick={() => setIsCreating(true)} data-test="add-text-style">
          ＋ New text style
        </button>
      )}
    </StylesSection>
  );
}

/** See `onCreate` — this names its sources rather than stating values. */
export const DEFAULT_NEW_TEXT_STYLE = {
  fontSize: 'var(--text-base)',
  fontWeight: 'var(--font-normal)',
  lineHeight: 'var(--leading-normal)'
};

/**
 * What a text style row prints under its name.
 *
 * It says the size and the weight because those are what tell two text styles apart at a glance,
 * and it prints the value **as stored** — `var(--text-base)` stays `var(--text-base)`. Resolving it
 * to `16px` here would be this panel teaching, on every row, the exact habit the phase exists to
 * replace.
 */
export function summariseTextStyle(style: TSFixme): string {
  if (!style || typeof style !== 'object') return '';

  const parts = [style.fontSize, style.fontWeight, style.fontFamily].filter(
    (p) => typeof p === 'string' && p.length > 0
  );

  return parts.join(' · ');
}
