/**
 * TWO-005 slice 2 — posting, hearting and commenting, through the gram's own cloud functions.
 *
 * 🔴 **It runs the SHIPPED functions** (`templates/gram/components/__cloud__/`, written by `npm run template:gram`) on
 * a backend locked with the template's own `nodegx.security.json`. Slice 1's spec proves how people get in; here the
 * people are seeded with the master key (a sign-in, its roles, its Member), as the marketplace's slice 2 seeded its
 * shop, and every write after that is a function call or a photo upload by the person.
 *
 * What it proves (TWO-005 slice 2; the world's rule for children, W1, and the relations heart and comment):
 *
 * - a member shares a post with a caption and photos; every member and admin reads it and its photos;
 * - 🔴 a photo that isn't shared with the members and the admins, or isn't the poster's, or isn't a photo, never gets
 *   into a post (the function reads the file's own row); nor does a fifth photo, an empty post or a long caption;
 * - 🔴 nobody waiting, blocked or a stranger can post, heart or comment (the policy, and the function for a member
 *   whose row is blocked);
 * - a heart goes on once, comes off, and the count is by person — a burst of taps by one person counts once;
 * - a comment of a few words goes under a post; an empty or long one doesn't;
 * - 🔴 a hidden post, or one by a blocked member, takes no heart and no comment.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request, type ParsePointer, type ParseRecord } from './helpers/http';

jest.setTimeout(90000);

/** `TWO005_TEMPLATE` points the spec at a copy of the template (a mutant); unset, it is the shipped one. */
const TEMPLATE = process.env.TWO005_TEMPLATE || path.join(__dirname, '../../../templates/gram');
const FUNCTIONS = ['whoAmI', 'sharePost', 'heartPost', 'commentOn'];
/** What the posting page uploads a photo with (`two005Feed.ts` `PHOTO_READERS`). */
const MEMBERS = 'role:member, role:admin';

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d4944415478da63fccfc0500f000485018084a98c210000000049454e44ae426082',
  'hex'
);
const PDF = Buffer.from('%PDF-1.4\n%a note\n%%EOF', 'ascii');

interface Answer<R = Record<string, unknown>> {
  result?: R;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, unknown>;
/** A Heart row, as far as this spec reads one. */
interface Heart extends ParseRecord {
  doneBy: ParsePointer;
}
interface Photo {
  name: string;
  url: string;
}

describe('TWO-005 slice 2 — posts, hearts and comments, through the template’s functions', () => {
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) => request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const day = (iso: string) => ({ __type: 'Date', iso });

  const who: Record<string, Record<string, string>> = { stranger: {} };
  const userId: Record<string, string> = {};
  const memberId: Record<string, string> = {};
  const call = <R = Record<string, unknown>>(fn: string, body: Record<string, unknown>, as: string) => req<Answer<R>>('POST', `/functions/${fn}`, body, who[as]);
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    req<{ results: T[] }>('GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, undefined, headers);
  const reason = (a: { json: Answer }) => String(a.json.error ?? '');

  /** A photo as the posting page sends it: the bytes, with the member's session and who may read it. */
  async function upload(as: string, bytes = PNG, readers: string | null = MEMBERS, name = 'lunch.png'): Promise<Photo> {
    const headers: Record<string, string> = { ...who[as], ...(readers === null ? {} : { 'x-nodegx-file-readers': readers }) };
    const up = await request<Photo>(base, 'POST', `/files/${name}`, { body: bytes, headers, raw: true });
    expect(up.status).toBe(201);
    return { name: up.json.name, url: up.json.url };
  }

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two005-feed-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005f', backendName: 'TWO-005 feed', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    for (const role of ['admin', 'member']) expect((await req('POST', '/admin/roles', { name: role })).status).toBe(201);

    // ama: the first admin (role:admin alone, as setUpCommunity makes her). ann, bob: members. cara: a member whose
    // row is blocked but whose role was not yet taken (the function's own check). wes: waiting. zed: blocked.
    const people: Array<[string, string, string[], Row?]> = [
      ['ama', 'approved', ['admin']],
      ['ann', 'approved', ['member']],
      ['bob', 'approved', ['member']],
      ['cara', 'approved', ['member'], { blockedReason: 'unkind', endedAt: day('2026-10-14T08:00:00.000Z') }],
      ['wes', 'waiting', []],
      ['zed', 'approved', [], { blockedReason: 'spam', endedAt: day('2026-10-13T08:00:00.000Z') }]
    ];
    for (const [name, status, roles, more] of people) {
      const made = await req<{ objectId: string }>('POST', '/admin/users', { username: name, email: `${name}@example.com`, password: `pw-${name}-long`, roles });
      expect(made.status).toBe(201);
      userId[name] = made.json.objectId;
      const login = await req<{ sessionToken: string }>('POST', '/login', { username: name, password: `pw-${name}-long` }, {});
      who[name] = { 'x-parse-session-token': login.json.sessionToken };
      const row = await req<{ objectId: string }>('POST', '/classes/Member', {
        name: name[0].toUpperCase() + name.slice(1),
        email: `${name}@example.com`,
        status,
        role: roles.includes('admin') ? 'admin' : 'member',
        login: ptr('_User', userId[name]),
        ...more
      });
      memberId[name] = row.json.objectId;
    }
  });

