/**
 * TWO-005 slice 4b — testimonies and events, DRIVEN: the shipped template rendered headless by the real viewer, twice
 * (two browsers, two people, each signed in by their own emailed link), against one backend locked with the
 * template's own policy.
 *
 * Ann, on a phone (390 px) in Lagos: New post's four chips, all on screen; a testimony held while empty, then shared,
 * its words above its heart; an event held for its words, its day and its time in turn, the day set as the phone's own
 * picker sets it, the time from the list; shared, her card says "Event · <day>, 9:00". Bob, on a tablet (1024×640) in
 * Accra, an hour behind: both cards in his feed, the event at 8:00 (the same instant, in his time); he hearts the
 * testimony and Ann's count moves with no reload; he shares an event of his own, its day picked from the calendar, at
 * 19:30, and Ann's feed shows it at 20:30, with no reload. Ann's profile counts one post (the event), no prayer request
 * and one testimony. Then each screen at the other size.
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
import { clickButton, clickButtonInRow, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';
import { pickDate } from './helpers/todo-drive';

jest.setTimeout(900000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/gram');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const FUNCTIONS = ['whoAmI', 'sharePost', 'heartPost', 'commentOn', 'editProfile', 'prayFor'];
const PHONE = { width: 390, height: 800, mobile: true };
const TABLET = { width: 1024, height: 640, mobile: false };
const TESTIMONY = 'Six months ago I asked you all to pray about my visa. It came through this morning. God is faithful.';
const BREAKFAST = 'Men’s breakfast at the church hall. Bring a friend, and an appetite.';
const VIGIL = 'Prayer vigil in the chapel, until midnight.';
const KINDS = ['Post', 'Prayer request', 'Testimony', 'Event'];

type Row = Record<string, any>;
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
const cdp = (page: RenderedPage) => (page as unknown as { client: { send(m: string, p?: unknown): Promise<any> } }).client;

async function shot(page: RenderedPage, name: string): Promise<void> {
  if (process.env.TWO003_SHOTS === '0') return;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await cdp(page).send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SHOTS, `two005-kinds-${name}.png`), Buffer.from(r.data, 'base64'));
}
/** On the card holding these words: are they drawn above its heart, or under it? */
const wordsOrHeart = async (page: RenderedPage, words: string) =>
  String(
    await page.evaluate(`(function () {
      var w = Array.prototype.filter.call(document.querySelectorAll('*'), function (e) { return e.childElementCount === 0 && e.textContent === ${JSON.stringify(words)}; })[0];
      if (!w) return 'no words';
      for (var c = w; c; c = c.parentElement) {
        var h = Array.prototype.filter.call(c.querySelectorAll('button'), function (b) { return /^(♡ Heart|♥ Hearted)$/.test(b.innerText.trim()); });
        if (h.length === 1) return w.getBoundingClientRect().bottom <= h[0].getBoundingClientRect().top ? 'words first' : 'heart first';
      }
      return 'no heart';
    })()`)
  );
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

/** Pick the time whose words are exactly these, the way a change from a person arrives. */
async function chooseTime(page: RenderedPage, words: string): Promise<void> {
  const picked = await page.evaluate(`(function () {
    var s = document.querySelector('select');
    if (!s) return 'no select';
    var o = Array.prototype.find.call(s.options, function (x) { return x.textContent.trim() === ${JSON.stringify(words)}; });
    if (!o) return 'no option: ' + Array.prototype.map.call(s.options, function (x) { return x.textContent; }).join(' | ');
    s.value = o.value;
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return o.textContent.trim();
  })()`);
  if (picked !== words) throw new Error(`could not choose "${words}": ${picked}`);
  await wait(400);
}
/** Set the day as a phone's own date picker does: the value, then one change (a decision, not typing). */
async function setDayAsAPhone(page: RenderedPage, day: string): Promise<void> {
  const set = await page.evaluate(`(function () {
    var i = document.querySelector('.ndg-dp-input');
    if (!i) return 'no date field';
    i.value = ${JSON.stringify(day)};
    i.dispatchEvent(new Event('input', { bubbles: true }));
    i.dispatchEvent(new Event('change', { bubbles: true }));
    return i.value;
  })()`);
  if (set !== day) throw new Error(`the day field took ${set}`);
  await wait(400);
}

