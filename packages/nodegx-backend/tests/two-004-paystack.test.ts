/**
 * TWO-004 steps 2–3 — a buyer pays one seller country's parts of an order through Paystack, split to those sellers,
 * and the order says paid only when Paystack says the right amount arrived.
 *
 * 🔴 **It runs the SHIPPED functions**, read from `templates/marketplace/components/__cloud__/`, on a backend locked
 * with the template's own `nodegx.security.json`, against a stand-in for Paystack (`helpers/fake-paystack.ts`)
 * that the backend's `PAYSTACK_API_URL` secret points them at. The real round trip, with test keys, is step 4's.
 *
 * What it proves (TWO-004 §4 AC3's shape, AC6; R8 ruled A; the world's rule 5):
 *
 * - the admin turns Paystack on only where Paystack takes the currency; a checkout picks it only with an email and
 *   with every seller in that country holding a subaccount;
 * - 🔴 a country is paid once every part there is confirmed, never before; the amount, the currency and each seller's
 *   share come from the store, sent with THAT country's key; the reference names the order and the currency;
 * - 🔴 paid only by Paystack's answer: waiting writes nothing; success with the amount owed writes one payment and moves
 *   the parts; any other amount, or a failure, writes a failed payment and moves nothing; asked twice, one row;
 * - 🔴 a seller can't mark a card payment paid; nobody writes a payment directly; no answer carries a key;
 * - 🔴 step 5: Paystack's webhook, through a real `hmac-sha512` trigger per business, marks paid by the same check and
 *   refuses a wrong signature; nobody calls it over HTTP; the page and the webhook checking one payment at the same
 *   moment move the parts once.
 *
 * `TWO003_TEMPLATE` points it at a mutated copy (`two-004-paystack-mutants.test.ts`).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { signWebhookHmac512 } from '../src/triggers/webhook';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { FakePaystack, startFakePaystack } from './helpers/fake-paystack';
import { request, type ParsePointer, type ParseRecord } from './helpers/http';

jest.setTimeout(90000);

const TEMPLATE = process.env.TWO003_TEMPLATE || path.join(__dirname, '../../../templates/marketplace');
const SETUP_TOKEN = 'setup-token-two004-paystack';
const KEY_GH = 'sk_test_ghana_business_key';
const KEY_NG = 'sk_test_nigeria_business_key';
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
  'saveShelf',
  'saveWayToPay',
  'placeOrder',
  'followOrder',
  'movePart',
  'startPayment',
  'checkPayment',
  'paystackEvent'
];
const REF = /^MK-\d{4}-\d{5}-(GHS|NGN)-[0-9a-f]{12}$/;

interface Answer<R = Record<string, unknown>> {
  result?: R;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, unknown>;
/** What placeOrder, startPayment, checkPayment and followOrder answer, as far as this spec reads them. */
type Placed = { order: { number: string; followToken: string } };
type Started = { payment: { reference: string; url: string } };
type Checked = { result: { outcome: string; [field: string]: unknown } };
type Followed = { order: { payments: Row[]; parts: Row[] } };
/** The rows this spec reads into. */
interface OrderPart extends ParseRecord {
  seller: ParsePointer;
}
interface Payment extends ParseRecord {
  order: ParsePointer;
}
interface OrderPartHistory extends ParseRecord {
  changed?: { status?: { to?: string }; [field: string]: unknown };
}

