/**
 * HLT-006 — the one enumeration of "which colour tokens may be picked".
 *
 * 🔴 **Why this is a leaf module and not a method on `StyleTokensModel`.** Importing the model
 * (or the barrel that re-exports it) drags in `projectmodel` → `bugtracker` → Electron, which is
 * why `TokenCategorySection` already documents reaching for the leaf modules instead. A spec that
 * wants to assert *which tokens a picker offers* should not have to stand up Electron to do it,
 * and the colour picker itself is a popout rendered outside the `ProjectDesignTokenContext`
 * provider tree, so it cannot read the panel's list either. Both of them call in here.
 *
 * 🔴 **The split is the whole point, and it is measured, not aesthetic.** On `Puppy test 3`
 * (2026-09-21) the project carries **193 effective tokens, 91 of them colours** — but only **25**
 * are semantic (`--primary`, `--muted`, `--border`, `--ring`…), of which **16** are the project's
 * own overrides. The remaining **66** are the shipped raw ramp: 61 Tailwind-scale swatches
 * (`--gray-50` … `--purple-900`) and 5 gradients, and **this project references none of them**.
 * Richard, on being shown the 91: *"I don't want hundreds of lines in a colour picker just because
 * some font somewhere has a random colour. But then again... why TF does one app have 91 colour
 * tokens?"* — it does not. It has 25 and a default ramp behind them.
 *
 * P94 reached the same conclusion from the other side and its note is the precedent: `ColoursSection`
 * draws all 86 of its rows **closed**, with the count on the heading, because drawn open "it buried
 * them". Semantic tokens are what a person picks; the ramp is what they occasionally go looking for.
 */

import type { StyleTokenRecord, TokenCategory } from '@nodegx/project-contract/tokens';

/**
 * The categories whose tokens are colours, in the order a picker should offer them.
 *
 * ⚠️ `gradient` is deliberately absent. Its group is `Effects`, not `Colors`, and a gradient is not
 * a value a `type === 'color'` port can wear — offering one would produce a parameter the runtime
 * cannot paint. `ColoursSection` excludes it for the same reason and this list keeps them agreeing.
 */
export const SEMANTIC_COLOUR_CATEGORY: TokenCategory = 'color-semantic';
export const PALETTE_COLOUR_CATEGORY: TokenCategory = 'color-palette';

export interface ColourTokensForPicking {
  /** Named, meaningful colours — the project's actual palette. Offered open. */
  semantic: StyleTokenRecord[];
  /** The shipped raw ramp. Offered behind a closed disclosure that states its count. */
  palette: StyleTokenRecord[];
}

/**
 * Split an effective token list into the two things a picker shows differently.
 *
 * Order within each half is the order the token map produced, which is definition order for
 * defaults — so the ramp stays in `gray → blue → red → green → amber → purple`, light to dark,
 * rather than being re-sorted into something a reader has to decode.
 */
export function colourTokensForPicking(tokens: readonly StyleTokenRecord[]): ColourTokensForPicking {
  const semantic: StyleTokenRecord[] = [];
  const palette: StyleTokenRecord[] = [];

  for (const token of tokens) {
    if (token.category === SEMANTIC_COLOUR_CATEGORY) semantic.push(token);
    else if (token.category === PALETTE_COLOUR_CATEGORY) palette.push(token);
  }

  return { semantic, palette };
}

/**
 * Every colour token, both halves, as one list.
 *
 * This is what the Styles panel's `ColoursSection` renders — P94 ruled that section's shape and
 * HLT-006 does not reopen it ([P99 README §8]). It reads through here purely so that "which
 * tokens are colours" has exactly one definition; a second copy of that predicate is how
 * HLT-007(b) happened.
 */
export function allColourTokens(tokens: readonly StyleTokenRecord[]): StyleTokenRecord[] {
  const { semantic, palette } = colourTokensForPicking(tokens);
  return [...semantic, ...palette];
}

/**
 * The set of `var(--name)` strings the token sections already account for.
 *
 * 🔴 **This exists because the fix would otherwise double every row it fixed.** The picker's
 * "Colors in project" list is `getProjectColors` — a scan of values already set on `type === 'color'`
 * ports — and on a project authored against tokens those values ARE `var(--primary)` and friends
 * (13 of them on `Puppy test 3`). Enumerating the tokens without subtracting these would show
 * `--primary` twice, once per source, which is the trade a drive counting only "are tokens listed?"
 * would call a pass.
 */
export function tokenReferenceStrings(tokens: readonly StyleTokenRecord[]): Set<string> {
  return new Set(allColourTokens(tokens).map((token) => `var(${token.name})`));
}
