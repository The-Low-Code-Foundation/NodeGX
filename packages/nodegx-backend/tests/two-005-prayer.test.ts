/**
 * TWO-005 slice 4 — prayer requests, through the gram's own cloud functions.
 *
 * 🔴 **It runs the SHIPPED functions** (`templates/gram/components/__cloud__/{sharePost,prayFor}`, written by
 * `npm run template:gram`) on a backend locked with the template's own `nodegx.security.json`. People are seeded with
 * the master key, as the profile's spec seeds them; every write after that is a function call by the person.
 *
 * What it proves (TWO-005 slice 4; the world: "a member pressed I prayed on a prayer request", undo removes it, W4):
 *
 * - a prayer request is a post of its own kind, words only, starting with nobody having prayed;
 * - I prayed on, on again (nothing more), off, off again; the count kept on the request, counted by person, written
 *   only when it moves, and put right by the next press when it is wrong;
 * - 🔴 W4: the person who asked reads who prayed; another member reads only their own I prayed; an admin reads all; a
 *   stranger nothing. Every member reads the count;
 * - 🔴 only a prayer request in the feed is prayed for; nobody waiting, blocked or without an account presses it; and
 *   nobody writes an I prayed, or the count, directly.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request } from './helpers/http';

jest.setTimeout(90000);

/** `TWO005_TEMPLATE` points the spec at a copy of the template (a mutant); unset, it is the shipped one. */
const TEMPLATE = process.env.TWO005_TEMPLATE || path.join(__dirname, '../../../templates/gram');
const FUNCTIONS = ['whoAmI', 'sharePost', 'prayFor'];

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d4944415478da63fccfc0500f000485018084a98c210000000049454e44ae426082',
  'hex'
);

