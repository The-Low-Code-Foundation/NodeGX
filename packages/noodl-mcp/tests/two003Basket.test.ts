/**
 * TWO-003 slice 3 — the basket's, the checkout's, the order page's and the admin's page scripts, run on fixtures. The
 * drive (`nodegx-backend/tests/two-003-checkout-drive.test.ts`) proves the same in the rendered app; the functions
 * behind them are proved on a real backend by `two-003-checkout.test.ts`. This proves each page rule fast enough to
 * mutate.
 *
 * 1. Every script slice 3 ships compiles (its pages' and its functions'): the door writes them uncompiled.
 * 2. The rules, against the shipped script text.
 * 3. Mutants, each loosening one rule; its check must go red.
 */
import { SLICE3_ADMIN_SCRIPTS } from './two003Admin';
import { SLICE3_SHOP_SCRIPTS } from './two003Basket';
import { SLICE3_CLOUD_SCRIPTS } from './two003Checkout';
import { compiles, Row, run } from './two003Run';
import { BASKET_KEY, ORDERS_KEY, SLICE2_SCRIPTS } from './two003Shop';

const P = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const photo = (n: string) => ({ name: n, url: `https://b.example/files/${n}` });
const ENDED = '2026-10-01T09:00:00.000Z';
/** A price with its spacing taken out: the locale decides whether a narrow space sits between symbol and number. */
const strip = (s: string) => String(s).replace(/\s/g, '');

const COUNTRIES = [
  { objectId: 'gh', name: 'Ghana', currency: 'GHS' },
  { objectId: 'ng', name: 'Nigeria', currency: 'NGN' },
  { objectId: 'ke', name: 'Kenya', currency: 'KES' }
];
const RATES = [
  { objectId: 'r1', currency: 'GHS', value: 1 },
  { objectId: 'r2', currency: 'NGN', value: 0.0091 },
  { objectId: 'r3', currency: 'KES', value: 0.11 }
];
const SELLERS = [
  { objectId: 'kofi', name: 'Kofi’s Kitchen', country: P('Country', 'gh'), whatsapp: '+233 24 555 0100' },
  { objectId: 'motors', name: 'Ring Road Motors', country: P('Country', 'gh'), whatsapp: '+233 20 555 0103' },
  { objectId: 'ada', name: 'Ada’s Farm Drinks', country: P('Country', 'ng'), phone: '+234 80 555 0101' },
  { objectId: 'beans', name: 'Nairobi Beans', country: P('Country', 'ke'), whatsapp: '+254 70 555 0102' },
  { objectId: 'shut', name: 'Shut Shop', country: P('Country', 'gh'), endedAt: ENDED }
];
const PRODUCTS = [
  { objectId: 'shito', name: 'Shito pepper sauce, 500 g', price: 45, mode: 'buy', seller: P('Seller', 'kofi'), photos: [photo('s1.jpg')] },
  { objectId: 'gari', name: 'Gari, 2 kg', price: 38, mode: 'buy', seller: P('Seller', 'kofi'), endedAt: ENDED },
  { objectId: 'zobo', name: 'Zobo drink, 6 bottles', price: 6800, mode: 'buy', seller: P('Seller', 'ada'), photos: [] },
  { objectId: 'coffee', name: 'AA coffee beans, 1 kg', price: 1900, mode: 'buy', seller: P('Seller', 'beans') },
  { objectId: 'corolla', name: 'Toyota Corolla 2015', price: 98000, mode: 'enquire', seller: P('Seller', 'motors') },
  { objectId: 'pepper', name: 'Pepper oil', price: 20, mode: 'buy', seller: P('Seller', 'shut') }
];
const WAYS = [
  { objectId: 'wa', name: 'Order on WhatsApp', method: 'whatsapp', instructions: 'Finish the order in a chat with the seller.' },
  { objectId: 'bank', name: 'Bank transfer', method: 'bank-transfer', instructions: 'Use your order number as the reference.' },
  { objectId: 'cod', name: 'Pay on delivery', method: 'on-delivery', instructions: 'Cash or mobile money to the rider.' }
];
/** WhatsApp on in Ghana and Nigeria (Ada has no number), bank transfer in Nigeria, pay on delivery in Ghana. Kenya: none. */
const RELATIONS = { 'WayToPay:wa:country': ['gh', 'ng'], 'WayToPay:bank:country': ['ng'], 'WayToPay:cod:country': ['gh'] };
const TABLES: Record<string, Row[]> = { Country: COUNTRIES, Rate: RATES, Seller: SELLERS, Product: PRODUCTS, WayToPay: WAYS, __relations: RELATIONS as unknown as Row[] };
const basket = (...lines: Array<[string, number]>) => ({ [BASKET_KEY]: JSON.stringify(lines.map(([productId, quantity]) => ({ productId, quantity }))) });
const storedBasket = (stored: Record<string, string>) => JSON.parse(stored[BASKET_KEY] || '[]');
const ADMIN = (name: string) => (name === 'whoAmI' ? { me: { role: 'admin' } } : null);
const STAFF = (name: string) => (name === 'whoAmI' ? { me: { role: 'seller', seller: { id: 'kofi' } } } : null);

