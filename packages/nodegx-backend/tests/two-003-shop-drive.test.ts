/**
 * TWO-003 slice 2 — the catalogue, DRIVEN: the shipped template rendered headless by the real viewer, against a real
 * backend locked with the template's own policy, at a phone (390 px) and a 10" tablet (1024×640), as a buyer with no
 * account. TWO-003 AC1 and AC5.
 *
 * Seeded with the master key (slice 3 owns the admin's pages for countries, rates and shelves; slice 1's pages make
 * sellers and products, and its own drive proves them): three countries, three rates, three shelves, four sellers in
 * three countries — one of them stopped — and six products, one off sale and one an enquire-only car. Photos are
 * real files in the backend's store, so every thumbnail the pages ask for is drawn by the backend.
 *
 * What a buyer must never see: the off-sale product, the stopped seller, or the stopped seller's product, on any
 * list, by any search; opened from a link, each says it isn't here now. That is the slice's one rule the policy can't
 * keep (anyone may read `Product` and `Seller`), so the pages keep it and this drive checks every place it could leak.
 *
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import sharp from 'sharp';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request } from './helpers/http';
import { clickButton, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(300000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/marketplace');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
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
  throw new Error(`${what}: never happened. The page said:\n${text.slice(0, 1500)}`);
}
const path_ = async (page: RenderedPage) => String(await page.evaluate('location.pathname'));

/** Pick the option whose words match in the nth dropdown, the way a change from a person arrives. */
async function choose(page: RenderedPage, words: string, nth: number): Promise<void> {
  const picked = await page.evaluate(`(function () {
    var s = document.querySelectorAll('select')[${nth}];
    if (!s) return 'no select';
    var o = Array.prototype.find.call(s.options, function (x) { return x.textContent.indexOf(${JSON.stringify(words)}) >= 0; });
    if (!o) return 'no option: ' + Array.prototype.map.call(s.options, function (x) { return x.textContent; }).join(' | ');
    s.value = o.value;
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return o.textContent;
  })()`);
  if (!String(picked).includes(words)) throw new Error(`could not choose "${words}": ${picked}`);
  await wait(400);
}
const chosen = async (page: RenderedPage, nth: number) =>
  String(await page.evaluate(`(function () { var s = document.querySelectorAll('select')[${nth}]; return s ? s.options[s.selectedIndex].textContent : 'no select'; })()`));

/** Empty a field the way a person's select-all and delete does: React hears the change. */
async function clearField(page: RenderedPage, placeholder: string): Promise<void> {
  await page.evaluate(`(function () {
    var el = document.querySelector('input[placeholder^=${JSON.stringify(placeholder)}]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await wait(400);
}

/** The names on the product cards, in order (each card's name is a button inside `.mk-grid`). */
const cardNames = async (page: RenderedPage) =>
  JSON.parse(
    String(
      await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('.mk-grid button'), function (b) { return b.innerText.trim(); }))`)
    )
  ) as string[];
async function untilCards(page: RenderedPage, what: string, want: string[], ms = 15000): Promise<void> {
  const end = Date.now() + ms;
  let seen: string[] = [];
  while (Date.now() < end) {
    seen = await cardNames(page);
    if (JSON.stringify(seen) === JSON.stringify(want)) return;
    await wait(300);
  }
  throw new Error(`${what}: the cards read ${JSON.stringify(seen)}, not ${JSON.stringify(want)}`);
}

/** How many images on the page are drawn (loaded, with pixels) from an address containing `part`. */
const drawnImages = async (page: RenderedPage, part: string) =>
  Number(
    await page.evaluate(
      `Array.prototype.filter.call(document.images, function (i) { return i.src.indexOf(${JSON.stringify(part)}) >= 0 && i.complete && i.naturalWidth > 0; }).length`
    )
  );
