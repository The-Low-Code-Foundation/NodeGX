/**
 * P115 HST-015 — the cases that grade the three Durable Object reds beyond the contract's own suite. Shared by the
 * jest file (`../p115-hst015-durable-object-reds.test.ts`, node:sqlite and a stand-in object) and the spike Worker
 * that runs them inside a real Durable Object on workerd (`dev-docs/tasks/phase-115-online-on-your-own-account/
 * spike-records`, `GET /__hst015`). Relative imports only: the Worker's bundler does not read this package's aliases.
 */
import type { ConformanceCase, ConformanceContext } from '../../../nodegx-backend-contract/conformance/index';
import { read } from '../../../nodegx-backend-contract/conformance/context';
import { lowerToRegex } from '../../../nodegx-backend-contract/src/translators/lowering';
import { readPlainRegex } from '../../../noodl-runtime/src/api/adapters/local-sql/plainRegex';
import { regexpMatch } from '../../../noodl-runtime/src/api/adapters/local-sql/sqlFunctions';

// ---------------------------------------------------------------------------------------------------------------
// The string filters, against the JavaScript function, value by value
// ---------------------------------------------------------------------------------------------------------------

const VALUES = [
  'Ada Lovelace',
  'ada',
  'ADA',
  'lovelace ada',
  'adaada',
  'a.b',
  'axb',
  'C++',
  '',
  'line one\nada',
  'ada\nline two',
  'Ünïcode ada',
  'straße',
  'STRASSE',
  'ſ',
  'K',
  'k',
  'ä',
  'Ä',
  '100%',
  '_x_',
  '(paren)',
  'a$b',
  'back\\slash',
  '\u212a', // KELVIN SIGN: folds to "k" under Unicode rules, not under JavaScript's without the u flag
  '\u0130' // CAPITAL I WITH DOT ABOVE: lowercases to "i" + a combining dot under ICU
];
const LITERALS = ['ada', 'Ada', 'a.b', 'C++', '', 'ß', 'ä', 'k', 's', '%', '_', '(paren)', 'a$b', 'back\\slash', 'line two', 'ada\nline'];
const OPERATORS = [
  'contains',
  'containsIgnoreCase',
  'notContains',
  'startsWith',
  'startsWithIgnoreCase',
  'notStartsWith',
  'endsWith',
  'endsWithIgnoreCase',
  'notEndsWith'
];

interface Asked {
  pattern: string;
  options?: string;
  label: string;
}

function everyAsk(): Asked[] {
  const asks: Asked[] = [];
  for (const literal of LITERALS) {
    for (const op of OPERATORS) {
      const lowered = lowerToRegex(op, literal)!;
      asks.push({ pattern: lowered.pattern, options: lowered.options, label: `${op} ${JSON.stringify(literal)}` });
    }
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    asks.push({ pattern: `^${escaped}$`, label: `equals ${JSON.stringify(literal)}` });
    asks.push({ pattern: `^${escaped}$`, options: 'i', label: `equals, any case ${JSON.stringify(literal)}` });
    asks.push({ pattern: escaped, options: 'm', label: `contains, m ${JSON.stringify(literal)}` });
    asks.push({ pattern: escaped, options: 'iu', label: `contains, iu ${JSON.stringify(literal)}` });
    asks.push({ pattern: `^${escaped}`, options: 'm', label: `starts with, m ${JSON.stringify(literal)}` });
  }
  // Real patterns: never plain SQL.
  asks.push({ pattern: '^a.a', label: 'a real pattern' });
  asks.push({ pattern: '\\d+%', label: 'a class' });
  return asks;
}

/**
 * Every ask through the adapter on a text column, the rows compared with the JavaScript function's answer on the
 * same stored values. Where the engine cannot call JavaScript, an ask that is not plain SQL must be REFUSED in words
 * (and is counted), never answered.
 */
