/**
 * TWO-005 slice 1 — joining the community and being let in, through the gram's own cloud functions.
 *
 * 🔴 **It runs the SHIPPED functions** (`templates/gram/components/__cloud__/`, written by `npm run template:gram`
 * through the door) on a backend locked with the template's own `nodegx.security.json`. Nobody is made by the harness
 * except through the template's doors: the first admin by `setUpCommunity` against the setup secret, everyone else by
 * `askToJoin`. Members sign in the way the app makes them: by the emailed link (a stubbed mailer catches it, then the
 * link is pressed and its code exchanged, as the runtime does).
 *
 * What it proves (TWO-005 slice 1; the world's rules 1, 2 and 6, and its rule for children):
 *
 * - the setup door opens once, only with the token; the first admin signs in with a password;
 * - anyone may ask to join with a name, an email and "13 or older", and nothing else; asking twice makes one member and
 *   answers the same both times; a member who asked has no password;
 * - 🔴 a waiting member reads only their own member row and no post, and can't let anyone in (the policy);
 * - an admin lets them in: approved, `role:member`, told by email with a link to this app's sign-in page; with no
 *   email service they are still let in and the answer says the message didn't go;
 * - "No" blocks a waiting member with the reason and switches their sign-in off: a link is refused when pressed, and
 *   the session they had stops working;
 * - 🔴 the template's policy (`signup: nobody`) keeps a link from making anyone new, even with the backend's open
 *   sign-up switched on;
 * - an admin makes a member an admin, who can then let people in;
 * - every change leaves a history row naming who made it.
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
const SETUP_TOKEN = 'setup-token-two005';
const FUNCTIONS = ['whoAmI', 'setUpCommunity', 'askToJoin', 'letIn', 'turnAway', 'makeAdmin'];
const APP = 'https://grace.example.org';

interface Answer {
  result?: Record<string, unknown>;
  error?: unknown;
  code?: unknown;
}
type Row = Record<string, unknown>;
/** A Member row and a MemberHistory row, as far as this spec reads them: `changed` names each field that moved. */
interface Member extends ParseRecord {
  login: ParsePointer;
}
interface MemberHistory extends ParseRecord {
  who: ParsePointer;
  changed: Record<string, { from?: unknown; to?: unknown }>;
}

