/**
 * TWO-003 slice 4 — the Orders page's scripts, run on fixtures. `movePart` itself is proved on a real backend by
 * `nodegx-backend/tests/two-003-orders.test.ts`, and the page in the rendered app by `two-003-orders-drive.test.ts`.
 * This proves each page rule fast enough to mutate.
 *
 * 1. Every script slice 4 ships compiles (its page's and its function's): the door writes them uncompiled.
 * 2. The rules, against the shipped script text.
 * 3. Mutants, each loosening one rule; its check must go red.
 */
import { SLICE4_CLOUD_SCRIPTS, SLICE4_SCRIPTS } from './two003Orders';
import { compiles, Row, run } from './two003Run';

const P = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const strip = (s: string) => String(s).replace(/\s/g, '');

const COUNTRIES = [
  { objectId: 'gh', name: 'Ghana', currency: 'GHS' },
  { objectId: 'ng', name: 'Nigeria', currency: 'NGN' }
];
const SELLERS = [
  { objectId: 'kofi', name: 'Kofi’s Kitchen', country: P('Country', 'gh') },
  { objectId: 'ada', name: 'Ada’s Farm Drinks', country: P('Country', 'ng') }
];
const WAYS = [
  { objectId: 'cod', name: 'Pay on delivery', method: 'on-delivery' },
  { objectId: 'bank', name: 'Bank transfer', method: 'bank-transfer' },
  { objectId: 'wa', name: 'Order on WhatsApp', method: 'whatsapp' }
];
const ORDERS = [
  { objectId: 'o40', number: 'MK-2026-00040', buyerName: 'Kojo Darko', address: 'Madina', phone: '+233 24 000 0040' },
  { objectId: 'o41', number: 'MK-2026-00041', buyerName: 'Akosua Frimpong', address: 'Cape Coast', phone: '+233 24 000 0041' },
  { objectId: 'o42', number: 'MK-2026-00042', buyerName: 'Abena Owusu', address: 'House 14, Osu, Accra', phone: '+233 24 000 0042' },
  { objectId: 'o43', number: 'MK-2026-00043', buyerName: 'Kwame Boateng', address: 'Tema', phone: '+233 24 000 0043' }
];
const part = (objectId: string, order: string, seller: string, way: string, status: string, extra: Row = {}) => ({
  objectId,
  order: P('Order', order),
  seller: P('Seller', seller),
  wayToPay: P('WayToPay', way),
  status,
  subtotal: 90,
  ...extra
});
const PARTS = [
  part('p43k', 'o43', 'kofi', 'cod', 'new'),
  part('p43a', 'o43', 'ada', 'bank', 'new', { subtotal: 6800 }),
  part('p42k', 'o42', 'kofi', 'bank', 'confirmed', { deliveryCost: 20, deliveryNote: 'Thursday' }),
  part('p41k', 'o41', 'kofi', 'cod', 'confirmed', { deliveryCost: 15 }),
  part('p40k', 'o40', 'kofi', 'wa', 'paid', { deliveryCost: 0 }),
  part('p39k', 'o40', 'kofi', 'cod', 'sent', { deliveryCost: 10 }),
  part('p38k', 'o41', 'kofi', 'bank', 'cancelled', { cancelledReason: 'The buyer asked' }),
  part('p37k', 'o42', 'kofi', 'wa', 'packed', { deliveryCost: 5 })
];
const LINES = [
  { objectId: 'l1', orderPart: P('OrderPart', 'p43k'), productName: 'Shito', quantity: 2, price: 45 },
  { objectId: 'l2', orderPart: P('OrderPart', 'p43a'), productName: 'Zobo', quantity: 1, price: 6800 },
  { objectId: 'l3', orderPart: P('OrderPart', 'p42k'), productName: 'Shito', quantity: 2, price: 45 }
];
const TABLES: Record<string, Row[]> = { Country: COUNTRIES, Seller: SELLERS, WayToPay: WAYS, Order: ORDERS, OrderPart: PARTS, OrderLine: LINES };
const ADMIN = (name: string) => (name === 'whoAmI' ? { me: { role: 'admin' } } : null);
const STAFF = (name: string) => (name === 'whoAmI' ? { me: { role: 'seller', seller: { id: 'kofi', name: 'Kofi’s Kitchen' } } } : null);
const NOBODY = (name: string) => (name === 'whoAmI' ? { me: { role: 'buyer' } } : null);
const cardsOf = (out: Row) => Object.fromEntries((out.sections as Row[]).flatMap((s) => s.cards.map((c: Row) => [c.id, { ...c, section: s.id }])));

