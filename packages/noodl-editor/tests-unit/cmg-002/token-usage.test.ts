/**
 * P103 CMG-002 — add a token, copy a token; the counter behind *delete* and CMG-010's *Used by*.
 *
 * Pure readings:
 *  - AC5: `tokenUsageIn` on a fixture wearing a token in a node parameter, inside a compound value,
 *    in a visual state, in a Look, and in another token — each kind counted once, named, and the
 *    sentence a person reads;
 *  - §3.1: every non-colour category the contract declares has a word a person can pick, and the
 *    kinds a section offers are read off the one table;
 *  - the starting value of a new token is a copy of the last of its kind, never blank.
 *
 * That the ＋ writes the right category to the file, that ⌘Z removes one token, that a new shadow
 * opens the composer and that the clipboard holds `var(--name)` — AC1–AC4, AC6, AC7 — is the
 * drive (`scripts/devtools/drive-cmg002-add-copy.js`).
 */
import * as fs from 'fs';
import * as path from 'path';

import { TOKEN_CATEGORIES, TOKEN_CATEGORY_GROUPS } from '../../src/editor/src/models/StyleTokensModel/TokenCategories';
import { KIND_WORDS, kindsForGroup, startingValueFor } from '../../src/editor/src/models/StyleTokensModel/tokenKinds';
import { describeTokenUsage, tokenUsageCount, tokenUsageIn } from '../../src/editor/src/models/StyleTokensModel/tokenUsage';

/** A project of named components whose `forEachNode` stops on a truthy return, like the real one. */
function project(components: Array<{ name: string; nodes: unknown[] }>, variants: unknown[] = []) {
  return {
    getComponents: () =>
      components.map((c) => ({
        name: c.name,
        graph: {
          forEachNode: (cb: (n: unknown) => unknown) => {
            for (const n of c.nodes) if (cb(n)) return;
          }
        }
      })),
    getAllVariants: () => variants
  } as never;
}

const TOKENS = [
  { name: '--primary', value: '#c2410c' },
  { name: '--ring', value: 'var(--primary)' },
  { name: '--primary-hover', value: '#9a3412' },
  { name: '--gradient-brand', value: 'linear-gradient(135deg, var(--primary) 0%, var(--foreground) 100%)' },
  { name: '--space-4', value: '16px' }
];

const FIXTURE = project(
  [
    {
      name: '/Pages/Home',
      nodes: [
        { id: 'hero', label: 'Hero', typename: 'Group', parameters: { backgroundColor: 'var(--primary)', paddingLeft: 'var(--space-4)' } },
        { id: 'cta', label: 'Buy', typename: 'Button', parameters: { border: '1px solid var(--primary)' } },
        // The same node names it twice: once, not twice.
        { id: 'twice', label: '', typename: 'Text', parameters: { color: 'var(--primary)', textShadow: '0 1px var(--primary)' } },
        { id: 'hover-only', label: 'Card', typename: 'Group', parameters: {}, stateParameters: { hover: { borderColor: 'var(--primary)' } } },
        { id: 'none', label: 'Plain', typename: 'Group', parameters: { backgroundColor: '#fff' } }
      ]
    },
    { name: '/Pages/About', nodes: [{ id: 'about', label: 'About', typename: 'Text', parameters: { color: 'var(--space-4)' } }] }
  ],
  [
    { name: 'Card', typename: 'Group', parameters: { backgroundColor: 'var(--primary)' } },
    { name: 'Quiet', typename: 'Group', parameters: { backgroundColor: '#eee' }, stateParameters: { pressed: { color: 'var(--primary)' } } },
    { name: undefined, typename: 'Group', parameters: { color: 'var(--primary)' } }
  ]
);

