/**
 * TWO-004 — the pages' side of paying through Paystack, run on fixtures: the order page's box per country, the button
 * that opens Paystack, the way back with a reference, and the seller's Orders page that never offers "The buyer has
 * paid" for a card payment. The functions themselves are proved on a real backend against a stand-in for Paystack by
 * `nodegx-backend/tests/two-004-paystack.test.ts` (and its 21 mutants).
 *
 * 1. Every script slice 6 ships compiles: the door writes them uncompiled.
 * 2. The rules, against the shipped script text.
 * 3. Mutants, each loosening one rule; its check must go red.
 */
import { SLICE3_SHOP_SCRIPTS } from './two003Basket';
import { SLICE3_CLOUD_SCRIPTS } from './two003Checkout';
import { SLICE4_CLOUD_SCRIPTS, SLICE4_SCRIPTS } from './two003Orders';
import { compiles, Row, run } from './two003Run';
import { SLICE6_CLOUD_SCRIPTS } from './two004Paystack';

const P = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const TOKEN = 'a'.repeat(48);
const card = { name: 'Card or mobile money', method: 'paystack' };
const part = (seller: string, countryId: string, status: string, extra: Row = {}) => ({
  seller,
  whatsapp: '',
  country: countryId === 'gh' ? 'Ghana' : 'Nigeria',
  countryId,
  currency: countryId === 'gh' ? 'GHS' : 'NGN',
  status,
  subtotal: 90,
  deliveryCost: status === 'new' ? null : 20,
  deliveryNote: '',
  cancelledReason: '',
  way: card,
  lines: [{ name: 'Shito', quantity: 2, price: 45 }],
  ...extra
});
const order = (parts: Row[], payments: Row[] = []) => ({ number: 'MK-2026-00042', placedAt: '2026-10-15T09:30:00.000Z', buyerName: 'Efua Asante', address: 'Accra', country: 'Ghana', currency: 'GHS', payments, parts });
const shape = async (s: Record<string, string>, o: Row) => (await run(s.ORDER_SHAPE, { order: o, token: TOKEN })).out;