async function untilImages(page: RenderedPage, what: string, part: string, n: number, ms = 20000): Promise<void> {
  const end = Date.now() + ms;
  let seen = 0;
  while (Date.now() < end) {
    seen = await drawnImages(page, part);
    if (seen === n) return;
    await wait(300);
  }
  throw new Error(`${what}: ${seen} images drawn from "${part}", not ${n}.`);
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
const overflowX = async (page: RenderedPage) =>
  Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

/** A product photo as a phone would send it after Upload File shrank it: 1600×1200, a colour with grain. */
async function photo(hue: string): Promise<Buffer> {
  const noise = await sharp({ create: { width: 1600, height: 1200, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 24 } } } as sharp.SharpOptions).png().toBuffer();
  return sharp({ create: { width: 1600, height: 1200, channels: 3, background: hue } }).composite([{ input: noise, blend: 'soft-light' }]).jpeg({ quality: 80 }).toBuffer();
}

describe('TWO-003 slice 2 — the catalogue, driven in the rendered app as a buyer', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  const errors: Array<{ where: string; errors: string[] }> = [];
  const overflow: Array<[string, number]> = [];
  const ids: Record<string, string> = {};
  /** What AC5 asks to be written down: the first page's weight, read from the browser. */
  const weight: Record<string, Record<string, unknown>> = {};

  const post = async (cls: string, body: Record<string, unknown>) => {
    const r = await request<{ objectId: string }>(base, 'POST', `/classes/${cls}`, { body, headers: master });
    if (r.status !== 201 && r.status !== 200) throw new Error(`${cls}: ${r.status} ${r.text}`);
    return r.json.objectId;
  };
  const upload = async (name: string, bytes: Buffer) => {
    const r = await request<{ name: string; url: string }>(base, 'POST', `/files/${name}`, { body: bytes, headers: { ...master, 'content-type': 'image/jpeg' }, raw: true });
    if (r.status !== 201 && r.status !== 200) throw new Error(`upload ${name}: ${r.status} ${r.text}`);
    return { __type: 'File', name: r.json.name, url: r.json.url };
  };
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const ENDED = { __type: 'Date', iso: '2026-10-01T09:00:00.000Z' };

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-shop-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, cloudKeys(TEMPLATE))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003shop', backendName: 'TWO-003 shop drive', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    port = started.listen.port;
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await request(base, 'POST', '/admin/schema', { body: push, headers: master });
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }

    // Three countries; the marketplace's own currency is the cedi (worth 1).
    // R13: the marketplace's name is its one row's (set-up makes it; here the master key does).
    await post('Marketplace', { name: 'Market Square' });
    ids.ghana = await post('Country', { name: 'Ghana', currency: 'GHS' });
    ids.nigeria = await post('Country', { name: 'Nigeria', currency: 'NGN' });
    ids.kenya = await post('Country', { name: 'Kenya', currency: 'KES' });
    await post('Rate', { currency: 'GHS', value: 1 });
    await post('Rate', { currency: 'NGN', value: 0.0091 });
    await post('Rate', { currency: 'KES', value: 0.11 });
    ids.food = await post('Category', { name: 'Food and drinks' });
    ids.phones = await post('Category', { name: 'Phones and laptops' });
    ids.cars = await post('Category', { name: 'Cars' });
    // WhatsApp is a way to pay in Ghana and Kenya (slice 3: a buy product offers it only where it is on).
    ids.wa = await post('WayToPay', { name: 'Order on WhatsApp', method: 'whatsapp' });
    const on = await request(base, 'PUT', `/classes/WayToPay/${ids.wa}`, {
      body: { country: { __op: 'AddRelation', objects: [ptr('Country', ids.ghana), ptr('Country', ids.kenya)] } },
      headers: master
    });
    if (on.status !== 200) throw new Error(`WhatsApp on: ${on.status} ${on.text}`);

    ids.kofi = await post('Seller', { name: 'Kofi’s Kitchen', country: ptr('Country', ids.ghana), whatsapp: '+233 24 555 0100', phone: '+233 24 555 0100', story: 'Shito and gari from our kitchen in Accra, since 1998.', logo: await upload('kofi-logo.jpg', await sharp({ create: { width: 512, height: 512, channels: 3, background: '#a3271f' } }).jpeg().toBuffer()) });
    ids.ada = await post('Seller', { name: 'Ada’s Farm Drinks', country: ptr('Country', ids.nigeria), phone: '+234 80 555 0101', payoutAccount: 'ACCT_SECRET_ADA' });
    ids.beans = await post('Seller', { name: 'Nairobi Beans', country: ptr('Country', ids.kenya), whatsapp: '+254 70 555 0102' });
    ids.motors = await post('Seller', { name: 'Ring Road Motors', country: ptr('Country', ids.ghana), whatsapp: '+233 20 555 0103' });
    ids.closed = await post('Seller', { name: 'Shut Shop Ltd', country: ptr('Country', ids.nigeria), endedAt: ENDED, stoppedReason: 'Paperwork missing' });

    const product = async (key: string, fields: Record<string, unknown>, hues: string[]) => {
      const photos: unknown[] = [];
      for (const [i, hue] of hues.entries()) photos.push(await upload(`${key}-${i + 1}.jpg`, await photo(hue)));
      ids[key] = await post('Product', { mode: 'buy', ...fields, photos });
      await wait(20); // newest first: each one a little later than the one before
    };
    await product('gari', { name: 'Gari, 2 kg', price: 38, seller: ptr('Seller', ids.kofi), category: ptr('Category', ids.food), endedAt: ENDED }, ['#d4a017']);
    await product('ghost', { name: 'Ghost pepper oil', price: 9000, seller: ptr('Seller', ids.closed), category: ptr('Category', ids.food) }, ['#7a1d12']);
    await product('corolla', { name: 'Toyota Corolla 2015', price: 98000, mode: 'enquire', seller: ptr('Seller', ids.motors), category: ptr('Category', ids.cars), description: '84,000 km, automatic, petrol, one owner.' }, ['#283a52', '#7d93b2', '#151f2d']);
    await product('coffee', { name: 'AA coffee beans, 1 kg', price: 1900, seller: ptr('Seller', ids.beans), category: ptr('Category', ids.food) }, ['#4a2c0f']);
    await product('zobo', { name: 'Zobo drink, 6 bottles', price: 6800, seller: ptr('Seller', ids.ada), category: ptr('Category', ids.food) }, []);
    await product('shito', { name: 'Shito pepper sauce, 500 g', price: 45, seller: ptr('Seller', ids.kofi), category: ptr('Category', ids.food), description: 'Black pepper sauce cooked slowly with dried fish and shrimp.' }, ['#c0412b', '#5c160d']);

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-shop-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two003shop', port);
  });

  afterAll(async () => {
    await service?.stop();
    if (Object.keys(weight).length) console.log('[two003 first page weight]', JSON.stringify(weight));
  });

  it('the catalogue, at a phone and a tablet, as a buyer with no account', async () => {
    const ON_SALE = ['Shito pepper sauce, 500 g', 'Zobo drink, 6 bottles', 'AA coffee beans, 1 kg', 'Toyota Corolla 2015'];
    const NEVER = ['Gari, 2 kg', 'Ghost pepper oil', 'Shut Shop Ltd', 'Paperwork missing', 'ACCT_SECRET_ADA'];
    const neverShown = (where: string, t: string) => expect([where, NEVER.filter((w) => t.includes(w))]).toEqual([where, []]);

    for (const vp of VIEWPORTS) {
      await withRenderedPage({ projectDir, backendPort: port }, async (page) => {
        await page.setViewport(vp);
        const look = async (name: string) => {
          errors.push({ where: `${vp.name} ${name}`, errors: [...page.consoleErrors] });
          page.consoleErrors.length = 0;
          overflow.push([`${vp.name} ${name}`, await overflowX(page)]);
          await shot(page, `${vp.name}-${name}`);
        };

        // ── the app opens on the shop: every product on sale, newest first, nothing that isn't
        await page.navigate('/');
        await untilCards(page, 'the shop drew its products', ON_SALE);
        await untilImages(page, 'every card with a photo shows its md thumbnail', 'thumb=md', 3);
        let t = await bodyText(page);
        neverShown(`${vp.name} home`, t);
        expect(t).toContain('No photo yet'); // the zobo has none
        expect(t).toMatch(/in 3 countries/);
        // Prices in the marketplace's own currency, the seller's beside it when it differs.
        expect(t).toMatch(/GH₵\s?45\b/);
        expect(t).toMatch(/GH₵\s?62[\s\S]{0,40}₦\s?6,800/);
        expect(t).toMatch(/GH₵\s?209[\s\S]{0,40}(KSh|Ksh|KES)\s?1,900/);
        expect(t).toContain('Enquire');
        expect(await chosen(page, 0)).toContain('GHS');
        if (vp.name === 'phone') {
          // AC5: what the first page cost to load, from the browser's own resource timing.
          weight.phone = JSON.parse(
            String(
              await page.evaluate(`(function () {
                var r = performance.getEntriesByType('resource'), n = performance.getEntriesByType('navigation')[0];
                var by = {}, total = n ? n.transferSize || n.encodedBodySize || 0 : 0, photos = [];
                r.forEach(function (e) {
                  if (e.name.indexOf('thumb=') >= 0) { photos.push(e.name); return; }
                  var b = e.transferSize || e.encodedBodySize || 0; by[e.initiatorType] = (by[e.initiatorType] || 0) + b; total += b;
                });
                return JSON.stringify({ total: total, requests: r.length + 1, by: by, photos: photos });
              })()`)
            )
          );
          // 🔴 The thumbnails come from the backend's origin, which sends no Timing-Allow-Origin, so the browser
          // reports their size as 0. Weigh each one as it was served instead.
          let photoBytes = 0;
          for (const url of weight.phone.photos as string[]) photoBytes += (await (await fetch(url)).arrayBuffer()).byteLength;
          weight.phone = { ...weight.phone, photos: (weight.phone.photos as string[]).length, photoBytes, total: Number(weight.phone.total) + photoBytes };
        }
        // R13: the bar and the browser tab say the marketplace's own name, read from its row.
        await until(page, 'the bar says the marketplace’s name', (x) => x.includes('Market Square'));
        expect(String(await page.evaluate('document.title'))).toBe('Market Square');
        await look('shop-home');

        // ── a currency picked re-prices every card, and the phone remembers it
        await choose(page, 'NGN', 0);
        await until(page, 'prices in naira', (x) => /₦\s?4,945/.test(x) && /prices in ₦/.test(x));
        await page.navigate('/');
        await untilCards(page, 'the shop drew again', ON_SALE);
        await until(page, 'the naira was remembered', (x) => /₦\s?4,945/.test(x));
        expect(await chosen(page, 0)).toContain('NGN');
        await choose(page, 'GHS', 0);
        await until(page, 'back to cedis', (x) => /GH₵\s?45\b/.test(x) && /prices in GH₵/.test(x));

        // ── a shelf: only what is on it; empty shelves aren't offered
        t = await bodyText(page);
        expect(t).not.toContain('Phones and laptops');
        await clickButton(page, 'Cars');
        await untilCards(page, 'the Cars shelf', ['Toyota Corolla 2015']);
        await look('shop-shelf');
        await clickButton(page, 'All');
        await untilCards(page, 'all shelves again', ON_SALE);

        // ── a search: every word must match, across name, seller and country; nothing hidden is found
        await fill(page, 'Search', 'kenya coffee');
        await untilCards(page, 'a search across words', ['AA coffee beans, 1 kg']);
        await until(page, 'the search says what it found', (x) => x.includes('Found for “kenya coffee”') && x.includes('1 product'));
        await look('shop-search');
        await fill(page, 'Search', 'ghost');
        await untilCards(page, 'a stopped seller’s product is never found', []);
        await until(page, 'nothing found, said plainly', (x) => x.includes('Nothing matches “ghost”'));
        await fill(page, 'Search', 'gari');
        await untilCards(page, 'an off-sale product is never found', []);
        await clearField(page, 'Search');
        await untilCards(page, 'the search cleared', ON_SALE);

        // ── a product (buy): photos (lg), price, seller, WhatsApp, who confirms delivery
        await clickButton(page, 'Shito pepper sauce, 500 g');
        await until(page, 'the product page drew', (x) => x.includes('Order on WhatsApp instead') && x.includes('confirms the delivery'));
        expect(await path_(page)).toBe(`/item/${ids.shito}`);
        await untilImages(page, 'its two photos, lg', 'thumb=lg', 2);
        // A phone shows one photo at a time and says there are more; a tablet shows them all and needn't.
        if (vp.name === 'phone') await until(page, 'the phone says there are more photos', (x) => x.includes('2 photos: swipe to see them all'));
        else expect(await bodyText(page)).not.toContain('swipe');
        t = await bodyText(page);
        expect(t).toContain('Kofi’s Kitchen');
        expect(t).toContain('Ghana · Food and drinks');
        expect(t).toContain('dried fish and shrimp');
        expect(String(await page.evaluate('document.title'))).toBe('Shito pepper sauce, 500 g');
        // WhatsApp opens with the seller's number and the product named.
        await page.evaluate(`window.__opened = []; window.open = function (u) { window.__opened.push(String(u)); return { closed: false, focus: function () {} }; }; true`);
        await clickButton(page, 'Order on WhatsApp instead');
        await wait(500);
        const opened = JSON.parse(String(await page.evaluate('JSON.stringify(window.__opened)'))) as string[];
        expect(opened).toHaveLength(1);
        expect(opened[0]).toMatch(/^https:\/\/wa\.me\/233245550100\?text=/);
        expect(decodeURIComponent(opened[0].split('text=')[1])).toContain('Shito pepper sauce, 500 g');
        await look('shop-product');

        // ── its seller's page: story, logo, what it has on sale (not the off-sale gari)
        await clickButton(page, 'Kofi’s Kitchen');
        await until(page, 'the seller page drew', (x) => x.includes('since 1998') && x.includes('1 product on sale'));
        expect(await path_(page)).toBe(`/seller/${ids.kofi}`);
        await untilCards(page, 'only what it has on sale', ['Shito pepper sauce, 500 g']);
        neverShown(`${vp.name} seller`, await bodyText(page));
        await untilImages(page, 'its logo', 'thumb=md', 2);
        await look('shop-seller');

        // ── an enquire product: no order, the sale settled off the site, the seller's WhatsApp
        await page.navigate(`/item/${ids.corolla}`);
        await until(page, 'the car drew', (x) => x.includes('isn’t bought here') && x.includes('Message Ring Road Motors on WhatsApp'));
        t = await bodyText(page);
        expect(t).not.toContain('Order on WhatsApp');
        expect(t).not.toContain('confirms the delivery');
        await untilImages(page, 'its three photos', 'thumb=lg', 3);
        await look('shop-enquire');

        // ── a seller with no WhatsApp: its phone instead
        await page.navigate(`/item/${ids.zobo}`);
        await until(page, 'the zobo drew', (x) => x.includes('Call Ada’s Farm Drinks: +234 80 555 0101'));
        expect(await bodyText(page)).not.toContain('Order on WhatsApp');

        // ── 🔴 what a link can't open: off sale, a stopped seller's product, a stopped seller, nothing at all
        for (const [where, url, says] of [
          ['off-sale product', `/item/${ids.gari}`, 'This product isn’t on sale now.'],
          ['stopped seller’s product', `/item/${ids.ghost}`, 'This product isn’t on sale now.'],
          ['stopped seller', `/seller/${ids.closed}`, 'Shut Shop Ltd isn’t selling here now.'],
          ['no such product', '/item/nothing-here', 'There is no such product here.']
        ]) {
          await page.navigate(url);
          const x = await until(page, `${where} says so`, (y) => y.includes(says));
          expect([where, x.includes('Ghost pepper oil') || x.includes('Gari, 2 kg') || x.includes('Order on WhatsApp')]).toEqual([where, false]);
        }
        await look('shop-gone');

        // ── sellers and the admin find their way in from the shop
        await page.navigate('/');
        await untilCards(page, 'the shop drew', ON_SALE);
        await clickButton(page, 'Sign in');
        await until(page, 'the sign-in page', (x) => x.includes('Buyers don’t need an account'));
        expect(await path_(page)).toBe('/sign-in');
      });
    }

    // Every screen, both sizes: no console error, and nothing wider than the screen.
    expect(errors.filter((e) => e.errors.length)).toEqual([]);
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
