/**
 * NSP-002 AC3 — the trace schema validates both adapters' output; a malformed trace is refused
 * with the path to the bad field; the `subject` door is open (an app-level event the runtime
 * never produces validates).
 *
 * Two validators of one rule set — `schema/trace.schema.json` (for a target in any language,
 * checked here with ajv) and `validateTrace` (this package's, with paths) — are held together
 * by a shared verdict table and by comparing their constants.
 */

import Ajv from 'ajv';

import { Counter, run, validateTrace, assertTrace, TRACE_SCHEMA, TRACE_FORMAT_VERSION, EVENT_KINDS, OUTCOME_VALUES, EVENT_FIELDS } from '../src';
import type { TraceEvent } from '../src';

const ajv = new Ajv({ allErrors: true, strict: true });
const validateWithAjv = ajv.compile(TRACE_SCHEMA);

const counterTrace = run(Counter, { startValue: 5 }, ['settle', { signal: 'increase' }, 'settle']);

/** name, trace, valid? */
const table: Array<[string, unknown, boolean]> = [
  ['the interpreter\'s Counter trace', counterTrace, true],
  ['an empty trace is well-formed (the RUNNER refuses it as an arm with no predicate, NSP-003)', [], true],
  ['a set without value (undefined was written)', [{ t: 'set', port: 'a' }], true],
  ['a value event with a tagged number', [{ t: 'settle' }, { t: 'value', port: 'n', value: { $num: 'NaN' } }], true],
  ['a failure outcome with an error code', [{ t: 'outcome', port: 'go', value: 'failure', error: 'http/timeout' }], true],
  ['the door: an app-level subject the runtime never produces', [{ t: 'in', port: 'press', subject: 'app:click' }, { t: 'settle' }, { t: 'value', port: 'text', value: 'Saved', subject: 'app:screen' }], true],
  ['the door: a graph subject (a node id)', [{ t: 'signal', port: 'done', subject: 'node-7' }], true],
  ['not an array', { t: 'settle' }, false],
  ['an event that is not an object', ['settle'], false],
  ['an unknown kind', [{ t: 'pulse', port: 'a' }], false],
  ['a set without a port', [{ t: 'set', value: 1 }], false],
  ['a value event without a value (C3)', [{ t: 'value', port: 'a' }], false],
  ['a value event carrying a non-canonical number', [{ t: 'value', port: 'a', value: NaN }], false],
  ['a value event carrying a bad tag', [{ t: 'value', port: 'a', value: { $num: 'nope' } }], false],
  ['an outcome that is not one of the three', [{ t: 'outcome', port: 'go', value: 'completed' }], false],
  ['an outcome with an empty error', [{ t: 'outcome', port: 'go', value: 'failure', error: '' }], false],
  ['a field the kind does not carry', [{ t: 'in', port: 'go', value: 1 }], false],
  ['a settle with a port', [{ t: 'settle', port: 'x' }], false],
  ['an empty port name', [{ t: 'in', port: '' }], false],
  ['a subject that is not a string', [{ t: 'in', port: 'go', subject: 7 }], false]
];

describe('one verdict from two validators', () => {
  for (const [name, trace, valid] of table) {
    test(`${valid ? 'accepts' : 'refuses'}: ${name}`, () => {
      expect(validateTrace(trace).ok).toBe(valid);
      // ajv cannot see key ORDER or JavaScript's NaN (JSON.parse never yields one); on every other
      // row the JSON schema must agree with the TypeScript validator.
      const jsonVisible = JSON.stringify(trace) !== undefined && !name.includes('non-canonical number');
      if (jsonVisible) expect(validateWithAjv(JSON.parse(JSON.stringify(trace)))).toBe(valid);
    });
  }
});

describe('a malformed trace names the path to the bad field', () => {
  const paths: Array<[unknown, string]> = [
    [{ t: 'settle' }, '$'],
    [[{ t: 'settle' }, 'x'], '$[1]'],
    [[{ t: 'nope' }], '$[0].t'],
    [[{ t: 'set' }], '$[0].port'],
    [[{ t: 'settle' }, { t: 'value', port: 'a' }], '$[1].value'],
    [[{ t: 'value', port: 'a', value: { x: { b: 1, a: 2 } } }], '$[0].value.x.a'],
    [[{ t: 'outcome', port: 'go', value: 'maybe' }], '$[0].value'],
    [[{ t: 'in', port: 'go', extra: 1 }], '$[0].extra'],
    [[{ t: 'in', port: 'go', subject: '' }], '$[0].subject']
  ];
  for (const [trace, path] of paths) {
    test(path, () => {
      const v = validateTrace(trace);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.path).toBe(path);
    });
  }
  test('assertTrace throws with the path, returns the typed trace otherwise', () => {
    expect(() => assertTrace([{ t: 'set' }])).toThrow('$[0].port');
    const t: TraceEvent[] = assertTrace(counterTrace);
    expect(t).toEqual(counterTrace);
  });
});

describe('the JSON file and the TypeScript constants are one rule set', () => {
  const defs = TRACE_SCHEMA.definitions as { event: { oneOf: Array<{ properties: Record<string, { const?: string }>; required: string[] }> } };
  test(`the schema is versioned as v${TRACE_FORMAT_VERSION}`, () => {
    expect(TRACE_SCHEMA.$id).toMatch(new RegExp(`/v${TRACE_FORMAT_VERSION}\\.json$`));
    expect(TRACE_SCHEMA.title).toContain(`format version ${TRACE_FORMAT_VERSION}`);
  });
  test('the event kinds', () => {
    expect(defs.event.oneOf.map((b) => b.properties.t.const)).toEqual([...EVENT_KINDS]);
  });
  test('required and optional fields per kind (subject always optional)', () => {
    for (const branch of defs.event.oneOf) {
      const kind = branch.properties.t.const as keyof typeof EVENT_FIELDS;
      expect(branch.required).toEqual(['t', ...EVENT_FIELDS[kind].required]);
      expect(Object.keys(branch.properties).sort()).toEqual(['t', 'subject', ...EVENT_FIELDS[kind].required, ...EVENT_FIELDS[kind].optional].sort());
    }
  });
  test('the outcomes', () => {
    const outcome = defs.event.oneOf.find((b) => b.properties.t.const === 'outcome')!;
    expect((outcome.properties.value as { enum: string[] }).enum).toEqual([...OUTCOME_VALUES]);
  });
  test('the decision on `completed` is written into the schema', () => {
    expect(TRACE_SCHEMA.description).toMatch(/`completed` is never recorded/);
  });
});
