/**
 * Series — a number the store hands out on create (P116 ONT-015).
 *
 * "Invoice numbers look like INV-2026-0042. The number goes up by one every time, never skips, and
 * is never used twice." The ONT-013 step 4 census found this done by the apps themselves, twice, the
 * same wrong way: the highest (or the count) plus one, worked out before the insert. Both hand a
 * deleted record's number out again, and both give two creates at once the same one. These cases are
 * the promise that the store does it instead; `series-counted-not-taken` (mutants.ts) is that mistake.
 *
 * `unique` is not enough (ONT-015 §8): a spec that proves "no two records share the number" has not
 * proved the counter, so these read the numbers themselves, in order. The year and month roll needs
 * the backend's clock and is graded where the clock can be set (`ont-015-series.test.ts`).
 *
 * @module conformance/cases/series
 */

import { deepEq, eq, ok } from '../assert';
import type { ConformanceCase, ConformanceContext } from '../index';
import type { StorageSeries } from '../../src/storage';

const year = (): string => String(new Date().getUTCFullYear());

/** A fresh collection with a `number` series and a `code` the cases can make collide. */
async function invoices(ctx: ConformanceContext, series: StorageSeries, opts: { uniqueCode?: boolean } = {}): Promise<string> {
  const c = ctx.collection('Invoice');
  ctx.createTable(c, [
    { name: 'number', type: 'String', series },
    { name: 'code', type: 'String' }
  ]);
  if (opts.uniqueCode) {
    ok(typeof ctx.schema.reconcileIndexes === 'function', 'reconcileIndexes is absent; the refused create needs a unique index');
    ctx.schema.reconcileIndexes!(c, [{ fields: ['code'], unique: true }]);
  }
  return c;
}

async function numberOf(ctx: ConformanceContext, c: string, data: Record<string, unknown> = {}): Promise<string> {
  const made = await ctx.create(c, data);
  ok(typeof made.number === 'string', `the created record carries no number: ${JSON.stringify(made)}`);
  const stored = await ctx.fetch(c, String(made.objectId));
  eq(stored.number, made.number, 'the number stored is the number the create answered');
  return made.number as string;
}

