/**
 * P132 BWF-004 — formulas without code (Richard's ruling R2).
 *
 * What is under test, in the task's own order:
 *
 *  - AC1: every formula computes, and every formula FAILS the way the task says
 *    (loud, in its own words), one case each; the table, the served catalog and
 *    the docs page name exactly the same set.
 *  - AC2: `validate` refuses `{"$fn": "eval"}` and names the list.
 *  - The ruling's edges: the transform's `{"$upper"}` stays data outside a
 *    transform (only `$fn` is on everywhere), a formula works in a condition
 *    operand and in a transform field, and a formula that fails at run time
 *    fails ITS step, down `onError`, rather than the whole run.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ExecutionHistory } from '../src/execution/ExecutionStore';
import { CompositeStepExecutor } from '../src/workflow/steps/CompositeStepExecutor';
import { evaluateCondition } from '../src/workflow/steps/conditions';
import {
  applyFormula,
  collectFormulaErrors,
  FORMULA_LANGUAGE,
  FORMULA_NAMES,
  FormulaError
} from '../src/workflow/steps/formulas';
import { stepKindCatalog } from '../src/workflow/steps/kinds';
import { resolveStepParams, resolveValue, resolveValueDeep } from '../src/workflow/steps/values';
import type { WorkflowDefinition } from '../src/workflow/types';
import { validateWorkflowDefinition, WorkflowEngine } from '../src/workflow/WorkflowEngine';

const DOC = path.resolve(__dirname, '../../../docs/runtime/WORKFLOW-NODES.md');

/** Resolve one value spec against a scope, the way a step's param is. */
function value(spec: unknown, scope: Record<string, unknown> = {}): unknown {
  return resolveValueDeep(spec, scope);
}

function failure(spec: unknown, scope: Record<string, unknown> = {}): string {
  try {
    value(spec, scope);
  } catch (e) {
    expect(e).toBeInstanceOf(FormulaError);
    return (e as Error).message;
  }
  throw new Error('expected the formula to fail loudly, and it did not');
}

const fn = (name: string, ...args: unknown[]) => ({ $fn: name, args });
const p = (at: string) => ({ $path: at });

const SCOPE = {
  body: {
    name: 'Ada',
    blank: '',
    price: '12.5',
    lastWatered: '2026-10-28T09:00:00Z',
    plants: [
      { name: 'Monstera', water: 2 },
      { name: 'Fern', water: 1.5 },
      { name: 'Ivy', water: '3' }
    ]
  }
};

// ---------------------------------------------------------------------------
// AC1 — each formula, a case that works and a case that fails
// ---------------------------------------------------------------------------

