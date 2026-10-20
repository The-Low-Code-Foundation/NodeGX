/**
 * TWO-005 slice 2 — the feed, DRIVEN: the shipped template rendered headless by the real viewer, twice (two browsers,
 * two people, each signed in by their own emailed link), against one backend locked with the template's own policy.
 *
 * Ann, on a phone (390 px): an empty feed; a new post with a photo from the phone's camera (shrunk, uploaded for the
 * members only) and a caption; shared, it is the feed's first card with the photo drawn from a signed link. Bob, on a
 * tablet (1024×640), sees it, hearts it; Ann's count moves with no reload (AC2), and Bob's when Ann hearts back; Bob
 * takes his heart off; Bob comments on the post's page, and Ann's card says so, still with no reload. Then each screen
 * at the other size.
 *
 * 🔴 W1 in the real flow: the photo Ann's phone uploaded is private, shared with the members and the admins, and its
 * plain address answers a stranger 403.
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
import { request, type ParsePointer, type ParseRecord } from './helpers/http';
import { clickButton, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';

jest.setTimeout(900000);

const REPO = path.join(__dirname, '../../..');
const TEMPLATE = path.join(REPO, 'templates/gram');
const SHOTS = path.join(REPO, 'dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots');
const FUNCTIONS = ['whoAmI', 'sharePost', 'heartPost', 'commentOn'];
const PHONE = { width: 390, height: 800, mobile: true };
const TABLET = { width: 1024, height: 640, mobile: false };

type Row = Record<string, unknown>;
/** A Heart row, as far as this drive reads one. */
interface Heart extends ParseRecord {
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
  // What the page logged and asked of the live stream: a count that never moves is most often a refused subscription.
  const live = await page.evaluate('JSON.stringify(performance.getEntriesByType("resource").map(function (r) { return r.name; }).filter(function (n) { return /realtime/.test(n); }).slice(-4))').catch(() => '?');
  throw new Error(`${what}: never happened. The page said:\n${text.slice(0, 2500)}\nIts last console errors: ${JSON.stringify(page.consoleErrors.slice(-3))}\nIts last realtime requests: ${live}`);
}
const where = async (page: RenderedPage) => String(await page.evaluate('location.pathname'));

async function shot(page: RenderedPage, name: string): Promise<void> {
  if (process.env.TWO003_SHOTS === '0') return;
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SHOTS, `two005-feed-${name}.png`), Buffer.from(r.data, 'base64'));
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
  throw new Error(`${what}: ${seen} images drawn from "${part}", not ${n}. The page said:\n${(await bodyText(page)).slice(0, 800)}`);
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

/** A phone camera's photo: 4032×3024, with grain so it is a real JPEG's weight. */
async function cameraJpeg(file: string, hue: string): Promise<void> {
  const noise = await sharp({ create: { width: 4032, height: 3024, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } } as sharp.SharpOptions).png().toBuffer();
  await sharp({ create: { width: 4032, height: 3024, channels: 3, background: hue } }).composite([{ input: noise, blend: 'soft-light' }]).jpeg({ quality: 92 }).toFile(file);
}

