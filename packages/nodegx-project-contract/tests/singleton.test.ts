/**
 * P107 R34 (s93): a second node of a type a component holds once, one rule for the editor and the agent.
 */
import { extraSingletons } from '../singleton';

const types: Record<string, { singleton?: boolean }> = { Page: { singleton: true }, Group: {}, 'noodl.cloud.request': { singleton: true } };
const typeOf = (name: string) => types[name];
const run = (names: string[]) => extraSingletons(names.map((type, i) => ({ id: `n${i}`, type })), (n) => n.type, typeOf).map((n) => n.id);

describe('extraSingletons', () => {
  it('marks nothing when a component holds one Page (the case the old test would have marked)', () => {
    expect(run(['Page', 'Group', 'Group'])).toEqual([]);
  });

  it('marks the second Page and every one after it, never the first', () => {
    expect(run(['Page', 'Group', 'Page', 'Page'])).toEqual(['n2', 'n3']);
  });

  it('counts each singleton type on its own', () => {
    expect(run(['Page', 'noodl.cloud.request', 'noodl.cloud.request'])).toEqual(['n2']);
  });

  it('marks nothing for a type that is not a singleton, or that it cannot resolve (control)', () => {
    expect(run(['Group', 'Group', 'Mystery', 'Mystery'])).toEqual([]);
  });
});