const CHECKS: Record<string, (s: Record<string, string>) => Promise<void>> = {
  async 'a country paid by card has its box: no button until every seller there has confirmed, then one for the whole'(s) {
    const waiting = await shape(s, order([part('Kofi’s Kitchen', 'gh', 'confirmed'), part('Ama’s Shea', 'gh', 'new')]));
    expect([waiting.hasPays, waiting.pays.length, waiting.pays[0].canPay, waiting.pays[0].words]).toEqual([true, 1, false, 'You’ll pay Kofi’s Kitchen and Ama’s Shea here together, once they have all confirmed delivery.']);
    const ready = await shape(s, order([part('Kofi’s Kitchen', 'gh', 'confirmed'), part('Ama’s Shea', 'gh', 'confirmed', { subtotal: 61 })]));
    expect(ready.pays.map((x: Row) => [x.head, x.canPay, x.label, x.countryId, x.token])).toEqual([['Paying in Ghana', true, 'Pay GH₵191 by card or mobile money', 'gh', TOKEN]]);
    expect(ready.pays[0].words).toBe('One payment for Kofi’s Kitchen and Ama’s Shea, through Paystack: card, mobile money or bank. Each seller is paid their share.');
    expect(ready.parts[0].fine).toBe('Delivery GH₵20, confirmed by the seller. You’ll pay GH₵110 here by card or mobile money now.');
  },
  async 'a cancelled part is left out; a country paid another way has no box; two countries, two boxes'(s) {
    const out = await shape(s, order([part('Kofi’s Kitchen', 'gh', 'confirmed'), part('Ama’s Shea', 'gh', 'cancelled'), part('Ada’s Farm Drinks', 'ng', 'confirmed', { subtotal: 2500, deliveryCost: 500 }), part('Yaw’s Cloth', 'gh', 'new', { country: 'Kenya', countryId: 'ke', currency: 'KES', way: { name: 'Pay on delivery', method: 'on-delivery' } })]));
    expect(out.pays.map((x: Row) => [x.countryId, x.canPay, x.label])).toEqual([
      ['gh', true, 'Pay GH₵110 by card or mobile money'],
      ['ng', true, 'Pay ₦3,000 by card or mobile money']
    ]);
    expect((await shape(s, order([part('Yaw’s Cloth', 'gh', 'new', { way: { name: 'Pay on delivery', method: 'on-delivery' } })]))).hasPays).toBe(false);
  },
  async 'paid: the box says how much, and offers nothing; a failed try is said'(s) {
    const paid = await shape(s, order([part('Kofi’s Kitchen', 'gh', 'paid'), part('Ama’s Shea', 'gh', 'packed')], [{ country: 'Ghana', currency: 'GHS', amount: 220, outcome: 'paid' }]));
    expect([paid.pays[0].canPay, paid.pays[0].words]).toEqual([false, 'Paid GH₵220 through Paystack. Each seller has their share.']);
    const tried = await shape(s, order([part('Kofi’s Kitchen', 'gh', 'confirmed')], [{ country: 'Ghana', currency: 'GHS', amount: 110, outcome: 'failed' }]));
    expect([tried.pays[0].canPay, tried.pays[0].words.endsWith('The last try didn’t go through.')]).toEqual([true, true]);
  },
  async 'the button asks startPayment for this order and country, to come back to this page, and opens what it answers'(s) {
    const location: Row = { origin: 'https://shop.example', pathname: `/order/${TOKEN}`, href: `https://shop.example/order/${TOKEN}` };
    const ran = await run(s.PAY_GO, { token: TOKEN, countryId: 'gh' }, { location, cloud: (n) => (n === 'startPayment' ? { payment: { url: 'https://checkout.paystack.com/abc' } } : null) });
    expect(ran.called).toEqual([['startPayment', { pay: { token: TOKEN, country: 'gh', returnUrl: `https://shop.example/order/${TOKEN}` } }]]);
    expect([location.href, ran.out.problem]).toEqual(['https://checkout.paystack.com/abc', '']);
    const no = await run(s.PAY_GO, { token: TOKEN, countryId: 'gh' }, { location: { ...location }, cloud: () => Promise.reject({ error: 'Paying by card isn’t set up in Ghana yet.' }) });
    expect(no.out.problem).toBe('Paying by card isn’t set up in Ghana yet.');
  },
  async 'back from Paystack: the reference is checked before the order is read, and what happened is said'(s) {
    const back = (outcome: Row | null) => {
      const location = { search: '?reference=MK-2026-00042-GHS-0a1b2c3d4e5f', pathname: `/order/${TOKEN}`, href: '' };
      return run(s.ORDER_LOAD, { token: TOKEN }, { location, stored: {}, cloud: (n) => (n === 'checkPayment' ? (outcome ? { result: outcome } : Promise.reject({ error: 'Paystack couldn’t be reached just now. Try again in a minute.' })) : { order: order([]) }) });
    };
    const paid = await back({ outcome: 'paid' });
    expect(paid.called.map(([n]) => n)).toEqual(['checkPayment', 'followOrder']);
    expect(paid.called[0][1]).toEqual({ check: { reference: 'MK-2026-00042-GHS-0a1b2c3d4e5f' } });
    expect([paid.out.paidWords, paid.out.hasPaidWords]).toEqual(['Paid. Thank you: your sellers can see it.', true]);
    expect((await back({ outcome: 'waiting' })).out.paidWords).toMatch(/hasn’t finished/);
    expect((await back({ outcome: 'failed' })).out.paidWords).toBe('That payment didn’t go through. You can try again.');
    expect((await back({ outcome: 'failed', wrongAmount: true })).out.paidWords).toMatch(/doesn’t match what is owed now/);
    expect((await back(null)).out.paidWords).toMatch(/couldn’t be reached/);
    const plain = await run(s.ORDER_LOAD, { token: TOKEN }, { location: { search: '', pathname: '/x' }, stored: {}, cloud: () => ({ order: order([]) }) });
    expect([plain.called.map(([n]) => n), plain.out.hasPaidWords]).toEqual([['followOrder'], false]);
  },
  async 'a seller is never offered “The buyer has paid” for a card payment, and is told Paystack says it'(s) {
    const tables: Record<string, Row[]> = {
      Country: [{ objectId: 'gh', name: 'Ghana', currency: 'GHS' }],
      Seller: [{ objectId: 'kofi', name: 'Kofi’s Kitchen', country: P('Country', 'gh') }],
      WayToPay: [{ objectId: 'card', name: 'Card or mobile money', method: 'paystack' }, { objectId: 'bank', name: 'Bank transfer', method: 'bank-transfer' }],
      Order: [{ objectId: 'o1', number: 'MK-2026-00001', buyerName: 'Efua' }, { objectId: 'o2', number: 'MK-2026-00002', buyerName: 'Kojo' }],
      OrderPart: [
        { objectId: 'pc', order: P('Order', 'o1'), seller: P('Seller', 'kofi'), wayToPay: P('WayToPay', 'card'), status: 'confirmed', subtotal: 90, deliveryCost: 20 },
        { objectId: 'pb', order: P('Order', 'o2'), seller: P('Seller', 'kofi'), wayToPay: P('WayToPay', 'bank'), status: 'confirmed', subtotal: 90, deliveryCost: 20 },
        { objectId: 'pp', order: P('Order', 'o1'), seller: P('Seller', 'kofi'), wayToPay: P('WayToPay', 'card'), status: 'paid', subtotal: 90, deliveryCost: 20 }
      ],
      OrderLine: []
    };
    const { out } = await run(s.ORDERS_LOAD, {}, { tables, cloud: (n) => (n === 'whoAmI' ? { me: { role: 'seller', seller: { id: 'kofi', name: 'Kofi’s Kitchen' } } } : null) });
    const cards = Object.fromEntries((out.sections as Row[]).flatMap((x) => x.cards.map((c: Row) => [c.id, c])));
    expect([cards.pc.canMove, cards.pc.canCancel, cards.pc.note.endsWith('The buyer pays by card; it says paid here once they have.')]).toEqual([false, true, true]);
    expect([cards.pb.canMove, cards.pb.moveLabel, cards.pb.note.includes('by card')]).toEqual([true, 'The buyer has paid', false]);
    expect([cards.pp.canMove, cards.pp.moveLabel]).toEqual([true, 'Packed']);
  }
};

