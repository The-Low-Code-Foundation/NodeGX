/**
 * HLT-006 / HLT-012 — the one enumeration of "which design tokens may be picked, and where".
 *
 * ⚠️ **Was `ColourTokensForPicking.ts`.** HLT-006 built it for the colour picker; HLT-012 added the
 * other 107 tokens and their port rules to THIS file rather than starting a second one, which is
 * what AC2 asks for and what `getGroupForToken` (HLT-007b) is the cost of not doing.
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

import { TOKEN_CATEGORIES } from './TokenCategories';

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

// ─── HLT-012 — which NON-colour tokens a field may offer ──────────────────────

/**
 * HLT-012 — the one table of "which design tokens belong on which parameter".
 *
 * 🔴 **It lives here, beside the colour split, because a second copy of this predicate is
 * HLT-007(b) waiting to happen** ([[a-second-copy-of-a-palette-drifts-silently]]). HLT-006 gave
 * the colour picker an enumeration; the same module now answers the same question for the other
 * 107 tokens, and the numeric rows, the margin/padding box and the font picker all read it.
 *
 * ## 🔴 Order is the decision, and that is not a style — it is what the measurement forced
 *
 * Written the obvious way (generic rules first) this table is **wrong on seven of the ports it
 * covers**, silently: `/Spacing$/ → spacing` swallows `letterSpacing`, `/(width|height)$/ → spacing`
 * swallows every `borderWidth`, and `/size$/` swallows `fontSize`. Each of those produces a field
 * offering the wrong scale rather than no scale, which is worse than the defect — so the specific
 * suffixes are tried first and the generic dimensions last, exactly as `WIDGET_RULES` does it.
 *
 * ## The population, measured against `node-catalog.json` on 2026-09-21
 *
 * | | |
 * |---|---|
 * | number/dimension ports in the catalog | **166** |
 * | …that reach a field which can hold a token at all (`units` declared, or `dimension`, or a margin/padding comp) | **86** |
 * | …that this table offers tokens on | **64** |
 *
 * 🔴 **The 80 ports dropped by the middle row are the reason this cannot key off "is it a number".**
 * `maxRetries`, `timeout`, `flushSize`, `maxTokens` and `rateLimitWindow` are number ports; they
 * declare no `units`, so they render as plain `BasicType` rows and were never candidates. Keying
 * off the type name would have offered a spacing scale on a retry count.
 *
 * ⚠️ **And the 22 that a field COULD hold a token on but this table still refuses** are the AC3
 * half: `transformRotation`, `smallBreakpoint`/`mediumBreakpoint`, `boxShadowOffsetX/Y`,
 * `objectPositionX/Y`, `transformOriginX/Y`, `backdropBlur` and the six shadow blur/spread radii.
 * They are real style, but no shipped token category is a scale for them — offering `--space-3`
 * on a rotation is the 91-row problem one field further along.
 */
export interface PortTokenRule {
  /** Matched against the port NAME. Anchored at the end so `labelfontSize` and `thumbBorderRadius` hit. */
  readonly test: RegExp;
  /** The categories this port may be set from, or `null` for "matched, and deliberately offers nothing". */
  readonly categories: readonly TokenCategory[] | null;
}

export const PORT_TOKEN_RULES: readonly PortTokenRule[] = [
  // ── specific suffixes first; see the header for what happens when they are not ──
  { test: /letterSpacing$/i, categories: ['typography-tracking'] },
  { test: /lineHeight$/i, categories: ['typography-leading'] },
  { test: /fontSize$/i, categories: ['typography-size'] },
  { test: /fontWeight$/i, categories: ['typography-weight'] },
  { test: /fontFamily$/i, categories: ['typography-family'] },
  // ⚠️ A shadow's blur and spread end in `Radius` and are not corner radii. Refused explicitly
  // rather than left to fall through, so a reader can see that it was decided.
  { test: /boxShadow(Blur|Spread)Radius$/i, categories: null },
  { test: /Radius$/i, categories: ['border-radius'] },
  { test: /border[A-Za-z]*Width$/i, categories: ['border-width'] },
  // ── the spacing scale: the box model, the gaps, and the dimensions ──
  { test: /(padding|margin)[A-Za-z]*$/i, categories: ['spacing'] },
  { test: /(row|column)Gap$/i, categories: ['spacing'] },
  { test: /Spacing$/i, categories: ['spacing'] },
  // `iconSize` is here and not under a size scale of its own because there is no such category:
  // an icon is sized off the spacing ramp in this vocabulary (`--space-4` is 16px).
  { test: /iconSize$/i, categories: ['spacing'] },
  { test: /(width|height)$/i, categories: ['spacing'] }
];

/**
 * The token categories a parameter may be picked from — `[]` when none fit.
 *
 * ⚠️ **Takes the port NAME, not its type.** Two ports with byte-identical types
 * (`{ name: 'number', units: ['px'] }`) are Font Size and Border Width, and the scale that
 * belongs on each is the thing the name is the only carrier of.
 */
export function tokenCategoriesForPort(portName: unknown): readonly TokenCategory[] {
  if (typeof portName !== 'string' || portName === '') return [];
  for (const rule of PORT_TOKEN_RULES) {
    if (rule.test.test(portName)) return rule.categories ?? [];
  }
  return [];
}

/** One heading in a field's token popout: a category, its label, and the tokens in it. */
export interface TokenPickGroup {
  category: TokenCategory;
  /** `TOKEN_CATEGORIES`' own label — read, never restated. */
  label: string;
  tokens: StyleTokenRecord[];
}

/**
 * The tokens one field offers, grouped by category in the order the rule named them.
 *
 * ⚠️ **Empty groups are dropped, and a field with nothing to offer returns `[]`** — which is what
 * the row reads to decide whether to draw the affordance at all. A button that opens an empty
 * popout is the failure FB-015 fixed in the content pickers, and it is cheaper to not draw it.
 *
 * ✅ **No ramp/disclosure split here, and that is measured rather than assumed.** The longest list
 * this can produce is `spacing` at **31** tokens; HLT-006's two-list shape exists because the
 * colour ramp is **61** on top of 25 semantic ones. 31 open rows is the `ColoursSection` shape,
 * not the one that buried it.
 */
export function tokensForPicking(
  tokens: readonly StyleTokenRecord[],
  categories: readonly TokenCategory[]
): TokenPickGroup[] {
  const groups: TokenPickGroup[] = [];

  for (const category of categories) {
    const inCategory = tokens.filter((token) => token.category === category);
    if (inCategory.length === 0) continue;
    groups.push({ category, label: TOKEN_CATEGORIES[category]?.label ?? category, tokens: inCategory });
  }

  return groups;
}
