/**
 * P121 TWO-001 — the gram (a church community app): the schema and the policy, kept by a locked backend.
 *
 * The schema is not hand-written. `templates/gram/docs/world/` is the community's world in plain
 * words (`docs/WORLD.md` reads it out), and `backend/schema.json` is `schemaPushes(projectWorld(…))`
 * byte for byte. Run with `TWO_SCHEMA_WRITE=1` to rewrite it after the world changes.
 *
 * The policy is `templates/gram/nodegx.security.json`. What it must keep:
 *
 *   - an approved member (`role:member`) sees the feed, every profile, posts, comments and hearts;
 *     a waiting member (no role) sees their own Member row and nothing else;
 *   - a hidden post or comment is seen by admins only (its row ACL, which the hide function sets),
 *     and the reason it was hidden by nobody but an admin;
 *   - a note is its writer's alone: admins can't read it either;
 *   - a report is the admins' alone, never the reported member's;
 *   - only the member who asked sees who prayed for them (and each member their own "I prayed");
 *   - a devotional is public once its day has come, and an admin's until then (its row ACL);
 *   - a member's email is theirs and the admins'; why a member was blocked is the admins';
 *   - nobody writes a row directly, admins included: every write is a function that checks who is
 *     writing and writes the history beside it.
 *
 * `TWO_GRAM_SECURITY=<file>` points the spec at another policy, which is how its mutants are run.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { projectWorld, schemaPushes, type WorldFiles } from '../../nodegx-project-contract/world';
import { validateSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

const TEMPLATE = path.join(__dirname, '../../../templates/gram');
const WORLD = path.join(TEMPLATE, 'docs/world');
const SCHEMA_FILE = path.join(TEMPLATE, 'backend/schema.json');
const SECURITY_FILE = process.env.TWO_GRAM_SECURITY || path.join(TEMPLATE, 'nodegx.security.json');

const read = (name: string) => JSON.parse(fs.readFileSync(path.join(WORLD, `${name}.json`), 'utf8'));
const files: WorldFiles = { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
const projected = projectWorld(files);
if (!projected.ok) throw new Error(projected.problems.join('\n'));
const schema = projected.schema;
const pushes = schemaPushes(schema);
const security = JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf8'));

interface Found {
  results: Array<Record<string, unknown>>;
}

describe('TWO-001 the gram — the world is the schema', () => {
  it('backend/schema.json is the projection of docs/world/, byte for byte', () => {
    const text = JSON.stringify(pushes, null, 2) + '\n';
    if (process.env.TWO_SCHEMA_WRITE) {
      fs.mkdirSync(path.dirname(SCHEMA_FILE), { recursive: true });
      fs.writeFileSync(SCHEMA_FILE, text);
    }
    expect(fs.readFileSync(SCHEMA_FILE, 'utf8')).toBe(text);
  });

  it('the world makes the six things, the three that happen, and a history where it said one', () => {
    expect(schema.collections.map((c) => c.name).sort()).toEqual(
      [
        'Comment',
        'CommentReport',
        'Community',
        'CommunityHistory',
        'Devotional',
        'DevotionalHistory',
        'Heart',
        'Member',
        'MemberHistory',
        'Note',
        'Post',
        'Prayed',
        'Report'
      ].sort()
    );
  });

  it('the policy names every collection the world makes, and no other', () => {
    expect(validateSecurityConfig(security)).toEqual([]);
    expect(Object.keys(security.collections).sort()).toEqual(schema.collections.map((c) => c.name).sort());
  });

  it('the policy carries every rule the world says the store keeps on a write', () => {
    for (const c of schema.collections) {
      expect([c.name, security.collections[c.name].onlyWhile]).toEqual([c.name, c.onlyWhile]);
    }
  });

  it('nothing is written directly, by anybody, and nothing is ever deleted', () => {
    for (const [name, entry] of Object.entries<{ permissions: Record<string, unknown> }>(security.collections)) {
      expect([name, entry.permissions.create, entry.permissions.update, entry.permissions.delete]).toEqual([name, 'nobody', 'nobody', 'nobody']);
    }
    expect(security.signup).toBe('nobody');
    expect(security.devOpen).toBe(false);
  });
});

describe('TWO-001 the gram — the policy, kept by a locked backend', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) =>
    request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const day = (iso: string) => ({ __type: 'Date', iso });
  const adminsOnly = { 'role:admin': { read: true } };

  const session: Record<string, Record<string, string>> = {};
  const userId: Record<string, string> = {};
  const id: Record<string, string> = {};

  const make = async (collection: string, name: string, data: Record<string, unknown>) => {
    const r = await req<{ objectId: string }>('POST', `/classes/${collection}`, data);
    if (r.status !== 201 && r.status !== 200) throw new Error(`${collection} ${name}: ${r.status} ${JSON.stringify(r.json)}`);
    id[name] = r.json.objectId;
  };
  const find = (collection: string, who: Record<string, string>, query = '') =>
    req<Found>('GET', `/classes/${collection}${query}`, undefined, who);
  const ids = (r: { json: Found }) => r.json.results.map((row) => row.objectId).sort();
  const named = (...names: string[]) => names.map((n) => id[n]).sort();

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two001-gram-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two001g', backendName: 'TWO-001 gram', authToken: 't0k' });
    base = (await service.start()).listen.url;

    for (const push of pushes) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    for (const role of ['admin', 'member']) expect((await req('POST', '/admin/roles', { name: role })).status).toBe(201);

    // pastor: an admin. ann and bob: approved members. wes: waiting to be let in. zed: blocked
    // (the block took his role away and keeps why).
    const blocked = { blockedReason: 'posted a stranger’s child', endedAt: day('2026-10-12T08:00:00.000Z') };
    const people: Array<[string, string, string[], object?]> = [
      ['pastor', 'approved', ['admin', 'member']],
      ['ann', 'approved', ['member']],
      ['bob', 'approved', ['member']],
      ['wes', 'waiting', []],
      ['zed', 'approved', [], blocked]
    ];
    for (const [name, status, roles, more] of people) {
      const made = await req<{ objectId: string }>('POST', '/admin/users', { username: name, email: `${name}@example.com`, password: `pw-${name}`, roles });
      expect(made.status).toBe(201);
      userId[name] = made.json.objectId;
      const login = await req<{ sessionToken: string }>('POST', '/login', { username: name, password: `pw-${name}` }, {});
      session[name] = { 'x-parse-session-token': login.json.sessionToken };
      await make('Member', name, {
        name,
        email: `${name}@example.com`,
        status,
        role: roles.includes('admin') ? 'admin' : 'member',
        login: ptr('_User', userId[name]),
        ...more
      });
    }

    await make('Post', 'ann.post', { caption: 'Sunday lunch', kind: 'post', member: ptr('Member', id.ann) });
    await make('Post', 'ann.prayer', { caption: 'Pray for my mother', kind: 'prayer', member: ptr('Member', id.ann) });
    await make('Post', 'bob.hidden', {
      caption: 'Something that broke the rules',
      kind: 'post',
      hiddenReason: 'a child shown without a parent’s yes',
      endedAt: day('2026-10-14T08:00:00.000Z'),
      member: ptr('Member', id.bob),
      ACL: adminsOnly
    });
    await make('Comment', 'bob.comment', { text: 'Amen', post: ptr('Post', id['ann.post']), member: ptr('Member', id.bob) });
    await make('Comment', 'bob.hiddenComment', {
      text: 'Unkind',
      hiddenReason: 'unkind',
      endedAt: day('2026-10-14T08:00:00.000Z'),
      post: ptr('Post', id['ann.post']),
      member: ptr('Member', id.bob),
      ACL: adminsOnly
    });
    await make('Heart', 'bob.heart', { post: ptr('Post', id['ann.post']), at: day('2026-10-14T09:00:00.000Z'), doneBy: ptr('_User', userId.bob) });
    await make('Prayed', 'bob.prayed', { post: ptr('Post', id['ann.prayer']), at: day('2026-10-14T09:00:00.000Z'), doneBy: ptr('_User', userId.bob) });
    await make('Report', 'ann.reportsBob', { post: ptr('Post', id['bob.hidden']), at: day('2026-10-14T07:00:00.000Z'), doneBy: ptr('_User', userId.ann), reason: 'child-photo' });
    await make('CommentReport', 'ann.reportsComment', {
      comment: ptr('Comment', id['bob.hiddenComment']),
      at: day('2026-10-14T07:00:00.000Z'),
      doneBy: ptr('_User', userId.ann),
      reason: 'unkind'
    });
    await make('Note', 'ann.note', { text: 'Ask about the youth group', owner: ptr('Member', id.ann) });
    await make('Note', 'pastor.note', { text: 'Sermon idea', owner: ptr('Member', id.pastor) });
    await make('Devotional', 'today', { title: 'Grace', day: day('2026-10-14T00:00:00.000Z'), scripture: 'Ephesians 2:8', body: 'By grace…', source: 'written' });
    await make('Devotional', 'tomorrow', {
      title: 'Faith',
      day: day('2026-10-15T00:00:00.000Z'),
      scripture: 'Hebrews 11:1',
      body: 'Now faith…',
      source: 'written',
      ACL: adminsOnly
    });
    await make('Community', 'the', { name: 'The gram', rules: 'Be kind. No photo of a child without a parent’s yes.', releaseAt: '05:00', timeZone: 'Africa/Accra' });
    await make('MemberHistory', 'ann.history', { member: ptr('Member', id.ann), at: day('2026-10-13T09:00:00.000Z'), who: ptr('_User', userId.pastor), changed: { status: ['pending', 'approved'] } });
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('an approved member', () => {
    it('sees the feed: every post but the hidden one', async () => {
      expect(ids(await find('Post', session.ann))).toEqual(named('ann.post', 'ann.prayer'));
      expect((await req('GET', `/classes/Post/${id['bob.hidden']}`, undefined, session.ann)).status).toBe(404);
    });

    it('🔴 sees no hidden post, even their own, and no hidden comment', async () => {
      expect(ids(await find('Post', session.bob))).toEqual(named('ann.post', 'ann.prayer'));
      expect(ids(await find('Comment', session.ann))).toEqual(named('bob.comment'));
    });

    it('🔴 cannot learn why a post was hidden by filtering on the reason', async () => {
      for (const c of ['Post', 'Comment']) {
        const probe = await find(c, session.ann, `?where=${encodeURIComponent(JSON.stringify({ hiddenReason: { $exists: true } }))}`);
        expect([c, probe.status >= 400, JSON.stringify(probe.json)]).toEqual([c, true, expect.stringMatching(/hiddenReason/)]);
      }
    });

    it('sees every member’s profile, but not another member’s email or why anyone was blocked', async () => {
      const all = await find('Member', session.ann);
      expect(ids(all)).toEqual(named('pastor', 'ann', 'bob', 'wes', 'zed'));
      const row = (n: string) => all.json.results.find((r) => r.objectId === id[n])!;
      expect(row('ann').email).toBe('ann@example.com');
      expect(row('bob')).not.toHaveProperty('email');
      expect(row('zed')).not.toHaveProperty('blockedReason');
    });

    it('🔴 cannot find a member by their email', async () => {
      const probe = await find('Member', session.ann, `?where=${encodeURIComponent(JSON.stringify({ email: 'bob@example.com' }))}`);
      expect(probe.status).toBeGreaterThanOrEqual(400);
    });

    it('sees hearts', async () => {
      expect(ids(await find('Heart', session.ann))).toEqual(named('bob.heart'));
    });

    it('sees who prayed for their own request, and their own "I prayed"', async () => {
      expect(ids(await find('Prayed', session.ann))).toEqual(named('bob.prayed'));
      expect(ids(await find('Prayed', session.bob))).toEqual(named('bob.prayed'));
    });

    it('🔴 sees nobody else’s "I prayed" on somebody else’s request', async () => {
      const r = await find('Prayed', session.pastor);
      // The pastor is an admin, and admins see them all; a third member would see none.
      expect(ids(r)).toEqual(named('bob.prayed'));
      const cara = await req<{ objectId: string }>('POST', '/admin/users', { username: 'cara', password: 'pw-cara', roles: ['member'] });
      const login = await req<{ sessionToken: string }>('POST', '/login', { username: 'cara', password: 'pw-cara' }, {});
      expect(cara.status).toBe(201);
      expect(ids(await find('Prayed', { 'x-parse-session-token': login.json.sessionToken }))).toEqual([]);
    });

    it('🔴 reads only their own notes', async () => {
      expect(ids(await find('Note', session.ann))).toEqual(named('ann.note'));
      expect((await req('GET', `/classes/Note/${id['pastor.note']}`, undefined, session.ann)).status).toBe(404);
    });

    it('🔴 sees no report, not even one they made', async () => {
      for (const c of ['Report', 'CommentReport', 'MemberHistory', 'DevotionalHistory', 'CommunityHistory']) {
        const r = await find(c, session.ann);
        expect([c, r.status]).toEqual([c, 403]);
      }
    });

    it('🔴 writes nothing directly: not a post as somebody else, not a heart, not a hidden post brought back', async () => {
      const forged = await req('POST', '/classes/Post', { caption: 'x', kind: 'post', member: ptr('Member', id.bob) }, session.ann);
      expect(forged.status).toBe(403);
      expect((await req('POST', '/classes/Heart', { post: ptr('Post', id['ann.prayer']), doneBy: ptr('_User', userId.bob) }, session.ann)).status).toBe(403);
      expect((await req('PUT', `/classes/Post/${id['ann.post']}`, { caption: 'changed' }, session.ann)).status).toBe(403);
      expect((await req('DELETE', `/classes/Comment/${id['bob.comment']}`, undefined, session.ann)).status).toBe(403);
      expect((await req('PUT', `/classes/Member/${id.ann}`, { status: 'approved', role: 'admin' }, session.ann)).status).toBe(403);
    });
  });

  describe('a member waiting to be let in', () => {
    it('🔴 sees their own Member row and nothing of the community', async () => {
      expect(ids(await find('Member', session.wes))).toEqual(named('wes'));
      for (const c of ['Post', 'Comment', 'Heart']) {
        const r = await find(c, session.wes);
        expect([c, r.status]).toEqual([c, 403]);
      }
      expect(ids(await find('Prayed', session.wes))).toEqual([]);
    });

    it('reads the community’s rules', async () => {
      expect(ids(await find('Community', session.wes))).toEqual(named('the'));
    });
  });

  describe('an admin', () => {
    it('sees the hidden post and comment, and why they were hidden', async () => {
      const posts = await find('Post', session.pastor);
      expect(ids(posts)).toEqual(named('ann.post', 'ann.prayer', 'bob.hidden'));
      expect(posts.json.results.find((r) => r.objectId === id['bob.hidden'])!.hiddenReason).toBe('a child shown without a parent’s yes');
      expect(ids(await find('Comment', session.pastor))).toEqual(named('bob.comment', 'bob.hiddenComment'));
    });

    it('sees the reports, who made them, and the history', async () => {
      expect(ids(await find('Report', session.pastor))).toEqual(named('ann.reportsBob'));
      expect(ids(await find('CommentReport', session.pastor))).toEqual(named('ann.reportsComment'));
      expect(ids(await find('MemberHistory', session.pastor))).toEqual(named('ann.history'));
      const zed = (await find('Member', session.pastor)).json.results.find((r) => r.objectId === id.zed)!;
      expect([zed.email, zed.blockedReason]).toEqual(['zed@example.com', 'posted a stranger’s child']);
    });

    it('🔴 cannot read a member’s note', async () => {
      expect(ids(await find('Note', session.pastor))).toEqual(named('pastor.note'));
      expect((await req('GET', `/classes/Note/${id['ann.note']}`, undefined, session.pastor)).status).toBe(404);
    });

    it('sees tomorrow’s devotional before its day', async () => {
      expect(ids(await find('Devotional', session.pastor))).toEqual(named('today', 'tomorrow'));
    });

    it('🔴 writes nothing directly either: a write without its history row is not allowed', async () => {
      expect((await req('PUT', `/classes/Member/${id.wes}`, { status: 'approved' }, session.pastor)).status).toBe(403);
      expect((await req('POST', '/classes/Devotional', { title: 'x', source: 'written' }, session.pastor)).status).toBe(403);
      expect((await req('DELETE', `/classes/Post/${id['bob.hidden']}`, undefined, session.pastor)).status).toBe(403);
    });
  });

  describe('anyone, with no account', () => {
    it('opens a devotional whose day has come', async () => {
      expect(ids(await find('Devotional', {}))).toEqual(named('today'));
      expect((await req('GET', `/classes/Devotional/${id.today}`, undefined, {})).status).toBe(200);
    });

    it('🔴 cannot open one before its day', async () => {
      expect((await req('GET', `/classes/Devotional/${id.tomorrow}`, undefined, {})).status).toBe(404);
    });

    it('🔴 sees no member, post, comment, heart, prayer or note', async () => {
      for (const c of ['Member', 'Post', 'Comment', 'Heart', 'Prayed', 'Note', 'Report']) {
        const r = await find(c, {});
        expect([c, r.status]).toEqual([c, 403]);
      }
    });

    it('🔴 cannot sign themselves up', async () => {
      expect((await req('POST', '/users', { username: 'eve', password: 'pw' }, {})).status).toBe(403);
    });
  });

  // P121-TWO001-MEMBERSPHOTO: W1 for photos. Before it, a private photo was its uploader's alone (bob
  // 403) and a public one anyone's with the link — measured 2026-10-14, TWO-001 §7.3.
  describe('a photo in the feed, shared with the members', () => {
    const PNG = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
        '0000000d4944415478da63fccfc0500f000485018084a98c210000000049454e44ae426082',
      'hex'
    );
    const members = { 'x-nodegx-file-readers': 'role:member, role:admin' };
    let url = '';
    let name = '';

    beforeAll(async () => {
      const up = await request<{ url: string; name: string }>(base, 'POST', '/files/lunch.png', {
        body: PNG,
        headers: { ...members, ...session.ann },
        raw: true
      });
      expect(up.status).toBe(201);
      ({ url, name } = up.json);
    });

    const status = async (who: Record<string, string>) => (await fetch(url, { headers: who })).status;
    const sign = (who: Record<string, string>) => req<{ url: string }>('GET', `/files/${name}/sign`, undefined, who);

    it('every member and admin reads it and can sign a link for an <img>; the uploader too', async () => {
      for (const who of ['ann', 'bob', 'pastor']) {
        expect([who, await status(session[who])]).toEqual([who, 200]);
        expect([who, (await sign(session[who])).status]).toEqual([who, 200]);
      }
      const link = await sign(session.bob);
      const img = await fetch(link.json.url);
      expect(img.status).toBe(200);
      expect(Buffer.from(await img.arrayBuffer()).equals(PNG)).toBe(true);
    });

    it('🔴 someone waiting, someone blocked and a stranger can neither read it nor sign it', async () => {
      for (const [who, headers] of [['wes', session.wes], ['zed', session.zed], ['stranger', {}]] as const) {
        expect([who, await status(headers)]).toEqual([who, 403]);
        expect([who, (await sign(headers)).status]).toEqual([who, 403]);
      }
    });

    it('🔴 another member cannot delete it', async () => {
      expect((await req('DELETE', `/files/${name}`, undefined, session.bob)).status).toBe(403);
      expect(await status(session.bob)).toBe(200);
    });
  });
});
