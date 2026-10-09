/**
 * P109 ISL-049, row P107-C131 — ruled "One row per id, at the first item's place, kept across a Refresh".
 *
 * Items that repeat an id are one record. A list never holds a record twice (`add` refuses one it has), but `set`
 * diffed against a new list that did: `[a, a, b]` against `[a, b]` found `b` where the second `a` was and moved `a`
 * after it, at every copy of the same list. The Repeater's scenarios grade what a person sees; this grades the diff
 * every list shares.
 */

/* eslint-env jest */

const Collection = require('../src/collection');

const ids = (c) => c.map((m) => m.getId());

describe('ISL-049 — a list with a repeated id keeps it at its first place', () => {
  it('keeps the first place, takes the last fields, and a second copy of the same list moves nothing', () => {
    const c = Collection.create();
    const items = [
      { id: 'c131-a', label: 'A' },
      { id: 'c131-a', label: 'A2' },
      { id: 'c131-b', label: 'B' }
    ];
    c.set(items);
    expect(ids(c)).toEqual(['c131-a', 'c131-b']);
    expect(c.get(0).get('label')).toBe('A2');

    const moves = [];
    c.on('add', (e) => moves.push(['add', e.item.getId()]));
    c.on('remove', (e) => moves.push(['remove', e.item.getId()]));
    c.set(items);

    expect(ids(c)).toEqual(['c131-a', 'c131-b']);
    expect(moves).toEqual([]);
  });

  // The control: a list with no repeated id is copied as it was, its moves unchanged
  it('moves a list with no repeated id as before', () => {
    const c = Collection.create();
    c.set([{ id: 'c131-x' }, { id: 'c131-y' }]);
    const moves = [];
    c.on('add', (e) => moves.push(['add', e.item.getId()]));
    c.on('remove', (e) => moves.push(['remove', e.item.getId()]));
    c.set([{ id: 'c131-y' }, { id: 'c131-x' }]);

    expect(ids(c)).toEqual(['c131-y', 'c131-x']);
    expect(moves.length).toBeGreaterThan(0);
  });
});
