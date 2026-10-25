/**
 * P119-S2-LIVEPATH — a collection read through a path rule streams live, to exactly the people its query shows.
 *
 * Learn with Simple Rick is a chat: a learner reads the messages of their own conversations, a path from their
 * sign-in (Learner by `login` → Conversation by `learner` → Message by `conversation`). The hub refused any
 * subscription on a collection read through a path (or `creator`) rule, so when Rick replied the open thread did not
 * change until it refetched. Now the subscription is accepted, and a change is delivered only when the subscriber's
 * own query, narrowed by its rule, returns that row — the same SQL as `/classes`, so the stream cannot show a row a
 * query hides. A delete (the row is gone, so no query can answer) is confirmed from the record as it was, through the
 * rule's last link; where that cannot be read, the subscriber is told to re-query (`resync`) rather than guessed at.
 *
 * Over real sockets, on a LOCKED backend.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ChangeBus } from '../src/realtime/ChangeBus';
import { RealtimeHub, type HubSecurity, type SubscriptionResult } from '../src/realtime/RealtimeHub';
import type { Principal } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';
import { openStream, type SseHandle } from './helpers/sse';

jest.setTimeout(60000);

const THEIR_MESSAGES = {
  path: {
    hops: [
      { from: 'Learner', by: 'login' },
      { from: 'Conversation', by: 'learner' },
      { from: 'Message', by: 'conversation' }
    ],
    maxDepth: 3
  }
};

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: {
      find: 'authenticated',
      get: 'authenticated',
      create: 'authenticated',
      update: 'authenticated',
      delete: 'authenticated'
    },
    creatorOwns: false
  },
  collections: {
    Message: { permissions: { find: THEIR_MESSAGES, get: THEIR_MESSAGES, create: 'nobody', update: 'nobody', delete: 'nobody' } },
    Note: { permissions: { find: 'creator', get: 'creator', create: 'authenticated', update: 'creator', delete: 'creator' } }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

interface Signup {
  objectId: string;
  sessionToken: string;
}

describe('P119-S2-LIVEPATH — live updates follow a path rule', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const admin = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
    request<T>(base, method, p, { body, headers });
  const asUser = (u: Signup) => ({ 'x-parse-session-token': u.sessionToken });
  const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
  const users: Record<string, Signup> = {};
  const conversation: Record<string, string> = {};

  const make = async (collection: string, data: Record<string, unknown>, headers = admin): Promise<string> => {
    const r = await req<{ objectId: string }>('POST', `/classes/${collection}`, data, headers);
    expect([200, 201]).toContain(r.status);
    return r.json.objectId;
  };
  const say = (who: string, text: string) => make('Message', { conversation: ptr('Conversation', conversation[who]), text });

  /** A stream as `who`, subscribed to `collection`; the subscription answer beside it. */
  async function live(who: string, collection: string): Promise<{ stream: SseHandle; sub: SubscriptionResult }> {
    const stream = await openStream(base, asUser(users[who]));
    const { data } = await stream.waitFor('connected');
    const r = await req<SubscriptionResult>(
      'POST',
      '/realtime/subscriptions',
      { clientId: data.clientId, subscriptions: [{ collection }] },
      asUser(users[who])
    );
    expect(r.status).toBe(200);
    return { stream, sub: r.json };
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-p119-livepath-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'p119-livepath', backendName: 'P119 live path', authToken: 't0k' });
    base = (await service.start()).listen.url;

    for (const name of ['ada', 'bea']) {
      const r = await req<Signup>('POST', '/users', { username: name, password: `pw-${name}-123` }, {});
      expect(r.status).toBe(201);
      users[name] = r.json;
    }
    const table = (name: string, columns: unknown[]) =>
      req('POST', '/admin/schema', { action: 'createTable', table: name, columns });
    expect((await table('Learner', [{ name: 'login', type: 'Pointer', targetClass: '_User' }])).status).toBe(200);
    expect((await table('Conversation', [{ name: 'learner', type: 'Pointer', targetClass: 'Learner' }])).status).toBe(200);
    expect(
      (
        await table('Message', [
          { name: 'conversation', type: 'Pointer', targetClass: 'Conversation' },
          { name: 'text', type: 'String' }
        ])
      ).status
    ).toBe(200);
    for (const name of ['ada', 'bea']) {
      const learner = await make('Learner', { login: ptr('_User', users[name].objectId) });
      conversation[name] = await make('Conversation', { learner: ptr('Learner', learner) });
    }
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('a learner subscribing to the messages of their own conversations is accepted', async () => {
    const { stream, sub } = await live('ada', 'Message');
    stream.close();
    expect(sub.rejected).toEqual([]);
    expect(sub.accepted.map((s) => s.collection)).toEqual(['Message']);
  });

  it("Rick's reply in her conversation arrives live; a reply in someone else's never does", async () => {
    const { stream } = await live('ada', 'Message');
    const theirs = await say('bea', 'for bea only');
    const mine = await say('ada', 'Rick replied to ada');
    // The known-firing signal beside the absence: ada's own reply arrived, after bea's was written.
    const frame = await stream.waitFor('change', (d) => d.action === 'create' && d.record.objectId === mine);
    expect(frame.data.record.text).toBe('Rick replied to ada');
    expect(stream.changes().map((f) => f.data.record.objectId)).not.toContain(theirs);
    stream.close();
  });

  it('the same row, as the query shows it: bea’s query and bea’s stream agree', async () => {
    const { stream } = await live('bea', 'Message');
    const toAda = await say('ada', 'not for bea');
    const toBea = await say('bea', 'for bea');
    await stream.waitFor('change', (d) => d.record.objectId === toBea);
    const delivered = stream.changes().map((f) => f.data.record.objectId);
    const found = await req<{ results: Array<{ objectId: string }> }>('GET', '/classes/Message', undefined, asUser(users.bea));
    const queried = found.json.results.map((r) => r.objectId);
    expect(queried).toContain(toBea);
    expect(queried).not.toContain(toAda);
    expect(delivered).not.toContain(toAda);
    stream.close();
  });

  it('an edit and a delete in her conversation arrive; a delete in someone else’s does not', async () => {
    const mine = await say('ada', 'draft');
    const theirs = await say('bea', 'bea draft');
    const { stream } = await live('ada', 'Message');
    expect((await req('PUT', `/classes/Message/${mine}`, { text: 'edited' })).status).toBe(200);
    const edit = await stream.waitFor('change', (d) => d.action === 'update' && d.record.objectId === mine);
    expect(edit.data.record.text).toBe('edited');
    expect((await req('DELETE', `/classes/Message/${theirs}`)).status).toBe(200);
    expect((await req('DELETE', `/classes/Message/${mine}`)).status).toBe(200);
    await stream.waitFor('change', (d) => d.action === 'delete' && d.record.objectId === mine);
    expect(stream.changes().map((f) => f.data.record.objectId)).not.toContain(theirs);
    expect(stream.frames.filter((f) => f.event === 'resync')).toEqual([]);
    stream.close();
  });

  it('a "creator" rule streams the person’s own rows only, deletes included', async () => {
    const { stream, sub } = await live('ada', 'Note');
    expect(sub.rejected).toEqual([]);
    const theirs = await make('Note', { text: 'bea note' }, asUser(users.bea));
    const mine = await make('Note', { text: 'ada note' }, asUser(users.ada));
    await stream.waitFor('change', (d) => d.action === 'create' && d.record.objectId === mine);
    expect((await req('DELETE', `/classes/Note/${theirs}`, undefined, asUser(users.bea))).status).toBe(200);
    expect((await req('DELETE', `/classes/Note/${mine}`, undefined, asUser(users.ada))).status).toBe(200);
    await stream.waitFor('change', (d) => d.action === 'delete' && d.record.objectId === mine);
    expect(stream.changes().map((f) => f.data.record.objectId)).not.toContain(theirs);
    stream.close();
  });
});

