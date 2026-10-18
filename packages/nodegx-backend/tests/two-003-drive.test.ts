/**
 * TWO-003 slice 1 — the marketplace's sellers and admin, DRIVEN: the shipped template rendered headless by the real
 * viewer, against a real backend locked with the template's own policy, at a phone (390 px) and a 10" tablet
 * (1024×640). TWO-003 AC1.
 *
 * Nothing is seeded but the two countries and the shelves (slice 3 owns the functions that set those). Everything
 * else is done through the pages, the way a person does it: the admin sets the marketplace up with the setup token,
 * signs in, adds a seller, gives it a login, signs out; the seller's staff sign in, add a product, take it off sale and
 * put it back; the admin stops the seller, and the staff sign-in is refused.
 *
 * Photos (P121-TWO008-UPLOADSHRINK): the admin gives the seller a logo (a 1200 px PNG with transparency) and the staff
 * give the product camera-sized photos (4032×3024 JPEGs), each picked through the real file input. What the backend
 * stored is read back: shrunk on the page before it was sent (1600 px, 512 px for the logo), the PNG still a PNG.
 *
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 * Every visit's console errors are collected; the drive asserts there were none.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import sharp from 'sharp';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request } from './helpers/http';
import { clickAt, clickButton, clickButtonInRow, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(300000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/marketplace');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const SETUP_TOKEN = 'drive-setup-token';
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

/** Pick the option whose words match, in the nth dropdown, the way a change from a person arrives. */
async function choose(page: RenderedPage, words: string, nth: number): Promise<void> {
  const picked = await page.evaluate(`(function () {
    var s = document.querySelectorAll('select')[${nth}];
    if (!s) return 'no select';
    var o = Array.prototype.find.call(s.options, function (x) { return x.textContent.indexOf(${JSON.stringify(words)}) >= 0; });
    if (!o) return 'no option';
    s.value = o.value;
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return o.textContent;
  })()`);
  if (!String(picked).includes(words)) throw new Error(`could not choose "${words}": ${picked}`);
  await wait(300);
}

/** A camera's photo: 4032×3024, detailed enough to weigh what a phone's does. */
async function cameraJpeg(file: string, hue: string): Promise<void> {
  const noise = await sharp({ create: { width: 4032, height: 3024, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } } as sharp.SharpOptions).png().toBuffer();
  await sharp({ create: { width: 4032, height: 3024, channels: 3, background: hue } }).composite([{ input: noise, blend: 'soft-light' }]).jpeg({ quality: 92 }).toFile(file);
}
/** A logo with a transparent corner: 1200×1200 PNG. */
async function logoPng(file: string): Promise<void> {
  const dot = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><circle cx="600" cy="600" r="560" fill="#a3271f"/></svg>');
  await sharp(dot).png().toFile(file);
}

/** The next file chooser is answered with `file`, through the real input, as a person's pick arrives. */
function answerFileChooser(page: RenderedPage): (file: string) => Promise<void> {
  const raw = page as unknown as {
    client: { send(m: string, p?: unknown): Promise<unknown> };
    onEvent(listener: (msg: { method: string; params: { backendNodeId: number } }) => void): () => void;
  };
  let next: string | undefined;
  const ready = raw.client.send('Page.setInterceptFileChooserDialog', { enabled: true });
  raw.onEvent((msg) => {
    if (msg.method !== 'Page.fileChooserOpened' || !next) return;
    const files = [next];
    next = undefined;
    void raw.client.send('DOM.setFileInputFiles', { files, backendNodeId: msg.params.backendNodeId });
  });
  return async (file: string) => {
    await ready;
    next = file;
  };
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
  throw new Error(`${what}: ${seen} images drawn from "${part}", not ${n}. The page said:\n${(await bodyText(page)).slice(0, 800)}`);
}