export const seriesCases: readonly ConformanceCase[] = Object.freeze([
  {
    id: 'series/hands-out-in-order',
    area: 'series',
    pins: 'a create gets INV-<year>-0001, the next 0002 — the format filled by the store, the counter padded to its width',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'INV-{YYYY}-{####}' });
      deepEq([await numberOf(ctx, c), await numberOf(ctx, c)], [`INV-${year()}-0001`, `INV-${year()}-0002`], 'the first two numbers');
    }
  },

  {
    id: 'series/a-delete-never-gives-a-number-back',
    area: 'series',
    pins: 'a deleted record’s number is never handed out again — the next create gets the next number, not the freed one',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}' });
      await numberOf(ctx, c);
      const second = await ctx.create(c, {});
      eq(second.number, 'T-0002', 'the second number');
      await ctx.remove(c, String(second.objectId));
      eq(await numberOf(ctx, c), 'T-0003', 'the number after a delete');
    }
  },

  {
    id: 'series/two-creates-at-once-get-two-numbers',
    area: 'series',
    pins: 'eight creates in flight at once get eight different numbers, 1 to 8 — the counter is taken, never read and then written',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}' });
      const made = await Promise.all(Array.from({ length: 8 }, () => ctx.create(c, {})));
      deepEq(made.map((r) => r.number).sort(), ['T-0001', 'T-0002', 'T-0003', 'T-0004', 'T-0005', 'T-0006', 'T-0007', 'T-0008'], 'the eight numbers');
    }
  },

  {
    id: 'series/gap-free-two-creates-at-once-wait-in-order',
    area: 'series',
    pins: 'gap-free: eight creates at once get 1 to 8 with nothing skipped — each waits for the one before it',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}', gapFree: true });
      const made = await Promise.all(Array.from({ length: 8 }, () => ctx.create(c, {})));
      deepEq(made.map((r) => r.number).sort(), ['T-0001', 'T-0002', 'T-0003', 'T-0004', 'T-0005', 'T-0006', 'T-0007', 'T-0008'], 'the eight numbers');
    }
  },

  {
    id: 'series/gap-free-a-refused-create-gives-its-number-back',
    area: 'series',
    pins: 'gap-free: a create the store refuses (a unique index) leaves the next create at the number it would have had',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}', gapFree: true }, { uniqueCode: true });
      eq(await numberOf(ctx, c, { code: 'a' }), 'T-0001', 'the first number');
      await ctx.refused(() => ctx.create(c, { code: 'a' }));
      eq(await numberOf(ctx, c, { code: 'b' }), 'T-0002', 'the number after a refused create');
    }
  },

  {
    id: 'series/not-gap-free-a-refused-create-leaves-a-gap',
    area: 'series',
    pins: 'not gap-free (the default, R-g): the counter moves before the insert, so a refused create leaves a gap rather than a lock',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}' }, { uniqueCode: true });
      eq(await numberOf(ctx, c, { code: 'a' }), 'T-0001', 'the first number');
      await ctx.refused(() => ctx.create(c, { code: 'a' }));
      eq(await numberOf(ctx, c, { code: 'b' }), 'T-0003', 'the number after a refused create');
    }
  },

  {
    id: 'series/wider-than-its-padding-keeps-counting',
    area: 'series',
    pins: 'the padding is a minimum: after T-9 comes T-10, not T-0 and not a refusal',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{#}' });
      let last = '';
      for (let i = 0; i < 10; i++) last = await numberOf(ctx, c);
      eq(last, 'T-10', 'the tenth number');
    }
  },

  {
    id: 'series/one-run-of-numbers-per-collection',
    area: 'series',
    pins: 'two collections with the same format each start at 0001 — a counter belongs to its collection and field',
    async run(ctx) {
      const a = await invoices(ctx, { format: 'T-{####}' });
      const b = await invoices(ctx, { format: 'T-{####}' });
      await numberOf(ctx, a);
      await numberOf(ctx, a);
      eq(await numberOf(ctx, b), 'T-0001', 'the other collection’s first number');
    }
  },

  {
    id: 'series/a-number-the-store-is-given-is-kept',
    area: 'series',
    pins: 'a create that carries its own number keeps it, and one in another look does not move the counter — the store’s half of the admin’s backfill (the HTTP doors refuse it from anyone else)',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}' });
      eq(await numberOf(ctx, c, { number: 'OLD-7' }), 'OLD-7', 'the number brought');
      eq(await numberOf(ctx, c), 'T-0001', 'the first number handed out');
    }
  },

  {
    id: 'series/a-number-brought-in-its-look-moves-the-counter-past-it',
    area: 'series',
    pins: 'a number brought in the series’ own look (T-0003) moves the counter past it, never back (T-0002 after it moves nothing), and a create the store refuses moves nothing — the counter never reaches a number already held (P116-S22-SERIESCARRY)',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}' }, { uniqueCode: true });
      eq(await numberOf(ctx, c, { number: 'T-0003', code: 'a' }), 'T-0003', 'the number brought');
      eq(await numberOf(ctx, c, { code: 'b' }), 'T-0004', 'the number handed out after it');
      eq(await numberOf(ctx, c, { number: 'T-0002', code: 'c' }), 'T-0002', 'a lower number brought');
      await ctx.refused(() => ctx.create(c, { number: 'T-0020', code: 'a' }));
      eq(await numberOf(ctx, c, { code: 'd' }), 'T-0005', 'the number after a lower one brought and a refused one');
    }
  },

  {
    id: 'series/a-number-edited-in-its-look-moves-the-counter-past-it',
    area: 'series',
    pins: 'a record whose number is changed to one in the series’ own look (an admin’s correction) moves the counter past it, as a create that brought it would (P116-S22-SERIESCARRY)',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}' });
      const first = await ctx.create(c, {});
      eq(first.number, 'T-0001', 'the first number');
      await ctx.save(c, String(first.objectId), { number: 'T-0002' });
      eq(await numberOf(ctx, c), 'T-0003', 'the number handed out after the edit');
    }
  },

  {
    id: 'series/put-on-records-numbers-them-in-the-order-made',
    area: 'series',
    pins: 'a series put on a field records already fill (ONT-015 AC3) numbers the ones without a value in the order they were made, after the highest number already held; a number in its look is kept, one in another look is kept and counts for nothing',
    async run(ctx) {
      const c = ctx.collection('Invoice');
      ctx.createTable(c, [
        { name: 'number', type: 'String' },
        { name: 'code', type: 'String' }
      ]);
      const ids: Record<string, string> = {};
      for (const [code, number] of [['a', undefined], ['b', 'T-0007'], ['c', undefined], ['d', 'OLD-99']] as const) {
        ids[code] = String((await ctx.create(c, number ? { code, number } : { code })).objectId);
        await new Promise((r) => setTimeout(r, 5)); // createdAt is read to the millisecond
      }
      ok(typeof ctx.schema.setSeries === 'function', 'setSeries is absent; a series cannot be put on records already there');
      ctx.schema.setSeries!(c, { number: { format: 'T-{####}' } });
      const numbers: Record<string, unknown> = {};
      for (const code of Object.keys(ids)) numbers[code] = (await ctx.fetch(c, ids[code])).number;
      deepEq(numbers, { a: 'T-0008', b: 'T-0007', c: 'T-0009', d: 'OLD-99' }, 'the numbers after the series was put on');
      eq(await numberOf(ctx, c), 'T-0010', 'the next number handed out');
    }
  },

  {
    id: 'series/put-on-again-never-moves-the-counter-back',
    area: 'series',
    pins: 'a series put on again over records that were all deleted starts where the counter was, not at 1 — a number is never handed out twice, by a migration either',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}' });
      const made = [await ctx.create(c, {}), await ctx.create(c, {}), await ctx.create(c, {})];
      for (const m of made) await ctx.remove(c, String(m.objectId));
      ok(typeof ctx.schema.setSeries === 'function', 'setSeries is absent');
      ctx.schema.setSeries!(c, { number: { format: 'T-{####}' } });
      eq(await numberOf(ctx, c), 'T-0004', 'the number after three were handed out and deleted');
    }
  },

  {
    id: 'series/taken-off-hands-out-nothing',
    area: 'series',
    pins: 'a series taken off a field (null) hands out nothing more, and the numbers already given stay',
    async run(ctx) {
      const c = await invoices(ctx, { format: 'T-{####}' });
      const first = await numberOf(ctx, c);
      ok(typeof ctx.schema.setSeries === 'function', 'setSeries is absent');
      ctx.schema.setSeries!(c, { number: null });
      const after = await ctx.create(c, { code: 'x' });
      const stored = await ctx.fetch(c, String(after.objectId));
      ok(stored.number === undefined || stored.number === null, `a field with no series was handed ${JSON.stringify(stored.number)}`);
      eq(first, 'T-0001', 'the number given before');
    }
  },

  {
    id: 'series/a-series-that-cannot-be-kept-is-refused',
    area: 'series',
    pins: 'a series on a number column, with no counter in its format, or restarting each year with no year in it, is refused when the table is declared',
    async run(ctx) {
      const bad: Array<[string, { type: string; series: StorageSeries }]> = [
        ['a number column', { type: 'Number', series: { format: 'T-{####}' } }],
        ['no counter', { type: 'String', series: { format: 'INV-{YYYY}' } }],
        ['two counters', { type: 'String', series: { format: '{##}-{##}' } }],
        ['a year restart with no year', { type: 'String', series: { format: 'T-{####}', restart: 'year' } }]
      ];
      for (const [what, col] of bad) {
        let threw = false;
        try {
          ctx.createTable(ctx.collection('Bad'), [{ name: 'number', ...col }]);
        } catch {
          threw = true;
        }
        ok(threw, `a series with ${what} was accepted`);
      }
    }
  }
]);
