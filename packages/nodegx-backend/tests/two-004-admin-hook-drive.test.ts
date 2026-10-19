/**
 * TWO-004 §9.1 — the admin app's "Paystack signature" webhook, DRIVEN: the served admin page (`/_admin`, the bundle
 * `tests/global-setup.js` builds) in headless Chrome, against a real backend carrying the marketplace's functions, at
 * a 10" tablet (1024×640) and a laptop (1440×900).
 *
 * It follows the builder's setup page (`templates/marketplace/docs/PAYING-BY-CARD.md` §5) as written: Triggers, a new
 * trigger, "When called from outside", the function `paystackEvent`, a path, "Paystack signature", that business's key,
 * Create. Then what the page promises: the key is needed to create, it is never handed back, the URL on screen is the
 * one that answers a call Paystack signed (and refuses one it didn't), an edit with the box left blank keeps the key,
 * and there is no Rotate button.
 *
 * The oracle for "the hook works" is a signed POST to the URL READ OFF THE SCREEN, never one this file builds.
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import { execFile } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import { PAYSTACK_KEY_PLACEHOLDER } from '../src/admin/app/views/triggers';
import type { TriggerView } from '../src/server/admin-triggers';
import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { FakePaystack, startFakePaystack } from './helpers/fake-paystack';
import { request } from './helpers/http';
import { clickAt, clickButton, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(420000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/marketplace');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const KEYS = { tablet: 'sk_test_hookdrive_ghana', laptop: 'sk_test_hookdrive_nigeria' };
const SLUGS = { tablet: 'paystack-ghs', laptop: 'paystack-ngn' };
const NAMES = { tablet: 'Paystack Ghana', laptop: 'Paystack Nigeria' };

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
      // between two documents: ask again
    }
    await wait(250);
  }
  throw new Error(`${what}: never happened. The page said:\n${text.slice(0, 2500)}`);
}

/**
 * Click the label (a radio, a tile) or option whose words start with `words`, where a person's finger lands: scrolled
 * into view, and only if the point is inside it (`el.contains(at)`), so a label behind the drawer's footer is a finding.
 */
async function clickText(page: RenderedPage, selector: string, words: string): Promise<void> {
  const locate = `(function () {
    var want = ${JSON.stringify(words)};
    var hits = Array.prototype.filter.call(document.querySelectorAll(${JSON.stringify(selector)}), function (el) {
      return (el.innerText || '').trim().indexOf(want) === 0 && el.getBoundingClientRect().width > 0;
    });
    if (hits.length !== 1) return 'no:' + hits.length;
    var el = hits[0];
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    var r = el.getBoundingClientRect(), x = r.left + Math.min(24, r.width / 2), y = r.top + r.height / 2;
    var at = document.elementFromPoint(x, y);
    if (!at || !el.contains(at)) return 'blocked:' + (at ? at.tagName + '.' + at.className : 'null');
    return JSON.stringify({ x: x, y: y });
  })()`;
  const r = String(await page.evaluate(locate));
  if (!r.startsWith('{')) throw new Error(`"${words}" (${selector}): ${r}`);
  const { x, y } = JSON.parse(r) as { x: number; y: number };
  await clickAt(page, x, y);
}

/** The words on a button, and whether a person can press it. */
const buttonState = async (page: RenderedPage, label: string) =>
  JSON.parse(
    String(
      await page.evaluate(`JSON.stringify(Array.prototype.filter.call(document.querySelectorAll('button'), function (b) {
        return (b.innerText || '').trim() === ${JSON.stringify(label)};
      }).map(function (b) { return { disabled: b.disabled, title: b.title || '' }; }))`)
    )
  ) as Array<{ disabled: boolean; title: string }>;

/**
 * 🔴 Not a phone: the admin app has no narrow layout at all (no `@media` rule in `admin/ui/styles.css`; at 390 px its
 * 208 px sidebar stays and every page runs off the right, bug P121-TWO004-ADMINNARROW). A builder sets a backend up
 * on a computer, so the drive takes a 10" tablet and a laptop, and MEASURES the narrow widths for the bug instead.
 */
const VIEWPORTS = [
  { name: 'tablet' as const, width: 1024, height: 640, mobile: false },
  { name: 'laptop' as const, width: 1440, height: 900, mobile: false }
];
const NARROW = [390, 600, 768, 900];

async function shot(page: RenderedPage, name: string): Promise<void> {
  if (process.env.TWO003_SHOTS === '0') return;
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SHOTS, `two004-hook-${name}.png`), Buffer.from(r.data, 'base64'));
}
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

