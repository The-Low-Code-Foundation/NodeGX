/**
 * P132 BWF-008 item 3 — what a step can read, as field trees (BWF-003's model, ported from NodeGX Studio's
 * `automations.mjs`). Each case here is one Studio's `check:automations` pins under "P132 BWF-003: what a step can
 * read", with the same workflows: the two copies answer one question.
 */
import {
  fieldRows,
  itemSources,
  pathWords,
  readSources,
  shapeFields,
  startWords,
  stepsOfRun,
  upstreamOf,
  type ReadSource
} from '../../src/editor/src/models/workflow/workflowSources';

import type { StepKindSpec, WorkflowStep } from '../../src/editor/src/models/workflow/types';
import type { TriggerDef } from '../../src/editor/src/models/triggers/TriggerBackendClient';

const S = (steps: Partial<WorkflowStep>[]) => steps as WorkflowStep[];

describe('P132 BWF-008 what came before a step', () => {
  // a diamond, A → B, A → C, B and C → D, C fails to E
  const dia = S([
    { id: 'A', kind: 'branch', routes: { ontrue: ['B'], onfalse: ['C'] } },
    { id: 'B', kind: 'wait', next: ['D'] },
    { id: 'C', kind: 'wait', next: ['D'], onError: ['E'] },
    { id: 'D', kind: 'merge' },
    { id: 'E', kind: 'stop' }
  ]);
  const up = (id: string) => upstreamOf(dia, id).map((s) => s.id).join();

  it('reads every step with a path to it, over next, routes and onError', () => {
    expect(['D', 'B', 'C', 'A', 'E'].map(up)).toEqual(['A,B,C', 'A', 'A', '', 'A,C']);
  });

  it('does not hang on a loop', () => {
    expect(upstreamOf(S([{ id: 'a', next: ['b'] }, { id: 'b', next: ['a'] }]), 'a').map((s) => s.id)).toEqual(['b']);
  });
});

describe("P132 BWF-008 a kind's fields from the catalog's words", () => {
  it('names the fields of the first `{ … }`, a nested list as one field', () => {
    expect(shapeFields('`{ result: boolean, isfalse: boolean }` — mirrors the client Condition node.')).toEqual(['result', 'isfalse']);
    expect(shapeFields('`{ results: unknown[], count, skipped, errors: [{index,message}], failed: number }`.')).toEqual([
      'results',
      'count',
      'skipped',
      'errors',
      'failed'
    ]);
    expect(shapeFields('`{ matched: string | null, value: unknown }`.')).toEqual(['matched', 'value']);
    expect(shapeFields('The object you described, and nothing else')).toEqual([]);
  });
});

describe('P132 BWF-008 the sources a step reads', () => {
  const ww = S([
    { id: 'check', name: 'The watering names its plant', kind: 'validate', next: ['mark'] },
    { id: 'mark', name: 'Mark the plant watered', kind: 'call-function', ref: 'Cloud Functions/Mark watered', params: { plant: { $path: 'body.plant' } } }
  ]);
  const watered = [
    { id: 't', type: 'db-change', dbChange: { collection: 'Watering', actions: ['create'] }, target: { kind: 'workflow', name: 'when-watered' } }
  ] as unknown as TriggerDef[];
  const cat: Record<string, Partial<StepKindSpec>> = {
    validate: { displayName: 'Validate', output: '`{ ok: true, checked: number }` when every rule held.' }
  };
  const have = {
    starts: watered,
    columns: (t: string) => (t === 'Watering' ? ['plant', 'note', 'at'] : null),
    kind: (k: string) => cat[k] as StepKindSpec | undefined,
    answers: (s: WorkflowStep) => (s.ref === 'Cloud Functions/Mark watered' ? ['changed'] : null)
  };

  it("the first step, no run yet: what started it is the table's columns, said as a shape", () => {
    const first = readSources(ww, 'check', have);
    expect(first.map((x) => x.root)).toEqual(['body', 'trigger']);
    expect(first[0].from).toBe('shape');
    expect(Object.keys(first[0].value as object)).toEqual(['objectId', 'plant', 'note', 'at', 'createdAt', 'updatedAt']);
    expect(first[0].words).toBe('the Watering that was made');
    expect(startWords([])).toBe('what it was given');
  });

  it('the step after it: the step before, its catalog shape, under its own name', () => {
    const second = readSources(ww, 'mark', have)[2];
    expect(second.root).toBe('upstream.check');
    expect(second.from).toBe('shape');
    expect(Object.keys(second.value as object)).toEqual(['ok', 'checked']);
    expect(second.words).toBe('The watering names its plant');
  });

  it("a run's own values win: the row under body (no ACL), the trigger, the step's output", () => {
    const run = stepsOfRun({
      steps: [
        {
          nodeId: 'check',
          stepIndex: 0,
          status: 'success',
          inputData: {
            action: 'create',
            body: { objectId: 'w1', ACL: { '*': { read: true } }, plant: { objectId: 'p1' } },
            trigger: { type: 'db_change', collection: 'Watering' }
          },
          outputData: { ok: true, checked: 2 }
        }
      ]
    });
    const ran = readSources(ww, 'mark', { ...have, run }) as (ReadSource & { value: any })[];
    expect(ran[0].from).toBe('run');
    expect(ran[0].value.plant.objectId).toBe('p1');
    expect('action' in ran[0].value).toBe(false);
    expect('ACL' in ran[0].value).toBe(false);
    expect(ran[1].value.collection).toBe('Watering');
    expect(ran[2].value.checked).toBe(2);
  });

  it('tested on nothing yet, a sample: its row', () => {
    const sampled = readSources(ww, 'check', { ...have, sample: { body: { objectId: 'w9', plant: 'x' } } });
    expect(sampled[0].from).toBe('sample');
    expect((sampled[0].value as any).objectId).toBe('w9');
  });

  it("a function step's shape: what its Response answers, under result", () => {
    const fn = readSources(
      S([
        { id: 'a', kind: 'call-function', ref: 'Cloud Functions/Mark watered', next: ['b'] },
        { id: 'b', kind: 'return' }
      ]),
      'b',
      have
    );
    expect(fn[2].value).toEqual({ result: { changed: null } });
  });

  it('an unnamed step is titled by its kind, never its id', () => {
    const src = readSources(S([{ id: 'v1', kind: 'validate', next: ['b'] }, { id: 'b', kind: 'return' }]), 'b', have);
    expect(src[2].words).toBe('Validate');
  });
});

