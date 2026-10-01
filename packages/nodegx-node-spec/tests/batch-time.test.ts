/**
 * @jest-environment ./tests/jest-env-real-process.js
 */
/**
 * NSP-013 — dates, time, randomness, parsers on the interpreter, and the two things the world
 * grew for them: a TIME ZONE per play and a DIGEST the world answers itself (world.ts).
 *
 *   AC1–4 (as NSP-011 §4): every batch spec conforms on the interpreter against its own
 *          scenarios, with every mutant killed or declared equivalent and no reducer unreached
 *          (the runtime-side reading is packages/noodl-runtime/test/node-spec/conformance.test.ts);
 *   AC5    every date node conforms in two zones, one crossing a DST change — the scenario files
 *          carry a UTC arm and a Europe/Paris or America/New_York arm of the same steps, and the
 *          generator draws a zone per sequence; here the mechanism: the same steps in two zones
 *          give two answers, and the zone is the WORLD'S, restored after the play;
 *   AC6    Hash and Random Bytes are byte-for-byte under a fixed seed (the digest is the
 *          standard's; the bytes are the world's stream), and a target with no `install()` is
 *          refused for a `random` spec with the reason — never graded against real entropy.
 */

import { DateParts, DateToString, Hash, RandomBytes, Repeat } from '../src/nodes';
import { bytesToHex, encodeBytes } from '../src/nodes/bytes';
import { addToDate, differenceBetween, isoWeek, toDate, truncateTo } from '../src/nodes/date-math';
import { formatDate } from '../src/nodes/date-to-string';
import { parseCSV, toCSV } from '../src/nodes/csv';
import type { AnyNodeSpec, TargetAdapter } from '../src';
import { DEFAULT_WORLD_POOL, digestBytes, EQUIVALENT_MUTANTS, generateSequence, installTimeZone, installWorld, interpreterAdapter, Random, run, runConformance, specs, World } from '../src';

const BATCH = ['net.noodl.DateAdd', 'net.noodl.DateCompare', 'net.noodl.DateDifference', 'net.noodl.DateParts', 'Date To String', 'net.noodl.Now', 'net.noodl.Hash', 'net.noodl.RandomBytes', 'Unique Id', 'net.noodl.ParseCSV', 'net.noodl.ParseXML', 'net.noodl.ParseFeed', 'net.noodl.ToCSV', 'Repeat', 'net.noodl.JSONStreamParser', 'net.noodl.PatternExtractor', 'net.noodl.TextAccumulator', 'net.noodl.StreamBuffer'];

describe('NSP-013 — every batch spec conforms on the interpreter: scenarios, 200 sequences, every mutant killed or declared', () => {
  for (const type of BATCH) {
    test(`${type}`, async () => {
      const spec = specs[type];
      expect(spec).toBeDefined();
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 13, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
      expect(report.refused).toBeUndefined();
      // a row-marked scenario PASSES on the interpreter (the interpreter is the reference): reported as such, not as a failure
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => `${s.name}: ${s.reason ?? JSON.stringify(s.difference)}`)).toEqual([]);
      expect(report.scenarios.length).toBeGreaterThanOrEqual(4);
      expect(report.generated.divergences).toEqual([]);
      expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.mutants!.total).toBeGreaterThan(0);
      // a declared equivalent that stops firing must be dropped, like a known row
      for (const e of report.mutants!.equivalent) expect(`${type}: ${e.why} ×${e.count}`).not.toMatch(/×0$/);
      expect(report.conforms).toBe(true);
    }, 120_000);
  }
});