describe('TWO-005 slice 1 — joining and being let in, through the template’s functions', () => {
  let service: BackendService;
  let base: string;
  const master = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = master) => request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const mail: Array<{ to: string; subject: string; text: string }> = [];

  const who: Record<string, Record<string, string>> = { stranger: {} };
  const call = (fn: string, body: Record<string, unknown>, as: string) => req<Answer>('POST', `/functions/${fn}`, body, who[as]);
  const rows = async <T extends ParseRecord = ParseRecord>(cls: string, where: Row = {}, headers: Record<string, string> = master) =>
    req<{ results: T[] }>('GET', `/classes/${cls}?where=${encodeURIComponent(JSON.stringify(where))}&order=createdAt`, undefined, headers);
  const memberByEmail = async (email: string) => (await rows<Member>('Member', { email })).json.results;
  const historyOf = async (memberId: string) => (await rows<MemberHistory>('MemberHistory', { member: ptr('Member', memberId) })).json.results;

  /** The whole path a member takes: ask for the link, open the mail, press it, and the app exchanges the code. */
  async function linkSignIn(name: string, email: string): Promise<string> {
    mail.length = 0;
    expect((await req('POST', '/auth/magic-link', { email, redirect: `${APP}/` }, {})).status).toBe(200);
    await new Promise((r) => setTimeout(r, 80));
    const sent = mail.filter((m) => m.to === email);
    if (sent.length === 0) return 'no-mail';
    const token = decodeURIComponent((/\/auth\/magic-link\/callback\?token=([^\s&]+)/.exec(sent[0].text) as RegExpExecArray)[1]);
    const form = await fetch(`${base}/auth/magic-link/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
      redirect: 'manual'
    });
    expect(form.status).toBe(302);
    const back = new URL(form.headers.get('location') as string);
    expect(back.origin).toBe(APP);
    const code = back.searchParams.get('nodegx_auth');
    if (!code) return `refused: ${back.searchParams.get('nodegx_auth_error')}`;
    const exchanged = await req<{ sessionToken: string }>('POST', '/oauth/exchange', { code }, {});
    expect(exchanged.status).toBe(200);
    who[name] = { 'x-parse-session-token': exchanged.json.sessionToken };
    return 'signed-in';
  }

  const id: Record<string, string> = {};

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-two005-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'));
    fs.writeFileSync(path.join(dataDir, 'workflows', 'gram.workflow.json'), JSON.stringify(bundleAuthoredComponents(TEMPLATE, FUNCTIONS.map((f) => `__cloud__/${f}`))));
    fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(path.join(TEMPLATE, 'nodegx.security.json')));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { GRAM_SETUP_TOKEN: SETUP_TOKEN } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'two005', backendName: 'TWO-005 gram', authToken: 't0k' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    service.getMailerForTesting()!.setTransportForTesting({
      sendMail: async (opts: Record<string, unknown>) => {
        mail.push({ to: String(opts.to), subject: String(opts.subject), text: String(opts.text) });
      }
    });
    for (const push of JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'backend/schema.json'), 'utf8'))) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status}`);
    }
    // What the builder's setup page asks for: email, magic links with no open sign-up, this app on the allow-list.
    expect((await req('PUT', '/admin/email/config', { baseUrl: base, enabled: true, smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' }, fromAddress: 'noreply@test' })).status).toBe(200);
    expect((await req('PUT', '/admin/auth', { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: false }, redirectAllowList: [APP] })).status).toBe(200);
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('the setup door: refused without the token; with it, the community and its first admin, who signs in with a password; then shut', async () => {
    const setup = { setupToken: SETUP_TOKEN, community: 'Grace Chapel', name: 'Ama Owusu', email: 'Ama@Example.com', password: 'longenough' };
    expect((await call('setUpCommunity', { setup: { ...setup, setupToken: 'wrong' } }, 'stranger')).status).toBe(400);
    const refused = await call('setUpCommunity', { setup: { ...setup, password: 'short' } }, 'stranger');
    expect(JSON.stringify(refused.json)).toContain('8 characters');
    const made = await call('setUpCommunity', { setup }, 'stranger');
    expect(made.status).toBe(200);
    id.ama = String(made.json.result?.memberId);
    const [ama] = await memberByEmail('ama@example.com');
    expect(ama).toMatchObject({ objectId: id.ama, name: 'Ama Owusu', status: 'approved', role: 'admin' });
    expect((await rows('Community')).json.results.map((c) => c.name)).toEqual(['Grace Chapel']);
    expect((await historyOf(id.ama)).map((h) => Object.keys(h.changed).sort())).toEqual([['email', 'name', 'role', 'status']]);
    const login = await req<{ sessionToken: string }>('POST', '/login', { username: 'ama@example.com', password: 'longenough' }, {});
    expect(login.status).toBe(200);
    who.ama = { 'x-parse-session-token': login.json.sessionToken };
    expect((await call('whoAmI', {}, 'ama')).json.result?.me).toEqual({ id: id.ama, name: 'Ama Owusu', status: 'approved', role: 'admin', blocked: false });
    expect((await call('setUpCommunity', { setup: { ...setup, email: 'two@example.com' } }, 'stranger')).status).toBe(400);
  });

  it('asking to join: a name, an email, 13 or older, nothing else; twice is one member and the same answer; no password', async () => {
    const ask = (join: Record<string, unknown>) => call('askToJoin', { join }, 'stranger');
    const yaw = { name: 'Yaw Asante', email: 'yaw@example.com', over13: true };
    expect(JSON.stringify((await ask({ ...yaw, over13: false })).json)).toContain('13 or older');
    expect(JSON.stringify((await ask({ name: 'Yaw Asante', email: 'yaw@example.com' })).json)).toContain('13 or older');
    expect(JSON.stringify((await ask({ ...yaw, over13: 'yes' })).json)).toContain('13 or older');
    expect(JSON.stringify((await ask({ ...yaw, email: 'yaw at example' })).json)).toContain('email address');
    expect(JSON.stringify((await ask({ ...yaw, name: '  ' })).json)).toContain('Your name');
    expect(JSON.stringify((await ask({ ...yaw, name: 'x'.repeat(81) })).json)).toContain('80 characters');
    expect(await memberByEmail('yaw@example.com')).toEqual([]);

    const first = await ask(yaw);
    expect([first.status, first.json.result]).toEqual([200, { asked: true }]);
    const again = await ask({ ...yaw, name: 'Someone Else', email: 'YAW@example.com' });
    expect([again.status, again.json.result]).toEqual([200, { asked: true }]);
    const [m] = await memberByEmail('yaw@example.com');
    expect(await memberByEmail('yaw@example.com')).toHaveLength(1);
    expect(m).toMatchObject({ name: 'Yaw Asante', status: 'waiting', role: 'member' });
    expect(m.endedAt ?? null).toBeNull();
    id.yaw = m.objectId;
    expect((await historyOf(id.yaw)).map((h) => [h.changed.status.to, h.who.objectId])).toEqual([['waiting', m.login.objectId]]);
    // No password: no password signs in.
    expect((await req('POST', '/login', { username: 'yaw@example.com', password: '' }, {})).status).not.toBe(200);
    expect((await req('POST', '/login', { username: 'yaw@example.com', password: 'longenough' }, {})).status).not.toBe(200);

    for (const [name, email] of [['Abigail Frimpong', 'abigail@example.com'], ['Nana Tetteh', 'nana@example.com']]) {
      expect((await ask({ name, email, over13: true })).status).toBe(200);
      id[email.split('@')[0]] = (await memberByEmail(email))[0].objectId;
    }
  });

  it('🔴 a waiting member signs in by the link, reads only their own member and no post, and lets nobody in', async () => {
    expect(await linkSignIn('yaw', 'yaw@example.com')).toBe('signed-in');
    expect((await call('whoAmI', {}, 'yaw')).json.result?.me).toEqual({ id: id.yaw, name: 'Yaw Asante', status: 'waiting', role: 'member', blocked: false });
    const seen = await rows('Member', {}, who.yaw);
    expect(seen.status).toBe(200);
    expect(seen.json.results.map((r) => r.objectId)).toEqual([id.yaw]);
    expect((await rows('Post', {}, who.yaw)).status).not.toBe(200);
    expect((await call('letIn', { letIn: { memberId: id.nana, appUrl: APP } }, 'yaw')).status).not.toBe(200);
    expect((await call('makeAdmin', { admin: { memberId: id.yaw } }, 'yaw')).status).not.toBe(200);
    expect((await call('letIn', { letIn: { memberId: id.yaw, appUrl: APP } }, 'stranger')).status).not.toBe(200);
  });

  it('an admin lets them in: approved, a member to the policy, told by email with this app’s sign-in page; twice changes nothing', async () => {
    mail.length = 0;
    const r = await call('letIn', { letIn: { memberId: id.yaw, appUrl: `${APP}/` } }, 'ama');
    expect([r.status, r.json.result]).toEqual([200, { emailed: 'yes' }]);
    const [m] = await memberByEmail('yaw@example.com');
    expect(m.status).toBe('approved');
    expect(mail.map((x) => [x.to, x.subject])).toEqual([['yaw@example.com', 'You’re in: Grace Chapel']]);
    expect(mail[0].text).toContain(`${APP}/sign-in`);
    expect(mail[0].text).toContain('Hello Yaw Asante');
    // The same session now reads as a member: every member row, and the posts (none yet).
    expect((await rows('Member', {}, who.yaw)).json.results.map((x) => x.objectId).sort()).toEqual([id.ama, id.yaw, id.abigail, id.nana].sort());
    expect((await rows('Post', {}, who.yaw)).status).toBe(200);
    expect((await call('whoAmI', {}, 'yaw')).json.result?.me).toMatchObject({ status: 'approved', role: 'member' });

    expect((await call('letIn', { letIn: { memberId: id.yaw, appUrl: APP } }, 'ama')).status).toBe(200);
    expect((await historyOf(id.yaw)).map((h) => [h.changed.status.to, h.who.objectId])).toEqual([
      ['waiting', m.login.objectId],
      ['approved', (await memberByEmail('ama@example.com'))[0].login.objectId]
    ]);
    expect(JSON.stringify((await call('letIn', { letIn: { memberId: id.yaw } }, 'ama')).json)).toContain('address');
    expect(JSON.stringify((await call('letIn', { letIn: { memberId: 'nobody' , appUrl: APP } }, 'ama')).json)).toContain('no such member');
  });

  it('with no email service, they are still let in, and the answer says the message didn’t go', async () => {
    expect((await req('PUT', '/admin/email/config', { baseUrl: base, enabled: false, smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' }, fromAddress: 'noreply@test' })).status).toBe(200);
    try {
      mail.length = 0;
      const r = await call('letIn', { letIn: { memberId: id.abigail, appUrl: APP } }, 'ama');
      expect([r.status, r.json.result]).toEqual([200, { emailed: 'no' }]);
      expect(mail).toEqual([]);
      expect((await memberByEmail('abigail@example.com'))[0].status).toBe('approved');
    } finally {
      expect((await req('PUT', '/admin/email/config', { baseUrl: base, enabled: true, smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' }, fromAddress: 'noreply@test' })).status).toBe(200);
    }
  });

  it('"No": a waiting member is blocked with why, never deleted; their sign-in is off: a link is refused when pressed, their session stops', async () => {
    expect(await linkSignIn('nana', 'nana@example.com')).toBe('signed-in');
    expect((await call('whoAmI', {}, 'nana')).status).toBe(200);
    const r = await call('turnAway', { turnAway: { memberId: id.nana } }, 'ama');
    expect([r.status, r.json]).toEqual([200, { result: { id: id.nana } }]);
    const [m] = await memberByEmail('nana@example.com');
    expect(m).toMatchObject({ status: 'waiting', blockedReason: 'Not let in.' });
    expect(m.endedAt).toBeTruthy();
    expect((await historyOf(id.nana)).map((h) => Object.keys(h.changed).sort())).toEqual([['email', 'name', 'role', 'status'], ['blocked', 'blockedReason']]);
    // The backend still mails a link (its answer never says who exists), and refuses it when pressed (BMG-004 R3).
    expect(await linkSignIn('nana2', 'nana@example.com')).toBe('refused: This account is disabled.');
    expect((await call('whoAmI', {}, 'nana')).status).not.toBe(200);
    // Asking again with the same email answers as before, and makes nothing.
    expect((await call('askToJoin', { join: { name: 'Nana Tetteh', email: 'nana@example.com', over13: true } }, 'stranger')).json.result).toEqual({ asked: true });
    expect(await memberByEmail('nana@example.com')).toHaveLength(1);
    // A blocked person can't be let in, and someone who is in isn't turned away here.
    expect(JSON.stringify((await call('letIn', { letIn: { memberId: id.nana, appUrl: APP } }, 'ama')).json)).toContain('blocked');
    expect(JSON.stringify((await call('turnAway', { turnAway: { memberId: id.yaw } }, 'ama')).json)).toContain('in already');
  });

  it('🔴 the policy keeps sign-up closed even with the Sign-in page’s open sign-up switched on: a link reaches nobody new', async () => {
    expect((await req('PUT', '/admin/auth', { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: true }, redirectAllowList: [APP] })).status).toBe(200);
    try {
      expect(await linkSignIn('stranger2', 'stranger@example.com')).toBe('no-mail');
      expect((await req<{ total: number }>('GET', '/admin/users?q=stranger')).json.total).toBe(0);
    } finally {
      expect((await req('PUT', '/admin/auth', { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: false }, redirectAllowList: [APP] })).status).toBe(200);
    }
  });

  it('an admin makes a member an admin, who can then let people in; someone not let in can’t be made one', async () => {
    expect(JSON.stringify((await call('makeAdmin', { admin: { memberId: id.nana } }, 'ama')).json)).toContain('blocked');
    expect((await call('askToJoin', { join: { name: 'Kofi Darko', email: 'kofi@example.com', over13: true } }, 'stranger')).status).toBe(200);
    id.kofi = (await memberByEmail('kofi@example.com'))[0].objectId;
    expect(JSON.stringify((await call('makeAdmin', { admin: { memberId: id.kofi } }, 'ama')).json)).toContain('Let Kofi Darko in first');

    expect((await call('makeAdmin', { admin: { memberId: id.yaw } }, 'ama')).status).toBe(200);
    expect((await memberByEmail('yaw@example.com'))[0].role).toBe('admin');
    expect((await historyOf(id.yaw)).map((h) => Object.keys(h.changed)[0]).slice(-1)).toEqual(['role']);
    // A role is read when a session is made: Yaw signs in again, and lets Kofi in.
    expect(await linkSignIn('yaw', 'yaw@example.com')).toBe('signed-in');
    expect((await call('letIn', { letIn: { memberId: id.kofi, appUrl: APP } }, 'yaw')).json.result).toEqual({ emailed: 'yes' });
    expect((await memberByEmail('kofi@example.com'))[0].status).toBe('approved');
  });
});