describe("P132 BWF-008 inside a filter, the item", () => {
  const list = S([
    { id: 'get', kind: 'call-function', ref: 'F', next: ['keep'] },
    {
      id: 'keep',
      kind: 'filter',
      params: { items: { $path: 'upstream.get.result.plants' }, itemKey: 'plant', condition: { left: { $path: 'plant.thirsty' }, op: 'truthy' } }
    }
  ]);

  it("names the item under its itemKey, from the list's first item in the run, and its position", () => {
    const lrun = stepsOfRun({
      steps: [
        {
          nodeId: 'get',
          stepIndex: 0,
          status: 'success',
          inputData: { body: {} },
          outputData: { result: { plants: [{ name: 'Monstera', thirsty: true }, { name: 'Fern' }] } }
        }
      ]
    });
    const items = itemSources(list, list[1], readSources(list, 'keep', { run: lrun }));
    expect(items[0]).toMatchObject({ root: 'plant', from: 'run', value: { name: 'Monstera' } });
    expect(items[1]).toMatchObject({ root: 'index', leaf: true });
  });

  it('no run: the item is offered, its fields said to come with a test', () => {
    const bare = S([list[0], { id: 'keep', kind: 'filter', params: {} }]);
    const before = itemSources(bare, bare[1], readSources(bare, 'keep', {}));
    expect(before[0].root).toBe('item');
    expect(before[0].from).toBe('shape');
    expect(before[0].note).toMatch(/tested/);
  });
});

describe('P132 BWF-008 a value read from the run, in words', () => {
  const ww = S([
    { id: 'check', name: 'The watering names its plant', kind: 'validate', next: ['mark'] },
    { id: 'mark', name: 'Mark the plant watered', kind: 'call-function', ref: 'Cloud Functions/Mark watered' }
  ]);
  const watered = [{ id: 't', type: 'db-change', dbChange: { collection: 'Watering', actions: ['create'] } }] as unknown as TriggerDef[];

  it('says the field and where it is from', () => {
    expect(pathWords('body.plant', ww, watered)).toEqual({ name: 'plant', from: 'the Watering that was made' });
    expect(pathWords('upstream.mark.result.changed', ww)).toEqual({ name: 'changed', from: 'Mark the plant watered' });
    expect(pathWords('upstream.gone.x', ww).missing).toBe(true);
    expect(pathWords('previous.result', ww).from).toBe('the step before');
    expect(pathWords('plant.name', ww, [], { item: 'plant' }).from).toBe('the list');
    expect(pathWords('body.items.0.name', ww).name).toBe('items › #1 › name');
  });
});

describe('P132 BWF-008 a source as lines', () => {
  it('draws a run value as fields, a list by its first three, a pointer whole', () => {
    const rows = fieldRows({
      root: 'body',
      words: 'x',
      from: 'run',
      value: {
        plant: { __type: 'Pointer', className: 'Plant', objectId: 'p1' },
        tags: ['a', 'b', 'c', 'd'],
        note: 'dry'
      }
    });
    expect(rows.map((r) => [r.path, r.name, r.depth, r.shown, r.folds])).toEqual([
      ['body.plant', 'plant', 0, 'a Plant', false],
      ['body.tags', 'tags', 0, '4 items', true],
      ['body.tags.0', '#1', 1, '"a"', false],
      ['body.tags.1', '#2', 1, '"b"', false],
      ['body.tags.2', '#3', 1, '"c"', false],
      ['body.note', 'note', 0, '"dry"', false]
    ]);
  });

  it('a shape says names, no values', () => {
    const rows = fieldRows({ root: 'upstream.check', words: 'x', from: 'shape', value: { ok: null, checked: null } });
    expect(rows.map((r) => [r.path, r.shown])).toEqual([
      ['upstream.check.ok', null],
      ['upstream.check.checked', null]
    ]);
  });
});
