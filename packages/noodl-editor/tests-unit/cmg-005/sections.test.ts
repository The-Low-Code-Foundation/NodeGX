/**
 * P103 CMG-005 — every kind of style is a section, and something outside can open one.
 *
 * Richard, driving P102 (2026-09-24): *"When I collapse 'Other tokens', all the typography drawers
 * and stuff disappear, it's not clear and I don't get even what Other tokens means. The typography
 * and animation bits are important, they're not 'Other'."*
 *
 * What is graded here, and what is not:
 *  - the section table (`STYLES_SECTIONS`) — order, names, that every token group has a home;
 *  - the per-person open state — defaults, a stored value winning, garbage falling back;
 *  - the reveal seam — stashed AND emitted AND switched, claimed once;
 *  - AC1: no *"Other tokens"* string is left anywhere in the editor or core-ui source.
 * That a reveal SCROLLS the row into view and highlights it is AC3/AC4, a drive on the running
 * editor (`CMG-005` §4), not this file — there is no DOM here.
 */

jest.mock('@noodl-utils/editorsettings', () => ({
  EditorSettings: {
    instance: {
      on: () => undefined,
      get: () => undefined,
      set: () => undefined
    }
  }
}));

import * as fs from 'fs';
import * as path from 'path';

import { SidebarModel } from '@noodl-models/sidebar/sidebarmodel';
import { TOKEN_CATEGORY_GROUPS } from '@noodl-models/StyleTokensModel/TokenCategories';

import {
  STYLES_PANEL_ID,
  STYLES_SECTIONS,
  readSectionOpenState,
  revealStyle,
  sectionForTokenCategory,
  sectionForTokenGroup,
  styleRowSelector,
  takePendingReveal
} from '../../src/editor/src/views/panels/StylesPanel/stylesPanelRoute';

const CONTRACT = path.join(__dirname, '../../../nodegx-project-contract/tokens.ts');

