/**
 * BMG-007 AC1 — every combination of the boxes maps to a scope array the
 * server accepts. The fixture is three function names; the space is
 * Data (read × write) × Functions (any × each of the three) = 4 × 16.
 * The only combination the server refuses is "nothing ticked", and the page
 * refuses that one first (`isEmptyChoice`).
 */
import { validateScopes } from '../../src/security/model';
import { ScopeChoice, describeScopes, fromScopes, isEmptyChoice, toScopes } from '../../src/admin/app/scopes';

const FUNCTIONS = ['sendInvoice', 'cleanup', 'order'];

function* everyChoice(): Generator<ScopeChoice> {
  for (const read of [false, true])
    for (const write of [false, true])
      for (const anyFunction of [false, true])
        for (let mask = 0; mask < 1 << FUNCTIONS.length; mask++) {
          yield { read, write, anyFunction, functions: FUNCTIONS.filter((_, i) => mask & (1 << i)) };
        }
}

describe('BMG-007 scope boxes ⇄ scope strings', () => {
  it('AC1: every non-empty combination is accepted by validateScopes, and only the empty one is not', () => {
    let seen = 0;
    let refused = 0;
    for (const choice of everyChoice()) {
      seen++;
      const scopes = toScopes(choice);
      const verdict = validateScopes(scopes);
      if (isEmptyChoice(choice)) {
        refused++;
        expect(verdict).not.toBeNull();
        expect(scopes).toEqual([]);
      } else {
        expect(verdict).toBeNull();
      }
    }
    expect(seen).toBe(4 * 2 * 8);
    expect(refused).toBe(1);
  });

  it('round-trips: the boxes → strings → the same boxes', () => {
    for (const choice of everyChoice()) {
      const back = fromScopes(toScopes(choice));
      // "any" makes the named list irrelevant on the wire, so it comes back empty.
      const expected = choice.anyFunction ? { ...choice, functions: [] } : choice;
      expect({ ...back, functions: back.functions.slice().sort() }).toEqual({ ...expected, functions: expected.functions.slice().sort() });
    }
  });

  it('uses the coarse shape when both data boxes are ticked, and never both a coarse and a fine one', () => {
    expect(toScopes({ read: true, write: true, anyFunction: false, functions: [] })).toEqual(['classes:*']);
    expect(toScopes({ read: true, write: false, anyFunction: false, functions: [] })).toEqual(['classes:read']);
    expect(toScopes({ read: false, write: true, anyFunction: false, functions: [] })).toEqual(['classes:write']);
    expect(toScopes({ read: false, write: false, anyFunction: true, functions: ['cleanup'] })).toEqual(['functions:*']);
    expect(toScopes({ read: false, write: false, anyFunction: false, functions: ['cleanup', 'order'] })).toEqual(['functions:cleanup', 'functions:order']);
  });

  it('reads what older pages wrote, and drops what it cannot show rather than showing it as text', () => {
    expect(fromScopes(['classes:*', 'functions:cleanup'])).toEqual({ read: true, write: true, anyFunction: false, functions: ['cleanup'] });
    expect(fromScopes(['records:read', 'functions:'])).toEqual({ read: false, write: false, anyFunction: false, functions: [] });
    expect(fromScopes(undefined)).toEqual({ read: false, write: false, anyFunction: false, functions: [] });
  });

  it('describes a key in words for the list', () => {
    expect(describeScopes(['classes:read'])).toEqual(['read data']);
    expect(describeScopes(['classes:*', 'functions:*'])).toEqual(['read data', 'write data', 'any function']);
    expect(describeScopes(['functions:a', 'functions:b', 'functions:c'])).toEqual(['3 functions']);
    expect(describeScopes(['functions:a'])).toEqual(['1 function']);
    expect(describeScopes([])).toEqual([]);
  });
});
