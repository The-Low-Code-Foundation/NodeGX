/**
 * TWO-003 slice 3 — what the admin sets, and a buyer's checkout, through the marketplace's own cloud functions.
 *
 * 🔴 **It runs the SHIPPED functions**, read from `templates/marketplace/components/__cloud__/`, on a backend locked
 * with the template's own `nodegx.security.json`. The admin is made by `setUpMarketplace`, sellers and products by
 * slice 1's functions, countries, rates, shelves and the ways to pay by slice 3's. Nothing is seeded with the master
 * key; the master key only reads back what the functions wrote.
 *
 * What it proves (TWO-003 §3.3; AC3's buyer half, AC4; the world's rules 2, 3, 6 and 7):
 *
 * - the admin adds and renames countries, sets the rates (the marketplace's own currency is worth 1, always), adds
 *   shelves and turns each way to pay on or off per country, each change with its history;
 * - 🔴 a buyer with no account places an order: one part per seller, each line at the price the product has NOW (not
 *   the one the buyer sent), each seller country paid the way the buyer picked for it — a way the admin turned on
 *   there, and WhatsApp only when the seller has a number;
 * - 🔴 a way to pay that is off in a country is refused there (AC4), and so is anything not on sale;
 * - the order's number is the year's next, its private link a long random token; the link opens the order, and no
 *   other token opens anything (AC3: nobody reads another buyer's order);
 * - each seller's staff read only their own part of it.
 *
 * `TWO003_TEMPLATE` points it at a mutated copy (`two-003-checkout-mutants.test.ts`).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request } from './helpers/http';

jest.setTimeout(90000);

const TEMPLATE = process.env.TWO003_TEMPLATE || path.join(__dirname, '../../../templates/marketplace');
const SETUP_TOKEN = 'setup-token-two003-checkout';
const FUNCTIONS = [
  'setUpMarketplace',
  'whoAmI',
  'saveSeller',
  'stopSeller',
  'giveLogin',
  'saveProduct',
  'takeOffSale',
  'helpers/setLoginDisabled',
  'saveCountry',
  'saveRates',
  'saveShelf',
  'saveWayToPay',
  'placeOrder',
  'followOrder'
];

interface Answer {
  result?: Record<string, any>;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, any>;

describe('TWO-003 slice 3 — what the admin sets, and a buyer’s checkout', () => {
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) => request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const who: Record<string, Record<string, string>> = { stranger: {} };
  const id: Record<string, string> = {};

  const call = (fn: string, body: Record<string, unknown>, as: string) => req<Answer>('POST', `/functions/${fn}`, body, who[as]);
  const ok = async (fn: string, body: Record<string, unknown>, as = 'admin') => {
    const r = await call(fn, body, as);
    if (r.status !== 200) throw new Error(`${fn} refused: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.result ?? {};
  };
  /** A refusal: not a 200, and the words say why. */
  const refused = async (fn: string, body: Record<string, unknown>, words: string | RegExp, as = 'admin') => {
    const r = await call(fn, body, as);
    expect([fn, r.status === 200, JSON.stringify(r.json)]).toEqual([fn, false, expect.stringMatching(words)]);
  };
  const signIn = async (name: string, email: string, password: string) => {
    const r = await req<{ sessionToken: string }>('POST', '/login', { username: email, password }, {});
    if (r.status !== 200) throw new Error(`sign-in ${name}: ${r.status} ${JSON.stringify(r.json)}`);
    who[name] = { 'x-parse-session-token': r.json.sessionToken };
  };
  const rows = async (collection: string, where: Row = {}, order = 'createdAt') =>
    (await req<{ results: Row[] }>('GET', `/classes/${collection}?where=${encodeURIComponent(JSON.stringify(where))}&order=${order}&limit=1000`)).json.results;
  const row = async (collection: string, objectId: string) => (await req<Row>('GET', `/classes/${collection}/${objectId}`)).json;
  const historyOf = async (collection: string, field: string, objectId: string) => rows(`${collection}History`, { [field]: ptr(collection, objectId) }, 'at');
  /** The countries a way to pay is on in, by name, read through the relation itself. */
  const onIn = async (wayId: string) =>
    (await rows('Country', { $relatedTo: { object: ptr('WayToPay', wayId), key: 'country' } })).map((c) => c.name).sort();
  const wayOf = async (method: string) => (await rows('WayToPay', { method }))[0];

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two003-checkout-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003co', backendName: 'TWO-003 checkout', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    await ok('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, marketplace: 'Market Square', name: 'Admin', email: 'admin@example.com', password: 'longenough' } }, 'stranger');
    await signIn('admin', 'admin@example.com', 'longenough');
  });

  afterAll(async () => {
    await service?.stop();
  });

  describe('the admin: countries', () => {
    it('adds three countries, each with its history', async () => {
      for (const [key, name, currency] of [
        ['gh', 'Ghana', 'GHS'],
        ['ng', 'Nigeria', 'ngn'],
        ['ke', 'Kenya', 'KES']
      ]) {
        id[key] = String((await ok('saveCountry', { country: { name, currency } })).id);
        expect([(await row('Country', id[key])).currency, (await historyOf('Country', 'country', id[key])).length]).toEqual([currency.toUpperCase(), 1]);
      }
    });

    it('🔴 refuses a second country with the same name, and a currency that is not a three-letter code', async () => {
      await refused('saveCountry', { country: { name: 'Ghana', currency: 'GHS' } }, 'already a country called Ghana');
      await refused('saveCountry', { country: { name: 'Togo', currency: 'cedi' } }, 'three-letter code');
      await refused('saveCountry', { country: { name: '', currency: 'XOF' } }, 'needs a name');
    });

    it('renames one, and the history says what changed and who', async () => {
      await ok('saveCountry', { country: { id: id.ke, name: 'Kenya (east)', currency: 'KES' } });
      const h = await historyOf('Country', 'country', id.ke);
      expect([h.length, h[1].changed, Boolean(h[1].who)]).toEqual([2, { name: { from: 'Kenya', to: 'Kenya (east)' } }, true]);
      await ok('saveCountry', { country: { id: id.ke, name: 'Kenya', currency: 'KES' } });
    });

    it('🔴 a country’s currency changes only while no seller is in it', async () => {
      id.tg = String((await ok('saveCountry', { country: { name: 'Togo', currency: 'XAF' } })).id);
      await ok('saveCountry', { country: { id: id.tg, name: 'Togo', currency: 'XOF' } });
      expect((await row('Country', id.tg)).currency).toBe('XOF');
      id.kofi = String((await ok('saveSeller', { seller: { name: 'Kofi’s Kitchen', country: id.gh, whatsapp: '+233 24 555 0100', phone: '+233 24 555 0100' } })).id);
      await refused('saveCountry', { country: { id: id.gh, name: 'Ghana', currency: 'USD' } }, 'prices are in GHS');
      expect((await row('Country', id.gh)).currency).toBe('GHS');
    });
  });

  describe('the admin: rates', () => {
    it('🔴 the first rates must name the marketplace’s own currency, the one worth 1', async () => {
      await refused('saveRates', { rates: { rates: [{ currency: 'NGN', value: 0.0091 }] } }, 'own currency');
      await refused('saveRates', { rates: { rates: [{ currency: 'GHS', value: 1 }, { currency: 'NGN', value: 1 }] } }, 'own currency');
      expect(await rows('Rate')).toEqual([]);
    });

    it('sets the cedi as the marketplace’s own and the naira and shilling beside it, each with its history', async () => {
      expect((await ok('saveRates', { rates: { rates: [{ currency: 'GHS', value: 1 }, { currency: 'ngn', value: 0.0091 }, { currency: 'KES', value: 0.11 }] } })).saved).toBe(3);
      const rates = Object.fromEntries((await rows('Rate')).map((r) => [r.currency, r.value]));
      expect(rates).toEqual({ GHS: 1, NGN: 0.0091, KES: 0.11 });
      for (const r of await rows('Rate')) expect([r.currency, (await historyOf('Rate', 'rate', r.objectId)).length]).toEqual([r.currency, 1]);
    });

    it('🔴 the own currency stays 1; no other is worth exactly 1; a rate is more than 0; each currency once', async () => {
      await refused('saveRates', { rates: { rates: [{ currency: 'GHS', value: 2 }] } }, 'always worth 1');
      await refused('saveRates', { rates: { rates: [{ currency: 'NGN', value: 1 }] } }, 'Only the marketplace’s own currency');
      await refused('saveRates', { rates: { rates: [{ currency: 'NGN', value: 0 }] } }, 'more than 0');
      await refused('saveRates', { rates: { rates: [{ currency: 'NGN', value: 'lots' }] } }, 'more than 0');
      await refused('saveRates', { rates: { rates: [{ currency: 'NGN', value: 0.009 }, { currency: 'ngn', value: 0.008 }] } }, 'twice');
      await refused('saveRates', { rates: { rates: [{ currency: 'NGN', value: 0.009 }, { currency: 'GHS', value: 3 }] } }, 'always worth 1');
      // Checked before written: the good rate in a refused batch was not saved either.
      expect((await rows('Rate', { currency: 'NGN' }))[0].value).toBe(0.0091);
    });

    it('a change writes only what changed, from and to', async () => {
      expect((await ok('saveRates', { rates: { rates: [{ currency: 'GHS', value: 1 }, { currency: 'NGN', value: 0.0095 }, { currency: 'KES', value: 0.11 }] } })).saved).toBe(1);
      const ngn = (await rows('Rate', { currency: 'NGN' }))[0];
      const h = await historyOf('Rate', 'rate', ngn.objectId);
      expect(h.map((x) => x.changed)).toEqual([{ currency: { from: null, to: 'NGN' }, value: { from: null, to: 0.0091 } }, { value: { from: 0.0091, to: 0.0095 } }]);
      await ok('saveRates', { rates: { rates: [{ currency: 'NGN', value: 0.0091 }] } });
    });
  });

  describe('the admin: shelves', () => {
    it('adds shelves and renames one; a second shelf with the same name is refused', async () => {
      id.food = String((await ok('saveShelf', { shelf: { name: 'Food and drinks' } })).id);
      id.cars = String((await ok('saveShelf', { shelf: { name: 'Car' } })).id);
      await ok('saveShelf', { shelf: { id: id.cars, name: 'Cars' } });
      expect((await row('Category', id.cars)).name).toBe('Cars');
      await refused('saveShelf', { shelf: { name: 'Cars' } }, 'already a shelf called Cars');
      await refused('saveShelf', { shelf: { name: ' ' } }, 'needs a name');
    });
  });

  describe('the admin: the ways to pay, per country', () => {
    it('turns pay on delivery on in Ghana and Nigeria, WhatsApp in Ghana, bank transfer in Nigeria', async () => {
      await ok('saveWayToPay', { way: { method: 'on-delivery', countries: [id.gh, id.ng] } });
      await ok('saveWayToPay', { way: { method: 'whatsapp', countries: [id.gh] } });
      await ok('saveWayToPay', { way: { method: 'bank-transfer', countries: [id.ng], instructions: 'Use your order number as the reference.' } });
      const [cod, wa, bank] = [await wayOf('on-delivery'), await wayOf('whatsapp'), await wayOf('bank-transfer')];
      id.cod = cod.objectId;
      id.wa = wa.objectId;
      id.bank = bank.objectId;
      expect([cod.name, await onIn(id.cod)]).toEqual(['Pay on delivery', ['Ghana', 'Nigeria']]);
      expect([wa.name, await onIn(id.wa)]).toEqual(['Order on WhatsApp', ['Ghana']]);
      expect([bank.instructions, await onIn(id.bank)]).toEqual(['Use your order number as the reference.', ['Nigeria']]);
      expect(cod.instructions).toContain('rider');
    });

    it('turns one off in a country, keeps the row (old orders point at it), and the history names the countries', async () => {
      await ok('saveWayToPay', { way: { method: 'on-delivery', countries: [id.gh] } });
      expect(await onIn(id.cod)).toEqual(['Ghana']);
      await ok('saveWayToPay', { way: { method: 'on-delivery', countries: [id.gh, id.ng, id.ng] } });
      expect(await onIn(id.cod)).toEqual(['Ghana', 'Nigeria']);
      expect((await rows('WayToPay', { method: 'on-delivery' })).length).toBe(1);
      const h = await historyOf('WayToPay', 'wayToPay', id.cod);
      expect(h.map((x) => x.changed.countries)).toEqual([{ from: [], to: ['Ghana', 'Nigeria'] }, { from: ['Ghana', 'Nigeria'], to: ['Ghana'] }, { from: ['Ghana'], to: ['Nigeria', 'Ghana'].sort() }]);
    });

    it('🔴 refuses Flutterwave (not built), an unknown way, and a country that isn’t there', async () => {
      // Paystack is built since TWO-004 (`two-004-paystack.test.ts` proves where it may be on).
      await refused('saveWayToPay', { way: { method: 'flutterwave', countries: [id.gh] } }, 'Flutterwave isn’t set up');
      await refused('saveWayToPay', { way: { method: 'cheque', countries: [id.gh] } }, 'no such way');
      await refused('saveWayToPay', { way: { method: 'whatsapp', countries: [id.gh, 'nowhere'] } }, 'no such country');
      expect(await onIn(id.wa)).toEqual(['Ghana']);
    });

    it('🔴 only the admin: the policy refuses a seller’s staff and a stranger every one of the four', async () => {
      await ok('giveLogin', { login: { sellerId: id.kofi, name: 'Kofi staff', email: 'kofi@example.com', password: 'longenough' } });
      await signIn('kofi', 'kofi@example.com', 'longenough');
      for (const [fn, body] of [
        ['saveCountry', { country: { name: 'Mali', currency: 'XOF' } }],
        ['saveRates', { rates: { rates: [{ currency: 'NGN', value: 9 }] } }],
        ['saveShelf', { shelf: { name: 'Mine' } }],
        ['saveWayToPay', { way: { method: 'whatsapp', countries: [] } }]
      ] as const) {
        expect([fn, (await call(fn, body, 'kofi')).status]).toEqual([fn, 403]);
        expect([fn, [401, 403].includes((await call(fn, body, 'stranger')).status)]).toEqual([fn, true]);
      }
      expect(await onIn(id.wa)).toEqual(['Ghana']);
    });
  });

  describe('a buyer with no account checks out', () => {
    const buyer = { buyerName: 'Abena Owusu', phone: '+233 20 555 0187', address: 'House 14, Osu, Accra', email: '' };
    let first: { number: string; followToken: string };

    beforeAll(async () => {
      id.ada = String((await ok('saveSeller', { seller: { name: 'Ada’s Farm Drinks', country: id.ng, phone: '+234 80 555 0101' } })).id);
      id.motors = String((await ok('saveSeller', { seller: { name: 'Ring Road Motors', country: id.gh, whatsapp: '+233 20 555 0103' } })).id);
      id.shut = String((await ok('saveSeller', { seller: { name: 'Shut Shop', country: id.gh } })).id);
      const product = async (key: string, seller: string, name: string, price: number, mode = 'buy') => {
        id[key] = String((await ok('saveProduct', { product: { seller: id[seller], name, price, mode, category: key === 'corolla' ? id.cars : id.food } })).id);
      };
      await product('shito', 'kofi', 'Shito pepper sauce, 500 g', 45);
      await product('gari', 'kofi', 'Gari, 2 kg', 38);
      await product('zobo', 'ada', 'Zobo drink, 6 bottles', 6800);
      await product('corolla', 'motors', 'Toyota Corolla 2015', 98000, 'enquire');
      await product('pepper', 'shut', 'Pepper oil', 20);
      await ok('stopSeller', { stop: { sellerId: id.shut, reason: 'closed' } });
      await product('old', 'kofi', 'Old stock', 10);
      await ok('takeOffSale', { sale: { productId: id.old } });
    });

    it('🔴 places one order from two sellers in two countries: a part each, every line at the price the product has now', async () => {
      const r = await ok(
        'placeOrder',
        {
          order: {
            ...buyer,
            country: id.gh,
            currency: 'GHS',
            // What the buyer's phone believes is ignored: prices, sellers and totals come from the store.
            lines: [
              { productId: id.shito, quantity: 2, price: 1, seller: id.ada },
              { productId: id.zobo, quantity: 1, price: 1 },
              { productId: id.gari, quantity: 1 }
            ],
            pay: { [id.gh]: id.wa, [id.ng]: id.bank },
            total: 3
          }
        },
        'stranger'
      );
      first = r.order;
      const year = new Date().getUTCFullYear();
      expect(first.number).toBe(`MK-${year}-00001`);
      expect(first.followToken).toMatch(/^[0-9a-f]{48}$/);
      const [o] = await rows('Order', { number: first.number });
      expect([o.buyerName, o.phone, o.address, o.currency, o.total, o.followToken, o.country.objectId, o.email ?? null]).toEqual([
        'Abena Owusu',
        '+233 20 555 0187',
        'House 14, Osu, Accra',
        'GHS',
        Math.round((2 * 45 + 38 + 6800 * 0.0091) * 100) / 100,
        first.followToken,
        id.gh,
        null
      ]);
      const parts = await rows('OrderPart', { order: ptr('Order', o.objectId) });
      expect(parts.map((p) => [p.seller.objectId, p.status, p.subtotal, p.wayToPay.objectId])).toEqual([
        [id.kofi, 'new', 2 * 45 + 38, id.wa],
        [id.ada, 'new', 6800, id.bank]
      ]);
      const lines = await rows('OrderLine', { orderPart: { $in: parts.map((p) => ptr('OrderPart', p.objectId)) } });
      expect(lines.map((l) => [l.productName, l.quantity, l.price, l.orderPart.objectId])).toEqual([
        ['Shito pepper sauce, 500 g', 2, 45, parts[0].objectId],
        ['Gari, 2 kg', 1, 38, parts[0].objectId],
        ['Zobo drink, 6 bottles', 1, 6800, parts[1].objectId]
      ]);
      for (const p of parts) expect((await historyOf('OrderPart', 'orderPart', p.objectId)).map((h) => h.changed.status)).toEqual([{ from: null, to: 'new' }]);
    });

    it('the next order takes the next number; the same product twice is one line', async () => {
      const r = await ok('placeOrder', { order: { ...buyer, buyerName: 'Kwame', country: id.gh, lines: [{ productId: id.shito, quantity: 1 }, { productId: id.shito, quantity: 2 }], pay: { [id.gh]: id.cod } } }, 'stranger');
      expect(r.order.number).toBe(`MK-${new Date().getUTCFullYear()}-00002`);
      const [o] = await rows('Order', { number: r.order.number });
      const [part] = await rows('OrderPart', { order: ptr('Order', o.objectId) });
      expect((await rows('OrderLine', { orderPart: ptr('OrderPart', part.objectId) })).map((l) => [l.productName, l.quantity])).toEqual([['Shito pepper sauce, 500 g', 3]]);
      expect(r.order.followToken).not.toBe(first.followToken);
    });

    it('🔴 AC4: a way to pay that is off in a country is refused there', async () => {
      // WhatsApp is on in Ghana only, bank transfer in Nigeria only.
      await refused('placeOrder', { order: { ...buyer, country: id.gh, lines: [{ productId: id.zobo, quantity: 1 }], pay: { [id.ng]: id.wa } } }, 'isn’t a way to pay in Nigeria', 'stranger');
      await refused('placeOrder', { order: { ...buyer, country: id.gh, lines: [{ productId: id.shito, quantity: 1 }], pay: { [id.gh]: id.bank } } }, 'isn’t a way to pay in Ghana', 'stranger');
      await refused('placeOrder', { order: { ...buyer, country: id.gh, lines: [{ productId: id.shito, quantity: 1 }, { productId: id.zobo, quantity: 1 }], pay: { [id.gh]: id.cod } } }, 'Pick how you’ll pay in Nigeria', 'stranger');
    });

    it('🔴 WhatsApp is only for a seller with a number, even where it is on', async () => {
      await ok('saveWayToPay', { way: { method: 'whatsapp', countries: [id.gh, id.ng] } });
      await refused('placeOrder', { order: { ...buyer, country: id.gh, lines: [{ productId: id.zobo, quantity: 1 }], pay: { [id.ng]: id.wa } } }, 'no WhatsApp number', 'stranger');
      await ok('saveWayToPay', { way: { method: 'whatsapp', countries: [id.gh] } });
    });

    it('🔴 refuses what isn’t on sale, what is bought by talking, and a basket that makes no sense', async () => {
      const pay = { [id.gh]: id.cod, [id.ng]: id.cod };
      const order = (lines: unknown, extra: Row = {}) => ({ order: { ...buyer, country: id.gh, lines, pay, ...extra } });
      await refused('placeOrder', order([{ productId: id.old, quantity: 1 }]), 'Old stock isn’t on sale now', 'stranger');
      await refused('placeOrder', order([{ productId: id.pepper, quantity: 1 }]), 'Pepper oil isn’t on sale now', 'stranger');
      await refused('placeOrder', order([{ productId: 'no-such', quantity: 1 }]), 'isn’t on sale now', 'stranger');
      await refused('placeOrder', order([{ productId: id.corolla, quantity: 1 }]), 'isn’t bought here', 'stranger');
      for (const quantity of [0, 1.5, -1, 'two']) await refused('placeOrder', order([{ productId: id.shito, quantity }]), 'whole number', 'stranger');
      await refused('placeOrder', order([{ productId: id.shito, quantity: 60 }, { productId: id.shito, quantity: 40 }]), '99 of one product', 'stranger');
      await refused('placeOrder', order([]), 'basket is empty', 'stranger');
      await refused('placeOrder', order([{ productId: id.shito, quantity: 1 }], { buyerName: '' }), 'who the order is for', 'stranger');
      await refused('placeOrder', order([{ productId: id.shito, quantity: 1 }], { phone: '12' }), 'phone number', 'stranger');
      await refused('placeOrder', order([{ productId: id.shito, quantity: 1 }], { address: '' }), 'where it goes', 'stranger');
      await refused('placeOrder', order([{ productId: id.shito, quantity: 1 }], { country: 'nowhere' }), 'which country', 'stranger');
      await refused('placeOrder', order([{ productId: id.shito, quantity: 1 }], { email: 'not-an-email' }), 'email', 'stranger');
      expect((await rows('Order')).length).toBe(2);
    });

    it('🔴 rule 2: a price changed later changes no order', async () => {
      await ok('saveProduct', { product: { id: id.shito, name: 'Shito pepper sauce, 500 g', price: 50, mode: 'buy', category: id.food } });
      const [o] = await rows('Order', { number: first.number });
      const [part] = await rows('OrderPart', { order: ptr('Order', o.objectId), seller: ptr('Seller', id.kofi) });
      expect((await rows('OrderLine', { orderPart: ptr('OrderPart', part.objectId) }))[0].price).toBe(45);
      expect(part.subtotal).toBe(128);
    });

    it('the private link opens the order: every part, its seller, its way to pay, its lines', async () => {
      const r = await ok('followOrder', { follow: { token: first.followToken } }, 'stranger');
      const o = r.order;
      expect([o.number, o.buyerName, o.address, o.country, o.currency]).toEqual([first.number, 'Abena Owusu', 'House 14, Osu, Accra', 'Ghana', 'GHS']);
      expect(o.parts.map((p: Row) => [p.seller, p.country, p.currency, p.status, p.subtotal, p.way.method, p.whatsapp])).toEqual([
        ['Kofi’s Kitchen', 'Ghana', 'GHS', 'new', 128, 'whatsapp', '233245550100'],
        ['Ada’s Farm Drinks', 'Nigeria', 'NGN', 'new', 6800, 'bank-transfer', '']
      ]);
      expect(o.parts[0].lines).toEqual([
        { name: 'Shito pepper sauce, 500 g', quantity: 2, price: 45 },
        { name: 'Gari, 2 kg', quantity: 1, price: 38 }
      ]);
      expect(o.parts[1].way.instructions).toBe('Use your order number as the reference.');
    });

    it('🔴 AC3: no other link opens it, and nobody reads an order without its link', async () => {
      const second = (await rows('Order', {}, '-number'))[0];
      for (const token of ['', 'short', first.followToken.slice(0, 40), first.followToken.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')), `${first.followToken}x`]) {
        await refused('followOrder', { follow: { token } }, 'no order at this link', 'stranger');
      }
      // A link opens its own order, never the other one.
      expect((await ok('followOrder', { follow: { token: second.followToken } }, 'stranger')).order.number).toBe(second.number);
      // Read directly, as a stranger: the policy shows no order at all.
      const direct = await req<{ results: Row[] }>('GET', '/classes/Order', undefined, {});
      expect([direct.status === 200 ? direct.json.results.length : 0]).toEqual([0]);
    });

    it('🔴 rule 3: a seller’s staff see their own part and its lines, not the other seller’s, and never the link', async () => {
      const parts = await req<{ results: Row[] }>('GET', '/classes/OrderPart', undefined, who.kofi);
      expect(parts.json.results.every((p) => p.seller.objectId === id.kofi)).toBe(true);
      expect(parts.json.results.length).toBe(2);
      const orders = await req<{ results: Row[] }>('GET', '/classes/Order', undefined, who.kofi);
      expect(orders.json.results.length).toBe(2);
      expect(orders.json.results.some((o) => 'followToken' in o)).toBe(false);
      const lines = await req<{ results: Row[] }>('GET', '/classes/OrderLine', undefined, who.kofi);
      expect(lines.json.results.map((l) => l.productName).sort()).toEqual(['Gari, 2 kg', 'Shito pepper sauce, 500 g', 'Shito pepper sauce, 500 g'].sort());
    });
  });
});
