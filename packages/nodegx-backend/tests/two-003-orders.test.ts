/**
 * TWO-003 slice 4 — orders: each seller moves only their own part of an order, one step at a time, and the buyer sees
 * every part move.
 *
 * 🔴 **It runs the SHIPPED functions**, read from `templates/marketplace/components/__cloud__/`, on a backend locked
 * with the template's own `nodegx.security.json`. Everything is made through the functions (the admin by
 * `setUpMarketplace`, the marketplace by slices 1 and 3, the order by a buyer's `placeOrder`); the master key only
 * reads back what they wrote.
 *
 * What it proves (TWO-003 §3.4; AC2, AC3's seller half; the world's rules 3 and 6):
 *
 * - 🔴 AC2: an order from two sellers in two countries; each seller's staff move only their own part, to delivered,
 *   and the buyer's private link shows both parts move;
 * - a part moves only to its NEXT step: confirming needs the delivery cost; paid on delivery has no "paid" step;
 *   delivered and cancelled are the end; a cancel needs why, and the buyer sees it;
 * - 🔴 a seller's staff can't move another seller's part (whatever seller they claim), can't read it, and can't write
 *   a part directly; a stranger can't call `movePart` at all; the admin moves any part;
 * - every move has its history row, saying who.
 *
 * `TWO003_TEMPLATE` points it at a mutated copy (`two-003-orders-mutants.test.ts`).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request, type ParsePointer, type ParseRecord } from './helpers/http';

jest.setTimeout(90000);

const TEMPLATE = process.env.TWO003_TEMPLATE || path.join(__dirname, '../../../templates/marketplace');
const SETUP_TOKEN = 'setup-token-two003-orders';
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
  'followOrder',
  'movePart'
];

interface Answer<R = Record<string, unknown>> {
  result?: R;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, unknown>;
/** An order as placeOrder answers it. */
interface Placed {
  number: string;
  followToken: string;
}
/** The rows this spec reads into. A history row's `changed` names each field that moved; its first row has no `who`. */
interface OrderPart extends ParseRecord {
  seller: ParsePointer;
}
interface OrderPartHistory extends ParseRecord {
  changed: Record<string, { from?: unknown; to?: unknown }>;
  who?: ParsePointer;
}
interface Person extends ParseRecord {
  login: ParsePointer;
}

