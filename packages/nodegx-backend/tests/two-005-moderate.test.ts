/**
 * TWO-005 slice 5 — moderation, through the gram's own cloud functions.
 *
 * 🔴 **It runs the SHIPPED functions** (`templates/gram/components/__cloud__/{report,hide,block,writeRules,…}`,
 * written by `npm run template:gram`) on a backend locked with the template's own `nodegx.security.json`. People are
 * seeded with the master key, as the other slices' specs seed them; every write after that is a function call by the
 * person.
 *
 * What it proves (TWO-005 slice 5; the world's rules 1, 2, 4 and 6; AC3's second half; AC4):
 *
 * - a report is kept, once per person, with one of the world's reasons; nobody but an admin reads it, nobody writes one
 *   directly, and your own post isn't reported;
 * - 🔴 AC3: a member can't hide another member's post, by the function or by writing it;
 * - 🔴 AC4: a hidden post is gone for members (asked for directly, by its ACL) and stays for admins, with the reason;
 *   a member takes their own down; only an admin brings one back;
 * - 🔴 a blocked member can't sign in, and everything they wrote is gone for members until they're let back, all
 *   but what was hidden for its own reason; blocking records why, and its history;
 * - an admin writes the rules, with history; every member reads them.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { bundleAuthoredComponents } from './helpers/authored-bundle';
import { request, type ParseDate, type ParsePointer, type ParseRecord } from './helpers/http';

jest.setTimeout(90000);

/** `TWO005_TEMPLATE` points the spec at a copy of the template (a mutant); unset, it is the shipped one. */
const TEMPLATE = process.env.TWO005_TEMPLATE || path.join(__dirname, '../../../templates/gram');
const FUNCTIONS = ['whoAmI', 'sharePost', 'commentOn', 'heartPost', 'report', 'hide', 'block', 'writeRules'];
const TAKEN_DOWN = 'Taken down by the member who wrote it.';

interface Answer<R = Record<string, unknown>> {
  result?: R;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, unknown>;
/** The rows this spec reads into: a report, a history row, and a Post or Member that may have been ended. */
interface Report extends ParseRecord {
  doneBy: ParsePointer;
  at?: ParseDate;
}
interface History extends ParseRecord {
  who: ParsePointer;
}
interface Ended extends ParseRecord {
  endedAt?: ParseDate;
}

describe('TWO-005 slice 5 — moderation, through the template’s functions', () => {
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) => request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const day = (iso: string) => ({ __type: 'Date', iso });

  const who: Record<string, Record<string, string>> = { stranger: {} };
  const userId: Record<string, string> = {};
  const memberId: Record<string, string> = {};
  const fn = <R = Record<string, unknown>>(name: string, body: unknown, as: string) => req<Answer<R>>('POST', `/functions/${name}`, body, who[as]);
  const share = (caption: string, as: string) => fn('sharePost', { post: { caption } }, as);
  const comment = (postId: string, text: string, as: string) => fn('commentOn', { comment: { postId, text } }, as);
  const report = (what: Row, as: string) => fn('report', { report: what }, as);
  const hide = (what: Row, as: string) => fn('hide', { hide: what }, as);
  const block = (what: Row, as: string) => fn('block', { block: what }, as);
  const signIn = (name: string) => req<{ sessionToken?: string }>('POST', '/login', { username: name, password: `pw-${name}-long` }, {});
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    req<{ results: T[] }>('GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, undefined, headers);
  const one = async <T extends ParseRecord = ParseRecord>(cls: string, id: string, headers: Record<string, string> = master) => (await rows<T>(cls, { objectId: id }, headers)).json.results?.[0];
  const reason = (a: { json: Answer }) => String(a.json.error ?? '');

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two005-moderate-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005mo', backendName: 'TWO-005 moderation', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    for (const role of ['admin', 'member']) expect((await req('POST', '/admin/roles', { name: role })).status).toBe(201);

    // ama: the first admin (role:admin alone); pat: a second admin. ann, bob, dee: members. wes: waiting. vic: turned
    // away (blocked while waiting, as turnAway leaves them).
    const people: Array<[string, string, string[], Row?]> = [
      ['ama', 'approved', ['admin']],
      ['pat', 'approved', ['member', 'admin']],
      ['ann', 'approved', ['member']],
      ['bob', 'approved', ['member']],
      ['dee', 'approved', ['member']],
      ['wes', 'waiting', []],
      ['vic', 'waiting', [], { blockedReason: 'Not let in.', endedAt: day('2026-10-14T08:00:00.000Z') }]
    ];
    for (const [name, status, roles, more] of people) {
      const made = await req<{ objectId: string }>('POST', '/admin/users', { username: name, email: `${name}@example.com`, password: `pw-${name}-long`, roles });
      expect(made.status).toBe(201);
      userId[name] = made.json.objectId;
      const login = await signIn(name);
      who[name] = { 'x-parse-session-token': String(login.json.sessionToken) };
      const row = await req<{ objectId: string }>('POST', '/classes/Member', {
        name: name[0].toUpperCase() + name.slice(1) + ' Owusu',
        email: `${name}@example.com`,
        status,
        role: roles.includes('admin') ? 'admin' : 'member',
        login: ptr('_User', userId[name]),
        ...more
      });
      memberId[name] = row.json.objectId;
    }
    expect((await req('POST', '/classes/Community', { name: 'The gram', rules: 'Be kind.' })).status).toBe(201);
  });

