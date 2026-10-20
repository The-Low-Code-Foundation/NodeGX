/**
 * TWO-003 slice 1 — sellers and the admin, through the marketplace's own cloud functions.
 *
 * 🔴 **It runs the SHIPPED functions.** The bundle is read from `templates/marketplace/components/__cloud__/` (what
 * `npm run template:marketplace` wrote through the door), and the backend is locked with the template's own
 * `nodegx.security.json`. Nobody is made by the harness except through the template's doors: the admin by
 * `setUpMarketplace` against the setup secret, every seller's staff by `giveLogin`. Countries and shelves are seeded
 * with the master key, because the functions that set them are slice 3's.
 *
 * What it proves (TWO-003 AC3, the slice-1 half; the world's rules 1, 4 and 6):
 *
 * - the admin adds a seller, changes it, gives it a login, stops it (with a reason) and brings it back;
 * - a seller's staff add and change their own products, take one off sale and put it back;
 * - 🔴 the policy refuses a seller creating a seller, and the script refuses a seller changing another seller's
 *   product, a product moving seller, a seller's country changing, and any write for a stopped seller;
 * - every change leaves a history row naming who made it;
 * - the setup door opens once, and only with the token.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request } from './helpers/http';

jest.setTimeout(60000);

/** `TWO003_TEMPLATE` points the spec at a copy of the template (a mutant); unset, it is the shipped one. */
const TEMPLATE = process.env.TWO003_TEMPLATE || path.join(__dirname, '../../../templates/marketplace');
const SETUP_TOKEN = 'setup-token-two003';
const FUNCTIONS = ['setUpMarketplace', 'whoAmI', 'saveSeller', 'stopSeller', 'giveLogin', 'saveProduct', 'takeOffSale', 'nameMarketplace', 'helpers/setLoginDisabled'];

interface Answer {
  result?: Record<string, unknown>;
  error?: unknown;
  code?: unknown;
}

