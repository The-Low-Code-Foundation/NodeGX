/**
 * TWO-003 slice 4 — orders, DRIVEN: the shipped template rendered headless by the real viewer, against a real backend
 * locked with the template's own policy, at a phone (390 px) and a 10" tablet (1024×640). TWO-003 AC1 (slice 4) and
 * AC2: a basket from two sellers in two countries; each seller signs in, sees only their part, moves it to delivered;
 * the buyer's private page shows both parts move.
 *
 * The marketplace, the sellers and their logins are made through the functions over HTTP (slices 1 and 3 drive their
 * own pages); the order is placed by `placeOrder` as a buyer with no account (slice 3's drive places one through the
 * pages). Everything after that is the pages: the buyer's order page, each seller's Orders tab, the admin's.
 *
 * The phone pass: both countries paid on delivery (no "paid" step), and a second order Kofi cancels, saying why. The
 * tablet pass: Nigeria paid by bank transfer, so Ada marks it paid before packing; and the admin's Orders tab.
 *
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request } from './helpers/http';
import { clickButton, clickButtonInRow, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(420000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/marketplace');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const SETUP_TOKEN = 'setup-token-two003-orders-drive';

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
    text = await bodyText(page);
    if (ok(text)) return text;
    await wait(300);
  }
  throw new Error(`${what}: never happened. The page said:\n${text.slice(0, 2500)}`);
}
const path_ = async (page: RenderedPage) => String(await page.evaluate('location.pathname'));

/**
 * The text of the section headed `heading` on the Orders page: which parts sit where. Walk up from its h2 until the
 * next step up would take in another section's h2 or the page's h1.
 */
const section = async (page: RenderedPage, heading: string) =>
  String(
    await page.evaluate(`(function () {
      var h = Array.prototype.filter.call(document.querySelectorAll('h2'), function (x) { return (x.innerText || '').trim() === ${JSON.stringify(heading)}; })[0];
      if (!h) return '';
      for (var el = h.parentElement; el && el.parentElement; el = el.parentElement) {
        var up = el.parentElement;
        if (up.querySelectorAll('h2').length > 1 || up.querySelector('h1')) return el.innerText || '';
      }
      return '';
    })()`)
  );