describe('AC5 — the zone is the world\'s: the same steps give two answers in two zones, and the process is restored', () => {
  const steps = [{ set: 'input', value: '2026-03-08T07:30:00.000Z' }, 'settle'] as const;
  test('Date Parts reads 07:30Z as 03:30 in America/New_York (the spring-forward morning) and 07:30 in UTC', () => {
    const ny = run(DateParts as unknown as AnyNodeSpec, {}, [...steps], new World({ timeZone: 'America/New_York' }));
    const utc = run(DateParts as unknown as AnyNodeSpec, {}, [...steps], new World({ timeZone: 'UTC' }));
    expect(ny).toContainEqual({ t: 'value', port: 'hours', value: 3 });
    expect(utc).toContainEqual({ t: 'value', port: 'hours', value: 7 });
  });
  test('a generated sequence for a `timezone` spec draws a zone from the pool; the DST pair and a half-hour offset are in the default pool', () => {
    const zones = new Set(Array.from({ length: 40 }, (_, i) => generateSequence(DateParts as unknown as AnyNodeSpec, 1, i).world?.timeZone));
    expect(zones.size).toBeGreaterThan(1);
    for (const z of zones) expect(DEFAULT_WORLD_POOL.timeZones).toContain(z);
    expect(DEFAULT_WORLD_POOL.timeZones).toEqual(expect.arrayContaining(['Europe/Paris', 'America/New_York', 'Asia/Kolkata']));
  });
  /** The REAL process env (tests/jest-env-real-process.js): the sandbox's `process.env` is a copy V8 never reads. */
  const realEnv = () => (globalThis as unknown as { __nodeSpecRealProcessEnv: Record<string, string | undefined> }).__nodeSpecRealProcessEnv;
  test('installTimeZone sets the real process.env.TZ for the play and puts it back; a world with no zone is UTC; the sandbox copy is not what moves V8', () => {
    expect(realEnv()).toBeDefined();
    const before = realEnv().TZ;
    const restore = installTimeZone(new World({ timeZone: 'Asia/Tokyo' }));
    expect(realEnv().TZ).toBe('Asia/Tokyo');
    expect(new Date('2026-01-01T00:00:00Z').getHours()).toBe(9);
    restore();
    expect(realEnv().TZ).toBe(before);
    expect(new World({}).timeZone).toBe('UTC');
    // the trap this environment exists for: a write to the sandbox's copy moves nothing
    const sandboxBefore = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';
    expect(new Date('2026-01-01T00:00:00Z').getHours()).not.toBe(9);
    if (sandboxBefore === undefined) delete process.env.TZ;
    else process.env.TZ = sandboxBefore;
  });
  test('the interpreter adapter installs the zone with the world and restores it after the play', () => {
    const before = realEnv().TZ;
    const adapter = interpreterAdapter();
    const restore = adapter.install!(new World({ timeZone: 'Pacific/Auckland' }));
    expect(realEnv().TZ).toBe('Pacific/Auckland');
    expect(new Date('2026-01-01T00:00:00Z').getHours()).toBe(13);
    restore();
    expect(realEnv().TZ).toBe(before);
  });
  test('the date arithmetic reads the zone it runs in: 30 January 2024 23:30Z + 1 month is 29 February 23:30Z in UTC, and 28 February 23:30Z in Europe/Paris where that instant is already the 31st', () => {
    const restoreUtc = installTimeZone(new World({ timeZone: 'UTC' }));
    expect(addToDate(new Date('2024-01-30T23:30:00Z'), 1, 'months').toISOString()).toBe('2024-02-29T23:30:00.000Z');
    expect(differenceBetween(new Date('2024-01-30T23:30:00Z'), new Date('2024-02-28T23:30:00Z'), 'months')).toBe(0);
    expect(truncateTo(new Date('2024-01-31T23:30:00Z'), 'day')).toBe(Date.parse('2024-01-31T00:00:00Z'));
    restoreUtc();
    const restoreParis = installTimeZone(new World({ timeZone: 'Europe/Paris' }));
    expect(addToDate(new Date('2024-01-30T23:30:00Z'), 1, 'months').toISOString()).toBe('2024-02-28T23:30:00.000Z');
    expect(differenceBetween(new Date('2024-01-30T23:30:00Z'), new Date('2024-02-28T23:30:00Z'), 'months')).toBe(1);
    expect(truncateTo(new Date('2024-01-31T23:30:00Z'), 'day')).toBe(Date.parse('2024-01-31T23:00:00Z'));
    restoreParis();
  });
});