describe('BWF-004 each formula computes, and fails loudly in its own words', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date('2026-11-03T10:30:00Z') });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  // One row per formula: [name, a spec that works, what it gives, a spec that fails, what the failure says].
  const CASES: [string, unknown, unknown, unknown, RegExp][] = [
    [
      'text',
      fn('text', 'Hi ', p('body.name'), ', ', p('body.missing'), 3),
      'Hi Ada, 3',
      fn('text', p('body.plants')),
      /"Text with values" needs text.*Join/
    ],
    [
      'upper',
      fn('upper', p('body.name')),
      'ADA',
      fn('upper', p('body.missing')),
      /"Uppercase" needs text for text, got nothing.*First that is not empty/
    ],
    ['lower', fn('lower', 'ADA@X.COM'), 'ada@x.com', fn('lower', p('body.plants')), /"Lowercase" needs text/],
    ['trim', fn('trim', '  Ada  '), 'Ada', fn('trim', p('body')), /"Trim spaces" needs text/],
    ['length', fn('length', p('body.plants')), 3, fn('length', 4), /"Length" needs text or a list/],
    [
      'add',
      fn('add', p('body.price'), 4.5, [1, 2]),
      20,
      fn('add', 1, 'two'),
      /"Add" needs a number for number 2, got "two"/
    ],
    [
      'subtract',
      fn('subtract', 10, 2.5),
      7.5,
      fn('subtract', p('body.missing'), 1),
      /"Subtract" needs a number for number/
    ],
    ['multiply', fn('multiply', p('body.price'), 2), 25, fn('multiply', 2, true), /"Multiply" needs a number/],
    ['divide', fn('divide', 9, 4), 2.25, fn('divide', 1, 0), /"Divide" cannot divide by zero/],
    ['round', fn('round', 2.345, 2), 2.35, fn('round', 2.3, 1.5), /"Round" needs a whole number from 0 to 10/],
    [
      'min',
      fn('min', fn('pick', p('body.plants'), 'water')),
      1.5,
      fn('min', []),
      /"Smallest" needs at least one number/
    ],
    ['max', fn('max', 0, -4, 7), 7, fn('max', 'lots'), /"Largest" needs a number/],
    ['is-empty', fn('is-empty', p('body.blank')), true, fn('is-empty'), /"Is empty" takes 1 value, got 0/],
    ['equals', fn('equals', [1, { a: 2 }], [1, { a: 2 }]), true, fn('equals', 1), /"Equals" takes 2 values, got 1/],
    [
      'default',
      fn('default', p('body.blank'), p('body.missing'), 'friend'),
      'friend',
      fn('default', 'x'),
      /"First that is not empty" takes 2 or more values, got 1/
    ],
    ['not', fn('not', fn('is-empty', p('body.name'))), true, fn('not', 'yes'), /"Not" needs true or false/],
    ['now', fn('now'), '2026-11-03T10:30:00.000Z', fn('now', 1), /"Now" takes no values, got 1/],
    [
      'add-to-date',
      fn('add-to-date', '2026-01-31', 1, 'months'),
      '2026-02-28T00:00:00.000Z',
      fn('add-to-date', 'Tuesday', 1, 'days'),
      /"Add to a date" needs a date/
    ],
    [
      'date-difference',
      fn('date-difference', p('body.lastWatered'), fn('now'), 'days'),
      6,
      fn('date-difference', '2026-01-01', '2026-02-01', 'fortnights'),
      /"Time between" needs one of minutes, hours, days, weeks, months, years for in/
    ],
    [
      'format-date',
      fn('format-date', '2026-11-03T08:05:00Z', 'long'),
      '3 November 2026',
      fn('format-date', '2026-11-03', 'dd/mm/yyyy'),
      /"Format a date" needs one of date, date-time/
    ],
    [
      'start-of',
      fn('start-of', '2026-11-05T17:00:00Z', 'week'),
      '2026-11-02T00:00:00.000Z',
      fn('start-of', 42.5e15, 'day'),
      /"Start of" needs a date/
    ],
    [
      'count',
      fn('count', p('body.plants')),
      3,
      fn('count', p('body.name')),
      /"Count" needs a list for list, got "Ada"/
    ],
    [
      'first',
      fn('first', p('body.plants')),
      { name: 'Monstera', water: 2 },
      fn('first', 'Ada'),
      /"First" needs a list/
    ],
    ['last', fn('last', []), undefined, fn('last', p('body.missing')), /"Last" needs a list.*First that is not empty/],
    [
      'sum',
      fn('sum', p('body.plants'), 'water'),
      6.5,
      fn('sum', p('body.plants'), 'name'),
      /"Sum" needs a number in "name" of item 1, got "Monstera"/
    ],
    [
      'pick',
      fn('pick', p('body.plants'), 'name'),
      ['Monstera', 'Fern', 'Ivy'],
      fn('pick', p('body.plants'), p('body.plants')),
      /"Pick a field from each" needs text for field/
    ],
    [
      'join',
      fn('join', fn('pick', p('body.plants'), 'name'), ', '),
      'Monstera, Fern, Ivy',
      fn('join', p('body.plants'), ', '),
      /"Join" can join text and numbers, but item 1 is an object/
    ]
  ];

  it('has a case for every formula in the table, and no case for one that is not', () => {
    expect(CASES.map((c) => c[0]).sort()).toEqual([...FORMULA_NAMES].sort());
  });

  it.each(CASES)('%s', (_name, ok, gives, bad, says) => {
    expect(value(ok, SCOPE)).toEqual(gives);
    expect(failure(bad, SCOPE)).toMatch(says);
  });

  it("gets the date edges right: month ends, whole units toward zero, a record's Date, UTC", () => {
    expect(value(fn('add-to-date', '2024-01-31', 1, 'months'))).toBe('2024-02-29T00:00:00.000Z');
    expect(value(fn('add-to-date', '2026-03-31T12:00:00Z', -1, 'months'))).toBe('2026-02-28T12:00:00.000Z');
    expect(value(fn('add-to-date', '2026-11-03', -3, 'days'))).toBe('2026-10-31T00:00:00.000Z');
    // One rule for both directions: 31 January plus a month is 28 February, so they are a whole month apart.
    expect(value(fn('date-difference', '2026-01-31', '2026-02-28', 'months'))).toBe(1);
    expect(value(fn('date-difference', '2026-01-31', '2026-02-27', 'months'))).toBe(0);
    expect(failure(fn('add-to-date', '2026-11-03', 9e15, 'days'))).toMatch(/"Add to a date" gave a date too far/);
    expect(value(fn('date-difference', '2026-01-15', '2026-03-15', 'months'))).toBe(2);
    expect(value(fn('date-difference', '2026-11-03', '2026-11-01', 'days'))).toBe(-2);
    expect(value(fn('date-difference', '2024-02-29', '2026-02-28', 'years'))).toBe(2);
    expect(value(fn('add-to-date', '2024-02-29', 2, 'years'))).toBe('2026-02-28T00:00:00.000Z');
    expect(value(fn('date-difference', '2024-03-01', '2026-02-28', 'years'))).toBe(1);
    expect(value(fn('format-date', { __type: 'Date', iso: '2026-11-03T08:05:00.000Z' }, 'date-time'))).toBe(
      '2026-11-03 08:05'
    );
    // A date-time with no zone is UTC, whatever the machine's own zone is.
    expect(value(fn('format-date', '2026-11-03 23:30', 'time'))).toBe('23:30');
    expect(value(fn('start-of', '2026-11-02T10:00:00Z', 'week'))).toBe('2026-11-02T00:00:00.000Z');
    expect(value(fn('start-of', '2026-11-08T23:00:00Z', 'week'))).toBe('2026-11-02T00:00:00.000Z');
    expect(value(fn('start-of', '2026-11-08T23:00:00Z', 'month'))).toBe('2026-11-01T00:00:00.000Z');
  });

  it('never looks up a name on Object.prototype', () => {
    expect(() => applyFormula('constructor', [])).toThrow(/There is no formula "constructor"/);
    expect(() => applyFormula('toString', [])).toThrow(FormulaError);
  });
});