interface Answer {
  result?: Record<string, any>;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, any>;

describe('TWO-005 slice 4 — prayer requests, through the template’s functions', () => {
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) => request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const day = (iso: string) => ({ __type: 'Date', iso });

  const who: Record<string, Record<string, string>> = { stranger: {} };
  const userId: Record<string, string> = {};
  const memberId: Record<string, string> = {};
  const share = (post: unknown, as: string) => req<Answer>('POST', '/functions/sharePost', { post }, who[as]);
  const pray = (postId: string, on: unknown, as: string) => req<Answer>('POST', '/functions/prayFor', { prayer: { postId, on } }, who[as]);
  const rows = async (cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    req<{ results: Row[] }>('GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, undefined, headers);
  const postRow = async (id: string) => (await rows('Post', { objectId: id })).json.results[0];
  const prayedOn = async (id: string, headers: Record<string, string> = master) => (await rows('Prayed', { post: ptr('Post', id) }, headers)).json.results;
  const reason = (a: { json: Answer }) => String(a.json.error ?? '');

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two005-prayer-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005pr', backendName: 'TWO-005 prayer', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    for (const role of ['admin', 'member']) expect((await req('POST', '/admin/roles', { name: role })).status).toBe(201);

    // ama: the first admin (role:admin alone). ann, bob, dee: members. cara: a member whose row is blocked but whose
    // role was not yet taken (the function's own check). wes: waiting. zed: blocked.
    const people: Array<[string, string, string[], Row?]> = [
      ['ama', 'approved', ['admin']],
      ['ann', 'approved', ['member']],
      ['bob', 'approved', ['member']],
      ['dee', 'approved', ['member']],
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

  let anns: string;
  let bobs: string;

  it('a prayer request: words only, its kind, nobody prayed yet; every member and admin reads it, a stranger doesn’t', async () => {
    const r = await share({ kind: 'prayer', caption: '  Please pray for my mother, who goes into surgery on Friday.  ' }, 'ann');
    expect(r.status).toBe(200);
    anns = String(r.json.result?.postId);
    const row = await postRow(anns);
    expect([row.kind, row.caption, row.prayedCount, row.photos]).toEqual(['prayer', 'Please pray for my mother, who goes into surgery on Friday.', 0, []]);
    for (const reader of ['bob', 'dee', 'ama']) {
      const seen = (await rows('Post', { objectId: anns }, who[reader])).json.results[0];
      expect([reader, seen?.kind, seen?.prayedCount]).toEqual([reader, 'prayer', 0]);
    }
    expect((await rows('Post', {}, who.stranger)).status).not.toBe(200);
    bobs = String((await share({ kind: 'prayer', caption: 'A job for my brother.' }, 'bob')).json.result?.postId);
    // A post with no kind is still a post, with no count.
    const plain = await share({ caption: 'Sunday lunch' }, 'ann');
    const p = await postRow(String(plain.json.result?.postId));
    expect([p.kind, p.prayedCount ?? null]).toEqual(['post', null]);
  });

  it('🔴 refuses a prayer request with a photo, one with no words, and a kind the world doesn’t have, in words', async () => {
    const up = await request<{ name: string; url: string }>(base, 'POST', '/files/me.png', { body: PNG, headers: { ...who.ann, 'x-nodegx-file-readers': 'role:member, role:admin' }, raw: true });
    expect(up.status).toBe(201);
    expect(reason(await share({ kind: 'prayer', caption: 'Pray for us', photos: [{ name: up.json.name, url: up.json.url }] }, 'ann'))).toBe('A prayer request is words only.');
    expect(reason(await share({ kind: 'prayer', caption: '   ' }, 'ann'))).toBe('Say what you’d like the members to pray for.');
    expect(reason(await share({ kind: 'prayer' }, 'ann'))).toBe('Say what you’d like the members to pray for.');
    // Slice 4b shares a testimony and an event (`two-005-kinds.test.ts`); nothing else.
    for (const kind of ['story', 'PRAYER', 7]) expect([kind, reason(await share({ kind, caption: 'x' }, 'ann'))]).toEqual([kind, 'Share a post, a prayer request, a testimony or an event.']);
    expect((await rows('Post', { member: ptr('Member', memberId.ann) })).json.results).toHaveLength(2);
  });

  it('I prayed: on, on again (nothing more), off, off again; the count by person, kept on the request', async () => {
    let r = await pray(anns, true, 'bob');
    expect([r.status, r.json.result?.prayed]).toEqual([200, { prayed: true, count: 1 }]);
    const [row] = await prayedOn(anns);
    expect([row.doneBy.objectId, typeof row.at?.iso]).toEqual([userId.bob, 'string']);
    expect((await postRow(anns)).prayedCount).toBe(1);
    const stamped = (await postRow(anns)).updatedAt;
    r = await pray(anns, true, 'bob');
    expect(r.json.result?.prayed).toEqual({ prayed: true, count: 1 });
    expect(await prayedOn(anns)).toHaveLength(1);
    // Nothing moved, so nothing was written: every phone listening to posts isn't sent a change.
    expect((await postRow(anns)).updatedAt).toBe(stamped);
    expect((await pray(anns, true, 'dee')).json.result?.prayed).toEqual({ prayed: true, count: 2 });
    expect((await pray(anns, false, 'bob')).json.result?.prayed).toEqual({ prayed: false, count: 1 });
    expect((await prayedOn(anns)).map((p) => p.doneBy.objectId)).toEqual([userId.dee]);
    expect((await pray(anns, false, 'bob')).json.result?.prayed).toEqual({ prayed: false, count: 1 });
    expect((await postRow(anns)).prayedCount).toBe(1);
    // The person who asked may pray on their own; an admin may pray.
    expect((await pray(anns, true, 'ann')).json.result?.prayed).toEqual({ prayed: true, count: 2 });
    expect((await pray(anns, true, 'ama')).json.result?.prayed).toEqual({ prayed: true, count: 3 });
  });

  it('a race’s second row counts once, and goes with the first when taken back; a wrong count is put right by the next press', async () => {
    // Dee pressed on two phones at once: two rows (planted, as the store kept them).
    for (let i = 0; i < 2; i++) expect((await req('POST', '/classes/Prayed', { post: ptr('Post', bobs), at: day(new Date().toISOString()), doneBy: ptr('_User', userId.dee) })).status).toBe(201);
    expect((await pray(bobs, true, 'ann')).json.result?.prayed).toEqual({ prayed: true, count: 2 });
    expect((await pray(bobs, false, 'dee')).json.result?.prayed).toEqual({ prayed: false, count: 1 });
    expect((await prayedOn(bobs)).map((p) => p.doneBy.objectId)).toEqual([userId.ann]);
    // Two presses that finished together left it wrong: the next one counts again and writes the truth.
    expect((await req('PUT', `/classes/Post/${bobs}`, { prayedCount: 9 })).status).toBe(200);
    expect((await pray(bobs, true, 'ann')).json.result?.prayed).toEqual({ prayed: true, count: 1 });
    expect((await postRow(bobs)).prayedCount).toBe(1);
  });

  it('🔴 W4: the person who asked reads who prayed; a member only their own; an admin every one; a stranger none', async () => {
    const all = (await prayedOn(anns)).map((p) => p.doneBy.objectId).sort();
    expect(all).toEqual([userId.ann, userId.ama, userId.dee].sort());
    const asked = await prayedOn(anns, who.ann);
    expect(asked.map((p) => p.doneBy.objectId).sort()).toEqual(all);
    // Dee prayed: she reads her own row and no one else's. Bob took his back: he reads nothing.
    expect((await prayedOn(anns, who.dee)).map((p) => p.doneBy.objectId)).toEqual([userId.dee]);
    expect(await prayedOn(anns, who.bob)).toEqual([]);
    // As the feed asks: every request at once. Bob reads his own on Ann's (none) and every row on his own request.
    const feed = await rows('Prayed', { post: { $in: [ptr('Post', anns), ptr('Post', bobs)] } }, who.bob);
    expect(feed.status).toBe(200);
    expect(feed.json.results.map((p) => [p.post.objectId, p.doneBy.objectId])).toEqual([[bobs, userId.ann]]);
    expect((await prayedOn(anns, who.ama)).length).toBe(3);
    expect((await rows('Prayed', {}, who.stranger)).status).not.toBe(200);
    // Every member reads the count.
    expect((await rows('Post', { objectId: anns }, who.bob)).json.results[0].prayedCount).toBe(3);
  });

  it('🔴 only a prayer request in the feed is prayed for; what isn’t one is refused in words', async () => {
    const post = (await rows('Post', { kind: 'post' })).json.results[0].objectId;
    expect(reason(await pray(post, true, 'bob'))).toBe('Only a prayer request has I prayed.');
    expect(await prayedOn(post)).toEqual([]);
    expect(reason(await pray('nope', true, 'bob'))).toBe('This prayer request isn’t in the feed any more.');
    for (const on of ['yes', 1, null, undefined]) expect([on, reason(await pray(anns, on, 'bob'))]).toEqual([on, 'Say whether you prayed.']);
    // Hidden, and by a blocked member: out of the feed.
    const hidden = String((await share({ kind: 'prayer', caption: 'Soon hidden' }, 'dee')).json.result?.postId);
    await req('PUT', `/classes/Post/${hidden}`, { endedAt: day(new Date().toISOString()), hiddenReason: 'spam' });
    expect(reason(await pray(hidden, true, 'bob'))).toBe('This prayer request isn’t in the feed any more.');
    const zeds = await req<{ objectId: string }>('POST', '/classes/Post', { caption: 'Zed’s', kind: 'prayer', prayedCount: 0, photos: [], member: ptr('Member', memberId.zed) });
    expect(reason(await pray(zeds.json.objectId, true, 'bob'))).toBe('This prayer request isn’t in the feed any more.');
    for (const id of [hidden, zeds.json.objectId]) expect([id, await prayedOn(id)]).toEqual([id, []]);
  });

  it('🔴 nobody waiting, blocked, or without an account presses I prayed; nobody writes one, or the count, directly', async () => {
    for (const as of ['wes', 'zed', 'stranger']) expect([as, (await pray(anns, true, as)).status]).toEqual([as, 403]);
    // cara still holds role:member; her row is blocked, so the function refuses her.
    expect(reason(await pray(anns, true, 'cara'))).toBe('Only members who’ve been let in can pray for a request.');
    const before = (await prayedOn(anns)).length;
    for (const as of ['bob', 'ann', 'ama']) {
      const made = await req('POST', '/classes/Prayed', { post: ptr('Post', anns), at: day(new Date().toISOString()), doneBy: ptr('_User', userId[as]) }, who[as]);
      expect([as, made.status === 201]).toEqual([as, false]);
      const counted = await req('PUT', `/classes/Post/${anns}`, { prayedCount: 100 }, who[as]);
      expect([as, counted.status === 200]).toEqual([as, false]);
    }
    expect((await prayedOn(anns)).length).toBe(before);
    expect((await postRow(anns)).prayedCount).toBe(3);
    // And nobody takes back someone else's: Dee's row stays when Bob presses off.
    expect((await pray(anns, false, 'bob')).json.result?.prayed).toEqual({ prayed: false, count: 3 });
  });
});
