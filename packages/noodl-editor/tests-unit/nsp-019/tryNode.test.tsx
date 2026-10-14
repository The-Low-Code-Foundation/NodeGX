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
 * expected value is the English, not the trace events. R33 moved *Try* into the *How this node
 * works* modal: `playTry` reads the same trace as rows, port values and what to light; `TryRows`
 * and `TryStage` (hook-free) are evaluated as element trees; the modal's body (`HowItWorks`, hooks)
 * renders through `react-dom/server` with the spec package handed in (`loaded`) — a server render
 * runs no effects, so its own dynamic `import()` is never taken — and once without it, as a control.
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

import { HowItWorks } from '../../src/editor/src/views/panels/propertyeditor/spec/HowItWorks';
import {
  disagreementsFor,
  summariseDisagreements,
  typesWithDisagreements
} from '../../src/editor/src/views/panels/propertyeditor/spec/specDisagreements';
import {
  controlsFor,
  inputsFor,
  outputsFor,
  parseTyped,
  playTimeline,
  playTry,
  showValue,
  specNamed,
  startParamsFor,
  usesClock,
  type Step
} from '../../src/editor/src/views/panels/propertyeditor/spec/tryNodeModel';
import { TryRows } from '../../src/editor/src/views/panels/propertyeditor/spec/TryRows';
import { TryStage } from '../../src/editor/src/views/panels/propertyeditor/spec/TryStage';
import { byClass, render, text } from '../support/renderElements';

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

describe('the modal’s play (R33): rows, port values, what lights', () => {
  test('the pilot scenario as rows: what was done, what the node answered, the outcome as its own field', () => {
    const { params, steps } = scenarios[0];
    const play = playTry(Counter, params, steps);
    expect(play.error).toBeUndefined();
    expect(play.rows.map((r) => [r.what, r.answers.join(', '), r.outcomes.map((o) => o.value).join(' ')])).toEqual([
      ['At load', 'Start Value starts at 5, Current Count → 5, Count Changed fires', ''],
      ['Increase Count', 'Current Count → 6, Count Changed fires', 'done'],
      // one frame, two presses: one row, both outcomes
      ['Increase Count · Decrease Count', 'Count Changed fires, Count Changed fires', 'done done'],
      ['Reset To Start', 'Current Count → 5, Count Changed fires', 'done'],
      ['Reset To Start', '', 'unchanged']
    ]);
  });

  test('port values: the inputs as they stand, each value output as last sent', () => {
    const play = playTry(Counter, { startValue: 2 }, [
      'settle',
      { signal: 'increase' },
      'settle',
      { set: 'limitsMax', value: 9 },
      'settle'
    ]);
    expect(play.inputs).toEqual({ startValue: 2, limitsMax: 9 });
    expect(play.outputs).toEqual({ currentCount: 3 });
    expect(play.rows[play.rows.length - 1]).toMatchObject({ what: 'Max Value 9', quiet: true });
  });

  test('what lights: the last row’s inputs and the outputs it moved — and nothing at load', () => {
    expect(playTry(Counter, {}, ['settle']).lit).toEqual({ inputs: [], outputs: [] });
    const pressed = playTry(Counter, {}, ['settle', { signal: 'increase' }, 'settle']);
    expect(pressed.lit).toEqual({ inputs: ['increase'], outputs: ['currentCount', 'countChanged'] });
    // control: an Unchanged press lights its input and no output
    const clamped = playTry(Counter, { limitsEnabled: true, limitsMax: 0 }, [
      'settle',
      { signal: 'increase' },
      'settle'
    ]);
    expect(clamped.lit).toEqual({ inputs: ['increase'], outputs: [] });
    expect(clamped.rows[1].outcomes).toEqual([{ label: 'Increase Count', value: 'unchanged', error: undefined }]);
  });

  test('a boolean reads on / off; a refused step keeps the rows before it and says why', () => {
    const on = playTry(Counter, {}, ['settle', { set: 'limitsEnabled', value: true }, 'settle']);
    expect(on.rows[1].what).toBe('Limits Enabled on');
    const refused = playTry(Counter, {}, [
      'settle',
      { signal: 'increase' },
      'settle',
      { signal: 'noSuchPort' },
      'settle'
    ]);
    expect(refused.error).toMatch(/no input "noSuchPort"/);
    expect(refused.rows.map((r) => r.what)).toEqual(['At load', 'Increase Count']);
  });

  test('the card’s ports in declaration order, and the clock only for a node that needs it', () => {
    expect(inputsFor(Counter).map((p) => [p.label, p.signal])).toEqual([
      ['Increase Count', true],
      ['Decrease Count', true],
      ['Reset To Start', true],
      ['Start Value', false],
      ['Min Value', false],
      ['Max Value', false],
      ['Limits Enabled', false]
    ]);
    expect(outputsFor(Counter)).toEqual([
      { port: 'currentCount', label: 'Current Count', signal: false },
      { port: 'countChanged', label: 'Count Changed', signal: true }
    ]);
    expect(usesClock(Counter)).toBe(false);
    // control: Delay (type `Timer`) waits on the clock
    expect(usesClock(specNamed('Timer')!)).toBe(true);
  });
});

