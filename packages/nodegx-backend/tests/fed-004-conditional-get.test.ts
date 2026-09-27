/**
 * FED-004 §3.2 / §3.3 — conditional GET, and a name on the door.
 *
 * Driven end to end because every half of it is somewhere else: the `Conditional`
 * port is on a node in `@noodl/runtime`, the memory behind it is a system table
 * in this package, the seam between them is `NodeRunContext`, and the thing that
 * decides whether any of it worked is a THIRD PARTY — a server that honours
 * `If-None-Match`. No unit can hold all four.
 *
 * The fixture is a real `node:http` server that keeps a request log, so §3.3's
 * acceptance criterion ("the fixture's request log shows a User-Agent starting
 * NodeGX/") is read off the wire rather than off the node's intentions.
 *
 * ## Three URLs, three behaviours
 *
 *   /etag      issues an `ETag` and answers 304 to a matching `If-None-Match` — the feed host
 *   /modified  issues `Last-Modified` only, and answers 304 to `If-Modified-Since`
 *   /ignores   issues NEITHER validator and always answers 200 — AC5's "nothing breaks"
 *
 * ⚠️ Every fixture graph wires `Failure` as well as `Done` and `Not Modified`, for register R1's
 * reason: a function whose graph has an unreachable Response node does not fail, it HANGS for the
 * whole function timeout. A spec that wires only the path it expects reports a 30-second red
 * that says nothing about which port fired.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { HTTP_CACHE_COLLECTION, hashUrl, HttpCacheStore } from '../src/persistence/HttpCacheStore';
import { effectiveRule, isSystemCollection } from '../src/security/model';
import type { SecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';

import { httpClient } from './helpers/http';

jest.setTimeout(40000);

/**
 * One fetch, answering with the status and which port fired.
 *
 * `outcome` is a literal on the Response node's parameters per branch, which is the only way to
 * tell `Done` from `Not Modified` from out here: both answer 200 to the caller, and the
 * difference is entirely in which wire carried the pulse.
 */
function conditionalFunction(name: string, url: string, conditional: boolean) {
  return {
    name: `/#__cloud__/${name}`,
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true }, ports: [], children: [] },
      {
        id: 'http',
        type: 'net.noodl.HTTP',
        x: 0,
        y: 100,
        parameters: { url, method: 'GET', conditional, responseType: 'text' },
        ports: [],
        children: []
      },
      {
        id: 'ok',
        type: 'noodl.cloud.response',
        x: 0,
        y: 200,
        parameters: { params: 'outcome,body', 'pm-outcome': 'done' },
        ports: [],
        children: []
      },
      {
        id: 'nm',
        type: 'noodl.cloud.response',
        x: 200,
        y: 200,
        parameters: { params: 'outcome', 'pm-outcome': 'not-modified' },
        ports: [],
        children: []
      },
      {
        id: 'bad',
        type: 'noodl.cloud.response',
        x: 400,
        y: 200,
        parameters: { params: 'outcome', 'pm-outcome': 'failure' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'receive', targetId: 'http', targetPort: 'fetch' },
      { sourceId: 'http', sourcePort: 'response', targetId: 'ok', targetPort: 'pm-body' },
      { sourceId: 'http', sourcePort: 'done', targetId: 'ok', targetPort: 'send' },
      { sourceId: 'http', sourcePort: 'notModified', targetId: 'nm', targetPort: 'send' },
      // R1: the failure path is wired so a red says which port fired instead of timing out.
      { sourceId: 'http', sourcePort: 'failure', targetId: 'bad', targetPort: 'send' }
    ],
    roots: []
  };
}

/** A graph that sets its own `User-Agent`, to prove the host's is a default and not an override. */
function ownUserAgentFunction(url: string) {
  return {
    name: '/#__cloud__/ownAgent',
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true }, ports: [], children: [] },
      {
        id: 'http',
        type: 'net.noodl.HTTP',
        x: 0,
        y: 100,
        parameters: {
          url,
          method: 'GET',
          responseType: 'text',
          headers: 'User-Agent',
          'header-User-Agent': 'FeedBot/9.9 (+https://example.test)'
        },
        ports: [],
        children: []
      },
      {
        id: 'ok',
        type: 'noodl.cloud.response',
        x: 0,
        y: 200,
        parameters: { params: 'outcome', 'pm-outcome': 'done' },
        ports: [],
        children: []
      },
      {
        id: 'bad',
        type: 'noodl.cloud.response',
        x: 200,
        y: 200,
        parameters: { params: 'outcome', 'pm-outcome': 'failure' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'receive', targetId: 'http', targetPort: 'fetch' },
      { sourceId: 'http', sourcePort: 'done', targetId: 'ok', targetPort: 'send' },
      { sourceId: 'http', sourcePort: 'failure', targetId: 'bad', targetPort: 'send' }
    ],
    roots: []
  };
}

