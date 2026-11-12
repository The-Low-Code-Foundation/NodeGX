/**
 * TWO-003 slice 5 — enquire, DRIVEN: the shipped template rendered headless by the real viewer, against a real backend
 * locked with the template's own policy, at a phone (390 px) and a 10" tablet (1024×640). TWO-003 AC1 (slice 5).
 *
 * The marketplace, the sellers, their products and logins are made through the functions over HTTP (slices 1 and 2
 * drive their own pages). Everything after is the pages: a buyer with no account asks about the Corolla on its page
 * (refused in words until it has a name and a number with its country code); a product bought through the basket has no
 * form; the Corolla's seller reads it on their Enquiries tab and marks it answered (the phone also unmarks it); the
 * other seller sees only the enquiry about their own van; the admin reads every one; a stranger is refused.
 *
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request, type ParseDate, type ParseRecord } from './helpers/http';
import { clickButton, clickButtonInRow, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(420000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/marketplace');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const SETUP_TOKEN = 'setup-token-two003-enquire-drive';

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

/** The text of the section headed `heading`: walk up from its h2 until the next step would take in another h2 or the h1. */
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
const sections = async (page: RenderedPage) => JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('h2'), function (x) { return (x.innerText || '').trim(); }))`))) as string[];
/** The labels of the inputs on screen, so "the form is gone" is a reading of the fields, not of the words around them. */
const fieldLabels = async (page: RenderedPage) =>
  JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('input, textarea'), function (i) { var l = i.id && document.querySelector('label[for="' + i.id + '"]'); return (l ? l.textContent : '').trim(); }))`))) as string[];
/** Every tab button: its words and where it sits, and how far its bar scrolls. */
const tabsOnScreen = async (page: RenderedPage) =>
  JSON.parse(
    String(
      await page.evaluate(`JSON.stringify({
        tabs: Array.prototype.map.call(document.querySelectorAll('.mk-tab'), function (b) { var r = b.getBoundingClientRect(); return { w: (b.innerText || '').trim(), on: b.className.indexOf('mk-tab-on') >= 0, h: Math.round(r.height), left: r.left, right: r.right }; }),
        scrolls: (function () { var b = document.querySelector('.mk-tab'); var bar = b && b.parentElement; return bar ? bar.scrollWidth > bar.clientWidth : false; })(),
        scrolledDown: window.scrollY + Array.prototype.filter.call(document.querySelectorAll('*'), function (e) { return e.scrollTop > 0; }).length
      })`)
    )
  ) as { tabs: Array<{ w: string; on: boolean; h: number; left: number; right: number }>; scrolls: boolean; scrolledDown: number };

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