describe('the drawing', () => {
  test('TryRows: one row per thing done, the newest tinted, outcomes as chips', () => {
    const { rows } = playTry(Counter, scenarios[0].params, scenarios[0].steps);
    const tree = render(<TryRows rows={rows} />)!;
    expect(tree.type).toBe('ol');
    expect(tree.children).toHaveLength(rows.length);
    expect(byClass(tree, 'is-latest')).toHaveLength(1);
    expect(tree.children[rows.length - 1].props.className).toContain('is-latest');
    expect(byClass(tree, 'Chip-done').map((n) => n.ownText)).toEqual([
      'Done',
      'Increase Count: Done',
      'Decrease Count: Done',
      'Done'
    ]);
    expect(byClass(tree, 'Chip-unchanged').map((n) => n.ownText)).toEqual(['Unchanged']);
    // an outcome with nothing sent says so in words too, not only in its chip
    expect(text(tree.children[rows.length - 1])).toBe('5 Reset To Start nothing moves Unchanged');
  });

  test('TryRows: a quiet frame says so; an error is drawn last', () => {
    // a second frame with nothing done belongs to the load row; a set that moves nothing is a quiet row
    const { rows } = playTry(Counter, {}, ['settle', { set: 'limitsMax', value: 9 }, 'settle']);
    expect(text(render(<TryRows rows={rows} />))).toContain('Max Value 9 nothing happens');
    expect(text(render(<TryRows rows={rows} error="no input" />))).toMatch(/The spec refused that: no input$/);
  });

  test('TryStage: the card, a bubble per value port, a signal’s bubble only while lit, the preview pill', () => {
    const tree = render(
      <TryStage
        title="Counter"
        typeLabel="Counter"
        inputs={[
          { port: 'increase', label: 'Increase Count', signal: true, lit: true },
          { port: 'reset', label: 'Reset To Start', signal: true, lit: false },
          { port: 'startValue', label: 'Start Value', signal: false, value: '0', lit: false }
        ]}
        outputs={[
          { port: 'currentCount', label: 'Current Count', signal: false, value: '1', lit: true },
          { port: 'countChanged', label: 'Count Changed', signal: true, lit: true }
        ]}
        preview={{ label: 'Current Count', value: '1', lit: true }}
      />
    )!;
    const bubbles = byClass(tree, 'Bubble').map((n) => n.ownText);
    expect(bubbles).toEqual(['sent', '0', '1', 'fired']);
    expect(byClass(tree, 'is-lit')).toHaveLength(4); // three ports and the pill
    expect(text(byClass(tree, 'PreviewPill')[0])).toBe('Current Count 1');
  });

  // NSP-019 s95 — Richard's drive: Start 2, Min 3, Max 1, and nothing said the settings were wrong
  test('a warning about the settings: in the row that raised it, above the card while it holds, Fixed in the row that cleared it', () => {
    const SAID = 'Min Value 3 is above Max Value 1. With Limits Enabled on, the count gets stuck.';
    const raised = playTry(Counter, {}, ['settle', { set: 'limitsMin', value: 3 }, 'settle', { set: 'limitsMax', value: 1 }, 'settle']);
    // Min 3 over the default Max 0 is already wrong; Max 1 changes the sentence
    expect(raised.rows.map((r) => [r.what, r.problems])).toEqual([
      ['At load', []],
      ['Min Value 3', [{ state: 'raised', text: 'Min Value 3 is above Max Value 0. With Limits Enabled on, the count gets stuck.' }]],
      ['Max Value 1', [{ state: 'raised', text: SAID }]]
    ]);
    expect(raised.problems).toEqual([SAID]);
    // a row whose only answer is a warning is not a quiet one
    expect(raised.rows[2].quiet).toBe(false);
    const rowsText = text(render(<TryRows rows={raised.rows} />));
    expect(rowsText).toContain(`Max Value 1 ${SAID} Warning`);
    expect(byClass(render(<TryRows rows={raised.rows} />)!, 'Chip-failure').map((n) => n.ownText)).toEqual(['Warning', 'Warning']);

    const fixed = playTry(Counter, {}, ['settle', { set: 'limitsMin', value: 3 }, 'settle', { set: 'limitsMax', value: 5 }, 'settle']);
    expect(fixed.rows[2].problems).toEqual([{ state: 'fixed', text: 'Min Value is above Max Value' }]);
    expect(fixed.problems).toEqual([]);
    expect(text(render(<TryRows rows={fixed.rows} />))).toContain('Max Value 5 No longer: Min Value is above Max Value Fixed');

    const stage = (problems?: string[]) =>
      render(<TryStage title="Counter" typeLabel="Counter" inputs={[]} outputs={[]} problems={problems} />)!;
    const ringed = stage([SAID]);
    expect(byClass(ringed, 'StageProblem').map((n) => text(n))).toEqual([SAID]);
    expect(byClass(ringed, 'has-problem')).toHaveLength(1);
    // control: no warning, no banner and no ring
    expect(byClass(stage([]), 'StageProblem')).toHaveLength(0);
    expect(byClass(stage(), 'has-problem')).toHaveLength(0);
  });

  test('the whole modal body, loaded, through react-dom/server: rules left, the stage, the controls, the load row', async () => {
    const loaded = await import('../../src/editor/src/views/panels/propertyeditor/spec/tryNodeModel');
    const html = renderToStaticMarkup(
      <HowItWorks
        typeName="Counter"
        title="Counter"
        typeLabel="Counter"
        parameters={{ startValue: 5 }}
        loaded={loaded}
      />
    );
    expect(html).toContain('How the Counter works');
    expect(html).toContain('The rules');
    expect(html).toContain('Try it');
    for (const signal of ['Increase Count', 'Decrease Count', 'Reset To Start']) expect(html).toContain(signal);
    expect(html).toContain('role="switch"'); // Limits Enabled
    expect(html).toContain('Max Value down by one'); // a stepper
    expect(html).not.toContain('Move time'); // Counter has no clock
    expect(html).toContain('Start Value starts at 5, Current Count → 5, Count Changed fires');
    // control: before the package has loaded, the column says it is loading and draws no controls
    const waiting = renderToStaticMarkup(<HowItWorks typeName="Counter" title="Counter" typeLabel="Counter" />);
    expect(waiting).toContain('Loading the node&#x27;s spec');
    expect(waiting).not.toContain('Max Value down by one');
  });

  test('a node that uses the clock is offered Move time and Same frame', async () => {
    const loaded = await import('../../src/editor/src/views/panels/propertyeditor/spec/tryNodeModel');
    const html = renderToStaticMarkup(<HowItWorks typeName="Timer" title="Delay" typeLabel="Delay" loaded={loaded} />);
    expect(html).toContain('Move time');
    expect(html).toContain('Same frame');
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

  test('the modal says so, with the ruling, for a type with rows — and not for Counter', () => {
    const [first] = typesWithDisagreements();
    const html = renderToStaticMarkup(<HowItWorks typeName={first} title={first} typeLabel={first} />);
    expect(html).toContain('The spec and the running node disagreed');
    expect(html).toContain(disagreementsFor(first)[0].id);
    expect(renderToStaticMarkup(<HowItWorks typeName="Counter" title="Counter" typeLabel="Counter" />)).not.toContain(
      'disagreed'
    );
  });
});
