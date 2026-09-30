/**
 * NSP-001 AC1 — the spec format's rules are enforced by the TYPE SYSTEM.
 *
 * Each `@ts-expect-error` below sits on a line that must NOT compile. ts-jest type-checks this
 * file (jest.config.js explains why `isolatedModules` stays off), and an `@ts-expect-error`
 * with no error under it is TS2578 — so this suite goes red both when a rule is broken by a
 * spec and when a rule stops being enforced.
 */

import { defineNode } from '../src/spec';

describe('defineNode — what fails to typecheck', () => {
  test('a well-formed spec compiles (control)', () => {
    const ok = defineNode({
      type: 'T',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { go: { type: 'signal', outcome: true }, v: { type: 'number', default: 0 } },
      outputs: { n: { type: 'number', from: (s) => s.n }, fired: { type: 'signal' } }
    }).on({
      go: (s) => ({ set: { n: s.n + 1 }, emit: ['fired'], outcome: 'done' })
    });
    expect(ok.type).toBe('T');
  });

  test('1. emit names only declared signal outputs', () => {
    defineNode({
      type: 'T',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { go: { type: 'signal' } },
      outputs: { n: { type: 'number', from: (s) => s.n }, fired: { type: 'signal' } }
    }).on({
      // @ts-expect-error — 'nope' is not a signal output; 'n' is a value output and would fail too
      go: () => ({ emit: ['nope'] })
    });
    expect(true).toBe(true);
  });

  test('2. set names only declared state keys', () => {
    defineNode({
      type: 'T',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { go: { type: 'signal' } },
      outputs: { fired: { type: 'signal' } }
    }).on({
      // @ts-expect-error — 'm' is not a state key
      go: () => ({ set: { m: 1 } })
    });
    expect(true).toBe(true);
  });

  test('3. an outcome input returns an outcome on every path', () => {
    defineNode({
      type: 'T',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { go: { type: 'signal', outcome: true } },
      outputs: { fired: { type: 'signal' } }
    }).on({
      // @ts-expect-error — no `outcome` in the patch
      go: () => ({ emit: ['fired'] })
    });
    defineNode({
      type: 'T',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { go: { type: 'signal', outcome: true } },
      outputs: { fired: { type: 'signal' } }
    }).on({
      // @ts-expect-error — one branch falls off the end (noImplicitReturns)
      go: (s) => {
        if (s.n > 0) return { outcome: 'done' as const };
      }
    });
    expect(true).toBe(true);
  });

  test('4. a signal input must have a reducer; a value input need not', () => {
    defineNode({
      type: 'T',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { go: { type: 'signal' }, v: { type: 'number' } },
      outputs: { fired: { type: 'signal' } },
      // @ts-expect-error — `on` is missing the reducer for `go`
      on: {}
    });
    const valueOnly = defineNode({
      type: 'T',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { v: { type: 'number' } },
      outputs: { n: { type: 'number', from: (s) => s.n } }
    }).on({});
    expect(valueOnly.version).toBe(1);
  });

  test('an input that is not declared outcome: true cannot return one', () => {
    defineNode({
      type: 'T',
      version: 1,
      source: 'tests',
      state: { n: 0 },
      inputs: { go: { type: 'signal' } },
      outputs: { fired: { type: 'signal' } }
    }).on({
      // @ts-expect-error — `outcome` is not a key of Patch
      go: () => ({ outcome: 'done' })
    });
    expect(true).toBe(true);
  });
});