/** The `TokenCategory` union, read out of the contract's source — the same reader HLT-007 uses. */
function contractCategories(): string[] {
  const src = fs.readFileSync(CONTRACT, 'utf8');
  const m = src.match(/export type TokenCategory =([\s\S]*?);/);
  if (!m) throw new Error(`TokenCategory union not found in ${CONTRACT}`);
  return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

describe('CMG-005 §3.1 — the sections', () => {
  it('draws seven sections, Colours first and Looks last, in plain words', () => {
    expect(STYLES_SECTIONS.map((s) => s.id)).toEqual([
      'colours',
      'type',
      'spacing',
      'borders',
      'effects',
      'motion',
      'looks'
    ]);
    expect(STYLES_SECTIONS.map((s) => s.title)).toEqual([
      'Colours',
      'Type',
      'Spacing',
      'Borders',
      'Effects',
      'Motion',
      'Looks'
    ]);
  });

  it('🔴 none of them is called Other, and none says Animation or Typography (the internal group names)', () => {
    for (const section of STYLES_SECTIONS) {
      expect([section.id, /other/i.test(section.title)]).toEqual([section.id, false]);
      expect([section.id, /^(Animation|Typography)$/.test(section.title)]).toEqual([section.id, false]);
    }
  });

  it('every token group the panel knows has exactly one section — read off the groups, not the table', () => {
    // Control: the group list is real, not empty.
    expect(TOKEN_CATEGORY_GROUPS.length).toBe(6);
    for (const group of TOKEN_CATEGORY_GROUPS) {
      const holders = STYLES_SECTIONS.filter((s) => s.group === group);
      expect([group, holders.length]).toEqual([group, 1]);
      expect(sectionForTokenGroup(group)).toBe(holders[0].id);
    }
  });

  it('every category the CONTRACT declares lands in a section; an unknown one lands nowhere', () => {
    const categories = contractCategories();
    expect(categories.length).toBeGreaterThanOrEqual(10);
    for (const category of categories) {
      expect([category, sectionForTokenCategory(category)]).not.toEqual([category, null]);
    }
    expect(sectionForTokenCategory('shimmer-intensity')).toBeNull();
    expect(sectionForTokenCategory('toString')).toBeNull();
  });

  it('files the ones the drive named: easing under Motion, font sizes under Type, shadows under Effects', () => {
    expect(sectionForTokenCategory('animation-easing')).toBe('motion');
    expect(sectionForTokenCategory('typography-size')).toBe('type');
    expect(sectionForTokenCategory('shadow')).toBe('effects');
    expect(sectionForTokenCategory('color-palette')).toBe('colours');
  });
});

describe('CMG-005 §3.2 — the open state a person is remembered by', () => {
  it('first open: Colours and Type open, the rest closed', () => {
    const state = readSectionOpenState(undefined);
    expect(state).toEqual({
      colours: true,
      type: true,
      spacing: false,
      borders: false,
      effects: false,
      motion: false,
      looks: false
    });
  });

  it('a stored boolean wins over the default, per section', () => {
    const state = readSectionOpenState({ colours: false, motion: true });
    expect(state.colours).toBe(false);
    expect(state.motion).toBe(true);
    expect(state.type).toBe(true);
    expect(state.looks).toBe(false);
  });

  it('garbage in the settings file falls back to the defaults rather than hiding a section for good', () => {
    expect(readSectionOpenState('nonsense')).toEqual(readSectionOpenState(undefined));
    expect(readSectionOpenState({ colours: 'yes', type: 0, effects: null })).toEqual(readSectionOpenState(undefined));
    expect(readSectionOpenState({ notASection: true })).toEqual(readSectionOpenState(undefined));
  });
});

describe('CMG-005 §3.3 — the reveal seam', () => {
  const Panel = () => null;

  beforeEach(() => {
    SidebarModel.instance.reset();
    SidebarModel.instance.register({ id: 'components', name: 'Components', order: 1, panel: Panel });
    SidebarModel.instance.register({ id: STYLES_PANEL_ID, name: 'Styles', order: 1.5, panel: Panel });
    SidebarModel.instance.switch('components');
    takePendingReveal();
  });

  it('switches the sidebar to Styles and stashes the request for a panel that mounts afterwards', () => {
    expect(SidebarModel.instance.ActiveId).toBe('components');

    revealStyle({ kind: 'token', name: '--ease-bounce' });

    expect(SidebarModel.instance.ActiveId).toBe(STYLES_PANEL_ID);
    expect(takePendingReveal()).toEqual({ kind: 'token', name: '--ease-bounce' });
  });

  it('🔴 the stash is claimed ONCE — a later remount does not replay an old reveal', () => {
    revealStyle({ kind: 'look', name: 'Card', typename: 'Group' });
    expect(takePendingReveal()).toEqual({ kind: 'look', name: 'Card', typename: 'Group' });
    expect(takePendingReveal()).toBeNull();
  });

  it('only the last request survives — the thing the person pointed at last is what they meant', () => {
    revealStyle({ kind: 'token', name: '--primary' });
    revealStyle({ kind: 'colourStyle', name: 'Brand' });
    expect(takePendingReveal()).toEqual({ kind: 'colourStyle', name: 'Brand' });
    expect(takePendingReveal()).toBeNull();
  });

  it('the row selector is the one attribute both row components carry, and it escapes the name', () => {
    expect(styleRowSelector('--ease-bounce')).toBe('[data-style-row="--ease-bounce"]');
    // A colour style is named by a person: quotes and brackets must not break the query.
    expect(styleRowSelector('Brand "dark"')).toBe('[data-style-row="Brand \\"dark\\""]');
  });
});

describe('CMG-005 AC1 — no "Other tokens" anywhere on screen', () => {
  const ROOTS = [
    path.join(__dirname, '../../src/editor/src'),
    path.join(__dirname, '../../../noodl-core-ui/src')
  ];
  const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.scss', '.css', '.mdx']);

  function walk(dir: string, out: string[]): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'external') continue;
        walk(full, out);
      } else if (EXT.has(path.extname(entry.name))) {
        out.push(full);
      }
    }
    return out;
  }

  it('the walk reached the panel at all — the control for the absence below', () => {
    const files = ROOTS.flatMap((root) => walk(root, []));
    expect(files.length).toBeGreaterThan(500);
    expect(files.some((f) => f.endsWith('StylesPanel/StylesPanel.tsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('CollapsableSection/CollapsableSection.tsx'))).toBe(true);
  });

  /** Code with its comments removed: a docblock that records the old name is history, not a label. */
  function withoutComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  }

  it('the comment stripper leaves a string literal alone and removes a docblock — the control', () => {
    expect(withoutComments('/* Other tokens */ const a = 1; // Other tokens\nconst b = "Other tokens";')).toBe(
      ' const a = 1; \nconst b = "Other tokens";'
    );
  });

  it('🔴 no source file contains the string "Other tokens" outside a comment', () => {
    const files = ROOTS.flatMap((root) => walk(root, []));
    const offenders = files.filter((f) => withoutComments(fs.readFileSync(f, 'utf8')).includes('Other tokens'));
    expect(offenders.map((f) => path.relative(path.join(__dirname, '../../..'), f))).toEqual([]);
  });
});
