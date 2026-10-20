/**
 * TWO-005 slice 4b — testimonies and events, through the gram's own cloud functions.
 *
 * 🔴 **It runs the SHIPPED functions** (`templates/gram/components/__cloud__/{sharePost,heartPost,prayFor}`, written by
 * `npm run template:gram`) on a backend locked with the template's own `nodegx.security.json`. People are seeded with
 * the master key, as the prayer spec seeds them; every write after that is a function call by the person.
 *
 * What it proves (the world: "a post is one of four kinds … an event has a date"; its `eventOn` is required when the
 * kind is `event`, a rule the database doesn't keep, so `sharePost` does):
 *
 * - a testimony is told in words, may carry photos, has hearts and no I prayed;
 * - an event keeps its words and the instant it starts; one with no words, no day, a day that isn't one, a day that
 *   has passed, or one more than a year away is refused in words and nothing is kept;
 * - only an event keeps a day: one sent with a post or a testimony is dropped;
 * - nobody waiting, blocked or without an account shares either.
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
const FUNCTIONS = ['whoAmI', 'sharePost', 'heartPost', 'prayFor'];

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d4944415478da63fccfc0500f000485018084a98c210000000049454e44ae426082',
  'hex'
);
const DAY = 86400000;

interface Answer {
  result?: Record<string, any>;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, any>;

describe('TWO-005 slice 4b — testimonies and events, through the template’s functions', () => {
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
  const rows = async (cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    req<{ results: Row[] }>('GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, undefined, headers);
  const postRow = async (id: string) => (await rows('Post', { objectId: id })).json.results[0];
  const countOf = async (as: string) => (await rows('Post', { member: ptr('Member', memberId[as]) })).json.results.length;
  const reason = (a: { json: Answer }) => String(a.json.error ?? '');
  /** A photo of the member's own, shared with the members and the admins, as the posting page uploads it. */
  const photoOf = async (as: string) => {
    const up = await request<{ name: string; url: string }>(base, 'POST', '/files/me.png', { body: PNG, headers: { ...who[as], 'x-nodegx-file-readers': 'role:member, role:admin' }, raw: true });
    expect(up.status).toBe(201);
    return { name: up.json.name, url: up.json.url };
  };

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two005-kinds-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005ki', backendName: 'TWO-005 kinds', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    for (const role of ['admin', 'member']) expect((await req('POST', '/admin/roles', { name: role })).status).toBe(201);

    // ama: the first admin (role:admin alone). ann, bob: members. wes: waiting. zed: blocked.
    const people: Array<[string, string, string[], Row?]> = [
      ['ama', 'approved', ['admin']],
      ['ann', 'approved', ['member']],
      ['bob', 'approved', ['member']],
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

  it('a testimony: told in words, photos allowed, no day, no count; hearts, and no I prayed', async () => {
    const photo = await photoOf('ann');
    const r = await share({ kind: 'testimony', caption: '  The visa came through this morning. Thank you, every one of you.  ', photos: [photo], eventOn: new Date(Date.now() + DAY).toISOString() }, 'ann');
    expect([r.status, reason(r)]).toEqual([200, '']);
    const id = String(r.json.result?.postId);
    const row = await postRow(id);
    expect([row.kind, row.caption, row.photos, row.eventOn ?? null, row.prayedCount ?? null]).toEqual(['testimony', 'The visa came through this morning. Thank you, every one of you.', [photo], null, null]);
    for (const reader of ['bob', 'ama']) expect([reader, (await rows('Post', { objectId: id }, who[reader])).json.results[0]?.kind]).toEqual([reader, 'testimony']);
    // Words alone are a testimony too.
    expect((await share({ kind: 'testimony', caption: 'God is faithful.' }, 'bob')).status).toBe(200);
    // Hearts, as a post has; I prayed is a prayer request's alone.
    const heart = await req<Answer>('POST', '/functions/heartPost', { heart: { postId: id, on: true } }, who.bob);
    expect(heart.json.result?.hearts).toEqual({ hearted: true, count: 1 });
    expect(reason(await req<Answer>('POST', '/functions/prayFor', { prayer: { postId: id, on: true } }, who.bob))).toBe('Only a prayer request has I prayed.');
  });

  it('🔴 a testimony with no words is refused, a photo or not, and nothing is kept', async () => {
    const before = await countOf('ann');
    const photo = await photoOf('ann');
    expect(reason(await share({ kind: 'testimony', caption: '   ', photos: [photo] }, 'ann'))).toBe('Tell the members what happened.');
    expect(reason(await share({ kind: 'testimony' }, 'ann'))).toBe('Tell the members what happened.');
    expect(await countOf('ann')).toBe(before);
  });

  it('an event: its words, photos allowed, and the instant it starts, kept as a date', async () => {
    const photo = await photoOf('bob');
    const when = new Date(Date.now() + 3 * DAY);
    when.setUTCHours(8, 0, 0, 0);
    const r = await share({ kind: 'event', caption: 'Men’s breakfast this Saturday. Bring a friend.', photos: [photo], eventOn: when.toISOString() }, 'bob');
    expect([r.status, reason(r)]).toEqual([200, '']);
    const row = await postRow(String(r.json.result?.postId));
    expect([row.kind, row.caption, row.photos, row.eventOn]).toEqual(['event', 'Men’s breakfast this Saturday. Bring a friend.', [photo], { __type: 'Date', iso: when.toISOString() }]);
    // A day written with its own offset is the same instant.
    const offset = new Date(Date.now() + 5 * DAY);
    offset.setUTCHours(17, 30, 0, 0);
    const lagos = `${offset.toISOString().slice(0, 10)}T18:30:00+01:00`;
    const r2 = await share({ kind: 'event', caption: 'Choir practice', eventOn: lagos }, 'ann');
    expect((await postRow(String(r2.json.result?.postId))).eventOn.iso).toBe(offset.toISOString());
    // Nearly a year away is still allowed; every member and admin reads it.
    const later = await share({ kind: 'event', caption: 'Harvest', eventOn: new Date(Date.now() + 360 * DAY).toISOString() }, 'ama');
    expect(later.status).toBe(200);
    expect((await rows('Post', { objectId: String(later.json.result?.postId) }, who.ann)).json.results[0]?.kind).toBe('event');
  });

  it('🔴 an event with no words, no day, a day that isn’t one, a passed one or one past a year is refused, and nothing kept', async () => {
    const before = await countOf('bob');
    const soon = new Date(Date.now() + DAY).toISOString();
    expect(reason(await share({ kind: 'event', caption: ' ', eventOn: soon }, 'bob'))).toBe('Say what the event is.');
    const notADay = [undefined, '', 'tomorrow', '2026', `${new Date().getFullYear() + 1}-01`, 1893456000000, { __type: 'Date', iso: soon }, 'Saturday 18 October'];
    for (const eventOn of notADay) expect([eventOn, reason(await share({ kind: 'event', caption: 'Breakfast', eventOn }, 'bob'))]).toEqual([eventOn, 'Say when the event is: its day and its time.']);
    expect(reason(await share({ kind: 'event', caption: 'Breakfast', eventOn: new Date(Date.now() - 3600000).toISOString() }, 'bob'))).toBe('That time has passed. Choose when the event is.');
    expect(reason(await share({ kind: 'event', caption: 'Breakfast', eventOn: new Date(Date.now() + 400 * DAY).toISOString() }, 'bob'))).toBe('An event within the next year, at most.');
    expect(await countOf('bob')).toBe(before);
  });

  it('only an event keeps a day: a post sent with one keeps none', async () => {
    const r = await share({ caption: 'Sunday lunch', eventOn: new Date(Date.now() + DAY).toISOString() }, 'ann');
    const row = await postRow(String(r.json.result?.postId));
    expect([row.kind, row.eventOn ?? null]).toEqual(['post', null]);
  });

  it('🔴 nobody waiting, blocked or without an account shares a testimony or an event', async () => {
    const soon = new Date(Date.now() + DAY).toISOString();
    for (const as of ['wes', 'zed', 'stranger']) {
      for (const post of [{ kind: 'testimony', caption: 'x' }, { kind: 'event', caption: 'x', eventOn: soon }]) {
        const r = await share(post, as);
        expect([as, post.kind, r.status]).not.toEqual([as, post.kind, 200]);
      }
    }
    const kinds = (await rows('Post')).json.results.map((p) => p.kind);
    expect(kinds.filter((k) => k === 'testimony')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'event')).toHaveLength(3);
  });
});
