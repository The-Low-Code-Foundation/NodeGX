/**
 * TWO-005 slice 5 — moderation, DRIVEN: the shipped template rendered headless by the real viewer, twice (two
 * browsers, two people), against one backend locked with the template's own policy.
 *
 * Ann, a member, on a phone (390 px), signed in by her emailed link: she reports Bob's post (Spam, with a note), and
 * Bob's comment under her own post (Unkind), and takes her own wrong post down. Ama, an admin, on a tablet (1024×640),
 * signed in with her password: the queue has Bob's post and his comment under Reported and Ann's under Hidden; she
 * looks at Bob's post, hides it (the reason starts as Spam); 🔴 AC4: it is gone from Ann's feed and stays on Ama's
 * screens, with why. She hides the comment with her own words, blocks Bob from his profile (refused without a reason),
 * and he can't sign in; she lets him back, he can; she brings his post back and Ann's feed has it again. She changes
 * the rules; Ann reads them, with no editor. Then each screen at the other size.
 *
 * The oracle for every write is the stored row, read with the master key, beside the screen; for "gone for members",
 * also Ann's own session asking the backend.
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request, type ParseDate, type ParsePointer, type ParseRecord } from './helpers/http';
import { clickButton, clickButtonInRow, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(900000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/gram');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const FUNCTIONS = ['whoAmI', 'sharePost', 'heartPost', 'commentOn', 'editProfile', 'prayFor', 'report', 'hide', 'block', 'writeRules'];
const PHONE = { width: 390, height: 800, mobile: true };
const TABLET = { width: 1024, height: 640, mobile: false };
const TAKEN_DOWN = 'Taken down by the member who wrote it.';
const BOBS = 'Cheap phones for sale, DM me';
const LUNCH = 'Sunday lunch with the youth group';
const WRONG = 'Wrong photo, sorry';
const RUDE = 'Who let you in?';
const RULES = 'Be kind to each other.\nNo photo of a child without their parent’s yes.\nNothing for sale.';

type Row = Record<string, unknown>;
/** The rows this drive reads into: a Report, a CommentReport, and a Post or Member that may have been ended. */
interface Report extends ParseRecord {
  post: ParsePointer;
  doneBy: ParsePointer;
}
interface CommentReport extends ParseRecord {
  comment: ParsePointer;
}
interface Ended extends ParseRecord {
  endedAt?: ParseDate;
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
  fs.writeFileSync(path.join(SHOTS, `two005-moderate-${name}.png`), Buffer.from(r.data, 'base64'));
}
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