  afterAll(async () => {
    await service?.stop();
  });

  let annsPost: string;
  let annsComment: string;
  let bobsPost: string;
  let bobsComment: string;
  let bobsOther: string;

  it('a report: kept once per person, with the world’s reason and a note; refused in words when it won’t do', async () => {
    annsPost = String((await share('Sunday lunch with the youth group', 'ann')).json.result?.postId);
    bobsPost = String((await share('My new shop is open', 'bob')).json.result?.postId);
    annsComment = String((await comment(bobsPost, 'Well done!', 'ann')).json.result?.commentId);
    bobsComment = String((await comment(annsPost, 'Who let you in?', 'bob')).json.result?.commentId);
    bobsOther = String((await comment(annsPost, 'Looks lovely', 'bob')).json.result?.commentId);

    let r = await report({ postId: annsPost, reason: 'child-photo' }, 'bob');
    expect([r.status, r.json.result?.reported]).toEqual([200, true]);
    // Again, with another reason: the first stands, and nothing more is kept.
    expect((await report({ postId: annsPost, reason: 'spam' }, 'bob')).status).toBe(200);
    const kept = (await rows<Report>('Report', { post: ptr('Post', annsPost) })).json.results;
    expect(kept.map((k) => [k.doneBy.objectId, k.reason, k.note ?? null, typeof k.at?.iso])).toEqual([[userId.bob, 'child-photo', null, 'string']]);

    expect(reason(await report({ postId: annsPost, reason: 'other' }, 'dee'))).toBe('Say in a few words what’s wrong.');
    expect(reason(await report({ postId: annsPost, reason: 'other', note: '   ' }, 'dee'))).toBe('Say in a few words what’s wrong.');
    expect(reason(await report({ postId: annsPost, reason: 'other', note: 'x'.repeat(501) }, 'dee'))).toBe('A note of 500 characters or fewer.');
    r = await report({ postId: annsPost, reason: 'other', note: '  A phone number in the photo.  ' }, 'dee');
    expect(r.status).toBe(200);
    expect((await rows('Report', { post: ptr('Post', annsPost), doneBy: ptr('_User', userId.dee) })).json.results.map((k) => [k.reason, k.note])).toEqual([['other', 'A phone number in the photo.']]);

    for (const bad of [undefined, 'rude', 'CHILD-PHOTO', 3]) {
      expect([bad, reason(await report({ postId: bobsPost, reason: bad }, 'ann'))]).toEqual([bad, 'Say why: a child shown without a parent’s yes, unkind, spam or something else.']);
    }
    expect(reason(await report({ postId: annsPost, reason: 'unkind' }, 'ann'))).toBe('This is your own post. Take it down instead.');
    expect(reason(await report({ postId: 'nope', reason: 'unkind' }, 'ann'))).toBe('This post isn’t in the feed any more.');
    expect(reason(await report({}, 'ann'))).toBe('Say why: a child shown without a parent’s yes, unkind, spam or something else.');
    // No report at all is refused by the request itself, before the script.
    expect((await report(null as unknown as Row, 'ann')).status === 200).toBe(false);

    // A comment: its own reasons (no photo, so no child's), its own table.
    expect(reason(await report({ commentId: bobsComment, reason: 'child-photo' }, 'ann'))).toBe('Say why: unkind, spam or something else.');
    expect((await report({ commentId: bobsComment, reason: 'unkind' }, 'ann')).status).toBe(200);
    expect((await rows<Report>('CommentReport', { comment: ptr('Comment', bobsComment) })).json.results.map((k) => [k.doneBy.objectId, k.reason])).toEqual([[userId.ann, 'unkind']]);
    expect(reason(await report({ commentId: annsComment, reason: 'spam' }, 'ann'))).toBe('This is your own comment. Take it down instead.');
    expect(reason(await report({ commentId: 'nope', reason: 'spam' }, 'ann'))).toBe('This comment isn’t in the feed any more.');
    // An admin may report too.
    expect((await report({ postId: bobsPost, reason: 'spam' }, 'pat')).status).toBe(200);
  });

