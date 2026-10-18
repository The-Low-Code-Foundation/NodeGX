/**
 * TWO-005 slice 3 — a member's profile, through the gram's own cloud function.
 *
 * 🔴 **It runs the SHIPPED function** (`templates/gram/components/__cloud__/editProfile`, written by
 * `npm run template:gram`) on a backend locked with the template's own `nodegx.security.json`. People are seeded with
 * the master key, as the feed's spec seeds them; every write after that is a function call or a photo upload by the
 * person.
 *
 * What it proves (TWO-005 slice 3; the world: every member sees every profile and nobody else does, W1, rule 6):
 *
 * - a member sets their name, a short bio and a photo; every member and admin reads them and the photo, a stranger
 *   reads neither; who changed what is kept;
 * - 🔴 the photo is held to W1 exactly as a post's is: the member's own upload, shared with the members AND the admins,
 *   a photo, its link its own;
 * - a photo left out stays, `null` takes it off; nothing changed writes nothing;
 * - 🔴 too long is refused, never cut; a name can't be emptied;
 * - 🔴 a member changes only their own profile (there is no way to name another), and nobody writes a Member row
 *   directly; nobody waiting, blocked or a stranger changes a profile.
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
const FUNCTIONS = ['whoAmI', 'editProfile'];
/** What the edit page uploads a photo with (`two005Feed.ts` `PHOTO_READERS`). */
const MEMBERS = 'role:member, role:admin';

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d4944415478da63fccfc0500f000485018084a98c210000000049454e44ae426082',
  'hex'
);
const PDF = Buffer.from('%PDF-1.4\n%a note\n%%EOF', 'ascii');