/**
 * The hub alone, with a stand-in `confirm`: what HTTP cannot pin — order when confirmations finish out of order, a
 * confirmation that fails, a delete the record cannot answer, and a hub with no way to ask.
 */
describe('P119-S2-LIVEPATH — the hub', () => {
  type Raw = { type: 'create' | 'save' | 'delete'; id: string; collection: string; object?: Record<string, unknown> };
  function bus() {
    const listeners: Record<string, Array<(p: Raw) => void>> = {};
    const adapter = {
      on: (ev: string, h: (p: Raw) => void) => void (listeners[ev] ||= []).push(h),
      off: () => undefined,
      emit: (ev: Raw['type'], object: Record<string, unknown>, collection = 'Message') =>
        (listeners[ev] || []).forEach((h) => h({ type: ev, id: String(object.objectId), collection, object }))
    };
    return { adapter, bus: new ChangeBus(adapter) };
  }
  function res() {
    const raw: string[] = [];
    return {
      writeHead: () => undefined,
      write: (chunk: string) => (raw.push(chunk), true),
      end: () => undefined,
      on: () => undefined,
      frames: () =>
        raw
          .filter((c) => !c.startsWith(':'))
          .map((c) => {
            const event = /event: (\w+)/.exec(c)?.[1];
            const data = JSON.parse(/data: (.*)/.exec(c)?.[1] ?? 'null');
            return { event, data };
          })
          .filter((f) => f.event !== 'connected')
    };
  }
  // As `pathRuleWhere` compiles the rule for ada.
  const ADA = { collection: '_User', where: { objectId: 'ada' } };
  const narrow = { $path: { from: ADA, ...THEIR_MESSAGES.path } };
  const narrowing: HubSecurity = { devOpenActive: false, checkClp: () => ({ allowed: true, reason: 'ok', narrow }) };
  const ada: Principal = { kind: 'user', userId: 'ada', roles: [] };
  const tick = () => new Promise((r) => setTimeout(r, 20));

  it('frames leave in the order their changes happened, though the first confirmation finishes last', async () => {
    const { adapter, bus: b } = bus();
    const slow = new Set(['m1']);
    const hub = new RealtimeHub(b, narrowing, {
      heartbeatMs: 0,
      confirm: (_p, _c, _n, id) => new Promise((r) => setTimeout(() => r(true), slow.has(id) ? 15 : 0))
    });
    const out = res();
    hub.setSubscriptions(hub.addConnection(out, ada)!, [{ collection: 'Message' }]);
    adapter.emit('create', { objectId: 'm1' });
    adapter.emit('create', { objectId: 'm2' });
    await tick();
    expect(out.frames().map((f) => f.data.record.objectId)).toEqual(['m1', 'm2']);
    hub.close();
  });

  it('a confirmation that fails sends "re-query", never the row', async () => {
    const { adapter, bus: b } = bus();
    const hub = new RealtimeHub(b, narrowing, { heartbeatMs: 0, confirm: () => Promise.reject(new Error('database busy')) });
    const out = res();
    hub.setSubscriptions(hub.addConnection(out, ada)!, [{ collection: 'Message' }]);
    adapter.emit('create', { objectId: 'm1', text: 'secret' });
    await tick();
    expect(out.frames()).toEqual([{ event: 'resync', data: { reason: 'unconfirmed' } }]);
    hub.close();
  });

  it('a delete is confirmed one link back, on the row its link names', async () => {
    const { adapter, bus: b } = bus();
    const asked: unknown[] = [];
    const hub = new RealtimeHub(b, narrowing, {
      heartbeatMs: 0,
      confirm: async (_p, collection, n, id) => (asked.push({ collection, n, id }), id === 'c-ada')
    });
    const out = res();
    hub.setSubscriptions(hub.addConnection(out, ada)!, [{ collection: 'Message' }]);
    adapter.emit('delete', { objectId: 'm1', conversation: { __type: 'Pointer', className: 'Conversation', objectId: 'c-ada' } });
    adapter.emit('delete', { objectId: 'm2', conversation: { __type: 'Pointer', className: 'Conversation', objectId: 'c-bea' } });
    adapter.emit('delete', { objectId: 'm3' });
    await tick();
    expect(out.frames().map((f) => [f.event, f.data.record?.objectId])).toEqual([['change', 'm1']]);
    expect(asked[0]).toEqual({
      collection: 'Conversation',
      n: { $path: { from: ADA, hops: THEIR_MESSAGES.path.hops.slice(0, -1), maxDepth: 2 } },
      id: 'c-ada'
    });
    hub.close();
  });

  it('a delete the record cannot answer (the last link followed forwards) asks the subscriber to re-query', async () => {
    const { adapter, bus: b } = bus();
    const forwards = { $path: { from: { collection: '_User', where: { objectId: 'ada' } }, hops: [{ follow: 'profile', to: 'Message' }], maxDepth: 1 } };
    const security: HubSecurity = { devOpenActive: false, checkClp: () => ({ allowed: true, reason: 'ok', narrow: forwards }) };
    const hub = new RealtimeHub(b, security, { heartbeatMs: 0, confirm: async () => false });
    const out = res();
    hub.setSubscriptions(hub.addConnection(out, ada)!, [{ collection: 'Message' }]);
    adapter.emit('delete', { objectId: 'm1', text: 'secret' });
    await tick();
    expect(out.frames()).toEqual([{ event: 'resync', data: { reason: 'unconfirmed' } }]);
    hub.close();
  });

  it('a hub with no way to ask still refuses the subscription by name', () => {
    const hub = new RealtimeHub(bus().bus, narrowing, { heartbeatMs: 0 });
    const result = hub.setSubscriptions(hub.addConnection(res(), ada)!, [{ collection: 'Message' }]);
    expect(result!.accepted).toEqual([]);
    expect(result!.rejected[0].reason).toMatch(/live updates cannot follow that yet/);
    hub.close();
  });
});
