/**
 * TWO-005 slice 4 — prayer requests, DRIVEN: the shipped template rendered headless by the real viewer, twice (two
 * browsers, two people, each signed in by their own emailed link), against one backend locked with the template's own
 * policy.
 *
 * Ann, on a phone (390 px): the sections along the bottom; Prayer, empty; "＋ Ask for prayer" opens New post on Prayer
 * request (no photos); she asks, and lands on Prayer with her request. Bob, on a tablet (1024×640): the sections down
 * the side; Ann's request in his feed, "Only Ann sees who prayed."; he presses 🙏 I prayed, it fills, "You prayed · 1".
 * On Ann's phone, with no reload, her request reads "I prayed · 1" and "Prayed: Bob Owusu." Her profile counts one
 * prayer request and no post. Bob takes it back; Ann's goes back to nobody. On New post, the chips switch between a post
 * and a prayer request. Then each screen at the other size.
 *
 * 🔴 W4 on screen: the person who asked sees who prayed, the person who prayed does not see anyone else, and the store
 * hands Bob nothing but his own row.
 *
 * The oracle for every write is the stored row, read with the master key, beside the screen.
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request, type ParsePointer, type ParseRecord } from './helpers/http';
import { clickButton, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(900000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/gram');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const FUNCTIONS = ['whoAmI', 'sharePost', 'heartPost', 'commentOn', 'editProfile', 'prayFor'];
const PHONE = { width: 390, height: 800, mobile: true };
const TABLET = { width: 1024, height: 640, mobile: false };
const ASK = 'Please pray for my mother, who goes into surgery on Friday morning.';

type Row = Record<string, unknown>;
/** A Post row and a Prayed row, as far as this drive reads them. */
interface Post extends ParseRecord {
  member: ParsePointer;
}
interface Prayed extends ParseRecord {
  doneBy: ParsePointer;
}
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
  throw new Error(`${what}: never happened. The page said:\n${text.slice(0, 2500)}\nIts last console errors: ${JSON.stringify(page.consoleErrors.slice(-3))}`);
}
const where = async (page: RenderedPage) => String(await page.evaluate('location.pathname + location.search'));

async function shot(page: RenderedPage, name: string): Promise<void> {
  if (process.env.TWO003_SHOTS === '0') return;
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SHOTS, `two005-prayer-${name}.png`), Buffer.from(r.data, 'base64'));
}
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

/** The sections: where they sit, and each tab's words and colour, as drawn. */
const navOf = async (page: RenderedPage) =>
  JSON.parse(
    String(
      await page.evaluate(`(function () {
        var n = document.querySelector('.gm-nav');
        if (!n) return JSON.stringify(null);
        var r = n.getBoundingClientRect();
        var tabs = Array.prototype.map.call(n.querySelectorAll('button'), function (b) {
          var t = b.getBoundingClientRect();
          return { words: b.innerText.trim(), color: getComputedStyle(b).color, top: Math.round(t.top), left: Math.round(t.left) };
        });
        return JSON.stringify({ top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), vw: innerWidth, vh: innerHeight, tabs: tabs });
      })()`)
    )
  ) as { top: number; bottom: number; left: number; width: number; height: number; vw: number; vh: number; tabs: Array<{ words: string; color: string; top: number; left: number }> } | null;

/** The I prayed button as drawn: its words, its fill and its ink. */
const prayButton = async (page: RenderedPage) =>
  JSON.parse(
    String(
      await page.evaluate(`(function () {
        var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) { return /prayed/.test(x.innerText); })[0];
        if (!b) return JSON.stringify(null);
        var s = getComputedStyle(b);
        return JSON.stringify({ words: b.innerText.trim(), fill: s.backgroundColor, ink: s.color });
      })()`)
    )
  ) as { words: string; fill: string; ink: string } | null;