const paystackSigned = (body: string, key: string) => crypto.createHmac('sha512', key).update(body).digest('hex');

describe('TWO-004 — a builder adds Paystack’s webhook in the admin app, as the setup page says, driven', () => {
  let service: BackendService;
  let fake: FakePaystack;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  const overflow: Array<[string, number]> = [];
  const seen: string[] = [];
  let person = '';

  beforeAll(async () => {
    fake = await startFakePaystack([KEYS.tablet, KEYS.laptop]);
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two004-hook-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'marketplace.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, cloudKeys(TEMPLATE))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(
      path.join(dataDir, 'secrets.json'),
      JSON.stringify({ functions: { PAYSTACK_SECRET_KEY_GHS: KEYS.tablet, PAYSTACK_SECRET_KEY_NGN: KEYS.laptop, PAYSTACK_API_URL: fake.url } })
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'two004hook', backendName: 'TWO-004 hook drive', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    port = started.listen.port;
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await request(base, 'POST', '/admin/schema', { body: push, headers: master });
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    // The builder has already made their own account on the admin page (BMG-014's setup step); they sign in as it.
    const made = await request<{ sessionToken: string }>(base, 'POST', '/_admin/setup', { body: { email: 'builder@example.com', password: 'longenough' }, headers: master });
    if (made.status !== 201) throw new Error(`setup: ${made.status} ${made.text}`);
    person = made.json.sessionToken;
    // withRenderedPage needs a project to open the tab on; the drive leaves it for the admin page at once.
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two004-hook-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two004hook', port);
  });

  afterAll(async () => {
    await service?.stop();
    await fake?.close();
  });

  it('creates the hook from the setup page’s steps; the URL on screen answers Paystack’s signature; an edit keeps the key', async () => {
    await withRenderedPage({ projectDir, backendPort: port }, async (page) => {
      // The narrow widths, measured for the bug: how far the Triggers page and a new hook's drawer run off the right.
      await page.evaluate(`location.href = ${JSON.stringify(base + '/_admin')}`);
      await until(page, 'the admin page', (t) => t.length > 0);
      await page.evaluate(`localStorage.setItem('nodegx.admin.person', JSON.stringify({ kind: 'session', value: ${JSON.stringify(person)} })); location.hash = '#/triggers/new'; location.reload(); true`);
      await until(page, 'the new trigger drawer', (t) => t.includes('When called from outside'));
      for (const width of NARROW) {
        await page.setViewport({ width, height: 800, mobile: false });
        await wait(400);
        const sidebar = Number(await page.evaluate(`(function () { var n = document.querySelector('nav, aside, .sidebar'); return n ? Math.round(n.getBoundingClientRect().width) : -1; })()`));
        seen.push(`at ${width} px: the drawer page runs ${await overflowX(page)} px off the right; sidebar ${sidebar} px`);
        if (width === 390) await shot(page, 'narrow-390-drawer');
      }
      await page.evaluate(`location.hash = '#/triggers'; true`);

      for (const vp of VIEWPORTS) {
        await page.setViewport({ width: vp.width, height: vp.height, mobile: vp.mobile });
        const key = KEYS[vp.name];
        const slug = SLUGS[vp.name];

        // Signed in as the builder (the page keeps a person's session in this browser's localStorage), then Triggers.
        await page.evaluate(`location.href = ${JSON.stringify(base + '/_admin')}`);
        await until(page, 'the admin page', (t) => t.length > 0);
        await page.evaluate(`localStorage.setItem('nodegx.admin.person', JSON.stringify({ kind: 'session', value: ${JSON.stringify(person)} })); location.hash = '#/triggers'; location.reload(); true`);
        await until(page, 'the Triggers page', (t) => t.includes('New trigger'));
        await shot(page, `${vp.name}-1-triggers`);

        // 1. "open Triggers and add a trigger"
        await clickButton(page, 'New trigger');
        await until(page, 'the drawer', (t) => t.includes('When called from outside'));
        await fill(page, 'What it does', NAMES[vp.name]);
        // 2. "Pick When called from outside, and the function paystackEvent"
        await clickText(page, 'label.tile', 'When called from outside');
        await until(page, 'the hook fields', (t) => t.includes('Paystack signature'));
        await fill(page, 'Type a function name', 'paystackEvent');
        await until(page, 'the function in the list', (t) => t.includes('paystackEvent'));
        await clickText(page, '[role=option]', 'paystackEvent');
        // 3. "Give it a path, such as paystack-ghs"
        await fill(page, 'stripe-payments', slug);
        // 4. "Pick Paystack signature. Then paste that business's secret key"
        await clickText(page, 'label.check', 'Paystack signature');
        await until(page, 'the key box', () => true, 500);
        seen.push(`${vp.name}: schemes checked: ${await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('input[name=scheme]'), function (i) { return (i.parentElement.innerText || '').trim() + '=' + i.checked; }))`)}`);
        await shot(page, `${vp.name}-2a-picked-paystack`);
        const keyBox = JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('input[aria-label="Paystack secret key"]'), function (i) { return { type: i.type, placeholder: i.placeholder, w: i.getBoundingClientRect().width }; }))`))) as Array<{ type: string; placeholder: string; w: number }>;
        if (keyBox.length !== 1) throw new Error(seen.join('\n'));
        expect(keyBox).toHaveLength(1);
        expect(keyBox[0].type).toBe('password');
        expect(keyBox[0].w).toBeGreaterThan(150);
        // No key yet: Create can't be pressed.
        expect(await buttonState(page, 'Create')).toEqual([{ disabled: true, title: 'Paste the Paystack secret key the hook checks with.' }]);
        seen.push(`${vp.name}: before the key, the drawer says: ${(await bodyText(page)).split('\n').filter((l) => /key|Paste|Create/i.test(l)).join(' | ')}`);
        await shot(page, `${vp.name}-2-no-key-yet`);

        await fill(page, 'sk_test_', key);
        expect((await buttonState(page, 'Create'))[0].disabled).toBe(false);
        const urlOnScreen = String(await page.evaluate(`(document.querySelector('[data-webhook-url]') || {}).innerText || ''`)).trim();
        expect(urlOnScreen).toBe(`${base}/hooks/two004hook/${slug}`);
        // The hook's own test, read off the screen: the key is in no line of it; with the key put in its first line, bash
        // and openssl run it as written, and the hook answers 200. Async: the backend answers from this process.
        const tryIt = String(await page.evaluate(`(document.querySelector('[data-example]') || {}).innerText || ''`));
        expect(tryIt.split('\n')[0]).toBe(`KEY='${PAYSTACK_KEY_PLACEHOLDER}'`);
        expect(tryIt).toContain(urlOnScreen);
        expect(tryIt).not.toContain(key);
        await shot(page, `${vp.name}-3-key-pasted`);
        overflow.push([`${vp.name} drawer`, await overflowX(page)]);

        await clickButton(page, 'Create');
        await until(page, 'created', (t) => t.includes('Trigger created.'));
        const afterCreate = await bodyText(page);
        expect(afterCreate).not.toContain(key);
        await shot(page, `${vp.name}-4-created`);

        // Saved as Paystack's scheme, and the key is in no answer the admin API gives.
        const list = await request<{ triggers: TriggerView[] }>(base, 'GET', '/admin/triggers', { headers: master });
        const mine = list.json.triggers.find((t) => t.webhook && t.webhook.slug === slug)!;
        expect(mine.webhook!.scheme).toBe('hmac-sha512');
        expect(mine.target).toEqual(expect.objectContaining({ kind: 'function', name: 'paystackEvent' }));
        expect(list.text).not.toContain(key);

        // 5. The URL on screen, as Paystack calls it: an event that isn't ours is answered 200 and left alone.
        const event = JSON.stringify({ event: 'charge.success', data: { reference: `not-ours-${vp.name}`, amount: 100, currency: 'GHS', status: 'success' } });
        const signed = await request(base, 'POST', urlOnScreen.slice(base.length), { body: event, raw: true, headers: { 'content-type': 'application/json', 'x-paystack-signature': paystackSigned(event, key) } });
        expect(signed.status).toBe(200);
        const otherKey = await request(base, 'POST', urlOnScreen.slice(base.length), { body: event, raw: true, headers: { 'content-type': 'application/json', 'x-paystack-signature': paystackSigned(event, 'sk_test_someone_else') } });
        expect(otherKey.status).toBe(401);
        const script = tryIt.replace(PAYSTACK_KEY_PLACEHOLDER, key).replace('curl -X POST', 'curl -s -o /dev/null -w "%{http_code}" -X POST');
        expect((await promisify(execFile)('bash', ['-c', script], { encoding: 'utf-8', timeout: 15000 })).stdout).toBe('200');
        const unfilled = tryIt.replace('curl -X POST', 'curl -s -o /dev/null -w "%{http_code}" -X POST');
        expect((await promisify(execFile)('bash', ['-c', unfilled], { encoding: 'utf-8', timeout: 15000 })).stdout).toBe('401');

        // An edit: the box is blank with a "Saved" placeholder, there is no Rotate, and Save with it blank keeps the key.
        await clickText(page, 'tr.clickable', NAMES[vp.name]);
        await until(page, 'the hook opened again', (t) => t.includes('Last changed'));
        const again = JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll('input[aria-label="Paystack secret key"]'), function (i) { return { value: i.value, placeholder: i.placeholder }; }))`))) as Array<{ value: string; placeholder: string }>;
        expect(again).toEqual([{ value: '', placeholder: 'Saved. Paste a new key only to change it.' }]);
        expect(await buttonState(page, 'Rotate the secret')).toEqual([]);
        expect(await bodyText(page)).not.toContain(key);
        await shot(page, `${vp.name}-5-opened-again`);
        overflow.push([`${vp.name} edit`, await overflowX(page)]);
        // 🔴 The "Trigger created." toast lands on the drawer's footer, over Run now and Save (P121-TWO004-TOASTOVERSAVE):
        // a person waits for it to go. Measured, then waited out.
        const covered = Date.now();
        while ((await page.evaluate(`document.querySelectorAll('.toast').length`)) !== 0 && Date.now() - covered < 15000) await wait(200);
        seen.push(`${vp.name}: Save was under a toast for ${Date.now() - covered} ms after the drawer opened again`);
        await clickButton(page, 'Save');
        await until(page, 'saved', (t) => t.includes('Saved.'));
        const stillSigned = await request(base, 'POST', urlOnScreen.slice(base.length), { body: event, raw: true, headers: { 'content-type': 'application/json', 'x-paystack-signature': paystackSigned(event, key) } });
        expect(stillSigned.status).toBe(200);

        // "Refused calls are listed under Runs."
        await clickText(page, 'tr.clickable', NAMES[vp.name]);
        await until(page, 'the hook opened a third time', (t) => t.includes('Runs of this trigger'));
        await clickButton(page, 'Runs of this trigger');
        // Two refused (the wrong key, the command with no key), three accepted.
        const runs = await until(page, 'its runs', (t) => t.includes('Showing 1–5 of 5'));
        const rows = runs.split('\n').filter((l) => l.includes('paystackEvent'));
        expect(rows.filter((l) => /\terror\t/.test(l))).toHaveLength(2);
        expect(rows.filter((l) => /\tsuccess\t/.test(l))).toHaveLength(3);
        await shot(page, `${vp.name}-6-runs`);
        overflow.push([`${vp.name} runs`, await overflowX(page)]);
        // A refused one's Detail: does it say why?
        const detailAt = String(
          await page.evaluate(`(function () {
            var row = Array.prototype.filter.call(document.querySelectorAll('tr'), function (r) { return /\\terror\\t/.test(r.innerText); })[0];
            var b = row && Array.prototype.filter.call(row.querySelectorAll('button, a'), function (x) { return (x.innerText || '').trim() === 'Detail'; })[0];
            if (!b) return 'none';
            b.scrollIntoView({ block: 'center', behavior: 'instant' });
            var r = b.getBoundingClientRect();
            return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          })()`)
        );
        expect(detailAt).not.toBe('none');
        const at = JSON.parse(detailAt) as { x: number; y: number };
        await clickAt(page, at.x, at.y);
        // The reason is on the record itself, above "no steps" (P121-TWO004-RUNWHY), not only in Raw JSON.
        const detail = await until(page, 'a refused run’s detail', (t) => t.includes('Why it failed'));
        expect(detail).toMatch(/HMAC-SHA512 signature mismatch|missing signature header/);
        seen.push(`${vp.name}: a refused run's detail says: ${detail.split('\n').filter((l) => /signature|401|refused|error/i.test(l)).slice(0, 6).join(' | ')}`);
        await shot(page, `${vp.name}-7-refused-detail`);
        overflow.push([`${vp.name} run detail`, await overflowX(page)]);
        await page.evaluate(`location.hash = '#/triggers'; true`);
        await until(page, 'back on Triggers', (t) => t.includes('New trigger'));
      }
      const errors = page.consoleErrors.filter((e) => !/401|Unauthorized/.test(e));
      seen.push(`console errors: ${JSON.stringify(errors)}`);
    });
    // eslint-disable-next-line no-console
    console.log(['TWO-004 admin hook drive:', ...seen, `overflow: ${JSON.stringify(overflow)}`].join('\n'));
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