describe('TWO-003 slice 1 — sellers and the admin, through the template’s functions', () => {
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) =>
    request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });

  const who: Record<string, Record<string, string>> = { stranger: {} };
  const id: Record<string, string> = {};

  const call = (fn: string, body: Record<string, unknown>, as: string) => req<Answer>('POST', `/functions/${fn}`, body, who[as]);
  const signIn = async (name: string, email: string, password: string) => {
    const r = await req<{ sessionToken: string }>('POST', '/login', { username: email, password }, {});
    if (r.status !== 200) throw new Error(`sign-in ${name}: ${r.status} ${JSON.stringify(r.json)}`);
    who[name] = { 'x-parse-session-token': r.json.sessionToken };
  };
  const row = async (collection: string, objectId: string) => (await req<Record<string, unknown>>('GET', `/classes/${collection}/${objectId}`)).json;
  const historyOf = async (collection: string, field: string, objectId: string) =>
    (
      await req<{ results: Array<Record<string, unknown>> }>(
        'GET',
        `/classes/${collection}History?where=${encodeURIComponent(JSON.stringify({ [field]: ptr(collection, objectId) }))}&order=at`
      )
    ).json.results;
  const refusal = (r: { status: number; json: Answer }) => [r.status, JSON.stringify(r.json)];

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two003-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    const bundle = bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundle));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003', backendName: 'TWO-003 marketplace', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);

    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    for (const [key, data] of [
      ['gh', { name: 'Ghana', currency: 'GHS' }],
      ['ng', { name: 'Nigeria', currency: 'NGN' }]
    ] as const) {
      id[key] = (await req<{ objectId: string }>('POST', '/classes/Country', data)).json.objectId;
    }
    id.food = (await req<{ objectId: string }>('POST', '/classes/Category', { name: 'Food and drinks' })).json.objectId;
    id.phones = (await req<{ objectId: string }>('POST', '/classes/Category', { name: 'Phones and laptops' })).json.objectId;
  });

  afterAll(async () => {
    await service?.stop();
  });

  describe('the first admin', () => {
    it('a wrong token is refused, and makes nobody', async () => {
      const r = await call('setUpMarketplace', { setup: { setupToken: 'nope', email: 'a@example.com', password: 'longenough' } }, 'stranger');
      expect(r.status).not.toBe(200);
      expect((await req<{ results: unknown[] }>('GET', '/classes/Person')).json.results).toEqual([]);
    });

    it('R13: no name, or a name longer than 60, is refused in words, and makes nobody and no marketplace', async () => {
      for (const [marketplace, words] of [
        [undefined, 'The marketplace’s name, as buyers will see it.'],
        ['   ', 'The marketplace’s name, as buyers will see it.'],
        ['M'.repeat(61), 'A name of 60 characters or fewer.']
      ] as const) {
        const r = await call('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, ...(marketplace === undefined ? {} : { marketplace }), name: 'Admin', email: 'admin@example.com', password: 'longenough' } }, 'stranger');
        expect(refusal(r)).toEqual([400, expect.stringContaining(words)]);
      }
      expect((await req<{ results: unknown[] }>('GET', '/classes/Person')).json.results).toEqual([]);
      expect((await req<{ results: unknown[] }>('GET', '/classes/Marketplace')).json.results).toEqual([]);
      expect((await req('POST', '/login', { username: 'admin@example.com', password: 'longenough' }, {})).status).not.toBe(200);
    });

    it('P112-OWN021-SAMEEMAIL: an email that already has an account (the admin app’s) is refused, saying so, and makes nothing', async () => {
      // The backend admin app's first account, made with the builder's own email before they set the app up.
      expect((await req('POST', '/users', { username: 'builder@example.com', email: 'builder@example.com', password: 'admin-app-pw' })).status).toBe(201);
      const r = await call('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, marketplace: 'Market Square', name: 'Builder', email: 'Builder@Example.com', password: 'longenough' } }, 'stranger');
      expect(refusal(r)).toEqual([400, expect.stringContaining('This backend already has an account with that email.')]);
      expect((await req<{ results: unknown[] }>('GET', '/classes/Person')).json.results).toEqual([]);
      expect((await req<{ results: unknown[] }>('GET', '/classes/Marketplace')).json.results).toEqual([]);
      expect((await req('POST', '/login', { username: 'builder@example.com', password: 'longenough' }, {})).status).not.toBe(200);
    });

    it('the right token makes the admin: a sign-in, role:admin, a Person row and its history', async () => {
      const r = await call('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, marketplace: 'Market Square', name: 'Admin', email: 'Admin@Example.com', password: 'longenough' } }, 'stranger');
      expect(refusal(r)).toEqual([200, expect.stringContaining('personId')]);
      id.adminPerson = String(r.json.result?.personId);
      await signIn('admin', 'admin@example.com', 'longenough');
      const me = await call('whoAmI', {}, 'admin');
      expect(me.json.result?.me).toEqual({ personId: id.adminPerson, name: 'Admin', role: 'admin' });
      expect((await historyOf('Person', 'person', id.adminPerson)).length).toBe(1);
    });

    it('R13: and names the marketplace, once, with its history by the admin; anyone reads the name, nobody writes it', async () => {
      const rows = (await req<{ results: Array<Record<string, unknown>> }>('GET', '/classes/Marketplace')).json.results;
      expect(rows.map((r) => r.name)).toEqual(['Market Square']);
      const h = await historyOf('Marketplace', 'marketplace', String(rows[0].objectId));
      expect(h.map((r) => r.changed)).toEqual([{ name: { from: null, to: 'Market Square' } }]);
      const adminLogin = (await row('Person', id.adminPerson)).login as { objectId: string };
      expect((h[0].who as { objectId: string }).objectId).toBe(adminLogin.objectId);
      const seen = await req<{ results: Array<Record<string, unknown>> }>('GET', '/classes/Marketplace', undefined, who.stranger);
      expect([seen.status, seen.json.results.map((r) => r.name)]).toEqual([200, ['Market Square']]);
      expect((await req('PUT', `/classes/Marketplace/${rows[0].objectId}`, { name: 'Taken over' }, who.admin)).status).toBe(403);
      expect((await req('POST', '/classes/Marketplace', { name: 'A second one' }, who.stranger)).status).toBe(403);
    });

    it('the door opens once: the same token a second time is refused', async () => {
      const r = await call('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, marketplace: 'Another name', email: 'second@example.com', password: 'longenough' } }, 'stranger');
      expect(r.status).not.toBe(200);
      expect((await req<{ results: Array<Record<string, unknown>> }>('GET', '/classes/Marketplace')).json.results.map((x) => x.name)).toEqual(['Market Square']);
      expect((await req('POST', '/login', { username: 'second@example.com', password: 'longenough' }, {})).status).not.toBe(200);
    });

    const marketplace = async () => (await req<{ results: Array<Record<string, unknown>> }>('GET', '/classes/Marketplace')).json.results;

    it('s19: the admin renames the marketplace: the one row changes, its history says from, to and who', async () => {
      const r = await call('nameMarketplace', { marketplace: { name: '  Market Square Accra  ' } }, 'admin');
      expect(refusal(r)).toEqual([200, expect.stringContaining('Market Square Accra')]);
      const rows = await marketplace();
      expect(rows.map((x) => x.name)).toEqual(['Market Square Accra']);
      const h = await historyOf('Marketplace', 'marketplace', String(rows[0].objectId));
      expect(h.map((x) => x.changed)).toEqual([{ name: { from: null, to: 'Market Square' } }, { name: { from: 'Market Square', to: 'Market Square Accra' } }]);
      const adminLogin = (await row('Person', id.adminPerson)).login as { objectId: string };
      expect((h[1].who as { objectId: string }).objectId).toBe(adminLogin.objectId);
    });

    it('s19: the same name again changes nothing and writes no history', async () => {
      expect((await call('nameMarketplace', { marketplace: { name: 'Market Square Accra' } }, 'admin')).status).toBe(200);
      const rows = await marketplace();
      expect((await historyOf('Marketplace', 'marketplace', String(rows[0].objectId))).length).toBe(2);
    });

    it('s19: an empty name or one longer than 60 is refused in words, never cut; a stranger is refused', async () => {
      for (const [name, words] of [
        ['   ', 'as buyers will see it'],
        ['x'.repeat(61), '60 characters or fewer']
      ] as const) {
        const r = await call('nameMarketplace', { marketplace: { name } }, 'admin');
        expect(refusal(r)).toEqual([expect.not.stringMatching(/^200$/), expect.stringContaining(words)]);
      }
      expect((await call('nameMarketplace', { marketplace: { name: 'x'.repeat(60) } }, 'stranger')).status).not.toBe(200);
      expect((await marketplace()).map((x) => x.name)).toEqual(['Market Square Accra']);
    });
  });

  describe('the admin and the sellers', () => {
    it('adds two sellers in two countries, each with a history row', async () => {
      for (const [key, name, country] of [
        ['kofi', 'Kofi’s Kitchen', 'gh'],
        ['ada', 'Ada Phones', 'ng']
      ] as const) {
        const r = await call('saveSeller', { seller: { name, country: id[country], phone: '+000', payoutAccount: `ACCT_${key}` } }, 'admin');
        expect(refusal(r)).toEqual([200, expect.stringContaining('"id"')]);
        id[key] = String(r.json.result?.id);
        const s = await row('Seller', id[key]);
        expect([s.name, (s.country as { objectId: string }).objectId, s.endedAt ?? null]).toEqual([name, id[country], null]);
        const h = await historyOf('Seller', 'seller', id[key]);
        expect(h.length).toBe(1);
        expect(h[0].changed).toMatchObject({ name: { from: null, to: name }, country: { from: null, to: id[country] } });
      }
    });

    it('changes a seller, and the history says what changed and who', async () => {
      const r = await call('saveSeller', { seller: { id: id.kofi, name: 'Kofi’s Kitchen', story: 'Shito since 1998', phone: '+000', payoutAccount: 'ACCT_kofi' } }, 'admin');
      expect(r.status).toBe(200);
      const h = await historyOf('Seller', 'seller', id.kofi);
      expect(h.length).toBe(2);
      expect(h[1].changed).toEqual({ story: { from: null, to: 'Shito since 1998' } });
      expect((h[1].who as { objectId: string }).objectId).toBeTruthy();
    });

    it('🔴 refuses to move a seller to another country', async () => {
      const r = await call('saveSeller', { seller: { id: id.kofi, name: 'Kofi’s Kitchen', country: id.ng } }, 'admin');
      expect(refusal(r)).toEqual([expect.not.stringMatching(/^200$/), expect.stringContaining('country')]);
      expect(((await row('Seller', id.kofi)).country as { objectId: string }).objectId).toBe(id.gh);
    });

    it('🔴 a logo is a web address or nothing: a script or a data address is dropped', async () => {
      const kofi = { id: id.kofi, name: 'Kofi’s Kitchen', story: 'Shito since 1998', phone: '+000', payoutAccount: 'ACCT_kofi' };
      const logo = { name: 'kofi.png', url: `${base}/files/kofi.png` };
      for (const url of ['javascript:alert(1)', 'data:image/png;base64,AAAA']) {
        expect((await call('saveSeller', { seller: { ...kofi, logo: { name: 'x', url } } }, 'admin')).status).toBe(200);
        expect((await row('Seller', id.kofi)).logo ?? null).toBeNull();
      }
      expect((await call('saveSeller', { seller: { ...kofi, logo } }, 'admin')).status).toBe(200);
      expect((await row('Seller', id.kofi)).logo).toMatchObject(logo);
    });

    it('gives each seller a login: a sign-in, role:staff, a Person row for that seller', async () => {
      for (const key of ['kofi', 'ada']) {
        const r = await call('giveLogin', { login: { sellerId: id[key], name: `${key} staff`, email: `${key}@example.com`, password: 'longenough' } }, 'admin');
        expect(refusal(r)).toEqual([200, expect.stringContaining('personId')]);
        await signIn(key, `${key}@example.com`, 'longenough');
        const me = await call('whoAmI', {}, key);
        expect(me.json.result?.me).toMatchObject({ role: 'seller', seller: { id: id[key], stopped: false } });
      }
    });

    it('🔴 refuses a second login with an email already in use', async () => {
      const r = await call('giveLogin', { login: { sellerId: id.ada, email: 'kofi@example.com', password: 'longenough' } }, 'admin');
      expect(r.status).not.toBe(200);
    });

    it('s19: a seller’s staff can’t rename the marketplace', async () => {
      expect((await call('nameMarketplace', { marketplace: { name: 'Kofi’s Market' } }, 'kofi')).status).not.toBe(200);
      expect((await req<{ results: Array<Record<string, unknown>> }>('GET', '/classes/Marketplace')).json.results.map((x) => x.name)).toEqual(['Market Square Accra']);
    });
  });

  describe('a seller’s staff and their products', () => {
    it('adds their own product: the seller is theirs, whatever they sent', async () => {
      const r = await call('saveProduct', { product: { name: 'Shito', price: 40, mode: 'buy', category: id.food, seller: id.ada } }, 'kofi');
      expect(refusal(r)).toEqual([200, expect.stringContaining('"id"')]);
      id.shito = String(r.json.result?.id);
      const p = await row('Product', id.shito);
      expect([(p.seller as { objectId: string }).objectId, p.price, p.mode]).toEqual([id.kofi, 40, 'buy']);
      expect((await historyOf('Product', 'product', id.shito)).length).toBe(1);
    });

    it('changes it, and the history says only what changed', async () => {
      const r = await call('saveProduct', { product: { id: id.shito, name: 'Shito', price: 45, mode: 'buy', category: id.food } }, 'kofi');
      expect(r.status).toBe(200);
      const h = await historyOf('Product', 'product', id.shito);
      expect(h[h.length - 1].changed).toEqual({ price: { from: 40, to: 45 } });
    });

    it('🔴 keeps its photos when a change sends none, replaces them when it sends a list, at most 8, web addresses only', async () => {
      const shito = { id: id.shito, name: 'Shito', price: 45, mode: 'buy', category: id.food };
      const shot = { name: 'shito.jpg', url: `${base}/files/shito.jpg` };
      const junk = [{ name: 'x', url: 'javascript:alert(1)' }, { name: 'y', url: 'data:image/png;base64,AAAA' }, 'not a photo', null];
      expect((await call('saveProduct', { product: { ...shito, photos: [shot, ...junk] } }, 'kofi')).status).toBe(200);
      expect((await row('Product', id.shito)).photos).toEqual([shot]);
      expect((await call('saveProduct', { product: shito }, 'kofi')).status).toBe(200);
      expect((await row('Product', id.shito)).photos).toEqual([shot]);
      const ten = Array.from({ length: 10 }, (_, i) => ({ name: `p${i}.jpg`, url: `${base}/files/p${i}.jpg` }));
      expect((await call('saveProduct', { product: { ...shito, photos: ten } }, 'kofi')).status).toBe(200);
      expect((await row('Product', id.shito)).photos).toEqual(ten.slice(0, 8));
      expect((await call('saveProduct', { product: { ...shito, photos: [] } }, 'kofi')).status).toBe(200);
      expect((await row('Product', id.shito)).photos).toEqual([]);
    });

    it('🔴 AC3: a seller can’t change another seller’s product', async () => {
      const r = await call('saveProduct', { product: { id: id.shito, name: 'Mine now', price: 1, category: id.food } }, 'ada');
      expect(refusal(r)).toEqual([expect.not.stringMatching(/^200$/), expect.stringContaining('another seller')]);
      expect((await row('Product', id.shito)).name).toBe('Shito');
    });

    it('🔴 AC3: a seller can’t take another seller’s product off sale', async () => {
      const r = await call('takeOffSale', { sale: { productId: id.shito } }, 'ada');
      expect(r.status).not.toBe(200);
      expect((await row('Product', id.shito)).endedAt ?? null).toBeNull();
    });

    it('🔴 AC3: a seller can’t create a seller, stop one or give a login (the policy refuses the call)', async () => {
      for (const [fn, body] of [
        ['saveSeller', { seller: { name: 'Fake', country: id.gh } }],
        ['stopSeller', { stop: { sellerId: id.ada, reason: 'rival' } }],
        ['giveLogin', { login: { sellerId: id.kofi, email: 'x@example.com', password: 'longenough' } }]
      ] as const) {
        const r = await call(fn, body, 'kofi');
        expect([fn, r.status]).toEqual([fn, 403]);
      }
      expect((await req<{ results: unknown[] }>('GET', '/classes/Seller')).json.results.length).toBe(2);
    });

    it('🔴 a stranger can call nothing but the setup door: the policy refuses before any script runs', async () => {
      for (const [fn, body] of [
        ['whoAmI', {}],
        ['saveSeller', { seller: { name: 'Fake', country: id.gh } }],
        ['saveProduct', { product: { name: 'Fake', price: 1, category: id.food, seller: id.kofi } }],
        ['takeOffSale', { sale: { productId: id.shito } }]
      ] as const) {
        const r = await call(fn, body, 'stranger');
        expect([fn, [401, 403].includes(r.status)]).toEqual([fn, true]);
      }
    });

    it('takes a product off sale and puts it back; nothing is deleted', async () => {
      expect((await call('takeOffSale', { sale: { productId: id.shito } }, 'kofi')).status).toBe(200);
      expect((await row('Product', id.shito)).endedAt).toBeTruthy();
      expect((await call('takeOffSale', { sale: { productId: id.shito, off: false } }, 'kofi')).status).toBe(200);
      expect((await row('Product', id.shito)).endedAt ?? null).toBeNull();
      const h = await historyOf('Product', 'product', id.shito);
      expect(h.slice(-2).map((x) => x.changed)).toEqual([{ onSale: { from: true, to: false } }, { onSale: { from: false, to: true } }]);
    });

    it('the admin changes any seller’s product, and is named in its history', async () => {
      const r = await call('saveProduct', { product: { id: id.shito, name: 'Shito (hot)', price: 45, mode: 'buy', category: id.food } }, 'admin');
      expect(r.status).toBe(200);
      const r2 = await call('saveProduct', { product: { name: 'Phone X', price: 900000, mode: 'buy', category: id.phones, seller: id.ada } }, 'admin');
      expect(r2.status).toBe(200);
      expect(((await row('Product', String(r2.json.result?.id))).seller as { objectId: string }).objectId).toBe(id.ada);
    });

    it('🔴 a product can’t move to another seller, even by the admin', async () => {
      const r = await call('saveProduct', { product: { id: id.shito, name: 'Shito (hot)', price: 45, mode: 'buy', category: id.food, seller: id.ada } }, 'admin');
      expect(refusal(r)).toEqual([expect.not.stringMatching(/^200$/), expect.stringContaining('another seller')]);
      expect(((await row('Product', id.shito)).seller as { objectId: string }).objectId).toBe(id.kofi);
    });

    it('🔴 refuses a product with no name, a negative price, or no shelf', async () => {
      for (const product of [
        { name: '', price: 1, category: id.food },
        { name: 'X', price: -1, category: id.food },
        { name: 'X', price: 1 }
      ]) {
        expect((await call('saveProduct', { product }, 'kofi')).status).not.toBe(200);
      }
    });
  });

  describe('stopping a seller (rule 4: stopped, never deleted)', () => {
    it('🔴 refuses to stop a seller without a reason', async () => {
      expect((await call('stopSeller', { stop: { sellerId: id.kofi } }, 'admin')).status).not.toBe(200);
    });

    it('stops it with a reason, and its logins stop: no new sign-in, and the session it had is refused', async () => {
      const before = who.kofi;
      expect((await call('stopSeller', { stop: { sellerId: id.kofi, reason: 'paperwork missing' } }, 'admin')).status).toBe(200);
      const s = await row('Seller', id.kofi);
      expect([Boolean(s.endedAt), s.stoppedReason]).toEqual([true, 'paperwork missing']);
      expect((await req('POST', '/login', { username: 'kofi@example.com', password: 'longenough' }, {})).status).not.toBe(200);
      const r = await call('saveProduct', { product: { id: id.shito, name: 'Shito', price: 1, category: id.food } }, 'kofi');
      // The session it already had is refused as no session at all (the backend's standard answer, code 209).
      expect([r.status, (r.json as { code?: number }).code]).toEqual([400, 209]);
      expect((await req('GET', '/users/me', undefined, before)).status).not.toBe(200);
      // The other seller's login is untouched.
      expect((await call('whoAmI', {}, 'ada')).status).toBe(200);
      expect((await row('Product', id.shito)).price).toBe(45);
    });

    it('🔴 nobody writes for a stopped seller, the admin included, until it is brought back', async () => {
      const r = await call('saveProduct', { product: { id: id.shito, name: 'Shito', price: 1, category: id.food } }, 'admin');
      expect(refusal(r)).toEqual([expect.not.stringMatching(/^200$/), expect.stringContaining('stopped')]);
      const off = await call('takeOffSale', { sale: { productId: id.shito } }, 'admin');
      expect(refusal(off)).toEqual([expect.not.stringMatching(/^200$/), expect.stringContaining('stopped')]);
      expect((await row('Product', id.shito)).endedAt ?? null).toBeNull();
    });

    it('stops a seller nobody was given a login for, and answers (nothing to switch is still done)', async () => {
      const made = await call('saveSeller', { seller: { name: 'Quiet Shop', country: id.gh } }, 'admin');
      expect(made.status).toBe(200);
      const r = await call('stopSeller', { stop: { sellerId: String(made.json.result?.id), reason: 'never opened' } }, 'admin');
      expect(r.status).toBe(200);
    });

    it('🔴 a login made for a stopped seller is refused', async () => {
      expect((await call('giveLogin', { login: { sellerId: id.kofi, email: 'new@example.com', password: 'longenough' } }, 'admin')).status).not.toBe(200);
    });

    it('the reason is the admin’s alone: the public and its own staff don’t read it', async () => {
      const asPublic = await req<Record<string, unknown>>('GET', `/classes/Seller/${id.kofi}`, undefined, {});
      expect([asPublic.status, 'stoppedReason' in asPublic.json]).toEqual([200, false]);
      const asStaff = await req<Record<string, unknown>>('GET', `/classes/Seller/${id.kofi}`, undefined, who.kofi);
      expect('stoppedReason' in asStaff.json).toBe(false);
    });

    it('brings it back: the reason goes, its products can change again, and the history holds both', async () => {
      expect((await call('stopSeller', { stop: { sellerId: id.kofi, stopped: false } }, 'admin')).status).toBe(200);
      const s = await row('Seller', id.kofi);
      expect([s.endedAt ?? null, s.stoppedReason ?? null]).toEqual([null, null]);
      await signIn('kofi', 'kofi@example.com', 'longenough');
      expect((await call('whoAmI', {}, 'kofi')).json.result?.me).toMatchObject({ seller: { id: id.kofi, stopped: false } });
      expect((await call('saveProduct', { product: { id: id.shito, name: 'Shito', price: 45, mode: 'buy', category: id.food } }, 'kofi')).status).toBe(200);
      const h = await historyOf('Seller', 'seller', id.kofi);
      expect(h.slice(-2).map((x) => x.changed)).toEqual([
        { stopped: { from: false, to: true }, stoppedReason: { from: null, to: 'paperwork missing' } },
        { stopped: { from: true, to: false } }
      ]);
    });
  });
});