describe('CMG-002 AC5 — tokenUsageIn counts nodes, Looks and tokens, each once', () => {
  const usage = tokenUsageIn(FIXTURE, TOKENS, '--primary');

  it('🔴 finds every node that names the token — in a compound value and in a visual state too — and never twice', () => {
    expect(usage.nodes.map((n) => n.nodeId)).toEqual(['hero', 'cta', 'twice', 'hover-only']);
    expect(usage.nodes.find((n) => n.nodeId === 'twice')!.fields).toEqual(['color', 'textShadow']);
    expect(usage.nodes.find((n) => n.nodeId === 'hover-only')!.fields).toEqual(['borderColor']);
    expect(usage.nodes[0]).toMatchObject({ componentName: '/Pages/Home', label: 'Hero', typename: 'Group', fields: ['backgroundColor'] });
  });

  it('finds the Looks that carry it, neutral or in a state, and skips the unnamed default Look', () => {
    expect(usage.looks).toEqual([
      { name: 'Card', typename: 'Group' },
      { name: 'Quiet', typename: 'Group' }
    ]);
  });

  it('finds the other tokens whose value references it, and not itself', () => {
    expect(usage.tokens).toEqual(['--ring', '--gradient-brand']);
  });

  it('the count is the three lists added up, and the sentence names all three kinds', () => {
    expect(tokenUsageCount(usage)).toBe(8);
    expect(describeTokenUsage(usage)).toBe('Used by 4 nodes, 2 Looks and 2 other tokens');
  });

  it('a token nothing wears says so in the §5 words', () => {
    const none = tokenUsageIn(FIXTURE, TOKENS, '--primary-hover');
    expect(tokenUsageCount(none)).toBe(0);
    expect(describeTokenUsage(none)).toBe('Nothing wears this yet');
  });

  it('a token worn by one node only reads in the singular', () => {
    const one = tokenUsageIn(FIXTURE, TOKENS, '--space-4');
    expect(one.nodes.map((n) => n.nodeId)).toEqual(['hero', 'about']);
    expect(describeTokenUsage({ ...one, nodes: one.nodes.slice(0, 1) })).toBe('Used by 1 node');
  });

  it('🔴 the walk reaches every node: a fixture that stops on a truthy return is the control', () => {
    // Five nodes in Home, four wearers: a walk that returned `push`'s length would have stopped at one.
    expect(usage.nodes.filter((n) => n.componentName === '/Pages/Home')).toHaveLength(4);
  });

  it('a node whose label getter throws is listed with an empty label rather than taking the list down', () => {
    const broken = project([{ name: '/X', nodes: [{ id: 'b', get label() { throw new Error('no type'); }, parameters: { color: 'var(--primary)' } }] }]);
    expect(tokenUsageIn(broken, TOKENS, '--primary').nodes).toEqual([{ componentName: '/X', nodeId: 'b', label: '', typename: '', fields: ['color'] }]);
  });

  it('no project: nothing, not a throw', () => {
    expect(tokenUsageIn(null, TOKENS, '--primary')).toEqual({ nodes: [], looks: [], tokens: [] });
  });
});

describe('CMG-002 §3.1 — the kinds a section offers, in words', () => {
  const CONTRACT = path.join(__dirname, '../../../nodegx-project-contract/tokens.ts');
  const contractCategories = () => {
    const src = fs.readFileSync(CONTRACT, 'utf8');
    const m = src.match(/export type TokenCategory =([\s\S]*?);/)!;
    return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
  };

  it('every non-colour category the CONTRACT declares has a word', () => {
    const categories = contractCategories().filter((c) => !c.startsWith('color-'));
    expect(categories.length).toBeGreaterThanOrEqual(10);
    for (const c of categories) expect([c, (KIND_WORDS as Record<string, string>)[c]]).not.toEqual([c, undefined]);
    // And no word for a category that is not in the contract.
    for (const c of Object.keys(KIND_WORDS)) expect(contractCategories()).toContain(c);
  });

  it('a section with several kinds offers them all, read off the one table; a section with one offers one', () => {
    expect(kindsForGroup('Typography').map((k) => k.word)).toEqual(['Text size', 'Weight', 'Line height', 'Letter spacing', 'Font']);
    expect(kindsForGroup('Effects').map((k) => k.word)).toEqual(['Shadow', 'Gradient']);
    expect(kindsForGroup('Animation').map((k) => k.word)).toEqual(['Duration', 'Easing']);
    expect(kindsForGroup('Borders').map((k) => k.word)).toEqual(['Corner radius', 'Border width']);
    expect(kindsForGroup('Spacing')).toEqual([{ category: 'spacing', word: 'Spacing' }]);
    // Colours are not added here.
    expect(kindsForGroup('Colors')).toEqual([]);
    for (const group of TOKEN_CATEGORY_GROUPS) {
      for (const kind of kindsForGroup(group)) expect(TOKEN_CATEGORIES[kind.category].group).toBe(group);
    }
  });

  it('a new token starts as a copy of the last of its kind, else the kind\'s first default — never blank', () => {
    const tokens = [
      { name: '--space-4', value: '16px', category: 'spacing', isCustom: false },
      { name: '--space-huge', value: '96px', category: 'spacing', isCustom: true }
    ] as never;
    expect(startingValueFor('spacing', tokens)).toBe('96px');
    expect(startingValueFor('shadow', tokens)).not.toBe('');
    expect(startingValueFor('animation-easing', [])).toMatch(/cubic-bezier|linear|ease/);
  });

  it('🔴 a composer kind starts from the last value the composer can READ, not from a stray colour filed as a shadow', () => {
    const tokens = [
      { name: '--shadow-md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1)', category: 'shadow', isCustom: false },
      // The 0.3 upgrade / an agent can file a colour under `shadow`; a copy of it would open the composer in text mode.
      { name: '--shadow-color', value: '#29201933', category: 'shadow', isCustom: true }
    ] as never;
    expect(startingValueFor('shadow', tokens)).toBe('0 4px 6px -1px rgb(0 0 0 / 0.1)');
    // Nothing readable in the list: the first readable shipped default (`--shadow-none`), never the colour and never ''.
    const fallback = startingValueFor('shadow', [{ name: '--shadow-color', value: '#29201933', category: 'shadow', isCustom: true }] as never);
    expect(fallback).not.toBe('#29201933');
    expect(fallback).toMatch(/px|none/);
  });
});
