/**
 * FB-002 / NAT-008 / FB-013 — the selected filter pill, measured rather than described.
 *
 * ## 🔴 The defect this file is a gate against, and why it took three surfaces to fix
 *
 * The shared `.FilterPill`'s selected state was carried by **fill alone**. Measured live in the
 * running editor (session 57, on the Chat tab), against the `.SectionCard` the pills sat on:
 *
 * | pair | was | needed |
 * |---|---|---|
 * | active fill vs panel | **1.36:1** | 3:1 (WCAG 1.4.11, a non-text state boundary) |
 * | active vs inactive fill | 1.94:1 | — |
 * | border, active vs inactive | **identical** (4.17:1 both) | — |
 * | label text vs its own fill | 8.46:1 | ✅ never the problem |
 *
 * Every *label* passed AA comfortably and **which pill was on was invisible**. FB-002 recorded it
 * on the Bench, NAT-008 inherited it on People and FB-013's C4 made it three — because the pill
 * markup was copied into three components over one shared class. So the fix was one shared
 * `FilterPill` component, and this file gates both halves of what it does.
 *
 * ## 🔴 CHR-012 (2026-09-15) moved WHERE the rule lives, and this file followed it
 *
 * The community's `.FilterPill` rule was a second chip beside the launcher's `Chip variant=Filter`
 * (Richard: the Community tab *"still looks like shit"*). `FilterPill` now draws `Chip`, and the
 * `.FilterPill` rule is gone. Every claim below is the same claim, graded where the pill is now
 * painted:
 *
 * - the rules are `Chip.module.scss`'s `.is-variant-filter` and its `&.is-selected`;
 * - the GROUND is no longer a card — CHR-012 took the cards off the launcher tab — so the edge is
 *   graded against the two grounds the pill actually sits on: the launcher canvas
 *   (`Launcher.module.scss` `.ContentArea`) and the rail panel (`BasePanel.module.scss` `.Root`);
 * - the selected FILL is a translucent wash (`primary-bg`), so "the edge against its own fill" is
 *   graded against the wash **composited over each ground**. The first run after CHR-012 graded the
 *   token as though it were opaque and scored the edge **1:1 against itself** — `parseColorAlpha`'s
 *   warning, verbatim: not a weak measurement, a made-up one.
 *
 * ## ⚠️ Token NAMES are read out of the stylesheets, never restated here
 *
 * Following `fix-005/dropdown-contrast.spec.ts`: a contrast spec carrying its own copy of the
 * token names keeps passing after somebody changes the rule it claims to grade.
 *
 * 🔴 **Comments are stripped first.** A rule with a comment *explaining* that it uses
 * `border-color` would satisfy an unstripped check while the declaration was gone.
 *
 * ## 🔴 What this file CANNOT prove, and hands to the drive
 *
 * - That these rules **win**, or that the pill is painted at all. A declaration that loses to
 *   another selector is invisible from here.
 * - That the `✓` is legible, or that the edge is where a person's eye goes. The numbers say the
 *   contrast is available, not that the design reads.
 *
 * @module noodl-editor/tests-unit/fb-002/filter-pill-state
 */
// FLD-017 — CHR-012 made the community write verbs `PrimaryButton`, which imports `Icon`.
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  Icon: () => null,
  IconName: {},
  IconSize: { Small: 'small' },
  IconVariant: {}
}));

import * as fs from 'fs';
import * as path from 'path';

import React from 'react';

import {
  CommunityBenchView,
  CommunityChatView,
  CommunityDensity,
  CommunityDirectoryView,
  FilterPill
} from '@noodl-core-ui/components/community';

import { byClass, render, stripComments, text } from '../support/renderElements';
import {
  composite,
  contrastRatio,
  parseColor,
  parseColorAlpha,
  resolveToken,
  themeTokens,
  tokenContrast
} from '../support/themeTokens';
import type { ThemeName } from '../support/themeTokens';

const CORE_UI = path.join(__dirname, '../../../noodl-core-ui/src');
const COMMUNITY_DIR = path.join(CORE_UI, 'components/community');
const CHIP_SCSS = path.join(CORE_UI, 'components/common/Chip/Chip.module.scss');
const LAUNCHER_SCSS = path.join(CORE_UI, 'preview/launcher/Launcher/Launcher.module.scss');
const RAIL_SCSS = path.join(CORE_UI, 'components/sidebar/BasePanel/BasePanel.module.scss');

const THEMES: ThemeName[] = ['dark', 'light'];

