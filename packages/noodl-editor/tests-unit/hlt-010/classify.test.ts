/**
 * HLT-010 — the renderer-error gate's judgement, graded without an editor.
 *
 * `scripts/renderer-errors/run.js` launches and drives a real editor; this grades the half that
 * decides — how a log becomes events, events become classes, and classes become a verdict — on
 * hand-written logs in the exact line forms the dev stack writes.
 *
 * The cases that matter most:
 *  - AC4: one uncaught error is written on TWO channels. P99 §3's 116 `GUEST_VIEW_MANAGER_CALL`
 *    rejections were 232 lines; a line-counting gate is wrong by a factor of two.
 *  - AC5: a class the budget does not name FAILS, whatever its count.
 *  - the channel is read from the line's shape: the mirror carries a process prefix, CDP does not.
 */
import * as path from 'path';

const LIB = path.join(__dirname, '../../../../scripts/renderer-errors');
const { parseLine, parseLog, countEvents, grade, validateBudget } = require(path.join(LIB, 'lib/classify.js'));
const BUDGET = require(path.join(LIB, 'budget.json'));

const ESC = '\u001b';
/** The prefix `scripts/utils/process.ts` puts on every line the editor process writes. */
const mirror = (text: string, where: string | null = 'index.bundle.js:4521') =>
  `${ESC}[36mEditor${ESC}[0m: [renderer:error] ${where ? `(${where}) ` : ''}${text}`;
const cdpException = (text: string) => `[renderer:exception] ${text}`;
const cdpBrowser = (text: string) => `[renderer:error] ${text}`;

const GUEST =
  "Uncaught (in promise) Error: Error invoking remote method 'GUEST_VIEW_MANAGER_CALL': Error: UnknownVizError";

function verdictOf(lines: string[]) {
  const counts = countEvents(parseLog(lines.join('\n')), BUDGET);
  return { counts, verdict: grade(counts, BUDGET) };
}

describe('HLT-010 — reading the log', () => {
  it('tells the three writers apart by the shape of the line', () => {
    expect(parseLine(mirror('boom', 'bugtracker.ts:166'))).toMatchObject({ channel: 'console', where: 'bugtracker.ts:166', message: 'boom', uncaught: false });
    expect(parseLine(cdpException('Uncaught Error: boom'))).toMatchObject({ channel: 'exception', uncaught: true });
    expect(parseLine(cdpBrowser('Failed to load resource: the server responded with a status of 404 () (feed.json)'))).toMatchObject({ channel: 'browser' });
    expect(parseLine(`${ESC}[36mEditor${ESC}[0m: [renderer] process gone: crashed (exitCode 11)`)).toMatchObject({ channel: 'crash' });
  });

  it('ignores every line that is not an error', () => {
    const lines = [
      `${ESC}[36mEditor${ESC}[0m: [renderer:info] (projectmodel.ts:1760) Project saved`,
      `${ESC}[36mEditor${ESC}[0m: [renderer:warning] (x.ts:1) careful`,
      '[cdp] attached to renderer (index.html)',
      '> dev stack starting'
    ];
    expect(parseLog(lines.join('\n'))).toEqual([]);
  });
});

describe('HLT-010 AC4 — events, not lines', () => {
  it('counts one uncaught rejection written on two channels as ONE event', () => {
    const lines: string[] = [];
    for (let i = 0; i < 116; i++) lines.push(mirror(GUEST), cdpException(GUEST));
    const { counts } = verdictOf(lines);
    expect(counts['thumbnail/guest-view-manager-call'].lines).toBe(232);
    expect(counts['thumbnail/guest-view-manager-call'].events).toBe(116);
  });

  it('keeps an event CDP never saw — a boot-time throw is on the mirror only', () => {
    const lines = [mirror(GUEST), mirror(GUEST), mirror(GUEST), cdpException(GUEST)];
    expect(verdictOf(lines).counts['thumbnail/guest-view-manager-call'].events).toBe(3);
  });

  it('pairs a browser message the mirror ALSO carries — not only throws are doubled', () => {
    const msg = 'Not allowed to load local resource: file:///x/y.png';
    const { counts } = verdictOf([mirror(msg, null), cdpBrowser(msg)]);
    const ids = Object.keys(counts);
    expect(ids).toHaveLength(1);
    expect(counts[ids[0]].events).toBe(1);
  });

  it('does not pair different messages — two app errors are two events', () => {
    const lines = [mirror('Each child in a list should have a unique "key" prop.'), mirror('Each child in a list should have a unique "key" prop.')];
    expect(verdictOf(lines).counts['react/missing-key'].events).toBe(2);
  });
});

describe('HLT-010 — the verdict', () => {
  it('is green on a log with no errors', () => {
    expect(verdictOf(['> dev stack starting']).verdict).toEqual({ ok: true, over: [], unknown: [] });
  });

  it('fails a named class over its budget and names it', () => {
    const { verdict } = verdictOf([mirror('Warning: Attempted to synchronously unmount a root while React was already rendering.')]);
    expect(verdict.ok).toBe(false);
    expect(verdict.over.map((o: { id: string }) => o.id)).toEqual(['react/sync-unmount']);
  });

  it('AC5 — fails an UNKNOWN class even at one event', () => {
    const { verdict } = verdictOf([cdpException("Uncaught TypeError: Cannot read properties of undefined (reading 'off')")]);
    expect(verdict.ok).toBe(false);
    expect(verdict.unknown).toHaveLength(1);
    expect(verdict.unknown[0].id).toMatch(/^unknown:Uncaught TypeError/);
  });

  it('gives an unknown class a name that is stable across runs — numbers and hashes folded', () => {
    const a = verdictOf([mirror('Request 1234 to https://a.example/x?y=1 failed (abcdef0123)')]).verdict.unknown[0].id;
    const b = verdictOf([mirror('Request 98 to https://b.example/z failed (0011223344ff)')]).verdict.unknown[0].id;
    expect(a).toBe(b);
  });

  it('allows a class with a reasoned budget up to that budget, and no further', () => {
    const feed = cdpBrowser('Failed to load resource: the server responded with a status of 404 () (feed.json)');
    expect(verdictOf([feed, feed]).verdict.ok).toBe(true);
    expect(verdictOf([feed, feed, feed]).verdict.ok).toBe(false);
  });

  it('treats a webpack compile error as a failed run, not a runtime reading', () => {
    const { verdict } = verdictOf([mirror('[webpack-dev-server] Errors while compiling. Reload prevented.', 'index.js:485')]);
    expect(verdict.over.map((o: { id: string }) => o.id)).toEqual(['build/webpack-compile-error']);
  });
});

describe('HLT-010 AC7 — the budget file', () => {
  it('is valid: unique ids, numeric budgets, a regex, and a stated reason per entry', () => {
    expect(validateBudget(BUDGET)).toEqual([]);
  });

  it('rejects an entry with no reason — a number without one is a baseline, not a budget', () => {
    expect(validateBudget({ classes: [{ id: 'x', match: 'x', budget: 3 }] })).toEqual(['x: needs a reason']);
  });

  it('every class P99 fixed is budgeted at 0 (AC2)', () => {
    const phase = BUDGET.classes.filter((c: { owner: string }) => /^HLT-00[1-4]$/.test(c.owner));
    expect(phase.length).toBeGreaterThanOrEqual(7);
    for (const c of phase) expect({ id: c.id, budget: c.budget }).toEqual({ id: c.id, budget: 0 });
  });
});
