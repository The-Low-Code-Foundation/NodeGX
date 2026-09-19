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

import { StyleTokenRecord, TOKEN_CATEGORY_GROUPS, TokenCategoryGroup } from '@noodl-models/StyleTokensModel';

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
      // Find the group from TOKEN_CATEGORIES
      // We rely on the model already having them grouped correctly
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
 * Determine the display group from a token's category.
 *
 * 🔴 **This is a second copy of the mapping `TOKEN_CATEGORIES` already holds**,
 * and it fails closed in the worst possible way: an unmapped category returns
 * `null`, the token is dropped from `grouped`, and the panel renders as though it
 * does not exist — while `get_style_vocabulary` lists it to the authoring model
 * perfectly happily. VIB-002 hit exactly that adding the `gradient` category:
 * the tokens were live in the rendered page and invisible in the editor.
 *
 * It is kept as a copy only because the comment below it is true — importing the
 * table here would close a circular import — so the tripwire is the rule instead:
 * **a new `TokenCategory` must be added in BOTH places**, and the `default`
 * branch names the file to change.
 */
function getGroupForToken(token: StyleTokenRecord): TokenCategoryGroup | null {
  const cat = token.category;
  if (cat === 'color-semantic' || cat === 'color-palette') return 'Colors';
  if (cat === 'spacing') return 'Spacing';
  if (cat.startsWith('typography')) return 'Typography';
  if (cat === 'border-radius' || cat === 'border-width') return 'Borders';
  if (cat === 'shadow' || cat === 'gradient') return 'Effects';
  if (cat.startsWith('animation')) return 'Animation';
  return null;
}