/** WCAG 1.4.11 — the boundary of a user interface component, which is what a selected state is. */
const COMPONENT = 3;

const read = (file: string) => fs.readFileSync(file, 'utf8');
const chipSource = read(CHIP_SCSS);

/**
 * The body of the rule whose selector text starts at `needle`, walking braces for nested SCSS —
 * or `''` when the needle is absent, which the CONTROL rows report by name.
 */
function ruleBody(source: string, needle: string): string {
  const declarations = stripComments(source);
  const at = declarations.indexOf(needle);
  if (at < 0) return '';
  const open = declarations.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < declarations.length; i++) {
    if (declarations[i] === '{') depth++;
    else if (declarations[i] === '}' && --depth === 0) return declarations.slice(open + 1, i);
  }
  return '';
}

/**
 * The token named by `property` in `body`, e.g. `--theme-color-primary`, or `null` when the rule
 * does not declare it.
 *
 * 🔴 **Returns `null` rather than asserting, and that is the difference between a red row and a
 * suite that does not run.** An `expect()` here, at module scope, made the mutant that deletes
 * `border-color` (the exact regression that shipped) throw during collection: jest reported
 * **`Tests: 0 total`** and every unrelated row in this file silently stopped running with it.
 */
function tokenFor(body: string, property: string): string | null {
  const declaration = body
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.split(':')[0].trim() === property);
  if (declaration === undefined) return null;

  const token = declaration.match(/var\(\s*(--[\w-]+)\s*\)/);
  return token === null ? null : token[1];
}

const pill = ruleBody(chipSource, '.is-variant-filter {');
const active = ruleBody(chipSource, '&.is-selected {');

/** The two grounds a community filter pill is drawn on, each read from the rule that paints it. */
const GROUNDS: Record<string, string | null> = {
  'the launcher canvas': tokenFor(ruleBody(read(LAUNCHER_SCSS), '.ContentArea {'), 'background'),
  'the rail panel': tokenFor(ruleBody(read(RAIL_SCSS), '.Root {'), 'background-color')
};

const RESTING_BORDER = tokenFor(pill, 'border');
const ACTIVE_BORDER = tokenFor(active, 'border-color');
const ACTIVE_FILL = tokenFor(active, 'background-color');

/**
 * The ratio between two opaque tokens, or `0` when either is absent.
 *
 * ⚠️ `0` and not a throw: an absent token means the state is not being carried at all, which is
 * the *worst* score rather than an unmeasurable one — so it fails the floor and says so in the row
 * that owns the claim.
 */
function ratio(theme: ThemeName, foreground: string | null, background: string | null): number {
  if (foreground === null || background === null) return 0;
  return tokenContrast(theme, foreground, background);
}

/** The selected fill's alpha in `theme`, or `null` when the token is absent or unparseable. */
function washAlpha(theme: ThemeName): number | null {
  if (ACTIVE_FILL === null) return null;
  const wash = parseColorAlpha(resolveToken(themeTokens(theme), ACTIVE_FILL));
  return wash === null ? null : wash[3];
}

/**
 * The selected edge against the selected fill **as painted**: the fill composited over `ground`.
 * `0` when any of the three tokens is absent or unparseable, for {@link ratio}'s reason.
 */
function edgeAgainstWash(theme: ThemeName, ground: string | null): number {
  if (ACTIVE_BORDER === null || ACTIVE_FILL === null || ground === null) return 0;
  const tokens = themeTokens(theme);
  const edge = parseColor(resolveToken(tokens, ACTIVE_BORDER));
  const wash = parseColorAlpha(resolveToken(tokens, ACTIVE_FILL));
  const under = parseColor(resolveToken(tokens, ground));
  if (!edge || !wash || !under) return 0;
  return contrastRatio(edge, composite(wash, under));
}

