/**
 * TWO-005 slice 3 — profiles, DRIVEN: the shipped template rendered headless by the real viewer, twice (two browsers,
 * two people, each signed in by their own emailed link), against one backend locked with the template's own policy.
 *
 * Bob has shared three posts already (through `sharePost`, one with a photo). Ann, on a phone (390 px): her own
 * profile, empty; Edit profile: a photo from the phone's camera (shrunk to 800 px, uploaded for the members only) and
 * a bio; saved, her profile shows them. From the feed she opens Bob's profile by his name: three posts in the grid, the
 * photo post drawn from a signed link; a tile opens its post, where she comments and her photo is beside it. Bob, on a
 * tablet (1024×640), opens Ann's profile from her comment and sees her photo (a member sees another member's photo);
 * his own grid is five across. Then each screen at the other size.
 *
 * 🔴 W1 in the real flow: Ann's profile photo is private, shared with the members and the admins, and its plain
 * address answers a stranger 403.
 *
 * The oracle for every write is the stored row, read with the master key, beside the screen.
 * Screenshots go to `dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/` (`TWO003_SHOTS=0` skips them).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import sharp from 'sharp';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request, type ParseRecord } from './helpers/http';
import { clickButton, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(900000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/gram');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const FUNCTIONS = ['whoAmI', 'sharePost', 'heartPost', 'commentOn', 'editProfile'];
const PHONE = { width: 390, height: 800, mobile: true };
const TABLET = { width: 1024, height: 640, mobile: false };
const MEMBERS = 'role:member, role:admin';
const BIO = 'Alto in the choir. Sunday school since 2019. Psalm 46:10.';

type Row = Record<string, unknown>;
/** A Member row, as far as this drive reads one. */
interface Member extends ParseRecord {
  photo?: { name: string };
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
const where = async (page: RenderedPage) => String(await page.evaluate('location.pathname'));

async function shot(page: RenderedPage, name: string): Promise<void> {
  if (process.env.TWO003_SHOTS === '0') return;
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SHOTS, `two005-profile-${name}.png`), Buffer.from(r.data, 'base64'));
}
const overflowX = async (page: RenderedPage) => Number(await page.evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)'));

/** How many images on the page are drawn (loaded, with pixels) from an address containing `part`. */
const drawn = async (page: RenderedPage, part: string) =>
  Number(await page.evaluate(`Array.prototype.filter.call(document.images, function (i) { return i.src.indexOf(${JSON.stringify(part)}) >= 0 && i.complete && i.naturalWidth > 0; }).length`));
async function untilDrawn(page: RenderedPage, what: string, part: string, n: number, ms = 20000): Promise<void> {
  const end = Date.now() + ms;
  let seen = 0;
  while (Date.now() < end) {
    seen = await drawn(page, part);
    if (seen === n) return;
    await wait(300);
  }
  const imgs = await page.evaluate('JSON.stringify(Array.prototype.map.call(document.images, function (i) { return [i.src.slice(-60), i.complete, i.naturalWidth]; }))');
  throw new Error(`${what}: ${seen} images drawn from "${part}", not ${n}. Images: ${imgs}. Console: ${JSON.stringify(page.consoleErrors.slice(-3))}. The page said:\n${(await bodyText(page)).slice(0, 800)}`);
}
/** Each drawn image whose address contains `part`: its size on screen, rounded. */
const sizes = async (page: RenderedPage, part: string) =>
  JSON.parse(
    String(
      await page.evaluate(
        `JSON.stringify(Array.prototype.filter.call(document.images, function (i) { return i.src.indexOf(${JSON.stringify(part)}) >= 0 && i.naturalWidth > 0; }).map(function (i) { var r = i.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }))`
      )
    )
  ) as Array<[number, number]>;
/** The grid's tiles: how many, and how many across (tiles sharing the first one's top). */
const grid = async (page: RenderedPage) =>
  JSON.parse(
    String(
      await page.evaluate(`(function () {
        var tiles = Array.prototype.slice.call(document.querySelectorAll('.gm-tile'));
        var top = tiles.length ? Math.round(tiles[0].getBoundingClientRect().top) : 0;
        var r = tiles.length ? tiles[0].getBoundingClientRect() : { width: 0, height: 0 };
        return JSON.stringify({ count: tiles.length, across: tiles.filter(function (t) { return Math.round(t.getBoundingClientRect().top) === top; }).length, w: Math.round(r.width), h: Math.round(r.height) });
      })()`)
    )
  ) as { count: number; across: number; w: number; h: number };

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

