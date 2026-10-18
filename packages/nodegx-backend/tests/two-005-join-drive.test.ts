/**
 * TWO-005 slice 1 — joining the community and being let in, DRIVEN: the shipped template rendered headless by the real
 * viewer, against a real backend locked with the template's own policy, with a stubbed mailer whose messages the drive
 * opens the way a person does (the link in the mail, the backend's "Sign in" page, back to the app).
 *
 * At a phone (390 px), the whole story: the builder sets the community up and lands on the empty queue; signs out;
 * a stranger sees the welcome, is refused without "13 or older", asks to join and is thanked; signs in by the emailed
 * link and waits; the admin signs in with the password, lets them in (they get a message) and turns a second person
 * away; the first signs in again and is in; the admin makes them an admin; the person turned away presses a link and
 * is refused. At a 10" tablet (1024×640): each screen again, for its picture.
 *
 * The oracle for every write is the stored row, read with the master key, beside the screen.
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request } from './helpers/http';
import { clickAt, clickButton, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(600000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/gram');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const SETUP_TOKEN = 'setup-token-two005-drive';
const FUNCTIONS = ['whoAmI', 'setUpCommunity', 'askToJoin', 'letIn', 'turnAway', 'makeAdmin'];

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
      // between two documents (the backend's sign-in page and back): ask again
    }
    await wait(250);
  }
  throw new Error(`${what}: never happened. The page said:\n${text.slice(0, 2500)}`);
}
const where = async (page: RenderedPage) => String(await page.evaluate('location.pathname'));

async function shot(page: RenderedPage, name: string): Promise<void> {
  if (process.env.TWO003_SHOTS === '0') return;
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SHOTS, `two005-${name}.png`), Buffer.from(r.data, 'base64'));
}
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

/** Tick the checkbox labelled `words` where a finger lands on it. */
async function tick(page: RenderedPage, words: string): Promise<void> {
  const at = String(
    await page.evaluate(`(function () {
      var box = Array.prototype.filter.call(document.querySelectorAll('input[type=checkbox]'), function (b) {
        var l = b.id && document.querySelector('label[for="' + b.id + '"]');
        return l && (l.textContent || '').trim() === ${JSON.stringify(words)};
      })[0];
      if (!box) return 'none';
      box.scrollIntoView({ block: 'center', behavior: 'instant' });
      var r = box.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
      return hit === box || (hit && hit.contains(box)) ? JSON.stringify({ x: x, y: y }) : 'covered by ' + (hit ? hit.tagName : 'nothing');
    })()`)
  );
  if (!at.startsWith('{')) throw new Error(`the "${words}" box: ${at}`);
  const p = JSON.parse(at) as { x: number; y: number };
  await clickAt(page, p.x, p.y);
}