describe('FB-002 — a selected pill is visible without reading its fill', () => {
  describe('CONTROL: the instrument reached the real rules', () => {
    it('read the chip stylesheet, and found the two rules it grades', () => {
      expect(chipSource.length).toBeGreaterThan(500);
      expect([pill.length > 0, active.length > 0]).toEqual([true, true]);
    });

    it('🔴 every token this file measures was actually found in a stylesheet', () => {
      expect({ ...GROUNDS, RESTING_BORDER, ACTIVE_BORDER, ACTIVE_FILL }).toEqual({
        'the launcher canvas': expect.stringMatching(/^--/),
        'the rail panel': expect.stringMatching(/^--/),
        RESTING_BORDER: expect.stringMatching(/^--/),
        ACTIVE_BORDER: expect.stringMatching(/^--/),
        ACTIVE_FILL: expect.stringMatching(/^--/)
      });
    });

    it('🔴 and they are distinct names, not one token measured against itself', () => {
      expect(new Set([...Object.values(GROUNDS), RESTING_BORDER, ACTIVE_BORDER, ACTIVE_FILL]).size).toBeGreaterThan(3);
    });

    it.each(THEMES)('🔴 in %s the selected fill is a translucent wash, so the own-fill rows MUST composite it', (theme) => {
      // If this ever reads 1, the fill became opaque and `edgeAgainstWash` is compositing nothing —
      // still correct, but the reason this file composites is gone and the header should say so.
      const alpha = washAlpha(theme);
      expect([alpha !== null, (alpha ?? 1) < 1]).toEqual([true, true]);
    });
  });

  /*
    🔴 BOTH SIDES OF THE EDGE, because a boundary is only a boundary against what sits on either
    side of it. An edge that reads against the ground and dissolves into its own fill is still a
    line nobody can find — and grading only the outer side is exactly how the fill-only version
    would have scored well on the pair somebody happened to pick.
  */
  describe.each(THEMES)('%s theme', (theme) => {
    it.each(Object.keys(GROUNDS))('🔴 the selected edge clears 3:1 against %s', (ground) => {
      expect(ratio(theme, ACTIVE_BORDER, GROUNDS[ground])).toBeGreaterThanOrEqual(COMPONENT);
    });

    it.each(Object.keys(GROUNDS))('🔴 and clears 3:1 against its own wash, painted over %s', (ground) => {
      expect(edgeAgainstWash(theme, GROUNDS[ground])).toBeGreaterThanOrEqual(COMPONENT);
    });
  });

  it('🔴 the edge CHANGES on selection — the identical-border defect, by name', () => {
    expect(ACTIVE_BORDER).not.toBe(RESTING_BORDER);
  });

  /*
    ⚠️ The regression this pins is the specific one that shipped: the selected rule setting only
    fill and ink. It asserts the rule still *declares* a border colour, and not a border WIDTH —
    a width that changes on selection reflows the row and the list reads as jumping.
  */
  it('🔴 `is-selected` declares a border colour and NOT a border width', () => {
    expect(active).toContain('border-color');
    expect(active).not.toMatch(/border\s*:/);
  });
});

const noop = () => undefined;
const pillOf = (active: boolean) => ({ key: 'k', label: 'Solved', count: 3, active });

describe('FB-002 — the state is said in text as well as drawn in colour', () => {
  /*
    🔴 WCAG 1.4.1: colour may not be the ONLY carrier of a state, however much contrast it has.
    So the pill draws a mark, and these rows are what a mutant deleting that branch fails.
  */
  const on = render(FilterPill({ filter: pillOf(true), onSelect: noop }) as React.ReactNode);
  const off = render(FilterPill({ filter: pillOf(false), onSelect: noop }) as React.ReactNode);

  it('CONTROL: both pills drew, and both carry their label and count', () => {
    for (const node of [on, off]) expect([text(node).includes('Solved'), text(node).includes('3')]).toEqual([true, true]);
  });

  it('🔴 the selected pill carries a non-colour marker and the resting one does not', () => {
    expect([text(on).includes('✓'), text(off).includes('✓')]).toEqual([true, false]);
    expect([byClass(on, 'Check').length, byClass(off, 'Check').length]).toEqual([1, 0]);
  });

  it('🔴 `aria-pressed` still separates them for a screen reader', () => {
    expect([on?.props['aria-pressed'], off?.props['aria-pressed']]).toEqual([true, false]);
  });

  /*
    ⚠️ The marker is hidden from assistive tech ON PURPOSE — `aria-pressed` already says this, and
    letting the `✓` into the accessible name makes the button announce "Solved 3 ✓, pressed".
    CHR-012 carried this rule into `Chip`, which drew its ✓ into the name until then.
  */
  it('⚠️ the marker is `aria-hidden`, so selection does not change the accessible name', () => {
    expect(byClass(on, 'Check')[0].props['aria-hidden']).toBe('true');
  });

  it('🔴 selection is reported by key, so a host cannot mistake which pill was clicked', () => {
    const asked: string[] = [];
    const node = render(FilterPill({ filter: pillOf(false), onSelect: (key) => asked.push(key) }) as React.ReactNode);
    (node?.props.onClick as () => void)();
    expect(asked).toEqual(['k']);
  });
});