const CHECKS: Record<string, (s: Record<string, string>) => Promise<void>> = {
  async 'a seller sees only their parts, by what they need, newest first, with the counts at the top'(s) {
    const { out } = await run(s.ORDERS_LOAD, {}, { tables: TABLES, cloud: STAFF });
    expect((out.sections as Row[]).map((x) => [x.id, x.cards.map((c: Row) => c.id)])).toEqual([
      ['confirm', ['p43k']],
      ['pay', ['p42k']],
      ['pack', ['p41k', 'p40k']],
      ['send', ['p37k']],
      ['sent', ['p39k']],
      ['cancelled', ['p38k']]
    ]);
    expect([...out.kpis.map((k: Row) => k.n), out.band, out.heading, out.isAdmin, out.isStaff]).toEqual(['1', '1', '3', '1', 'Signed in as Kofi’s Kitchen', 'Your orders', false, true]);
    expect(Object.keys(cardsOf(out))).not.toContain('p43a');
  },
  async 'the admin sees every seller’s part, each named with its seller and country'(s) {
    const { out } = await run(s.ORDERS_LOAD, {}, { tables: TABLES, cloud: ADMIN });
    const cards = cardsOf(out);
    expect([cards.p43a.section, cards.p43a.seller, cards.p43a.hasSeller, out.band, out.isAdmin]).toEqual(['confirm', 'Ada’s Farm Drinks · Nigeria', true, 'Admin', true]);
    expect((out.sections as Row[])[0].cards.map((c: Row) => c.id)).toEqual(['p43k', 'p43a']);
  },
  async 'each card: what it holds, where it goes, how it is paid, and the one move it can make next'(s) {
    const cards = cardsOf((await run(s.ORDERS_LOAD, {}, { tables: TABLES, cloud: STAFF })).out);
    const n = cards.p43k;
    expect([n.head, strip(n.lines), n.where, n.way, n.canConfirm, n.canMove, n.canCancel, n.costLabel, n.confirmLabel]).toEqual([
      'MK-2026-00043 · Kwame Boateng',
      strip('Shito × 2 · GH₵90'),
      'Tema · +233 24 000 0043',
      'Pay on delivery',
      true,
      false,
      true,
      'Delivery cost (GH₵)',
      'Confirm: they pay when it arrives'
    ]);
    const bank = cards.p42k;
    expect([bank.way, strip(bank.note), bank.next, bank.moveLabel, bank.canConfirm]).toEqual(['Bank transfer, reference MK-2026-00042', strip('Delivery GH₵20, Thursday. Total GH₵110.'), 'paid', 'The buyer has paid', false]);
    // Paid on delivery skips "paid": confirmed goes to packed; sent goes to delivered, and that is when it is paid.
    expect([cards.p41k.next, cards.p41k.moveLabel, cards.p39k.next, cards.p39k.moveLabel]).toEqual(['packed', 'Packed', 'delivered', 'Delivered and paid']);
    expect([cards.p40k.next, cards.p40k.moveLabel]).toEqual(['packed', 'Packed']);
    expect([cards.p38k.canMove, cards.p38k.canCancel, cards.p38k.canConfirm, cards.p38k.hasActions, cards.p38k.note, cards.p38k.pill]).toEqual([false, false, false, false, 'Cancelled: The buyer asked.', 'Cancelled']);
  },
  async 'nobody else: a buyer’s sign-in and a refused read show why, and nothing else'(s) {
    const buyer = await run(s.ORDERS_LOAD, {}, { tables: TABLES, cloud: NOBODY });
    expect([buyer.out.refused, buyer.out.sections, buyer.out.problem]).toEqual([true, undefined, 'This page is for the marketplace’s sellers and its admin.']);
    const out = await run(s.ORDERS_LOAD, {}, { tables: TABLES, cloud: () => { throw { error: 'Invalid session token' }; } });
    expect([out.out.refused, out.out.problem]).toEqual([true, 'Sign in to see this page.']);
    const empty = await run(s.ORDERS_LOAD, {}, { tables: { ...TABLES, OrderPart: [] }, cloud: STAFF });
    expect([empty.out.empty, empty.out.sections, empty.out.kpis[0]]).toEqual([true, [], { id: 'confirm', n: '0', words: 'to confirm' }]);
  },
  async 'what each button sends to movePart, and the tabs'(s) {
    const c = await run(s.CONFIRM_GATHER, { id: 'p1', cost: '25', when: 'Thursday' });
    const m = await run(s.MOVE_GATHER, { id: 'p1', next: 'packed' });
    const x = await run(s.CANCEL_GATHER, { id: 'p1', reason: 'Out of stock' });
    const bare = await run(s.CONFIRM_GATHER, { id: 'p1' });
    expect([c.out.move, m.out.move, x.out.move, bare.out.move.deliveryCost]).toEqual([
      { partId: 'p1', to: 'confirmed', deliveryCost: '25', deliveryNote: 'Thursday' },
      { partId: 'p1', to: 'packed' },
      { partId: 'p1', to: 'cancelled', reason: 'Out of stock' },
      ''
    ]);
    expect([c.fired, m.fired, x.fired]).toEqual([['go'], ['go'], ['go']]);
    const tabs = await run(s.SELLER_TABS_LOOK, { on: 'orders' });
    expect([tabs.out.orders, tabs.out.products]).toEqual(['mk-tab mk-tab-on', 'mk-tab']);
  }
};

