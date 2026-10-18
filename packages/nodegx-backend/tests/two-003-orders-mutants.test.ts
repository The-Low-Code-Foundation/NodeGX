/**
 * TWO-003 slice 4 — the orders spec's mutants: each loosens one rule in the SHIPPED `movePart` script (a copy of the
 * template, edited), and `two-003-orders.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO003_MUTANTS=1 npx jest tests/two-003-orders-mutants.test.ts
 *
 * A mutant whose text isn't in the script fails here, so a rename can't turn one into a silent green.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TEMPLATE = path.join(__dirname, '../../../templates/marketplace');
const RUN = process.env.TWO003_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, function, text in its script, what replaces it] */
export const ORDER_MUTANTS: Array<[string, string, string, string]> = [
  ['a seller moves another seller’s part', 'movePart', "if (me.role !== 'admin' && (!idOf(me.seller) || idOf(part.seller) !== idOf(me.seller)))", 'if (false)'],
  ['the seller taken from what was sent', 'movePart', 'idOf(part.seller) !== idOf(me.seller)', 'idOf(part.seller) !== idOf(m.sellerId || me.seller)'],
  ['a delivered part moves again', 'movePart', "if (from === 'delivered' || from === 'cancelled')", "if (from === 'cancelled')"],
  ['a cancelled part moves again', 'movePart', "if (from === 'delivered' || from === 'cancelled')", "if (from === 'delivered')"],
  ['a step skipped', 'movePart', 'if (to !== next)', 'if (STEPS.indexOf(to) < 0)'],
  ['paid on delivery gets a paid step', 'movePart', "var steps = way && AT_THE_DOOR.indexOf(way.method) >= 0 ? STEPS.filter(function (s) { return s !== 'paid'; }) : STEPS;", 'var steps = STEPS;'],
  ['a cancel with no why', 'movePart', "if (!why) { refuse('Say why", "if (false) { refuse('Say why"],
  ['why not kept', 'movePart', "fields = { status: 'cancelled', cancelledReason: why };", "fields = { status: 'cancelled' };"],
  ['confirmed with no delivery cost', 'movePart', 'if (!typed || !isFinite(cost) || cost < 0)', 'if (!isFinite(cost) || cost < 0)'],
  ['a delivery cost below 0', 'movePart', 'if (!typed || !isFinite(cost) || cost < 0)', 'if (!typed || !isFinite(cost))'],
  ['a comma not read as a decimal point', 'movePart', ".trim().replace(',', '.');", '.trim();'],
  ['a move with no history', 'movePart', "await history('OrderPart', 'orderPart', id, Inputs.userId, diff(part, fields));", '']
];

/** A copy of the template with one function's script changed. */
function mutate(fn: string, from: string, to: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-orders-mutant-'));
  const copy = path.join(dir, 'marketplace');
  fs.cpSync(TEMPLATE, copy, { recursive: true });
  const file = path.join(copy, 'components', '__cloud__', fn, 'nodes.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  let hits = 0;
  for (const node of doc.nodes) {
    const script = node.parameters?.functionScript;
    if (typeof script === 'string' && script.includes(from)) {
      node.parameters.functionScript = script.split(from).join(to);
      hits++;
    }
  }
  if (hits !== 1) throw new Error(`${fn}: the mutant’s text is in ${hits} scripts, not one: ${from}`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  return copy;
}

(RUN ? describe : describe.skip)('TWO-003 slice 4 — the orders spec’s mutants', () => {
  it.each(ORDER_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutate(fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-003-orders.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO003_TEMPLATE: copy, TWO003_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
