import { useProjectDesignTokenContext } from '@noodl-contexts/ProjectDesignTokenContext';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
// The leaf modules, not the barrel — see TokenCategorySection's note on the `Tests: 0` it causes.
import { buildDefaultTokenMap } from '@noodl-models/StyleTokensModel/DefaultTokens';
import { tokenNameFromInput, tokenNameProblem } from '@noodl-models/StyleTokensModel/tokenName';
import { allColourTokens } from '@noodl-models/StyleTokensModel/TokensForPicking';
import { StylesModel } from '@noodl-models/StylesModel';
import { escapeHtml } from '@noodl-utils/escapeHtml';

import { IconName } from '@noodl-core-ui/components/common/Icon';
import { CollapsableSection } from '@noodl-core-ui/components/sidebar/CollapsableSection';
import { SectionVariant } from '@noodl-core-ui/components/sidebar/Section';

import { PreviewTokenInjector } from '../../../../../services/PreviewTokenInjector';
import PopupLayer from '../../../../popuplayer';
import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import ColorPicker from '../../../propertyeditor/DataTypes/ColorPicker/colorpicker';
import { InlineNameInput, SectionReset, StylesSection, useGoToWearer, useOpenUsageRow } from '../../shared';
import css from '../../StylesPanel.module.scss';
import { StylesSectionSpec } from '../../stylesPanelRoute';
import { describeUsage } from '../../format';
import { StyleRow, StyleSectionEmpty } from '../StyleRow';

/**
 * Colours, both layers, in one list — R2's ruling ("both, in one panel, each row badged with which
 * system it came from") applied to the one type where the two layers actually collide.
 *
 * 🔴 They collide for real, not decoratively. `resolveColor` is ONE string with THREE meanings and
 * it checks colour styles FIRST, so a colour style named `--primary` silently **shadows** the token
 * of that name. Listing them apart, in two panels, is how nobody ever found that out.
 *
 * 🔴 **P103 CMG-003 (RC-9): *New colour* makes a TOKEN, and every swatch opens the picker.**
 * Richard, driving P102: *"When I add a new 'colour style', it just gives me grey by default and I
 * can't change the colour. Shouldn't this just be a design token? There's already loads of
 * colours in there."* Until then the button wrote `#808080` into the OLD layer, and the panel had
 * no way to change any colour's value — the only picker was on a node's colour field. Now a new
 * colour is a `color-palette` token, the picker opens on it the moment it exists, and the swatch of
 * every row — token or old style — opens the same picker. Old colour styles stay: listed, renamed,
 * deleted, and now edited; nothing migrates them.
 */
export interface ColoursSectionProps {
  section: StylesSectionSpec;
  stylesModel: StylesModel | null;
  /** Bumped on every `stylesChanged`; read so the list re-derives rather than caching a stale copy. */
  revision: number;
  isFirst?: boolean;
  /** CMG-005: the panel owns the open state, so `revealStyle` can open this from outside. */
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** The closed *Design tokens (N)* list inside — opened by a reveal of a colour token, or a new one. */
  isTokensOpen: boolean;
  onTokensOpenChange: (open: boolean) => void;
  /** CMG-004: *Reset N* in the header for the colour tokens that differ from their defaults. */
  reset?: SectionReset;
}

/** How long `Collapsible` takes to open the token list, before a new row can anchor a popout. */
const LIST_OPEN_MS = 450;