const SHIPPED: Record<string, string> = { ...SLICE3_SHOP_SCRIPTS, ...SLICE4_SCRIPTS };

describe('TWO-004 — paying through Paystack, the pages’ side', () => {
  it('every script slice 6 ships, and those it changed, compile', () => {
    const all = { ...SLICE6_CLOUD_SCRIPTS, ...SLICE3_SHOP_SCRIPTS, ...SLICE3_CLOUD_SCRIPTS, ...SLICE4_SCRIPTS, ...SLICE4_CLOUD_SCRIPTS };
    expect(Object.keys(SLICE6_CLOUD_SCRIPTS).sort()).toEqual(['CHECK_KEY_SCRIPT', 'CHECK_PAYMENT_SCRIPT', 'EVENT_KEY_SCRIPT', 'PAYSTACK_EVENT_SCRIPT', 'START_KEY_SCRIPT', 'START_PAYMENT_SCRIPT']);
    expect(Object.entries(all).filter(([, code]) => !compiles(code)).map(([name]) => name)).toEqual([]);
  });

  for (const [name, check] of Object.entries(CHECKS)) it(name, () => check(SHIPPED));

  /**
   * [what it loosens, script, text, replacement, the check that must go red]. Left out as equivalent: the box's
   * `!x.done` (a payment moves every part of its country together, so a country never holds a paid part beside a
   * confirmed one, and `x.confirmed > 0` already keeps the button away once it is paid).
   */
  const MUTANTS: Array<[string, string, string, string, string]> = [
    ['the button before every seller confirmed', 'ORDER_SHAPE', 'canPay: !x.waiting && ', 'canPay: ', 'a country paid by card has its box: no button until every seller there has confirmed, then one for the whole'],
    ['delivery left out of the box', 'ORDER_SHAPE', "x.amount += p.subtotal + (typeof p.deliveryCost === 'number' ? p.deliveryCost : 0);", 'x.amount += p.subtotal;', 'a country paid by card has its box: no button until every seller there has confirmed, then one for the whole'],
    ['a cancelled part in the box', 'ORDER_SHAPE', " || p.status === 'cancelled') return;", ') return;', 'a cancelled part is left out; a country paid another way has no box; two countries, two boxes'],
    ['a box for every way', 'ORDER_SHAPE', "if (p.way.method !== 'paystack' || ", 'if (', 'a cancelled part is left out; a country paid another way has no box; two countries, two boxes'],
    ['a failed try not said', 'ORDER_SHAPE', "(tried ? ' The last try didn’t go through.' : '')", "''", 'paid: the box says how much, and offers nothing; a failed try is said'],
    ['come back anywhere', 'PAY_GO', 'returnUrl: location.origin + location.pathname', 'returnUrl: location.origin', 'the button asks startPayment for this order and country, to come back to this page, and opens what it answers'],
    ['the reference never checked', 'ORDER_LOAD', 'if (ref) {', 'if (false) {', 'back from Paystack: the reference is checked before the order is read, and what happened is said'],
    ['a wrong amount said as a failure', 'ORDER_LOAD', ": c.wrongAmount ? 'Paystack took", ": false ? 'Paystack took", 'back from Paystack: the reference is checked before the order is read, and what happened is said'],
    ['a seller offered “paid” for a card', 'ORDERS_LOAD', " && !(next === 'paid' && byProvider)", '', 'a seller is never offered “The buyer has paid” for a card payment, and is told Paystack says it']
  ];
  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, check) => {
    expect(SHIPPED[script].split(from).length - 1).toBe(1);
    const mutated = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to) };
    await expect(CHECKS[check](mutated)).rejects.toThrow();
  });
});