  it('🔴 rule 4: only admins read reports; nobody writes or changes one directly; nobody waiting or without an account reports', async () => {
    for (const cls of ['Report', 'CommentReport']) {
      for (const as of ['ann', 'bob', 'dee', 'stranger']) {
        const seen = await rows(cls, {}, who[as]);
        expect([cls, as, seen.status === 200 && seen.json.results.length > 0]).toEqual([cls, as, false]);
      }
      expect((await rows(cls, {}, who.ama)).json.results.length).toBeGreaterThan(0);
    }
    for (const as of ['bob', 'ama']) {
      const made = await req('POST', '/classes/Report', { post: ptr('Post', annsPost), at: day(new Date().toISOString()), doneBy: ptr('_User', userId[as]), reason: 'spam' }, who[as]);
      expect([as, made.status === 201]).toEqual([as, false]);
    }
    const first = (await rows('Report', { post: ptr('Post', annsPost) })).json.results[0];
    expect((await req('PUT', `/classes/Report/${first.objectId}`, { reason: 'spam' }, who.ama)).status === 200).toBe(false);
    expect((await req('DELETE', `/classes/Report/${first.objectId}`, undefined, who.ama)).status === 200).toBe(false);
    for (const as of ['wes', 'vic', 'stranger']) expect([as, (await report({ postId: annsPost, reason: 'spam' }, as)).status]).toEqual([as, 403]);
    expect((await rows('Report', { post: ptr('Post', annsPost) })).json.results).toHaveLength(2);
  });

  it('🔴 AC3: a member can’t hide another member’s post, by the function or by writing it', async () => {
    expect(reason(await hide({ postId: annsPost, hidden: true, reason: 'I don’t like it' }, 'bob'))).toBe('Only an admin can hide someone else’s post. Report it instead.');
    expect(reason(await hide({ commentId: annsComment, hidden: true }, 'bob'))).toBe('Only an admin can hide someone else’s comment. Report it instead.');
    const wrote = await req('PUT', `/classes/Post/${annsPost}`, { endedAt: day(new Date().toISOString()), hiddenReason: 'mine now' }, who.bob);
    expect(wrote.status === 200).toBe(false);
    const p = await one<Ended>('Post', annsPost);
    expect([p.endedAt ?? null, p.hiddenReason ?? null, p.ACL ?? null]).toEqual([null, null, null]);
    expect(await one('Post', annsPost, who.dee)).toBeDefined();
    for (const as of ['wes', 'stranger']) expect([as, (await hide({ postId: annsPost, hidden: true }, as)).status]).toEqual([as, 403]);
    expect(reason(await hide({ postId: annsPost, hidden: 'yes' }, 'ann'))).toBe('Say whether to hide it or bring it back.');
    expect(reason(await hide({ postId: 'nope', hidden: true }, 'ann'))).toBe('There is no such post.');
  });