const SHIPPED: Record<string, string> = { ...SLICE4_SCRIPTS };

describe('TWO-003 slice 4 — the Orders page’s scripts', () => {
  it('every script slice 4 ships compiles: its page’s and its function’s', () => {
    const all = { ...SLICE4_SCRIPTS, ...SLICE4_CLOUD_SCRIPTS };
    expect(Object.keys(all).length).toBe(7);
    expect(Object.entries(all).filter(([, code]) => !compiles(code)).map(([name]) => name)).toEqual([]);
  });

  for (const [name, check] of Object.entries(CHECKS)) it(name, () => check(SHIPPED));

  const SEES = 'a seller sees only their parts, by what they need, newest first, with the counts at the top';
  const CARD = 'each card: what it holds, where it goes, how it is paid, and the one move it can make next';
  /** Each loosens one rule; the named check must go red. */
  const MUTANTS: Array<[string, string, string, string, string]> = [
    ['a seller reads every seller’s parts', 'ORDERS_LOAD', "isAdmin ? {} : { seller: { equalTo: ptr('Seller', me.seller.id) } }", '{}', SEES],
    ['oldest first', 'ORDERS_LOAD', ".localeCompare(String((order[idOf(a.order)] || {}).number || ''))", ".localeCompare(String((order[idOf(a.order)] || {}).number || '')) * -1", SEES],
    ['a confirmed bank transfer waits to be packed', 'ORDERS_LOAD', "if (s === 'confirmed') return atTheDoor ? 'pack' : 'pay';", "if (s === 'confirmed') return 'pack';", SEES],
    ['a confirmed delivery waits to be paid', 'ORDERS_LOAD', "if (s === 'confirmed') return atTheDoor ? 'pack' : 'pay';", "if (s === 'confirmed') return 'pay';", SEES],
    ['to pack forgets what is packed', 'ORDERS_LOAD', "String(count('pack') + count('send'))", "String(count('pack'))", SEES],
    ['paid on delivery gets a paid step', 'ORDERS_LOAD', "var steps = atTheDoor ? STEPS.filter(function (x) { return x !== 'paid'; }) : STEPS;", 'var steps = STEPS;', CARD],
    ['a cancelled part can still move', 'ORDERS_LOAD', "var done = status === 'delivered' || status === 'cancelled';", "var done = status === 'delivered';", CARD],
    ['a new part moves without its delivery cost', 'ORDERS_LOAD', "canMove: !done && status !== 'new' && !!next", 'canMove: !done && !!next', CARD],
    ['the bank transfer’s reference left out', 'ORDERS_LOAD', "(w.method === 'bank-transfer' ? ', reference ' + (o.number || '') : '')", "''", CARD],
    ['the total forgets delivery', 'ORDERS_LOAD', "money((Number(p.subtotal) || 0) + p.deliveryCost, cur)", 'money(Number(p.subtotal) || 0, cur)', CARD],
    ['the admin not told whose part', 'ORDERS_LOAD', "seller: isAdmin ? (s.name || '') + (c.name ? ' · ' + c.name : '') : '',", "seller: '',", 'the admin sees every seller’s part, each named with its seller and country'],
    ['anyone signed in sees the page', 'ORDERS_LOAD', 'if (!me || (!isAdmin && !me.seller))', 'if (!me)', 'nobody else: a buyer’s sign-in and a refused read show why, and nothing else'],
    ['confirm sends no cost', 'CONFIRM_GATHER', 'deliveryCost: Inputs.cost === undefined ? \'\' : String(Inputs.cost)', "deliveryCost: ''", 'what each button sends to movePart, and the tabs'],
    ['cancel sends no reason', 'CANCEL_GATHER', "reason: Inputs.reason === undefined ? '' : String(Inputs.reason)", "reason: ''", 'what each button sends to movePart, and the tabs']
  ];

  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, check) => {
    expect([script, SHIPPED[script].includes(from)]).toEqual([script, true]);
    const mutated = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to) };
    await expect(CHECKS[check](mutated)).rejects.toThrow();
  });
});