/**
 * Each tab's label as drawn: where its words start inside the button, and how tall its first character (the mark) and
 * its last (the word) stand. Found by looking at the shots: the rail centred its words, and the marks were tiny.
 */
const tabText = async (page: RenderedPage) =>
  JSON.parse(
    String(
      await page.evaluate(`(function () {
        return JSON.stringify(Array.prototype.map.call(document.querySelectorAll('.gm-nav button'), function (b) {
          var t = b.firstChild, r = document.createRange();
          r.selectNodeContents(t);
          var all = r.getBoundingClientRect();
          r.setStart(t, 0); r.setEnd(t, 1);
          var mark = r.getBoundingClientRect();
          r.setStart(t, t.length - 1); r.setEnd(t, t.length);
          var word = r.getBoundingClientRect();
          return { inset: Math.round(all.left - b.getBoundingClientRect().left), mark: Math.round(mark.height), word: Math.round(word.height) };
        }));
      })()`)
    )
  ) as Array<{ inset: number; mark: number; word: number }>;

const PLUM = 'rgb(74, 33, 96)';
const WHITE = 'rgb(255, 255, 255)';

describe('TWO-005 slice 4 — prayer requests, driven in two browsers', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  const mail: Array<{ to: string; subject: string; text: string }> = [];
  const seen: string[] = [];
  const overflow: Array<[string, number]> = [];
  const memberId: Record<string, string> = {};
  const userId: Record<string, string> = {};
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    (await request<{ results: T[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, { headers })).json.results;

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-prayer-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005prayer', backendName: 'Grace Chapel', authToken: 't0k' });
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
    for (const role of ['admin', 'member']) await request(base, 'POST', '/admin/roles', { body: { name: role }, headers: master });
    // Ann and Bob, let in (slice 1's drive lets people in through the screens; here they start in).
    for (const [name, email] of [['Ann Mensah', 'ann@example.com'], ['Bob Owusu', 'bob@example.com']]) {
      const made = await request<{ objectId: string }>(base, 'POST', '/admin/users', { body: { username: email, email, password: `unused-${email}-pw`, roles: ['member'] }, headers: master });
      expect(made.status).toBe(201);
      userId[email] = made.json.objectId;
      const m = await request<{ objectId: string }>(base, 'POST', '/classes/Member', { body: { name, email, status: 'approved', role: 'member', login: ptr('_User', made.json.objectId) }, headers: master });
      memberId[email] = m.json.objectId;
    }
    await request(base, 'POST', '/classes/Community', { body: { name: 'Grace Chapel', rules: 'Be kind.' }, headers: master });
    // One post of Bob's already, so the feed holds a post beside the request.
    const bob = await request<{ sessionToken: string }>(base, 'POST', '/login', { body: { username: 'bob@example.com', password: 'unused-bob@example.com-pw' } });
    const shared = await request(base, 'POST', '/functions/sharePost', { body: { post: { caption: 'Men’s breakfast on Saturday' } }, headers: { 'x-parse-session-token': bob.json.sessionToken } });
    expect(shared.status).toBe(200);

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-prayer-drive-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two005prayer', port);
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('Ann asks for prayer on her phone; Bob prays on his tablet; Ann sees who, with no reload', async () => {
    await withRenderedPage({ projectDir, backendPort: port }, async (ann) => {
      await withRenderedPage({ projectDir, backendPort: port }, async (bob) => {
        const appOf = (p: RenderedPage) => `http://127.0.0.1:${p.servePort}`;
        const auth = await request(base, 'PUT', '/admin/auth', { body: { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: false }, redirectAllowList: [appOf(ann), appOf(bob)] }, headers: master });
        expect(auth.status).toBe(200);

        /** Ask for a link, open the mail, press it on the backend's page, and land on the feed. */
        const signIn = async (page: RenderedPage, email: string) => {
          await page.navigate('/sign-in');
          await until(page, 'sign in', (t) => t.includes('Email me a link'));
          await fill(page, 'Your email', email);
          await clickButton(page, 'Email me a link');
          await until(page, 'the link is on its way', (t) => t.includes('a link is on its way'));
          await wait(200);
          const sent = mail.filter((m) => m.to === email && /magic-link/.test(m.text)).pop();
          if (!sent) throw new Error(`no sign-in mail for ${email}`);
          const link = (/https?:[^\s]+\/auth\/magic-link\/callback\?token=[^\s]+/.exec(sent.text) as RegExpExecArray)[0];
          await page.evaluate(`location.href = ${JSON.stringify(link)}`);
          await until(page, 'the backend’s sign-in page', (t) => t.includes('Sign in to Grace Chapel'));
          await clickButton(page, 'Sign in');
          await until(page, 'the feed', (t) => t.includes('The feed') && t.includes('New post'), 20000);
          expect(await where(page)).toBe('/feed');
        };
        const ann_ = memberId['ann@example.com'];

        // ── Ann, on her phone: the sections along the bottom ──
        await ann.setViewport(PHONE);
        await signIn(ann, 'ann@example.com');
        const phoneNav = await navOf(ann);
        if (!phoneNav) throw new Error('no sections on the phone’s feed');
        expect(phoneNav.tabs.map((t) => t.words)).toEqual(['⌂\nFeed', '＋\nPost', '🙏\nPrayer', '◯\nProfile']);
        // Along the bottom, the screen's width, four tabs side by side; Feed lit.
        expect([phoneNav.bottom, phoneNav.left, phoneNav.width]).toEqual([phoneNav.vh, 0, phoneNav.vw]);
        expect(new Set(phoneNav.tabs.map((t) => t.top)).size).toBe(1);
        expect(phoneNav.tabs.map((t) => t.color === PLUM)).toEqual([true, false, false, false]);
        // Each mark stands taller than its word, as the picture draws them.
        for (const t of await tabText(ann)) expect(t.mark).toBeGreaterThan(t.word);
        await clickButton(ann, '🙏\nPrayer');
        await until(ann, 'Prayer, empty', (t) => t.includes('No prayer requests yet'));
        expect(await where(ann)).toBe('/prayer');
        expect((await navOf(ann))?.tabs.map((t) => t.color === PLUM)).toEqual([false, false, true, false]);
        await shot(ann, 'phone-1-prayer-empty');
        overflow.push(['phone Prayer, empty', await overflowX(ann)]);

        // ── Asking: New post, on Prayer request, words only ──
        await clickButton(ann, '＋ Ask for prayer');
        await until(ann, 'New prayer request', (t) => t.includes('New prayer request') && t.includes('Ask the members to pray'));
        expect(await where(ann)).toBe('/new-post?kind=prayer');
        const asking = await bodyText(ann);
        expect([asking.includes('Add a photo'), asking.includes('Only you see who prayed.')]).toEqual([false, true]);
        expect(await ann.evaluate('document.querySelector("textarea").placeholder')).toBe('Who or what, in your own words.');
        await shot(ann, 'phone-2-ask');
        overflow.push(['phone New prayer request', await overflowX(ann)]);
        // 🔴 An empty request is held on the page, in words.
        await clickButton(ann, 'Ask the members to pray');
        await until(ann, 'an empty request held', (t) => t.includes('Say what you’d like the members to pray for.'));
        await fill(ann, 'What would you like the members to pray for?', ASK);
        await clickButton(ann, 'Ask the members to pray');
        await until(ann, 'Prayer, with Ann’s request', (t) => t.includes(ASK) && t.includes('Nobody has prayed yet. Only you will see who does.'));
        expect(await where(ann)).toBe('/prayer');
        const [asked] = await rows<Post>('Post', { kind: 'prayer' });
        expect([asked.caption, asked.prayedCount, asked.photos, asked.member.objectId]).toEqual([ASK, 0, [], ann_]);
        expect((await prayButton(ann))?.words).toBe('🙏 I prayed');
        // The card is the picture's bordered card, with its pill.
        const card = JSON.parse(String(await ann.evaluate('(function () { var c = document.querySelector(".gm-prayer"); var s = c && getComputedStyle(c); return JSON.stringify(s ? [s.borderTopWidth, s.borderLeftStyle, s.borderTopLeftRadius] : null); })()')));
        expect(card).toEqual(['1px', 'solid', '16px']);
        expect(await bodyText(ann)).toContain('Prayer request');
        // 🔴 Scrolled to the very bottom, the last words aren't under the sections.
        const clear = String(
          await ann.evaluate(`(function () {
            window.scrollTo(0, document.documentElement.scrollHeight);
            var t = Array.prototype.filter.call(document.querySelectorAll('*'), function (e) { return e.childElementCount === 0 && /Only the person who asked sees who/.test(e.textContent || ''); })[0];
            var r = t.getBoundingClientRect();
            var at = document.elementFromPoint(r.left + 4, r.top + r.height / 2);
            return t.contains(at) || (at && at.contains(t)) ? 'clear' : 'covered by ' + (at ? at.className : 'nothing');
          })()`)
        );
        expect(clear).toBe('clear');
        await ann.evaluate('window.scrollTo(0, 0)');
        await shot(ann, 'phone-3-asked');
        overflow.push(['phone Prayer, asked', await overflowX(ann)]);

        // ── Bob, on his tablet: the sections down the side; Ann's request in his feed ──
        await bob.setViewport(TABLET);
        await signIn(bob, 'bob@example.com');
        await until(bob, 'Ann’s request in Bob’s feed', (t) => t.includes(ASK) && t.includes('Only Ann sees who prayed.'));
        const rail = await navOf(bob);
        if (!rail) throw new Error('no sections on the tablet’s feed');
        expect([rail.top, rail.left, rail.width, rail.height]).toEqual([0, 0, 200, rail.vh]);
        expect(rail.tabs.map((t) => t.words)).toEqual(['⌂ Feed', '＋ Post', '🙏 Prayer', '◯ Profile']);
        // One under another, and the feed beside the rail, not under it.
        expect(new Set(rail.tabs.map((t) => t.left)).size).toBe(1);
        // Their words start at the rail's edge, not in its middle; one line, one size.
        for (const t of await tabText(bob)) expect([t.inset <= 12, t.mark === t.word]).toEqual([true, true]);
        const feedLeft = Number(await bob.evaluate('Math.round(document.querySelector(".gm-prayer").getBoundingClientRect().left)'));
        expect(feedLeft).toBeGreaterThanOrEqual(200);
        expect(await prayButton(bob)).toMatchObject({ words: '🙏 I prayed', fill: WHITE, ink: PLUM });
        await shot(bob, 'tablet-1-feed-rail');
        overflow.push(['tablet feed with a request', await overflowX(bob)]);

        // ── Bob prays ──
        await clickButton(bob, '🙏 I prayed');
        await until(bob, 'Bob prayed', (t) => t.includes('🙏 You prayed · 1'));
        expect(await prayButton(bob)).toMatchObject({ words: '🙏 You prayed · 1', fill: PLUM, ink: WHITE });
        const prayed = await rows<Prayed>('Prayed', { post: ptr('Post', asked.objectId) });
        expect(prayed.map((p) => p.doneBy.objectId)).toEqual([userId['bob@example.com']]);
        expect((await rows('Post', { objectId: asked.objectId }))[0].prayedCount).toBe(1);
        // 🔴 W4: Bob is told who sees it, and is named nowhere on his own screen.
        const bobs = await bodyText(bob);
        expect([bobs.includes('Only Ann sees who prayed.'), bobs.includes('Prayed:')]).toEqual([true, false]);
        await shot(bob, 'tablet-2-prayed');

        // ── Ann's phone, with no reload: the count and who ──
        await until(ann, 'Ann sees Bob prayed', (t) => t.includes('🙏 I prayed · 1') && t.includes('Prayed: Bob Owusu. Only you see who.'), 20000);
        expect(await where(ann)).toBe('/prayer');
        await shot(ann, 'phone-4-who-prayed');

        // ── Ann's profile, from the sections: one prayer request, no post ──
        await clickButton(ann, '◯\nProfile');
        await until(ann, 'Ann’s profile', (t) => t.includes('Ann Mensah') && t.includes('prayer request') && t.includes('Edit profile'));
        expect(await where(ann)).toBe(`/member/${ann_}`);
        const counts = String(await ann.evaluate('document.querySelector(".gm-count").innerText')).replace(/\s+/g, ' ').trim();
        expect(counts).toBe('0 posts 1 prayer request 0 testimonies');
        expect((await navOf(ann))?.tabs.map((t) => t.color === PLUM)).toEqual([false, false, false, true]);
        await shot(ann, 'phone-5-profile');
        overflow.push(['phone profile with a request', await overflowX(ann)]);

        // ── Bob takes it back; Ann's goes back to nobody ──
        await clickButton(bob, '🙏 You prayed · 1');
        await until(bob, 'Bob took it back', (t) => t.includes('🙏 I prayed') && !t.includes('You prayed'));
        expect(await rows('Prayed', { post: ptr('Post', asked.objectId) })).toEqual([]);
        expect((await rows('Post', { objectId: asked.objectId }))[0].prayedCount).toBe(0);
        await clickButton(ann, '🙏\nPrayer');
        await until(ann, 'nobody again', (t) => t.includes('Nobody has prayed yet.'));

        // ── New post: the chips switch between a post and a prayer request ──
        await clickButton(bob, '＋ Post');
        await until(bob, 'New post', (t) => t.includes('New post') && t.includes('Add a photo'));
        expect(await where(bob)).toBe('/new-post');
        await clickButton(bob, 'Prayer request');
        await until(bob, 'switched to a prayer request', (t) => t.includes('New prayer request') && !t.includes('Add a photo'));
        await shot(bob, 'tablet-3-new-post-prayer-chip');
        overflow.push(['tablet New post, prayer chip', await overflowX(bob)]);
        await clickButton(bob, 'Post');
        await until(bob, 'back to a post', (t) => t.includes('Add a photo') && t.includes('Share with the members'));
        await clickButton(bob, '← The feed');
        await until(bob, 'the feed again', (t) => t.includes('The feed'));

        // ── each screen at the other size ──
        await ann.setViewport(TABLET);
        await until(ann, 'Prayer on a tablet', (t) => t.includes(ASK));
        await shot(ann, 'tablet-4-prayer');
        overflow.push(['tablet Prayer', await overflowX(ann)]);
        await bob.setViewport(PHONE);
        await bob.navigate('/prayer');
        await until(bob, 'Prayer on a phone', (t) => t.includes(ASK) && t.includes('Only Ann sees who prayed.'));
        await shot(bob, 'phone-6-prayer-bob');
        overflow.push(['phone Prayer, Bob', await overflowX(bob)]);
        await bob.navigate(`/post/${asked.objectId}`);
        await until(bob, 'the request’s own page', (t) => t.includes(ASK) && t.includes('No comments yet'));
        await shot(bob, 'phone-7-request-page');
        overflow.push(['phone a request’s page', await overflowX(bob)]);

        seen.push(`Ann's console errors: ${JSON.stringify(ann.consoleErrors)}`);
        seen.push(`Bob's console errors: ${JSON.stringify(bob.consoleErrors)}`);
        expect(ann.consoleErrors).toEqual([]);
        expect(bob.consoleErrors).toEqual([]);
      });
    });
    // eslint-disable-next-line no-console
    console.log(['TWO-005 slice 4 drive:', ...seen, `overflow: ${JSON.stringify(overflow)}`].join('\n'));
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