// ---------------------------------------------------------------------------
// AC1 — one list, three readers
// ---------------------------------------------------------------------------

describe('BWF-004 the served list is the computed list, and the docs name it', () => {
  it('serves every formula in the table and nothing else, with words a picker can show', () => {
    const wire = JSON.parse(JSON.stringify(stepKindCatalog())) as ReturnType<typeof stepKindCatalog>;
    expect(wire.version).toBe('1.9.0');
    expect(wire.formulaLanguage.formulas.map((f) => f.name)).toEqual([...FORMULA_NAMES]);
    for (const f of wire.formulaLanguage.formulas) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
      // Every `{arg}` in the sentence is an arg, and every arg is drawn in it.
      const named = [...f.sentence.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      expect(named.sort()).toEqual(f.args.map((a) => a.name).sort());
      for (const a of f.args) if (a.type === 'choice') expect(a.oneOf?.length).toBeGreaterThan(0);
      // The served example is a formula the backend accepts.
      expect(collectFormulaErrors(f.example, f.name)).toEqual([]);
    }
  });

  it('says it in the value language, so a client reading only that finds formulas', () => {
    const { valueLanguage } = stepKindCatalog();
    expect(valueLanguage.forms.map((f) => f.form)).toContain('$fn');
    expect(FORMULA_LANGUAGE.summary).toMatch(/not JavaScript/);
  });

  it('documents every formula on the workflow page', () => {
    const doc = fs.readFileSync(DOC, 'utf-8');
    for (const name of FORMULA_NAMES) expect(doc).toContain(`\`${name}\``);
    expect(doc).toContain('formulaLanguage');
  });
});

