/**
 * P119 SRK-003 — Learn with Simple Rick: the schema and the policy, kept by a locked backend.
 *
 * The schema is not hand-written. `templates/learn-with-simple-rick/docs/world/` is what Richard
 * said about his world (P116; his four rulings of 2026-10-12: never deleted, never moved; one of
 * each; his notes and the alias table hidden from the learner; a history on everything), and
 * `backend/schema.json` is `schemaPushes(projectWorld(…))` byte for byte. Run with
 * `SRK_SCHEMA_WRITE=1` to rewrite it after the world changes.
 *
 * The policy is `templates/learn-with-simple-rick/nodegx.security.json`. What it must keep:
 *
 *   - a learner reads their own Learner row, their conversations, the messages in them and their
 *     progress, and nobody else's, through a path from their own sign-in;
 *   - a learner never reads `notes` or `aliases`, and cannot even filter on them;
 *   - coach notes, objectives, sessions, push subscriptions and every history are Rick's alone;
 *   - nobody writes a row directly, Rick included: every write is a cloud function that writes
 *     the row and its history row together (a history on everything);
 *   - the studio's key acts as Rick: it reads what he reads, notes included, and writes nothing.
 *
 * `SRK_SECURITY=<file>` points the spec at another policy, which is how its mutants are run.
 */
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { projectWorld, schemaPushes, type WorldFiles } from '../../nodegx-project-contract/world';
import { validateSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

const TEMPLATE = path.join(__dirname, '../../../templates/learn-with-simple-rick');
const WORLD = path.join(TEMPLATE, 'docs/world');
const SCHEMA_FILE = path.join(TEMPLATE, 'backend/schema.json');
const SECURITY_FILE = process.env.SRK_SECURITY || path.join(TEMPLATE, 'nodegx.security.json');

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

describe('SRK-003 — the world is the schema', () => {
  it('backend/schema.json is the projection of docs/world/, byte for byte', () => {
    const text = JSON.stringify(pushes, null, 2) + '\n';
    if (process.env.SRK_SCHEMA_WRITE) {
      fs.mkdirSync(path.dirname(SCHEMA_FILE), { recursive: true });
      fs.writeFileSync(SCHEMA_FILE, text);
    }
    expect(fs.readFileSync(SCHEMA_FILE, 'utf8')).toBe(text);
  });

  it('the world asks nothing more: every question it named has Richard’s answer', () => {
    // The eight nouns, and a history for each (his ruling: a history on everything).
    expect(schema.collections.map((c) => c.name).sort()).toEqual(
      ['CoachNote', 'Conversation', 'Learner', 'Message', 'Objective', 'Progress', 'PushSubscription', 'Session']
        .flatMap((n) => [n, `${n}History`])
        .sort()
    );
  });

  it('the policy names every collection the world makes, and no other', () => {
    expect(validateSecurityConfig(security)).toEqual([]);
    expect(Object.keys(security.collections).sort()).toEqual(schema.collections.map((c) => c.name).sort());
  });

  it('the policy carries every rule the world says the store keeps on a write (a link never moves)', () => {
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

describe('SRK-003 — the policy, kept by a locked backend', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const admin = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
    request<T>(base, method, p, { body, headers });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const at = { __type: 'Date', iso: '2026-10-12T09:00:00.000Z' };

  const session: Record<string, Record<string, string>> = {};
  const userId: Record<string, string> = {};
  const id: Record<string, string> = {};
  let studio: Record<string, string>;

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
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-srk003-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'srk003', backendName: 'SRK-003', authToken: 't0k' });
    base = (await service.start()).listen.url;

    for (const push of pushes) {
      const r = await req('POST', '/admin/schema', push);
      if (r.status !== 200) throw new Error(`${push.table}: ${r.status} ${JSON.stringify(r.json)}`);
    }
    expect((await req('POST', '/admin/roles', { name: 'staff' })).status).toBe(201);
    for (const name of ['rick', 'ann', 'bob']) {
      const made = await req<{ objectId: string }>('POST', '/admin/users', {
        username: name,
        email: `${name}@example.com`,
        password: `pw-${name}`,
        ...(name === 'rick' ? { roles: ['staff'] } : {})
      });
      expect(made.status).toBe(201);
      userId[name] = made.json.objectId;
      const login = await req<{ sessionToken: string }>('POST', '/login', { username: name, password: `pw-${name}` }, {});
      session[name] = { 'x-parse-session-token': login.json.sessionToken };
    }

    // Two learners, each with a conversation, a message, a progress, a push subscription;
    // Rick's notes, objective and session on ann; one history row.
    for (const who of ['ann', 'bob']) {
      await make('Learner', who, {
        name: who,
        email: `${who}@example.com`,
        language: 'en',
        prefs: { theme: 'winter' },
        aliases: { [who]: 'Learner A' },
        notes: `${who} is a bit of a pain`,
        login: ptr('_User', userId[who])
      });
      await make('Conversation', `${who}.conv`, { title: `${who}'s lesson`, kind: 'lesson', state: 'open', run: 1, learner: ptr('Learner', id[who]) });
      await make('Message', `${who}.msg`, { run: 1, seq: 1, from: 'rick', origin: 'cut', kind: 'clip', body: 'Watch this.', conversation: ptr('Conversation', id[`${who}.conv`]) });
      await make('Progress', `${who}.progress`, { run: 1, lastSeq: 1, conversation: ptr('Conversation', id[`${who}.conv`]) });
      await make('PushSubscription', `${who}.push`, { endpoint: `https://push.example/${who}`, learner: ptr('Learner', id[who]) });
    }
    await make('Conversation', 'ann.next', {
      title: 'Before next time',
      kind: 'follow-up',
      state: 'open',
      run: 1,
      learner: ptr('Learner', id.ann),
      parent: ptr('Conversation', id['ann.conv'])
    });
    await make('CoachNote', 'ann.note', { text: 'Rushes the paste.', on: at, learner: ptr('Learner', id.ann), conversation: ptr('Conversation', id['ann.conv']) });
    await make('Objective', 'ann.objective', { text: 'Ships her first scheduled task.', setOn: at, learner: ptr('Learner', id.ann) });
    await make('Session', 'ann.session', { at, predicted: 'She will skip the paste.', learner: ptr('Learner', id.ann) });
    await make('LearnerHistory', 'ann.history', { learner: ptr('Learner', id.ann), at, who: ptr('_User', userId.rick), changed: { notes: [null, 'x'] } });

    const key = await req<{ secret: string }>('POST', '/admin/keys', {
      name: 'The studio',
      scopes: ['classes:read', 'functions:publishThread', 'functions:appendMessages'],
      actsAsUserId: userId.rick
    });
    expect(key.status).toBe(201);
    studio = { authorization: `Bearer ${key.json.secret}` };
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('a learner', () => {
    it('reads their own Learner row and nobody else’s', async () => {
      const ann = await find('Learner', session.ann);
      expect(ann.status).toBe(200);
      expect(ids(ann)).toEqual(named('ann'));
      expect((await req('GET', `/classes/Learner/${id.bob}`, undefined, session.ann)).status).toBe(404);
    });

    it('🔴 never receives Rick’s notes on them, or the alias table', async () => {
      const row = (await find('Learner', session.ann)).json.results[0];
      expect(row.name).toBe('ann');
      expect(row.prefs).toEqual({ theme: 'winter' });
      expect(row).not.toHaveProperty('notes');
      expect(row).not.toHaveProperty('aliases');
      const one = await req<Record<string, unknown>>('GET', `/classes/Learner/${id.ann}`, undefined, session.ann);
      expect(one.json).not.toHaveProperty('notes');
    });

    it('🔴 cannot find out what the notes say by filtering on them', async () => {
      const probe = await find('Learner', session.ann, `?where=${encodeURIComponent(JSON.stringify({ notes: { $regex: 'pain' } }))}`);
      expect(probe.status).toBeGreaterThanOrEqual(400);
      expect(JSON.stringify(probe.json)).toMatch(/notes/);
    });

    it('reads their conversations, the messages in them and their progress, and nobody else’s', async () => {
      expect(ids(await find('Conversation', session.ann))).toEqual(named('ann.conv', 'ann.next'));
      expect(ids(await find('Message', session.ann))).toEqual(named('ann.msg'));
      expect(ids(await find('Progress', session.ann))).toEqual(named('ann.progress'));
      expect(ids(await find('Conversation', session.bob))).toEqual(named('bob.conv'));
      expect((await req('GET', `/classes/Message/${id['bob.msg']}`, undefined, session.ann)).status).toBe(404);
    });

    it('🔴 sees none of Rick’s notes, objectives, sessions, the push subscriptions or any history', async () => {
      for (const c of ['CoachNote', 'Objective', 'Session', 'PushSubscription', 'LearnerHistory', 'MessageHistory']) {
        const r = await find(c, session.ann);
        expect([c, r.status]).toEqual([c, 403]);
      }
    });

    it('🔴 writes nothing directly: not a message from Rick, not their prefs, not a delete', async () => {
      const forged = await req('POST', '/classes/Message', { from: 'rick', kind: 'text', body: 'You passed.', conversation: ptr('Conversation', id['ann.conv']) }, session.ann);
      expect(forged.status).toBe(403);
      expect((await req('PUT', `/classes/Learner/${id.ann}`, { prefs: { theme: 'halloween' } }, session.ann)).status).toBe(403);
      expect((await req('DELETE', `/classes/Conversation/${id['ann.conv']}`, undefined, session.ann)).status).toBe(403);
      expect((await req('POST', '/users', { username: 'eve', password: 'pw' }, {})).status).toBe(403);
    });
  });

  describe('Rick', () => {
    it('reads every learner, with his notes and the alias table', async () => {
      const all = await find('Learner', session.rick);
      expect(ids(all)).toEqual(named('ann', 'bob'));
      expect(all.json.results.find((r) => r.objectId === id.ann)!.notes).toBe('ann is a bit of a pain');
      expect(all.json.results.find((r) => r.objectId === id.ann)!.aliases).toEqual({ ann: 'Learner A' });
    });

    it('reads everything that is his alone', async () => {
      expect(ids(await find('CoachNote', session.rick))).toEqual(named('ann.note'));
      expect(ids(await find('Objective', session.rick))).toEqual(named('ann.objective'));
      expect(ids(await find('Session', session.rick))).toEqual(named('ann.session'));
      expect(ids(await find('LearnerHistory', session.rick))).toEqual(named('ann.history'));
      expect(ids(await find('Message', session.rick))).toEqual(named('ann.msg', 'bob.msg'));
    });

    it('🔴 writes nothing directly either: a write without its history row is not allowed', async () => {
      expect((await req('POST', '/classes/CoachNote', { text: 'x', learner: ptr('Learner', id.ann) }, session.rick)).status).toBe(403);
      expect((await req('PUT', `/classes/Learner/${id.ann}`, { notes: 'changed' }, session.rick)).status).toBe(403);
      expect((await req('DELETE', `/classes/Learner/${id.bob}`, undefined, session.rick)).status).toBe(403);
    });
  });

  describe('the studio’s key, acting as Rick', () => {
    it('reads what Rick reads, notes included', async () => {
      const all = await find('Learner', studio);
      expect(all.status).toBe(200);
      expect(ids(all)).toEqual(named('ann', 'bob'));
      expect(all.json.results.find((r) => r.objectId === id.bob)!.notes).toBe('bob is a bit of a pain');
    });

    it('🔴 writes no row directly', async () => {
      expect((await req('POST', '/classes/Message', { from: 'rick', kind: 'text', body: 'x', conversation: ptr('Conversation', id['ann.conv']) }, studio)).status).toBe(403);
    });
  });

  it('🔴 an anonymous caller gets nothing', async () => {
    for (const c of ['Learner', 'Conversation', 'Message']) {
      const r = await find(c, {});
      expect([c, r.status]).toEqual([c, 403]);
    }
  });
});

describe('SRK-003 — the template’s own setup tools, on an empty backend', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const admin = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
    request<T>(base, method, p, { body, headers });
  const tool = (name: string, ...args: string[]) =>
    new Promise<{ code: number; out: string }>((resolve) => {
      execFile(process.execPath, [path.join(TEMPLATE, 'tools', name), '--backend', base, '--token', 't0k', ...args], (err, stdout, stderr) =>
        resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, out: stdout + stderr })
      );
    });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-srk003-tools-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'srk003t', backendName: 'SRK-003 tools', authToken: 't0k' });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('setup-backend puts the collections, the policy, Rick and sign-in by code in place', async () => {
    const run = await tool('setup-backend.mjs', '--rick', 'rick@example.com');
    expect([run.code, run.out]).toEqual([0, expect.stringMatching(/16 collections/)]);

    const tables = (await req<{ tables: Array<{ name: string }> }>('GET', '/admin/schema')).json.tables.map((t) => t.name);
    for (const push of pushes) expect(tables).toContain(push.table);
    const live = (await req<{ config: { collections: Record<string, unknown> }; enforced: boolean }>('GET', '/admin/permissions')).json;
    expect(live.config.collections).toEqual(security.collections);
    expect(live.enforced).toBe(true);
    const roles = (await req<{ roles: Array<{ name: string; users: string[] }> }>('GET', '/admin/roles')).json.roles;
    expect(roles.find((r) => r.name === 'staff')!.users).toHaveLength(1);
    const auth = (await req<{ config: { emailCode: Record<string, unknown>; magicLink: Record<string, unknown> } }>('GET', '/admin/auth')).json.config;
    expect(auth.emailCode).toEqual(expect.objectContaining({ enabled: true, allowSignup: false, ttlMinutes: 10 }));
    expect(auth.magicLink).toEqual(expect.objectContaining({ enabled: false }));
  });

  it('🔴 setup-backend refuses a backend that already has them', async () => {
    const again = await tool('setup-backend.mjs', '--rick', 'rick@example.com');
    expect([again.code, again.out]).toEqual([1, expect.stringMatching(/REFUSED/)]);
  });

  it('setup-studio-key mints a key bound to Rick, and refuses anyone who is not staff', async () => {
    const minted = await tool('setup-studio-key.mjs', '--as', 'rick@example.com');
    expect([minted.code, minted.out]).toEqual([0, expect.stringMatching(/NODEGX_STUDIO_KEY=\S+/)]);
    const secret = /NODEGX_STUDIO_KEY=(\S+)/.exec(minted.out)![1];
    expect((await req('GET', '/classes/Learner', undefined, { authorization: `Bearer ${secret}` })).status).toBe(200);

    expect((await req('POST', '/admin/users', { username: 'ann@example.com', email: 'ann@example.com' })).status).toBe(201);
    const refused = await tool('setup-studio-key.mjs', '--as', 'ann@example.com');
    expect([refused.code, refused.out]).toEqual([1, expect.stringMatching(/not staff/)]);
  });
});