describe('TWO-005 slice 2 — posts, hearts and comments, driven in two browsers', () => {
  let service: BackendService;
  let base: string;
  let port: number;
  let projectDir: string;
  let photoFile: string;
  const master = { authorization: 'Bearer t0k' };
  const mail: Array<{ to: string; subject: string; text: string }> = [];
  const seen: string[] = [];
  const overflow: Array<[string, number]> = [];
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}) =>
    (await request<{ results: T[] }>(base, 'GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, { headers: master })).json.results;

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-feed-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005feed', backendName: 'Grace Chapel', authToken: 't0k' });
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
      await request(base, 'POST', '/classes/Member', { body: { name, email, status: 'approved', role: 'member', login: ptr('_User', made.json.objectId) }, headers: master });
    }
    await request(base, 'POST', '/classes/Community', { body: { name: 'Grace Chapel', rules: 'Be kind.' }, headers: master });
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-feed-drive-project-'));
    fs.cpSync(TEMPLATE, projectDir, { recursive: true });
    bindProjectToBackend(projectDir, 'two005feed', port);
    photoFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'two005-photo-')), 'IMG_2041.jpg');
    await cameraJpeg(photoFile, '#c98a12');
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('Ann posts a photo on her phone; Bob hearts and comments on his tablet; each sees the other’s with no reload', async () => {
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
        /** A mark on the page's window: still there later means the page never reloaded. */
        const mark = (page: RenderedPage) => page.evaluate('window.__twoFeedMark = "kept"');
        const kept = async (page: RenderedPage) => (await page.evaluate('window.__twoFeedMark || ""')) === 'kept';

        // ── Ann, on her phone: an empty feed, then a post with a photo ──
        await ann.setViewport(PHONE);
        await signIn(ann, 'ann@example.com');
        await until(ann, 'the empty feed', (t) => t.includes('Nothing posted yet'));
        await shot(ann, 'phone-1-empty');
        overflow.push(['phone feed, empty', await overflowX(ann)]);
        await clickButton(ann, '＋ New post');
        await until(ann, 'the new post', (t) => t.includes('Before you post a photo of children') && t.includes('Share with the members'));
        await shot(ann, 'phone-2-new-post');
        overflow.push(['phone new post', await overflowX(ann)]);
        const pick = answerFileChooser(ann);
        await pick(photoFile);
        await clickButton(ann, '＋ Add a photo');
        await untilDrawn(ann, 'the photo, on its tile', 'sig=', 1, 30000);
        const [file] = (await request<{ results: Row[] }>(base, 'GET', '/classes/_Files', { headers: master })).json.results;
        expect(file).toMatchObject({ private: true, readers: ['role:member', 'role:admin'] });
        // 🔴 W1: the address the upload answered with, asked by someone with no account.
        expect((await fetch(`${base}/files/${file.storedName}`)).status).toBe(403);
        const stored = Buffer.from(await (await fetch(`${base}/files/${file.storedName}`, { headers: master })).arrayBuffer());
        const meta = await sharp(stored).metadata();
        expect([meta.width, meta.height]).toEqual([1600, 1200]);
        await fill(ann, 'Caption', 'Harvest Sunday: the hall after the service');
        await shot(ann, 'phone-3-new-post-photo');
        await clickButton(ann, 'Share with the members');
        await until(ann, 'the post in the feed', (t) => t.includes('Harvest Sunday: the hall after the service') && t.includes('No hearts yet'), 20000);
        await untilDrawn(ann, 'the photo in the card', 'sig=', 1, 20000);
        const [post] = await rows('Post');
        expect(post).toMatchObject({ caption: 'Harvest Sunday: the hall after the service', kind: 'post', photos: [{ name: file.storedName }] });
        await shot(ann, 'phone-4-posted');
        overflow.push(['phone feed, a post', await overflowX(ann)]);
        await mark(ann);

        // ── Bob, on his tablet: sees it, hearts it; Ann's count moves without a reload ──
        await bob.setViewport(TABLET);
        await signIn(bob, 'bob@example.com');
        await until(bob, 'Ann’s post', (t) => t.includes('Harvest Sunday') && t.includes('Ann Mensah'));
        await untilDrawn(bob, 'Ann’s photo, for Bob', 'sig=', 1, 20000);
        await shot(bob, 'tablet-1-feed');
        overflow.push(['tablet feed', await overflowX(bob)]);
        await mark(bob);
        await clickButton(bob, '♡ Heart');
        await until(bob, 'Bob’s heart', (t) => t.includes('♥ Hearted') && t.includes('1 heart · you'));
        const live = Date.now();
        await until(ann, 'Bob’s heart on Ann’s phone', (t) => t.includes('1 heart · Bob'), 15000);
        seen.push(`Bob's heart reached Ann's phone in ${Date.now() - live} ms (after Bob's own screen showed it)`);
        expect(await kept(ann)).toBe(true);
        expect((await rows('Heart')).length).toBe(1);
        await shot(bob, 'tablet-2-hearted');
        await shot(ann, 'phone-5-heart-arrived');

        // Ann hearts back; Bob's count moves.
        await clickButton(ann, '♡ Heart');
        await until(ann, 'Ann’s heart', (t) => t.includes('2 hearts · Bob and you'));
        await until(bob, 'Ann’s heart on Bob’s tablet', (t) => t.includes('2 hearts · you and Ann'), 15000);
        expect(await kept(bob)).toBe(true);
        // Bob takes his off.
        await clickButton(bob, '♥ Hearted');
        await until(bob, 'Bob’s heart off', (t) => t.includes('♡ Heart') && t.includes('1 heart · Ann'));
        await until(ann, 'Bob’s heart off on Ann’s phone', (t) => t.includes('1 heart · you'), 15000);
        expect((await rows<Heart>('Heart')).map((h) => h.doneBy.objectId).length).toBe(1);

        // ── Bob comments on the post's page; Ann's card says so ──
        await clickButton(bob, 'Comment');
        await until(bob, 'the post’s page', (t) => t.includes('No comments yet') && t.includes('Your comment'));
        expect(await where(bob)).toBe(`/post/${post.objectId}`);
        await fill(bob, 'Your comment', 'What a harvest. Thank God for every hand that helped.');
        await clickButton(bob, 'Comment');
        await until(bob, 'the comment', (t) => t.includes('1 comment') && t.includes('What a harvest.'));
        expect(await bob.evaluate('Array.prototype.map.call(document.querySelectorAll("textarea"), function (t) { return t.value; }).join("|")')).toBe('');
        expect((await rows('Comment', { post: ptr('Post', post.objectId) })).map((c) => c.text)).toEqual(['What a harvest. Thank God for every hand that helped.']);
        await shot(bob, 'tablet-3-post-comment');
        overflow.push(['tablet post', await overflowX(bob)]);
        await until(ann, 'the comment on Ann’s card', (t) => t.includes('View 1 comment'), 15000);
        expect(await kept(ann)).toBe(true);
        await shot(ann, 'phone-6-comment-arrived');

        // ── each screen at the other size ──
        await clickButton(ann, 'View 1 comment');
        await until(ann, 'the post’s page on the phone', (t) => t.includes('1 comment') && t.includes('What a harvest.'));
        await untilDrawn(ann, 'the photo on the post’s page', 'sig=', 1, 20000);
        await shot(ann, 'phone-7-post');
        overflow.push(['phone post', await overflowX(ann)]);
        await bob.navigate('/new-post');
        await until(bob, 'the new post on the tablet', (t) => t.includes('Share with the members'));
        await shot(bob, 'tablet-4-new-post');
        overflow.push(['tablet new post', await overflowX(bob)]);

        // 🔴 An empty share is refused by the page in words, and nothing is written.
        await clickButton(bob, 'Share with the members');
        await until(bob, 'an empty post refused', (t) => t.includes('Write something, or add a photo.'));
        expect((await rows('Post')).length).toBe(1);
        await shot(bob, 'tablet-5-empty-refused');

        seen.push(`Ann's console errors: ${JSON.stringify(ann.consoleErrors)}`);
        seen.push(`Bob's console errors: ${JSON.stringify(bob.consoleErrors)}`);
        // The one refusal the drive provoked (an empty post), and nothing else.
        expect(ann.consoleErrors).toEqual([]);
        expect(bob.consoleErrors.filter((e) => !e.includes('Write something, or add a photo.'))).toEqual([]);
      });
    });
    // eslint-disable-next-line no-console
    console.log(['TWO-005 slice 2 drive:', ...seen, `overflow: ${JSON.stringify(overflow)}`].join('\n'));
    expect(overflow.filter(([, px]) => px > 0)).toEqual([]);
  });
});