// ---------------------------------------------------------------------------
// AC2 and the write-time checks
// ---------------------------------------------------------------------------

function defWith(params: Record<string, unknown>, kind = 'call-function'): WorkflowDefinition {
  const extra = kind === 'call-function' ? { ref: 'f' } : kind === 'branch' ? { routes: { ontrue: ['end'] } } : {};
  return {
    version: 1,
    id: 'w',
    name: 'w',
    entry: 's',
    concurrency: 1,
    createdAt: '',
    updatedAt: '',
    steps: [
      { id: 's', kind, ...extra, params },
      ...(kind === 'branch' ? [{ id: 'end', kind: 'stop', params: {} }] : [])
    ]
  } as unknown as WorkflowDefinition;
}

describe('BWF-004 validate knows the formulas', () => {
  it('AC2: refuses {"$fn":"eval"} and names the list', () => {
    const errors = validateWorkflowDefinition(defWith({ code: { $fn: 'eval', args: ['process.exit()'] } }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/step "s"\.params\.code: there is no formula "eval"/);
    expect(errors[0]).toContain(FORMULA_NAMES.join(', '));
    expect(errors[0]).toMatch(/takes no JavaScript/);
  });

  it('refuses a wrong arg count, a wrong literal type, a misfit nested formula, and extra keys', () => {
    const errors = validateWorkflowDefinition(
      defWith({
        a: fn('divide', 1),
        b: fn('divide', 1, 'two'),
        c: fn('join', fn('count', p('body.plants')), ', '),
        d: { $fn: 'upper', args: ['x'], also: 1 },
        e: fn('add-to-date', fn('now'), 1, 'fortnights'),
        f: { nested: [{ deep: fn('round', 1, 2, 3) }] }
      })
    );
    expect(errors).toEqual([
      'step "s".params.a: "Divide" (divide) takes 2 values, got 1',
      'step "s".params.b.args[1]: "Divide" (divide) needs a number for divided by, got "two"',
      'step "s".params.c.args[0]: "Join" (join) needs a list for list, and "Count" gives a number',
      'step "s".params.d: a formula is written {"$fn": "upper", "args": [...]} and nothing else (found "also")',
      'step "s".params.e.args[2]: "Add to a date" (add-to-date) needs one of minutes, hours, days, weeks, months, years for unit, got "fortnights"',
      'step "s".params.f.nested[0].deep: "Round" (round) takes 1 to 2 values, got 3'
    ]);
  });

  // BWF-004 AC4: an agent nested a transform's shorthand in a formula and read only "got an object".
  it('a $-keyed object in a formula arg says what to write instead', () => {
    const errors = validateWorkflowDefinition(
      defWith({
        a: fn('date-difference', { $default: [p('body.at'), p('body.createdAt')] }, fn('now'), 'days'),
        b: fn('upper', { $shout: 'x' })
      })
    );
    expect(errors).toEqual([
      'step "s".params.a.args[0]: "Time between" (date-difference) needs a date for from, got an object ("$default" is ' +
        'a transform\'s shorthand, data inside a formula: write {"$fn": "default", "args": [...]})',
      'step "s".params.b.args[0]: "Uppercase" (upper) needs text for text, got an object ("$shout" is not a formula: ' +
        'a formula is {"$fn": "<name>", "args": [...]})'
    ]);
  });

  it('accepts a $path anywhere an arg goes (its type is known only when the step runs)', () => {
    expect(
      validateWorkflowDefinition(
        defWith({ days: fn('date-difference', p('body.lastWatered'), fn('now'), p('body.unit')) })
      )
    ).toEqual([]);
  });

  it('checks a formula inside a condition, and inside a transform field', () => {
    const branch = validateWorkflowDefinition(
      defWith(
        { condition: { left: fn('date-diference', p('body.a'), fn('now'), 'days'), op: 'gt', right: 7 } },
        'branch'
      )
    );
    expect(branch).toHaveLength(1);
    expect(branch[0]).toMatch(/params\.condition\.left: there is no formula "date-diference"/);

    const transform = validateWorkflowDefinition(
      defWith({ output: { greeting: fn('text', 'Hi ', { $upper: p('body.name') }), bad: fn('nope') } }, 'transform')
    );
    expect(transform).toHaveLength(1);
    expect(transform[0]).toMatch(/params\.output\.bad: there is no formula "nope"/);
  });

  it('a wait whose duration is a formula is not range-checked as a literal', () => {
    expect(validateWorkflowDefinition(defWith({ duration: fn('multiply', p('body.minutes'), 60000) }, 'wait'))).toEqual(
      []
    );
  });

  it('does not look inside $literal, which is how data that really has a $fn key is written', () => {
    expect(validateWorkflowDefinition(defWith({ raw: { $literal: { $fn: 'eval' } } }))).toEqual([]);
    expect(resolveStepParams({ raw: { $literal: { $fn: 'eval' } } }, {})).toEqual({ raw: { $fn: 'eval' } });
  });
});

// ---------------------------------------------------------------------------
// Where formulas are on, and where the transform's ops still are not
// ---------------------------------------------------------------------------

describe("BWF-004 a formula is on everywhere; the transform's ops are still not", () => {
  it('computes in a plain step param and in a condition operand', () => {
    jest.useFakeTimers({ now: new Date('2026-11-03T10:30:00Z') });
    try {
      expect(
        resolveStepParams({ days: fn('date-difference', p('body.lastWatered'), fn('now'), 'days') }, SCOPE)
      ).toEqual({
        days: 6
      });
      expect(resolveValue(fn('upper', p('body.name')), SCOPE)).toBe('ADA');
      expect(
        evaluateCondition(
          { left: fn('date-difference', p('body.lastWatered'), fn('now'), 'days'), op: 'gt', right: 5 },
          SCOPE
        )
      ).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('leaves {"$upper": …} as data outside a transform, as CWF-004 decided', () => {
    expect(resolveStepParams({ q: { $upper: p('body.name') } }, SCOPE)).toEqual({ q: { $upper: 'Ada' } });
  });
});

// ---------------------------------------------------------------------------
// Through the engine
// ---------------------------------------------------------------------------

describe('BWF-004 end to end, through the engine', () => {
  const tempDirs: string[] = [];

  function engineWith(executor: CompositeStepExecutor): WorkflowEngine {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bwf004-'));
    tempDirs.push(dir);
    const history = new ExecutionHistory();
    history.open(dir);
    return new WorkflowEngine({ executions: history, executor, backendId: 'b1', backendName: 'B1' });
  }

  afterAll(() => {
    for (const d of tempDirs) fs.rmSync(d, { recursive: true, force: true });
  });

  function def(steps: unknown[]): WorkflowDefinition {
    return {
      version: 1,
      id: 'w',
      name: 'w',
      entry: (steps[0] as { id: string }).id,
      concurrency: 1,
      createdAt: '',
      updatedAt: '',
      steps
    } as unknown as WorkflowDefinition;
  }

  it('hands a function the computed values, and a branch reads a formula', async () => {
    const seen: Record<string, unknown>[] = [];
    const executor = new CompositeStepExecutor({
      getRunner: () => null as never,
      overrides: {
        'call-function': {
          async execute(ctx) {
            seen.push(ctx.input);
            return { ok: true };
          }
        }
      }
    });
    const d = def([
      {
        id: 'thirsty',
        kind: 'branch',
        params: {
          condition: {
            left: fn('date-difference', p('body.lastWatered'), '2026-11-03T10:30:00Z', 'days'),
            op: 'gt',
            right: 3
          }
        },
        routes: { ontrue: ['remind'] }
      },
      {
        id: 'remind',
        kind: 'call-function',
        ref: 'notify',
        params: {
          message: fn(
            'text',
            'Hi ',
            p('body.name'),
            ', ',
            fn('join', fn('pick', p('body.plants'), 'name'), ', '),
            ' need water'
          ),
          litres: fn('round', fn('sum', p('body.plants'), 'water'), 1)
        }
      }
    ]);
    expect(validateWorkflowDefinition(d)).toEqual([]);

    const result = await engineWith(executor).run(d, { trigger: { type: 'manual' }, payload: { body: SCOPE.body } });
    expect(result.status).toBe('success');
    expect(seen).toHaveLength(1);
    expect(seen[0].message).toBe('Hi Ada, Monstera, Fern, Ivy need water');
    expect(seen[0].litres).toBe(6.5);
  });

  it("fails the step whose formula cannot be computed, down its onError route, with the formula's sentence", async () => {
    const executor = new CompositeStepExecutor({
      getRunner: () => null as never,
      overrides: {
        'call-function': {
          async execute() {
            throw new Error('the function must not run when its params could not be computed');
          }
        }
      }
    });
    const d = def([
      {
        id: 'split',
        kind: 'call-function',
        ref: 'share',
        params: { each: fn('divide', p('body.total'), p('body.people')) },
        onError: ['why']
      },
      { id: 'why', kind: 'return', params: { value: p('previous.error') } }
    ]);
    expect(validateWorkflowDefinition(d)).toEqual([]);

    const result = await engineWith(executor).run(d, {
      trigger: { type: 'manual' },
      payload: { body: { total: 30, people: 0 } }
    });
    expect(result.status).toBe('success');
    expect(result.stepsRun).toBe(2);
    expect(result.output).toMatchObject({
      message: '"Divide" cannot divide by zero.',
      name: 'FormulaError',
      step: 'split'
    });
  });

  it('a formula failing with no error route halts the run on that step', async () => {
    const executor = new CompositeStepExecutor({ getRunner: () => null as never });
    const d = def([{ id: 'n', kind: 'wait', params: { duration: fn('multiply', p('body.minutes'), 60000) } }]);
    const result = await engineWith(executor).run(d, { trigger: { type: 'manual' }, payload: { body: {} } });
    expect(result.status).toBe('error');
    expect(result.unroutedError).toBe(true);
  });

  // P132-RUNERRORNOREASON: BWF-004 AC4's agent tested a workflow through the MCP and was told only "A step failed with
  // no error route"; it has no tool that reads the per-step record, so it guessed which of three values had failed.
  it('a run halted by a failed step says which step and why', async () => {
    const executor = new CompositeStepExecutor({ getRunner: () => null as never });
    const d = def([
      { id: 'when', kind: 'transform', params: { output: { at: p('body.at') } }, next: ['days'] },
      {
        id: 'days',
        name: 'How many days ago',
        kind: 'transform',
        params: { output: { days: fn('date-difference', p('previous.result.at'), fn('now'), 'days') } }
      }
    ]);
    const result = await engineWith(executor).run(d, {
      trigger: { type: 'manual' },
      payload: { body: { at: '2026-10-27T09:00:00.000Z' } }
    });
    expect(result.status).toBe('error');
    expect(result.failedStep).toMatchObject({ id: 'days', name: 'How many days ago' });
    expect(result.error).toBe(
      'Step "How many days ago" failed: "Time between" needs a date (like 2026-11-03 or 2026-11-03T08:00:00Z) for from, ' +
        'got nothing (the value is missing). A value that may be missing needs "First that is not empty" (default) ' +
        'around it. It has no error route, so the workflow halted.'
    );
  });
});