describe('🔴 all three surfaces draw through the ONE pill, which is how this defect spread', () => {
  /*
    ⚠️ These view models are literals, and that is right HERE and wrong in `bench-filter-render`:
    that file grades the composer, so a literal would agree with nothing. This grades the pill, and
    the composers are irrelevant to whether the pill draws its state.
  */
  const filters = [pillOf(true), { key: 'other', label: 'Waiting', count: 1, active: false }];
  const section = { state: 'empty' } as const;

  const surfaces: [string, React.ReactNode][] = [
    [
      'Bench',
      CommunityBenchView({
        view: { section, summary: null, boundLine: null, emptyLine: 'Nobody has asked yet.', filters },
        onSelectFilter: noop,
        onOpenThread: noop,
        onRetry: noop,
        density: CommunityDensity.Page
      }) as React.ReactNode
    ],
    [
      'People',
      CommunityDirectoryView({
        view: {
          section,
          summary: null,
          boundLine: null,
          emptyLine: 'Nobody is here yet.',
          searchLabel: 'Search',
          query: '',
          filters
        },
        onQueryChange: noop,
        onToggleFilter: noop,
        onOpenPerson: noop,
        onRetry: noop,
        density: CommunityDensity.Page
      }) as React.ReactNode
    ],
    [
      'Chat',
      CommunityChatView({
        view: { section, summary: null, emptyLine: 'Nothing in #lounge yet.', filters },
        onSelectChannel: noop,
        onOpenThread: noop,
        onRetry: noop,
        density: CommunityDensity.Page
      }) as React.ReactNode
    ]
  ];

  it.each(surfaces)('%s draws the launcher chip, with the selected one marked', (_name, node) => {
    const tree = render(node);
    expect(byClass(tree, 'is-variant-filter').length).toBe(2);
    expect(byClass(tree, 'Check').length).toBe(1);
  });

  /*
    🔴 THE PILLS WERE FINE AND THE GROUP WAS NAMELESS. Every row above passes on a surface
    whose filter bar is two loose buttons: they render, the marker draws, the contrast is there,
    and a screen reader still meets "Available for work, pressed" with nothing saying what is
    being narrowed.

    ⚠️ `ChipRow` names TWO different things in this directory — this filter bar, and the skill
    chips inside `CommunityPersonRow`. These surfaces render with `section.state === 'empty'`, so
    no person row exists and the row below is the filter bar; the length assertion is what makes
    that a claim rather than a coincidence.
  */
  const groupOf = (node: React.ReactNode) => {
    const rows = byClass(render(node), 'ChipRow');
    expect(rows).toHaveLength(1);
    return rows[0];
  };

  it.each(surfaces)('%s wraps its pills in a group that has a name', (_name, node) => {
    const row = groupOf(node);
    expect(row.props.role).toBe('group');
    expect(String(row.props['aria-label'] ?? '')).not.toHaveLength(0);
  });

  it('🔴 the three group names are DISTINCT — each says what IT is narrowing', () => {
    const labels = surfaces.map(([, node]) => groupOf(node).props['aria-label']);
    expect(new Set(labels).size).toBe(surfaces.length);
  });

  /*
    🔴 THE ANTI-DRIFT ROWS. Three copies of seven lines over one class is how one defect reached
    three shipped tabs, and CHR-012 found the fourth copy one level up: a community chip beside the
    launcher's. The filter variant may be named by exactly one community component, and the old
    community pill rule may not come back.
  */
  it('🔴 `ChipVariant.Filter` is named by exactly ONE component in the community directory', () => {
    const owners = fs
      .readdirSync(COMMUNITY_DIR)
      .filter((name) => name.endsWith('.tsx'))
      .filter((name) => stripComments(read(path.join(COMMUNITY_DIR, name))).includes('ChipVariant.Filter'));

    expect(owners).toEqual(['CommunityFilterPill.tsx']);
  });

  it('🔴 and no community stylesheet or component carries a pill of its own', () => {
    const sheet = stripComments(read(path.join(COMMUNITY_DIR, 'Community.module.scss')));
    // CONTROL: the stylesheet was read and still carries a rule this row did not delete.
    expect(sheet).toContain('.ChipRow');
    expect([sheet.includes('.FilterPill'), sheet.includes('.FilterPillMark')]).toEqual([false, false]);
    const components = fs
      .readdirSync(COMMUNITY_DIR)
      .filter((name) => name.endsWith('.tsx'))
      .filter((name) => stripComments(read(path.join(COMMUNITY_DIR, name))).includes("css['FilterPill"));
    expect(components).toEqual([]);
  });
});