/** A day counted from today, as a phone in that zone names it (YYYY-MM-DD), and how a card says it. */
const dayIn = (zone: string, days: number) => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date(Date.now() + days * 86400000));
function saidOn(day: string, time: string): string {
  // Noon UTC is the same calendar day in Lagos and Accra: the weekday and month names, read there.
  const noon = new Date(`${day}T12:00:00.000Z`);
  const name = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(noon);
  return `Event · ${name({ weekday: 'long' })} ${Number(day.slice(8, 10))} ${name({ month: 'long' })}, ${time}`;
}

describe('TWO-005 slice 4b — testimonies and events, driven in two browsers', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  const master = { authorization: 'Bearer t0k' };
  const mail: Array<{ to: string; subject: string; text: string }> = [];
  const seen: string[] = [];
  const overflow: Array<[string, number]> = [];
  const memberId: Record<string, string> = {};
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const rows = async (cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    (await request<{ results: Row[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, { headers })).json.results;

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-kinds-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005kinds', backendName: 'Grace Chapel', authToken: 't0k' });
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
    for (const [name, email] of [['Ann Mensah', 'ann@example.com'], ['Bob Owusu', 'bob@example.com']]) {
      const made = await request<{ objectId: string }>(base, 'POST', '/admin/users', { body: { username: email, email, password: `unused-${email}-pw`, roles: ['member'] }, headers: master });
      expect(made.status).toBe(201);
      const m = await request<{ objectId: string }>(base, 'POST', '/classes/Member', { body: { name, email, status: 'approved', role: 'member', login: ptr('_User', made.json.objectId) }, headers: master });
      memberId[email] = m.json.objectId;
    }
    await request(base, 'POST', '/classes/Community', { body: { name: 'Grace Chapel', rules: 'Be kind.' }, headers: master });
    const bob = await request<{ sessionToken: string }>(base, 'POST', '/login', { body: { username: 'bob@example.com', password: 'unused-bob@example.com-pw' } });
    expect((await request(base, 'POST', '/functions/sharePost', { body: { post: { caption: 'Sunday lunch after the service' } }, headers: { 'x-parse-session-token': bob.json.sessionToken } })).status).toBe(200);

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-kinds-drive-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two005kinds', port);
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('Ann shares a testimony and an event on her phone; Bob reads both on his tablet, in his own time', async () => {
    await withRenderedPage({ projectDir, backendPort: port }, async (ann) => {
      await withRenderedPage({ projectDir, backendPort: port }, async (bob) => {
        const appOf = (p: RenderedPage) => `http://127.0.0.1:${p.servePort}`;
        const auth = await request(base, 'PUT', '/admin/auth', { body: { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: false }, redirectAllowList: [appOf(ann), appOf(bob)] }, headers: master });
        expect(auth.status).toBe(200);
        // Ann's phone keeps Lagos time (UTC+1), Bob's Accra's (UTC+0): one instant, two clocks.
        await cdp(ann).send('Emulation.setTimezoneOverride', { timezoneId: 'Africa/Lagos' });
        await cdp(bob).send('Emulation.setTimezoneOverride', { timezoneId: 'Africa/Accra' });

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
        const anns = memberId['ann@example.com'];

        // ── Ann, on her phone: New post's four kinds, every chip on screen ──
        await ann.setViewport(PHONE);
        await signIn(ann, 'ann@example.com');
        await clickButton(ann, '＋ New post');
        await until(ann, 'New post', (t) => t.includes('New post') && t.includes('Add a photo'));
        const chips = JSON.parse(
          String(
            await ann.evaluate(`JSON.stringify(Array.prototype.filter.call(document.querySelectorAll('button'), function (b) { return ${JSON.stringify(KINDS)}.indexOf(b.innerText.trim()) >= 0; }).map(function (b) { var r = b.getBoundingClientRect(); return { words: b.innerText.trim(), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top) }; }))`)
          )
        ) as Array<{ words: string; left: number; right: number; top: number }>;
        expect(chips.map((c) => c.words)).toEqual(KINDS);
        for (const c of chips) expect([c.words, c.left >= 0 && c.right <= PHONE.width]).toEqual([c.words, true]);
        await shot(ann, 'phone-1-four-kinds');
        overflow.push(['phone New post, four kinds', await overflowX(ann)]);

        // ── A testimony: held while empty, then shared; its words lead its card ──
        await clickButton(ann, 'Testimony');
        await until(ann, 'New testimony', (t) => t.includes('New testimony') && t.includes('Share your testimony') && t.includes('Add a photo'));
        expect(await ann.evaluate('document.querySelector("textarea").placeholder')).toBe('What happened, in your own words.');
        await clickButton(ann, 'Share your testimony');
        await until(ann, 'an empty testimony held', (t) => t.includes('Tell the members what happened.'));
        await fill(ann, 'Your testimony', TESTIMONY);
        await clickButton(ann, 'Share your testimony');
        await until(ann, 'the feed, with the testimony', (t) => t.includes(TESTIMONY) && t.includes('Testimony · just now'));
        expect(await where(ann)).toBe('/feed');
        const [told] = await rows('Post', { kind: 'testimony' });
        expect([told.caption, told.photos, told.member.objectId, told.eventOn ?? null]).toEqual([TESTIMONY, [], anns, null]);
        // Its words above its heart, as the picture draws a testimony.
        expect(await wordsOrHeart(ann, TESTIMONY)).toBe('words first');
        await shot(ann, 'phone-2-testimony');
        overflow.push(['phone feed, a testimony', await overflowX(ann)]);

        // ── An event: held for its words, its day and its time, in turn ──
        await clickButton(ann, '＋ New post');
        await until(ann, 'New post', (t) => t.includes('Add a photo'));
        await clickButton(ann, 'Event');
        await until(ann, 'New event', (t) => t.includes('New event') && t.includes('Starts at') && t.includes('Share the event'));
        await clickButton(ann, 'Share the event');
        await until(ann, 'held: no words', (t) => t.includes('Say what the event is.'));
        await fill(ann, 'What is it?', BREAKFAST);
        await clickButton(ann, 'Share the event');
        await until(ann, 'held: no day', (t) => t.includes('Choose the event’s day.'));
        // The day can't be before today, in Lagos, nor past a year on.
        expect(await ann.evaluate('document.querySelector(".ndg-dp-input").min')).toBe(dayIn('Africa/Lagos', 0));
        expect(await ann.evaluate('document.querySelector(".ndg-dp-input").max')).toBe(dayIn('Africa/Lagos', 365));
        const day = dayIn('Africa/Lagos', 3);
        await setDayAsAPhone(ann, day);
        await clickButton(ann, 'Share the event');
        await until(ann, 'held: no time', (t) => t.includes('Choose the time it starts.'));
        await chooseTime(ann, '9:00');
        await shot(ann, 'phone-3-event-form');
        overflow.push(['phone New event', await overflowX(ann)]);
        await clickButton(ann, 'Share the event');
        // 9:00 in Lagos is 8:00 UTC: the stored instant.
        await until(ann, 'the feed, with the event', (t) => t.includes(BREAKFAST) && t.includes(saidOn(day, '9:00')));
        expect(await where(ann)).toBe('/feed');
        const [breakfast] = await rows('Post', { kind: 'event' });
        expect([breakfast.caption, breakfast.eventOn, breakfast.member.objectId]).toEqual([BREAKFAST, { __type: 'Date', iso: `${day}T08:00:00.000Z` }, anns]);
        // With no photo, its words lead its card (the shots: they sat under "No hearts yet").
        expect(await wordsOrHeart(ann, BREAKFAST)).toBe('words first');
        // Each kind but a post wears its pill: the event's and the testimony's, newest first.
        expect(JSON.parse(String(await ann.evaluate('JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".gm-kind"), function (k) { return k.innerText.trim(); }))')))).toEqual(['Event', 'Testimony']);
        await shot(ann, 'phone-4-feed-event');
        overflow.push(['phone feed, an event', await overflowX(ann)]);

        // ── Bob, on his tablet in Accra: both cards, the event at 8:00 in his time ──
        await bob.setViewport(TABLET);
        await signIn(bob, 'bob@example.com');
        await until(bob, 'both in Bob’s feed', (t) => t.includes(TESTIMONY) && t.includes(BREAKFAST) && t.includes(saidOn(day, '8:00')));
        await shot(bob, 'tablet-1-feed-kinds');
        overflow.push(['tablet feed, both kinds', await overflowX(bob)]);
        // He hearts the testimony; Ann's count moves with no reload.
        await clickButtonInRow(bob, '♡ Heart', TESTIMONY);
        await until(bob, 'Bob hearted it', (t) => t.includes('♥ Hearted'));
        expect((await rows('Heart', { post: ptr('Post', told.objectId) })).length).toBe(1);
        await until(ann, 'Ann sees the heart', (t) => t.includes('1 heart · Bob'), 20000);

        // ── Bob's own event, its day from the calendar, at 19:30 in Accra ──
        await clickButton(bob, '＋ Post');
        await until(bob, 'New post', (t) => t.includes('Add a photo'));
        await clickButton(bob, 'Event');
        await until(bob, 'New event', (t) => t.includes('Starts at'));
        await fill(bob, 'What is it?', VIGIL);
        const bobsDay = dayIn('Africa/Accra', 4);
        const picked = await pickDate(bob, bobsDay);
        expect(picked).toEqual({ inputType: 'date', calendarOpened: true });
        expect(await bob.evaluate('document.querySelector(".ndg-dp-input").value')).toBe(bobsDay);
        await chooseTime(bob, '19:30');
        await shot(bob, 'tablet-2-event-form');
        overflow.push(['tablet New event', await overflowX(bob)]);
        await clickButton(bob, 'Share the event');
        await until(bob, 'Bob’s event in his feed', (t) => t.includes(VIGIL) && t.includes(saidOn(bobsDay, '19:30')));
        const vigil = (await rows('Post', { kind: 'event' })).find((p) => p.caption === VIGIL) as Row;
        expect(vigil.eventOn).toEqual({ __type: 'Date', iso: `${bobsDay}T19:30:00.000Z` });
        // Ann's phone, in Lagos, with no reload: an hour later on her clock.
        await until(ann, 'Ann sees Bob’s event in her time', (t) => t.includes(VIGIL) && t.includes(saidOn(bobsDay, '20:30')), 20000);

        // ── Ann's profile: one post (the event), no prayer request, one testimony ──
        await clickButton(ann, '◯\nProfile');
        await until(ann, 'Ann’s profile', (t) => t.includes('Ann Mensah') && t.includes('Edit profile') && t.includes('testimony'));
        expect(await where(ann)).toBe(`/member/${anns}`);
        const counts = String(await ann.evaluate('document.querySelector(".gm-count").innerText')).replace(/\s+/g, ' ').trim();
        expect(counts).toBe('1 post 0 prayer requests 1 testimony');
        await shot(ann, 'phone-5-profile');
        overflow.push(['phone profile, three counts', await overflowX(ann)]);

        // ── each screen at the other size ──
        await ann.setViewport(TABLET);
        await ann.navigate('/new-post?kind=event');
        await until(ann, 'New event on a tablet', (t) => t.includes('New event') && t.includes('Starts at'));
        await shot(ann, 'tablet-3-new-event');
        overflow.push(['tablet New event (Ann)', await overflowX(ann)]);
        await bob.setViewport(PHONE);
        await bob.navigate('/feed');
        await until(bob, 'the feed on a phone', (t) => t.includes(VIGIL) && t.includes(TESTIMONY));
        await shot(bob, 'phone-6-feed-bob');
        overflow.push(['phone feed (Bob)', await overflowX(bob)]);
        await bob.navigate(`/post/${breakfast.objectId}`);
        await until(bob, 'the event’s own page', (t) => t.includes(BREAKFAST) && t.includes(saidOn(day, '8:00')) && t.includes('No comments yet'));
        await shot(bob, 'phone-7-event-page');
        overflow.push(['phone an event’s page', await overflowX(bob)]);

        seen.push(`Ann's console errors: ${JSON.stringify(ann.consoleErrors)}`);
        seen.push(`Bob's console errors: ${JSON.stringify(bob.consoleErrors)}`);
        expect(ann.consoleErrors).toEqual([]);
        expect(bob.consoleErrors).toEqual([]);
      });
    });
    // eslint-disable-next-line no-console
    console.log(['TWO-005 slice 4b drive:', ...seen, `overflow: ${JSON.stringify(overflow)}`].join('\n'));
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