  afterAll(async () => {
    await service?.stop();
  });

  const id: Record<string, string> = {};

  describe('sharing a post', () => {
    it('a caption and two photos, shared with the members: every member and admin reads the post and its photos', async () => {
      const photos = [await upload('ann'), await upload('ann', PNG, MEMBERS, 'choir.png')];
      const shared = await call('sharePost', { post: { caption: '  Sunday lunch after the service  ', photos } }, 'ann');
      expect(shared.status).toBe(200);
      id.ann = String(shared.json.result?.postId);
      const [post] = (await rows('Post', { objectId: id.ann }, who.bob)).json.results;
      expect(post).toMatchObject({ caption: 'Sunday lunch after the service', kind: 'post', member: { objectId: memberId.ann }, photos });
      for (const reader of ['bob', 'ama']) {
        for (const p of photos) {
          const link = await req<{ url: string }>('GET', `/files/${p.name}/sign`, undefined, who[reader]);
          expect([reader, link.status]).toEqual([reader, 200]);
          expect((await fetch(link.json.url)).status).toBe(200);
        }
      }
    });

    it('words alone, and a photo alone, are posts; an admin posts too', async () => {
      expect((await call('sharePost', { post: { caption: 'Pray for the youth camp' } }, 'bob')).status).toBe(200);
      const alone = await call('sharePost', { post: { photos: [await upload('bob')] } }, 'bob');
      expect(alone.status).toBe(200);
      id.bob = String(alone.json.result?.postId);
      const byAdmin = await call('sharePost', { post: { caption: 'Men’s breakfast on Saturday', photos: [await upload('ama')] } }, 'ama');
      expect(byAdmin.status).toBe(200);
      id.ama = String(byAdmin.json.result?.postId);
    });

    it('🔴 refuses a photo anyone with its link could see, or one only its uploader can, in words', async () => {
      for (const [readers, what] of [[null, 'public'], ['role:member', 'members, not admins']] as const) {
        const photo = await upload('ann', PNG, readers);
        const r = await call('sharePost', { post: { caption: what, photos: [photo] } }, 'ann');
        expect([what, r.status, reason(r)]).toEqual([what, 400, 'A photo in this post could be seen by people who aren’t members. Add it again in this app.']);
      }
      const ownerOnly = await request<Photo>(base, 'POST', '/files/mine.png', { body: PNG, headers: { ...who.ann, 'x-nodegx-file-private': 'true' }, raw: true });
      const r = await call('sharePost', { post: { photos: [ownerOnly.json] } }, 'ann');
      expect(reason(r)).toBe('A photo in this post could be seen by people who aren’t members. Add it again in this app.');
    });

    it('🔴 refuses someone else’s photo, a made-up one, one whose link points elsewhere, and a file that isn’t a photo', async () => {
      const bobs = await upload('bob');
      const notYours = 'A photo in this post isn’t one you added.';
      expect(reason(await call('sharePost', { post: { photos: [bobs] } }, 'ann'))).toBe(notYours);
      expect(reason(await call('sharePost', { post: { photos: [{ name: '0000000000000000_x.png', url: 'x' }] } }, 'ann'))).toBe(notYours);
      const anns = await upload('ann');
      expect(reason(await call('sharePost', { post: { photos: [{ name: anns.name, url: 'https://elsewhere.example/a.png' }] } }, 'ann'))).toBe(notYours);
      const pdf = await upload('ann', PDF, MEMBERS, 'notes.pdf');
      expect(reason(await call('sharePost', { post: { photos: [pdf] } }, 'ann'))).toBe('Only photos can go in a post.');
    });

    it('🔴 refuses a fifth photo, an empty post and a caption over 2,200 characters; 2,200 is kept whole', async () => {
      const five = await Promise.all([1, 2, 3, 4, 5].map(() => upload('ann')));
      expect(reason(await call('sharePost', { post: { photos: five } }, 'ann'))).toBe('4 photos at most in one post.');
      expect((await call('sharePost', { post: { photos: five.slice(0, 4) } }, 'ann')).status).toBe(200);
      expect(reason(await call('sharePost', { post: { caption: '   ' } }, 'ann'))).toBe('Write something, or add a photo.');
      expect(reason(await call('sharePost', { post: { caption: 'x'.repeat(2201) } }, 'ann'))).toBe('A caption of 2,200 characters or fewer.');
      const full = await call('sharePost', { post: { caption: 'x'.repeat(2200) } }, 'ann');
      expect(full.status).toBe(200);
      const [kept] = (await rows('Post', { objectId: String(full.json.result?.postId) })).json.results;
      expect(kept.caption).toHaveLength(2200);
    });

    it('🔴 nobody waiting, blocked, or without an account posts', async () => {
      for (const as of ['wes', 'zed', 'stranger']) {
        const r = await call('sharePost', { post: { caption: 'hello' } }, as);
        expect([as, r.status]).toEqual([as, 403]);
      }
      // cara still holds role:member; her row is blocked, so the function refuses her.
      expect(reason(await call('sharePost', { post: { caption: 'hello' } }, 'cara'))).toBe('Only members who’ve been let in can post.');
      expect((await rows('Post', { caption: 'hello' })).json.results).toEqual([]);
    });
  });