export function stringFilterCase(canCallJs: boolean, tally: { plain: number; viaFunction: number; refused: number }): ConformanceCase {
  return {
    id: 'hst015/string-filters-answer-as-the-function-does',
    area: 'filters',
    pins: 'every string filter the product writes, on a text column: the rows the JavaScript function gives, or a refusal in words where it cannot run',
    async run(ctx: ConformanceContext) {
      const c = ctx.collection('Str');
      ctx.createTable(c, [
        { name: 'note', type: 'String' },
        { name: 'i', type: 'Number' }
      ]);
      for (let i = 0; i < VALUES.length; i++) await ctx.create(c, { note: VALUES[i], i });
      await ctx.create(c, { i: -1 }); // no note at all: matched by nothing
      const mismatches: string[] = [];
      for (const ask of everyAsk()) {
        const where = { note: ask.options === undefined ? { $regex: ask.pattern } : { $regex: ask.pattern, $options: ask.options } };
        const want = VALUES.map((v, i) => (regexpMatch(ask.pattern, ask.options ?? '', v) ? i : -2)).filter((i) => i >= 0);
        const plain = readPlainRegex(ask.pattern, ask.options ?? '') !== null;
        if (plain) tally.plain++;
        else tally.viaFunction++;
        if (!plain && !canCallJs) {
          const words = await ctx.refused(() => ctx.query(c, { where }));
          if (!/cannot filter on a pattern \(a regular expression\) on Cloudflare/.test(words)) mismatches.push(`${ask.label}: refused in other words: ${words}`);
          tally.refused++;
          continue;
        }
        const got = (await ctx.query(c, { where, limit: 1000 })).results.map((r) => Number(r.i)).sort((a, b) => a - b);
        if (JSON.stringify(got) !== JSON.stringify(want)) mismatches.push(`${ask.label}: rows ${JSON.stringify(got)}, the function ${JSON.stringify(want)}`);
      }
      if (mismatches.length) throw new Error(`${mismatches.length} string filter(s) answered differently:\n  ${mismatches.slice(0, 20).join('\n  ')}`);
    }
  };
}

/** A pattern on a field that is not text (a number field: SQL and JavaScript spell 42.0 differently) and a map filter. */
export const notPlainCase: ConformanceCase = {
  id: 'hst015/what-cannot-be-plain-sql-is-refused-in-words',
  area: 'filters',
  pins: 'on an engine that cannot call JavaScript, a pattern on a number field and a map filter are refused in a sentence, before anything runs',
  async run(ctx: ConformanceContext) {
    const c = ctx.collection('NotPlain');
    ctx.createTable(c, [
      { name: 'n', type: 'Number' },
      { name: 'where', type: 'GeoPoint' }
    ]);
    await ctx.create(c, { n: 42, where: { __type: 'GeoPoint', latitude: 1, longitude: 1 } });
    const onNumber = await ctx.refused(() => ctx.query(c, { where: { n: { $regex: '^4' } } }));
    if (!/^The built-in backend cannot filter on a pattern/.test(onNumber)) throw new Error(`a pattern on a number field: ${onNumber}`);
    const onMap = await ctx.refused(() =>
      ctx.query(c, { where: { where: { $nearSphere: { __type: 'GeoPoint', latitude: 1, longitude: 1 }, $maxDistanceInKilometers: 10 } } })
    );
    if (!/^The built-in backend cannot filter on a distance or an area of a map on Cloudflare/.test(onMap)) throw new Error(`a map filter: ${onMap}`);
  }
};

/** Eight hops (the contract's most), the caller's row rule at every one and a filter on most: under depth 100. */
export const eightHopsCase: ConformanceCase = {
  id: 'hst015/eight-hops-with-the-rule-at-every-hop',
  area: 'paths',
  pins: 'the longest path the contract allows, guarded at every hop, compiles under a Durable Object’s expression depth',
  async run(ctx: ConformanceContext) {
    const P = ctx.collection('HopPerson');
    const M = ctx.collection('HopMember');
    ctx.createTable(P, [{ name: 'name', type: 'String' }]);
    ctx.createTable(M, [
      { name: 'person', type: 'Pointer', targetClass: P },
      { name: 'role', type: 'String' }
    ]);
    const ann = String((await ctx.create(P, { name: 'ann' })).objectId);
    await ctx.create(P, { name: 'bob' });
    await ctx.create(M, { person: { __type: 'Pointer', className: P, objectId: ann }, role: 'holder' });
    const back = { from: M, by: 'person', where: { role: 'holder' } };
    const forth = { follow: 'person', where: { name: { $exists: true } } };
    const got = await ctx.query(P, {
      where: { $path: { from: { collection: P, where: { name: 'ann' } }, hops: [back, forth, back, forth, back, forth, back, forth], maxDepth: 8 } },
      acl: read(['*', 'u-ann'])
    });
    const names = got.results.map((r) => r.name);
    if (JSON.stringify(names) !== '["ann"]') throw new Error(`eight hops answered ${JSON.stringify(names)}`);
  }
};
