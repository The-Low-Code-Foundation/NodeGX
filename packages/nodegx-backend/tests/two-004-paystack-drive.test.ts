/**
 * TWO-004 — paying through Paystack, DRIVEN: the shipped template rendered headless by the real viewer, against a real
 * backend locked with the template's own policy, and a stand-in for Paystack (`helpers/fake-paystack.ts`) the
 * backend's `PAYSTACK_API_URL` points at, at a phone (390 px) and a 10" tablet (1024×640).
 *
 * The admin turns Paystack on in Ghana and Nigeria on the Ways to pay page; the checkout offers it; the order is placed
 * by `placeOrder` (slice 3's drive places one through the pages) and confirmed by `movePart` (slice 4's drive confirms
 * through the pages). Then the pages: the buyer's order page offers no button until every Ghana seller has confirmed,
 * then one for both; Pay opens the stand-in's checkout page (another origin, as Paystack's is); paying there sends the
 * buyer back to the order with the reference, which the page checks; the parts say paid, and so does the store.
 *
 * Phone: the first try is declined at the stand-in, the page says so, the second pays. Tablet: a seller's Orders page
 * shows a card payment waiting with no "The buyer has paid" button, and Nigeria is paid on its own.
 *
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 * The real round trip, with Paystack's test keys, is step 4's.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { FakePaystack, startFakePaystack } from './helpers/fake-paystack';
import { request, type ParsePointer, type ParseRecord } from './helpers/http';
import { clickButton, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(420000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/marketplace');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const SETUP_TOKEN = 'setup-token-two004-paystack-drive';
const KEY_GH = 'sk_test_drive_ghana';
const KEY_NG = 'sk_test_drive_nigeria';

const cloudKeys = (dir: string): string[] => {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(dir, 'components', rel), { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const r = path.join(rel, e.name);
      if (fs.existsSync(path.join(dir, 'components', r, 'component.json'))) out.push(r);
      walk(r);
    }
  };
  walk('__cloud__');
  return out;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bodyText = async (page: RenderedPage) => String(await page.evaluate('document.body ? document.body.innerText : ""'));
async function until(page: RenderedPage, what: string, ok: (text: string) => boolean, ms = 15000): Promise<string> {
  const end = Date.now() + ms;
  let text = '';
  while (Date.now() < end) {
    try {
      text = await bodyText(page);
      if (ok(text)) return text;
    } catch {
      // between two documents (Paystack and back): ask again
    }
    await wait(300);
  }
  throw new Error(`${what}: never happened. The page said:\n${text.slice(0, 2500)}`);
}
const where = async (page: RenderedPage) => String(await page.evaluate('location.origin + location.pathname + location.search'));
/** The buttons on the page, by their words. */
const buttons = async (page: RenderedPage) => JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('button'), function (b) { return (b.innerText || '').trim(); }))`))) as string[];

/** Tick or untick the checkbox labelled `country` inside the one card that names `way`, the way a person's click does. */
async function toggle(page: RenderedPage, way: string, country: string, want: boolean): Promise<void> {
  const r = String(
    await page.evaluate(`(function () {
      var boxes = Array.prototype.slice.call(document.querySelectorAll('input[type=checkbox]'));
      var hits = boxes.filter(function (b) {
        var lbl = b.closest('label') || document.querySelector('label[for="' + b.id + '"]');
        if (!lbl || (lbl.textContent || '').trim() !== ${JSON.stringify(country)}) return false;
        for (var el = lbl.parentElement; el; el = el.parentElement) {
          var t = el.innerText || '';
          if (t.indexOf('What it tells buyers') < 0) continue;
          return t.indexOf(${JSON.stringify(way)}) === 0 || t.split('\\n')[0].trim() === ${JSON.stringify(way)};
        }
        return false;
      });
      if (hits.length !== 1) return 'hits:' + hits.length + ' of ' + boxes.length;
      if (hits[0].checked === ${want}) return 'already';
      hits[0].scrollIntoView({ block: 'center' });
      hits[0].click();
      return 'clicked';
    })()`)
  );
  if (r !== 'clicked' && r !== 'already') throw new Error(`toggle ${way} / ${country}: ${r}`);
}
const ticked = async (page: RenderedPage, way: string, country: string) =>
  String(
    await page.evaluate(`(function () {
      var boxes = Array.prototype.slice.call(document.querySelectorAll('input[type=checkbox]'));
      var b = boxes.filter(function (b) {
        var lbl = b.closest('label') || document.querySelector('label[for="' + b.id + '"]');
        if (!lbl || (lbl.textContent || '').trim() !== ${JSON.stringify(country)}) return false;
        for (var el = lbl.parentElement; el; el = el.parentElement) { var t = el.innerText || ''; if (t.indexOf('What it tells buyers') >= 0) return t.split('\\n')[0].trim() === ${JSON.stringify(way)}; }
        return false;
      })[0];
      return b ? String(b.checked) : 'none';
    })()`)
  );

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 800, mobile: true },
  { name: 'tablet', width: 1024, height: 640, mobile: false }
];

async function shot(page: RenderedPage, name: string): Promise<void> {
  if (process.env.TWO003_SHOTS === '0') return;
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SHOTS, `two004-${name}.png`), Buffer.from(r.data, 'base64'));
}
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

describe('TWO-004 — a buyer pays a country’s sellers through Paystack and comes back paid, driven', () => {
  let service: BackendService;
  let fake: FakePaystack;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  let admin: Record<string, string> = {};
  const errors: Array<{ where: string; errors: string[] }> = [];
  const overflow: Array<[string, number]> = [];
  const ids: Record<string, string> = {};

  type Row = Record<string, unknown>;
  /** An OrderPart row and an OrderPartHistory row, as far as this drive reads them. */
  interface OrderPart extends ParseRecord {
    seller: ParsePointer;
  }
  interface OrderPartHistory extends ParseRecord {
    changed?: { status?: { to?: string } };
  }
  const fnCall = async (fn: string, body: Record<string, unknown>, headers: Record<string, string> = admin) => {
    const r = await request<{ result?: Row }>(base, 'POST', `/functions/${fn}`, { body, headers });
    if (r.status !== 200) throw new Error(`${fn}: ${r.status} ${r.text}`);
    return r.json.result ?? {};
  };
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}) =>
    (await request<{ results: T[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt&limit=1000`, { headers: master })).json.results;
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const partsOf = async (number: string) => {
    const [o] = await rows('Order', { number });
    const name: Record<string, string> = { [ids.kofi]: 'kofi', [ids.ama]: 'ama', [ids.ada]: 'ada' };
    return Object.fromEntries((await rows<OrderPart>('OrderPart', { order: ptr('Order', o.objectId) })).map((p) => [name[p.seller.objectId], p]));
  };

  beforeAll(async () => {
    fake = await startFakePaystack([KEY_GH, KEY_NG]);
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two004-paystack-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, cloudKeys(TEMPLATE))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(
      path.join(dataDir, 'secrets.json'),
      JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN, PAYSTACK_SECRET_KEY_GHS: KEY_GH, PAYSTACK_SECRET_KEY_NGN: KEY_NG, PAYSTACK_API_URL: fake.url } })
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'two004paystack', backendName: 'TWO-004 Paystack drive', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    port = started.listen.port;
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await request(base, 'POST', '/admin/schema', { body: push, headers: master });
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    await fnCall('setUpMarketplace', { setup: { setupToken: SETUP_TOKEN, marketplace: 'Market Square', name: 'Admin', email: 'admin@example.com', password: 'longenough' } }, {});
    const login = await request<{ sessionToken: string }>(base, 'POST', '/login', { body: { username: 'admin@example.com', password: 'longenough' } });
    admin = { 'x-parse-session-token': login.json.sessionToken };

    ids.gh = String((await fnCall('saveCountry', { country: { name: 'Ghana', currency: 'GHS' } })).id);
    ids.ng = String((await fnCall('saveCountry', { country: { name: 'Nigeria', currency: 'NGN' } })).id);
    await fnCall('saveRates', { rates: { rates: [{ currency: 'GHS', value: 1 }, { currency: 'NGN', value: 0.0091 }] } });
    const shelf = String((await fnCall('saveShelf', { shelf: { name: 'Food and drinks' } })).id);
    await fnCall('saveWayToPay', { way: { method: 'on-delivery', countries: [ids.gh, ids.ng] } });
    ids.kofi = String((await fnCall('saveSeller', { seller: { name: 'Kofi’s Kitchen', country: ids.gh, phone: '+233 24 555 0100', payoutAccount: 'ACCT_kofi4hl4xenw' } })).id);
    ids.ama = String((await fnCall('saveSeller', { seller: { name: 'Ama’s Shea', country: ids.gh, phone: '+233 24 555 0200', payoutAccount: 'ACCT_ama8f4s1eq7' } })).id);
    ids.ada = String((await fnCall('saveSeller', { seller: { name: 'Ada’s Farm Drinks', country: ids.ng, phone: '+234 80 555 0101', payoutAccount: 'ACCT_ada2b7c9d0e' } })).id);
    ids.shito = String((await fnCall('saveProduct', { product: { seller: ids.kofi, name: 'Shito pepper sauce, 500 g', price: 45, mode: 'buy', category: shelf } })).id);
    ids.shea = String((await fnCall('saveProduct', { product: { seller: ids.ama, name: 'Shea butter, 250 g', price: 30, mode: 'buy', category: shelf } })).id);
    ids.zobo = String((await fnCall('saveProduct', { product: { seller: ids.ada, name: 'Zobo drink, 6 bottles', price: 6800, mode: 'buy', category: shelf } })).id);
    await fnCall('giveLogin', { login: { sellerId: ids.kofi, name: 'Kofi', email: 'kofi@example.com', password: 'longenough' } });
    // Step 5: Paystack's webhook, one per business, as a builder sets it up; the stand-in posts to it when a buyer pays.
    for (const [slug, key] of [['paystack-ghs', KEY_GH], ['paystack-ngn', KEY_NG]]) {
      const hook = await request(base, 'POST', '/admin/triggers', { body: { type: 'webhook', name: slug, target: { kind: 'function', name: 'paystackEvent' }, webhook: { slug, scheme: 'hmac-sha512' }, secret: key }, headers: master });
      if (hook.status !== 201) throw new Error(`${slug}: ${hook.status} ${JSON.stringify(hook.json)}`);
      fake.webhookTo(key, `${base}/hooks/two004paystack/${slug}`);
    }

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two004-paystack-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two004paystack', port);
  });

  afterAll(async () => {
    await service?.stop();
    await fake?.close();
  });

  it('🔴 one payment per country, after every seller there confirms; paid only once Paystack says so', async () => {
    for (const vp of VIEWPORTS) {
      const first = vp.name === 'phone';
      await withRenderedPage({ projectDir, backendPort: port }, async (page) => {
        await page.setViewport(vp);
        const look = async (name: string, allowed: RegExp | null = null) => {
          const seen = [...page.consoleErrors];
          page.consoleErrors.length = 0;
          errors.push({ where: `${vp.name} ${name}`, errors: allowed ? seen.filter((e) => !allowed.test(e)) : seen });
          overflow.push([`${vp.name} ${name}`, await overflowX(page)]);
          await shot(page, `${vp.name}-pay-${name}`);
        };
        const signInAs = async (email: string) => {
          await page.navigate('/sign-in');
          await until(page, 'the sign-in page', (x) => x.includes('Buyers don’t need an account'));
          await fill(page, 'Email', email);
          await fill(page, 'Password', 'longenough');
          await clickButton(page, 'Sign in');
        };

        // ── phone: the admin turns Paystack on in Ghana and Nigeria, on the page
        if (first) {
          await signInAs('admin@example.com');
          await until(page, 'the admin lands on Sellers', (x) => x.includes('Add a seller'));
          await page.navigate('/admin/ways-to-pay');
          await until(page, 'the ways to pay', (x) => x.includes('Card or mobile money') && x.includes('PAYSTACK_SECRET_KEY_GHS'));
          for (const country of ['Ghana', 'Nigeria']) {
            await toggle(page, 'Card or mobile money', country, true);
            await wait(900);
          }
          await page.navigate('/admin/ways-to-pay');
          await until(page, 'the ways to pay again', (x) => x.includes('Card or mobile money'));
          await wait(600);
          expect([await ticked(page, 'Card or mobile money', 'Ghana'), await ticked(page, 'Card or mobile money', 'Nigeria')]).toEqual(['true', 'true']);
          await page.evaluate(`(function () { var t = Array.prototype.filter.call(document.querySelectorAll('div'), function (d) { return (d.innerText || '').indexOf('Card or mobile money') === 0; }).pop(); if (t) t.scrollIntoView({ block: 'start' }); })()`);
          await wait(300);
          await look('admin-ways');
          ids.card = (await rows('WayToPay', { method: 'paystack' }))[0].objectId;
          await clickButton(page, 'Sign out');
          await until(page, 'signed out', (x) => x.includes('Buyers don’t need an account'));

          // ── the checkout offers it, and asks for an email when it is picked
          await page.evaluate(`localStorage.setItem('mk-basket', JSON.stringify([{ productId: ${JSON.stringify(ids.shito)}, quantity: 1 }]))`);
          await page.navigate('/checkout');
          await until(page, 'the checkout offers card', (x) => x.includes('How you’ll pay in Ghana') && x.includes('Card or mobile money') && x.includes('needed to pay by card'));
          await look('checkout');
          await page.evaluate(`localStorage.removeItem('mk-basket')`);
        }

        const order = (
          await fnCall(
            'placeOrder',
            {
              order: {
                buyerName: first ? 'Efua Asante' : 'Kwame Boateng',
                phone: '+233 20 555 0187',
                email: first ? 'efua@example.com' : 'kwame@example.com',
                address: 'House 14, Osu, Accra',
                country: ids.gh,
                currency: 'GHS',
                lines: [
                  { productId: ids.shito, quantity: 2 },
                  { productId: ids.shea, quantity: 1 },
                  ...(first ? [] : [{ productId: ids.zobo, quantity: 1 }])
                ],
                pay: { [ids.gh]: ids.card, [ids.ng]: ids.card }
              }
            },
            {}
          )
        ).order as { number: string; followToken: string };
        const orderUrl = `/order/${order.followToken}`;
        const opened = (what: string, ok: (t: string) => boolean) => until(page, `the buyer sees ${what}`, (x) => x.includes(`Order ${order.number}`) && ok(x));

        // ── the buyer's page: a box for Ghana, no button while a Ghana seller hasn't confirmed
        let parts = await partsOf(order.number);
        await fnCall('movePart', { move: { partId: parts.kofi.objectId, to: 'confirmed', deliveryCost: 20, deliveryNote: 'Thursday' } });
        await page.navigate(orderUrl);
        await opened('Ghana still waiting', (x) => x.includes('Paying in Ghana') && x.includes('once they have all confirmed delivery'));
        expect((await buttons(page)).filter((b) => b.startsWith('Pay '))).toEqual([]);
        await look('waiting');

        // ── both Ghana sellers confirmed: one button for both, delivery included
        await fnCall('movePart', { move: { partId: parts.ama.objectId, to: 'confirmed', deliveryCost: 10 } });
        await page.navigate(orderUrl);
        // 2 × 45 + 20 to Kofi, 30 + 10 to Ama.
        await opened('the Pay button', (x) => /Pay GH₵\s?150 by card or mobile money/.test(x));
        expect(await bodyText(page)).toContain('One payment for Kofi’s Kitchen and Ama’s Shea, through Paystack');
        await look('ready');

        // ── tablet: Kofi's Orders page shows the card payment waiting, with no "paid" button for him to press
        if (!first) {
          await signInAs('kofi@example.com');
          await until(page, 'Kofi’s orders', (x) => x.includes('Your orders') && x.includes(order.number));
          const t = await bodyText(page);
          expect(t).toContain('The buyer pays by card; it says paid here once they have.');
          expect(await buttons(page)).not.toContain('The buyer has paid');
          await look('seller-waits');
          await clickButton(page, 'Sign out');
          await until(page, 'signed out', (x) => x.includes('Buyers don’t need an account'));
          await page.navigate(orderUrl);
          await opened('the Pay button again', (x) => /Pay GH₵\s?150/.test(x));
        }

        const pay = async (how: 'pay' | 'fail', label: RegExp) => {
          const button = (await buttons(page)).find((b) => label.test(b));
          if (!button) throw new Error(`no ${label} button: ${JSON.stringify(await buttons(page))}`);
          await clickButton(page, button);
          await until(page, 'the stand-in’s checkout', (x) => x.includes('Stand-in Paystack'));
          expect((await where(page)).startsWith(`${fake.url}/checkout/MK-`)).toBe(true);
          const text = await bodyText(page);
          expect(text).toContain(first || label.source.includes('150') ? 'GHS 150.00 to ' : 'NGN 7300.00 to ');
          if (how === 'pay') await look(`paystack-${label.source.includes('150') ? 'gh' : 'ng'}`, /favicon|404/);
          await page.evaluate(`document.getElementById(${JSON.stringify(how)}).click()`);
        };

        // ── phone: declined at Paystack first; the page says so and nothing is paid
        if (first) {
          await pay('fail', /^Pay GH₵\s?150/);
          await opened('the declined try', (x) => x.includes('That payment didn’t go through. You can try again.'));
          expect(await where(page)).toMatch(new RegExp(`/order/${order.followToken}$`));
          parts = await partsOf(order.number);
          expect([parts.kofi.status, parts.ama.status]).toEqual(['confirmed', 'confirmed']);
          await look('declined', /favicon|404/);
        }

        // ── paid: back on the order, the page checked the reference, and both Ghana parts say paid
        await pay('pay', /^Pay GH₵\s?150/);
        await opened('it paid', (x) => x.includes('Paid. Thank you: your sellers can see it.'));
        expect(await where(page)).toMatch(new RegExp(`/order/${order.followToken}$`));
        let t = await bodyText(page);
        expect(t).toMatch(/Paid GH₵\s?150 through Paystack/);
        expect((await buttons(page)).filter((b) => /^Pay GH₵/.test(b))).toEqual([]);
        await look('paid', /favicon|404/);
        parts = await partsOf(order.number);
        expect([parts.kofi.status, parts.ama.status]).toEqual(['paid', 'paid']);
        const [o] = await rows('Order', { number: order.number });
        // The page and Paystack's webhook both checked it (the webhook answered 200): one row per payment (the
        // world's rule, a reference is one payment), the parts moved once.
        for (let i = 0; !fake.webhooksSent.length || fake.webhooksSent.length < (first ? 1 : 2); i++) {
          if (i > 300) throw new Error('the stand-in’s webhook never answered');
          await wait(20);
        }
        expect(fake.webhooksSent.map((w) => w.status)).toEqual(first ? [200] : [200, 200]);
        const payments = await rows('Payment', { order: ptr('Order', o.objectId) });
        expect(payments.map((p) => [p.currency, p.amount, p.outcome])).toEqual(first ? [['GHS', 150, 'failed'], ['GHS', 150, 'paid']] : [['GHS', 150, 'paid']]);
        const history = await rows<OrderPartHistory>('OrderPartHistory', { orderPart: ptr('OrderPart', parts.kofi.objectId) });
        expect(history.filter((h) => h.changed?.status?.to === 'paid')).toHaveLength(1);

        // ── tablet: Nigeria next, its own payment, its own key
        if (!first) {
          expect(t).toContain('Paying in Nigeria');
          await fnCall('movePart', { move: { partId: parts.ada.objectId, to: 'confirmed', deliveryCost: 500 } });
          await page.navigate(orderUrl);
          await opened('Nigeria’s button', (x) => /Pay ₦\s?7,300 by card or mobile money/.test(x));
          await pay('pay', /^Pay ₦\s?7,300/);
          await opened('Nigeria paid', (x) => x.includes('Paid. Thank you'));
          t = await bodyText(page);
          expect(t).toMatch(/Paid ₦\s?7,300 through Paystack/);
          expect((await partsOf(order.number)).ada.status).toBe('paid');
          expect(fake.initialized.slice(-1)[0].key).toBe(KEY_NG);
          await look('paid-both', /favicon|404/);
        }
        // Opening it again checks nothing more and says nothing more.
        await page.navigate(orderUrl);
        await opened('opened again', (x) => x.includes('Paying in Ghana'));
        expect(await bodyText(page)).not.toContain('Thank you');
      });
    }

    expect(fake.initialized.every((x) => (x.body.currency === 'GHS' ? x.key === KEY_GH : x.key === KEY_NG))).toBe(true);
    expect(errors.filter((e) => e.errors.length)).toEqual([]);
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
