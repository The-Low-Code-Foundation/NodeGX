/**
 * P116 ONT-015 §3.3 — the projection of a number people read aloud: the noun's answers become the
 * store's series on its `number` field (held), its claim, its mutant, and the migration step that
 * puts a series on records already there. Graded here without an engine; the claim and the
 * migration run on SQLite and PostgreSQL in `nodegx-backend`'s `tests/ont-015-projection.test.ts`.
 */
import * as fs from 'fs';
import * as path from 'path';

import { applyMutant, numberLookProblem, numberSeries, planMigration, projectWorld, validateWorld, WORLD_FILES, type WorldFiles, type WorldSchema } from '../world';

const FIXTURES = path.join(__dirname, 'fixtures');
function readWorld(fixture: string): WorldFiles {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURES, fixture, f), 'utf8'));
  return { nouns: read(WORLD_FILES.nouns), relations: read(WORLD_FILES.relations), vocabulary: read(WORLD_FILES.vocabulary) };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function project(files: WorldFiles): WorldSchema {
  const out = projectWorld(files);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.schema;
}

/** ONT-015 §1, the person's sentence: "Invoice numbers look like INV-2026-0042 … never skips … starts again at 0001 each January." */
const INVOICE = { readAloud: true, looksLike: 'INV-{YYYY}-{####}', maySkip: false, restarts: 'each year' };
function withInvoice(answers: Record<string, unknown> | undefined): WorldFiles {
  const w = clone(readWorld('world'));
  w.nouns.nouns.push({
    id: 'invoice',
    name: 'Invoice',
    sentence: 'An invoice is what we send a company for what it owes.',
    properties: [{ name: 'amount', kind: 'number' }],
    answers: { onlyOne: false, calledBy: 'amount', history: false, secret: false, readAloud: false, ...(answers ?? {}) }
  } as never);
  return w;
}
const invoice = (s: WorldSchema) => s.collections.find((c) => c.name === 'Invoice')!;

describe('ONT-015 — the invoice sentence projects in full (AC5)', () => {
  const schema = project(withInvoice(INVOICE));

  it('the number is the store’s series, in the person’s look: gap-free (they said never skips), starting again each year', () => {
    expect(invoice(schema).columns.find((c) => c.name === 'number')).toEqual({
      name: 'number',
      kind: 'text',
      type: 'String',
      description: "an invoice's number, which people read aloud",
      series: { format: 'INV-{YYYY}-{####}', restart: 'year', gapFree: true }
    });
  });

  it('its three rules are held — never used twice (the index), never changed (frozen), handed out and never used again (the series) — and none is left in words', () => {
    const held = schema.claims.filter((c) => c.from && 'noun' in c.from && c.from.noun === 'invoice' && c.id.startsWith('invoice/number'));
    expect(held.map((c) => [c.id, c.held]).sort()).toEqual([
      ['invoice/number-is-set-once', true],
      ['invoice/number-is-unique', true],
      ['invoice/number-never-used-again', true]
    ]);
    expect(invoice(schema).notHeld).toEqual([]);
    expect(schema.notHeld.filter((n) => n.collection === 'Invoice')).toEqual([]);
  });

  it('the claim makes records without a number, deletes one, and reads that the next does not get its number back; its mutant takes the series off', () => {
    const claim = schema.claims.find((c) => c.id === 'invoice/number-never-used-again')!;
    const makes = claim.steps.filter((s) => 'make' in s && s.make === 'Invoice');
    expect(makes.every((s) => 'make' in s && !('number' in s.data))).toBe(true);
    expect(claim.steps.filter((s) => 'numbered' in s)).toEqual([
      { numbered: 'Invoice', field: 'number', rows: [expect.any(String), expect.any(String)] },
      { numbered: 'Invoice', field: 'number', rows: [expect.any(String), expect.any(String), expect.any(String)] }
    ]);
    expect(claim.mutant).toEqual({ dropSeries: { collection: 'Invoice', field: 'number' } });
    expect(invoice(applyMutant(schema, claim.mutant!)).columns.find((c) => c.name === 'number')!.series).toBeUndefined();
  });
});

