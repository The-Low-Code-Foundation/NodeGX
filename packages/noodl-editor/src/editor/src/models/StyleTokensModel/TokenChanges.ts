/**
 * P103 CMG-004 — what has actually changed from the defaults.
 *
 * Richard, driving P102 (2026-09-24): *"Other tokens said '150 tokens overriding defaults' and I
 * could click 'reset all' which I did and they all just disappeared. I didn't even know what the
 * 150 tokens were, and now they're gone and wtf did they get replaced with?"*
 *
 * 🔴 **Stored is not changed.** The count on the old sentence was `tokens.filter(t => t.isCustom)`,
 * and `isCustom` means *stored in the project file*, not *different from the default*. Measured on
 * his project (*Landing page test V2*): **142** stored rows, **96** of them byte-equal to their
 * default, **46** real changes. The writer of the 96 is the MCP's `upsertTokens`
 * (`noodl-mcp/src/tools/styleTools.ts`), which stores every token it is handed as `isCustom`
 * whether or not the value differs — a preset applied through it pins its whole map. Pinning is
 * left as it is (a pinned value does not move when a shipped default changes, which is what a
 * preset wants); this module simply stops counting a pinned default as a change.
 *
 * Pure: reads a token list and the shipped defaults, touches no model. The Styles panel, the
 * confirm sentence and the specs all read through here so there is one opinion about the number.
 */

import { buildDefaultTokenMap, type StyleTokenRecord } from '@nodegx/project-contract/tokens';

import { groupForTokenCategory, type TokenCategoryGroup } from './TokenCategories';

/** One token whose value differs from its shipped default. */
export interface ChangedToken {
  token: StyleTokenRecord;
  /** The value *Put back* returns it to. */
  defaultValue: string;
  /** The panel section it is drawn in, or `null` for a category no section holds. */
  group: TokenCategoryGroup | null;
}

export interface TokenChanges {
  /** Default-named tokens whose value differs from the default. The number a person is shown. */
  changed: ChangedToken[];
  /** Tokens with no default at all — ones a person (or the MCP) added. Never "reset"; they have nothing to go back to. */
  added: StyleTokenRecord[];
  /** Stored rows whose value equals the default. Not a change, not counted, reported for the record. */
  pinned: number;
}

export function tokenChanges(
  tokens: readonly StyleTokenRecord[],
  defaults: Map<string, StyleTokenRecord> = buildDefaultTokenMap()
): TokenChanges {
  const changed: ChangedToken[] = [];
  const added: StyleTokenRecord[] = [];
  let pinned = 0;

  for (const token of tokens) {
    const def = defaults.get(token.name);
    if (!def) {
      if (token.isCustom) added.push(token);
      continue;
    }
    if (def.value === token.value) {
      if (token.isCustom) pinned++;
      continue;
    }
    changed.push({ token, defaultValue: def.value, group: groupForTokenCategory(String(token.category)) });
  }

  return { changed, added, pinned };
}

/** The changes drawn in one section. */
export function changesInGroup(changes: TokenChanges, group: TokenCategoryGroup): ChangedToken[] {
  return changes.changed.filter((c) => c.group === group);
}

export function isColourCategory(category: string): boolean {
  return category === 'color-semantic' || category === 'color-palette';
}

/**
 * The one or two changes worth naming in a confirm, colours first: a brand colour going back to
 * blue is the thing a person most needs to hear before pressing the button (README §7).
 */
export function mostVisibleChanges(changed: readonly ChangedToken[], count = 2): ChangedToken[] {
  const rank = (c: ChangedToken) =>
    c.token.category === 'color-semantic' ? 0 : c.token.category === 'color-palette' ? 1 : 2;
  return [...changed].sort((a, b) => rank(a) - rank(b)).slice(0, count);
}

/** "46 tokens changed from the defaults" / "1 token changed from the default". */
export function describeChangeCount(n: number): string {
  return n === 1 ? '1 token changed from the default' : `${n} tokens changed from the defaults`;
}
