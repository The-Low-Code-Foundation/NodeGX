/**
 * TWO-004 — the Paystack spec's mutants: each loosens one rule in a SHIPPED script (`startPayment`, `checkPayment`,
 * `paystackEvent`, and the rules slice 6 added to `saveWayToPay`, `placeOrder` and `movePart`, in a copy of the template), and
 * `two-004-paystack.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO003_MUTANTS=1 npx jest tests/two-004-paystack-mutants.test.ts
 *
 * A mutant whose text isn't in the script fails here, so a rename can't turn one into a silent green.
 *
 * Left out, as no spec against a stand-in can tell them apart (each is a second guard behind a first): the order's
 * own email checked again at payment (placeOrder already refuses a card payment without one), the reference's shape
 * checked again in the paying script (the key script refuses it first), the order's number matched against the
 * reference (only Paystack's own answer could disagree), and `checkPayment` leaving out a cancelled part (it keeps
 * only confirmed ones anyway: the first run's one green, 2026-10-15).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TEMPLATE = path.join(__dirname, '../../../templates/marketplace');
const RUN = process.env.TWO003_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, function, text in its script, what replaces it] */
export const PAYSTACK_MUTANTS: Array<[string, string, string, string]> = [
  ['Paystack on in a currency it doesn’t take', 'saveWayToPay', "if (method === 'paystack' && PAYSTACK.indexOf(currencyOf[cid]) < 0)", 'if (false)'],
  ['a card payment to a seller with no subaccount', 'placeOrder', "if (parts[m].way.method === 'paystack' && !/^ACCT_[A-Za-z0-9]+$/.test(", 'if (false && !/^ACCT_[A-Za-z0-9]+$/.test('],
  ['a card payment with no email', 'placeOrder', "if (parts[m].way.method === 'paystack' && !buyer.email)", 'if (false)'],
  ['a seller marks a card payment paid', 'movePart', "if (to === 'paid' && way && BY_PROVIDER.indexOf(way.method) >= 0)", 'if (false)'],
  ['a currency Paystack doesn’t take', 'startPayment', 'if (CURRENCIES.indexOf(c.currency) < 0)', 'if (false)'],
  ['paid before every part is confirmed', 'startPayment', "if (due.some(function (x) { return (x.part.status || 'new') === 'new'; }))", 'if (false)'],
  ['paid twice', 'startPayment', "if (due.some(function (x) { return x.part.status !== 'confirmed'; }))", 'if (false)'],
  ['delivery left out', 'startPayment', "(typeof p.deliveryCost === 'number' ? p.deliveryCost : 0)", '0'],
  ['a cancelled part paid for', 'startPayment', " && p.status !== 'cancelled'", ''],
  ['another way’s parts paid', 'startPayment', ' && idOf(p.wayToPay) === way.objectId', ''],
  ['another country’s parts paid', 'startPayment', 'idOf(s.country) === countryId && ', ''],
  ['a seller whose subaccount went', 'startPayment', 'if (lost)', 'if (false)'],
  ['sent back anywhere', 'startPayment', "if (!/^https?:[/][/][^ ?#]+$/.test(back) || back.slice(-(token.length + 7)) !== '/order/' + token)", 'if (false)'],
  ['every share to one account', 'startPayment', 'subaccount: String(x.seller.payoutAccount)', "subaccount: 'ACCT_marketplace'"],
  ['the marketplace bears every fee', 'startPayment', "bearer_type: 'all-proportional'", "bearer_type: 'account'"],
  ['any amount counts', 'checkPayment', 'Number(d.amount) === expected && ', ''],
  ['any currency counts', 'checkPayment', ' && d.currency === c.currency', ''],
  ['an unfinished payment kept', 'checkPayment', "if (status !== 'success' && status !== 'failed' && status !== 'reversed')", 'if (false)'],
  ['asked twice, kept twice', 'checkPayment', 'if (known) {', 'if (false) {'],
  ['a failed payment moves the parts', 'checkPayment', 'if (paid) {', "if (status === 'success') {"],
  ['no history of who paid', 'checkPayment', ", paidBy: { from: null, to: ref }", ''],
  // Step 5, the webhook.
  ['every event checked', 'paystackEvent', "e.event === 'charge.success' && ", ''],
  ['an unfinished payment answered as done', 'paystackEvent', "refuse('Paystack hasn’t finished this payment yet: it sends it again.'); return;", "Outputs.result = { outcome: 'waiting', reference: ref }; Outputs.done(); return;"],
  ['the webhook fails when the page kept the payment first', 'paystackEvent', 'catch (e) { made = null; }', 'catch (e) { throw e; }'],
  ['the page fails when the webhook kept the payment first', 'checkPayment', 'catch (e) { made = null; }', 'catch (e) { throw e; }'],
  ['the webhook moves the parts when its row was refused', 'paystackEvent', 'if (!made) {', 'if (false) {'],
  ['the page moves the parts when its row was refused', 'checkPayment', 'if (!made) {', 'if (false) {'],
  ['the webhook asks Paystack about a payment it kept', 'paystackEvent', 'if (known) {', 'if (false) {'],
];

/** A copy of the template with one function's script changed. */
function mutate(fn: string, from: string, to: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'two004-paystack-mutant-'));
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

(RUN ? describe : describe.skip)('TWO-004 — the Paystack spec’s mutants', () => {
  it.each(PAYSTACK_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutate(fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-004-paystack.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO003_TEMPLATE: copy, TWO003_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
