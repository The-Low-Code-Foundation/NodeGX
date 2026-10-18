/**
 * TWO-003 slice 3 — the checkout spec's mutants: each loosens one rule in a SHIPPED function's script (a copy of the
 * template, edited), and `two-003-checkout.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO003_MUTANTS=1 npx jest tests/two-003-checkout-mutants.test.ts
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
export const CHECKOUT_MUTANTS: Array<[string, string, string, string]> = [
  ['two countries with one name', 'saveCountry', "if (same.some(function (x) { return x.objectId !== id; })) { refuse('There is already a country called '", "if (false) { refuse('There is already a country called '"],
  ['a currency changed under its sellers', 'saveCountry', "if (fields.currency !== before.currency && await one('Seller'", "if (false && await one('Seller'"],
  ['a rename with no history', 'saveCountry', "    await history('Country', 'country', id, Inputs.userId, changed);", ''],
  ['the own currency moved off 1', 'saveRates', 'if (own && cur === own.currency && v !== 1)', 'if (false)'],
  ['a second currency worth exactly 1', 'saveRates', 'if (own && cur !== own.currency && v === 1)', 'if (false)'],
  ['a rate of 0', 'saveRates', 'v <= 0', 'v < 0'],
  ['rates with no own currency', 'saveRates', "if (!own && wanted.filter(function (w) { return w.value === 1; }).length !== 1)", 'if (false)'],
  ['Flutterwave turned on before its door exists', 'saveWayToPay', "if (method === 'flutterwave') {", 'if (false) {'],
  ['a way never turned off', 'saveWayToPay', 'if (want.indexOf(onNow[k]) < 0) await Noodl.Records.removeRelation(', 'if (false) await Noodl.Records.removeRelation('],
  ['a country that isn’t there', 'saveWayToPay', "if (!nameOf[cid]) { refuse('There is no such country.'); return; }", ''],
  ['the phone’s price believed', 'placeOrder', 'var price = Number(p.price) || 0;', 'var price = Number((o.lines.filter(function (x) { return idOf(x.productId) === p.objectId; })[0] || {}).price || p.price) || 0;'],
  ['a way off in the country taken', 'placeOrder', 'if (!on.some(function (x) { return x.objectId === c.objectId; }))', 'if (false)'],
  ['WhatsApp to a seller with no number', 'placeOrder', "if (parts[m].way.method === 'whatsapp' && ", 'if (false && '],
  ['an off-sale product ordered', 'placeOrder', 'if (!p || !s || p.endedAt || s.endedAt)', 'if (!p || !s || s.endedAt)'],
  ['a stopped seller’s product ordered', 'placeOrder', 'if (!p || !s || p.endedAt || s.endedAt)', 'if (!p || !s || p.endedAt)'],
  ['a car through the basket', 'placeOrder', "if (p.mode !== 'buy')", 'if (false)'],
  ['half a product', 'placeOrder', 'Math.floor(q) !== q', 'false'],
  ['the same product twice, the second wins', 'placeOrder', 'qty[pid] = (qty[pid] || 0) + q;', 'qty[pid] = q;'],
  ['a subtotal that forgets the quantity', 'placeOrder', 'partOf[s.objectId].subtotal += price * qty[p.objectId];', 'partOf[s.objectId].subtotal += price;'],
  ['a guessable link', 'placeOrder', 'crypto.getRandomValues(bytes);', 'bytes.fill(7);'],
  ['a part with no history', 'placeOrder', "  await history('OrderPart', 'orderPart', part.getId(), Inputs.userId, { status: { from: null, to: 'new' }, wayToPay: { from: null, to: pt.way.name } });", ''],
  ['any link opens an order', 'followOrder', 'followToken: { equalTo: token }', 'followToken: { notEqualTo: token }'],
  ['every line under every part', 'followOrder', 'return idOf(l.orderPart) === p.objectId;', 'return true;']
];

/** A copy of the template with one function's script changed. */
function mutate(fn: string, from: string, to: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-mutant-'));
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

(RUN ? describe : describe.skip)('TWO-003 slice 3 — the checkout spec’s mutants', () => {
  it.each(CHECKOUT_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutate(fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-003-checkout.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO003_TEMPLATE: copy, TWO003_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
