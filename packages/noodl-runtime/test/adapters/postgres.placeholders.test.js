/**
 * BRG-005 — the placeholder boundary.
 *
 * The claim this file grades: `QueryBuilder`'s output can be handed to `pg`
 * unchanged apart from the bind markers, and the rewrite cannot mistake a `?`
 * inside SQL data for a marker.
 *
 * The last three cases are the ones that matter. Nothing in `QueryBuilder`
 * emits a `?` inside a literal today — that was measured — so a naive global
 * replace would pass every other case here. These are written against the
 * defect the naive form produces *later*, which shows up as wrong rows on
 * Postgres only.
 */
const { toPgQuery } = require('../../src/api/adapters/postgres/placeholders');

describe('BRG-005 — toPgQuery', () => {
  it('numbers markers left to right and passes the values through', () => {
    const q = toPgQuery('SELECT * FROM "t" WHERE "a" = ? AND "b" > ?', [1, 2]);
    expect(q.text).toBe('SELECT * FROM "t" WHERE "a" = $1 AND "b" > $2');
    expect(q.values).toEqual([1, 2]);
  });

  it('leaves a statement with no markers alone', () => {
    const q = toPgQuery('SELECT 1');
    expect(q.text).toBe('SELECT 1');
    expect(q.values).toEqual([]);
  });

  it('numbers past ten without repeating', () => {
    const params = Array.from({ length: 12 }, (_, i) => i);
    const sql = 'SELECT ' + params.map(() => '?').join(', ');
    const q = toPgQuery(sql, params);
    expect(q.text).toBe('SELECT ' + params.map((_, i) => `$${i + 1}`).join(', '));
  });

  it('throws — naming the builder, not the protocol — when the counts disagree', () => {
    expect(() => toPgQuery('SELECT ?, ?', [1])).toThrow(/2 bind marker\(s\), 1 parameter\(s\)/);
    expect(() => toPgQuery('SELECT ?, ?', [1])).toThrow(/query-builder defect/);
  });

  // --- the three that a naive replace fails ---------------------------------

  it('does not rewrite a ? inside a string literal', () => {
    const q = toPgQuery("SELECT * FROM \"t\" WHERE \"a\" LIKE '%?%' AND \"b\" = ?", ['x']);
    expect(q.text).toBe("SELECT * FROM \"t\" WHERE \"a\" LIKE '%?%' AND \"b\" = $1");
  });

  it('treats a doubled quote as an escape, not as the end of the literal', () => {
    // If '' ended the literal, the ? after it would be read as a marker and the
    // count check would throw — so this asserts the scan, not just the output.
    const q = toPgQuery("SELECT 'it''s ? fine' AS a, ? AS b", [7]);
    expect(q.text).toBe("SELECT 'it''s ? fine' AS a, $1 AS b");
    expect(q.values).toEqual([7]);
  });

  it('does not rewrite a ? inside a quoted identifier or a comment', () => {
    const q = toPgQuery('SELECT "we?ird" FROM "t" -- ? not a marker\n WHERE "a" = ?', [1]);
    expect(q.text).toBe('SELECT "we?ird" FROM "t" -- ? not a marker\n WHERE "a" = $1');
  });

  it('does not swallow the statement when its own output is fed back in', () => {
    // $1 must not be read as a dollar-quote tag; without the identifier rule in
    // matchDollarTag the rest of the statement disappears.
    const once = toPgQuery('SELECT ? , ?', [1, 2]);
    const twice = toPgQuery(once.text, []);
    expect(twice.text).toBe(once.text);
  });
});
