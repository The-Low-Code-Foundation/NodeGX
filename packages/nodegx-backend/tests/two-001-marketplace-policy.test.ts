/**
 * P121 TWO-001 — the marketplace (many sellers, one basket): the schema and the policy, kept by a
 * locked backend.
 *
 * The schema is not hand-written. `templates/marketplace/docs/world/` is the shop's world in plain
 * words (`docs/WORLD.md` reads it out), and `backend/schema.json` is `schemaPushes(projectWorld(…))`
 * byte for byte. Run with `TWO_SCHEMA_WRITE=1` to rewrite it after the world changes.
 *
 * The policy is `templates/marketplace/nodegx.security.json`. What it must keep:
 *
 *   - anyone sees the marketplace's name, the sellers, the shelves, the products, the countries, the
 *     rates and the ways to pay; nobody but the admin sees a seller's payout account or why a seller was stopped;
 *   - a seller's staff see their own seller's order parts, the lines in them, the orders those
 *     parts belong to, the payments on those orders and the enquiries about their own products —
 *     nothing of another seller's (a path from their login through the seller they work for);
 *   - a buyer with an account sees their own orders, every part of them, the lines and payments;
 *     the private link that follows an order is the buyer's and the admin's, not a seller's;
 *   - nobody sees another buyer's order, and an anonymous caller sees no order at all (a guest
 *     follows theirs through a function that is handed the link);
 *   - nobody writes a row directly, the admin included: every write is a function that writes the
 *     history beside it, and a payment is written by the provider's webhook alone.
 *
 * `TWO_MARKET_SECURITY=<file>` points the spec at another policy, which is how its mutants are run.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { projectWorld, schemaPushes, type WorldFiles } from '../../nodegx-project-contract/world';
import { validateSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

const TEMPLATE = path.join(__dirname, '../../../templates/marketplace');
const WORLD = path.join(TEMPLATE, 'docs/world');
const SCHEMA_FILE = path.join(TEMPLATE, 'backend/schema.json');
const SECURITY_FILE = process.env.TWO_MARKET_SECURITY || path.join(TEMPLATE, 'nodegx.security.json');

const read = (name: string) => JSON.parse(fs.readFileSync(path.join(WORLD, `${name}.json`), 'utf8'));
const files: WorldFiles = { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary'), rules: read('rules') };
const projected = projectWorld(files);
if (!projected.ok) throw new Error(projected.problems.join('\n'));
const schema = projected.schema;
const pushes = schemaPushes(schema);
const security = JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf8'));

interface Found {
  results: Array<Record<string, unknown>>;
}

describe('TWO-001 the marketplace — the world is the schema', () => {
  it('backend/schema.json is the projection of docs/world/, byte for byte', () => {
    const text = JSON.stringify(pushes, null, 2) + '\n';
    if (process.env.TWO_SCHEMA_WRITE) {
      fs.mkdirSync(path.dirname(SCHEMA_FILE), { recursive: true });
      fs.writeFileSync(SCHEMA_FILE, text);
    }
    expect(fs.readFileSync(SCHEMA_FILE, 'utf8')).toBe(text);
  });

  it('the world makes the twelve things, the payment that happens, and a history where it said one', () => {
    // R13 (Richard, 2026-10-15): the marketplace itself, one row, its name.
    const things = ['Person', 'Seller', 'Country', 'Rate', 'Category', 'Product', 'WayToPay', 'Order', 'OrderPart', 'OrderLine', 'Enquiry', 'Payment', 'Marketplace'];
    const histories = ['Person', 'Seller', 'Country', 'Rate', 'Product', 'WayToPay', 'OrderPart', 'Marketplace'].map((n) => `${n}History`);
    expect(schema.collections.map((c) => c.name).sort()).toEqual([...things, ...histories].sort());
  });

  it('the policy names every collection the world makes, and no other', () => {
    expect(validateSecurityConfig(security)).toEqual([]);
    expect(Object.keys(security.collections).sort()).toEqual(schema.collections.map((c) => c.name).sort());
  });

  it('the policy carries every rule the world says the store keeps on a write', () => {
    for (const c of schema.collections) {
      expect([c.name, security.collections[c.name].onlyWhile]).toEqual([c.name, c.onlyWhile]);
    }
  });

  it('nothing is written directly, by anybody, and nothing is ever deleted', () => {
    for (const [name, entry] of Object.entries<{ permissions: Record<string, unknown> }>(security.collections)) {
      expect([name, entry.permissions.create, entry.permissions.update, entry.permissions.delete]).toEqual([name, 'nobody', 'nobody', 'nobody']);
    }
    expect(security.signup).toBe('nobody');
    expect(security.devOpen).toBe(false);
  });
});

describe('TWO-001 the marketplace — the policy, kept by a locked backend', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) =>
    request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const at = { __type: 'Date', iso: '2026-10-14T09:00:00.000Z' };

  const session: Record<string, Record<string, string>> = {};
  const userId: Record<string, string> = {};
  const id: Record<string, string> = {};

  const make = async (collection: string, name: string, data: Record<string, unknown>) => {
    const r = await req<{ objectId: string }>('POST', `/classes/${collection}`, data);
    if (r.status !== 201 && r.status !== 200) throw new Error(`${collection} ${name}: ${r.status} ${JSON.stringify(r.json)}`);
    id[name] = r.json.objectId;
  };
  const find = (collection: string, who: Record<string, string>, query = '') =>
    req<Found>('GET', `/classes/${collection}${query}`, undefined, who);
  const ids = (r: { json: Found }) => r.json.results.map((row) => row.objectId).sort();
  const named = (...names: string[]) => names.map((n) => id[n]).sort();

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two001-market-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two001m', backendName: 'TWO-001 marketplace', authToken: 't0k' });
    base = (await service.start()).listen.url;

    for (const push of pushes) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    for (const role of ['admin', 'staff']) expect((await req('POST', '/admin/roles', { name: role })).status).toBe(201);

    await make('Marketplace', 'mk', { name: 'Market Square' });
    await make('Country', 'gh', { name: 'Ghana', currency: 'GHS' });
    await make('Country', 'ng', { name: 'Nigeria', currency: 'NGN' });
    await make('Rate', 'ghs', { currency: 'GHS', value: 1 });
    await make('Category', 'food', { name: 'Food and drinks' });
    await make('WayToPay', 'card', { name: 'Card or mobile money', method: 'paystack' });
    await make('Seller', 'kofi', { name: 'Kofi’s Kitchen', phone: '+233 20 000 0000', payoutAccount: 'ACCT_kofi', country: ptr('Country', id.gh) });
    await make('Seller', 'ada', { name: 'Ada Fabrics', phone: '+234 80 000 0000', payoutAccount: 'ACCT_ada', country: ptr('Country', id.ng) });
    await make('Seller', 'gone', {
      name: 'Closed shop',
      payoutAccount: 'ACCT_gone',
      stoppedReason: 'asked to leave',
      endedAt: at,
      country: ptr('Country', id.gh)
    });
    await make('Product', 'shito', { name: 'Shito', price: 40, mode: 'buy', seller: ptr('Seller', id.kofi), category: ptr('Category', id.food) });
    await make('Product', 'kente', { name: 'Kente', price: 9000, mode: 'buy', seller: ptr('Seller', id.ada), category: ptr('Category', id.food) });
    await make('Product', 'car', { name: 'A car', price: 90000, mode: 'enquire', seller: ptr('Seller', id.ada), category: ptr('Category', id.food) });

    // boss: the admin. kofiStaff and adaStaff: a seller's staff. buyer and other: buyers with accounts.
    const people: Array<[string, string, string[], string?]> = [
      ['boss', 'admin', ['admin']],
      ['kofiStaff', 'seller', ['staff'], 'kofi'],
      ['adaStaff', 'seller', ['staff'], 'ada'],
      ['buyer', 'buyer', []],
      ['other', 'buyer', []]
    ];
    for (const [name, role, roles, seller] of people) {
      const made = await req<{ objectId: string }>('POST', '/admin/users', { username: name, email: `${name}@example.com`, password: `pw-${name}`, roles });
      expect(made.status).toBe(201);
      userId[name] = made.json.objectId;
      const login = await req<{ sessionToken: string }>('POST', '/login', { username: name, password: `pw-${name}` }, {});
      session[name] = { 'x-parse-session-token': login.json.sessionToken };
      await make('Person', name, { name, email: `${name}@example.com`, role, login: ptr('_User', userId[name]), ...(seller ? { seller: ptr('Seller', id[seller]) } : {}) });
    }

    // The buyer's basket held Kofi's shito and Ada's kente: one order, one part per seller.
    // Another buyer bought from Ada only. A guest bought from Kofi with no account.
    const order = async (name: string, person: string | null, followToken: string) =>
      make('Order', name, {
        buyerName: name,
        phone: '+233 24 000 0000',
        address: '1 Ring Road',
        currency: 'GHS',
        total: 100,
        followToken,
        number: `MK-2026-0000${Object.keys(id).length}`,
        country: ptr('Country', id.gh),
        ...(person ? { person: ptr('Person', id[person]) } : {})
      });
    const part = async (name: string, ord: string, seller: string, product: string) => {
      await make('OrderPart', name, { status: 'new', order: ptr('Order', id[ord]), seller: ptr('Seller', id[seller]), wayToPay: ptr('WayToPay', id.card) });
      await make('OrderLine', `${name}.line`, { quantity: 1, price: 40, productName: product, orderPart: ptr('OrderPart', id[name]), product: ptr('Product', id[product]) });
    };
    await order('buyer.order', 'buyer', 'tok-buyer');
    await part('buyer.kofi', 'buyer.order', 'kofi', 'shito');
    await part('buyer.ada', 'buyer.order', 'ada', 'kente');
    await order('other.order', 'other', 'tok-other');
    await part('other.ada', 'other.order', 'ada', 'kente');
    await order('guest.order', null, 'tok-guest');
    await part('guest.kofi', 'guest.order', 'kofi', 'shito');
    await make('Payment', 'buyer.paid', { order: ptr('Order', id['buyer.order']), at, provider: 'paystack', reference: 'ref-1', currency: 'GHS', country: 'GH', amount: 40, outcome: 'paid' });
    await make('Payment', 'other.paid', { order: ptr('Order', id['other.order']), at, provider: 'paystack', reference: 'ref-2', currency: 'NGN', country: 'NG', amount: 9000, outcome: 'paid' });
    await make('Enquiry', 'car.enquiry', { buyerName: 'Yaw', contact: '+233 24 111 1111', message: 'Still for sale?', product: ptr('Product', id.car) });
    await make('SellerHistory', 'kofi.history', { seller: ptr('Seller', id.kofi), at, who: ptr('_User', userId.boss), changed: { name: [null, 'Kofi’s Kitchen'] } });
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('anyone, with no account', () => {
    it('sees the marketplace’s name, the sellers, the shelves, the products, the countries, the rates and the ways to pay', async () => {
      expect(ids(await find('Seller', {}))).toEqual(named('kofi', 'ada', 'gone'));
      expect(ids(await find('Product', {}))).toEqual(named('shito', 'kente', 'car'));
      for (const c of ['Country', 'Rate', 'Category', 'WayToPay']) expect([c, (await find(c, {})).status]).toEqual([c, 200]);
      expect((await find('Marketplace', {})).json.results.map((r) => r.name)).toEqual(['Market Square']);
    });

    it('🔴 never sees a seller’s payout account or why a seller was stopped', async () => {
      const sellers = (await find('Seller', {})).json.results;
      for (const s of sellers) {
        expect(s).not.toHaveProperty('payoutAccount');
        expect(s).not.toHaveProperty('stoppedReason');
      }
      expect((await find('Seller', {}, `?where=${encodeURIComponent(JSON.stringify({ payoutAccount: 'ACCT_kofi' }))}`)).status).toBeGreaterThanOrEqual(400);
    });

    it('🔴 sees no order, part, line, payment, enquiry or person — not even with a guest’s link', async () => {
      for (const c of ['Order', 'OrderPart', 'OrderLine', 'Payment', 'Enquiry', 'Person', 'SellerHistory', 'MarketplaceHistory']) {
        expect([c, (await find(c, {})).status]).toEqual([c, 403]);
      }
      const byLink = await find('Order', {}, `?where=${encodeURIComponent(JSON.stringify({ followToken: 'tok-guest' }))}`);
      expect(byLink.status).toBe(403);
    });

    it('🔴 cannot make an account or an order directly', async () => {
      expect((await req('POST', '/users', { username: 'eve', password: 'pw' }, {})).status).toBe(403);
      expect((await req('POST', '/classes/Order', { buyerName: 'eve' }, {})).status).toBe(403);
      expect((await req('POST', '/classes/Marketplace', { name: 'Eve’s market' }, {})).status).toBe(403);
    });
  });

  describe('a seller’s staff', () => {
    it('see their own seller’s order parts and the lines in them', async () => {
      expect(ids(await find('OrderPart', session.kofiStaff))).toEqual(named('buyer.kofi', 'guest.kofi'));
      expect(ids(await find('OrderLine', session.kofiStaff))).toEqual(named('buyer.kofi.line', 'guest.kofi.line'));
      expect(ids(await find('OrderPart', session.adaStaff))).toEqual(named('buyer.ada', 'other.ada'));
    });

    it('see the orders their parts belong to, with the buyer’s phone and address', async () => {
      const orders = await find('Order', session.kofiStaff);
      expect(ids(orders)).toEqual(named('buyer.order', 'guest.order'));
      const row = orders.json.results.find((r) => r.objectId === id['guest.order'])!;
      expect([row.phone, row.address]).toEqual(['+233 24 000 0000', '1 Ring Road']);
    });

    it('🔴 never see the private link that follows the order', async () => {
      for (const row of (await find('Order', session.kofiStaff)).json.results) expect(row).not.toHaveProperty('followToken');
    });

    it('see the payments on their orders and the enquiries about their own products', async () => {
      expect(ids(await find('Payment', session.kofiStaff))).toEqual(named('buyer.paid'));
      expect(ids(await find('Payment', session.adaStaff))).toEqual(named('buyer.paid', 'other.paid'));
      expect(ids(await find('Enquiry', session.adaStaff))).toEqual(named('car.enquiry'));
    });

    it('🔴 see nothing of another seller’s: no part, no line, no order, no enquiry', async () => {
      expect((await req('GET', `/classes/OrderPart/${id['buyer.ada']}`, undefined, session.kofiStaff)).status).toBe(404);
      expect((await req('GET', `/classes/OrderLine/${id['other.ada.line']}`, undefined, session.kofiStaff)).status).toBe(404);
      expect((await req('GET', `/classes/Order/${id['other.order']}`, undefined, session.kofiStaff)).status).toBe(404);
      expect(ids(await find('Enquiry', session.kofiStaff))).toEqual([]);
    });

    it('🔴 do not see their own seller’s payout account (it is the admin’s), or any history', async () => {
      const kofi = (await req<Record<string, unknown>>('GET', `/classes/Seller/${id.kofi}`, undefined, session.kofiStaff)).json;
      expect(kofi).not.toHaveProperty('payoutAccount');
      expect((await find('SellerHistory', session.kofiStaff)).status).toBe(403);
    });

    it('🔴 write nothing directly: not a product, not a status, not another seller’s price', async () => {
      expect((await req('POST', '/classes/Product', { name: 'x', price: 1, mode: 'buy', seller: ptr('Seller', id.kofi) }, session.kofiStaff)).status).toBe(403);
      expect((await req('PUT', `/classes/OrderPart/${id['buyer.kofi']}`, { status: 'delivered' }, session.kofiStaff)).status).toBe(403);
      expect((await req('PUT', `/classes/Product/${id.kente}`, { price: 1 }, session.kofiStaff)).status).toBe(403);
    });
  });

  describe('a buyer with an account', () => {
    it('sees their own order, every part of it, the lines and the payment, and the link that follows it', async () => {
      const orders = await find('Order', session.buyer);
      expect(ids(orders)).toEqual(named('buyer.order'));
      expect(orders.json.results[0].followToken).toBe('tok-buyer');
      expect(ids(await find('OrderPart', session.buyer))).toEqual(named('buyer.kofi', 'buyer.ada'));
      expect(ids(await find('OrderLine', session.buyer))).toEqual(named('buyer.kofi.line', 'buyer.ada.line'));
      expect(ids(await find('Payment', session.buyer))).toEqual(named('buyer.paid'));
    });

    it('🔴 sees nobody else’s order, and no enquiry', async () => {
      expect(ids(await find('Order', session.other))).toEqual(named('other.order'));
      expect((await req('GET', `/classes/Order/${id['buyer.order']}`, undefined, session.other)).status).toBe(404);
      expect((await req('GET', `/classes/Payment/${id['buyer.paid']}`, undefined, session.other)).status).toBe(404);
      expect(ids(await find('Enquiry', session.buyer))).toEqual([]);
    });

    it('sees their own Person row and nobody else’s', async () => {
      expect(ids(await find('Person', session.buyer))).toEqual(named('buyer'));
    });

    it('🔴 cannot change what they paid, or write a payment', async () => {
      expect((await req('PUT', `/classes/OrderLine/${id['buyer.kofi.line']}`, { price: 1 }, session.buyer)).status).toBe(403);
      expect((await req('POST', '/classes/Payment', { order: ptr('Order', id['buyer.order']), provider: 'paystack', outcome: 'paid' }, session.buyer)).status).toBe(403);
    });
  });

  describe('the admin', () => {
    it('sees every order, every person, the payout accounts and the history', async () => {
      expect(ids(await find('Order', session.boss))).toEqual(named('buyer.order', 'other.order', 'guest.order'));
      expect(ids(await find('Person', session.boss))).toEqual(named('boss', 'kofiStaff', 'adaStaff', 'buyer', 'other'));
      const gone = (await req<Record<string, unknown>>('GET', `/classes/Seller/${id.gone}`, undefined, session.boss)).json;
      expect([gone.payoutAccount, gone.stoppedReason]).toEqual(['ACCT_gone', 'asked to leave']);
      expect(ids(await find('SellerHistory', session.boss))).toEqual(named('kofi.history'));
      expect(ids(await find('Enquiry', session.boss))).toEqual(named('car.enquiry'));
    });

    it('🔴 writes nothing directly either: a change without its history row is not allowed', async () => {
      expect((await req('PUT', `/classes/Seller/${id.kofi}`, { name: 'x' }, session.boss)).status).toBe(403);
      expect((await req('PUT', `/classes/Payment/${id['buyer.paid']}`, { amount: 1 }, session.boss)).status).toBe(403);
      expect((await req('DELETE', `/classes/Product/${id.shito}`, undefined, session.boss)).status).toBe(403);
    });
  });
});