export function ColoursSection({
  section,
  stylesModel,
  revision,
  isFirst,
  isOpen,
  onOpenChange,
  isTokensOpen,
  onTokensOpenChange,
  reset
}: ColoursSectionProps) {
  const { designTokens, styleTokensModel } = useProjectDesignTokenContext();
  const [isCreating, setIsCreating] = useState(false);
  const [createProblem, setCreateProblem] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [openUsage, toggleUsage] = useOpenUsageRow();
  const goToWearer = useGoToWearer();
  // The token just made, whose picker opens as soon as its row is on screen (CMG-003 §3.1).
  const pendingPick = useRef<string | null>(null);

  const styles = useMemo(() => {
    if (!stylesModel) return [];
    return stylesModel.getStyles('colors');
    // `revision` is the dependency that matters — the model object itself never changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylesModel, revision]);

  /**
   * P94 STY-006 — what names each colour style, by identity.
   *
   * 🔴 **The count below is a `.length` over THIS, not a second call to `styleUsageCounts`.** Two
   * calls would be two walks a re-render apart, and a row that says `9×` above eight lines is a
   * panel nobody can trust about the number *or* the list. One walk, read twice.
   */
  const wearers = useMemo(() => {
    if (!stylesModel) return {};
    return stylesModel.styleWearers('colors');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylesModel, revision]);

  const countFor = (name: string) =>
    (wearers[name]?.nodes.length ?? 0) + (wearers[name]?.variants.length ?? 0);

  // HLT-006 — through the shared enumeration, not a local predicate. The picker offers the same
  // population and a second copy of "which category counts as a colour" is how HLT-007(b) happened.
  const colourTokens = useMemo(() => allColourTokens(designTokens), [designTokens]);

  // ─── The picker (CMG-003 §3.2) ───────────────────────────────────────────────

  /**
   * The same `ColorPicker` popout the property panel's colour-style picker opens
   * (`colorstylepicker.jsx` → `onEditValue`), anchored to the row's swatch.
   */
  function openPicker(anchor: HTMLElement, initial: string, write: ColourWriter) {
    const picker = new ColorPicker();
    picker.render();
    picker.setColor(initial);
    picker.setColorChangedListener((hex, commit) => {
      if (commit) write.commit(hex);
      else write.move?.(hex);
    });
    PopupLayer.instance.showPopout({
      content: picker,
      attachTo: anchor,
      position: 'right',
      onClose: () => {
        picker.dispose();
        write.closed?.();
      }
    });
  }

  /** A colour TOKEN: the draft paints the canvas while dragging (RC-7), one undo step per commit. */
  function tokenWriter(name: string): ColourWriter {
    const injector = PreviewTokenInjector.instance;
    return {
      move: (hex) => injector.setDraft(name, hex),
      commit: (hex) => {
        injector.clearDraft();
        styleTokensModel?.setToken(name, hex, { undo: true, label: `Change ${name}` });
      },
      closed: () => injector.clearDraft()
    };
  }

  /** An old colour STYLE: exactly what `colorstylepicker.jsx` does, so the two doors agree. */
  function styleWriter(name: string): ColourWriter {
    return {
      commit: (hex) => stylesModel?.setStyle('colors', name, hex, { undo: true, label: 'change colour style' })
    };
  }

  /** The row, as the popout's anchor: beside the panel, not over the list (see `StyleRow`). */
  const swatchOf = (name: string): HTMLElement | null =>
    document.querySelector<HTMLElement>(`[data-test="style-row-swatch-${cssAttr(name)}"]`)?.closest('[data-style-row]') ??
    null;

  const pickToken = (name: string, anchor?: HTMLElement | null) => {
    const el = anchor ?? swatchOf(name);
    if (!el) return;
    openPicker(el, styleTokensModel?.resolveToken(name) ?? '#000000', tokenWriter(name));
  };

  const pickStyle = (name: string, value: string, anchor?: HTMLElement | null) => {
    const el = anchor ?? swatchOf(name);
    if (!el) return;
    openPicker(el, ProjectModel.instance?.resolveColor(value) ?? value, styleWriter(name));
  };

  // A token made a moment ago: once its row exists (and the list holding it is open), pick.
  useEffect(() => {
    const name = pendingPick.current;
    if (!name || !designTokens.some((t) => t.name === name)) return;
    pendingPick.current = null;
    const t = window.setTimeout(() => pickToken(name), isTokensOpen ? 50 : LIST_OPEN_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designTokens]);

  // ─── Create (CMG-003 §3.1) ──────────────────────────────────────────────────

  /**
   * A colour a person can see, then change: the colour of the row above the new one (the last
   * colour token, else the last colour style), never grey and never transparent — both were the
   * shape of Richard's earlier defect (*"it adds it transparent and you have to set it again"*).
   */
  function startingColour(): string {
    const lastToken = colourTokens[colourTokens.length - 1];
    if (lastToken) return styleTokensModel?.resolveToken(lastToken.name) ?? lastToken.value;
    const lastStyle = styles[styles.length - 1];
    if (lastStyle) return ProjectModel.instance?.resolveColor(lastStyle.style) ?? lastStyle.style;
    return buildDefaultTokenMap().get('--primary')?.value ?? '#2563eb';
  }

  function onCreate(input: string) {
    if (!styleTokensModel) return;
    const existing = new Set<string>([...designTokens.map((t) => t.name), ...styles.map((s) => s.name)]);
    const problem = tokenNameProblem(input, existing);
    if (problem) {
      // Refused inline — the field stays, the reason sits under it, nothing is written.
      setCreateProblem(problem);
      return;
    }
    const name = tokenNameFromInput(input);
    setIsCreating(false);
    setCreateProblem(null);
    pendingPick.current = name;
    onTokensOpenChange(true);
    // 🔴 `addCustomToken`, never `setToken`: an unknown name through `setToken` is filed as
    // `color-semantic` by its fallback. RC-9 says a new colour is a palette token.
    styleTokensModel.addCustomToken(
      { name, value: startingColour(), category: 'color-palette' },
      { undo: true, label: `New colour ${name}` }
    );
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
    // Read off the SAME walk the row's number and its list came from, so the delete-confirm's
    // sentence cannot name a different population from the one the person just looked at.
    const nodeCount = wearers[name]?.nodes.length ?? 0;
    const variantCount = wearers[name]?.variants.length ?? 0;

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
      id={section.id}
      title={section.title}
      subtitle={section.subtitle}
      isFirst={isFirst}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      reset={reset}
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
            onSwatchClick={(anchor) => pickStyle(name, style, anchor)}
            layer="Style"
            usageCount={countFor(name)}
            wearers={wearers[name]}
            isUsageOpen={openUsage === name}
            onToggleUsage={() => toggleUsage(name)}
            onGoToWearer={goToWearer}
            menuItems={[
              { label: 'Edit colour', icon: IconName.Palette, onClick: () => pickStyle(name, style) },
              { label: 'Rename', icon: IconName.Pencil, onClick: () => setRenaming(name) },
              { label: 'Delete', icon: IconName.Trash, isDangerous: true, onClick: () => onDelete(name) }
            ]}
          />
        )
      )}

      {isCreating ? (
        <>
          <InlineNameInput
            placeholder="Name, like brand-orange"
            onCommit={onCreate}
            onCancel={() => {
              setIsCreating(false);
              setCreateProblem(null);
            }}
          />
          {createProblem && (
            <div className={css['InlineError']} data-test="new-colour-problem">
              {createProblem}
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          className={css['AddButton']}
          onClick={() => setIsCreating(true)}
          data-test="add-colour"
          title="A new colour token: name it, then pick the colour"
        >
          ＋ New colour
        </button>
      )}

      {/*
        🔴 CLOSED, and the count is on the heading.

        Measured on a real project: this list is **88 rows**. Drawn open beside nine colour styles
        it buried them, and pushed Text styles and Looks so far below the fold that someone opening
        the panel to find their Looks scrolled past ninety colour swatches to get there. The tokens
        still belong in this section — R2 is that both layers are in ONE list and this is the one
        type where they actually collide — but the layer a person came to MANAGE is the one that
        should be on screen when the panel opens. The heading says how many are behind it, so the
        set is never a surprise.
      */}
      <CollapsableSection
        title={`Design tokens (${colourTokens.length})`}
        variant={SectionVariant.Panel}
        sectionId="colour-tokens"
        isCollapsed={!isTokensOpen}
        onCollapsedChange={(collapsed) => onTokensOpenChange(!collapsed)}
        UNSAFE_style={{ marginTop: '4px' }}
      >
        {colourTokens.map((token) => (
          <StyleRow
            key={token.name}
            name={token.name}
            value={token.value}
            swatch={styleTokensModel?.resolveToken(token.name) ?? token.value}
            onSwatchClick={(anchor) => pickToken(token.name, anchor)}
            layer="Token"
            menuItems={[
              { label: 'Edit colour', icon: IconName.Palette, onClick: () => pickToken(token.name) },
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
                // A token at its default has nothing to reset to, and a menu item that does nothing
                // is worse than one that says why it cannot. CMG-004: "at its default" is read off
                // the VALUE, not off `isCustom` — a pinned default is not a change — and a token
                // somebody added has no default at all, so it is never "reset" (deleting is CMG-002).
                isDisabled: !canReset(token),
                tooltip: canReset(token)
                  ? undefined
                  : defaultValueOf(token.name) === undefined
                  ? 'You added this token — it has no default'
                  : 'This token is already the default',
                endSlot: canReset(token) ? defaultValueOf(token.name) : undefined,
                onClick: () => styleTokensModel?.resetTokens([token.name], { undo: true, label: `Reset ${token.name}` })
              }
            ]}
          />
        ))}
      </CollapsableSection>
    </StylesSection>
  );
}

/** What a picker does with the colour: while dragging (optional), on commit, and when it closes. */
interface ColourWriter {
  move?: (hex: string) => void;
  commit: (hex: string) => void;
  closed?: () => void;
}

/** A style or token name inside a `data-test` selector: quotes and backslashes escaped. */
function cssAttr(name: string): string {
  return name.replace(/["\\]/g, '\\$&');
}

/** What *Reset to default* puts a colour token back to — said on the item, not discovered after. */
const DEFAULTS = buildDefaultTokenMap();
function defaultValueOf(name: string): string | undefined {
  return DEFAULTS.get(name)?.value;
}
function canReset(token: { name: string; value: string }): boolean {
  const def = defaultValueOf(token.name);
  return def !== undefined && def !== token.value;
}