describe('AC6 — byte for byte under a seed; refused where a target would read real entropy', () => {
  test('Random Bytes under seed 1: the first New is the hex of the stream\'s first 32 bytes; a failed encoding still consumed its draw', () => {
    const stream = new Random(1).bytes(64);
    const t = run(RandomBytes as unknown as AnyNodeSpec, {}, [{ signal: 'generate' }, 'settle'], new World({ seed: 1 }));
    expect(t).toContainEqual({ t: 'value', port: 'value', value: bytesToHex(stream.subarray(0, 32)) });
    const after = run(RandomBytes as unknown as AnyNodeSpec, { length: 2, encoding: 'base32' }, [{ signal: 'generate' }, 'settle', { set: 'encoding', value: 'hex' }, { signal: 'generate' }, 'settle'], new World({ seed: 1 }));
    expect(after).toContainEqual({ t: 'outcome', port: 'generate', value: 'failure', error: 'random-bytes/failed' });
    expect(after).toContainEqual({ t: 'value', port: 'value', value: bytesToHex(stream.subarray(2, 4)) });
  });
  test('Hash: the digest is the standard\'s — SHA-256("abc") is the FIPS 180-4 vector — and base64url is the same bytes', () => {
    const t = run(Hash as unknown as AnyNodeSpec, { value: 'abc' }, [{ signal: 'hash' }, 'settle', { set: 'encoding', value: 'base64url' }, { signal: 'hash' }, 'settle'], new World({}));
    expect(t).toContainEqual({ t: 'value', port: 'digest', value: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' });
    expect(t).toContainEqual({ t: 'value', port: 'digest', value: 'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0' });
    expect(t.filter((e) => e.t === 'outcome')).toEqual([
      { t: 'outcome', port: 'hash', value: 'done' },
      { t: 'outcome', port: 'hash', value: 'done' }
    ]);
    expect(() => digestBytes('SHA-1', new Uint8Array())).toThrow('Unrecognized algorithm name: SHA-1');
    expect(encodeBytes(digestBytes('SHA-512', new Uint8Array()), 'hex')).toMatch(/^cf83e1357eefb8bd/);
  });
  test('the world\'s crypto.subtle.digest answers in the microtask after the call, byte for byte the host\'s; importKey and sign stay the host\'s', async () => {
    const world = new World({});
    const installed = installWorld(world);
    try {
      const subtle = (globalThis as unknown as { crypto: { subtle: { digest: (a: string, d: Uint8Array) => Promise<ArrayBuffer>; importKey?: unknown; sign?: unknown } } }).crypto.subtle;
      let landed = false;
      const p = subtle.digest('SHA-256', new TextEncoder().encode('abc')).then((buf) => {
        landed = true;
        return bytesToHex(new Uint8Array(buf));
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(landed).toBe(true);
      expect(await p).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
      await expect(subtle.digest('MD5', new Uint8Array())).rejects.toThrow('Unrecognized algorithm name: MD5');
      expect(typeof subtle.importKey).toBe('function');
      expect(typeof subtle.sign).toBe('function');
    } finally {
      installed.restore();
    }
  });
  test('a target with no install() is refused for Random Bytes, Hash and the date nodes, each with the reason', async () => {
    const bare: TargetAdapter = { ...interpreterAdapter(), name: 'bare' };
    delete (bare as { install?: unknown }).install;
    for (const type of ['net.noodl.RandomBytes', 'net.noodl.Hash', 'net.noodl.DateParts']) {
      const report = await runConformance(specs[type], bare, { sequences: 1 });
      expect(report.refused).toMatch(/needs .* and bare has no install\(\)/);
      expect(report.conforms).toBe(false);
    }
  });
});

describe('what the source does, not what it says — NSP-013 §6, pinned', () => {
  test('C16 / D15: an unknown unit throws in addToDate and is read as years by differenceBetween', () => {
    expect(() => addToDate(new Date(0), 1, 'fortnights' as never)).toThrow('Unknown unit "fortnights".');
    const restore = installTimeZone(new World({ timeZone: 'UTC' }));
    expect(differenceBetween(new Date('2020-01-01T00:00:00Z'), new Date('2023-06-01T00:00:00Z'), 'fortnights' as never)).toBe(3);
    restore();
  });
  test('D14: with no zone null and a number cannot be read; with a zone a number renders and null renders the epoch', () => {
    expect(formatDate(null, '{year}-{month}-{date}', '', '')).toEqual({ text: '', error: true });
    expect(formatDate(1709214330123, '{year}-{month}-{date}', '', '')).toEqual({ text: '', error: true });
    expect(formatDate(1709214330123, '{year}-{month}-{date}', 'UTC', '')).toEqual({ text: '2024-02-29', error: false });
    expect(formatDate(null, '{year}-{month}-{date}', 'UTC', '')).toEqual({ text: '1970-01-01', error: false });
    expect(formatDate(new Date('nope'), '{year}', 'UTC', '')).toEqual({ text: '', error: true });
    expect(formatDate(new Date(0), '{year}', 'Not/AZone', '')).toEqual({ text: '', error: true });
  });
  test('toDate reads a string, a number, a Date; refuses the rest; isoWeek at the year boundary', () => {
    expect(toDate('')).toBeUndefined();
    expect(toDate(NaN)).toBeUndefined();
    expect(toDate(true)).toBeUndefined();
    expect(toDate(0)!.getTime()).toBe(0);
    expect(toDate('2026-01-01')!.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    const restore = installTimeZone(new World({ timeZone: 'UTC' }));
    expect(isoWeek(new Date('2024-12-30T12:00:00Z'))).toBe(1);
    expect(isoWeek(new Date('2021-01-03T12:00:00Z'))).toBe(53);
    restore();
  });
  test('parseCSV names the line of an unpaired quote; toCSV quotes the three hazards', () => {
    expect(parseCSV('3,"unterminated\n5,6').error).toEqual({ line: 1, message: expect.stringContaining('line 1') });
    expect(parseCSV('a,b\n1,2\n3,"x').error?.line).toBe(3);
    expect(parseCSV('﻿a,b\n1,2').rows).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCSV('"",y').rows).toEqual([['', 'y']]);
    expect(toCSV([{ a: 'say "hi"', b: 'one,two', c: 'two\nlines' }])).toBe('a,b,c\n"say ""hi""","one,two","two\nlines"');
  });
  test('Repeat: the first tick is due from the last frame\'s time, not the clock', () => {
    const t = run(Repeat as unknown as AnyNodeSpec, { interval: 100 }, ['settle', { advance: 500 }, { signal: 'start' }, 'settle', { advance: 100 }, 'settle', { advance: 100 }, 'settle'], new World({}));
    const ticks = t.map((e, i) => (e.t === 'signal' && e.port === 'tick' ? i : -1)).filter((i) => i >= 0);
    expect(ticks).toHaveLength(2);
    expect(t).toContainEqual({ t: 'value', port: 'count', value: 2 });
  });
  test('Date To String: a Format set before any Date says nothing; one already held is ignored', () => {
    const t = run(DateToString as unknown as AnyNodeSpec, {}, [{ set: 'formatString', value: '{year}' }, 'settle', { set: 'input', value: '2024-02-29T13:45:30.123Z' }, 'settle', { set: 'formatString', value: '{year}' }, 'settle'], new World({ timeZone: 'UTC' }));
    expect(t.filter((e) => e.t === 'signal')).toEqual([{ t: 'signal', port: 'inputChanged' }]);
    expect(t).toContainEqual({ t: 'value', port: 'currentValue', value: '2024' });
  });
});