describe('TWO-005 slice 1 — joining and being let in, driven', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  const mail: Array<{ to: string; subject: string; text: string }> = [];
  const seen: string[] = [];
  const overflow: Array<[string, number]> = [];
  const member = async (email: string) =>
    (await request<{ results: Array<Record<string, any>> }>(base, 'GET', `/classes/Member?where=${encodeURIComponent(JSON.stringify({ email }))}`, { headers: master })).json.results[0];

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { GRAM_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005drive', backendName: 'Grace Chapel', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    port = started.listen.port;
    service.getMailerForTesting()!.setTransportForTesting({
      sendMail: async (opts: Record<string, unknown>) => {
        mail.push({ to: String(opts.to), subject: String(opts.subject), text: String(opts.text) });
      }
    });
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await request(base, 'POST', '/admin/schema', { body: push, headers: master });
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    await request(base, 'PUT', '/admin/email/config', { body: { baseUrl: base, enabled: true, smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' }, fromAddress: 'noreply@test' }, headers: master });
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-drive-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two005drive', port);
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('a stranger asks to join, signs in by the emailed link and waits; an admin lets them in; the screens at both sizes', async () => {
    await withRenderedPage({ projectDir, backendPort: port }, async (page) => {
      const app = `http://127.0.0.1:${page.servePort}`;
      // The builder's setup page: magic links on, no open sign-up, this app's address on the allow-list.
      const auth = await request(base, 'PUT', '/admin/auth', { body: { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: false }, redirectAllowList: [app] }, headers: master });
      expect(auth.status).toBe(200);

      /** Open the newest message to `email`, press its link on the backend's page, and come back to the app. */
      const pressLink = async (email: string) => {
        const sent = mail.filter((m) => m.to === email && /magic-link/.test(m.text)).pop();
        if (!sent) throw new Error(`no sign-in mail for ${email}: ${JSON.stringify(mail.map((m) => [m.to, m.subject]))}`);
        const link = (/https?:[^\s]+\/auth\/magic-link\/callback\?token=[^\s]+/.exec(sent.text) as RegExpExecArray)[0];
        await page.evaluate(`location.href = ${JSON.stringify(link)}`);
        await until(page, 'the backend’s sign-in page', (t) => t.includes('Sign in to Grace Chapel'));
        await clickButton(page, 'Sign in');
      };
      const signOut = async () => {
        await clickButton(page, 'Sign out');
        await until(page, 'signed out, the welcome', (t) => t.includes('Ask to join'));
      };
      const askToJoin = async (name: string, email: string) => {
        await page.navigate('/join');
        await until(page, 'the join form', (t) => t.includes('I am 13 or older'));
        await fill(page, 'Your name', name);
        await fill(page, 'Your email', email);
        await tick(page, 'I am 13 or older');
        await clickButton(page, 'Ask to join');
        await until(page, 'thanked', (t) => t.includes('You’re on the list.'));
      };
      const askForLink = async (email: string) => {
        await page.navigate('/sign-in');
        await until(page, 'sign in', (t) => t.includes('Email me a link'));
        await fill(page, 'Your email', email);
        await clickButton(page, 'Email me a link');
        await until(page, 'the link is on its way', (t) => t.includes('a link is on its way'));
      };
      const adminSignIn = async () => {
        await page.navigate('/sign-in');
        await until(page, 'sign in', (t) => t.includes('Sign in with the password'));
        await fill(page, 'Your email', 'ama@example.com');
        await fill(page, 'Password', 'longenough');
        await clickButton(page, 'Sign in with the password');
        await until(page, 'the queue', (t) => t.includes('Waiting for you') && /New members \(\d+\)/.test(t));
      };

      // ── phone: the whole story ──
      await page.setViewport({ width: 390, height: 800, mobile: true });
      await page.navigate('/');
      await until(page, 'a community nobody set up', (t) => t.includes('isn’t set up yet'));
      await shot(page, 'phone-1-not-set-up');
      await clickButton(page, 'Set up the community');
      await until(page, 'the set-up form', (t) => t.includes('Setup token'));
      await fill(page, 'Setup token', SETUP_TOKEN);
      await fill(page, 'The community’s name', 'Grace Chapel');
      await fill(page, 'Your name', 'Ama Owusu');
      await fill(page, 'Your email', 'ama@example.com');
      await fill(page, 'A password', 'longenough');
      await shot(page, 'phone-2-set-up');
      await clickButton(page, 'Set up the community');
      const empty = await until(page, 'the empty queue', (t) => t.includes('Nobody is waiting'));
      expect(empty).toContain('New members (0)');
      expect(await member('ama@example.com')).toMatchObject({ status: 'approved', role: 'admin' });
      await shot(page, 'phone-3-queue-empty');
      overflow.push(['phone queue', await overflowX(page)]);
      await signOut();
      const welcome = await bodyText(page);
      expect(welcome).toContain('Grace Chapel');
      expect(welcome).not.toContain('Sign out');
      await shot(page, 'phone-4-welcome');
      overflow.push(['phone welcome', await overflowX(page)]);

      // A stranger asks to join: refused without 13 or older, then thanked.
      await clickButton(page, 'Ask to join');
      await until(page, 'the join form', (t) => t.includes('I am 13 or older'));
      await fill(page, 'Your name', 'Yaw Asante');
      await fill(page, 'Your email', 'yaw@example.com');
      await clickButton(page, 'Ask to join');
      await until(page, 'refused without the tick', (t) => t.includes('Members are 13 or older. Tick the box'));
      expect(await member('yaw@example.com')).toBeUndefined();
      await shot(page, 'phone-5-join-refused');
      await tick(page, 'I am 13 or older');
      await clickButton(page, 'Ask to join');
      await until(page, 'thanked', (t) => t.includes('Thanks, Yaw. You’re on the list.'));
      expect(await member('yaw@example.com')).toMatchObject({ status: 'waiting' });
      await shot(page, 'phone-6-thanks');
      overflow.push(['phone join', await overflowX(page)]);

      // They sign in by the emailed link, and wait.
      await askForLink('yaw@example.com');
      await shot(page, 'phone-7-link-sent');
      await pressLink('yaw@example.com');
      await until(page, 'waiting', (t) => t.includes('Thanks, Yaw. You’re on the list.') && t.includes('Sign out'), 20000);
      expect(await where(page)).toBe('/waiting');
      await shot(page, 'phone-8-waiting');
      await signOut();

      // A second person asks; the admin signs in with the password, lets Yaw in and says No to Nana.
      await askToJoin('Nana Tetteh', 'nana@example.com');
      await adminSignIn();
      const queue = await bodyText(page);
      expect(queue).toContain('New members (2)');
      expect(queue).toMatch(/Yaw Asante[\s\S]*Confirmed 13 or older · asked (just now|\d+ min ago)[\s\S]*Nana Tetteh/);
      await shot(page, 'phone-9-queue');
      overflow.push(['phone queue full', await overflowX(page)]);
      mail.length = 0;
      await clickButtonNear(page, 'Let in', 'Yaw Asante');
      await until(page, 'Yaw let in', (t) => t.includes('Yaw Asante is in, and has been sent a message to say so.') && t.includes('New members (1)'));
      expect(await member('yaw@example.com')).toMatchObject({ status: 'approved' });
      expect(mail.map((m) => [m.to, m.subject])).toEqual([['yaw@example.com', 'You’re in: Grace Chapel']]);
      expect(mail[0].text).toContain(`${app}/sign-in`);
      await shot(page, 'phone-10-let-in');
      await clickButtonNear(page, 'No', 'Nana Tetteh');
      await until(page, 'Nana turned away', (t) => t.includes('Nana Tetteh wasn’t let in.') && t.includes('Nobody is waiting'));
      expect(await member('nana@example.com')).toMatchObject({ status: 'waiting', blockedReason: 'Not let in.' });
      await shot(page, 'phone-11-turned-away');
      await signOut();

      // Yaw signs in again, from the link the message names, and is in.
      await askForLink('yaw@example.com');
      await pressLink('yaw@example.com');
      // Slice 2 made the feed: someone just let in lands on it, empty.
      await until(page, 'in', (t) => t.includes('The feed') && t.includes('Nothing posted yet'), 20000);
      expect(await where(page)).toBe('/feed');
      await shot(page, 'phone-12-in');
      await signOut();

      // The admin makes Yaw an admin.
      await adminSignIn();
      await clickButton(page, 'Admins');
      await until(page, 'the admins', (t) => t.includes('Make admin'));
      await shot(page, 'phone-13-admins');
      overflow.push(['phone admins', await overflowX(page)]);
      await clickButtonNear(page, 'Make admin', 'Yaw Asante');
      await until(page, 'Yaw an admin', (t) => !t.includes('Make admin'));
      expect(await member('yaw@example.com')).toMatchObject({ role: 'admin' });
      await signOut();

      // Nana, turned away, presses a link: refused. What does the app say?
      await askForLink('nana@example.com');
      await pressLink('nana@example.com');
      await wait(3000);
      const nana = await bodyText(page);
      seen.push(`turned away, back from the link at ${await where(page)}${await page.evaluate('location.search')}: ${nana.replace(/\s+/g, ' ').slice(0, 300)}`);
      expect(nana).not.toContain('Thanks, Nana');
      expect(nana).toContain('This account is disabled.');
      await shot(page, 'phone-14-turned-away-link');

      // ── tablet: each screen, for its picture ──
      await page.setViewport({ width: 1024, height: 640, mobile: false });
      await page.navigate('/');
      await until(page, 'the welcome', (t) => t.includes('Ask to join'));
      await shot(page, 'tablet-1-welcome');
      overflow.push(['tablet welcome', await overflowX(page)]);
      await askToJoin('Kofi Darko', 'kofi@example.com');
      await shot(page, 'tablet-2-thanks');
      await askForLink('kofi@example.com');
      await shot(page, 'tablet-3-sign-in');
      overflow.push(['tablet sign-in', await overflowX(page)]);
      await pressLink('kofi@example.com');
      await until(page, 'waiting', (t) => t.includes('Thanks, Kofi. You’re on the list.'), 20000);
      await shot(page, 'tablet-4-waiting');
      await signOut();
      await adminSignIn();
      await shot(page, 'tablet-5-queue');
      overflow.push(['tablet queue', await overflowX(page)]);
      await clickButton(page, 'Admins');
      await until(page, 'the admins', (t) => t.includes('Admins let people in'));
      await shot(page, 'tablet-6-admins');
      overflow.push(['tablet admins', await overflowX(page)]);

      seen.push(`console errors: ${JSON.stringify(page.consoleErrors)}`);
      // The one refusal the drive provoked (asking without "13 or older"), and nothing else.
      // The two refusals the drive provoked (asking without "13 or older"; a turned-away person's link), nothing else.
      expect(page.consoleErrors.filter((e) => !e.includes('Members are 13 or older') && !e.includes('This account is disabled.'))).toEqual([]);
    });
    // eslint-disable-next-line no-console
    console.log(['TWO-005 slice 1 drive:', ...seen, `overflow: ${JSON.stringify(overflow)}`].join('\n'));
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});

/** Press the button labelled `label` in the one row that names `who`, where a finger lands. */
async function clickButtonNear(page: RenderedPage, label: string, who: string): Promise<void> {
  const at = String(
    await page.evaluate(`(function () {
      var hits = Array.prototype.filter.call(document.querySelectorAll('button'), function (b) {
        if ((b.innerText || '').trim() !== ${JSON.stringify(label)}) return false;
        for (var el = b.parentElement; el; el = el.parentElement) {
          if ((el.innerText || '').indexOf(${JSON.stringify(who)}) < 0) continue;
          return Array.prototype.filter.call(el.querySelectorAll('button'), function (x) { return (x.innerText || '').trim() === ${JSON.stringify(label)}; }).length === 1;
        }
        return false;
      });
      if (hits.length !== 1) return 'found ' + hits.length;
      hits[0].scrollIntoView({ block: 'center', behavior: 'instant' });
      var r = hits[0].getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
      return hit && hits[0].contains(hit) ? JSON.stringify({ x: x, y: y }) : 'covered';
    })()`)
  );
  if (!at.startsWith('{')) throw new Error(`"${label}" by ${who}: ${at}`);
  const p = JSON.parse(at) as { x: number; y: number };
  await clickAt(page, p.x, p.y);
}
