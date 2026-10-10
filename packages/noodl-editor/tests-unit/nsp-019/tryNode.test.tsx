/**
 * NSP-019 AC2 — "Try this node" reproduces Counter's hand scenarios step by step.
 *
 * ## The scenarios are the pilot's files, not a restatement
 *
 * `packages/nodegx-node-spec/scenarios/Counter.json` is what NSP-004's pilot plays on every target;
 * each one's `params` + `steps` is handed to `playTimeline` exactly as the panel would hand what a
 * person did (a param is a value on the canvas node; a step is a press, a set or a move of the
 * clock). The first scenario — seed pulse, one-frame pair, reset done, reset unchanged — is read
 * line by line against the trace `tests/counter.test.ts` pins; the others must play and answer.
 *
 * ## What the person reads is what is graded
 *
 * The timeline is the product (memory: *correct and usable were never the same criterion*), so the
 * expected value is the English, not the trace events. `TryTimeline` (hook-free) is evaluated as an
 * element tree on the same entries, and `TryNodePanel` (hooks) renders through `react-dom/server`
 * in its not-yet-loaded state — a server render runs no effects, so the dynamic `import()` is never
 * taken here; the model is graded directly above it.
 *
 * ## The disagreement table
 *
 * `spec-disagreements.json` is a snapshot of the bug ledger; the generator's `--check` runs here so
 * a stale snapshot is a red row, not a quiet drift. Counter has no row (its control is the first
 * type that does).
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  disagreementsFor,
  summariseDisagreements,
  typesWithDisagreements
} from '../../src/editor/src/views/panels/propertyeditor/spec/specDisagreements';
import {
  controlsFor,
  parseTyped,
  playTimeline,
  showValue,
  specNamed,
  startParamsFor,
  type Step
} from '../../src/editor/src/views/panels/propertyeditor/spec/tryNodeModel';
import { TryNodePanel } from '../../src/editor/src/views/panels/propertyeditor/spec/TryNodePanel';
import { TryTimeline } from '../../src/editor/src/views/panels/propertyeditor/spec/TryTimeline';
import { render, text } from '../support/renderElements';

const ROOT = path.join(__dirname, '..', '..', '..');
const SCENARIOS = path.join(ROOT, 'nodegx-node-spec', 'scenarios', 'Counter.json');

interface Scenario {
  name: string;
  params: Record<string, unknown>;
  steps: Step[];
}
const scenarios = JSON.parse(fs.readFileSync(SCENARIOS, 'utf8')) as Scenario[];
const Counter = specNamed('Counter')!;

describe('the pilot scenario, step by step', () => {
  test('the scenario files are there, and Counter has a spec', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(7);
    expect(Counter).toBeDefined();
    expect(scenarios[0].name).toMatch(/^the NSP-001 script/);
  });

  test('"seed pulse, one-frame pair, reset done, reset unchanged" reads as plain events', () => {
    const { params, steps } = scenarios[0];
    const timeline = playTimeline(Counter, params, steps);
    expect(timeline.error).toBeUndefined();
    expect(timeline.entries.map((e) => (e.kind === 'frame' ? '—' : e.text))).toEqual([
      'Start Value starts at 5',
      '—',
      'Current Count → 5',
      'Count Changed fires',
      'You press Increase Count',
      '—',
      'Current Count → 6',
      'Count Changed fires',
      'Increase Count: done',
      // increase then decrease inside ONE frame: the count is back where it was, so no value
      // line — but both pulses and both outcomes (C2, C4), as tests/counter.test.ts pins
      'You press Increase Count',
      'You press Decrease Count',
      '—',
      'Count Changed fires',
      'Count Changed fires',
      'Increase Count: done',
      'Decrease Count: done',
      'You press Reset To Start',
      '—',
      'Current Count → 5',
      'Count Changed fires',
      'Reset To Start: done',
      // already at Start Value: Unchanged, Count Changed silent (FH-022)
      'You press Reset To Start',
      '—',
      'Reset To Start: unchanged — nothing to do'
    ]);
    const kinds = timeline.entries.map((e) => e.kind);
    expect(kinds[0]).toBe('start');
    expect(kinds.filter((k) => k === 'you')).toHaveLength(5);
    expect(kinds.filter((k) => k === 'frame')).toHaveLength(5);
  });

  test('"no Start Value: the first settle publishes 0 and no pulse" — a frame with one value and nothing else', () => {
    const s = scenarios.find((x) => x.name.startsWith('no Start Value'))!;
    const { entries } = playTimeline(Counter, s.params, s.steps);
    expect(entries.map((e) => e.text)).toEqual(['the frame ends', 'Current Count → 0']);
  });

  test('"Reset when already at Start Value": the seed pulse, then an unchanged with no pulse', () => {
    const s = scenarios.find((x) => x.name.startsWith('Reset when already'))!;
    const { entries } = playTimeline(Counter, s.params, s.steps);
    expect(entries.filter((e) => e.kind === 'node').map((e) => e.text)).toEqual([
      'Current Count → 3',
      'Count Changed fires',
      'Reset To Start: unchanged — nothing to do'
    ]);
  });

  test('"coercion": what the person typed is shown as typed, what the node did with it is shown after', () => {
    const s = scenarios.find((x) => x.name.startsWith('coercion'))!;
    const { entries } = playTimeline(Counter, s.params, s.steps);
    const lines = entries.map((e) => e.text);
    expect(lines).toContain('Start Value starts at "3"');
    expect(lines).toContain('Max Value starts at "abc"');
    expect(lines).toContain('Current Count → 3');
    // "" on Limits Enabled is false, so Increase is not clamped by the NaN Max Value
    expect(lines).toContain('Current Count → 4');
    expect(lines).toContain('Increase Count: done');
  });

  test.each(scenarios.map((s) => [s.name, s]))('%s plays without a spec error and the node answers', (_name, s) => {
    const scenario = s as Scenario;
    const timeline = playTimeline(Counter, scenario.params, scenario.steps);
    expect(timeline.error).toBeUndefined();
    expect(timeline.entries.some((e) => e.kind === 'node')).toBe(true);
  });

  test('a quiet frame says so; a spec error is reported where the steps stopped', () => {
    // a settle with no stimulus after the seed: nothing comes out
    const quiet = playTimeline(Counter, {}, ['settle', 'settle']);
    expect(quiet.entries.map((e) => e.text)).toEqual([
      'the frame ends',
      'Current Count → 0',
      'the frame ends',
      'nothing happens'
    ]);
    const refused = playTimeline(Counter, {}, [{ signal: 'noSuchPort' }]);
    expect(refused.error).toMatch(/no input "noSuchPort"/);
  });
});

describe('the controls and the typed values', () => {
  test("Counter's controls: four value fields and three presses, labelled from the spec", () => {
    const controls = controlsFor(Counter);
    expect(controls.signals.map((c) => c.label)).toEqual(['Increase Count', 'Decrease Count', 'Reset To Start']);
    expect(controls.values.map((c) => [c.port, c.kind])).toEqual([
      ['startValue', 'number'],
      ['limitsMin', 'number'],
      ['limitsMax', 'number'],
      ['limitsEnabled', 'boolean']
    ]);
  });

  test('a number field keeps non-numeric text AS TEXT, so the coercion scenario can be typed', () => {
    expect(parseTyped('number', '3')).toBe(3);
    expect(parseTyped('number', ' 2.5 ')).toBe(2.5);
    expect(parseTyped('number', 'abc')).toBe('abc');
    expect(parseTyped('number', '')).toBe('');
    expect(parseTyped('boolean', 'true')).toBe(true);
    expect(parseTyped('other', '{"a":1}')).toEqual({ a: 1 });
    expect(parseTyped('other', 'not json')).toBe('not json');
  });

  test("the canvas node's parameters seed the try, kept to the spec's value inputs", () => {
    expect(startParamsFor(Counter, { startValue: 5, increase: true, color: 'red', limitsMax: undefined })).toEqual({
      startValue: 5
    });
    expect(startParamsFor(Counter, undefined)).toEqual({});
  });

  test('showValue: text quoted, nothing for undefined, objects compact and capped', () => {
    expect(showValue('a')).toBe('"a"');
    expect(showValue(undefined)).toBe('nothing');
    expect(showValue({ a: [1, 2] })).toBe('{"a":[1,2]}');
    expect(showValue('x'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('the drawing', () => {
  test('TryTimeline draws every line in order, with a rule where a frame ends', () => {
    const { entries } = playTimeline(Counter, scenarios[0].params, scenarios[0].steps);
    const tree = render(<TryTimeline entries={entries} />)!;
    expect(tree.type).toBe('ol');
    const items = tree.children;
    expect(items).toHaveLength(entries.length);
    expect(items[1].props.className).toBe('TimelineFrame');
    const drawn = text(tree);
    expect(drawn.indexOf('You press Increase Count')).toBeLessThan(drawn.indexOf('Increase Count: done'));
    expect(drawn).toContain('Reset To Start: unchanged — nothing to do');
  });

  test('TryTimeline with nothing tried says so, and an error is drawn last', () => {
    expect(text(render(<TryTimeline entries={[]} />)!)).toContain('Nothing tried yet');
    const tree = render(<TryTimeline entries={[]} error="no input" />)!;
    expect(text(tree)).toContain('The spec refused that: no input');
  });

  test('TryNodePanel renders before the spec package has loaded, and says what it is waiting for', () => {
    expect(renderToStaticMarkup(<TryNodePanel typeName="Counter" isActive={false} />)).toContain(
      'Open to try the node'
    );
    expect(renderToStaticMarkup(<TryNodePanel typeName="Counter" isActive />)).toContain('Loading the spec');
  });
});

describe('the disagreement rows', () => {
  test('the committed snapshot is what the ledger says today (the generator’s --check)', () => {
    const script = path.join(ROOT, 'noodl-editor', 'scripts', 'spec-disagreements.js');
    expect(() => execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  test('Counter has no row; the first type that has one is the known-firing control', () => {
    expect(disagreementsFor('Counter')).toEqual([]);
    const [first] = typesWithDisagreements();
    expect(first).toBeDefined();
    const rows = disagreementsFor(first);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].id).toMatch(/^P107-/);
    expect(summariseDisagreements(rows)).toMatch(/^(once|\d+ times) \(/);
  });

  test('the panel says so, with the ruling, for a type with rows', () => {
    const [first] = typesWithDisagreements();
    const html = renderToStaticMarkup(<TryNodePanel typeName={first} isActive={false} />);
    expect(html).toContain('The spec and the running node disagreed');
    expect(html).toContain(disagreementsFor(first)[0].id);
  });
});
