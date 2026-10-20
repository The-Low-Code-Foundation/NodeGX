/**
 * TWO-003 slice 5 — enquire: a buyer with no account messages a seller about a product sold by enquiry; that seller,
 * and only that seller (or the admin), reads it and marks it answered.
 *
 * 🔴 **It runs the SHIPPED functions**, read from `templates/marketplace/components/__cloud__/`, on a backend locked
 * with the template's own `nodegx.security.json`. Everything is made through the functions (the admin by
 * `setUpMarketplace`, the marketplace by slices 1 and 3); the master key only reads back what they wrote.
 *
 * What it proves (TWO-003 §3.5; R10; TWO-001's enquiry rules):
 *
 * - a buyer with no account sends one: a product on sale, sold by enquiry, by a seller who isn't stopped; their name, a
 *   number with its country code, and what they ask, each checked whole (too long is refused, never cut);
 * - 🔴 nothing else becomes an enquiry: a product bought through the basket, one off sale, a stopped seller's, one
 *   that isn't there; and nobody writes an enquiry directly;
 * - 🔴 the seller's staff read the enquiries about their own products and nobody else's; a stranger reads none;
 * - 🔴 marking it answered: its seller's staff (whatever seller they claim) or the admin; it can be unmarked; only
 *   `answeredAt` changes.
 *
 * `TWO003_TEMPLATE` points it at a mutated copy (`two-003-enquire-mutants.test.ts`).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request } from './helpers/http';

jest.setTimeout(90000);

const TEMPLATE = process.env.TWO003_TEMPLATE || path.join(__dirname, '../../../templates/marketplace');
const SETUP_TOKEN = 'setup-token-two003-enquire';
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
  'sendEnquiry',
  'answerEnquiry'
];

interface Answer {
  result?: Record<string, any>;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, any>;

describe('TWO-003 slice 5 — a buyer messages a seller; only that seller reads it and marks it answered', () => {
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
  const refused = async (fn: string, body: Record<string, unknown>, words: string | RegExp, as = 'admin') => {
    const r = await call(fn, body, as);
    expect([fn, r.status === 200, JSON.stringify(r.json)]).toEqual([fn, false, expect.stringMatching(words)]);
  };
  const signIn = async (name: string, email: string, password: string) => {
    const r = await req<{ sessionToken: string }>('POST', '/login', { username: email, password }, {});
    if (r.status !== 200) throw new Error(`sign-in ${name}: ${r.status} ${JSON.stringify(r.json)}`);
    who[name] = { 'x-parse-session-token': r.json.sessionToken };
  };
  const rows = async (collection: string, where: Row = {}, headers: Record<string, string> = master) => {
    const r = await req<{ results: Row[] }>('GET', `/classes/${collection}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt&limit=1000`, undefined, headers);
    return r.status === 200 ? r.json.results : null;
  };
  const row = async (collection: string, objectId: string) => (await req<Row>('GET', `/classes/${collection}/${objectId}`)).json;
  const ask = (productId: string, extra: Row = {}) => ({
    enquiry: { productId, buyerName: 'Kwame Mensah', contact: '+233 24 555 0187', message: 'Is it still for sale? Can I see it on Saturday?', ...extra }
  });
  const answer = (enquiryId: string, answered: unknown, extra: Row = {}) => ({ answer: { enquiryId, answered, ...extra } });
  const enquiriesAbout = async (productId: string) => (await rows('Enquiry', { product: ptr('Product', productId) })) ?? [];

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two003-enquire-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003eq', backendName: 'TWO-003 enquire', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    await ok('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, marketplace: 'Market Square', name: 'Admin', email: 'admin@example.com', password: 'longenough' } }, 'stranger');
    await signIn('admin', 'admin@example.com', 'longenough');

    id.gh = String((await ok('saveCountry', { country: { name: 'Ghana', currency: 'GHS' } })).id);
    id.cars = String((await ok('saveShelf', { shelf: { name: 'Cars' } })).id);
    id.food = String((await ok('saveShelf', { shelf: { name: 'Food and drinks' } })).id);
    id.motors = String((await ok('saveSeller', { seller: { name: 'Ring Road Motors', country: id.gh, whatsapp: '+233 24 555 0300' } })).id);
    id.kofi = String((await ok('saveSeller', { seller: { name: 'Kofi’s Kitchen', country: id.gh, phone: '+233 24 555 0100' } })).id);
    id.dealer = String((await ok('saveSeller', { seller: { name: 'Tema Autos', country: id.gh } })).id);
    id.corolla = String((await ok('saveProduct', { product: { seller: id.motors, name: 'Toyota Corolla 2015', price: 98000, mode: 'enquire', category: id.cars } })).id);
    id.hilux = String((await ok('saveProduct', { product: { seller: id.motors, name: 'Toyota Hilux 2012', price: 120000, mode: 'enquire', category: id.cars } })).id);
    id.van = String((await ok('saveProduct', { product: { seller: id.kofi, name: 'Delivery van', price: 60000, mode: 'enquire', category: id.cars } })).id);
    id.shito = String((await ok('saveProduct', { product: { seller: id.kofi, name: 'Shito pepper sauce, 500 g', price: 45, mode: 'buy', category: id.food } })).id);
    id.civic = String((await ok('saveProduct', { product: { seller: id.dealer, name: 'Honda Civic 2010', price: 70000, mode: 'enquire', category: id.cars } })).id);
    await ok('giveLogin', { login: { sellerId: id.motors, name: 'Motors staff', email: 'motors@example.com', password: 'longenough' } });
    await ok('giveLogin', { login: { sellerId: id.kofi, name: 'Kofi staff', email: 'kofi@example.com', password: 'longenough' } });
    await signIn('motors', 'motors@example.com', 'longenough');
    await signIn('kofi', 'kofi@example.com', 'longenough');
    // The Hilux goes off sale and Tema Autos is stopped: neither can be asked about.
    await ok('takeOffSale', { sale: { productId: id.hilux } }, 'motors');
    await ok('stopSeller', { stop: { sellerId: id.dealer, reason: 'Paperwork not in order' } });
  });

  afterAll(async () => {
    await service?.stop();
  });

  describe('a buyer with no account sends one', () => {
    it('about the Corolla: kept with the product, the name, the number and what they ask; not answered yet', async () => {
      expect((await ok('sendEnquiry', ask(id.corolla), 'stranger')).sent).toEqual({ seller: 'Ring Road Motors' });
      const [q] = await enquiriesAbout(id.corolla);
      id.q1 = q.objectId;
      expect([q.buyerName, q.contact, q.message, q.answeredAt ?? null]).toEqual(['Kwame Mensah', '+233 24 555 0187', 'Is it still for sale? Can I see it on Saturday?', null]);
    });

    it('a number written with 00 for its country code, and words around the edges trimmed', async () => {
      await ok('sendEnquiry', ask(id.corolla, { buyerName: '  Efua Asante ', contact: '0044 20 7946 0000', message: ' Does it have air conditioning? ' }), 'stranger');
      const q = (await enquiriesAbout(id.corolla))[1];
      expect([q.buyerName, q.contact, q.message]).toEqual(['Efua Asante', '0044 20 7946 0000', 'Does it have air conditioning?']);
    });

    it('🔴 each part checked whole: a name, a number with its country code, something asked; too long is refused, not cut', async () => {
      await refused('sendEnquiry', ask(id.corolla, { buyerName: '  ' }), 'who the message is from', 'stranger');
      await refused('sendEnquiry', ask(id.corolla, { buyerName: 'K'.repeat(121) }), '120 characters at most', 'stranger');
      await refused('sendEnquiry', ask(id.corolla, { contact: '024 555 0187' }), 'with its country code', 'stranger');
      await refused('sendEnquiry', ask(id.corolla, { contact: '+233 55' }), 'with its country code', 'stranger');
      await refused('sendEnquiry', ask(id.corolla, { contact: '+233 24 555 0187 or call my brother on +233 20' }), 'with its country code', 'stranger');
      await refused('sendEnquiry', ask(id.corolla, { message: '' }), 'what you’d like to ask', 'stranger');
      await refused('sendEnquiry', ask(id.corolla, { message: 'x'.repeat(2001) }), '2,000 characters at most', 'stranger');
      expect(await enquiriesAbout(id.corolla)).toHaveLength(2);
    });

    it('🔴 only a product on sale, sold by enquiry, by a seller who isn’t stopped', async () => {
      await refused('sendEnquiry', ask(id.shito), 'bought through the basket', 'stranger');
      await refused('sendEnquiry', ask(id.hilux), 'isn’t on sale now', 'stranger');
      await refused('sendEnquiry', ask(id.civic), 'isn’t on sale now', 'stranger');
      await refused('sendEnquiry', ask('nosuchproduct'), 'isn’t on sale now', 'stranger');
      // The Request refuses a parameter that isn't an object before the script runs.
      await refused('sendEnquiry', { enquiry: 'is it for sale?' }, 'expects object', 'stranger');
      expect([...(await enquiriesAbout(id.shito)), ...(await enquiriesAbout(id.hilux)), ...(await enquiriesAbout(id.civic))]).toEqual([]);
    });

    it('🔴 the policy: nobody writes an enquiry directly, not even its seller', async () => {
      for (const as of ['stranger', 'motors', 'admin']) {
        const post = await req('POST', '/classes/Enquiry', { product: ptr('Product', id.corolla), buyerName: 'Direct', contact: '+233 24 000 0000', message: 'hi' }, who[as]);
        expect([as, post.status === 200 || post.status === 201]).toEqual([as, false]);
      }
      expect(await enquiriesAbout(id.corolla)).toHaveLength(2);
    });
  });

  describe('🔴 only its seller reads it', () => {
    beforeAll(async () => {
      await ok('sendEnquiry', ask(id.van, { buyerName: 'Ama Owusu', message: 'Can it carry 500 kg?' }), 'stranger');
    });

    it('Ring Road Motors’ staff read the two about the Corolla, and nothing about Kofi’s van', async () => {
      const seen = (await rows('Enquiry', {}, who.motors)) ?? [];
      expect(seen.map((q) => q.buyerName).sort()).toEqual(['Efua Asante', 'Kwame Mensah']);
      const theirs = (await enquiriesAbout(id.van))[0].objectId;
      expect((await req('GET', `/classes/Enquiry/${theirs}`, undefined, who.motors)).status === 200).toBe(false);
    });

    it('Kofi’s staff read only the van’s; a stranger reads none', async () => {
      expect(((await rows('Enquiry', {}, who.kofi)) ?? []).map((q) => q.buyerName)).toEqual(['Ama Owusu']);
      expect(((await rows('Enquiry', {}, who.stranger)) ?? []).length).toBe(0);
      expect((await req('GET', `/classes/Enquiry/${id.q1}`, undefined, who.stranger)).status === 200).toBe(false);
    });

    it('the admin reads every one', async () => {
      expect(((await rows('Enquiry', {}, who.admin)) ?? []).length).toBe(3);
    });
  });

  describe('marking it answered', () => {
    it('🔴 its seller marks it answered, then not answered yet; only answeredAt changes', async () => {
      const before = await row('Enquiry', id.q1);
      expect((await ok('answerEnquiry', answer(id.q1, true), 'motors')).enquiry).toEqual({ id: id.q1, answered: true });
      const marked = await row('Enquiry', id.q1);
      expect(typeof marked.answeredAt?.iso).toBe('string');
      expect([marked.buyerName, marked.contact, marked.message, marked.product.objectId]).toEqual([before.buyerName, before.contact, before.message, id.corolla]);
      await ok('answerEnquiry', answer(id.q1, false), 'motors');
      expect((await row('Enquiry', id.q1)).answeredAt ?? null).toBe(null);
    });

    it('🔴 another seller’s staff can’t, even claiming to be its seller; and nothing changes', async () => {
      await refused('answerEnquiry', answer(id.q1, true), 'another seller’s product', 'kofi');
      await refused('answerEnquiry', answer(id.q1, true, { sellerId: id.motors, seller: id.motors }), 'another seller’s product', 'kofi');
      expect((await row('Enquiry', id.q1)).answeredAt ?? null).toBe(null);
    });

    it('the policy: a stranger can’t call it; staff can’t write answeredAt directly', async () => {
      expect([401, 403].includes((await call('answerEnquiry', answer(id.q1, true), 'stranger')).status)).toBe(true);
      const put = await req('PUT', `/classes/Enquiry/${id.q1}`, { answeredAt: { __type: 'Date', iso: new Date().toISOString() } }, who.motors);
      expect(put.status === 200).toBe(false);
      expect((await row('Enquiry', id.q1)).answeredAt ?? null).toBe(null);
    });

    it('it says whether, and which: anything but yes or no is refused, and so is an enquiry that isn’t there', async () => {
      await refused('answerEnquiry', answer(id.q1, 'yes'), 'whether it is answered', 'motors');
      await refused('answerEnquiry', answer(id.q1, undefined), 'whether it is answered', 'motors');
      await refused('answerEnquiry', answer('nosuchenquiry', true), 'no such enquiry', 'motors');
      expect((await row('Enquiry', id.q1)).answeredAt ?? null).toBe(null);
    });

    it('the admin marks any seller’s', async () => {
      const van = (await enquiriesAbout(id.van))[0].objectId;
      await ok('answerEnquiry', answer(van, true));
      expect(typeof (await row('Enquiry', van)).answeredAt?.iso).toBe('string');
    });
  });
});
