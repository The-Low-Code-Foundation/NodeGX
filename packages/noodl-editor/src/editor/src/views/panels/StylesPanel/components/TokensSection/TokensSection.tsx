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
 */

import { useProjectDesignTokenContext } from '@noodl-contexts/ProjectDesignTokenContext';
import React from 'react';

import { StyleTokenRecord, TokenCategoryGroup, TokenResolver, groupForTokenCategory } from '@noodl-models/StyleTokensModel';

import { openTokenComposer } from '../../composer/openTokenComposer';
import { StylesSection } from '../../shared';
import { StylesSectionSpec } from '../../stylesPanelRoute';
import { TokenCategorySection } from '../TokenCategorySection';

export interface TokenGroupSectionProps {
  /** Which section this is: its id, title, subtitle and the token group it draws. */
  section: StylesSectionSpec & { group: TokenCategoryGroup };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isFirst?: boolean;
  /** CMG-002 / CMG-004 put their header controls here. */
  actions?: React.ReactNode;
}

export function TokenGroupSection({ section, isOpen, onOpenChange, isFirst, actions }: TokenGroupSectionProps) {
  const { designTokens, styleTokensModel } = useProjectDesignTokenContext();

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

  const onOpenComposer = React.useCallback(
    (token: StyleTokenRecord, anchor: HTMLElement) => {
      if (!styleTokensModel) return;
      openTokenComposer({ token, anchor, tokens: designTokens, model: styleTokensModel });
    },
    [designTokens, styleTokensModel]
  );

  return (
    <StylesSection
      id={section.id}
      title={section.title}
      subtitle={section.subtitle}
      isFirst={isFirst}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      actions={actions}
    >
      <TokenCategorySection
        tokens={tokens}
        onTokenChange={(name, value) => styleTokensModel?.setToken(name, value, { undo: true })}
        onTokenReset={(name) => styleTokensModel?.deleteCustomToken(name, { undo: true })}
        resolve={resolve}
        onOpenComposer={onOpenComposer}
      />
    </StylesSection>
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
