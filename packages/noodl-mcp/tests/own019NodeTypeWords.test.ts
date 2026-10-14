/**
 * P112-OWN019-NODETYPEWORDS — `list_node_types`' `query` was one substring. Mistral Large 4 searches in a list of
 * synonyms: o2 (OWN-019 s4, 2026-10-14) asked for "timer interval delay countdown repeat", got no rows, and walked all
 * fifteen categories one call each. `list_examples` and `find_tools` already widen a phrase that finds nothing to its
 * words (P112-OWN018-READWASTE, P109 S13-FINDTOOLSPHRASE); the node catalog did not.
 *
 * Control: on HEAD before the fix, the o2 query returns [] (the first assertion fails).
 */
import { listNodeTypes } from '../src/catalog';

describe('P112-OWN019-NODETYPEWORDS — a query that matches no phrase falls back to its words', () => {
  it("finds Large 4's synonym list, best match first", () => {
    const rows = listNodeTypes({ query: 'timer interval delay countdown repeat' }).map((r) => r.typeName);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows).toContain('Timer');
    expect(rows).toContain('Repeat');
  });

  it('keeps the phrase when the phrase matches', () => {
    const phrase = listNodeTypes({ query: 'drag' }).map((r) => r.typeName);
    expect(phrase.length).toBeGreaterThan(0);
    for (const t of phrase) expect(listNodeTypes({}).find((r) => r.typeName === t)).toBeDefined();
  });

  it('answers a query of nothing but unknown words with no rows', () => {
    expect(listNodeTypes({ query: 'zzqx wwvy' })).toEqual([]);
  });

  it('respects the category filter in the fallback', () => {
    const rows = listNodeTypes({ query: 'timer interval delay countdown repeat', category: 'Visual' });
    expect(rows.map((r) => r.typeName)).not.toContain('Timer');
  });
});