describe('TWO-003 slice 5 — a buyer asks a seller about a car; only that seller reads it and marks it answered, driven', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  let admin: Record<string, string> = {};
  const errors: Array<{ where: string; errors: string[] }> = [];
  const overflow: Array<[string, number]> = [];
  const ids: Record<string, string> = {};

  type Row = Record<string, unknown>;
  /** An Enquiry row, as far as this drive reads one. */
  interface Enquiry extends ParseRecord {
    answeredAt?: ParseDate;
  }
  const fnCall = async (fn: string, body: Record<string, unknown>, headers: Record<string, string> = admin) => {
    const r = await request<{ result?: Row }>(base, 'POST', `/functions/${fn}`, { body, headers });
    if (r.status !== 200) throw new Error(`${fn}: ${r.status} ${r.text}`);
    return r.json.result ?? {};
  };
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}) =>
    (await request<{ results: T[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt&limit=1000`, { headers: master })).json.results;
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-enquire-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, cloudKeys(TEMPLATE))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003enquire', backendName: 'TWO-003 enquire drive', authToken: 't0k' });
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
    await fnCall('saveRates', { rates: { rates: [{ currency: 'GHS', value: 1 }] } });
    const cars = String((await fnCall('saveShelf', { shelf: { name: 'Cars' } })).id);
    const food = String((await fnCall('saveShelf', { shelf: { name: 'Food and drinks' } })).id);
    await fnCall('saveWayToPay', { way: { method: 'on-delivery', countries: [ids.gh] } });
    ids.motors = String((await fnCall('saveSeller', { seller: { name: 'Ring Road Motors', country: ids.gh, whatsapp: '+233 24 555 0300' } })).id);
    ids.kofi = String((await fnCall('saveSeller', { seller: { name: 'Kofi’s Kitchen', country: ids.gh, phone: '+233 24 555 0100' } })).id);
    ids.corolla = String((await fnCall('saveProduct', { product: { seller: ids.motors, name: 'Toyota Corolla 2015', price: 98000, mode: 'enquire', category: cars, description: '84,000 km · automatic · petrol · one owner' } })).id);
    ids.van = String((await fnCall('saveProduct', { product: { seller: ids.kofi, name: 'Delivery van', price: 60000, mode: 'enquire', category: cars } })).id);
    ids.shito = String((await fnCall('saveProduct', { product: { seller: ids.kofi, name: 'Shito pepper sauce, 500 g', price: 45, mode: 'buy', category: food } })).id);
    await fnCall('giveLogin', { login: { sellerId: ids.motors, name: 'Motors', email: 'motors@example.com', password: 'longenough' } });
    await fnCall('giveLogin', { login: { sellerId: ids.kofi, name: 'Kofi', email: 'kofi@example.com', password: 'longenough' } });
    // Someone else asked Kofi about his van: no seller but Kofi (and the admin) may read it.
    await fnCall('sendEnquiry', { enquiry: { productId: ids.van, buyerName: 'Ama Owusu', contact: '+233 26 555 0123', message: 'Can it carry 500 kg?' } }, {});

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-enquire-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two003enquire', port);
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('a buyer asks about the Corolla on its page; its seller reads it and marks it answered; nobody else’s seller sees it', async () => {
    for (const vp of VIEWPORTS) {
      const first = vp.name === 'phone';
      const buyer = first ? 'Kwame Mensah' : 'Efua Asante';
      const number = first ? '+233 24 555 0187' : '+233 20 555 0111';

      await withRenderedPage({ projectDir, backendPort: port }, async (page) => {
        await page.setViewport(vp);
        const look = async (name: string, allowed: RegExp | null = null) => {
          const seen = [...page.consoleErrors];
          page.consoleErrors.length = 0;
          errors.push({ where: `${vp.name} ${name}`, errors: allowed ? seen.filter((e) => !allowed.test(e)) : seen });
          overflow.push([`${vp.name} ${name}`, await overflowX(page)]);
          await shot(page, `${vp.name}-enquire-${name}`);
        };
        const signInAs = async (email: string) => {
          await page.navigate('/sign-in');
          await until(page, 'the sign-in page', (x) => x.includes('Buyers don’t need an account'));
          await fill(page, 'Email', email);
          await fill(page, 'Password', 'longenough');
          await clickButton(page, 'Sign in');
        };
        const signOut = async () => {
          await clickButton(page, 'Sign out');
          await until(page, 'signed out', (x) => x.includes('Buyers don’t need an account'));
        };

        // ── a buy product has no form: it goes in the basket
        await page.navigate(`/item/${ids.shito}`);
        await until(page, 'the shito’s page', (x) => x.includes('Shito pepper sauce, 500 g') && x.includes('Add to basket'));
        expect((await fieldLabels(page)).filter((l) => /Your/.test(l))).toEqual([]);

        // ── the Corolla: the form, the seller's WhatsApp beside it, no basket
        await page.navigate(`/item/${ids.corolla}`);
        let t = await until(page, 'the Corolla’s page', (x) => x.includes('Toyota Corolla 2015') && x.includes('Send to Ring Road Motors'));
        expect([t.includes('isn’t bought here'), t.includes('Message Ring Road Motors on WhatsApp'), t.includes('Add to basket')]).toEqual([true, true, false]);
        expect(await fieldLabels(page)).toEqual(['Your name', 'Your phone or WhatsApp, with the country code', 'Your message']);
        await look('product');

        // ── refused in words: no name; then a number without its country code
        await clickButton(page, 'Send to Ring Road Motors');
        await until(page, 'refused with no name', (x) => x.includes('Say who the message is from.'));
        await fill(page, 'Your name', buyer);
        await fill(page, 'Your phone', first ? '024 555 0187' : '020 555 0111');
        await fill(page, 'Your message', first ? 'Is it still for sale? Can I see it on Saturday?' : 'Does it have air conditioning?');
        await clickButton(page, 'Send to Ring Road Motors');
        await until(page, 'refused with no country code', (x) => x.includes('with its country code, like +233 24 555 0187'));
        await look('refused', /who the message is from|country code/);
        expect(await rows('Enquiry', { product: ptr('Product', ids.corolla) })).toHaveLength(first ? 0 : 1);

        // ── sent: the form gives way to who has it and where they'll reach you
        await fill(page, 'Your phone', number);
        await clickButton(page, 'Send to Ring Road Motors');
        t = await until(page, 'sent', (x) => x.includes(`Sent to Ring Road Motors. They’ll reach you on ${number.split(' ').join('\u00a0')}, and you agree the rest between you.`));
        expect(t.includes('with its country code')).toBe(false);
        expect((await fieldLabels(page)).filter((l) => /Your/.test(l))).toEqual([]);
        expect(t).toContain('Message Ring Road Motors on WhatsApp');
        const kept = (await rows('Enquiry', { product: ptr('Product', ids.corolla) })).find((q) => q.buyerName === buyer);
        expect([kept?.contact, kept?.answeredAt ?? null]).toEqual([number, null]);
        await look('sent');

        // ── the Corolla's seller: Enquiries, to answer
        await signInAs('motors@example.com');
        await until(page, 'Motors lands on its orders', (x) => x.includes('Your orders'));
        await clickButton(page, 'Enquiries');
        await until(page, 'Motors’ enquiries', (x) => x.includes('To answer') && x.includes(buyer));
        expect(await path_(page)).toBe('/enquiries');
        const open = first ? 'To answer (1)' : 'To answer (2)';
        const card = await section(page, open);
        expect(card).toContain('Toyota Corolla 2015');
        expect(card).toContain(`${buyer} · ${number} · sent ${today}`);
        expect(card).toContain(first ? 'Is it still for sale? Can I see it on Saturday?' : 'Does it have air conditioning?');
        expect(card).toContain(`WhatsApp ${buyer.split(' ')[0]}`);
        expect(card).toContain(`Call ${number}`);
        // 🔴 nothing about Kofi's van
        t = await bodyText(page);
        expect([t.includes('Ama Owusu'), t.includes('Delivery van')]).toEqual([false, false]);
        // The seller's three tabs, all on screen.
        const staffTabs = await tabsOnScreen(page);
        expect(staffTabs.tabs.map((x) => [x.w, x.on])).toEqual([['Orders', false], ['Products', false], ['Enquiries', true]]);
        expect(staffTabs.tabs.filter((x) => x.left < 0 || x.right > vp.width + 0.5).map((x) => x.w)).toEqual([]);
        await look('staff-open');

        // ── marked answered (the phone unmarks it too)
        await clickButtonInRow(page, 'Mark answered', buyer);
        await until(page, 'answered', (x) => x.includes('Answered (1)') && x.includes(`answered ${today}`));
        expect(await sections(page)).toEqual(first ? ['Answered (1)'] : ['To answer (1)', 'Answered (1)']);
        expect((await rows<Enquiry>('Enquiry', { buyerName: buyer }))[0].answeredAt?.iso).toEqual(expect.any(String));
        await look('staff-answered');
        if (first) {
          await clickButtonInRow(page, 'Not answered yet', buyer);
          await until(page, 'not answered yet', (x) => x.includes('To answer (1)') && !x.includes('Answered ('));
          expect((await rows('Enquiry', { buyerName: buyer }))[0].answeredAt ?? null).toBe(null);
        }
        await signOut();

        // ── Kofi reads only the van's
        await signInAs('kofi@example.com');
        await until(page, 'Kofi lands on his orders', (x) => x.includes('Your orders'));
        await clickButton(page, 'Enquiries');
        t = await until(page, 'Kofi’s enquiries', (x) => x.includes('Ama Owusu'));
        expect([t.includes('Delivery van'), t.includes('Can it carry 500 kg?'), t.includes(buyer), t.includes('Toyota Corolla')]).toEqual([true, true, false, false]);
        await signOut();

        // ── the admin reads every one, each with its seller; on a phone the six tabs scroll, the page doesn't
        await signInAs('admin@example.com');
        await until(page, 'the admin lands on Sellers', (x) => x.includes('Add a seller'));
        await clickButton(page, 'Enquiries');
        t = await until(page, 'every enquiry', (x) => x.includes('Every enquiry') && x.includes('Ama Owusu') && x.includes(buyer));
        expect(t).toContain('Ring Road Motors');
        expect(t).toContain('Kofi’s Kitchen');
        let tabs = await tabsOnScreen(page);
        expect(tabs.tabs.map((x) => x.w)).toEqual(['Sellers', 'Orders', 'Enquiries', 'Ways to pay', 'Rates', 'Shelves']);
        expect(new Set(tabs.tabs.map((x) => x.h)).size).toBe(1);
        const onScreen = (x: { left: number; right: number }) => x.left >= -0.5 && x.right <= vp.width + 0.5;
        expect(tabs.tabs.filter((x) => x.on && onScreen(x)).map((x) => x.w)).toEqual(['Enquiries']);
        if (first) expect(tabs.scrolls).toBe(true);
        else expect(tabs.tabs.filter((x) => !onScreen(x)).map((x) => x.w)).toEqual([]);
        await look('admin-enquiries');
        // The last tab's page: on a phone its tab is brought into view in the bar.
        await page.navigate('/admin/shelves');
        await until(page, 'the shelves', (x) => x.includes('Add the shelf') && x.includes('2 products'));
        await wait(1200);
        tabs = await tabsOnScreen(page);
        expect(tabs.tabs.filter((x) => x.on && onScreen(x)).map((x) => x.w)).toEqual(['Shelves']);
        // P121-TWO003-SCROLLINTOVIEW: the tab's Scroll Into View moves the bar, and nothing scrolls down.
        expect(tabs.scrolledDown).toBe(0);
        await look('admin-shelves');
        await signOut();

        // ── a stranger is refused, and sees no enquiry
        await page.navigate('/enquiries');
        await until(page, 'a stranger is refused', (x) => x.includes('Sign in to see this page.') || x.includes('This page is for the marketplace’s sellers and its admin.'));
        t = await bodyText(page);
        expect([t.includes(buyer), t.includes('Ama Owusu')]).toEqual([false, false]);
        await look('stranger', /auth|session|permission|forbidden|401|403|sellers and its admin/i);
      });
    }

    expect(errors.filter((e) => e.errors.length)).toEqual([]);
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