  it('🔴 AC4: a member takes their own post down; it is gone for every member, asked for directly, and stays for admins with why', async () => {
    expect((await hide({ postId: annsPost, hidden: true, reason: 'ignored for your own' }, 'ann')).status).toBe(200);
    const p = await one<Ended>('Post', annsPost);
    expect([typeof p.endedAt?.iso, p.hiddenReason]).toEqual(['string', TAKEN_DOWN]);
    for (const as of ['ann', 'bob', 'dee']) {
      expect([as, await one('Post', annsPost, who[as])]).toEqual([as, undefined]);
      expect([as, (await rows('Post', {}, who[as])).json.results.map((x) => x.objectId).includes(annsPost)]).toEqual([as, false]);
    }
    for (const as of ['ama', 'pat']) {
      const seen = await one('Post', annsPost, who[as]);
      expect([as, seen?.hiddenReason]).toEqual([as, TAKEN_DOWN]);
    }
    // Out of the feed: no heart, no comment, no report on it.
    expect(reason(await fn('heartPost', { heart: { postId: annsPost, on: true } }, 'dee'))).toBe('This post isn’t in the feed any more.');
    expect(reason(await comment(annsPost, 'Hello?', 'dee'))).toBe('This post isn’t in the feed any more.');
    expect(reason(await report({ postId: annsPost, reason: 'spam' }, 'dee'))).toBe('This post isn’t in the feed any more.');
    // Hidden again: nothing changes, and its first reason stays.
    expect((await hide({ postId: annsPost, hidden: true }, 'ann')).status).toBe(200);
    expect((await hide({ postId: annsPost, hidden: true, reason: 'spam' }, 'ama')).status).toBe(200);
    expect((await one('Post', annsPost)).hiddenReason).toBe(TAKEN_DOWN);
    // Only an admin brings it back; then every member reads it again, with no reason left on it.
    expect(reason(await hide({ postId: annsPost, hidden: false }, 'ann'))).toBe('Only an admin can bring back a post.');
    expect((await hide({ postId: annsPost, hidden: false }, 'ama')).status).toBe(200);
    const back = await one('Post', annsPost);
    expect([back.endedAt ?? null, back.hiddenReason ?? null]).toEqual([null, null]);
    for (const as of ['ann', 'bob', 'dee']) expect([as, (await one('Post', annsPost, who[as]))?.caption]).toEqual([as, 'Sunday lunch with the youth group']);
    // 🔴 Brought back, its ACL lets anyone read it: the policy still keeps out everyone who isn't in (W1).
    expect(back.ACL).toEqual({ '*': { read: true } });
    for (const as of ['wes', 'vic', 'stranger']) {
      const seen = await rows('Post', { objectId: annsPost }, who[as]);
      expect([as, seen.status === 200 && seen.json.results.length > 0]).toEqual([as, false]);
    }
    // Its reports stayed through it all (rule 1).
    expect((await rows('Report', { post: ptr('Post', annsPost) })).json.results).toHaveLength(2);
  });

  it('🔴 an admin hides anyone’s post or comment, saying why; members stop seeing it, admins see the reason', async () => {
    expect(reason(await hide({ postId: annsPost, hidden: true }, 'ama'))).toBe('Say why it’s hidden. Admins see the reason; the member who wrote it doesn’t.');
    expect(reason(await hide({ postId: annsPost, hidden: true, reason: '  ' }, 'ama'))).toBe('Say why it’s hidden. Admins see the reason; the member who wrote it doesn’t.');
    expect(reason(await hide({ postId: annsPost, hidden: true, reason: 'x'.repeat(501) }, 'ama'))).toBe('A reason of 500 characters or fewer.');
    expect((await hide({ postId: annsPost, hidden: true, reason: '  A child shown without a parent’s yes  ' }, 'ama')).status).toBe(200);
    expect((await one('Post', annsPost, who.pat))?.hiddenReason).toBe('A child shown without a parent’s yes');
    expect(await one('Post', annsPost, who.bob)).toBeUndefined();
    expect((await hide({ postId: annsPost, hidden: false }, 'pat')).status).toBe(200);

    expect((await hide({ commentId: bobsComment, hidden: true, reason: 'Unkind' }, 'ama')).status).toBe(200);
    for (const as of ['ann', 'bob', 'dee']) expect([as, await one('Comment', bobsComment, who[as])]).toEqual([as, undefined]);
    expect((await one('Comment', bobsComment, who.ama))?.hiddenReason).toBe('Unkind');
    expect((await one('Comment', bobsOther, who.dee))?.text).toBe('Looks lovely');
    expect(reason(await report({ commentId: bobsComment, reason: 'spam' }, 'dee'))).toBe('This comment isn’t in the feed any more.');
    // A member takes their own comment down.
    const mine = String((await comment(bobsPost, 'Oops, wrong post', 'dee')).json.result?.commentId);
    expect((await hide({ commentId: mine, hidden: true }, 'dee')).status).toBe(200);
    expect([(await one('Comment', mine)).hiddenReason, await one('Comment', mine, who.ann)]).toEqual([TAKEN_DOWN, undefined]);
  });