/** The order `followOrder` hands back, as the order page gets it. */
const ORDER = {
  number: 'MK-2026-00042',
  placedAt: '2026-10-14T09:30:00.000Z',
  buyerName: 'Abena Owusu',
  address: 'House 14, Osu, Accra',
  country: 'Ghana',
  currency: 'GHS',
  parts: [
    { seller: 'Kofi’s Kitchen', whatsapp: '233245550100', country: 'Ghana', currency: 'GHS', status: 'paid', subtotal: 128, deliveryCost: 20, deliveryNote: '', way: { name: 'Bank transfer', method: 'bank-transfer' }, lines: [{ name: 'Shito pepper sauce, 500 g', quantity: 2, price: 45 }, { name: 'Gari, 2 kg', quantity: 1, price: 38 }] },
    { seller: 'Ada’s Farm Drinks', whatsapp: '', country: 'Nigeria', currency: 'NGN', status: 'new', subtotal: 6800, deliveryCost: null, deliveryNote: '', way: { name: 'Bank transfer', method: 'bank-transfer' }, lines: [{ name: 'Zobo drink, 6 bottles', quantity: 1, price: 6800 }] }
  ]
};

// ── the checks, each a function of the script text so a mutant can be run through it ────────────────────────────

const CHECKS: Record<string, (s: Record<string, string>) => Promise<void>> = {
  async 'Add puts the quantity in the basket on the phone; the same product again adds to it, 99 at most'(s) {
    const stored: Record<string, string> = {};
    const one = await run(s.ADD_TO_BASKET, { productId: 'shito', quantity: 2 }, { stored });
    expect([storedBasket(stored), one.out.added, one.fired]).toEqual([[{ productId: 'shito', quantity: 2 }], '2 in your basket.', ['go']]);
    const two = await run(s.ADD_TO_BASKET, { productId: 'shito', quantity: 3 }, { stored });
    expect([storedBasket(stored), two.out.added]).toEqual([[{ productId: 'shito', quantity: 5 }], '5 in your basket.']);
    expect(two.out.basket).not.toBe(one.out.basket);
    await run(s.ADD_TO_BASKET, { productId: 'zobo', quantity: 1 }, { stored });
    await run(s.ADD_TO_BASKET, { productId: 'shito', quantity: 98 }, { stored });
    expect(storedBasket(stored)).toEqual([{ productId: 'shito', quantity: 99 }, { productId: 'zobo', quantity: 1 }]);
    const label = await run(s.ADD_LABEL, { quantity: 2, unit: 45, unitCurrency: 'GHS' });
    expect([strip(label.out.label), label.out.quantityWords]).toEqual(['Addtobasket·GH₵90', '2']);
  },
  async 'a line: one fewer, one more (99 at most), one fewer from 1 takes it out, Remove takes it out'(s) {
    const stored = basket(['shito', 2], ['zobo', 99]);
    await run(s.LINE_LESS, { id: 'shito' }, { stored });
    expect(storedBasket(stored)).toEqual([{ productId: 'shito', quantity: 1 }, { productId: 'zobo', quantity: 99 }]);
    await run(s.LINE_MORE, { id: 'zobo' }, { stored });
    expect(storedBasket(stored)[1].quantity).toBe(99);
    await run(s.LINE_LESS, { id: 'shito' }, { stored });
    expect(storedBasket(stored)).toEqual([{ productId: 'zobo', quantity: 99 }]);
    const gone = await run(s.LINE_REMOVE, { id: 'zobo' }, { stored });
    expect([storedBasket(stored), gone.fired]).toEqual([[], ['go']]);
  },
  async 'the bottom bar: how many the basket holds, and My order only when this phone has one'(s) {
    const none = await run(s.NAV_LOAD, { on: 'home' }, { stored: {} });
    expect([none.out.basketLabel, none.out.hasOrder, none.out.homeInk, none.out.basketInk]).toEqual(['Basket', false, 'var(--secondary)', 'var(--muted-foreground)']);
    const some = await run(s.NAV_LOAD, { on: 'basket' }, { stored: { ...basket(['shito', 2], ['zobo', 1]), [ORDERS_KEY]: JSON.stringify([{ number: 'MK-2026-00002', token: 't2' }, { number: 'MK-2026-00001', token: 't1' }]) } });
    expect([some.out.basketLabel, some.out.hasOrder, some.out.token, some.out.basketInk]).toEqual(['Basket · 3', true, 't2', 'var(--secondary)']);
  },
  async 'the basket takes out what is no longer on sale, says so, and keeps saying it after the second read'(s) {
    const stored = basket(['shito', 2], ['gari', 1], ['pepper', 1], ['corolla', 1], ['nothing', 1], ['zobo', 1]);
    const kept: Record<string, unknown> = {};
    const first = await run(s.BASKET_LOAD, {}, { tables: TABLES, stored, kept });
    expect(first.out.data.lines.map((l: Row) => l.productId)).toEqual(['shito', 'zobo']);
    expect(first.out.data.gone).toEqual(['Gari, 2 kg', 'Pepper oil', 'Toyota Corolla 2015', 'A product that is no longer here']);
    expect([first.fired, storedBasket(stored)]).toEqual([['cleaned'], [{ productId: 'shito', quantity: 2 }, { productId: 'zobo', quantity: 1 }]]);
    const again = await run(s.BASKET_LOAD, {}, { tables: TABLES, stored, kept });
    expect([again.fired, again.out.data.gone.length]).toEqual([[], 4]);
  },
  async 'the basket: by seller, a total per seller country in its currency, two payments said plainly, about how much together'(s) {
    const data = { lines: [{ productId: 'shito', quantity: 2 }, { productId: 'zobo', quantity: 1 }], products: PRODUCTS, sellers: SELLERS, countries: COUNTRIES, rates: RATES, gone: [] };
    const { out } = await run(s.BASKET_SHAPE, { data, currency: 'GHS' });
    expect(out.groups.map((g: Row) => [g.name, g.place])).toEqual([['Kofi’s Kitchen', 'Ghana · pays in GH₵'], ['Ada’s Farm Drinks', 'Nigeria · pays in ₦']]);
    expect(out.groups[0].lines.map((l: Row) => [l.name, strip(l.each), strip(l.total), l.thumb, l.less])).toEqual([['Shito pepper sauce, 500 g', '2×GH₵45', 'GH₵90', 'https://b.example/files/s1.jpg?thumb=sm', true]]);
    expect(out.places.map((x: Row) => [x.words, strip(x.total)])).toEqual([['Ghana, in GH₵', 'GH₵90'], ['Nigeria, in ₦', '₦6,800']]);
    expect([out.two, out.twoWords]).toEqual([true, 'Two countries, two payments. Your sellers are in Ghana and Nigeria, so you pay twice: once in GH₵ for Kofi’s Kitchen and once in ₦ for Ada’s Farm Drinks. Each payment goes straight to its sellers.']);
    expect(strip(out.together)).toBe(strip('About GH₵152 together. Delivery is added when each seller confirms it.'));
    expect([out.heading, out.full, out.empty]).toEqual(['Your basket · 3 items', true, false]);
    // One country, in its own currency: nothing to add up, no "about".
    const one = await run(s.BASKET_SHAPE, { data: { ...data, lines: [{ productId: 'shito', quantity: 1 }] }, currency: 'GHS' });
    expect([one.out.two, one.out.together]).toEqual([false, 'Delivery is added when each seller confirms it.']);
    // No rate for the naira: no made-up total.
    const noRate = await run(s.BASKET_SHAPE, { data: { ...data, rates: RATES.filter((r) => r.currency !== 'NGN') }, currency: 'GHS' });
    expect(noRate.out.together).toBe('Delivery is added when each seller confirms it.');
    const gone = await run(s.BASKET_SHAPE, { data: { ...data, gone: ['Gari, 2 kg'] }, currency: 'GHS' });
    expect([gone.out.hasGone, gone.out.gone]).toEqual([true, 'Gari, 2 kg isn’t on sale now, so it was taken out of your basket.']);
  },
  async '🔴 AC4: the checkout offers, per seller country, only the ways on there; WhatsApp only where every seller has a number'(s) {
    const data = { lines: [{ productId: 'shito', quantity: 2 }, { productId: 'zobo', quantity: 1 }], products: PRODUCTS, sellers: SELLERS, countries: COUNTRIES, rates: RATES, ways: { gh: [WAYS[2], WAYS[0]], ng: [WAYS[1], WAYS[0]] } };
    const { out } = await run(s.CHECKOUT_SHAPE, { data, currency: 'GHS', picks: '' });
    expect(out.groups.map((g: Row) => [g.heading, strip(g.sub), g.options.map((o: Row) => o.label)])).toEqual([
      ['How you’ll pay in Ghana', 'GH₵90', ['◉ Pay on delivery', '○ Order on WhatsApp']],
      ['How you’ll pay in Nigeria', '₦6,800', ['◉ Bank transfer']]
    ]);
    expect([out.pay, out.canOrder, out.lines]).toEqual([{ gh: 'cod', ng: 'bank' }, true, [{ productId: 'shito', quantity: 2 }, { productId: 'zobo', quantity: 1 }]]);
    expect(out.groups[0].options[0].line).toBe('var(--secondary)');
    // A pick made is kept; one no longer offered falls back to the first.
    const picked = await run(s.CHECKOUT_SHAPE, { data, currency: 'GHS', picks: JSON.stringify({ gh: 'wa', ng: 'wa' }) });
    expect([picked.out.pay, picked.out.groups[0].options.map((o: Row) => o.label)]).toEqual([{ gh: 'wa', ng: 'bank' }, ['○ Pay on delivery', '◉ Order on WhatsApp']]);
    // A seller country with nothing on: said, and the order can't be placed.
    const kenya = await run(s.CHECKOUT_SHAPE, { data: { ...data, lines: [{ productId: 'coffee', quantity: 1 }] }, currency: 'GHS', picks: '' });
    expect([kenya.out.canOrder, kenya.out.groups[0].hasNone, kenya.out.groups[0].noneWords]).toEqual([false, true, 'No way to pay is turned on in Kenya yet, so nothing from Nairobi Beans can be ordered just now. Take its products out of your basket to order the rest.']);
  },
  async 'the checkout: only live products are sent; the country it goes to starts at the buyer’s currency’s'(s) {
    const data = { lines: [{ productId: 'gari', quantity: 1 }, { productId: 'zobo', quantity: 2 }], products: PRODUCTS, sellers: SELLERS, countries: COUNTRIES, rates: RATES, ways: { ng: [WAYS[1]] } };
    const ng = await run(s.CHECKOUT_SHAPE, { data, currency: 'NGN', picks: '' });
    expect([ng.out.lines, ng.out.countryPick, ng.out.countries.map((c: Row) => c.Label), ng.out.summary]).toEqual([
      [{ productId: 'zobo', quantity: 2 }],
      'ng',
      ['Ghana', 'Kenya', 'Nigeria'],
      '2 items from 1 seller. Each seller confirms the delivery and what it costs before you pay.'
    ]);
    const xof = await run(s.CHECKOUT_SHAPE, { data, currency: 'XOF', picks: '' });
    expect(xof.out.countryPick).toBe('ng');
    const g = await run(s.CHECKOUT_GATHER, { name: 'Abena', phone: '+233', address: 'Osu', country0: 'gh', currency: 'GHS', lines: ng.out.lines, pay: ng.out.pay });
    expect(g.out.order).toEqual({ buyerName: 'Abena', phone: '+233', address: 'Osu', email: '', country: 'gh', currency: 'GHS', lines: [{ productId: 'zobo', quantity: 2 }], pay: { ng: 'bank' } });
    expect(JSON.stringify(g.out.order)).not.toMatch(/price|total|seller/);
  },
  async 'placed: the phone remembers the order first, once, and the basket empties'(s) {
    const stored = { ...basket(['shito', 2]), [ORDERS_KEY]: JSON.stringify([{ number: 'MK-2026-00001', token: 'old' }, { number: 'MK-2026-00002', token: 'new' }]) };
    const r = await run(s.ORDER_PLACED, { placed: { number: 'MK-2026-00002', followToken: 'new' } }, { stored });
    expect([JSON.parse(stored[ORDERS_KEY]), storedBasket(stored), r.out.token, r.fired]).toEqual([
      [{ number: 'MK-2026-00002', token: 'new' }, { number: 'MK-2026-00001', token: 'old' }],
      [],
      'new',
      ['go']
    ]);
  },
  async 'the order page asks followOrder with its token, remembers it, and says so when there is no order'(s) {
    const stored: Record<string, string> = {};
    const ok = await run(s.ORDER_LOAD, { token: 'tok' }, { stored, cloud: (n, p) => (n === 'followOrder' && (p as Row).follow.token === 'tok' ? { order: ORDER } : null) });
    expect([ok.called, ok.out.ok, ok.out.order.number, JSON.parse(stored[ORDERS_KEY])]).toEqual([[['followOrder', { follow: { token: 'tok' } }]], true, 'MK-2026-00042', [{ number: 'MK-2026-00042', token: 'tok' }]]);
    const no = await run(s.ORDER_LOAD, { token: 'bad' }, { stored: {}, cloud: () => Promise.reject({ error: 'There is no order at this link. Check it was copied whole.' }) });
    expect([no.out.gone, no.out.ok, no.out.problem]).toEqual([true, false, 'There is no order at this link. Check it was copied whole.']);
  },
  async 'the order, worded: the number read aloud, each part’s step, what is owed and how, WhatsApp naming the order'(s) {
    const { out } = await run(s.ORDER_SHAPE, { order: ORDER });
    expect([out.title, out.buyer, out.placed, out.where]).toEqual(['Order MK-2026-00042', 'Abena Owusu', '14 Oct 2026', 'It goes to House 14, Osu, Accra, Ghana.']);
    expect(out.readAloud).toBe('Read out the number if you call: M K, twenty twenty-six, four two. This page is private to you: keep the link.');
    const [kofi, ada] = out.parts;
    expect([kofi.pill, kofi.steps.filter((x: Row) => x.bar === 'var(--secondary)').length, strip(kofi.fine)]).toEqual(['Paid', 3, strip('Delivery GH₵20, confirmed by the seller. Paid: GH₵148.')]);
    expect([ada.pill, ada.pillBg, ada.steps.filter((x: Row) => x.bar === 'var(--secondary)').length, strip(ada.fine)]).toEqual([
      'Waiting for the seller',
      'var(--warn-bg)',
      1,
      strip('Ada’s Farm Drinks hasn’t confirmed delivery to Ghana yet. You’ll pay ₦6,800 plus delivery by bank transfer once they do, with MK-2026-00042 as the reference.')
    ]);
    expect([strip(kofi.lines), kofi.way]).toEqual([strip('2 × Shito pepper sauce, 500 g, 1 × Gari, 2 kg · GH₵128'), 'Paying in Ghana: Bank transfer']);
    expect([kofi.hasWhatsapp, ada.hasWhatsapp]).toEqual([true, false]);
    expect(decodeURIComponent(kofi.whatsappLink)).toBe('https://wa.me/233245550100?text=Hello, about my order MK-2026-00042: 2 × Shito pepper sauce, 500 g, 1 × Gari, 2 kg.');
    const wa = await run(s.ORDER_SHAPE, { order: { ...ORDER, parts: [{ ...ORDER.parts[0], status: 'new', deliveryCost: null, way: { name: 'Order on WhatsApp', method: 'whatsapp' } }] } });
    expect(strip(wa.out.parts[0].fine)).toBe(strip('Kofi’s Kitchen hasn’t confirmed delivery to Ghana yet. Finish it with them on WhatsApp, and pay GH₵128 plus delivery the way you agree.'));
    const cod = await run(s.ORDER_SHAPE, { order: { ...ORDER, parts: [{ ...ORDER.parts[1], way: { name: 'Pay on delivery', method: 'on-delivery' } }] } });
    expect(strip(cod.out.parts[0].fine)).toBe(strip('Ada’s Farm Drinks hasn’t confirmed delivery to Ghana yet. You’ll pay ₦6,800 plus delivery when it arrives.'));
    const off = await run(s.ORDER_SHAPE, { order: { ...ORDER, number: 'MK-2005-00100', parts: [{ ...ORDER.parts[0], status: 'cancelled', cancelledReason: 'Out of stock until November' }] } });
    expect([off.out.readAloud.split(': ')[1].split('.')[0], off.out.parts[0].pill, off.out.parts[0].steps.every((x: Row) => x.bar === 'var(--border)'), off.out.parts[0].fine]).toEqual([
      'M K, twenty oh five, one zero zero',
      'Cancelled',
      true,
      'This part was cancelled: Out of stock until November.'
    ]);
    // Slice 4: paid on delivery has no "paid" step; it is owed until it is delivered, and paid then.
    const door = (status: string) => run(s.ORDER_SHAPE, { order: { ...ORDER, parts: [{ ...ORDER.parts[0], status, deliveryNote: 'Thursday', way: { name: 'Pay on delivery', method: 'on-delivery' } }] } });
    const [confirmed, packed, delivered] = [(await door('confirmed')).out.parts[0], (await door('packed')).out.parts[0], (await door('delivered')).out.parts[0]];
    expect([confirmed.steps.map((x: Row) => x.id), confirmed.pill, strip(confirmed.fine)]).toEqual([
      ['new', 'confirmed', 'packed', 'sent', 'delivered'],
      'Confirmed',
      strip('Delivery GH₵20 (Thursday), confirmed by the seller. You’ll pay GH₵148 when it arrives.')
    ]);
    expect([packed.steps.filter((x: Row) => x.bar === 'var(--secondary)').length, strip(packed.fine)]).toEqual([3, strip('Delivery GH₵20 (Thursday), confirmed by the seller. You’ll pay GH₵148 when it arrives.')]);
    expect([delivered.steps.every((x: Row) => x.bar === 'var(--secondary)'), strip(delivered.fine)]).toEqual([true, strip('Delivery GH₵20 (Thursday), confirmed by the seller. Paid: GH₵148.')]);
  },
  async 'the admin’s ways to pay: each built way, switched per country; a seller’s staff see none of it'(s) {
    const { out } = await run(s.WAYS_LOAD, {}, { tables: TABLES, cloud: ADMIN });
    expect(out.rows.map((r: Row) => [r.method, r.where, r.toggles.map((t: Row) => `${t.name}:${t.isOn}`)])).toEqual([
      ['on-delivery', 'On in Ghana.', ['Ghana:true', 'Kenya:false', 'Nigeria:false']],
      ['bank-transfer', 'On in Nigeria.', ['Ghana:false', 'Kenya:false', 'Nigeria:true']],
      ['whatsapp', 'On in Ghana, Nigeria.', ['Ghana:true', 'Kenya:false', 'Nigeria:true']],
      ['paystack', 'Not on anywhere yet.', ['Ghana:false', 'Kenya:false', 'Nigeria:false']]
    ]);
    expect(out.countries).toBe('Ghana · GHS,  Kenya · KES,  Nigeria · NGN');
    const staff = await run(s.WAYS_LOAD, {}, { tables: TABLES, cloud: STAFF });
    expect([staff.out.refused, staff.out.rows]).toEqual([true, undefined]);
    const on = await run(s.WAY_TOGGLE, { method: 'whatsapp', countryId: 'ke', onIds: ['gh', 'ng'], checked: true });
    const off = await run(s.WAY_TOGGLE, { method: 'whatsapp', countryId: 'gh', onIds: ['gh', 'ng'], checked: false });
    const twice = await run(s.WAY_TOGGLE, { method: 'whatsapp', countryId: 'gh', onIds: ['gh', 'ng'], checked: true });
    expect([on.out.way, off.out.way.countries, twice.out.way.countries]).toEqual([{ method: 'whatsapp', countries: ['gh', 'ng', 'ke'] }, ['ng'], ['ng', 'gh']]);
  },
  async 'the admin’s rates: the own currency first and fixed; what is typed wins; every rate goes in one save'(s) {
    const history = [{ rate: P('Rate', 'r2'), at: { __type: 'Date', iso: '2026-10-12T10:00:00.000Z' } }];
    const { out } = await run(s.RATES_LOAD, {}, { tables: { ...TABLES, RateHistory: history, Country: [...COUNTRIES, { objectId: 'tg', name: 'Togo', currency: 'XOF' }] }, cloud: ADMIN });
    expect(out.rows.map((r: Row) => [r.currency, r.own, r.value, r.changed])).toEqual([
      ['GHS', true, '1', 'The marketplace’s own: always 1'],
      ['KES', false, '0.11', ''],
      ['NGN', false, '0.0091', 'Changed 12 Oct'],
      ['XOF', false, '', 'No rate yet: its prices show unconverted']
    ]);
    expect(out.heading).toMatch(/^What one unit is worth in /);
    // The naira as the marketplace's own: first, though it isn't first by its letters.
    const naira = await run(s.RATES_LOAD, {}, { tables: { ...TABLES, Rate: [{ objectId: 'x1', currency: 'GHS', value: 110 }, { objectId: 'x2', currency: 'NGN', value: 1 }], RateHistory: [] }, cloud: ADMIN });
    expect(naira.out.rows.map((r: Row) => r.currency)).toEqual(['NGN', 'GHS', 'KES']);
    const first = await run(s.RATES_LOAD, {}, { tables: { ...TABLES, Rate: [], RateHistory: [] }, cloud: ADMIN });
    expect([first.out.heading, first.out.rows.every((r: Row) => !r.own)]).toEqual(['Set the rates', true]);
    const typed = await run(s.RATE_TYPED, { typed: JSON.stringify({ NGN: '0.0090' }), currency: 'XOF', value: '0,0246' });
    const g = await run(s.RATES_GATHER, { typed: typed.out.typed, rows: out.rows });
    expect(g.out.rates).toEqual({ rates: [{ currency: 'GHS', value: 1 }, { currency: 'KES', value: 0.11 }, { currency: 'NGN', value: 0.009 }, { currency: 'XOF', value: 0.0246 }] });
  },
  async 'the admin’s shelves, and the tabs'(s) {
    const shelves = [{ objectId: 'food', name: 'Food and drinks' }, { objectId: 'cars', name: 'Cars' }];
    const { out } = await run(s.SHELVES_LOAD, {}, { tables: { Category: shelves, Product: [{ objectId: 'a', category: P('Category', 'food') }, { objectId: 'b', category: P('Category', 'food') }, { objectId: 'c', category: P('Category', 'cars') }] }, cloud: ADMIN });
    expect(out.rows).toEqual([{ id: 'cars', name: 'Cars', count: '1 product' }, { id: 'food', name: 'Food and drinks', count: '2 products' }]);
    const g = await run(s.SHELF_GATHER, { id: 'cars', name0: 'Cars' });
    expect(g.out.shelf).toEqual({ name: 'Cars', id: 'cars' });
    const tabs = await run(s.TABS_LOOK, { on: 'rates' });
    expect([tabs.out.rates, tabs.out.sellers]).toEqual(['mk-tab mk-tab-on', 'mk-tab']);
  }
};