/** A phone camera's photo: 4032×3024, with grain so it is a real JPEG's weight. */
async function cameraJpeg(file: string, hue: string): Promise<void> {
  const noise = await sharp({ create: { width: 4032, height: 3024, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } } as sharp.SharpOptions).png().toBuffer();
  await sharp({ create: { width: 4032, height: 3024, channels: 3, background: hue } }).composite([{ input: noise, blend: 'soft-light' }]).jpeg({ quality: 92 }).toFile(file);
}

describe('TWO-005 slice 3 — profiles, driven in two browsers', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  let photoFile: string;
  const master = { authorization: 'Bearer t0k' };
  const mail: Array<{ to: string; subject: string; text: string }> = [];
  const seen: string[] = [];
  const overflow: Array<[string, number]> = [];
  const memberId: Record<string, string> = {};
  const bobsPosts: string[] = [];
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}) =>
    (await request<{ results: T[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, { headers: master })).json.results;

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-profile-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005profile', backendName: 'Grace Chapel', authToken: 't0k' });
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
      const m = await request<{ objectId: string }>(base, 'POST', '/classes/Member', { body: { name, email, status: 'approved', role: 'member', login: ptr('_User', made.json.objectId) }, headers: master });
      memberId[email] = m.json.objectId;
    }
    await request(base, 'POST', '/classes/Community', { body: { name: 'Grace Chapel', rules: 'Be kind.' }, headers: master });

    // Bob's three posts, as his phone would share them: a photo uploaded for the members, then sharePost.
    const bob = await request<{ sessionToken: string }>(base, 'POST', '/login', { body: { username: 'bob@example.com', password: 'unused-bob@example.com-pw' } });
    const asBob = { 'x-parse-session-token': bob.json.sessionToken };
    const green = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#1d4b3a' } }).jpeg().toBuffer();
    const up = await request<{ name: string; url: string }>(base, 'POST', '/files/hall.jpg', { body: green, headers: { ...asBob, 'x-nodegx-file-readers': MEMBERS }, raw: true });
    expect(up.status).toBe(201);
    for (const post of [
      { caption: 'The hall, ready for Harvest Sunday', photos: [{ name: up.json.name, url: up.json.url }] },
      { caption: 'Choir practice moves to Thursday at 7 this week. Bring the new hymn sheets, and a friend if they sing.' },
      { caption: 'Men’s breakfast on Saturday' }
    ]) {
      const r = await request<{ result: { postId: string } }>(base, 'POST', '/functions/sharePost', { body: { post }, headers: asBob });
      expect(r.status).toBe(200);
      bobsPosts.push(r.json.result.postId);
      await wait(20);
    }

    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-profile-drive-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two005profile', port);
    photoFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'two005-face-')), 'IMG_3107.jpg');
    // Not a shade an initials circle wears, so a screenshot tells the photo from the initials.
    await cameraJpeg(photoFile, '#2b8a9a');
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('Ann sets her photo and bio on her phone and visits Bob’s grid; Bob sees Ann’s photo on his tablet', async () => {
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
        const bob_ = memberId['bob@example.com'];

        // ── Ann, on her phone: her own profile, empty ──
        await ann.setViewport(PHONE);
        await signIn(ann, 'ann@example.com');
        await clickButton(ann, '◯\nProfile');
        await until(ann, 'Ann’s own profile', (t) => t.includes('Ann Mensah') && t.includes('You haven’t posted yet') && t.includes('Edit profile'));
        expect(await where(ann)).toBe(`/member/${ann_}`);
        expect(await bodyText(ann)).toContain('AM');
        await shot(ann, 'phone-1-own-empty');
        overflow.push(['phone own profile, empty', await overflowX(ann)]);

        // ── Edit profile: a photo from the camera, and a bio ──
        await clickButton(ann, 'Edit profile');
        await until(ann, 'the edit page', (t) => t.includes('Change photo') && t.includes('Only members who’ve been let in see your photo'));
        expect(await where(ann)).toBe('/profile/edit');
        expect(await bodyText(ann)).not.toContain('Remove photo');
        await shot(ann, 'phone-2-edit');
        overflow.push(['phone edit profile', await overflowX(ann)]);
        const pick = answerFileChooser(ann);
        await pick(photoFile);
        await clickButton(ann, 'Change photo');
        try {
          await untilDrawn(ann, 'the new photo, in the circle', 'sig=', 1, 30000);
        } catch (e) {
          const files = (await request<{ results: Row[] }>(base, 'GET', '/classes/_Files', { headers: master })).json.results.map((f) => [f.originalName, f.private, f.readers]);
          throw new Error(`${(e as Error).message}\nFiles: ${JSON.stringify(files)}`);
        }
        const file = (await request<{ results: Row[] }>(base, 'GET', '/classes/_Files', { headers: master })).json.results.filter((f) => f.originalName !== 'hall.jpg')[0];
        expect(file).toMatchObject({ private: true, readers: ['role:member', 'role:admin'] });
        // 🔴 W1: the address the upload answered with, asked by someone with no account.
        expect((await fetch(`${base}/files/${file.storedName}`)).status).toBe(403);
        const stored = Buffer.from(await (await fetch(`${base}/files/${file.storedName}`, { headers: master })).arrayBuffer());
        const meta = await sharp(stored).metadata();
        expect([meta.width, meta.height]).toEqual([800, 600]);
        // A round face, 80 across, cropped not squashed.
        expect(await sizes(ann, 'sig=')).toEqual([[80, 80]]);
        expect(await bodyText(ann)).toContain('Remove photo');
        await fill(ann, 'Bio (150 characters at most)', BIO);
        await shot(ann, 'phone-3-edit-photo');
        await clickButton(ann, 'Save');
        await until(ann, 'Ann’s profile, saved', (t) => t.includes(BIO) && t.includes('Edit profile'), 20000);
        expect(await where(ann)).toBe(`/member/${ann_}`);
        await untilDrawn(ann, 'Ann’s photo on her profile', 'sig=', 1, 20000);
        const [annRow] = await rows<Member>('Member', { objectId: ann_ });
        expect([annRow.bio, annRow.photo?.name]).toEqual([BIO, file.storedName]);
        expect((await rows('MemberHistory', { member: ptr('Member', ann_) })).pop()?.changed).toMatchObject({ bio: { from: null, to: BIO }, photo: { from: null, to: file.storedName } });
        await shot(ann, 'phone-4-own');
        overflow.push(['phone own profile', await overflowX(ann)]);

        // ── From the feed, Bob's profile by his name; his grid ──
        await clickButton(ann, '← The feed');
        await until(ann, 'the feed again', (t) => t.includes('Men’s breakfast on Saturday'));
        await clickButton(ann, 'Bob Owusu');
        await until(ann, 'Bob’s profile', (t) => t.includes('Bob Owusu') && t.includes('3') && t.includes('posts'));
        expect(await where(ann)).toBe(`/member/${bob_}`);
        expect(await bodyText(ann)).not.toContain('Edit profile');
        await untilDrawn(ann, 'the photo post in Bob’s grid', 'sig=', 1, 20000);
        const phoneGrid = await grid(ann);
        expect([phoneGrid.count, phoneGrid.across]).toEqual([3, 3]);
        expect(Math.abs(phoneGrid.w - phoneGrid.h)).toBeLessThanOrEqual(1);
        // 🔴 A tile is a button a keyboard reaches: the photo's is over the photo.
        const tileButtons = JSON.parse(String(await ann.evaluate('JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".gm-tile"), function (t) { var b = t.querySelector("button"); return b ? [b.tagName, b.tabIndex] : null; }))')));
        expect(tileButtons).toEqual([['BUTTON', 0], ['BUTTON', 0], ['BUTTON', 0]]);
        // The count sits beside the photo, not out in the row (s7's lesson: a box that must not stretch).
        const gap = Number(await ann.evaluate('(function () { var a = document.querySelector(".gm-av"); var c = document.querySelector(".gm-count"); return Math.round(c.getBoundingClientRect().left - a.getBoundingClientRect().right); })()'));
        expect(gap).toBeLessThanOrEqual(32);
        await shot(ann, 'phone-5-bob');
        overflow.push(['phone Bob’s profile', await overflowX(ann)]);
        // The newest is first: a post of words, shown by its first words; the oldest, the photo, opens its post.
        const firstWords = String(await ann.evaluate('document.querySelector(".gm-tile button").innerText')).trim();
        expect(firstWords).toBe('Men’s breakfast on Saturday');
        const photoLabel = String(await ann.evaluate('document.querySelectorAll(".gm-tile")[2].querySelector("button").innerText')).trim();
        expect(photoLabel).toMatch(/^Photo post, .*: The hall, ready for Harvest Sunday$/);
        await clickButton(ann, photoLabel);
        await until(ann, 'the photo post', (t) => t.includes('The hall, ready for Harvest Sunday') && t.includes('Your comment'));
        expect(await where(ann)).toBe(`/post/${bobsPosts[0]}`);

        // ── Ann comments; her photo is beside it ──
        await fill(ann, 'Your comment', 'It looks beautiful. See you there.');
        await clickButton(ann, 'Comment');
        await until(ann, 'Ann’s comment', (t) => t.includes('1 comment') && t.includes('It looks beautiful.'));
        // The post's photo and Ann's face by her comment.
        await untilDrawn(ann, 'the post’s photo and Ann’s face', 'sig=', 2, 20000);
        expect((await sizes(ann, 'sig=')).filter(([w, h]) => w === 28 && h === 28)).toHaveLength(1);
        await shot(ann, 'phone-6-comment-face');
        overflow.push(['phone post with a face', await overflowX(ann)]);

        // ── Bob, on his tablet: opens Ann's profile from her comment and sees her photo ──
        await bob.setViewport(TABLET);
        await signIn(bob, 'bob@example.com');
        await bob.navigate(`/post/${bobsPosts[0]}`);
        await until(bob, 'Ann’s comment on Bob’s post', (t) => t.includes('It looks beautiful.'));
        await clickButton(bob, 'Ann Mensah');
        await until(bob, 'Ann’s profile, for Bob', (t) => t.includes(BIO) && t.includes('Ann hasn’t posted yet.'));
        expect(await where(bob)).toBe(`/member/${ann_}`);
        expect(await bodyText(bob)).not.toContain('Edit profile');
        await untilDrawn(bob, 'Ann’s photo, for Bob', 'sig=', 1, 20000);
        await shot(bob, 'tablet-1-ann');
        overflow.push(['tablet Ann’s profile', await overflowX(bob)]);
        // His own: the grid five across, three tiles on its first row.
        await bob.navigate(`/member/${bob_}`);
        await until(bob, 'Bob’s own profile', (t) => t.includes('Edit profile') && t.includes('posts'));
        await untilDrawn(bob, 'the photo post in Bob’s own grid', 'sig=', 1, 20000);
        const tabletGrid = await grid(bob);
        expect([tabletGrid.count, tabletGrid.across]).toEqual([3, 3]);
        // Five across: a tile is a fifth of the row, less the gaps.
        const row = Number(await bob.evaluate('Math.round(document.querySelector(".gm-grid").getBoundingClientRect().width)'));
        expect(Math.abs(tabletGrid.w - (row - 8) / 5)).toBeLessThanOrEqual(1);
        const tabletGap = Number(await bob.evaluate('(function () { var a = document.querySelector(".gm-av"); var c = document.querySelector(".gm-count"); return Math.round(c.getBoundingClientRect().left - a.getBoundingClientRect().right); })()'));
        expect(tabletGap).toBeLessThanOrEqual(32);
        await shot(bob, 'tablet-2-own');
        overflow.push(['tablet own profile', await overflowX(bob)]);
        await clickButton(bob, 'Edit profile');
        await until(bob, 'the edit page on the tablet', (t) => t.includes('Change photo'));
        await shot(bob, 'tablet-3-edit');
        overflow.push(['tablet edit profile', await overflowX(bob)]);

        // 🔴 Too long is held on the page, in words, and nothing is written.
        await fill(bob, 'Bio (150 characters at most)', 'b'.repeat(151));
        await clickButton(bob, 'Save');
        await until(bob, 'a long bio held', (t) => t.includes('A bio of 150 characters or fewer. This one has 151.'));
        expect((await rows('Member', { objectId: bob_ }))[0].bio ?? null).toBeNull();
        await shot(bob, 'tablet-4-long-bio');

        // ── each screen at the other size ──
        await ann.navigate(`/member/${bob_}`);
        await until(ann, 'Bob’s profile again', (t) => t.includes('Bob Owusu'));
        await ann.setViewport(TABLET);
        await untilDrawn(ann, 'Bob’s grid on a tablet', 'sig=', 1, 20000);
        await bob.setViewport(PHONE);
        await bob.navigate(`/member/${ann_}`);
        await until(bob, 'Ann’s profile on a phone', (t) => t.includes(BIO));
        await untilDrawn(bob, 'Ann’s photo on a phone', 'sig=', 1, 20000);
        await shot(bob, 'phone-7-ann');
        overflow.push(['phone Ann’s profile', await overflowX(bob)]);

        seen.push(`Ann's console errors: ${JSON.stringify(ann.consoleErrors)}`);
        seen.push(`Bob's console errors: ${JSON.stringify(bob.consoleErrors)}`);
        expect(ann.consoleErrors).toEqual([]);
        // The one refusal the drive provoked (a long bio, held on the page: no request), and nothing else.
        expect(bob.consoleErrors).toEqual([]);
      });
    });
    // eslint-disable-next-line no-console
    console.log(['TWO-005 slice 3 drive:', ...seen, `overflow: ${JSON.stringify(overflow)}`].join('\n'));
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