/** Pick the option whose words match in the nth dropdown, the way a change from a person arrives. */
async function choose(page: RenderedPage, words: string, nth = 0): Promise<void> {
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
/** The options a person can pick (the Dropdown's own hidden, empty first option isn't one), and what the closed box says. */
const options = async (page: RenderedPage) => JSON.parse(String(await page.evaluate('JSON.stringify(Array.prototype.filter.call(document.querySelector("select").options, function (o) { return !o.hidden; }).map(function (o) { return o.textContent; }))'))) as string[];
/** A field's value as the page holds it (the reason an admin's hide starts with). */
const valueOf = async (page: RenderedPage, nth = 0) => String(await page.evaluate(`(function () { var i = document.querySelectorAll('input[type="text"], input:not([type]), textarea')[${nth}]; return i ? i.value : 'no field'; })()`));
/** A pill as drawn: its words and its fill. */
const pill = async (page: RenderedPage, words: string) =>
  JSON.parse(
    String(
      await page.evaluate(`(function () {
        var p = Array.prototype.filter.call(document.querySelectorAll('.gm-pill'), function (x) { return (x.innerText || '').indexOf(${JSON.stringify(words)}) >= 0; })[0];
        if (!p) return JSON.stringify(null);
        var s = getComputedStyle(p);
        return JSON.stringify({ words: p.innerText.trim(), fill: s.backgroundColor, ink: s.color, radius: s.borderTopLeftRadius });
      })()`)
    )
  ) as { words: string; fill: string; ink: string; radius: string } | null;

const BAD_BG = 'rgb(251, 228, 225)';
const GOLD_BG = 'rgb(251, 241, 220)';
const QUIET_BG = 'rgb(246, 243, 248)';
const OK_BG = 'rgb(226, 244, 234)';

describe('TWO-005 slice 5 — moderation, driven in two browsers', () => {
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
  const session: Record<string, Record<string, string>> = {};
  const post: Record<string, string> = {};
  let rudeComment = '';
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    (await request<{ results: T[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, { headers })).json.results ?? [];
  const passwordOf = (email: string) => `pw-${email}-long`;
  const login = (email: string) => request<{ sessionToken?: string }>(base, 'POST', '/login', { body: { username: email, password: passwordOf(email) } });

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-moderate-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005moderate', backendName: 'Grace Chapel', authToken: 't0k' });
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
    // Ann and Bob, let in; Ama, the admin, with the password she made at set-up.
    for (const [name, email, role] of [['Ann Mensah', 'ann@example.com', 'member'], ['Bob Owusu', 'bob@example.com', 'member'], ['Ama Kumi', 'ama@example.com', 'admin']]) {
      const made = await request<{ objectId: string }>(base, 'POST', '/admin/users', { body: { username: email, email, password: passwordOf(email), roles: [role] }, headers: master });
      expect(made.status).toBe(201);
      userId[email] = made.json.objectId;
      const m = await request<{ objectId: string }>(base, 'POST', '/classes/Member', { body: { name, email, status: 'approved', role, login: ptr('_User', made.json.objectId) }, headers: master });
      memberId[email] = m.json.objectId;
      session[email] = { 'x-parse-session-token': String((await login(email)).json.sessionToken) };
    }
    await request(base, 'POST', '/classes/Community', { body: { name: 'Grace Chapel', rules: 'Be kind.' }, headers: master });
    const share = async (email: string, caption: string) => {
      const r = await request<{ result: { postId: string } }>(base, 'POST', '/functions/sharePost', { body: { post: { caption } }, headers: session[email] });
      expect(r.status).toBe(200);
      return r.json.result.postId;
    };
    post.wrong = await share('ann@example.com', WRONG);
    post.lunch = await share('ann@example.com', LUNCH);
    post.bobs = await share('bob@example.com', BOBS);
    const c = await request<{ result: { commentId: string } }>(base, 'POST', '/functions/commentOn', { body: { comment: { postId: post.lunch, text: RUDE } }, headers: session['bob@example.com'] });
    rudeComment = c.json.result.commentId;

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-moderate-drive-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two005moderate', port);
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('Ann reports and takes down on her phone; Ama hides, blocks, lets back and writes the rules on her tablet', async () => {
    await withRenderedPage({ projectDir, backendPort: port }, async (ann) => {
      await withRenderedPage({ projectDir, backendPort: port }, async (ama) => {
        const appOf = (p: RenderedPage) => `http://127.0.0.1:${p.servePort}`;
        const auth = await request(base, 'PUT', '/admin/auth', { body: { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: false }, redirectAllowList: [appOf(ann), appOf(ama)] }, headers: master });
        expect(auth.status).toBe(200);

        // ── Ann, on her phone, signed in by her link ──
        await ann.setViewport(PHONE);
        await ann.navigate('/sign-in');
        await until(ann, 'sign in', (t) => t.includes('Email me a link'));
        await fill(ann, 'Your email', 'ann@example.com');
        await clickButton(ann, 'Email me a link');
        await until(ann, 'the link is on its way', (t) => t.includes('a link is on its way'));
        await wait(200);
        const sent = mail.filter((m) => m.to === 'ann@example.com' && /magic-link/.test(m.text)).pop();
        if (!sent) throw new Error('no sign-in mail for Ann');
        await ann.evaluate(`location.href = ${JSON.stringify((/https?:[^\s]+\/auth\/magic-link\/callback\?token=[^\s]+/.exec(sent.text) as RegExpExecArray)[0])}`);
        await until(ann, 'the backend’s sign-in page', (t) => t.includes('Sign in to Grace Chapel'));
        await clickButton(ann, 'Sign in');
        await until(ann, 'the feed', (t) => t.includes('The feed') && t.includes(BOBS), 20000);

        // ── Bob's post: Report, and no Take down ──
        await ann.navigate(`/post/${post.bobs}`);
        await until(ann, 'Bob’s post', (t) => t.includes(BOBS) && t.includes('Report this post'));
        expect((await bodyText(ann)).includes('Take this post down')).toBe(false);
        await clickButton(ann, 'Report this post');
        await until(ann, 'Report a post', (t) => t.includes('Report a post') && t.includes(`A post by Bob Owusu: “${BOBS}”`));
        expect(await where(ann)).toBe(`/report?post=${post.bobs}`);
        expect(await options(ann)).toEqual(['A child shown without a parent’s yes', 'Unkind', 'Spam', 'Something else']);
        expect(await bodyText(ann)).toContain('Choose why');
        expect(await bodyText(ann)).toContain('The member you report never does.');
        await shot(ann, 'phone-1-report-post');
        overflow.push(['phone Report a post', await overflowX(ann)]);
        // 🔴 Held without a reason, in words, and nothing sent.
        await clickButton(ann, 'Send to the admins');
        await until(ann, 'held: choose why', (t) => t.includes('Choose why.'));
        expect(await rows('Report')).toEqual([]);
        await choose(ann, 'Spam');
        await fill(ann, 'Anything the admins should know (500 characters at most)', 'He posts this every day.');
        await clickButton(ann, 'Send to the admins');
        await until(ann, 'thanks', (t) => t.includes('Thanks. The admins will look at it. Bob won’t see who reported it.'));
        const [reported] = await rows<Report>('Report');
        expect([reported.post.objectId, reported.doneBy.objectId, reported.reason, reported.note]).toEqual([post.bobs, userId['ann@example.com'], 'spam', 'He posts this every day.']);
        await shot(ann, 'phone-2-reported');

        // ── Bob's comment under her own post: Report there; on her own post, Take down, not Report ──
        await ann.navigate(`/post/${post.lunch}`);
        await until(ann, 'Ann’s post with Bob’s comment', (t) => t.includes(LUNCH) && t.includes(RUDE) && t.includes('Take this post down'));
        expect((await bodyText(ann)).includes('Report this post')).toBe(false);
        await clickButtonInRow(ann, 'Report', RUDE);
        await until(ann, 'Report a comment', (t) => t.includes('Report a comment') && t.includes(`A comment by Bob Owusu: “${RUDE}”`));
        expect(await options(ann)).toEqual(['Unkind', 'Spam', 'Something else']);
        await choose(ann, 'Unkind');
        await clickButton(ann, 'Send to the admins');
        await until(ann, 'thanks for the comment', (t) => t.includes('Bob won’t see who reported it.'));
        expect((await rows<CommentReport>('CommentReport')).map((r) => [r.comment.objectId, r.reason])).toEqual([[rudeComment, 'unkind']]);

        // ── Her wrong post: Take it down, asked first ──
        await ann.navigate(`/post/${post.wrong}`);
        await until(ann, 'her wrong post', (t) => t.includes(WRONG) && t.includes('Take this post down'));
        await clickButton(ann, 'Take this post down');
        await until(ann, 'asked first', (t) => t.includes('Take it down? Members stop seeing it straight away.'));
        await shot(ann, 'phone-3-take-down');
        overflow.push(['phone Take it down?', await overflowX(ann)]);
        await clickButton(ann, 'Keep it');
        await until(ann, 'kept', (t) => !t.includes('Take it down?'));
        expect((await rows('Post', { objectId: post.wrong }))[0].endedAt ?? null).toBe(null);
        await clickButton(ann, 'Take this post down');
        await clickButton(ann, 'Yes, take it down');
        await until(ann, 'the feed without it', (t) => t.includes('The feed') && t.includes(LUNCH) && !t.includes(WRONG));
        const down = (await rows<Ended>('Post', { objectId: post.wrong }))[0];
        expect([typeof down.endedAt?.iso, down.hiddenReason, down.ACL]).toEqual(['string', TAKEN_DOWN, { 'role:admin': { read: true } }]);
        expect(await rows('Post', { objectId: post.wrong }, session['ann@example.com'])).toEqual([]);

        // ── Ama, on her tablet, signed in with her password: the queue ──
        await ama.setViewport(TABLET);
        await ama.navigate('/sign-in');
        await until(ama, 'sign in', (t) => t.includes('Sign in with the password'));
        await fill(ama, 'Your email', 'ama@example.com');
        await fill(ama, 'Password', passwordOf('ama@example.com'));
        await clickButton(ama, 'Sign in with the password');
        await until(ama, 'the queue', (t) => t.includes('Waiting for you') && t.includes('Reported (2)'), 20000);
        expect(await where(ama)).toBe('/admin');
        let queue = await bodyText(ama);
        expect(queue).toMatch(/Post by Bob Owusu · reported by 1 member · /);
        expect(queue).toMatch(/Comment by Bob Owusu · reported by 1 member · /);
        expect(queue).toContain('Hidden from members (1)');
        expect(queue).toContain(`Post by Ann Mensah · ${TAKEN_DOWN}`);
        expect(await pill(ama, 'Spam')).toMatchObject({ fill: GOLD_BG, radius: '999px' });
        expect(await pill(ama, 'Hidden')).toMatchObject({ fill: QUIET_BG });
        // Found in the shots: with nobody waiting, no empty list (it drew as a line) and no note on No.
        expect([queue.includes('Nobody is waiting to be let in.'), queue.includes('No keeps them out')]).toEqual([true, false]);
        await shot(ama, 'tablet-1-queue');
        overflow.push(['tablet queue', await overflowX(ama)]);

        // ── Look at Bob's post; hide it, the reason starting as Spam ──
        await clickButtonInRow(ama, 'Look', 'Post by Bob Owusu');
        await until(ama, 'the look', (t) => t.includes('A post') && t.includes(BOBS) && t.includes('In the feed: every member sees it.'));
        expect(await where(ama)).toBe(`/admin/look?post=${post.bobs}`);
        const look = await bodyText(ama);
        expect(look).toContain('Reported by 1 member');
        expect(look).toMatch(/Reported by Ann Mensah · /);
        expect(look).toContain('He posts this every day.');
        expect(await valueOf(ama)).toBe('Spam');
        expect(await pill(ama, 'In the feed')).toMatchObject({ fill: OK_BG });
        await shot(ama, 'tablet-2-look');
        overflow.push(['tablet Look', await overflowX(ama)]);
        await clickButton(ama, 'Hide from members');
        await until(ama, 'hidden', (t) => t.includes('Hidden from members: Spam.') && t.includes('Bring it back'));
        const hidden = (await rows<Ended>('Post', { objectId: post.bobs }))[0];
        expect([typeof hidden.endedAt?.iso, hidden.hiddenReason, hidden.ACL]).toEqual(['string', 'Spam', { 'role:admin': { read: true } }]);
        await shot(ama, 'tablet-3-hidden');

        // ── 🔴 AC4: gone for Ann, asked for directly; stays for Ama, with why ──
        expect(await rows('Post', { objectId: post.bobs }, session['ann@example.com'])).toEqual([]);
        // Live, or on her next look: measured, the first then the second.
        await ann.navigate('/feed');
        let gone = false;
        const end = Date.now() + 8000;
        while (!gone && Date.now() < end) {
          gone = !(await bodyText(ann)).includes(BOBS) && (await bodyText(ann)).includes(LUNCH);
          if (!gone) await wait(250);
        }
        seen.push(`Ann's feed dropped Bob's hidden post: ${gone}`);
        expect(gone).toBe(true);
        await ann.navigate(`/post/${post.bobs}`);
        await until(ann, 'not in the feed', (t) => t.includes('This post isn’t in the feed any more.'));
        await ama.navigate(`/post/${post.bobs}`);
        await until(ama, 'Ama opens it, told why', (t) => t.includes(BOBS) && t.includes('Hidden from members: Spam.') && t.includes('Reports and hiding'));
        await ama.navigate('/admin');
        await until(ama, 'the queue again', (t) => t.includes('Reported (1)') && t.includes('Hidden from members (2)'));
        expect(await bodyText(ama)).toContain('Post by Bob Owusu · Spam · ');

        // ── The comment: hidden with Ama's own words ──
        await clickButtonInRow(ama, 'Look', 'Comment by Bob Owusu');
        await until(ama, 'the comment', (t) => t.includes('A comment') && t.includes(RUDE) && t.includes(`Under Ann Mensah’s post: “${LUNCH}”`));
        expect(await valueOf(ama)).toBe('Unkind');
        await fill(ama, 'Why it’s hidden (admins see this; 500 characters at most)', 'Unkind to a new member');
        await clickButton(ama, 'Hide from members');
        await until(ama, 'the comment hidden', (t) => t.includes('Hidden from members: Unkind to a new member.'));
        expect((await rows('Comment', { objectId: rudeComment }))[0].hiddenReason).toBe('Unkind to a new member');
        expect(await rows('Comment', { objectId: rudeComment }, session['ann@example.com'])).toEqual([]);

        // ── Block Bob, from his profile ──
        await clickButton(ama, 'Bob’s profile');
        await until(ama, 'Bob’s profile', (t) => t.includes('Bob Owusu') && t.includes('Block Bob'));
        expect(await where(ama)).toBe(`/member/${memberId['bob@example.com']}`);
        await clickButton(ama, 'Block Bob');
        await until(ama, 'held: say why', (t) => t.includes('Say why. Admins see the reason; the member doesn’t.'));
        expect((await rows('Member', { objectId: memberId['bob@example.com'] }))[0].endedAt ?? null).toBe(null);
        await fill(ama, 'Why block them (admins see this; 500 characters at most)', 'Selling in the comments');
        await clickButton(ama, 'Block Bob');
        await until(ama, 'blocked', (t) => t.includes('Blocked: Selling in the comments.') && t.includes('They can’t sign in, and nothing they wrote is shown to members.') && t.includes('Let Bob back'));
        const bob = (await rows<Ended>('Member', { objectId: memberId['bob@example.com'] }))[0];
        expect([bob.blockedReason, typeof bob.endedAt?.iso]).toEqual(['Selling in the comments', 'string']);
        expect((await login('bob@example.com')).status === 200).toBe(false);
        expect(await pill(ama, 'Blocked:')).toMatchObject({ fill: BAD_BG });
        await shot(ama, 'tablet-4-blocked');
        overflow.push(['tablet a blocked profile', await overflowX(ama)]);
        await ama.navigate('/admin');
        await until(ama, 'Blocked in the queue', (t) => t.includes('Blocked (1)') && t.includes('Blocked: Selling in the comments'));
        await shot(ama, 'tablet-5-queue-blocked');

        // ── Let him back: he signs in; his post stays hidden for its own reason until Ama brings it back ──
        await clickButtonInRow(ama, 'Profile', 'Blocked: Selling in the comments');
        await until(ama, 'Let Bob back', (t) => t.includes('Let Bob back'));
        await clickButton(ama, 'Let Bob back');
        await until(ama, 'Bob is back', (t) => t.includes('Block Bob') && !t.includes('Let Bob back'));
        expect((await login('bob@example.com')).status).toBe(200);
        expect(await rows('Post', { objectId: post.bobs }, session['ann@example.com'])).toEqual([]);
        await ama.navigate(`/admin/look?post=${post.bobs}`);
        await until(ama, 'Bring it back offered', (t) => t.includes('Hidden from members: Spam.') && t.includes('Bring it back'));
        await clickButton(ama, 'Bring it back');
        await until(ama, 'in the feed again', (t) => t.includes('In the feed: every member sees it.'));
        await ann.navigate('/feed');
        await until(ann, 'Bob’s post back in Ann’s feed', (t) => t.includes(BOBS));

        // ── The rules: Ama writes them; Ann reads them, with no editor ──
        await ama.navigate('/admin');
        await until(ama, 'the queue', (t) => t.includes('Community rules'));
        await clickButton(ama, 'Community rules');
        await until(ama, 'the rules, with the editor', (t) => t.includes('Save the rules') && t.includes('Be kind.'));
        expect(await valueOf(ama)).toBe('Be kind.');
        await ama.evaluate(`(function () {
          var el = document.querySelector('textarea');
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, ${JSON.stringify(RULES)});
          el.dispatchEvent(new Event('input', { bubbles: true }));
        })()`);
        await wait(300);
        await clickButton(ama, 'Save the rules');
        await until(ama, 'saved', (t) => t.includes('Saved. Every member reads these now') && t.includes('Nothing for sale.'));
        expect((await rows('Community'))[0].rules).toBe(RULES);
        expect((await rows('CommunityHistory')).map((h) => h.changed)).toEqual([{ rules: { from: 'Be kind.', to: RULES } }]);
        // Found in the shots: the editor showed two lines of three. Every line of the rules fits it.
        expect(Number(await ama.evaluate('(function () { var t = document.querySelector("textarea"); return t.scrollHeight - t.clientHeight; })()'))).toBeLessThanOrEqual(0);
        await shot(ama, 'tablet-6-rules-admin');
        overflow.push(['tablet rules, admin', await overflowX(ama)]);
        await ann.navigate('/rules');
        await until(ann, 'Ann reads the rules', (t) => t.includes('Nothing for sale.'));
        const annRules = await bodyText(ann);
        expect([annRules.includes('Save the rules'), annRules.includes('Be kind to each other.\nNo photo of a child')]).toEqual([false, true]);
        await shot(ann, 'phone-4-rules');
        overflow.push(['phone rules', await overflowX(ann)]);

        // ── each screen at the other size ──
        await ann.setViewport(TABLET);
        await ann.navigate(`/report?post=${post.lunch}`);
        await until(ann, 'her own, on a tablet', (t) => t.includes('This is yours. Take it down from its page instead'));
        expect((await bodyText(ann)).includes('Send to the admins')).toBe(false);
        await shot(ann, 'tablet-7-report-own');
        overflow.push(['tablet Report, your own', await overflowX(ann)]);
        await ama.setViewport(PHONE);
        await ama.navigate('/admin');
        await until(ama, 'the queue on a phone', (t) => t.includes('Hidden from members (2)'));
        await shot(ama, 'phone-5-queue');
        overflow.push(['phone queue', await overflowX(ama)]);
        await ama.navigate(`/admin/look?comment=${rudeComment}`);
        await until(ama, 'the comment on a phone', (t) => t.includes(RUDE) && t.includes('Bring it back'));
        // Found in the shots: lines drawn between the comment's name, its words and what it is under. Nothing inside the box draws one.
        const lines = JSON.parse(String(await ama.evaluate(`JSON.stringify(Array.prototype.filter.call(document.querySelectorAll('.gm-box *'), function (e) { var s = getComputedStyle(e); return parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0; }).map(function (e) { var s = getComputedStyle(e); return e.tagName + '.' + e.className + ' ' + s.borderTopWidth + '/' + s.borderBottomWidth + ' ' + (e.innerText || '').slice(0, 20); }))`)));
        expect(lines).toEqual([]);
        await shot(ama, 'phone-6-look-comment');
        overflow.push(['phone Look, a comment', await overflowX(ama)]);
        await ama.navigate(`/member/${memberId['bob@example.com']}`);
        await until(ama, 'Block on a phone', (t) => t.includes('Block Bob'));
        await shot(ama, 'phone-7-profile-block');
        overflow.push(['phone profile, Block', await overflowX(ama)]);

        seen.push(`Ann's console errors: ${JSON.stringify(ann.consoleErrors)}`);
        seen.push(`Ama's console errors: ${JSON.stringify(ama.consoleErrors)}`);
        expect(ann.consoleErrors).toEqual([]);
        expect(ama.consoleErrors).toEqual([]);
      });
    });
    // eslint-disable-next-line no-console
    console.log(['TWO-005 slice 5 drive:', ...seen, `overflow: ${JSON.stringify(overflow)}`].join('\n'));
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