  it('🔴 rule 2: a blocked member can’t sign in; what they wrote is gone for members until they’re let back', async () => {
    expect(reason(await block({ memberId: memberId.bob, blocked: true }, 'ama'))).toBe('Say why. Admins see the reason; Bob Owusu doesn’t.');
    expect(reason(await block({ memberId: memberId.bob, blocked: true, reason: 'x'.repeat(501) }, 'ama'))).toBe('A reason of 500 characters or fewer.');
    expect(reason(await block({ memberId: memberId.ama, blocked: true, reason: 'test' }, 'ama'))).toBe('You can’t block yourself.');
    expect(reason(await block({ memberId: memberId.pat, blocked: true, reason: 'test' }, 'ama'))).toBe('Pat Owusu is an admin. An admin can’t be blocked.');
    expect(reason(await block({ memberId: 'nope', blocked: true, reason: 'test' }, 'ama'))).toBe('There is no such member.');
    expect(reason(await block({ memberId: memberId.bob, blocked: 1, reason: 'test' }, 'ama'))).toBe('Say whether to block them or let them back.');
    for (const as of ['ann', 'dee', 'wes', 'stranger']) expect([as, (await block({ memberId: memberId.bob, blocked: true, reason: 'x' }, as)).status]).toEqual([as, 403]);

    expect((await block({ memberId: memberId.bob, blocked: true, reason: '  Selling in the comments  ' }, 'ama')).status).toBe(200);
    const m = await one<Ended>('Member', memberId.bob);
    expect([m.blockedReason, typeof m.endedAt?.iso]).toEqual(['Selling in the comments', 'string']);
    const history = (await rows<History>('MemberHistory', { member: ptr('Member', memberId.bob) })).json.results;
    expect(history.map((h) => [h.who.objectId, h.changed])).toEqual([[userId.ama, { blocked: { from: false, to: true }, blockedReason: { from: null, to: 'Selling in the comments' } }]]);
    // Can't sign in: the old session is refused, and so is the password.
    expect((await fn('whoAmI', {}, 'bob')).status === 200).toBe(false);
    expect((await signIn('bob')).status === 200).toBe(false);
    // Everything he wrote is gone for members; the admins still read it.
    for (const [cls, id] of [['Post', bobsPost], ['Comment', bobsOther], ['Comment', bobsComment]]) {
      for (const as of ['ann', 'dee']) expect([cls, id, as, await one(cls, id, who[as])]).toEqual([cls, id, as, undefined]);
      expect([cls, id, (await one(cls, id, who.ama))?.objectId]).toEqual([cls, id, id]);
    }
    // And out of the feed: what others wrote under his post too.
    expect(reason(await report({ commentId: annsComment, reason: 'spam' }, 'dee'))).toBe('This comment isn’t in the feed any more.');
    // An admin can't bring one of his back while he is blocked.
    // His post wasn't hidden for itself: "bring it back" changes nothing, and it stays out of members' reach.
    expect(reason(await hide({ postId: bobsPost, hidden: false }, 'ama'))).toBe('');
    expect(await one('Post', bobsPost, who.dee)).toBeUndefined();
    expect(reason(await hide({ commentId: bobsComment, hidden: false }, 'ama'))).toBe('Bob Owusu is blocked. Let them back first, and their comments come back with them.');
    // Blocked again: nothing changes, no second history row.
    expect((await block({ memberId: memberId.bob, blocked: true, reason: 'again' }, 'pat')).status).toBe(200);
    expect((await one('Member', memberId.bob)).blockedReason).toBe('Selling in the comments');
    expect((await rows('MemberHistory', { member: ptr('Member', memberId.bob) })).json.results).toHaveLength(1);
  });