interface Hit {
  url: string;
  ifNoneMatch?: string;
  ifModifiedSince?: string;
  userAgent?: string;
}

interface Answer {
  result?: { outcome?: string; body?: string };
}

const ETAG = '"feed-v1"';
const LAST_MODIFIED = 'Wed, 18 Mar 2026 09:00:00 GMT';

describe('FED-004 conditional GET and the outbound User-Agent', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let upstream: http.Server;
  let adminToken: string;
  const hits: Hit[] = [];

  const client = httpClient(() => base);

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      const url = String(req.url);
      hits.push({
        url,
        ifNoneMatch: req.headers['if-none-match'] as string | undefined,
        ifModifiedSince: req.headers['if-modified-since'] as string | undefined,
        userAgent: req.headers['user-agent'] as string | undefined
      });

      if (url === '/etag') {
        res.setHeader('etag', ETAG);
        if (req.headers['if-none-match'] === ETAG) {
          // A real 304: no body, and the validator repeated, as RFC 9110 asks.
          res.writeHead(304);
          res.end();
          return;
        }
        res.writeHead(200, { 'content-type': 'application/xml' });
        res.end('<rss>one</rss>');
        return;
      }

      if (url === '/modified') {
        res.setHeader('last-modified', LAST_MODIFIED);
        if (req.headers['if-modified-since'] === LAST_MODIFIED) {
          res.writeHead(304);
          res.end();
          return;
        }
        res.writeHead(200, { 'content-type': 'application/xml' });
        res.end('<rss>two</rss>');
        return;
      }

      // AC5: a server that issues no validators and honours none.
      res.writeHead(200, { 'content-type': 'application/xml' });
      res.end('<rss>always</rss>');
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const up = `http://127.0.0.1:${(upstream.address() as { port: number }).port}`;

    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-fed004c-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'main.workflow.json'),
      JSON.stringify({
        components: [
          conditionalFunction('pollEtag', `${up}/etag`, true),
          conditionalFunction('pollModified', `${up}/modified`, true),
          conditionalFunction('pollIgnores', `${up}/ignores`, true),
          conditionalFunction('pollPlain', `${up}/etag?plain=1`, false),
          ownUserAgentFunction(`${up}/ignores`)
        ],
        settings: {},
        metadata: {}
      })
    );

    service = new BackendService({ dataDir, port: 0, backendId: 'fed004c', backendName: 'FED-004 conditional' });
    base = (await service.start()).listen.url;
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;

    // §3.3's parenthetical comes from the configured public origin. Set here so the header the
    // fixture logs is the whole shape, not just the product token.
    const res = await client.request('PUT', '/admin/email/config', {
      body: { baseUrl: 'https://feeds.example.test' },
      headers: { authorization: `Bearer ${adminToken}` }
    });
    expect([200, 204]).toContain(res.status);
  });

  afterAll(async () => {
    await service.stop();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const call = (name: string) => client.request<Answer>('POST', `/functions/${name}`, { body: {} });
  const hitsFor = (url: string) => hits.filter((h) => h.url === url);

  it('AC4 ETag: the first fetch is Done, the second sends If-None-Match and fires Not Modified', async () => {
    const first = await call('pollEtag');
    expect(first.status).toBe(200);
    expect(first.json.result!.outcome).toBe('done');
    expect(first.json.result!.body).toBe('<rss>one</rss>');

    const second = await call('pollEtag');
    expect(second.status).toBe(200);
    // Not `done`, not `failure` — the 304 is intercepted before `response.ok` is consulted,
    // which is what stops a working conditional request reading as an error status.
    expect(second.json.result!.outcome).toBe('not-modified');

    const log = hitsFor('/etag');
    expect(log.length).toBe(2);
    // The first request carried no validator — it had nothing to carry.
    expect(log[0].ifNoneMatch).toBeUndefined();
    // "the fixture's request log shows the second request carried the header"
    expect(log[1].ifNoneMatch).toBe(ETAG);
  });

  it('AC4 the `_HttpCache` row exists, keyed by the URL hash and never the URL', async () => {
    const facade = (service as unknown as { facade: ConstructorParameters<typeof HttpCacheStore>[0] }).facade;
    const { results } = await facade.rawQuery(HTTP_CACHE_COLLECTION, { limit: 100 });
    expect(results.length).toBeGreaterThan(0);

    const row = results.find((r) => (r as { etag?: string }).etag === ETAG) as Record<string, string> | undefined;
    expect(row).toBeDefined();
    // The key is a SHA-256 of the FULL url: a long query string, and the credential people so
    // often put in one, never reach this table in the clear.
    expect(row!.urlHash).toMatch(/^[0-9a-f]{64}$/);
    // The `url` column beside it is the truncated, query-stripped copy an operator reads. It is
    // not the key and is never read back — pinned here because the two are easy to confuse.
    expect(row!.url).toContain('/etag');
    expect(row!.url).not.toContain('?');
    expect(hashUrl(row!.url)).toBe(row!.urlHash); // this URL had no query string to strip
    expect(await new HttpCacheStore(facade).read(row!.url)).toMatchObject({ etag: ETAG });
  });

  /**
   * §3.2: "system-owned, never exposed as a collection".
   *
   * 🔴 **Measured, and the first two readings were both wrong.** An ADMIN token reads
   * `/api/_HttpCache` and gets 200 — the supervisor credential bypasses CLPs by design. So does
   * an ANONYMOUS caller here, and that is not this table: `security.json`'s default posture is
   * `devOpen: true`, and `devOpenActive` (dev-open on a loopback bind) returns `undefined` from
   * `aclFor` for every collection there is. A deploy refuses to start with it on.
   *
   * What the sentence in §3.2 actually claims, then, is about the RULE — and the rule is
   * `effectiveRule`, which `isSystemCollection` short-circuits to `nobody` before it reads a
   * single line of config. `_User` sits beside it as the control: this table is exactly as
   * exposed as the password table, which is the whole of the claim.
   */
  it('AC4 `_HttpCache` carries the same `nobody` CLP as `_User`, config or no config', () => {
    const config = (service as unknown as { security: { config: SecurityConfig } }).security.config;
    for (const op of ['find', 'get', 'create', 'update', 'delete'] as const) {
      expect(effectiveRule(config, HTTP_CACHE_COLLECTION, op)).toBe('nobody');
      expect(effectiveRule(config, '_User', op)).toBe('nobody');
    }
    expect(isSystemCollection(HTTP_CACHE_COLLECTION)).toBe(true);
  });

  it('AC4 Last-Modified alone works the same way, through If-Modified-Since', async () => {
    expect((await call('pollModified')).json.result!.outcome).toBe('done');
    expect((await call('pollModified')).json.result!.outcome).toBe('not-modified');

    const log = hitsFor('/modified');
    expect(log.length).toBe(2);
    expect(log[1].ifModifiedSince).toBe(LAST_MODIFIED);
    expect(log[1].ifNoneMatch).toBeUndefined();
  });

  it('AC5 a fixture that issues no validators: both calls are Done, and nothing breaks', async () => {
    expect((await call('pollIgnores')).json.result!.outcome).toBe('done');
    expect((await call('pollIgnores')).json.result!.outcome).toBe('done');

    const log = hitsFor('/ignores');
    expect(log.length).toBe(2);
    // No row was written, so the second request had nothing to send: a server that issues
    // neither validator is told once and not asked again.
    expect(log[1].ifNoneMatch).toBeUndefined();
    expect(log[1].ifModifiedSince).toBeUndefined();
  });

  it('Conditional off is the request this node has always sent — no validator, twice Done', async () => {
    expect((await call('pollPlain')).json.result!.outcome).toBe('done');
    expect((await call('pollPlain')).json.result!.outcome).toBe('done');

    // The control for every case above: same server, same ETag on the wire, one port off.
    const log = hitsFor('/etag?plain=1');
    expect(log.length).toBe(2);
    expect(log[1].ifNoneMatch).toBeUndefined();
  });

  it('AC6 every outbound request carries a User-Agent starting NodeGX/, naming the public URL', async () => {
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      if (hit.userAgent === 'FeedBot/9.9 (+https://example.test)') continue;
      expect(hit.userAgent).toMatch(/^NodeGX\//);
      expect(hit.userAgent).toContain('(+https://feeds.example.test)');
    }
  });

  it('AC6 a graph that sets its own User-Agent keeps it', async () => {
    const before = hits.length;
    expect((await call('ownAgent')).json.result!.outcome).toBe('done');
    const sent = hits.slice(before);
    expect(sent.length).toBe(1);
    // A default, not an override.
    expect(sent[0].userAgent).toBe('FeedBot/9.9 (+https://example.test)');
  });
});
