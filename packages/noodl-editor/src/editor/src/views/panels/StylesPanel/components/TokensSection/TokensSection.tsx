/**
 * P94 STY-005: the token sections of the Styles panel.
 *
 * Shows the design tokens of ONE group (Spacing, Typography, …) as a top-level section of the
 * panel, every row editable. Token rows show a visual preview and the current value.
 *
 * Moved here from `DesignTokenPanel/components/DesignTokensTab` when STY-005 retired that panel
 * (R3). 🔴 It was NOT scaffolding like the `ColorsTab` beside it: it is a working, undoable token
 * editor, and `TokenCategorySection` under it is held by `tests-unit/fix-015/token-row-editing`.
 * The retirement deleted the shell and the placeholder tab; this survived the move.
 *
 * 🔴 **P103 CMG-005: one section per group, no "Other tokens".** Until 2026-09-24 this component
 * drew every non-colour group inside ONE outer section titled *Other tokens*, closed, with every
 * group inside it closed too — so the composer P102 built sat two closed levels down under a word
 * that says *unimportant*. Richard: *"The typography and animation bits are important, they're not
 * 'Other'."* The outer wrapper is gone; `StylesPanel` now draws Type, Spacing, Borders, Effects and
 * Motion as peers of Colours and Looks, each through this component, and the panel (not this file)
 * owns which are open so `revealStyle` can open one from outside.
 *
 * ⚠️ The reason the wrapper existed was real and is answered differently now: the groups used to
 * read as *the same layer* as Colours and Looks. They ARE tokens, and every row is badged and
 * previewed as one; the section subtitle says what the section holds in a sentence. The confusion
 * R2's badges exist to prevent was one level up; the subtitle is that level's badge.
 *
 * **P103 CMG-002: ＋ in the header, copy on every row, delete on a token you added.** Richard:
 * *"How do I add a token? In all the token lists there's no button to add one … is that normal??"*
 * It was not. `StyleTokensModel.addCustomToken` existed with one caller, a unit test.
 */