  it('🔴 let back: signs in again, what he wrote comes back, all but the comment hidden for its own reason', async () => {
    expect((await block({ memberId: memberId.bob, blocked: false }, 'ama')).status).toBe(200);
    const m = await one<Ended>('Member', memberId.bob);
    expect([m.blockedReason ?? null, m.endedAt ?? null, m.status]).toEqual([null, null, 'approved']);
    const history = (await rows<History>('MemberHistory', { member: ptr('Member', memberId.bob) })).json.results;
    expect(history[1].changed).toEqual({ blocked: { from: true, to: false }, blockedReason: { from: 'Selling in the comments', to: null } });
    const login = await signIn('bob');
    expect(login.status).toBe(200);
    who.bob = { 'x-parse-session-token': String(login.json.sessionToken) };
    expect((await fn<{ me?: { blocked?: boolean } }>('whoAmI', {}, 'bob')).json.result?.me?.blocked).toBe(false);
    expect((await one('Post', bobsPost, who.dee))?.caption).toBe('My new shop is open');
    expect((await one('Comment', bobsOther, who.dee))?.text).toBe('Looks lovely');
    expect(await one('Comment', bobsComment, who.dee)).toBeUndefined();
    expect((await one('Comment', bobsComment, who.ama))?.hiddenReason).toBe('Unkind');
    // Now the admin may bring that one back.
    expect((await hide({ commentId: bobsComment, hidden: false }, 'ama')).status).toBe(200);
    expect((await one('Comment', bobsComment, who.dee))?.text).toBe('Who let you in?');
    // Someone turned away, let back, is waiting again.
    expect((await block({ memberId: memberId.vic, blocked: false }, 'ama')).status).toBe(200);
    const vic = await one('Member', memberId.vic);
    expect([vic.status, vic.endedAt ?? null, vic.blockedReason ?? null]).toEqual(['waiting', null, null]);
  });

  it('writeRules: an admin writes them, with history; every member and a stranger read them; nobody else writes them', async () => {
    const write = (rules: unknown, as: string) => fn('writeRules', { rules: { rules } }, as);
    for (const as of ['ann', 'wes', 'stranger']) expect([as, (await write('Mine now', as)).status]).toEqual([as, 403]);
    expect(reason(await write('   ', 'ama'))).toBe('Write the rules first.');
    expect(reason(await write(7, 'ama'))).toBe('Write the rules first.');
    expect(reason(await write('x'.repeat(5001), 'ama'))).toBe('Rules of 5,000 characters or fewer.');
    const rules = 'Be kind.\nNo photo of a child without their parent’s yes.';
    expect((await write(`  ${rules}  `, 'ama')).json.result?.saved).toBe(true);
    for (const as of ['ann', 'stranger']) expect([as, (await rows('Community', {}, who[as])).json.results[0]?.rules]).toEqual([as, rules]);
    const c = (await rows('Community')).json.results[0];
    let h = (await rows<History>('CommunityHistory', { community: ptr('Community', c.objectId) })).json.results;
    expect(h.map((x) => [x.who.objectId, x.changed])).toEqual([[userId.ama, { rules: { from: 'Be kind.', to: rules } }]]);
    // The same again: nothing written.
    expect((await write(rules, 'pat')).status).toBe(200);
    h = (await rows<History>('CommunityHistory', { community: ptr('Community', c.objectId) })).json.results;
    expect(h).toHaveLength(1);
    expect((await req('PUT', `/classes/Community/${c.objectId}`, { rules: 'Anything goes' }, who.ama)).status === 200).toBe(false);
    expect((await rows('CommunityHistory', {}, who.ann)).json.results?.length ?? 0).toBe(0);
  });
});