  describe('hearts', () => {
    const heart = (as: string, on: boolean, postId = id.ann) => call<{ hearts: { hearted: boolean; count: number } }>('heartPost', { heart: { postId, on } }, as);
    const heartsOn = async (postId: string) => (await rows<Heart>('Heart', { post: ptr('Post', postId) })).json.results;

    it('on once, on again changes nothing, another member’s adds one, off takes one away; the count is by person', async () => {
      expect((await heart('bob', true)).json.result?.hearts).toEqual({ hearted: true, count: 1 });
      expect((await heart('bob', true)).json.result?.hearts).toEqual({ hearted: true, count: 1 });
      expect(await heartsOn(id.ann)).toHaveLength(1);
      expect((await heart('ama', true)).json.result?.hearts).toEqual({ hearted: true, count: 2 });
      expect((await heart('bob', false)).json.result?.hearts).toEqual({ hearted: false, count: 1 });
      expect((await heart('bob', false)).json.result?.hearts).toEqual({ hearted: false, count: 1 });
      const left = await heartsOn(id.ann);
      expect(left.map((h) => h.doneBy.objectId)).toEqual([userId.ama]);
      // Members read hearts (who hearted is seen, as on any social app), so the page can count them.
      expect((await rows('Heart', { post: ptr('Post', id.ann) }, who.ann)).json.results).toHaveLength(1);
    });

    it('a burst of taps by one person counts once, however many rows the race leaves', async () => {
      const burst = await Promise.all([1, 2, 3, 4, 5].map(() => heart('ann', true, id.bob)));
      for (const b of burst) expect(b.json.result?.hearts.hearted).toBe(true);
      // The backend took that burst one at a time and kept one row; a race that keeps two is planted, so the count by
      // person is graded (a mutant counting rows stayed green on the burst alone).
      const planted = await req('POST', '/classes/Heart', { post: ptr('Post', id.bob), at: day('2026-10-15T09:00:00.000Z'), doneBy: ptr('_User', userId.ann) });
      expect(planted.status).toBe(201);
      expect(await heartsOn(id.bob)).toHaveLength(2);
      expect((await heart('ann', true, id.bob)).json.result?.hearts.count).toBe(1);
      // Off takes every row the race left.
      expect((await heart('ann', false, id.bob)).json.result?.hearts.count).toBe(0);
      expect(await heartsOn(id.bob)).toEqual([]);
    });

    it('🔴 says what it should be, or nothing happens', async () => {
      expect(reason(await call('heartPost', { heart: { postId: id.ann } }, 'bob'))).toBe('Say whether the heart is on or off.');
      expect(reason(await call('heartPost', { heart: { postId: id.ann, on: 'yes' } }, 'bob'))).toBe('Say whether the heart is on or off.');
    });

    it('🔴 nobody waiting, blocked, or without an account hearts', async () => {
      for (const as of ['wes', 'zed', 'stranger']) expect([as, (await heart(as, true)).status]).toEqual([as, 403]);
      expect(reason(await heart('cara', true))).toBe('Only members who’ve been let in can heart a post.');
    });
  });