describe('TWO-004 — a country’s sellers paid through Paystack, split, and paid only on Paystack’s word', () => {
  let service: BackendService;
  let fake: FakePaystack;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const answers: string[] = [];
  const req = async <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) => {
    const r = await request<T>(base, method, p, { body, headers });
    answers.push(JSON.stringify(r.json));
    return r;
  };
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
  const rows = async <T extends ParseRecord = ParseRecord>(collection: string, where: Row = {}) => {
    const r = await req<{ results: T[] }>('GET', `/classes/${collection}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt&limit=1000`);
    return r.status === 200 ? r.json.results : [];
  };
  const partsOf = async (orderId: string) => {
    const parts = await rows<OrderPart>('OrderPart', { order: ptr('Order', orderId) });
    return Object.fromEntries(parts.map((p) => [Object.keys(id).find((k) => id[k] === p.seller.objectId) ?? p.seller.objectId, p]));
  };
  const orderOf = async (token: string) => (await rows('Order', { followToken: token }))[0];
  const back = (token: string) => `https://shop.example.com/order/${token}`;
  const place = async (lines: Array<[string, number]>, pay: Record<string, string>, extra: Row = {}) =>
    ok<Placed>(
      'placeOrder',
      {
        order: {
          buyerName: 'Efua Asante',
          phone: '+233 24 555 0123',
          address: '12 Ring Road, Accra',
          email: 'efua@example.com',
          country: id.gh,
          lines: lines.map(([productId, quantity]) => ({ productId, quantity })),
          pay,
          ...extra
        }
      },
      'stranger'
    );
  const confirm = (partId: string, deliveryCost: number) => ok('movePart', { move: { partId, to: 'confirmed', deliveryCost } });

  beforeAll(async () => {
    fake = await startFakePaystack([KEY_GH, KEY_NG]);
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two004-paystack-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(
      path.join(dataDir, 'secrets.json'),
      JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN, PAYSTACK_SECRET_KEY_GHS: KEY_GH, PAYSTACK_SECRET_KEY_NGN: KEY_NG, PAYSTACK_API_URL: fake.url } })
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'two004ps', backendName: 'TWO-004 Paystack', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    await ok('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, marketplace: 'Market Square', name: 'Admin', email: 'admin@example.com', password: 'longenough' } }, 'stranger');
    const login = await req<{ sessionToken: string }>('POST', '/login', { username: 'admin@example.com', password: 'longenough' }, {});
    who.admin = { 'x-parse-session-token': login.json.sessionToken };

    id.gh = String((await ok('saveCountry', { country: { name: 'Ghana', currency: 'GHS' } })).id);
    id.ng = String((await ok('saveCountry', { country: { name: 'Nigeria', currency: 'NGN' } })).id);
    id.ke = String((await ok('saveCountry', { country: { name: 'Kenya', currency: 'KES' } })).id);
    id.ci = String((await ok('saveCountry', { country: { name: 'Côte d’Ivoire', currency: 'XOF' } })).id);
    id.food = String((await ok('saveShelf', { shelf: { name: 'Food and drinks' } })).id);
    const seller = async (key: string, name: string, country: string, payoutAccount?: string) => {
      id[key] = String((await ok('saveSeller', { seller: { name, country: id[country], phone: '+000', ...(payoutAccount ? { payoutAccount } : {}) } })).id);
    };
    await seller('kofi', 'Kofi’s Kitchen', 'gh', 'ACCT_kofi4hl4xenw');
    await seller('ama', 'Ama’s Shea', 'gh', 'ACCT_ama8f4s1eq7');
    await seller('yaw', 'Yaw’s Cloth', 'gh');
    await seller('ada', 'Ada’s Farm Drinks', 'ng', 'ACCT_ada2b7c9d0e');
    await seller('wanjiru', 'Wanjiru’s Tea', 'ke', 'ACCT_wanjiru1a2b3');
    const product = async (key: string, sellerKey: string, name: string, price: number) => {
      id[key] = String((await ok('saveProduct', { product: { seller: id[sellerKey], name, price, mode: 'buy', category: id.food } })).id);
    };
    await product('shito', 'kofi', 'Shito, 500 g', 45);
    await product('shea', 'ama', 'Shea butter, 250 g', 30.5);
    await product('kente', 'yaw', 'Kente strip', 200);
    await product('zobo', 'ada', 'Zobo, 1 l', 2500);
    await product('tea', 'wanjiru', 'Tea, 500 g', 600);

    // Step 5: one webhook per Paystack business, its secret that business's key (Paystack signs with it).
    for (const [slug, key] of [['paystack-ghs', KEY_GH], ['paystack-ngn', KEY_NG]]) {
      const hook = await req<{ trigger: { id: string }; secret?: string }>('POST', '/admin/triggers', { type: 'webhook', name: slug, target: { kind: 'function', name: 'paystackEvent' }, webhook: { slug, scheme: 'hmac-sha512' }, secret: key });
      if (hook.status !== 201) throw new Error(`${slug}: ${hook.status} ${JSON.stringify(hook.json)}`);
    }
  });

  afterAll(async () => {
    await service?.stop();
    await fake?.close();
  });

  it('the admin turns Paystack on only where Paystack takes the currency', async () => {
    await refused('saveWayToPay', { way: { method: 'paystack', countries: [id.gh, id.ci] } }, 'doesn’t take XOF');
    await refused('saveWayToPay', { way: { method: 'flutterwave', countries: [id.gh] } }, 'Flutterwave isn’t set up');
    id.card = String((await ok('saveWayToPay', { way: { method: 'paystack', countries: [id.gh, id.ng, id.ke] } })).id);
    id.door = String((await ok('saveWayToPay', { way: { method: 'on-delivery', countries: [id.gh, id.ng, id.ke, id.ci] } })).id);
    const way = (await rows('WayToPay', { method: 'paystack' }))[0];
    expect([way.name, way.objectId]).toEqual(['Card or mobile money', id.card]);
  });

  it('a checkout picks it only with an email, and only where every seller there can be paid by card', async () => {
    const pay = { [id.gh]: id.card };
    await refused('placeOrder', { order: { buyerName: 'Efua', phone: '+233 24 555 0123', address: 'Accra', country: id.gh, lines: [{ productId: id.shito, quantity: 1 }], pay } }, 'needs your email', 'stranger');
    await refused('placeOrder', { order: { buyerName: 'Efua', phone: '+233 24 555 0123', address: 'Accra', email: 'e@example.com', country: id.gh, lines: [{ productId: id.kente, quantity: 1 }], pay } }, 'Yaw’s Cloth can’t be paid by card yet', 'stranger');
    expect(await rows('Order')).toEqual([]);
  });

  it('🔴 a country is paid once every part there is confirmed: its total, its currency, each seller’s share, its own key', async () => {
    const placed = (await place([[id.shito, 2], [id.shea, 3], [id.zobo, 1]], { [id.gh]: id.card, [id.ng]: id.card })).order;
    id.token = placed.followToken;
    id.order = (await orderOf(id.token)).objectId;
    const parts = await partsOf(id.order);
    const start = (country: string, extra: Row = {}) => ({ pay: { token: id.token, country: id[country], returnUrl: back(id.token), ...extra } });

    await refused('startPayment', start('gh'), 'confirms the delivery cost first', 'stranger');
    await confirm(parts.kofi.objectId, 20);
    await refused('startPayment', start('gh'), 'confirms the delivery cost first', 'stranger');
    await confirm(parts.ama.objectId, 0);
    await refused('startPayment', start('gh', { token: 'f'.repeat(48) }), 'no order at this link', 'stranger');
    await refused('startPayment', start('gh', { returnUrl: 'https://evil.example.com/steal' }), 'its own link', 'stranger');
    expect(fake.initialized).toEqual([]);

    const started = (await ok<Started>('startPayment', start('gh'), 'stranger')).payment;
    expect(started.reference).toMatch(REF);
    expect(started.reference.startsWith(`${placed.number}-GHS-`)).toBe(true);
    expect(started.url).toBe(`${fake.url}/checkout/${started.reference}`);
    expect(fake.initialized).toHaveLength(1);
    const sent = fake.initialized[0];
    // 2 × 45 + 20 delivery to Kofi; 3 × 30.50 + 0 to Ama: in pesewas.
    expect([sent.key, sent.body.amount, sent.body.currency, sent.body.email, sent.body.reference, sent.body.callback_url]).toEqual([KEY_GH, 11000 + 9150, 'GHS', 'efua@example.com', started.reference, back(id.token)]);
    expect(sent.body.split).toEqual({
      name: started.reference,
      type: 'flat',
      currency: 'GHS',
      bearer_type: 'all-proportional',
      subaccounts: [
        { subaccount: 'ACCT_kofi4hl4xenw', share: 11000 },
        { subaccount: 'ACCT_ama8f4s1eq7', share: 9150 }
      ]
    });
    expect(sent.body.metadata).toEqual({ orderId: id.order, countryId: id.gh, number: placed.number, parts: [parts.kofi.objectId, parts.ama.objectId] });
    id.ghRef = started.reference;
    expect(await rows('Payment')).toEqual([]);
  });

  it('🔴 a seller can’t mark a card payment paid, and nobody writes a payment directly', async () => {
    const parts = await partsOf(id.order);
    await refused('movePart', { move: { partId: parts.kofi.objectId, to: 'paid' } }, 'marked paid by the payment provider');
    const direct = await request(base, 'POST', '/classes/Payment', { body: { order: ptr('Order', id.order), at: { __type: 'Date', iso: new Date().toISOString() }, outcome: 'paid' }, headers: who.admin });
    expect(direct.status).not.toBe(201);
    expect((await partsOf(id.order)).kofi.status).toBe('confirmed');
  });

  it('🔴 paid only on Paystack’s word: waiting writes nothing; success writes one payment and moves the parts, once', async () => {
    expect((await ok<Checked>('checkPayment', { check: { reference: id.ghRef } }, 'stranger')).result).toEqual({ outcome: 'waiting', reference: id.ghRef });
    expect(await rows('Payment')).toEqual([]);
    fake.settle(id.ghRef, 'success');
    expect((await ok<Checked>('checkPayment', { check: { reference: id.ghRef } }, 'stranger')).result).toEqual({ outcome: 'paid', reference: id.ghRef, wrongAmount: false });
    const asked = fake.verifies(id.ghRef);
    expect((await ok<Checked>('checkPayment', { check: { reference: id.ghRef } }, 'stranger')).result).toEqual({ outcome: 'paid', reference: id.ghRef });
    // Asked again, it answers from the row it kept, without asking Paystack (which may be down, or its key gone).
    expect(fake.verifies(id.ghRef)).toBe(asked);
    const payments = await rows<Payment>('Payment');
    expect(payments.map((p) => [p.order.objectId, p.provider, p.reference, p.currency, p.country, p.amount, p.outcome])).toEqual([[id.order, 'paystack', id.ghRef, 'GHS', 'Ghana', 201.5, 'paid']]);
    const parts = await partsOf(id.order);
    expect([parts.kofi.status, parts.ama.status, parts.ada.status]).toEqual(['paid', 'paid', 'new']);
    const history = await rows<OrderPartHistory>('OrderPartHistory', { orderPart: ptr('OrderPart', parts.kofi.objectId) });
    expect(history[history.length - 1].changed).toEqual({ status: { from: 'confirmed', to: 'paid' }, paidBy: { from: null, to: id.ghRef } });
    await refused('startPayment', { pay: { token: id.token, country: id.gh, returnUrl: back(id.token) } }, 'paid already', 'stranger');
  });

  it('🔴 any other amount is a failed payment and moves nothing; the next try pays', async () => {
    const parts = await partsOf(id.order);
    await confirm(parts.ada.objectId, 500);
    const first = (await ok<Started>('startPayment', { pay: { token: id.token, country: id.ng, returnUrl: back(id.token) } }, 'stranger')).payment;
    expect([fake.initialized[1].key, fake.initialized[1].body.amount, fake.initialized[1].body.currency]).toEqual([KEY_NG, 300000, 'NGN']);
    fake.settle(first.reference, 'success', 1000);
    expect((await ok<Checked>('checkPayment', { check: { reference: first.reference } }, 'stranger')).result).toEqual({ outcome: 'failed', reference: first.reference, wrongAmount: true });
    expect((await partsOf(id.order)).ada.status).toBe('confirmed');

    const second = (await ok<Started>('startPayment', { pay: { token: id.token, country: id.ng, returnUrl: back(id.token) } }, 'stranger')).payment;
    expect(second.reference).not.toBe(first.reference);
    fake.settle(second.reference, 'failed');
    const inDollars = (await ok<Started>('startPayment', { pay: { token: id.token, country: id.ng, returnUrl: back(id.token) } }, 'stranger')).payment;
    fake.settle(inDollars.reference, 'success', 300000, 'USD');
    expect((await ok<Checked>('checkPayment', { check: { reference: inDollars.reference } }, 'stranger')).result.outcome).toBe('failed');
    expect((await partsOf(id.order)).ada.status).toBe('confirmed');
    expect((await ok<Checked>('checkPayment', { check: { reference: second.reference } }, 'stranger')).result).toEqual({ outcome: 'failed', reference: second.reference, wrongAmount: false });
    expect((await partsOf(id.order)).ada.status).toBe('confirmed');

    const third = (await ok<Started>('startPayment', { pay: { token: id.token, country: id.ng, returnUrl: back(id.token) } }, 'stranger')).payment;
    fake.settle(third.reference, 'success');
    expect((await ok<Checked>('checkPayment', { check: { reference: third.reference } }, 'stranger')).result.outcome).toBe('paid');
    expect((await partsOf(id.order)).ada.status).toBe('paid');
    expect((await rows('Payment', { reference: inDollars.reference }))[0]).toMatchObject({ currency: 'USD', amount: 3000, outcome: 'failed' });
    const payments = await rows('Payment', { currency: 'NGN' });
    expect(payments.map((p) => [p.reference, p.amount, p.outcome])).toEqual([
      [first.reference, 10, 'failed'],
      [second.reference, 3000, 'failed'],
      [third.reference, 3000, 'paid']
    ]);
  });

  it('the buyer’s link shows each payment, and each part’s country', async () => {
    const o = (await ok<Followed>('followOrder', { follow: { token: id.token } }, 'stranger')).order;
    expect(o.payments.map((p: Row) => [p.country, p.currency, p.amount, p.outcome])).toEqual([
      ['Ghana', 'GHS', 201.5, 'paid'],
      ['Nigeria', 'NGN', 10, 'failed'],
      ['Nigeria', 'USD', 3000, 'failed'],
      ['Nigeria', 'NGN', 3000, 'failed'],
      ['Nigeria', 'NGN', 3000, 'paid']
    ]);
    expect(o.parts.map((p: Row) => [p.seller, p.countryId, p.status])).toEqual([
      ['Kofi’s Kitchen', id.gh, 'paid'],
      ['Ama’s Shea', id.gh, 'paid'],
      ['Ada’s Farm Drinks', id.ng, 'paid']
    ]);
  });

  it('🔴 a cancelled part isn’t paid for; a country paid another way isn’t paid here; a seller whose account went can’t be', async () => {
    const placed = (await place([[id.shito, 1], [id.shea, 2]], { [id.gh]: id.card })).order;
    const orderId = (await orderOf(placed.followToken)).objectId;
    const parts = await partsOf(orderId);
    await ok('movePart', { move: { partId: parts.ama.objectId, to: 'cancelled', reason: 'Out of shea butter this week.' } });
    await confirm(parts.kofi.objectId, 10);
    const start = { pay: { token: placed.followToken, country: id.gh, returnUrl: back(placed.followToken) } };
    await ok('saveSeller', { seller: { id: id.kofi, name: 'Kofi’s Kitchen', country: id.gh, phone: '+000', payoutAccount: '' } });
    await refused('startPayment', start, 'Kofi’s Kitchen can’t be paid by card yet', 'stranger');
    await ok('saveSeller', { seller: { id: id.kofi, name: 'Kofi’s Kitchen', country: id.gh, phone: '+000', payoutAccount: 'ACCT_kofi4hl4xenw' } });
    const started = (await ok<Started>('startPayment', start, 'stranger')).payment;
    const sent = fake.initialized[fake.initialized.length - 1].body;
    expect([sent.amount, sent.split.subaccounts]).toEqual([5500, [{ subaccount: 'ACCT_kofi4hl4xenw', share: 5500 }]]);
    fake.settle(started.reference, 'success');
    expect((await ok<Checked>('checkPayment', { check: { reference: started.reference } }, 'stranger')).result.outcome).toBe('paid');
    const after = await partsOf(orderId);
    expect([after.kofi.status, after.ama.status]).toEqual(['paid', 'cancelled']);

    const atTheDoor = (await place([[id.shito, 1]], { [id.gh]: id.door })).order;
    await confirm((await partsOf((await orderOf(atTheDoor.followToken)).objectId)).kofi.objectId, 0);
    await refused('startPayment', { pay: { token: atTheDoor.followToken, country: id.gh, returnUrl: back(atTheDoor.followToken) } }, 'Nothing in this order is paid by card in Ghana', 'stranger');
  });

  it('a country with no key saved says so; a reference that isn’t ours, or Paystack never saw, is refused', async () => {
    const placed = (await place([[id.tea, 1]], { [id.ke]: id.card })).order;
    const parts = await partsOf((await orderOf(placed.followToken)).objectId);
    await confirm(parts.wanjiru.objectId, 0);
    await refused('startPayment', { pay: { token: placed.followToken, country: id.ke, returnUrl: back(placed.followToken) } }, 'isn’t set up in Kenya', 'stranger');
    await refused('startPayment', { pay: { token: placed.followToken, country: id.ci, returnUrl: back(placed.followToken) } }, 'doesn’t take XOF', 'stranger');
    await refused('startPayment', { pay: { token: placed.followToken, country: id.gh, returnUrl: back(placed.followToken) } }, 'Nothing in this order is paid by card in Ghana', 'stranger');
    await refused('checkPayment', { check: { reference: 'T123456789' } }, 'isn’t a payment for an order here', 'stranger');
    await refused('checkPayment', { check: { reference: 'MK-2026-00001-GHS-000000000000' } }, 'Paystack has no payment with that reference', 'stranger');
    await refused('checkPayment', { check: { reference: 'MK-2026-00001-KES-000000000000' } }, 'isn’t set up in KES', 'stranger');
  });

  // ── step 5: Paystack's webhook ─────────────────────────────────────────────────────────────────────────────────

  /** What Paystack posts (`charge.success`, its payload's fields as far as the check reads them), signed with `key`. */
  const hook = async (slug: string, event: Row, key: string, signature?: string) => {
    const body = JSON.stringify(event);
    const r = await fetch(`${base}/hooks/two004ps/${slug}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': signature ?? signWebhookHmac512(key, body) }, body });
    const text = await r.text();
    answers.push(text);
    return { status: r.status, text };
  };
  const charge = (reference: string, extra: Row = {}) => ({ event: 'charge.success', data: { reference, status: 'success', amount: fake.txs.get(reference)?.body.amount, currency: 'GHS', ...extra } });
  /** An order from Kofi in Ghana, confirmed and started: its reference, settled as `status` at Paystack. */
  const startedOrder = async (status?: string) => {
    const placed = (await place([[id.shito, 1]], { [id.gh]: id.card })).order;
    const orderId = (await orderOf(placed.followToken)).objectId;
    await confirm((await partsOf(orderId)).kofi.objectId, 5);
    const started = (await ok<Started>('startPayment', { pay: { token: placed.followToken, country: id.gh, returnUrl: back(placed.followToken) } }, 'stranger')).payment;
    if (status) fake.settle(started.reference, status);
    return { reference: String(started.reference), orderId };
  };
  const paidHistory = async (orderId: string) => {
    const part = (await partsOf(orderId)).kofi;
    const history = await rows<OrderPartHistory>('OrderPartHistory', { orderPart: ptr('OrderPart', part.objectId) });
    return { status: part.status, paidRows: history.filter((h) => h.changed?.status?.to === 'paid').length };
  };

  it('🔴 nobody calls paystackEvent over HTTP: only its webhook runs it', async () => {
    const { reference } = await startedOrder('success');
    for (const as of ['stranger', 'admin']) {
      const r = await call('paystackEvent', { body: charge(reference) }, as);
      expect([as, r.status === 200]).toEqual([as, false]);
    }
    expect(await rows('Payment', { reference })).toEqual([]);
  });

  it('🔴 the webhook marks paid by the same check, and refuses a wrong signature', async () => {
    const { reference, orderId } = await startedOrder();
    // A wrong signature, and one made with the other business's key: refused, nothing written.
    expect((await hook('paystack-ghs', charge(reference), KEY_GH, 'deadbeef')).status).toBe(401);
    expect((await hook('paystack-ghs', charge(reference), KEY_NG)).status).toBe(401);
    expect((await hook('paystack-ngn', charge(reference), KEY_GH)).status).toBe(401);
    // Paystack hasn't finished it: refused, so Paystack sends it again later; nothing written.
    const early = await hook('paystack-ghs', charge(reference), KEY_GH);
    expect(early.status).not.toBe(200);
    expect(early.text).toMatch(/hasn’t finished this payment yet/);
    expect(await rows('Payment', { reference })).toEqual([]);
    // 🔴 The event's own fields are a hint: it says success, Paystack still says ongoing, so nothing moved.
    expect(await paidHistory(orderId)).toEqual({ status: 'confirmed', paidRows: 0 });

    fake.settle(reference, 'success');
    const paid = await hook('paystack-ghs', charge(reference), KEY_GH);
    expect([paid.status, JSON.parse(paid.text).result.result]).toEqual([200, { outcome: 'paid', reference, wrongAmount: false }]);
    expect((await rows('Payment', { reference })).map((p) => [p.amount, p.outcome])).toEqual([[50, 'paid']]);
    expect(await paidHistory(orderId)).toEqual({ status: 'paid', paidRows: 1 });
    // Paystack sends it again (it retries until it hears 200): answered from the row, nothing more.
    const asked = fake.verifies(reference);
    const again = await hook('paystack-ghs', charge(reference), KEY_GH);
    expect([again.status, JSON.parse(again.text).result.result]).toEqual([200, { outcome: 'paid', reference }]);
    expect(await rows('Payment', { reference })).toHaveLength(1);
    expect(fake.verifies(reference)).toBe(asked);
    // And the buyer's page, back from Paystack after it, reads the same row.
    expect((await ok<Checked>('checkPayment', { check: { reference } }, 'stranger')).result).toEqual({ outcome: 'paid', reference });
  });

  it('the webhook answers, and leaves alone, every event that isn’t a charge for an order here', async () => {
    const before = (await rows('Payment')).length;
    const { reference } = await startedOrder('success');
    for (const event of [{ event: 'transfer.success', data: { reference } }, { event: 'charge.success', data: { reference: 'T123456789' } }, { event: 'charge.success' }, { hello: 'world' }]) {
      const r = await hook('paystack-ghs', event, KEY_GH);
      expect([JSON.stringify(event), r.status, JSON.parse(r.text)]).toEqual([JSON.stringify(event), 200, { result: {} }]);
    }
    expect((await rows('Payment')).length).toBe(before);
  });

  /** The page's check and Paystack's webhook for one reference, both waiting at the stand-in's verify. */
  const bothAsking = async (reference: string) => {
    fake.hold(reference);
    const page = call('checkPayment', { check: { reference } }, 'stranger');
    const webhook = hook('paystack-ghs', charge(reference), KEY_GH);
    for (let i = 0; fake.held(reference) < 2; i++) {
      if (i > 400) throw new Error(`${reference}: ${fake.held(reference)} of 2 asked Paystack`);
      await new Promise((r) => setTimeout(r, 10));
    }
    return { page, webhook };
  };
  const answeredPaid = async ({ page, webhook }: { page: Promise<{ status: number; json: Answer }>; webhook: Promise<{ status: number; text: string }> }) => {
    const [p, w] = await Promise.all([page, webhook]);
    return [p.status, (p.json.result as { result?: { outcome?: string } } | undefined)?.result?.outcome, w.status, JSON.parse(w.text).result?.result?.outcome];
  };

  it('🔴 one of the page and the webhook finishing while the other asks Paystack: the other writes nothing', async () => {
    // Each way round: whichever asked first is answered first, then the other (the order they reach Paystack in
    // is not the spec's to choose, so it plays both).
    for (const which of ['first', 'last'] as const) {
      const { reference, orderId } = await startedOrder('success');
      const both = await bothAsking(reference);
      fake.release(reference, which);
      for (let i = 0; (await rows('OrderPart', { order: ptr('Order', orderId), status: 'paid' })).length < 1; i++) {
        if (i > 400) throw new Error(`${reference}: the first answered never paid`);
        await new Promise((r) => setTimeout(r, 10));
      }
      fake.release(reference, 'all');
      expect([which, await answeredPaid(both)]).toEqual([which, [200, 'paid', 200, 'paid']]);
      expect([which, (await rows('Payment', { reference })).map((p) => p.outcome)]).toEqual([which, ['paid']]);
      expect([which, await paidHistory(orderId)]).toEqual([which, { status: 'paid', paidRows: 1 }]);
    }
  });

  it('🔴 the page and the webhook asking at the same instant: one payment kept, the parts moved once', async () => {
    for (let i = 0; i < 8; i++) {
      const { reference, orderId } = await startedOrder('success');
      const both = await bothAsking(reference);
      fake.release(reference, 'all');
      expect([i, await answeredPaid(both)]).toEqual([i, [200, 'paid', 200, 'paid']]);
      expect([i, await paidHistory(orderId)]).toEqual([i, { status: 'paid', paidRows: 1 }]);
      // The world's rule: a payment's reference is one payment. The store refuses the second row.
      expect([i, (await rows('Payment', { reference })).map((p) => p.outcome)]).toEqual([i, ['paid']]);
    }
  });

  it('🔴 no answer to anyone carried a secret key', () => {
    expect(answers.length).toBeGreaterThan(40);
    expect(answers.filter((a) => a.includes(KEY_GH) || a.includes(KEY_NG) || a.includes('sk_test'))).toEqual([]);
  });
});
