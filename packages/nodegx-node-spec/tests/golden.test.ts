/**
 * NSP-010 — a behaviour change is a version, a trace diff, and a migration answer (src/runner/golden.ts).
 *
 * AC1  changing a reducer branch without bumping `version` fails the version rule — planted: Counter's Reset put back
 *      to what it did before FH-022 slice 3 (every Reset Done and a Count Changed pulse), against the committed golden file.
 * AC2  bumping `version` without a `changes` entry fails.
 * AC4  the diff renders as a table with value / signal / outcome columns, the moved frame marked.
 * And the edges: a renamed port is a change; a scenario whose INPUT was edited is not; the history's own shape.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  changesProblems,
  Counter,
  formatGoldenChange,
  formatTraceDiff,
  goldenChange,
  goldenOf,
  loadScenarios,
  versionProblems,
  wrapReducers,
  type AnyNodeSpec,
  type Change,
  type Golden
} from '../src';

const committed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'golden', 'Counter.json'), 'utf8')) as Golden;
const counter = Counter as unknown as AnyNodeSpec;

/** Counter with Reset as it was before FH-022 slice 3: it moves (or not) and always pulses Count Changed and reports Done. */
const preFh022 = (over: Partial<AnyNodeSpec> = {}): AnyNodeSpec => ({
  ...wrapReducers(counter, (name, original) =>
    name === 'reset'
      ? ((s: { start: number }) => ({ set: { count: s.start }, emit: ['countChanged'], outcome: 'done', says: 'back to Start Value' })) as never
      : original
  ),
  ...over
});

const entry = (version: number, migration: Change['migration'] = { none: 'a planted change' }): Change => ({ version, says: 'planted', migration });

describe('the committed golden file', () => {
  test('is what Counter plays today', async () => {
    expect(JSON.stringify(await goldenOf(counter, loadScenarios('Counter')))).toBe(JSON.stringify(committed));
  });
});

describe('AC1 — a changed reducer with an unchanged version fails', () => {
  test('the planted Reset moves two scenarios and the rule names them', async () => {
    const spec = preFh022();
    const now = await goldenOf(spec, loadScenarios('Counter'));
    const change = goldenChange(committed, now);
    expect(change?.traces.map((t) => t.name)).toEqual([
      'the NSP-001 script: seed pulse, one-frame pair, reset done, reset unchanged',
      'Reset when already at Start Value: unchanged, Count Changed silent'
    ]);
    const problems = versionProblems(committed, now, spec);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^Counter: behaviour changed at version 1 — "the NSP-001 script/);
  });

  test('the control: today\'s Counter against the same file passes', async () => {
    expect(versionProblems(committed, await goldenOf(counter, loadScenarios('Counter')), counter)).toEqual([]);
  });

  test('bumped, with its entry, the same change passes', async () => {
    const spec = preFh022({ version: 2, changes: [...(Counter.changes ?? []), entry(2)] });
    expect(versionProblems(committed, await goldenOf(spec, loadScenarios('Counter')), spec)).toEqual([]);
  });
});

describe('AC2 — a bumped version without a changes entry fails', () => {
  test('with the traces moved', async () => {
    const spec = preFh022({ version: 2 });
    expect(versionProblems(committed, await goldenOf(spec, loadScenarios('Counter')), spec)).toEqual([
      'Counter: version 2 has no `changes` entry — say what changed and what happens to apps built on v1'
    ]);
  });

  test('with nothing moved', async () => {
    const spec = { ...counter, version: 2 };
    expect(versionProblems(committed, await goldenOf(spec, loadScenarios('Counter')), spec)).toHaveLength(1);
  });

  test('two versions at once owe two entries', async () => {
    const spec = { ...counter, version: 3, changes: [...(Counter.changes ?? []), entry(3)] };
    expect(versionProblems(committed, await goldenOf(spec, loadScenarios('Counter')), spec)).toEqual([
      'Counter: version 2 has no `changes` entry — say what changed and what happens to apps built on v1'
    ]);
  });

  test('a version that falls fails', async () => {
    const base: Golden = { ...committed, version: 2 };
    expect(versionProblems(base, committed, counter)).toContain('Counter: version fell from 2 to 1');
  });

  test('a spec new at the base owes nothing', async () => {
    expect(versionProblems(undefined, committed, counter)).toEqual([]);
  });
});