  describe('comments', () => {
    const comment = (as: string, text: unknown, postId = id.ann) => call('commentOn', { comment: { postId, text } }, as);

    it('a few words under a post, trimmed; every member reads them', async () => {
      const r = await comment('bob', '  Amen, what a morning  ');
      expect(r.status).toBe(200);
      const [c] = (await rows('Comment', { post: ptr('Post', id.ann) }, who.ann)).json.results;
      expect(c).toMatchObject({ objectId: r.json.result?.commentId, text: 'Amen, what a morning', member: { objectId: memberId.bob } });
    });

    it('🔴 refuses an empty comment and one over 1,000 characters; 1,000 is kept whole', async () => {
      expect(reason(await comment('bob', '  '))).toBe('Write a comment first.');
      expect(reason(await comment('bob', 42))).toBe('Write a comment first.');
      expect(reason(await comment('bob', 'y'.repeat(1001)))).toBe('A comment of 1,000 characters or fewer.');
      expect((await comment('bob', 'y'.repeat(1000))).status).toBe(200);
    });

    it('🔴 nobody waiting, blocked, or without an account comments', async () => {
      for (const as of ['wes', 'zed', 'stranger']) expect([as, (await comment(as, 'hi')).status]).toEqual([as, 403]);
      expect(reason(await comment('cara', 'hi'))).toBe('Only members who’ve been let in can comment.');
    });
  });

  describe('a post out of the feed', () => {
    it('🔴 a hidden post, a post by a blocked member, and no post at all take no heart and no comment', async () => {
      const hidden = await req<{ objectId: string }>('POST', '/classes/Post', {
        caption: 'Something that broke the rules',
        kind: 'post',
        member: ptr('Member', memberId.bob),
        hiddenReason: 'a child shown without a parent’s yes',
        endedAt: day('2026-10-14T08:00:00.000Z'),
        ACL: { 'role:admin': { read: true } }
      });
      const byBlocked = await req<{ objectId: string }>('POST', '/classes/Post', { caption: 'Before the block', kind: 'post', member: ptr('Member', memberId.zed) });
      const gone = 'This post isn’t in the feed any more.';
      for (const postId of [hidden.json.objectId, byBlocked.json.objectId, 'no-such-post']) {
        expect([postId, reason(await call('heartPost', { heart: { postId, on: true } }, 'ann'))]).toEqual([postId, gone]);
        expect([postId, reason(await call('commentOn', { comment: { postId, text: 'hi' } }, 'ann'))]).toEqual([postId, gone]);
      }
      expect((await rows('Heart', { post: ptr('Post', byBlocked.json.objectId) })).json.results).toEqual([]);
    });
  });
});
