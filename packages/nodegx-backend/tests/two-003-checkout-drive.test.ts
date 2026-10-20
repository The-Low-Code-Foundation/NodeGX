/**
 * TWO-003 slice 3 — the basket and the checkout, DRIVEN: the shipped template rendered headless by the real viewer,
 * against a real backend locked with the template's own policy, at a phone (390 px) and a 10" tablet (1024×640).
 * TWO-003 AC1 (slice 3), AC4, and AC3's buyer half.
 *
 * Nothing is seeded with the master key but the first admin's setup secret and the photos' bytes. **The admin sets
 * the marketplace up through the pages**: countries, the ways to pay per country, the rates, the shelves (slice 3's
 * tabs). Sellers and products are made through slice 1's functions over HTTP (slice 1's own drive proves its pages).
 *
 * Then a buyer with no account: two sellers in two countries into one basket, the basket's two totals, a checkout that
 * offers each country only the ways turned on there (no WhatsApp in Nigeria; WhatsApp in Ghana until the admin turns
 * it off on the tablet pass), the order placed, its private page, and the store read back: one part per seller, each
 * with the way picked for its country, each line at the product's price.
 *
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import sharp from 'sharp';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request, type ParsePointer, type ParseRecord } from './helpers/http';
import { clickButton, clickButtonInRow, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(420000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/marketplace');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const SETUP_TOKEN = 'setup-token-two003-checkout-drive';

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
  throw new Error(`${what}: never happened. The page said:\n${text.slice(0, 2000)}`);
}
const path_ = async (page: RenderedPage) => String(await page.evaluate('location.pathname'));
const buttons = async (page: RenderedPage) =>
  JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('button'), function (b) { return (b.innerText || '').trim(); }))`))) as string[];

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
  fs.writeFileSync(path.join(SHOTS, `two003-${name}.png`), Buffer.from(r.data, 'base64'));
}
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

describe('TWO-003 slice 3 — the basket and the checkout, driven in the rendered app', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  let admin: Record<string, string> = {};
  const errors: Array<{ where: string; errors: string[] }> = [];
  const overflow: Array<[string, number]> = [];
  const ids: Record<string, string> = {};
  const placed: string[] = [];

  type Row = Record<string, unknown>;
  /** An OrderPart row, as far as this drive reads one. */
  interface OrderPart extends ParseRecord {
    seller: ParsePointer;
    wayToPay: ParsePointer;
  }
  const fnCall = async (fn: string, body: Record<string, unknown>, headers: Record<string, string> = admin) => {
    const r = await request<{ result?: Row }>(base, 'POST', `/functions/${fn}`, { body, headers });
    if (r.status !== 200) throw new Error(`${fn}: ${r.status} ${r.text}`);
    return r.json.result ?? {};
  };
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}) =>
    (await request<{ results: T[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt&limit=1000`, { headers: master })).json.results;
  const upload = async (name: string, hue: string) => {
    const bytes = await sharp({ create: { width: 1200, height: 900, channels: 3, background: hue } }).jpeg({ quality: 80 }).toBuffer();
    const r = await request<{ name: string; url: string }>(base, 'POST', `/files/${name}`, { body: bytes, headers: { ...master, 'content-type': 'image/jpeg' }, raw: true });
    if (r.status !== 201 && r.status !== 200) throw new Error(`upload ${name}: ${r.status} ${r.text}`);
    return { name: r.json.name, url: r.json.url };
  };
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-checkout-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, cloudKeys(TEMPLATE))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003checkout', backendName: 'TWO-003 checkout drive', authToken: 't0k' });
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
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-checkout-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two003checkout', port);
  });

  afterAll(async () => {
    await service?.stop();
  });

  /** Sellers and products, through slice 1's functions, once the admin's pages have made the countries and shelves. */
  async function sellersAndProducts(): Promise<void> {
    const country = Object.fromEntries((await rows('Country')).map((c) => [c.name, c.objectId]));
    const shelf = (await rows('Category'))[0].objectId;
    ids.kofi = String((await fnCall('saveSeller', { seller: { name: 'Kofi’s Kitchen', country: country.Ghana, whatsapp: '+233 24 555 0100', phone: '+233 24 555 0100' } })).id);
    ids.ada = String((await fnCall('saveSeller', { seller: { name: 'Ada’s Farm Drinks', country: country.Nigeria, phone: '+234 80 555 0101' } })).id);
    const product = async (key: string, seller: string, name: string, price: number, hue: string) => {
      ids[key] = String((await fnCall('saveProduct', { product: { seller: ids[seller], name, price, mode: 'buy', category: shelf, photos: [await upload(`${key}.jpg`, hue)] } })).id);
    };
    await product('shito', 'kofi', 'Shito pepper sauce, 500 g', 45, '#c0412b');
    await product('zobo', 'ada', 'Zobo drink, 6 bottles', 6800, '#6b0f3a');
  }

  it('the admin sets the marketplace up, and a buyer with no account checks out from two countries', async () => {
    for (const vp of VIEWPORTS) {
      await withRenderedPage({ projectDir, backendPort: port }, async (page) => {
        await page.setViewport(vp);
        const look = async (name: string, allowed: RegExp | null = null) => {
          const seen = [...page.consoleErrors];
          page.consoleErrors.length = 0;
          errors.push({ where: `${vp.name} ${name}`, errors: allowed ? seen.filter((e) => !allowed.test(e)) : seen });
          overflow.push([`${vp.name} ${name}`, await overflowX(page)]);
          await shot(page, `${vp.name}-checkout-${name}`);
        };
        const first = vp.name === 'phone';

        // ── an admin's tab, opened with no sign-in: refused, nothing of the admin's shown
        await page.navigate('/admin/ways-to-pay');
        await until(page, 'the ways to pay refuse a stranger', (x) => x.includes('Sign in to see this page.'));
        expect(await bodyText(page)).not.toContain('Turn each way on');
        await look('admin-refused', /auth|session|permission|forbidden|401|403/i);

        // ── the admin signs in, and finds the tabs
        await page.navigate('/sign-in');
        await until(page, 'the sign-in page', (x) => x.includes('Buyers don’t need an account'));
        await fill(page, 'Email', 'admin@example.com');
        await fill(page, 'Password', 'longenough');
        await clickButton(page, 'Sign in');
        await until(page, 'the admin lands on Sellers, with the tabs', (x) => x.includes('Add a seller') && x.includes('Ways to pay') && x.includes('Shelves'));

        // ── Ways to pay: the countries, then each way per country
        await clickButton(page, 'Ways to pay');
        await until(page, 'the ways to pay page', (x) => x.includes('Turn each way on for each country'));
        expect(await path_(page)).toBe('/admin/ways-to-pay');
        if (first) {
          await until(page, 'no countries yet', (x) => x.includes('No countries yet'));
          for (const [name, currency] of [
            ['Ghana', 'GHS'],
            ['Nigeria', 'ngn']
          ]) {
            await fill(page, 'Country', name);
            await fill(page, 'Currency code', currency);
            await clickButton(page, 'Add the country');
            await until(page, `${name} added`, (x) => x.includes(`${name} · ${currency.toUpperCase()}`));
          }
          // A second Ghana is refused, in words.
          await fill(page, 'Country', 'Ghana');
          await fill(page, 'Currency code', 'GHS');
          await clickButton(page, 'Add the country');
          await until(page, 'a second Ghana refused', (x) => x.includes('There is already a country called Ghana.'));
          for (const [way, country] of [
            ['Pay on delivery', 'Ghana'],
            ['Pay on delivery', 'Nigeria'],
            ['Bank transfer', 'Nigeria'],
            ['Order on WhatsApp', 'Ghana']
          ]) {
            await toggle(page, way, country, true);
            await until(page, `${way} on in ${country}`, (x) => x.includes('On in') && x.includes(country));
            await wait(600);
          }
          await until(page, 'the ways say where they are on', (x) => x.includes('On in Ghana, Nigeria.') && x.includes('On in Nigeria.') && x.includes('On in Ghana.'));
        } else {
          // 🔴 AC4, the second half: the admin turns WhatsApp off in Ghana; the buyer's pages stop offering it.
          expect(await ticked(page, 'Order on WhatsApp', 'Ghana')).toBe('true');
          await toggle(page, 'Order on WhatsApp', 'Ghana', false);
          await until(page, 'WhatsApp is off everywhere', (x) => x.includes('Not on anywhere yet.'));
        }
        await look('admin-ways', first ? /already a country called Ghana/ : null);
        const way = Object.fromEntries((await rows('WayToPay')).map((w) => [w.method, w]));
        expect(Object.keys(way).sort()).toEqual(['bank-transfer', 'on-delivery', 'whatsapp']);

        // ── Rates: the cedi is the marketplace's own, the naira beside it
        await clickButton(page, 'Rates');
        await until(page, 'the rates page', (x) => x.includes(first ? 'Set the rates' : 'What one unit is worth in'));
        if (first) {
          await fill(page, 'Rate', '1', 0); // GHS: the own currency
          await fill(page, 'Rate', '0.0091', 1); // NGN
        } else {
          expect(await bodyText(page)).toContain('The marketplace’s own: always 1');
          await fill(page, 'Rate', '0.0095', 0); // NGN, now the only one asked
        }
        await clickButton(page, 'Save rates');
        await until(page, 'saved', (x) => x.includes('Saved.') && x.includes('What one unit is worth in'));
        const rates = Object.fromEntries((await rows('Rate')).map((r) => [r.currency, r.value]));
        expect(rates).toEqual({ GHS: 1, NGN: first ? 0.0091 : 0.0095 });
        await look('admin-rates');

        // ── Shelves: one added (phone), renamed (tablet)
        await clickButton(page, 'Shelves');
        await until(page, 'the shelves page', (x) => x.includes('A shelf is renamed, never taken away'));
        if (first) {
          await fill(page, 'A new shelf', 'Food');
          await clickButton(page, 'Add the shelf');
          await until(page, 'the shelf added', (x) => x.includes('0 products'));
        } else {
          await fill(page, 'Shelf', 'Food and drinks', 1); // 0 is "A new shelf"
          await clickButton(page, 'Rename');
          await wait(800);
          expect((await rows('Category')).map((c) => c.name)).toEqual(['Food and drinks']);
        }
        await look('admin-shelves');

        if (first) await sellersAndProducts();

        // ── signed out: from here on, a buyer with no account
        await clickButton(page, 'Sign out');
        await until(page, 'signed out', (x) => x.includes('Buyers don’t need an account'));
        await page.evaluate("localStorage.removeItem('mk-basket'); true");

        // ── a product: how many, Add to basket; WhatsApp offered only where it is on
        await page.navigate(`/item/${ids.shito}`);
        await until(page, 'the shito page', (x) => x.includes('How many') && /Add to basket · GH₵\s?45/.test(x));
        await clickButton(page, '+');
        await clickButton(page, '+');
        await clickButton(page, '−');
        await until(page, 'two of them', (x) => /Add to basket · GH₵\s?90/.test(x));
        const shitoButtons = await buttons(page);
        // Ghana has WhatsApp on (phone pass) or off (tablet pass, AC4).
        expect(shitoButtons.includes('Order on WhatsApp instead')).toBe(first);
        await clickButton(page, (await buttons(page)).find((b) => b.startsWith('Add to basket')) as string);
        await until(page, 'in the basket', (x) => x.includes('2 in your basket.') && x.includes('Basket · 2'));
        await look('product');

        await page.navigate(`/item/${ids.zobo}`);
        await until(page, 'the zobo page', (x) => x.includes('Zobo drink') && x.includes('Add to basket'));
        expect(await buttons(page)).not.toContain('Order on WhatsApp instead'); // Ada has no number, and Nigeria has it off
        await clickButton(page, (await buttons(page)).find((b) => b.startsWith('Add to basket')) as string);
        await until(page, 'both in the basket', (x) => x.includes('Basket · 3'));

        // ── the basket: by seller, a total per country, two payments said plainly
        await clickButton(page, 'Basket · 3');
        await until(page, 'the basket', (x) => x.includes('Two countries, two payments.') && x.includes('Kofi’s Kitchen') && x.includes('Ada’s Farm Drinks'));
        expect(await path_(page)).toBe('/basket');
        let t = await bodyText(page);
        expect(t).toMatch(/Ghana · pays in GH₵/);
        expect(t).toMatch(/Nigeria · pays in ₦/);
        expect(t).toMatch(/2 × GH₵\s?45/);
        expect(t).toMatch(/Ghana, in GH₵\s*GH₵\s?90/);
        expect(t).toMatch(/Nigeria, in ₦\s*₦\s?6,800/);
        expect(t).toMatch(/About GH₵\s?15[0-9] together/);
        await clickButtonInRow(page, '+', 'Zobo drink');
        await until(page, 'one more zobo', (x) => /2 × ₦\s?6,800/.test(x) && x.includes('Basket · 4'));
        await clickButtonInRow(page, '−', 'Zobo drink');
        await until(page, 'back to one zobo', (x) => /1 × ₦\s?6,800/.test(x) && x.includes('Basket · 3'));
        await look('basket');

        // ── the checkout: each seller country offered only the ways on there
        await clickButton(page, 'Check out');
        await until(page, 'the checkout', (x) => x.includes('How you’ll pay in Ghana') && x.includes('How you’ll pay in Nigeria'));
        expect(await path_(page)).toBe('/checkout');
        const offered = await buttons(page);
        // Nigeria: bank transfer and pay on delivery (WhatsApp is off there). Ghana: on delivery, and WhatsApp on the phone pass.
        expect(offered.filter((b) => /^[◉○] /.test(b))).toEqual(
          first ? ['◉ Pay on delivery', '○ Order on WhatsApp', '◉ Pay on delivery', '○ Bank transfer'] : ['◉ Pay on delivery', '◉ Pay on delivery', '○ Bank transfer']
        );
        if (first) {
          await clickButton(page, '○ Order on WhatsApp');
          await until(page, 'WhatsApp picked for Ghana', (x) => x.includes('◉ Order on WhatsApp'));
        }
        await clickButton(page, '○ Bank transfer');
        await until(page, 'bank transfer picked for Nigeria', (x) => x.includes('◉ Bank transfer'));
        // Without a name: refused, in words, and nothing placed.
        await clickButton(page, 'Place order');
        await until(page, 'refused without a name', (x) => x.includes('Say who the order is for.'));
        expect(await rows('Order')).toHaveLength(placed.length);
        await fill(page, 'Name', 'Abena Owusu');
        await fill(page, 'Phone', '+233 20 555 0187');
        await fill(page, 'Where it goes', 'House 14, Osu, Accra');
        await look('checkout', /Say who the order is for/);
        await clickButton(page, 'Place order');

        // ── the order's private page
        const number = `MK-${new Date().getUTCFullYear()}-0000${placed.length + 1}`;
        await until(page, 'the order page', (x) => x.includes(`Order ${number}`) && x.includes('Waiting for the seller'), 20000);
        expect(await path_(page)).toMatch(/^\/order\/[0-9a-f]{48}$/);
        t = await bodyText(page);
        expect(t).toContain('This page is private to you: keep the link.');
        expect(t).toMatch(/Read out the number if you call: M K, twenty twenty-six, /);
        expect(t).toContain(first ? 'Paying in Ghana: Order on WhatsApp' : 'Paying in Ghana: Pay on delivery');
        expect(t).toContain('Paying in Nigeria: Bank transfer');
        expect(t).toContain(`as the reference`);
        expect(t).toContain('Message Kofi’s Kitchen on WhatsApp');
        expect(t).not.toContain('Basket · ');
        expect(await buttons(page)).toContain('My order');
        await look('order');
        placed.push(number);

        // What the store holds: one order, one part per seller, each with its country's way, each line at its price.
        const [order] = await rows('Order', { number });
        expect([order.buyerName, order.address, order.currency, (await path_(page)).slice('/order/'.length)]).toEqual(['Abena Owusu', 'House 14, Osu, Accra', 'GHS', order.followToken]);
        const parts = await rows<OrderPart>('OrderPart', { order: ptr('Order', order.objectId) });
        expect(parts.map((p) => [p.seller.objectId, p.status, p.subtotal, p.wayToPay.objectId])).toEqual([
          [ids.kofi, 'new', 90, first ? way.whatsapp.objectId : way['on-delivery'].objectId],
          [ids.ada, 'new', 6800, way['bank-transfer'].objectId]
        ]);
        const lines = await rows('OrderLine', { orderPart: { $in: parts.map((p) => ptr('OrderPart', p.objectId)) } });
        expect(lines.map((l) => [l.productName, l.quantity, l.price])).toEqual([
          ['Shito pepper sauce, 500 g', 2, 45],
          ['Zobo drink, 6 bottles', 1, 6800]
        ]);

        // My order finds it again from the shop.
        await page.navigate('/');
        await until(page, 'the shop', (x) => x.includes('My order'));
        await clickButton(page, 'My order');
        await until(page, 'my order again', (x) => x.includes(`Order ${number}`));

        // ── 🔴 AC3: another link opens nothing
        await page.navigate(`/order/${'0'.repeat(48)}`);
        await until(page, 'a wrong link', (x) => x.includes('There is no order at this link.'));
        expect(await bodyText(page)).not.toContain('Abena');
        await look('gone', /no order at this link/);

        // An empty basket says so, and its checkout too.
        await page.navigate('/basket');
        await until(page, 'the empty basket', (x) => x.includes('Your basket is empty.'));
        await page.navigate('/checkout');
        await until(page, 'nothing to check out', (x) => x.includes('there is nothing to check out'));
      });
    }

    expect(errors.filter((e) => e.errors.length)).toEqual([]);
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