describe('what is and is not a change', () => {
  test('a renamed port is one, though no trace names it', () => {
    const renamed: Golden = { ...committed, ports: { ...committed.ports, inputs: committed.ports.inputs.map((p) => (p === 'limitsMin' ? 'minimum' : p)) } };
    expect(goldenChange(committed, renamed)?.ports).toEqual({ removed: ['input limitsMin'], added: ['input minimum'] });
    expect(versionProblems(committed, renamed, counter)[0]).toMatch(/input limitsMin removed; input minimum added/);
  });

  test('a scenario whose input was edited is not — it has no before', () => {
    const edited: Golden = { ...committed, scenarios: committed.scenarios.map((s, i) => (i === 0 ? { ...s, input: 'edited', trace: [] } : s)) };
    expect(goldenChange(committed, edited)).toBeUndefined();
  });

  test('a scenario added or removed is not', () => {
    expect(goldenChange(committed, { ...committed, scenarios: committed.scenarios.slice(1) })).toBeUndefined();
  });
});

describe('the history\'s shape', () => {
  test("Counter's own history is well formed", () => {
    expect(changesProblems(counter)).toEqual([]);
  });

  test.each([
    ['an entry above the version', [entry(2)], /above the spec's version 1/],
    ['two entries for one version', [entry(1), entry(1)], /rising version order/],
    ['no words', [{ ...entry(1), says: ' ' }], /`says` is empty/],
    ['two answers', [entry(1, { none: 'x', parameter: 'reset' } as never)], /exactly one of/],
    ['an empty answer', [entry(1, { project: '' })], /the project answer is empty/],
    ['a parameter the node does not have', [entry(1, { parameter: 'treatUnchangedAs' })], /'treatUnchangedAs' is not an input of Counter/]
  ])('%s fails', (_, changes, message) => {
    expect(changesProblems({ ...counter, changes: changes as Change[] }).join('\n')).toMatch(message);
  });

  test('a parameter the node has passes', () => {
    expect(changesProblems({ ...counter, changes: [entry(1, { parameter: 'limitsEnabled' })] })).toEqual([]);
  });
});

describe('AC4 — the diff a person reads', () => {
  test('a table per scenario, value / signal / outcome columns, the moved frame marked', async () => {
    const spec = preFh022({ version: 2, changes: [...(Counter.changes ?? []), entry(2)] });
    const text = formatGoldenChange(committed, await goldenOf(spec, loadScenarios('Counter')), spec);
    expect(text).toContain('### Counter — v1 → v2');
    expect(text).toContain('- **v2**: planted — *migration: none* — a planted change');
    expect(text).toContain('|  | frame | stimulus | value | signal | outcome |');
    expect(text).toContain('| ● | 2 | ▶ reset |  | ~~(none)~~ → **countChanged** | ~~reset: unchanged~~ → **reset: done** |');
  });

  test('frames line up; a frame on one side only shows a dash', () => {
    const t = formatTraceDiff('x', [{ t: 'settle' }, { t: 'value', port: 'a', value: 1 }], [{ t: 'settle' }, { t: 'value', port: 'a', value: 1 }, { t: 'in', port: 'go' }, { t: 'settle' }, { t: 'signal', port: 'done' }]);
    expect(t.split('\n').slice(-2)).toEqual(['|  | 1 |  | a=1 |  |  |', '| ● | 2 | ~~—~~ → **▶ go** | ~~—~~ → **(none)** | ~~—~~ → **done** | ~~—~~ → **(none)** |']);
  });
});
