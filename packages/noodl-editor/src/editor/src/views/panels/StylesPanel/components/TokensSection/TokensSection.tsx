/**
 * P94 STY-005: the Tokens section of the Styles panel.
 *
 * Shows every design token grouped by category (Colors, Spacing, etc.).
 * Each group is collapsible. Token rows show a visual preview and the current value.
 *
 * Moved here from `DesignTokenPanel/components/DesignTokensTab` when STY-005 retired that panel
 * (R3). 🔴 It was NOT scaffolding like the `ColorsTab` beside it: it is a working, undoable token
 * editor, and `TokenCategorySection` under it is held by `tests-unit/fix-015/token-row-editing`.
 * The retirement deleted the shell and the placeholder tab; this survived the move.
 */

import { useProjectDesignTokenContext } from '@noodl-contexts/ProjectDesignTokenContext';
import React from 'react';

import {
  StyleTokenRecord,
  TOKEN_CATEGORY_GROUPS,
  TokenCategoryGroup,
  groupForTokenCategory
} from '@noodl-models/StyleTokensModel';

import { CollapsableSection } from '@noodl-core-ui/components/sidebar/CollapsableSection';
import { SectionVariant } from '@noodl-core-ui/components/sidebar/Section';

import { TokenCategorySection } from '../TokenCategorySection';

export interface TokensSectionProps {
  /**
   * The heading this whole set sits under.
   *
   * 🔴 Without it the group sections — Spacing, Borders, Effects, Animation — were drawn as PEERS
   * of Colours, Text styles and Looks, with nothing anywhere saying they were tokens. Read off the
   * rendered panel, the headings were `Colours | Text styles | Looks | Spacing | Borders | Effects
   * | Animation`: seven things, four of which a person had no way to know were a different layer
   * from the other three. That is the exact confusion R2 made the badges for, reappearing one
   * level up.
   */
  title?: string;
  /**
   * Groups the Styles panel already draws elsewhere, beside the styles they collide with. Left
   * out here so that no token is editable in two places on one screen — see `StylesPanel.tsx`.
   * Omitted entirely, this renders every group, which is what it did as a tab of its own.
   */
  excludeGroups?: TokenCategoryGroup[];
}

export function TokensSection({ excludeGroups, title }: TokensSectionProps = {}) {
  const { designTokens, styleTokensModel } = useProjectDesignTokenContext();
  const shownGroups = React.useMemo(
    () => TOKEN_CATEGORY_GROUPS.filter((g) => !(excludeGroups ?? []).includes(g)),
    [excludeGroups]
  );

  // Group tokens by their display group
  const grouped = React.useMemo(() => {
    const map: Partial<Record<TokenCategoryGroup, StyleTokenRecord[]>> = {};
    for (const group of TOKEN_CATEGORY_GROUPS) {
      map[group] = [];
    }
    for (const token of designTokens) {
      // Reads TOKEN_CATEGORIES (through `groupForTokenCategory`) — which is what the comment
      // here always claimed and, until HLT-007, was not what the code did.
      const groupForToken = getGroupForToken(token);
      if (groupForToken && map[groupForToken]) {
        map[groupForToken].push(token);
      }
    }
    return map;
  }, [designTokens]);

  const customCount = designTokens.filter((t) => t.isCustom).length;

  const body = (
    <div>
      {customCount > 0 && (
        <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--theme-color-fg-default-shy)' }}>
          {/*
            🔴 Counts and resets EVERY token, including the groups this section is not drawing —
            `resetAllToDefaults` has no group argument and inventing a filtered count here would
            put a number next to a button that does something larger than the number describes.
            The sentence says which it is.
          */}
          {customCount} token{customCount !== 1 ? 's' : ''} overriding defaults, across all groups
          <button
            onClick={() => styleTokensModel?.resetAllToDefaults({ undo: true })}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              color: 'var(--theme-color-primary)',
              cursor: 'pointer',
              fontSize: '11px',
              padding: 0
            }}
          >
            Reset all
          </button>
        </div>
      )}

      {shownGroups.map((group) => {
        const tokens = grouped[group] ?? [];
        if (tokens.length === 0) return null;

        return (
          <CollapsableSection
            key={group}
            title={group}
            variant={SectionVariant.Panel}
            isClosed={Boolean(title)}
            UNSAFE_style={{ marginTop: group === shownGroups[0] && !title ? '16px' : '8px' }}
          >
            <TokenCategorySection
              tokens={tokens}
              onTokenChange={(name, value) => styleTokensModel?.setToken(name, value, { undo: true })}
              onTokenReset={(name) => styleTokensModel?.deleteCustomToken(name, { undo: true })}
            />
          </CollapsableSection>
        );
      })}
    </div>
  );

  if (!title) return body;

  return (
    <CollapsableSection title={title} variant={SectionVariant.Panel} isClosed UNSAFE_style={{ marginTop: '8px' }}>
      {body}
    </CollapsableSection>
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