const SHIPPED: Record<string, string> = { ...SLICE2_SCRIPTS, ...SLICE3_SHOP_SCRIPTS, ...SLICE3_ADMIN_SCRIPTS };

describe('TWO-003 slice 3 — the basket’s, the checkout’s, the order’s and the admin’s scripts', () => {
  it('every script slice 3 ships compiles: its pages’ and its functions’', () => {
    const all = { ...SLICE3_SHOP_SCRIPTS, ...SLICE3_ADMIN_SCRIPTS, ...SLICE3_CLOUD_SCRIPTS };
    expect(Object.keys(all).length).toBeGreaterThan(25);
    expect(Object.entries(all).filter(([, code]) => !compiles(code)).map(([name]) => name)).toEqual([]);
  });

  for (const [name, check] of Object.entries(CHECKS)) it(name, () => check(SHIPPED));

  /** Each loosens one rule; the named check must go red. */
  const MUTANTS: Array<[string, string, string, string, string]> = [
    ['Add replaces instead of adding', 'ADD_TO_BASKET', 'line.quantity = Math.min(99, line.quantity + q)', 'line.quantity = q', 'Add puts the quantity in the basket on the phone; the same product again adds to it, 99 at most'],
    ['Add past 99', 'ADD_TO_BASKET', 'line.quantity = Math.min(99, line.quantity + q)', 'line.quantity = line.quantity + q', 'Add puts the quantity in the basket on the phone; the same product again adds to it, 99 at most'],
    ['the label ignores how many', 'ADD_LABEL', '(Number(Inputs.unit) || 0) * q', '(Number(Inputs.unit) || 0)', 'Add puts the quantity in the basket on the phone; the same product again adds to it, 99 at most'],
    ['a line at 0 stays in the basket', 'LINE_LESS', '.filter(function (l) { return l.quantity > 0; })', '', 'a line: one fewer, one more (99 at most), one fewer from 1 takes it out, Remove takes it out'],
    ['one more past 99', 'LINE_MORE', 'Math.min(99, l.quantity + 1)', 'l.quantity + 1', 'a line: one fewer, one more (99 at most), one fewer from 1 takes it out, Remove takes it out'],
    ['the bar counts lines, not items', 'NAV_LOAD', 'var n = basketCount(readBasket())', 'var n = readBasket().length', 'the bottom bar: how many the basket holds, and My order only when this phone has one'],
    ['an off-sale product kept in the basket', 'BASKET_LOAD', '!p.endedAt && !s.endedAt', '!s.endedAt', 'the basket takes out what is no longer on sale, says so, and keeps saying it after the second read'],
    ['a car kept in the basket', 'BASKET_LOAD', "&& p.mode === 'buy');", ');', 'the basket takes out what is no longer on sale, says so, and keeps saying it after the second read'],
    ['what was taken out forgotten on the second read', 'BASKET_LOAD', "var gone = Component.Object.get('gone') || [];", 'var gone = [];', 'the basket takes out what is no longer on sale, says so, and keeps saying it after the second read'],
    ['one total for every country', 'BASKET_SHAPE', 'if (!placeOf[c.objectId]) {', "c = { objectId: 'all', name: c.name, currency: c.currency }; if (!placeOf[c.objectId]) {", 'the basket: by seller, a total per seller country in its currency, two payments said plainly, about how much together'],
    ['an "about" made up with no rate', 'BASKET_SHAPE', 'if (!r) sure = false; else', 'if (!r) r = 1;', 'the basket: by seller, a total per seller country in its currency, two payments said plainly, about how much together'],
    ['a way off in the country offered', 'CHECKOUT_SHAPE', 'var offered = (d.ways[id] || [])', 'var offered = WAYLIST', '🔴 AC4: the checkout offers, per seller country, only the ways on there; WhatsApp only where every seller has a number'],
    ['WhatsApp to a seller with no number', 'CHECKOUT_SHAPE', "!(w.method === 'whatsapp' && g.noWhatsapp)", 'true', '🔴 AC4: the checkout offers, per seller country, only the ways on there; WhatsApp only where every seller has a number'],
    ['a pick forgotten', 'CHECKOUT_SHAPE', "offered.filter(function (w) { return w.objectId === picks[id]; })[0] || offered[0]", 'offered[0]', '🔴 AC4: the checkout offers, per seller country, only the ways on there; WhatsApp only where every seller has a number'],
    ['an order placed with a country that has no way', 'CHECKOUT_SHAPE', 'else canOrder = false;', '', '🔴 AC4: the checkout offers, per seller country, only the ways on there; WhatsApp only where every seller has a number'],
    ['an off-sale product sent to checkout', 'CHECKOUT_SHAPE', '|| p.endedAt || s.endedAt ||', '|| s.endedAt ||', 'the checkout: only live products are sent; the country it goes to starts at the buyer’s currency’s'],
    ['the basket kept after ordering', 'ORDER_PLACED', 'Outputs.basket = writeBasket([]);', '', 'placed: the phone remembers the order first, once, and the basket empties'],
    ['the same order remembered twice', 'ORDER_PLACED', 'readOrders().filter(function (x) { return x.token !== o.followToken; })', 'readOrders()', 'placed: the phone remembers the order first, once, and the basket empties'],
    ['an order opened is not remembered', 'ORDER_LOAD', "try { localStorage.setItem('mk-orders', JSON.stringify(orders.slice(0, 20))); } catch (e) {}", '', 'the order page asks followOrder with its token, remembers it, and says so when there is no order'],
    ['the reference left out of a bank transfer', 'ORDER_SHAPE', "', with ' + o.number + ' as the reference.'", "'.'", 'the order, worded: the number read aloud, each part’s step, what is owed and how, WhatsApp naming the order'],
    ['a step reached that wasn’t', 'ORDER_SHAPE', 'k <= at', 'k <= at + 1', 'the order, worded: the number read aloud, each part’s step, what is owed and how, WhatsApp naming the order'],
    ['paid on delivery gets a paid step', 'ORDER_SHAPE', "var steps = atTheDoor ? STEPS.filter(function (s) { return s !== 'paid'; }) : STEPS;", 'var steps = STEPS;', 'the order, worded: the number read aloud, each part’s step, what is owed and how, WhatsApp naming the order'],
    ['paid on delivery said paid before it arrives', 'ORDER_SHAPE', "var paid = atTheDoor ? p.status === 'delivered' :", 'var paid = atTheDoor ? true :', 'the order, worded: the number read aloud, each part’s step, what is owed and how, WhatsApp naming the order'],
    ['why it was cancelled left out', 'ORDER_SHAPE', "(p.cancelledReason ? ': ' + p.cancelledReason : '')", "''", 'the order, worded: the number read aloud, each part’s step, what is owed and how, WhatsApp naming the order'],
    ['delivery left out of what is paid', 'ORDER_SHAPE', "'Paid: ' + money(p.subtotal + (cost ? p.deliveryCost : 0), p.currency)", "'Paid: ' + money(p.subtotal, p.currency)", 'the order, worded: the number read aloud, each part’s step, what is owed and how, WhatsApp naming the order'],
    ['the admin’s ways shown to anyone', 'WAYS_LOAD', 'await adminOnly();', '', 'the admin’s ways to pay: each built way, switched per country; a seller’s staff see none of it'],
    ['a toggle loses the other countries', 'WAY_TOGGLE', 'var on = Array.isArray(Inputs.onIds) ? Inputs.onIds.slice() : [];', 'var on = [];', 'the admin’s ways to pay: each built way, switched per country; a seller’s staff see none of it'],
    ['what was typed loses to what was loaded', 'RATES_GATHER', 'typed[r.currency] !== undefined ? typed[r.currency] : r.value', 'r.value || typed[r.currency]', 'the admin’s rates: the own currency first and fixed; what is typed wins; every rate goes in one save'],
    ['the own currency not first', 'RATES_LOAD', '(own && a === own.currency ? -1 : own && b === own.currency ? 1 : a.localeCompare(b))', 'a.localeCompare(b)', 'the admin’s rates: the own currency first and fixed; what is typed wins; every rate goes in one save']
  ];

  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, check) => {
    expect([script, SHIPPED[script].includes(from)]).toEqual([script, true]);
    const mutated = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to).split('WAYLIST').join(JSON.stringify(WAYS)) };
    await expect(CHECKS[check](mutated)).rejects.toThrow();
  });
});