interface Answer {
  result?: Record<string, any>;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, any>;
interface Photo {
  name: string;
  url: string;
}

describe('TWO-005 slice 3 — a member’s profile, through the template’s function', () => {
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) => request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const day = (iso: string) => ({ __type: 'Date', iso });

  const who: Record<string, Record<string, string>> = { stranger: {} };
  const userId: Record<string, string> = {};
  const memberId: Record<string, string> = {};
  const edit = (profile: unknown, as: string) => req<Answer>('POST', '/functions/editProfile', { profile }, who[as]);
  const rows = async (cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    req<{ results: Row[] }>('GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, undefined, headers);
  const memberOf = async (name: string, headers: Record<string, string> = master) => (await rows('Member', { objectId: memberId[name] }, headers)).json.results[0];
  const historyOf = async (name: string) => (await rows('MemberHistory', { member: ptr('Member', memberId[name]) })).json.results;
  const reason = (a: { json: Answer }) => String(a.json.error ?? '');

  async function upload(as: string, bytes = PNG, readers: string | null = MEMBERS, name = 'me.png'): Promise<Photo> {
    const headers: Record<string, string> = { ...who[as], ...(readers === null ? {} : { 'x-nodegx-file-readers': readers }) };
    const up = await request<Photo>(base, 'POST', `/files/${name}`, { body: bytes, headers, raw: true });
    expect(up.status).toBe(201);
    return { name: up.json.name, url: up.json.url };
  }

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two005-profile-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005p', backendName: 'TWO-005 profile', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    for (const role of ['admin', 'member']) expect((await req('POST', '/admin/roles', { name: role })).status).toBe(201);

    // ama: the first admin (role:admin alone). ann, bob: members. cara: a member whose row is blocked but whose role
    // was not yet taken (the function's own check). wes: waiting. zed: blocked.
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

  let annsPhoto: Photo;

  it('a name, a bio and a photo, trimmed; every member and admin reads them and the photo, a stranger neither', async () => {
    annsPhoto = await upload('ann');
    const r = await edit({ name: '  Ann Mensah ', bio: '  Alto in the choir. Psalm 46:10.  ', photo: annsPhoto }, 'ann');
    expect(r.status).toBe(200);
    expect(r.json.result?.memberId).toBe(memberId.ann);
    for (const reader of ['bob', 'ama', 'ann']) {
      const m = await memberOf('ann', who[reader]);
      expect([reader, m.name, m.bio, m.photo?.name]).toEqual([reader, 'Ann Mensah', 'Alto in the choir. Psalm 46:10.', annsPhoto.name]);
      const link = await req<{ url: string }>('GET', `/files/${annsPhoto.name}/sign`, undefined, who[reader]);
      expect([reader, link.status]).toEqual([reader, 200]);
      expect((await fetch(link.json.url)).status).toBe(200);
    }
    expect((await rows('Member', {}, who.stranger)).status).not.toBe(200);
    expect((await req('GET', `/files/${annsPhoto.name}/sign`, undefined, {})).status).not.toBe(200);
    expect((await fetch(annsPhoto.url)).status).not.toBe(200);
  });

  it('who changed what is kept: only what changed, from and to', async () => {
    const kept = await historyOf('ann');
    expect(kept).toHaveLength(1);
    expect(kept[0].who.objectId).toBe(userId.ann);
    expect(kept[0].changed).toEqual({
      name: { from: 'Ann', to: 'Ann Mensah' },
      bio: { from: null, to: 'Alto in the choir. Psalm 46:10.' },
      photo: { from: null, to: annsPhoto.name }
    });
  });

  it('a photo left out stays; nothing changed writes nothing; null takes the photo off', async () => {
    expect((await edit({ name: 'Ann Mensah', bio: 'Alto in the choir. Psalm 46:10.' }, 'ann')).status).toBe(200);
    expect((await memberOf('ann')).photo?.name).toBe(annsPhoto.name);
    expect(await historyOf('ann')).toHaveLength(1);
    expect((await edit({ name: 'Ann Mensah', bio: 'Alto in the choir.', photo: null }, 'ann')).status).toBe(200);
    const m = await memberOf('ann');
    expect([m.bio, m.photo ?? null]).toEqual(['Alto in the choir.', null]);
    expect((await historyOf('ann')).pop()?.changed).toEqual({ bio: { from: 'Alto in the choir. Psalm 46:10.', to: 'Alto in the choir.' }, photo: { from: annsPhoto.name, to: null } });
    // And a new one goes on again.
    expect((await edit({ name: 'Ann Mensah', bio: 'Alto in the choir.', photo: annsPhoto }, 'ann')).status).toBe(200);
    expect((await memberOf('ann')).photo?.name).toBe(annsPhoto.name);
  });

  it('🔴 refuses a photo anyone with its link could see, one only its uploader can, or one admins can’t, in words', async () => {
    const words = 'That photo could be seen by people who aren’t members. Add it again in this app.';
    for (const [readers, what] of [[null, 'public'], ['role:member', 'members, not admins']] as const) {
      const r = await edit({ name: 'Bob', bio: what, photo: await upload('bob', PNG, readers) }, 'bob');
      expect([what, r.status, reason(r)]).toEqual([what, 400, words]);
    }
    const ownerOnly = await request<Photo>(base, 'POST', '/files/mine.png', { body: PNG, headers: { ...who.bob, 'x-nodegx-file-private': 'true' }, raw: true });
    expect(reason(await edit({ name: 'Bob', photo: ownerOnly.json }, 'bob'))).toBe(words);
    expect((await memberOf('bob')).photo ?? null).toBeNull();
  });

  it('🔴 refuses someone else’s photo, a made-up one, one whose link points elsewhere, and a file that isn’t a photo', async () => {
    const notYours = 'That photo isn’t one you added.';
    expect(reason(await edit({ name: 'Bob', photo: annsPhoto }, 'bob'))).toBe(notYours);
    expect(reason(await edit({ name: 'Bob', photo: { name: '0000000000000000_x.png', url: 'x' } }, 'bob'))).toBe(notYours);
    const bobs = await upload('bob');
    expect(reason(await edit({ name: 'Bob', photo: { name: bobs.name, url: 'https://elsewhere.example/a.png' } }, 'bob'))).toBe(notYours);
    expect(reason(await edit({ name: 'Bob', photo: await upload('bob', PDF, MEMBERS, 'cv.pdf') }, 'bob'))).toBe('Only a photo can be a profile photo.');
    expect((await memberOf('bob')).photo ?? null).toBeNull();
    // An admin's photo is held to the same rule, and goes on.
    expect((await edit({ name: 'Ama', photo: await upload('ama') }, 'ama')).status).toBe(200);
  });

  it('🔴 refuses an empty name, a name over 80 and a bio over 150; 80 and 150 are kept whole', async () => {
    expect(reason(await edit({ name: '   ', bio: 'x' }, 'bob'))).toBe('Your name, as the community knows you.');
    expect(reason(await edit({ bio: 'x' }, 'bob'))).toBe('Your name, as the community knows you.');
    expect(reason(await edit({ name: 'n'.repeat(81) }, 'bob'))).toBe('A name of 80 characters or fewer.');
    expect(reason(await edit({ name: 'Bob', bio: 'b'.repeat(151) }, 'bob'))).toBe('A bio of 150 characters or fewer.');
    expect(await historyOf('bob')).toEqual([]);
    expect((await edit({ name: 'n'.repeat(80), bio: 'b'.repeat(150) }, 'bob')).status).toBe(200);
    const m = await memberOf('bob');
    expect([m.name.length, m.bio.length]).toEqual([80, 150]);
  });

  it('🔴 a member changes only their own profile; nobody writes a Member row directly', async () => {
    // There is no way to name another: an id in the call changes nothing but the caller's own.
    const before = await memberOf('bob');
    expect((await edit({ name: 'Ann M.', memberId: memberId.bob, objectId: memberId.bob }, 'ann')).status).toBe(200);
    expect(await memberOf('bob')).toEqual(before);
    expect((await memberOf('ann')).name).toBe('Ann M.');
    for (const as of ['ann', 'ama']) {
      const direct = await req('PUT', `/classes/Member/${memberId.bob}`, { bio: 'written by hand' }, who[as]);
      expect([as, direct.status === 200]).toEqual([as, false]);
    }
    expect((await memberOf('bob')).bio).toBe(before.bio);
  });

  it('🔴 nobody waiting, blocked, or without an account changes a profile', async () => {
    for (const as of ['wes', 'zed', 'stranger']) {
      const r = await edit({ name: 'Someone', bio: 'hello' }, as);
      expect([as, r.status]).toEqual([as, 403]);
    }
    // cara still holds role:member; her row is blocked, so the function refuses her.
    expect(reason(await edit({ name: 'Cara', bio: 'hello' }, 'cara'))).toBe('Only members who’ve been let in have a profile.');
    for (const as of ['wes', 'zed', 'cara']) expect([as, (await memberOf(as)).bio ?? null]).toEqual([as, null]);
  });
});