/** The headings of the Orders page's sections, in order. */
const sections = async (page: RenderedPage) => JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('h2'), function (x) { return (x.innerText || '').trim(); }))`))) as string[];

/** Type into the input labelled `label` inside the one card that names `within`, as a person types. */
async function fillInRow(page: RenderedPage, label: string, value: string, within: string): Promise<void> {
  const client = (page as unknown as { client: { send(m: string, p: unknown): Promise<unknown> } }).client;
  const r = String(
    await page.evaluate(`(function () {
      var inputs = Array.prototype.slice.call(document.querySelectorAll('input, textarea'));
      var hits = inputs.filter(function (i) {
        var lbl = i.closest('label') || (i.id && document.querySelector('label[for="' + i.id + '"]'));
        if (((lbl ? lbl.textContent : '') + ' ' + (i.getAttribute('placeholder') || '')).toLowerCase().indexOf(${JSON.stringify(label.toLowerCase())}) < 0) return false;
        for (var el = i.parentElement; el; el = el.parentElement) {
          if ((el.innerText || '').indexOf(${JSON.stringify(within)}) < 0) continue;
          return el.querySelectorAll('input, textarea').length <= 3;
        }
        return false;
      });
      if (hits.length !== 1) return 'hits:' + hits.length;
      hits[0].scrollIntoView({ block: 'center' });
      hits[0].focus();
      hits[0].value = '';
      return 'ok';
    })()`)
  );
  if (r !== 'ok') throw new Error(`fill "${label}" in the card for "${within}": ${r}`);
  await client.send('Input.insertText', { text: value });
  await wait(250);
}

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 800, mobile: true },
  { name: 'tablet', width: 1024, height: 640, mobile: false }
];

async function shot(page: RenderedPage, name: string): Promise<void> {
  if (process.env.TWO003_SHOTS === '0') return;
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SHOTS, `two003-${name}.png`), Buffer.from(r.data, 'base64'));
}
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

describe('TWO-003 slice 4 — each seller moves their own part, the buyer sees both move, driven', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  let admin: Record<string, string> = {};
  const errors: Array<{ where: string; errors: string[] }> = [];
  const overflow: Array<[string, number]> = [];
  const ids: Record<string, string> = {};

  type Row = Record<string, any>;
  const fnCall = async (fn: string, body: Record<string, unknown>, headers: Record<string, string> = admin) => {
    const r = await request<{ result?: Row }>(base, 'POST', `/functions/${fn}`, { body, headers });
    if (r.status !== 200) throw new Error(`${fn}: ${r.status} ${r.text}`);
    return r.json.result ?? {};
  };
  const rows = async (cls: string, where: Row = {}) =>
    (await request<{ results: Row[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt&limit=1000`, { headers: master })).json.results;
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const partsOf = async (number: string) => {
    const [o] = await rows('Order', { number });
    return Object.fromEntries((await rows('OrderPart', { order: ptr('Order', o.objectId) })).map((p) => [p.seller.objectId === ids.kofi ? 'kofi' : 'ada', p]));
  };
  const placeOrder = async (buyerName: string, lines: Array<[string, number]>, pay: Record<string, string>) =>
    (
      await fnCall(
        'placeOrder',
        { order: { buyerName, phone: '+233 20 555 0187', address: 'House 14, Osu, Accra', country: ids.gh, currency: 'GHS', lines: lines.map(([productId, quantity]) => ({ productId: ids[productId], quantity })), pay } },
        {}
      )
    ).order as { number: string; followToken: string };

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-orders-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, cloudKeys(TEMPLATE))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003orders', backendName: 'TWO-003 orders drive', authToken: 't0k' });
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
    await fnCall('saveWayToPay', { way: { method: 'bank-transfer', countries: [ids.ng] } });
    ids.cod = (await rows('WayToPay', { method: 'on-delivery' }))[0].objectId;
    ids.bank = (await rows('WayToPay', { method: 'bank-transfer' }))[0].objectId;
    ids.kofi = String((await fnCall('saveSeller', { seller: { name: 'Kofi’s Kitchen', country: ids.gh, whatsapp: '+233 24 555 0100', phone: '+233 24 555 0100' } })).id);
    ids.ada = String((await fnCall('saveSeller', { seller: { name: 'Ada’s Farm Drinks', country: ids.ng, phone: '+234 80 555 0101' } })).id);
    ids.shito = String((await fnCall('saveProduct', { product: { seller: ids.kofi, name: 'Shito pepper sauce, 500 g', price: 45, mode: 'buy', category: shelf } })).id);
    ids.zobo = String((await fnCall('saveProduct', { product: { seller: ids.ada, name: 'Zobo drink, 6 bottles', price: 6800, mode: 'buy', category: shelf } })).id);
    await fnCall('giveLogin', { login: { sellerId: ids.kofi, name: 'Kofi', email: 'kofi@example.com', password: 'longenough' } });
    await fnCall('giveLogin', { login: { sellerId: ids.ada, name: 'Ada', email: 'ada@example.com', password: 'longenough' } });

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-orders-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two003orders', port);
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('🔴 AC2: two sellers in two countries each move only their part to delivered, and the buyer sees both move', async () => {
    for (const vp of VIEWPORTS) {
      const first = vp.name === 'phone';
      // Phone: both paid on delivery. Tablet: Nigeria by bank transfer, so Ada's part has a "paid" step.
      const order = await placeOrder(first ? 'Abena Owusu' : 'Kwame Boateng', [['shito', 2], ['zobo', 1]], { [ids.gh]: ids.cod, [ids.ng]: first ? ids.cod : ids.bank });
      const spare = first ? await placeOrder('Efua Asante', [['shito', 1]], { [ids.gh]: ids.cod }) : null;

      await withRenderedPage({ projectDir, backendPort: port }, async (page) => {
        await page.setViewport(vp);
        const look = async (name: string, allowed: RegExp | null = null) => {
          const seen = [...page.consoleErrors];
          page.consoleErrors.length = 0;
          errors.push({ where: `${vp.name} ${name}`, errors: allowed ? seen.filter((e) => !allowed.test(e)) : seen });
          overflow.push([`${vp.name} ${name}`, await overflowX(page)]);
          await shot(page, `${vp.name}-orders-${name}`);
        };
        const signInAs = async (email: string) => {
          await page.navigate('/sign-in');
          await until(page, 'the sign-in page', (x) => x.includes('Buyers don’t need an account'));
          await fill(page, 'Email', email);
          await fill(page, 'Password', 'longenough');
          await clickButton(page, 'Sign in');
        };
        const buyerSees = async (what: string, ok: (t: string) => boolean) => {
          await page.navigate(`/order/${order.followToken}`);
          return until(page, `the buyer sees ${what}`, (x) => x.includes(`Order ${order.number}`) && ok(x));
        };

        // ── the buyer's page: both parts waiting for their seller
        await buyerSees('both parts waiting', (x) => x.split('Waiting for the seller').length === 3);
        await look('buyer-new');

        // ── Kofi signs in and lands on his orders: his part only
        await signInAs('kofi@example.com');
        await until(page, 'Kofi lands on his orders', (x) => x.includes('Your orders') && x.includes('To confirm') && x.includes(order.number));
        expect(await path_(page)).toBe('/orders');
        let t = await bodyText(page);
        expect(t).toContain('Shito pepper sauce, 500 g × 2');
        expect(t).toContain('House 14, Osu, Accra · +233 20 555 0187');
        // 🔴 rule 3: nothing of Ada's part, though it is the same order.
        expect([t.includes('Zobo'), t.includes('Ada’s Farm Drinks'), /6,800/.test(t)]).toEqual([false, false, false]);
        expect(t).toMatch(first ? /2\s*to confirm/ : /1\s*to confirm/);
        expect(t).toContain('Delivery cost (GH₵)');
        await look('kofi-new');

        // ── confirming needs the cost: refused in words, then confirmed with GH₵20, Thursday
        await clickButtonInRow(page, 'Confirm: they pay when it arrives', order.number);
        await until(page, 'refused without a cost', (x) => x.includes('Say what delivery costs: 0 if it is free.'));
        expect((await partsOf(order.number)).kofi.status).toBe('new');
        await fillInRow(page, 'Delivery cost', '20', order.number);
        await fillInRow(page, 'When it comes', 'Thursday', order.number);
        await look('kofi-confirm', /what delivery costs/);
        await clickButtonInRow(page, 'Confirm: they pay when it arrives', order.number);
        // Paid on delivery: straight to packing, no "paid" step.
        await until(page, 'Kofi’s part waits to be packed', (x) => x.includes('To pack') && /Delivery GH₵\s?20, Thursday/.test(x));
        expect(await section(page, 'To pack')).toContain(order.number);
        expect((await partsOf(order.number)).kofi).toMatchObject({ status: 'confirmed', deliveryCost: 20, deliveryNote: 'Thursday' });

        // ── the buyer sees Kofi's confirm; Ada's still waits
        await buyerSees('Kofi confirmed', (x) => /Delivery GH₵\s?20 \(Thursday\), confirmed by the seller/.test(x) && x.includes('Waiting for the seller'));
        await look('buyer-confirmed');

        // ── Kofi packs, sends, delivers
        await page.navigate('/orders');
        await until(page, 'back on Kofi’s orders', (x) => x.includes('To pack'));
        for (const [button, heading] of [
          ['Packed', 'Packed, to send'],
          ['Sent', 'On its way'],
          ['Delivered and paid', 'Delivered']
        ]) {
          await clickButtonInRow(page, button, order.number);
          await until(page, `Kofi’s part: ${heading}`, (x) => x.includes(heading));
          await wait(300);
          expect(await section(page, heading)).toContain(order.number);
          if (heading === 'On its way') await look('kofi-sent');
        }
        expect((await partsOf(order.number)).kofi.status).toBe('delivered');
        await look('kofi-delivered');

        // ── the tabs: Products and back
        await clickButton(page, 'Products');
        await until(page, 'Kofi’s products', (x) => x.includes('Your products') && x.includes('Shito pepper sauce'));
        expect(await path_(page)).toBe('/products/mine');
        await clickButton(page, 'Orders');
        await until(page, 'back on the orders', (x) => x.includes('Your orders'));

        // ── phone: Kofi cancels the spare order, saying why; the buyer reads why
        if (spare) {
          await clickButtonInRow(page, 'Cancel this part…', spare.number);
          await until(page, 'asked why', (x) => x.includes('Why it is cancelled'));
          await clickButtonInRow(page, 'Cancel it', spare.number);
          await until(page, 'refused without why', (x) => x.includes('Say why it is cancelled: the buyer sees it.'));
          await fillInRow(page, 'Why it is cancelled', 'Out of shito until November', spare.number);
          await look('kofi-cancel', /Say why it is cancelled/);
          await clickButtonInRow(page, 'Cancel it', spare.number);
          await until(page, 'cancelled', (x) => x.includes('Cancelled: Out of shito until November.'));
          expect(await section(page, 'Cancelled')).toContain(spare.number);
          await page.navigate(`/order/${spare.followToken}`);
          await until(page, 'the buyer reads why', (x) => x.includes('This part was cancelled: Out of shito until November.'));
          await look('buyer-cancelled');
        }

        // ── Ada signs in: her part only, and moves it to delivered
        await page.navigate('/orders');
        await until(page, 'orders to sign out from', (x) => x.includes('Your orders'));
        await clickButton(page, 'Sign out');
        await until(page, 'signed out', (x) => x.includes('Buyers don’t need an account'));
        await signInAs('ada@example.com');
        await until(page, 'Ada lands on her orders', (x) => x.includes('Your orders') && x.includes(order.number));
        t = await bodyText(page);
        expect([t.includes('Shito'), t.includes('Kofi’s Kitchen'), t.includes('Zobo drink, 6 bottles × 1')]).toEqual([false, false, true]);
        await fillInRow(page, 'Delivery cost', '1500', order.number);
        await clickButtonInRow(page, first ? 'Confirm: they pay when it arrives' : 'Confirm and ask the buyer to pay', order.number);
        if (!first) {
          // A bank transfer: confirmed, then waiting for the money, with the reference to look for.
          await until(page, 'Ada waits for the money', (x) => x.includes('Waiting for the buyer to pay'));
          expect(await section(page, 'Waiting for the buyer to pay')).toContain(`Bank transfer, reference ${order.number}`);
          expect(await bodyText(page)).toMatch(/1\s*to be paid/);
          await look('ada-to-pay');
          await buyerSees('Ada asks to be paid', (x) => /bank transfer now, with MK-/.test(x));
          await page.navigate('/orders');
          await until(page, 'back on Ada’s orders', (x) => x.includes('Waiting for the buyer to pay'));
          await clickButtonInRow(page, 'The buyer has paid', order.number);
        }
        await until(page, 'Ada’s part waits to be packed', (x) => x.includes('To pack'));
        for (const [button, heading] of [
          ['Packed', 'Packed, to send'],
          ['Sent', 'On its way'],
          [first ? 'Delivered and paid' : 'Delivered', 'Delivered']
        ]) {
          await clickButtonInRow(page, button, order.number);
          await until(page, `Ada’s part: ${heading}`, (x) => x.includes(heading));
          await wait(300);
        }
        expect(await sections(page)).toEqual(['Delivered']);
        await look('ada-delivered');

        // ── 🔴 AC2: the buyer sees both parts delivered
        t = await buyerSees('both delivered', (x) => x.split('Delivered').length >= 3 && !x.includes('Waiting for the seller'));
        expect(t).toMatch(/Paid: GH₵\s?110/);
        expect(t).toMatch(/Paid: ₦\s?8,300/);
        await look('buyer-delivered');
        const parts = await partsOf(order.number);
        expect([parts.kofi.status, parts.ada.status]).toEqual(['delivered', 'delivered']);
        expect((await rows('OrderPartHistory', { orderPart: ptr('OrderPart', parts.ada.objectId) })).map((h) => h.changed.status.to)).toEqual(
          first ? ['new', 'confirmed', 'packed', 'sent', 'delivered'] : ['new', 'confirmed', 'paid', 'packed', 'sent', 'delivered']
        );

        // ── the admin's Orders tab: every seller's part, each named
        await signInAs('admin@example.com');
        await until(page, 'the admin lands on Sellers', (x) => x.includes('Add a seller') && x.includes('Orders'));
        await clickButton(page, 'Orders');
        await until(page, 'every order', (x) => x.includes('Every order') && x.includes('Ada’s Farm Drinks · Nigeria') && x.includes('Kofi’s Kitchen · Ghana'));
        expect(await path_(page)).toBe('/orders');
        expect(await section(page, 'Delivered')).toContain(order.number);
        // The admin's six tabs (slice 5 added Enquiries): each on one line (a phone used to wrap "Ways to pay"). A tablet
        // shows every one; a phone scrolls the bar sideways, never the page, with this page's tab on screen.
        const tabs = JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('.mk-tab'), function (b) { var r = b.getBoundingClientRect(); return { w: (b.innerText || '').trim(), on: b.className.indexOf('mk-tab-on') >= 0, h: Math.round(r.height), left: r.left, right: r.right }; }))`))) as Array<{ w: string; on: boolean; h: number; left: number; right: number }>;
        expect(tabs.map((x) => x.w)).toEqual(['Sellers', 'Orders', 'Enquiries', 'Ways to pay', 'Rates', 'Shelves']);
        expect(new Set(tabs.map((x) => x.h)).size).toBe(1);
        const offScreen = tabs.filter((x) => x.left < -0.5 || x.right > vp.width + 0.5).map((x) => x.w);
        expect(offScreen.includes('Orders')).toBe(false);
        if (!first) expect(offScreen).toEqual([]);
        await look('admin-orders');
        // A seller's staff opening someone else's tabs: there are none to open. A stranger is told to sign in.
        await clickButton(page, 'Sign out');
        await until(page, 'signed out', (x) => x.includes('Buyers don’t need an account'));
        await page.navigate('/orders');
        await until(page, 'a stranger is refused', (x) => x.includes('Sign in to see this page.') || x.includes('This page is for the marketplace’s sellers and its admin.'));
        expect(await bodyText(page)).not.toContain(order.number);
        await look('refused', /auth|session|permission|forbidden|401|403|sellers and its admin/i);
      });
    }

    expect(errors.filter((e) => e.errors.length)).toEqual([]);
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