import { isComposerCategory } from '@nodegx/project-contract/token-codecs';
import { useProjectDesignTokenContext } from '@noodl-contexts/ProjectDesignTokenContext';
import React, { useEffect, useRef, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { StyleTokenRecord, TokenCategoryGroup, TokenResolver, groupForTokenCategory } from '@noodl-models/StyleTokensModel';
import { tokenNameFromInput, tokenNameProblem } from '@noodl-models/StyleTokensModel/tokenName';
import { kindsForGroup, startingValueFor, type TokenKind } from '@noodl-models/StyleTokensModel/tokenKinds';
import { describeTokenUsage, tokenUsageAll, tokenUsageCount, tokenUsageIn } from '@noodl-models/StyleTokensModel/tokenUsage';
import { escapeHtml } from '@noodl-utils/escapeHtml';

import PopupLayer from '../../../../popuplayer';
import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { openTokenComposer } from '../../composer/openTokenComposer';
import { SectionReset, StylesSection, useGoToWearer, useLooksRevision, useOpenUsageRow } from '../../shared';
import css from '../../StylesPanel.module.scss';
import { REVEAL_HIGHLIGHT_MS, StylesSectionSpec, revealStyle, styleRowSelector } from '../../stylesPanelRoute';
import { TokenCategorySection } from '../TokenCategorySection';

export interface TokenGroupSectionProps {
  /** Which section this is: its id, title, subtitle and the token group it draws. */
  section: StylesSectionSpec & { group: TokenCategoryGroup };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isFirst?: boolean;
  /** CMG-004: *Reset N* in the header, when N > 0. */
  reset?: SectionReset;
}

/** How long `Collapsible` takes to open a section, before a new row can be scrolled to. */
const SECTION_OPEN_MS = 450;

export function TokenGroupSection({ section, isOpen, onOpenChange, isFirst, reset }: TokenGroupSectionProps) {
  const { designTokens, styleTokensModel } = useProjectDesignTokenContext();
  const [isAdding, setIsAdding] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // The token just added: scrolled to and highlighted once its row exists, and for a composer
  // kind the composer opens on it (§3.1) — the same as *Make this a token* on a node.
  const pendingReveal = useRef<{ name: string; compose: boolean } | null>(null);

  const tokens = React.useMemo(
    () =>
      designTokens.filter((token) => {
        // Reads TOKEN_CATEGORIES (through `groupForTokenCategory`) — which is what the comment
        // here always claimed and, until HLT-007, was not what the code did.
        return getGroupForToken(token) === section.group;
      }),
    [designTokens, section.group]
  );

  // P102 CMP-001 §3 — every preview resolves the `var()`s inside it. One resolver per token set,
  // so a gradient built from `var(--primary)` paints the project's blue rather than nothing.
  const resolve = React.useMemo(() => {
    const resolver = new TokenResolver(new Map(designTokens.map((t) => [t.name, t])));
    return (value: string) => resolver.resolveInline(value);
  }, [designTokens]);

  // ─── Used by (CMG-010 §3.3) ─────────────────────────────────────────────────
  // One walk for every row of this section, redone when the tokens change, when a Look changes,
  // or when the section is opened (a node edited while it was closed is read on the next open).
  const looksRevision = useLooksRevision();
  const usage = React.useMemo(
    () => (isOpen ? tokenUsageAll(ProjectModel.instance, designTokens) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [designTokens, looksRevision, isOpen]
  );
  const [openUsage, toggleUsage] = useOpenUsageRow();
  const goToWearer = useGoToWearer();
  const goToToken = React.useCallback((name: string) => revealStyle({ kind: 'token', name }), []);

  const onOpenComposer = React.useCallback(
    (token: StyleTokenRecord, anchor: HTMLElement) => {
      if (!styleTokensModel) return;
      openTokenComposer({ token, anchor, tokens: designTokens, model: styleTokensModel });
    },
    [designTokens, styleTokensModel]
  );

  // ─── Add (§3.1) ─────────────────────────────────────────────────────────────

  function onAdd(kind: TokenKind, input: string, value: string) {
    if (!styleTokensModel) return;
    const name = tokenNameFromInput(input);
    setIsAdding(false);
    pendingReveal.current = { name, compose: isComposerCategory(kind.category) };
    // 🔴 `addCustomToken`, never `setToken`: an unknown name through `setToken` is filed as
    // `color-semantic` by its fallback, so a new spacing token would be drawn under Colours.
    styleTokensModel.addCustomToken(
      { name, value, category: kind.category },
      { undo: true, label: `Add token ${name}` }
    );
    ToastLayer.showSuccess(`Added ${name} — ⌘Z removes it`);
  }

  useEffect(() => {
    const pending = pendingReveal.current;
    if (!pending || !tokens.some((t) => t.name === pending.name)) return;
    pendingReveal.current = null;
    const land = () => {
      const row = rootRef.current?.querySelector<HTMLElement>(styleRowSelector(pending.name));
      if (!row) return;
      row.scrollIntoView({ block: 'center' });
      row.setAttribute('data-revealed', 'true');
      window.setTimeout(() => row.removeAttribute('data-revealed'), REVEAL_HIGHLIGHT_MS);
      const token = tokens.find((t) => t.name === pending.name);
      if (pending.compose && token) onOpenComposer(token, row);
    };
    const t = window.setTimeout(land, isOpen ? 50 : SECTION_OPEN_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  // ─── Copy (§3.3) and delete (§3.2) ─────────────────────────────────────────

  const onCopy = React.useCallback((token: StyleTokenRecord) => {
    navigator.clipboard?.writeText(`var(${token.name})`);
    ToastLayer.showSuccess(`Copied var(${token.name})`);
  }, []);

  const onDelete = React.useCallback(
    (token: StyleTokenRecord) => {
      if (!styleTokensModel) return;
      const remove = () => {
        styleTokensModel.deleteCustomToken(token.name, { undo: true, label: `Delete ${token.name}` });
        ToastLayer.showSuccess(`Deleted ${token.name} — ⌘Z brings it back`);
      };
      // The reach, counted before anything is deleted, through the one walk CMG-010's *Used by*
      // reads too ([[count-the-reach-first]]).
      const usage = tokenUsageIn(ProjectModel.instance, designTokens, token.name);
      if (tokenUsageCount(usage) === 0) {
        remove();
        return;
      }
      PopupLayer.instance.showConfirmModal({
        title: 'DELETE TOKEN',
        message:
          `Delete <strong>${escapeHtml(token.name)}</strong>?<br>` +
          `${escapeHtml(describeTokenUsage(usage))}. They will fall back to their own value.`,
        confirmLabel: 'Yes, delete',
        onConfirm: remove
      });
    },
    [styleTokensModel, designTokens]
  );

  const kinds = kindsForGroup(section.group);

  const addButton = (
    <button
      type="button"
      className={css['SectionAdd']}
      data-test={`section-add-${section.id}`}
      title={`Add a ${section.title.toLowerCase()} token`}
      aria-label={`Add a ${section.title.toLowerCase()} token`}
      onClick={() => {
        setIsAdding(true);
        onOpenChange(true);
      }}
    >
      ＋
    </button>
  );

  return (
    <div ref={rootRef} data-token-group={section.id}>
      <StylesSection
        id={section.id}
        title={section.title}
        subtitle={section.subtitle}
        isFirst={isFirst}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        reset={reset}
        actions={kinds.length > 0 ? addButton : undefined}
      >
        {isAdding && (
          <AddTokenRow
            kinds={kinds}
            tokens={designTokens}
            onAdd={onAdd}
            onCancel={() => setIsAdding(false)}
          />
        )}
        <TokenCategorySection
          tokens={tokens}
          onTokenChange={(name, value) => styleTokensModel?.setToken(name, value, { undo: true })}
          // CMG-004: a default token goes back to its default; a token somebody added is not
          // "reset" by this button — `resetTokens` skips it, and deleting is its own button.
          onTokenReset={(name) => styleTokensModel?.resetTokens([name], { undo: true, label: `Reset ${name}` })}
          resolve={resolve}
          onOpenComposer={onOpenComposer}
          onCopy={onCopy}
          onDelete={onDelete}
          usage={usage}
          openUsage={openUsage}
          onToggleUsage={toggleUsage}
          onGoToWearer={goToWearer}
          onGoToToken={goToToken}
        />
      </StylesSection>
    </div>
  );
}

/**
 * The row the ＋ opens: a name (the `--` is drawn, not typed), a kind when the section holds more
 * than one, and the value it starts at (a copy of the last of its kind). Refused inline: an empty,
 * spaced, punctuated or taken name (CMG-003's rule). Enter adds, Escape cancels.
 */
function AddTokenRow({
  kinds,
  tokens,
  onAdd,
  onCancel
}: {
  kinds: TokenKind[];
  tokens: StyleTokenRecord[];
  onAdd: (kind: TokenKind, name: string, value: string) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<TokenKind>(kinds[0]);
  const [name, setName] = useState('');
  const [value, setValue] = useState(() => startingValueFor(kinds[0].category, tokens));
  const [problem, setProblem] = useState<string | null>(null);

  function pickKind(category: string) {
    const next = kinds.find((k) => k.category === category) ?? kinds[0];
    setKind(next);
    setValue(startingValueFor(next.category, tokens));
  }

  function submit() {
    const existing = new Set(tokens.map((t) => t.name));
    const why = tokenNameProblem(name, existing);
    if (why) {
      setProblem(why);
      return;
    }
    const v = value.trim();
    if (v === '') {
      setProblem('Give it a value');
      return;
    }
    onAdd(kind, name, v);
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div className={css['AddTokenRow']} data-test="add-token-row">
      <div className={css['AddTokenLine']}>
        <span className={css['AddTokenPrefix']}>--</span>
        <input
          className={css['InlineInput']}
          autoFocus
          value={name}
          placeholder={kind.word === 'Spacing' ? 'space-huge' : `my-${kind.word.toLowerCase().replace(/\s+/g, '-')}`}
          spellCheck={false}
          data-test="add-token-name"
          onChange={(e) => {
            setName(e.target.value);
            setProblem(null);
          }}
          onKeyDown={onKey}
        />
        {kinds.length > 1 && (
          <select
            className={css['AddTokenKind']}
            value={kind.category}
            data-test="add-token-kind"
            aria-label="What kind of token"
            onChange={(e) => pickKind(e.target.value)}
          >
            {kinds.map((k) => (
              <option key={k.category} value={k.category}>
                {k.word}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className={css['AddTokenLine']}>
        <span className={css['AddTokenLabel']}>Starts as</span>
        <input
          className={css['InlineInput']}
          value={value}
          spellCheck={false}
          aria-label="Starting value"
          data-test="add-token-value"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="button" className={css['AddTokenButton']} data-test="add-token-submit" onClick={submit}>
          Add
        </button>
        <button type="button" className={css['AddTokenCancel']} onClick={onCancel} title="Cancel (Escape)">
          ✕
        </button>
      </div>
      {problem && (
        <div className={css['InlineError']} data-test="add-token-problem">
          {problem}
        </div>
      )}
    </div>
  );
}

/**
 * Determine the display group from a token's category — by READING the table,
 * not by restating it.
 *
 * 🔴 **This used to be a second copy of `TOKEN_CATEGORIES`** and it failed closed
 * in the worst possible way: an unmapped category returned `null`, the token was
 * dropped from `grouped`, and the panel rendered as though it did not exist —
 * while `get_style_vocabulary` listed it to the authoring model perfectly happily.
 * VIB-002 hit exactly that adding the `gradient` category: the tokens were live in
 * the rendered page and invisible in the editor.
 *
 * ⚠️ **The comment that kept the copy alive was false, and it sat four lines below
 * the import that disproved it** (HLT-007, 2026-09-21). It claimed importing the
 * table "would close a circular import". `TOKEN_CATEGORIES` and
 * `TOKEN_CATEGORY_GROUPS` are exported from the SAME line of the SAME barrel
 * (`StyleTokensModel/index.ts`), and this file already imported the second one —
 * so the edge existed already and reading the table adds nothing to the graph.
 * A justification is not evidence; check it against the file it is written in.
 *
 * ✅ **The drift is now impossible rather than discouraged.** `TOKEN_CATEGORIES` is
 * `Record<TokenCategory, …>`, so a category added to the contract without a table
 * entry is a **compile error**, which is the build-time check the old docblock's
 * "remember to edit both places" rule was standing in for.
 */
function getGroupForToken(token: StyleTokenRecord): TokenCategoryGroup | null {
  const group = groupForTokenCategory(String(token.category));
  if (group) return group;

  // Not reachable from a well-typed category — but token records are read from a
  // project file on disk, so the category CAN be a string no build ever saw. Drop
  // it (no group can hold it without lying about what it is) and say so once, because
  // a token vanishing from the panel in silence is the defect this function had.
  warnUnknownCategory(String(token.category));
  return null;
}

/** One line per unknown category, not one per token per render. */
const warnedCategories = new Set<string>();
function warnUnknownCategory(category: string) {
  if (warnedCategories.has(category)) return;
  warnedCategories.add(category);
  console.warn(
    `[StylesPanel] design token category '${category}' has no entry in TOKEN_CATEGORIES, ` +
      'so its tokens are not shown in the Styles panel. Add it to ' +
      'models/StyleTokensModel/TokenCategories.ts.'
  );
}