describe('TWO-003 slice 4 — each seller moves their own part, the buyer sees both move', () => {
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) => request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const who: Record<string, Record<string, string>> = { stranger: {} };
  const id: Record<string, string> = {};

  const call = <R = Record<string, unknown>>(fn: string, body: Record<string, unknown>, as: string) => req<Answer<R>>('POST', `/functions/${fn}`, body, who[as]);
  /** A function's answer, as the caller names its shape; an answer with no result reads as an empty one. */
  const ok = async <R = Record<string, unknown>>(fn: string, body: Record<string, unknown>, as = 'admin'): Promise<R> => {
    const r = await call<R>(fn, body, as);
    if (r.status !== 200) throw new Error(`${fn} refused: ${r.status} ${JSON.stringify(r.json)}`);
    return (r.json.result ?? {}) as R;
  };
  const refused = async (fn: string, body: Record<string, unknown>, words: string | RegExp, as = 'admin') => {
    const r = await call(fn, body, as);
    expect([fn, r.status === 200, JSON.stringify(r.json)]).toEqual([fn, false, expect.stringMatching(words)]);
  };
  const signIn = async (name: string, email: string, password: string) => {
    const r = await req<{ sessionToken: string }>('POST', '/login', { username: email, password }, {});
    if (r.status !== 200) throw new Error(`sign-in ${name}: ${r.status} ${JSON.stringify(r.json)}`);
    who[name] = { 'x-parse-session-token': r.json.sessionToken };
  };
  const rows = async <T extends ParseRecord = ParseRecord>(collection: string, where: Row = {}, order = 'createdAt') =>
    (await req<{ results: T[] }>('GET', `/classes/${collection}?where=${encodeURIComponent(JSON.stringify(where))}&order=${order}&limit=1000`)).json.results;
  const row = async (collection: string, objectId: string) => (await req<Row>('GET', `/classes/${collection}/${objectId}`)).json;
  const historyOf = async (objectId: string) => rows<OrderPartHistory>('OrderPartHistory', { orderPart: ptr('OrderPart', objectId) }, 'at');
  const move = (partId: string, to: string, extra: Row = {}) => ({ move: { partId, to, ...extra } });
  const statusOf = async (partId: string) => (await row('OrderPart', partId)).status;
  /** The order as its buyer's private link shows it: each seller's part and where it is. */
  const followed = async (token: string) => {
    const o = (await ok<{ order: { parts: Row[] } }>('followOrder', { follow: { token } }, 'stranger')).order;
    return Object.fromEntries((o.parts as Row[]).map((p) => [p.seller, p]));
  };

  let order: { number: string; followToken: string };

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two003-orders-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003or', backendName: 'TWO-003 orders', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    await ok('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, marketplace: 'Market Square', name: 'Admin', email: 'admin@example.com', password: 'longenough' } }, 'stranger');
    await signIn('admin', 'admin@example.com', 'longenough');

    // The marketplace: Ghana pays on delivery, Nigeria by bank transfer (or on delivery).
    id.gh = String((await ok('saveCountry', { country: { name: 'Ghana', currency: 'GHS' } })).id);
    id.ng = String((await ok('saveCountry', { country: { name: 'Nigeria', currency: 'NGN' } })).id);
    await ok('saveRates', { rates: { rates: [{ currency: 'GHS', value: 1 }, { currency: 'NGN', value: 0.0091 }] } });
    id.food = String((await ok('saveShelf', { shelf: { name: 'Food and drinks' } })).id);
    await ok('saveWayToPay', { way: { method: 'on-delivery', countries: [id.gh, id.ng] } });
    await ok('saveWayToPay', { way: { method: 'bank-transfer', countries: [id.ng] } });
    id.cod = (await rows('WayToPay', { method: 'on-delivery' }))[0].objectId;
    id.bank = (await rows('WayToPay', { method: 'bank-transfer' }))[0].objectId;
    id.kofi = String((await ok('saveSeller', { seller: { name: 'Kofi’s Kitchen', country: id.gh, phone: '+233 24 555 0100' } })).id);
    id.ada = String((await ok('saveSeller', { seller: { name: 'Ada’s Farm Drinks', country: id.ng, phone: '+234 80 555 0101' } })).id);
    id.shito = String((await ok('saveProduct', { product: { seller: id.kofi, name: 'Shito pepper sauce, 500 g', price: 45, mode: 'buy', category: id.food } })).id);
    id.zobo = String((await ok('saveProduct', { product: { seller: id.ada, name: 'Zobo drink, 6 bottles', price: 6800, mode: 'buy', category: id.food } })).id);
    await ok('giveLogin', { login: { sellerId: id.kofi, name: 'Kofi staff', email: 'kofi@example.com', password: 'longenough' } });
    await ok('giveLogin', { login: { sellerId: id.ada, name: 'Ada staff', email: 'ada@example.com', password: 'longenough' } });
    await signIn('kofi', 'kofi@example.com', 'longenough');
    await signIn('ada', 'ada@example.com', 'longenough');

    // A buyer in Accra orders from both: pay on delivery in Ghana, bank transfer in Nigeria.
    order = (
      await ok<{ order: Placed }>(
        'placeOrder',
        {
          order: {
            buyerName: 'Abena Owusu',
            phone: '+233 20 555 0187',
            address: 'House 14, Osu, Accra',
            country: id.gh,
            currency: 'GHS',
            lines: [
              { productId: id.shito, quantity: 2 },
              { productId: id.zobo, quantity: 1 }
            ],
            pay: { [id.gh]: id.cod, [id.ng]: id.bank }
          }
        },
        'stranger'
      )
    ).order;
    const [o] = await rows('Order', { number: order.number });
    for (const p of await rows<OrderPart>('OrderPart', { order: ptr('Order', o.objectId) })) id[p.seller.objectId === id.kofi ? 'kofiPart' : 'adaPart'] = p.objectId;
  });

  afterAll(async () => {
    await service?.stop();
  });

  describe('🔴 nobody moves another seller’s part', () => {
    it('a seller’s staff can’t move the other seller’s part, even claiming to be that seller, and can’t read it', async () => {
      await refused('movePart', move(id.adaPart, 'confirmed', { deliveryCost: 0 }), 'another seller’s', 'kofi');
      await refused('movePart', move(id.adaPart, 'confirmed', { deliveryCost: 0, sellerId: id.ada, seller: id.ada }), 'another seller’s', 'kofi');
      await refused('movePart', move(id.adaPart, 'cancelled', { reason: 'not mine' }), 'another seller’s', 'kofi');
      const read = await req('GET', `/classes/OrderPart/${id.adaPart}`, undefined, who.kofi);
      expect(read.status === 200).toBe(false);
      expect(await statusOf(id.adaPart)).toBe('new');
    });

    it('the policy: a stranger can’t call movePart; staff can’t write a part directly', async () => {
      expect([401, 403].includes((await call('movePart', move(id.kofiPart, 'confirmed', { deliveryCost: 0 }), 'stranger')).status)).toBe(true);
      const put = await req('PUT', `/classes/OrderPart/${id.kofiPart}`, { status: 'delivered' }, who.kofi);
      expect(put.status === 200).toBe(false);
      expect(await statusOf(id.kofiPart)).toBe('new');
    });

    it('a part that isn’t there, and nothing said', async () => {
      await refused('movePart', move('nosuchpart', 'confirmed', { deliveryCost: 0 }), 'no such order part', 'kofi');
      // The Request refuses a parameter that isn't an object before the script runs.
      await refused('movePart', { move: 'confirmed' }, 'expects object', 'kofi');
    });
  });

  describe('one step at a time', () => {
    it('🔴 confirming needs the delivery cost (0 when free), never less than 0, and nothing can skip it', async () => {
      await refused('movePart', move(id.kofiPart, 'confirmed'), 'what delivery costs', 'kofi');
      await refused('movePart', move(id.kofiPart, 'confirmed', { deliveryCost: '' }), 'what delivery costs', 'kofi');
      await refused('movePart', move(id.kofiPart, 'confirmed', { deliveryCost: -5 }), 'what delivery costs', 'kofi');
      await refused('movePart', move(id.kofiPart, 'confirmed', { deliveryCost: 'some' }), 'what delivery costs', 'kofi');
      await refused('movePart', move(id.kofiPart, 'packed'), 'From New it moves to Confirmed next', 'kofi');
      await refused('movePart', move(id.kofiPart, 'delivered'), 'From New it moves to Confirmed next', 'kofi');
      expect(await statusOf(id.kofiPart)).toBe('new');
    });

    it('Kofi confirms: GH₵20, on Thursday, typed with a comma', async () => {
      expect((await ok('movePart', move(id.kofiPart, 'confirmed', { deliveryCost: '20,00', deliveryNote: 'Thursday' }), 'kofi')).part).toEqual({ id: id.kofiPart, status: 'confirmed' });
      const p = await row('OrderPart', id.kofiPart);
      expect([p.status, p.deliveryCost, p.deliveryNote]).toEqual(['confirmed', 20, 'Thursday']);
    });

    it('🔴 paid on delivery has no "paid" step: confirmed moves to packed', async () => {
      await refused('movePart', move(id.kofiPart, 'paid'), 'From Confirmed it moves to Packed next', 'kofi');
      await ok('movePart', move(id.kofiPart, 'packed'), 'kofi');
    });

    it('🔴 a bank transfer does: Ada confirms, then marks it paid before it is packed', async () => {
      await ok('movePart', move(id.adaPart, 'confirmed', { deliveryCost: 1500 }), 'ada');
      await refused('movePart', move(id.adaPart, 'packed'), 'From Confirmed it moves to Paid next', 'ada');
      await ok('movePart', move(id.adaPart, 'paid'), 'ada');
      await ok('movePart', move(id.adaPart, 'packed'), 'ada');
    });

    it('🔴 AC2: the buyer’s link shows each part where its seller moved it', async () => {
      const parts = await followed(order.followToken);
      expect([parts['Kofi’s Kitchen'].status, parts['Kofi’s Kitchen'].deliveryCost, parts['Kofi’s Kitchen'].deliveryNote, parts['Ada’s Farm Drinks'].status]).toEqual(['packed', 20, 'Thursday', 'packed']);
    });

    it('🔴 AC2: each seller moves their own part to delivered; the buyer sees both delivered; delivered is the end', async () => {
      await ok('movePart', move(id.kofiPart, 'sent'), 'kofi');
      await ok('movePart', move(id.adaPart, 'sent'), 'ada');
      expect(Object.values(await followed(order.followToken)).map((p) => (p as { status: string }).status)).toEqual(['sent', 'sent']);
      await ok('movePart', move(id.kofiPart, 'delivered'), 'kofi');
      await ok('movePart', move(id.adaPart, 'delivered'), 'ada');
      expect(Object.values(await followed(order.followToken)).map((p) => (p as { status: string }).status)).toEqual(['delivered', 'delivered']);
      await refused('movePart', move(id.kofiPart, 'cancelled', { reason: 'too late' }), 'delivered: it doesn’t move any more', 'kofi');
      await refused('movePart', move(id.adaPart, 'sent'), 'delivered: it doesn’t move any more', 'admin');
    });

    it('rule 6: every move is in the part’s history, from and to, with who moved it', async () => {
      const h = await historyOf(id.kofiPart);
      expect(h.map((x) => x.changed.status)).toEqual([
        { from: null, to: 'new' },
        { from: 'new', to: 'confirmed' },
        { from: 'confirmed', to: 'packed' },
        { from: 'packed', to: 'sent' },
        { from: 'sent', to: 'delivered' }
      ]);
      expect([h[1].changed.deliveryCost, h[1].changed.deliveryNote]).toEqual([{ from: null, to: 20 }, { from: null, to: 'Thursday' }]);
      const kofiLogin = (await rows<Person>('Person', { seller: ptr('Seller', id.kofi) }))[0].login.objectId;
      expect(h.slice(1).every((x) => x.who?.objectId === kofiLogin)).toBe(true);
      expect((await historyOf(id.adaPart)).map((x) => x.changed.status.to)).toEqual(['new', 'confirmed', 'paid', 'packed', 'sent', 'delivered']);
    });
  });

  describe('cancelling', () => {
    let second: { number: string; followToken: string };
    beforeAll(async () => {
      second = (
        await ok<{ order: Placed }>(
          'placeOrder',
          { order: { buyerName: 'Kwame Boateng', phone: '+233 24 000 0043', address: 'Tema', country: id.gh, lines: [{ productId: id.shito, quantity: 1 }, { productId: id.zobo, quantity: 2 }], pay: { [id.gh]: id.cod, [id.ng]: id.cod } } },
          'stranger'
        )
      ).order;
      const [o] = await rows('Order', { number: second.number });
      for (const p of await rows<OrderPart>('OrderPart', { order: ptr('Order', o.objectId) })) id[p.seller.objectId === id.kofi ? 'kofiPart2' : 'adaPart2'] = p.objectId;
    });

    it('🔴 a cancel needs why; with it, the part is cancelled for good and the buyer reads why', async () => {
      await refused('movePart', move(id.kofiPart2, 'cancelled'), 'Say why', 'kofi');
      await refused('movePart', move(id.kofiPart2, 'cancelled', { reason: '   ' }), 'Say why', 'kofi');
      await ok('movePart', move(id.kofiPart2, 'cancelled', { reason: 'Out of shito until November' }), 'kofi');
      const p = await row('OrderPart', id.kofiPart2);
      expect([p.status, p.cancelledReason]).toEqual(['cancelled', 'Out of shito until November']);
      expect((await historyOf(id.kofiPart2))[1].changed).toEqual({ status: { from: 'new', to: 'cancelled' }, cancelledReason: { from: null, to: 'Out of shito until November' } });
      await refused('movePart', move(id.kofiPart2, 'confirmed', { deliveryCost: 0 }), 'cancelled: it doesn’t move any more', 'kofi');
      const parts = await followed(second.followToken);
      expect([parts['Kofi’s Kitchen'].status, parts['Kofi’s Kitchen'].cancelledReason, parts['Ada’s Farm Drinks'].status]).toEqual(['cancelled', 'Out of shito until November', 'new']);
    });

    it('the admin moves any seller’s part, and the history says the admin did', async () => {
      await ok('movePart', move(id.adaPart2, 'confirmed', { deliveryCost: 0 }), 'admin');
      await ok('movePart', move(id.adaPart2, 'packed'), 'admin');
      const adminLogin = (await rows<Person>('Person', { role: 'admin' }))[0].login.objectId;
      expect([await statusOf(id.adaPart2), (await historyOf(id.adaPart2)).slice(1).map((x) => x.who!.objectId)]).toEqual(['packed', [adminLogin, adminLogin]]);
    });
  });
});