describe('ONT-015 — each answer, and R-g: ask, never assume', () => {
  it.each([
    ['maySkip unanswered: a plain sequence (R-g’s default)', { readAloud: true, looksLike: 'T-{####}' }, { format: 'T-{####}' }],
    ['maySkip yes: a plain sequence', { readAloud: true, looksLike: 'T-{####}', maySkip: true }, { format: 'T-{####}' }],
    ['maySkip no: gap-free', { readAloud: true, looksLike: 'T-{####}', maySkip: false }, { format: 'T-{####}', gapFree: true }],
    ['restarts never', { readAloud: true, looksLike: 'T-{####}', restarts: 'never' }, { format: 'T-{####}' }],
    ['restarts each month', { readAloud: true, looksLike: 'T-{YY}{MM}-{###}', restarts: 'each month' }, { format: 'T-{YY}{MM}-{###}', restart: 'month' }]
  ])('%s', (_what, answers, series) => {
    expect(numberSeries(answers)).toEqual(series);
    expect(invoice(project(withInvoice(answers))).columns.find((c) => c.name === 'number')!.series).toEqual(series);
  });

  it('read aloud with no look said: nothing to hand out — no series, the rule said in words with the reason, and the claim measured to fail', () => {
    const schema = project(withInvoice({ readAloud: true }));
    expect(invoice(schema).columns.find((c) => c.name === 'number')!.series).toBeUndefined();
    expect(schema.notHeld.find((n) => n.collection === 'Invoice')?.why).toMatch(/nobody has said what this one looks like/);
    expect(schema.claims.find((c) => c.id === 'invoice/number-never-used-again')?.held).toBe(false);
  });

  it('the control: not read aloud, no number at all', () => {
    expect(invoice(project(withInvoice({ readAloud: false }))).columns.some((c) => c.name === 'number')).toBe(false);
  });
});

describe('ONT-015 — a look the store cannot hand out is refused in words', () => {
  it.each([
    ['no counter', 'INV-{YYYY}', undefined, /exactly one \{####\}/],
    ['two counters', '{##}-{##}', undefined, /exactly one \{####\}.*has 2/],
    ['an unknown token', 'INV-{DD}-{####}', undefined, /"\{DD\}" is not something a number can show/],
    ['each year, no year', 'T-{####}', 'each year', /must show the year/],
    ['each month, no month', 'T-{YYYY}-{####}', 'each month', /must show the year and the month/]
  ])('%s', (_what, looksLike, restarts, words) => {
    expect(numberLookProblem(looksLike, restarts)).toMatch(words);
    const verdict = validateWorld(withInvoice({ readAloud: true, looksLike, ...(restarts ? { restarts } : {}) }) as unknown as Record<string, unknown>);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.problems.map((p) => p.message).join('\n')).toMatch(words);
  });

  it('the control: the invoice’s own look passes', () => {
    expect(numberLookProblem('INV-{YYYY}-{####}', 'each year')).toBeNull();
    expect(validateWorld(withInvoice(INVOICE) as unknown as Record<string, unknown>).ok).toBe(true);
  });
});

describe('ONT-015 AC3 — a series put on records already there is a migration step', () => {
  const plan = (before: WorldFiles, after: WorldFiles) => {
    const out = planMigration(before, after);
    if (!out.ok) throw new Error(out.problems.join('\n'));
    return out.plan;
  };
  const schemaSteps = (p: ReturnType<typeof plan>) => p.steps.flatMap((s) => ('schema' in s ? [s.schema] : []));

  it('read aloud said of invoices that exist: the field is added plain, then the series numbers them — before the unique rule', () => {
    const p = plan(withInvoice({ readAloud: false }), withInvoice(INVOICE));
    expect(p.refused).toEqual([]);
    const steps = schemaSteps(p);
    const add = steps.findIndex((b) => b.action === 'addColumn' && b.column.name === 'number');
    const put = steps.findIndex((b) => b.action === 'setSeries');
    expect(steps[add]).toEqual({ action: 'addColumn', table: 'Invoice', column: { name: 'number', type: 'String', description: "an invoice's number, which people read aloud" } });
    expect(steps[put]).toEqual({ action: 'setSeries', table: 'Invoice', columns: { number: { format: 'INV-{YYYY}-{####}', restart: 'year', gapFree: true } } });
    expect(put).toBeGreaterThan(add);
    expect(put).toBeLessThan(steps.findIndex((b) => b.action === 'setIndexes' && b.table === 'Invoice'));
    expect(p.steps.find((s) => 'schema' in s && s.schema.action === 'setSeries')!.says).toMatch(/number every invoice that has none, in the order they were made, after the highest one already held/);
    expect(p.reach.find((r) => r.collection === 'Invoice')!.fields).toContain('number');
  });

  it('the look said later, on a number field already there: only the series step', () => {
    const steps = schemaSteps(plan(withInvoice({ readAloud: true }), withInvoice({ readAloud: true, looksLike: 'T-{####}' })));
    expect(steps).toEqual([{ action: 'setSeries', table: 'Invoice', columns: { number: { format: 'T-{####}' } } }, expect.objectContaining({ action: 'describeTable', table: 'Invoice' })]);
  });

  it('the look unsaid again: the series comes off, and the numbers given stay', () => {
    const p = plan(withInvoice({ readAloud: true, looksLike: 'T-{####}' }), withInvoice({ readAloud: true }));
    expect(schemaSteps(p).find((b) => b.action === 'setSeries')).toEqual({ action: 'setSeries', table: 'Invoice', columns: { number: null } });
    expect(p.checks).toEqual([]);
  });

  it('the control: the same world twice plans no series step', () => {
    expect(schemaSteps(plan(withInvoice(INVOICE), withInvoice(INVOICE))).some((b) => b.action === 'setSeries')).toBe(false);
  });
});