/** What the backend stored at `url`: its bytes and its pixels. */
async function stored(url: string): Promise<{ bytes: number; width?: number; height?: number; format?: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  return { bytes: buf.length, width: meta.width, height: meta.height, format: meta.format };
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

/** What a person can see: no horizontal scroll on the page, at this width. */
const overflowX = async (page: RenderedPage) =>
  Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

describe('TWO-003 slice 1 — sellers and the admin, driven in the rendered app', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  const errors: Array<{ where: string; errors: string[] }> = [];
  const overflow: Array<[string, number]> = [];
  const fixtures = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-drive-photos-'));
  const PHOTO_A = path.join(fixtures, 'IMG_0001.jpg');
  const PHOTO_B = path.join(fixtures, 'IMG_0002.jpg');
  const LOGO = path.join(fixtures, 'logo.png');
  /** What the drive measured of the photos, written into TWO-003 §7 by hand. */
  const photoReadings: Record<string, unknown> = {};

  beforeAll(async () => {
    await cameraJpeg(PHOTO_A, '#c0412b');
    await cameraJpeg(PHOTO_B, '#d4a017');
    await logoPng(LOGO);
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, cloudKeys(TEMPLATE))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { MARKETPLACE_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two003drive', backendName: 'TWO-003 drive', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    port = started.listen.port;
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await request(base, 'POST', '/admin/schema', { body: push, headers: master });
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    for (const c of [{ name: 'Ghana', currency: 'GHS' }, { name: 'Nigeria', currency: 'NGN' }]) await request(base, 'POST', '/classes/Country', { body: c, headers: master });
    for (const c of [{ name: 'Food and drinks' }, { name: 'Phones and laptops' }, { name: 'Cars' }]) await request(base, 'POST', '/classes/Category', { body: c, headers: master });

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-drive-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two003drive', port);
  });

  afterAll(async () => {
    await service?.stop();
    if (Object.keys(photoReadings).length) console.log('[two003 photos]', JSON.stringify(photoReadings));
  });

  it('the whole of slice 1, at a phone and a tablet', async () => {
    for (const vp of VIEWPORTS) {
      await withRenderedPage({ projectDir, backendPort: port }, async (page) => {
        await page.setViewport(vp);
        const pickNext = answerFileChooser(page);
        const look = async (name: string) => {
          errors.push({ where: `${vp.name} ${name}`, errors: [...page.consoleErrors] });
          page.consoleErrors.length = 0;
          overflow.push([`${vp.name} ${name}`, await overflowX(page)]);
          await shot(page, `${vp.name}-${name}`);
        };
        const admin = vp.name === 'phone' ? 'admin@example.com' : 'admin2@example.com';
        const seller = vp.name === 'phone' ? 'Kofi’s Kitchen' : 'Ada Phones';
        const staff = vp.name === 'phone' ? 'kofi@example.com' : 'ada@example.com';

        // ── setup (once per backend: the phone pass makes the admin, the tablet pass is refused, then signs in)
        await page.navigate('/sign-in');
        await until(page, 'the sign-in page drew', (t) => t.includes('Set up this marketplace'));
        await look('sign-in');
        if (vp.name === 'phone') {
          await clickButton(page, 'Set up this marketplace');
          await until(page, 'the setup page drew', (t) => t.includes('Make me the admin'));
          await fill(page, 'Setup token', SETUP_TOKEN);
          await fill(page, 'The marketplace’s name', 'Market Square');
          await fill(page, 'Your name', 'Admin');
          await fill(page, 'Your email', admin);
          await fill(page, 'A password', 'longenough');
          await look('setup');
          await clickButton(page, 'Make me the admin');
          await until(page, 'setup sent the admin to sign in', (t) => t.includes('Buyers don’t need an account'));
        } else {
          await page.navigate('/setup');
          await until(page, 'the setup page drew', (t) => t.includes('Make me the admin'));
          await fill(page, 'Setup token', SETUP_TOKEN);
          await fill(page, 'The marketplace’s name', 'Another name');
          await fill(page, 'Your email', admin);
          await fill(page, 'A password', 'longenough');
          await clickButton(page, 'Make me the admin');
          // 🔴 The door opens once: a second setup is refused on the page, and the admin stays the first one.
          await until(page, 'a second setup is refused', (t) => /could not be set up/i.test(t));
          await look('setup-refused');
        }

        // ── the admin signs in and lands on the sellers
        await page.navigate('/sign-in');
        await until(page, 'sign-in drew', (t) => t.includes('Buyers don’t need an account'));
        await fill(page, 'Email', 'admin@example.com');
        await fill(page, 'Password', 'longenough');
        await clickButton(page, 'Sign in');
        await until(page, 'the admin lands on the sellers', (t) => t.includes('Add a seller') && t.includes('ADMIN'));
        expect(await path_(page)).toBe('/admin/sellers');
        // R13: the bar says the name set-up gave it, the first one (the second set-up was refused).
        await until(page, 'the bar says the marketplace’s name', (t) => t.includes('Market Square'));
        expect(await bodyText(page)).not.toContain('Another name');
        await look('admin-sellers');

        // ── s19: the admin renames the marketplace, from the sellers page (no tab of its own)
        if (vp.name === 'phone') {
          await clickButton(page, 'Rename the marketplace');
          await until(page, 'the rename page drew', (t) => t.includes('Save the name') && t.includes('60 characters at most'));
          expect(await path_(page)).toBe('/admin/name');
          await look('admin-rename');
          await fill(page, 'Name', 'x'.repeat(61));
          await clickButton(page, 'Save the name');
          await until(page, 'a name too long is refused in words', (t) => t.includes('60 characters or fewer'));
          await look('admin-rename-refused');
          await fill(page, 'Name', 'Market Square Accra');
          await clickButton(page, 'Save the name');
          await until(page, 'saved, and the bar says the new name at once', (t) => t.includes('Saved. Every page shows the new name.') && t.includes('Market Square Accra'));
          // The refusal before it is gone once the name is saved (the shot showed both, s19).
          expect(await bodyText(page)).not.toContain('60 characters or fewer');
          await look('admin-renamed');
          await clickButton(page, 'Back to the sellers');
          await until(page, 'back on the sellers, under the new name', (t) => t.includes('Add a seller') && t.includes('Market Square Accra'));
        } else {
          // A second browser, a fresh page: the name it reads is the renamed one.
          await until(page, 'the other browser reads the new name', (t) => t.includes('Market Square Accra'));
        }
        const named = await request<{ results: Array<{ name: string }> }>(base, 'GET', '/classes/Marketplace', { headers: master });
        expect(named.json.results.map((r) => r.name)).toEqual(['Market Square Accra']);

        // ── add a seller
        await clickButton(page, 'Add a seller');
        await until(page, 'the new-seller form drew', (t) => t.includes('Add a seller') && t.includes('Payout account'));
        await look('seller-form');
        await fill(page, 'Name', seller);
        if (vp.name === 'tablet') await choose(page, 'Nigeria', 0);
        await fill(page, 'Phone', '+233 20 000 0000');
        await fill(page, 'WhatsApp', '+233 20 000 0000');
        await fill(page, 'story', 'Made in our kitchen since 1998.');
        await fill(page, 'Payout account', `ACCT_${vp.name}`);
        // ── its logo: a 1200 px PNG, shrunk to 512 on the page, still a PNG
        await pickNext(LOGO);
        await clickButton(page, 'Choose a logo');
        await untilImages(page, 'the logo shows on the form', 'thumb=md', 1);
        await look('seller-form-logo');
        await clickButton(page, 'Save');
        await until(page, 'the seller is on the list', (t) => t.includes(seller) && t.includes('0 products'));
        // The tablet pass finds the phone pass's seller on the list too, with its logo.
        await untilImages(page, 'the logo shows on the list', 'thumb=sm', vp.name === 'phone' ? 1 : 2);
        const withLogo = await request<{ results: Array<{ objectId: string; logo?: { url: string; name: string } }> }>(
          base,
          'GET',
          `/classes/Seller?where=${encodeURIComponent(JSON.stringify({ name: seller }))}`,
          { headers: master }
        );
        const logo = await stored(String(withLogo.json.results[0]?.logo?.url));
        const sellerId = withLogo.json.results[0].objectId;
        photoReadings[`${vp.name} logo`] = { picked: fs.statSync(LOGO).size, stored: logo };
        expect([logo.format, Math.max(logo.width || 0, logo.height || 0)]).toEqual(['png', 512]);
        const sellersText = await bodyText(page);
        expect(sellersText).toContain(vp.name === 'phone' ? 'Ghana' : 'Nigeria');
        await look('admin-sellers-one');

        // ── give it a login
        await clickButtonInRow(page, 'Give a login', seller);
        await until(page, 'the login form drew', (t) => t.includes('Give the login') && t.includes(seller));
        await fill(page, 'Their name', 'Staff');
        await fill(page, 'Their email', staff);
        await fill(page, 'A password', 'longenough');
        await look('give-login');
        await clickButton(page, 'Give the login');
        await until(page, 'the seller now has a login', (t) => t.includes(seller) && t.includes('1 login'));

        // ── the staff member signs in, lands on their orders (slice 4: none yet), opens Products, adds one
        await clickButton(page, 'Sign out');
        await until(page, 'signed out to sign in', (t) => t.includes('Buyers don’t need an account'));
        await fill(page, 'Email', staff);
        await fill(page, 'Password', 'longenough');
        await clickButton(page, 'Sign in');
        await until(page, 'the staff land on their orders', (t) => t.includes('Your orders') && t.includes('No orders yet') && t.includes(seller.toUpperCase()));
        expect(await path_(page)).toBe('/orders');
        await clickButton(page, 'Products');
        await until(page, 'the staff’s products', (t) => t.includes('Your products') && t.includes(seller.toUpperCase()));
        expect(await path_(page)).toBe('/products/mine');
        await look('seller-products-empty');
        await clickButton(page, 'Add a product');
        await until(page, 'the product form drew', (t) => t.includes('Save and put on sale'));
        await fill(page, 'Name', 'Shito pepper sauce, 500 g');
        await fill(page, 'Description', 'Hot, in a jar.');
        await fill(page, 'Price', '45');
        // ── its photos: camera-sized JPEGs, shrunk to 1600 px on the page before they go
        await pickNext(PHOTO_A);
        await clickButton(page, '+ Add a photo');
        await untilImages(page, 'the first photo is on the form', 'thumb=md', 1);
        if (vp.name === 'phone') {
          await pickNext(PHOTO_B);
          await clickButton(page, '+ Add a photo');
          await untilImages(page, 'the second photo is on the form', 'thumb=md', 2);
          await look('product-form-photos');
          // Take the second one off again: one Remove per tile, and the last tile is the second photo.
          const at = JSON.parse(
            String(
              await page.evaluate(`(function () {
                var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) { return x.innerText.trim() === 'Remove'; });
                var last = b[b.length - 1];
                last.scrollIntoView({ block: 'center', behavior: 'instant' });
                var r = last.getBoundingClientRect();
                return JSON.stringify({ n: b.length, x: r.left + r.width / 2, y: r.top + r.height / 2 });
              })()`)
            )
          ) as { n: number; x: number; y: number };
          expect(at.n).toBe(2);
          await clickAt(page, at.x, at.y);
          await untilImages(page, 'a photo is taken off', 'thumb=md', 1);
        }
        // 🔴 No shelf is chosen for you: saving without one is refused, with the reason on the page.
        await clickButton(page, 'Save and put on sale');
        await until(page, 'saving with no shelf is refused', (t) => t.includes('Put the product on a shelf'));
        await choose(page, 'Food and drinks', 0);
        await look('product-form');
        await clickButton(page, 'Save and put on sale');
        const listed = await until(page, 'the product is on the list, on sale', (t) => t.includes('Shito pepper sauce') && t.includes('On sale'));
        expect(listed).toContain('Food and drinks');
        expect(listed).toMatch(vp.name === 'phone' ? /GH₵\s?45/ : /₦\s?45/);
        // The band says who is signed in, under the bar, above the page.
        expect(listed.indexOf('SIGNED IN AS')).toBeLessThan(listed.indexOf('Your products'));
        await untilImages(page, 'the product row shows its photo', 'thumb=sm', 1);
        await look('seller-products-one');
        const product = await request<{ results: Array<{ photos?: Array<{ url: string; name: string }> }> }>(
          base,
          'GET',
          `/classes/Product?where=${encodeURIComponent(JSON.stringify({ seller: { __type: 'Pointer', className: 'Seller', objectId: sellerId } }))}`,
          { headers: master }
        );
        expect(product.json.results).toHaveLength(1);
        const photos = product.json.results[0]?.photos || [];
        expect(photos).toHaveLength(1);
        const photo = await stored(photos[0].url);
        photoReadings[`${vp.name} photo`] = { picked: fs.statSync(PHOTO_A).size, stored: photo };
        expect([photo.format, photo.width, photo.height]).toEqual(['jpeg', 1600, 1200]);
        expect(photo.bytes).toBeLessThan(fs.statSync(PHOTO_A).size / 4);

        if (vp.name === 'phone') {
          // 🔴 A photo taken off on a form left unsaved is back when the product is opened again.
          await clickButtonInRow(page, 'Edit', 'Shito pepper sauce');
          await until(page, 'the edit form drew', (t) => t.includes('Edit Shito pepper sauce'));
          await untilImages(page, 'the saved photo is on the edit form', 'thumb=md', 1);
          await clickButton(page, 'Remove');
          await untilImages(page, 'the photo is off the form', 'thumb=md', 0);
          await clickButton(page, '← Products');
          await until(page, 'back on the products', (t) => t.includes('Your products'));
          await clickButtonInRow(page, 'Edit', 'Shito pepper sauce');
          await until(page, 'the edit form drew again', (t) => t.includes('Edit Shito pepper sauce'));
          await untilImages(page, 'the unsaved removal did not stick', 'thumb=md', 1);
          await clickButton(page, '← Products');
          await until(page, 'back on the products again', (t) => t.includes('Your products'));
        }

        // ── take it off sale, then put it back
        await clickButtonInRow(page, 'Take off sale', 'Shito pepper sauce');
        await until(page, 'it is off sale', (t) => t.includes('Off sale') && t.includes('Put on sale'));
        await look('seller-products-off');
        await clickButtonInRow(page, 'Put on sale', 'Shito pepper sauce');
        await until(page, 'it is back on sale', (t) => t.includes('On sale') && t.includes('Take off sale'));

        // ── 🔴 a seller's staff can't open the admin's pages
        await page.navigate('/admin/sellers');
        const asStaff = await until(page, 'the admin page refuses the staff', (t) => t.includes('This page is the admin’s'), 15000);
        expect(asStaff).not.toContain('Add a seller');
        expect(asStaff).not.toContain('Give a login');

        // ── the admin stops the seller; the staff can no longer sign in
        await page.navigate('/sign-in');
        await until(page, 'sign-in drew', (t) => t.includes('Buyers don’t need an account'));
        await fill(page, 'Email', 'admin@example.com');
        await fill(page, 'Password', 'longenough');
        await clickButton(page, 'Sign in');
        await until(page, 'the admin is back on the sellers', (t) => t.includes('Add a seller') && t.includes(seller) && t.includes('1 product'));
        await clickButtonInRow(page, 'Stop', seller);
        await until(page, 'the stop page drew', (t) => t.includes('Stop this seller'));
        await fill(page, 'Why', 'Paperwork missing');
        await look('stop-seller');
        await clickButton(page, 'Stop this seller');
        await until(page, 'back on the sellers after stopping', (t) => t.includes('Add a seller') && t.includes('Bring back'));
        const stopped = await request<{ results: Array<{ endedAt?: unknown; stoppedReason?: string }> }>(
          base,
          'GET',
          `/classes/Seller?where=${encodeURIComponent(JSON.stringify({ name: seller }))}`,
          { headers: master }
        );
        expect([Boolean(stopped.json.results[0]?.endedAt), stopped.json.results[0]?.stoppedReason]).toEqual([true, 'Paperwork missing']);
        await look('admin-sellers-stopped');
        await clickButton(page, 'Sign out');
        await until(page, 'signed out', (t) => t.includes('Buyers don’t need an account'));
        await fill(page, 'Email', staff);
        await fill(page, 'Password', 'longenough');
        await clickButton(page, 'Sign in');
        await until(page, 'the stopped seller’s login is refused', (t) => /disabled/i.test(t));
        await look('staff-refused');
      });
    }

    // Every screen, both sizes: no console error, and nothing wider than the screen.
    // The runtime logs a refusal it reports even when the page shows it. Four screens provoke one on purpose (a second
    // setup, a product saved with no shelf, a stopped seller's sign-in, a name too long); there, only that refusal may
    // appear. Everywhere else: nothing.
    const provoked: Record<string, RegExp> = {
      'setup-refused': /could not be set up/,
      'product-form': /Put the product on a shelf/,
      'staff-refused': /This account is disabled/,
      'admin-rename-refused': /60 characters or fewer/
    };
    const unexpected = errors
      .map((e) => {
        const allowed = Object.entries(provoked).find(([screen]) => e.where.endsWith(screen))?.[1];
        return { where: e.where, errors: e.errors.filter((m) => !(allowed && allowed.test(m))) };
      })
      .filter((e) => e.errors.length);
    expect(unexpected).toEqual([]);
    expect(errors.filter((e) => e.where.endsWith('staff-refused')).map((e) => e.errors.length)).toEqual([1, 1]);
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
