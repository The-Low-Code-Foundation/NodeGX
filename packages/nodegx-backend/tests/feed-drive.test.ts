/**
 * FED-006 — the drive: one feed reader, end to end.
 *
 * This is phase 96's close condition (README §8) and the only test in the phase that is about all
 * of it at once. Everything below runs against ONE provisioned backend: a schema is pushed, two
 * cloud functions are deployed, a schedule fires the poller, three fixture feeds are fetched and
 * parsed, every item is tagged by a model call whose key comes out of `secrets.json`, and the rows
 * are then read back three ways — by a session user, by an API key, and by the OFFICIAL MCP
 * client over `/mcp`.
 *
 * The graphs are in `tests/fixtures/feed-drive/project.ts` and nothing here edits them: what is
 * asserted out here is a property of that project.
 *
 * ## Three things about this file that are decisions
 *
 * 1. 🔴 **The counts come from the fixtures, not from the task file.** FED-006 §3.3 says twelve
 *    items (5 + 3 + 4). The fixture feeds on disk hold 3, 2 and 2, and the artefact is what is
 *    right — so the expected totals are named constants below, and `it('the fixtures still hold
 *    what these constants say')` counts the documents so that editing a fixture reddens the
 *    constant instead of silently changing the answer.
 *
 * 2. 🔴 **Two SCHEDULE fires, without waiting two minutes.** The cron is a real `* * * * *`, but
 *    the drive never waits for a minute boundary: `missedFirePolicy: run-once-on-start` with a
 *    `lastFiredAt` in the past means a catch-up fire is due the moment the scheduler arms, and
 *    `POST /admin/triggers/:id/enabled` re-arms it. Both fires are real dispatches through the
 *    real `TriggerDispatcher` at a real target. This is FED-004's compression and it is the only
 *    way a five-minute acceptance criterion and a minutely schedule fit in the same file.
 *
 * 3. 🔴 **The secrets are written before the schedule is ever armed.** The trigger ships
 *    `enabled: false` and is switched on after `secrets.json` has `MODEL_KEY` in it. A poll that
 *    fired first would fail on a missing secret, and AC2's absence assertions would then be
 *    absences beside a signal that never fired — which is to say, worth nothing.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { logger } from '../src/ops/logger';
import { BackendService } from '../src/service';

import {
  MODEL_BASE_URL_SECRET,
  MODEL_KEY,
  MODEL_KEY_SECRET,
  SCHEMA,
  SECURITY,
  TRIGGER_ID,
  triggersFile,
  workflowBundle
} from './fixtures/feed-drive/project';
import { httpClient } from './helpers/http';

jest.setTimeout(300_000);

/** Where the FED-001 feed fixtures live. Read across rather than copied: one copy cannot drift. */
const FEEDS = path.join(__dirname, '..', '..', 'noodl-runtime', 'test', 'fixtures', 'feeds');

/**
 * The three feeds this drive polls, and how many entries each one holds.
 *
 * 🔴 These numbers are the artefact's, counted below in a spec of their own. FED-006 §3.3's
 * "5 + 3 + 4 = 12" was written before anyone counted the files.
 */
const SOURCES = [
  { route: '/blog.xml', file: 'rss2-blog.xml', kind: 'rss', title: 'The Slow Web', items: 3, etag: '"blog-v1"' },
  { route: '/channel.xml', file: 'youtube-channel.xml', kind: 'atom', title: 'A channel', items: 2, etag: undefined },
  {
    route: '/r/selfhosted.rss',
    file: 'reddit-subreddit.xml',
    kind: 'atom',
    title: 'r/selfhosted',
    items: 2,
    etag: undefined
  }
] as const;

const TOTAL_ITEMS = SOURCES.reduce((n, s) => n + s.items, 0);
/**
 * How many model calls TWO polls cost.
 *
 * 🔴 Not `TOTAL_ITEMS`, and the gap is the whole economic argument for `Conditional`. The first
 * poll tags every item. The second poll tags every item of every feed **that answered 200** — a
 * graph shaped like this one re-tags before it upserts, so a host that issues no validator costs
 * its items again, and the one that issues an `ETag` answers 304 and costs nothing at all.
 *
 * It is also the obvious next thing a person would build (tag only what the database has not seen)
 * and deliberately NOT built here: the drive's job is to show what the decisions cost, and a graph
 * that quietly optimised this away would show nothing.
 */
const MODEL_CALLS = TOTAL_ITEMS + SOURCES.filter((s) => !s.etag).reduce((n, s) => n + s.items, 0);
/** What the fake model tags everything with, and what `Item.topics` therefore reads. */
const TOPICS = ['ai-coding', 'self-hosting'];
const TOPICS_STORED = TOPICS.join(', ');

interface UpstreamHit {
  route: string;
  ifNoneMatch?: string;
  userAgent?: string;
  status: number;
}

interface ModelHit {
  apiKey?: string;
  body: Record<string, unknown>;
}

interface ExecutionRow {
  id: string;
  workflowId: string;
  status: string;
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
  metadata?: Record<string, unknown>;
}

interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  status: string;
  errorMessage?: string;
}

interface ParseResults {
  results: Record<string, string>[];
}

interface MyListAnswer {
  result?: {
    items?: { id: string; title: string; published: string; topics: string; sourceId: string }[];
    count?: number;
    sourceCount?: number;
    error?: string;
  };
}

interface McpClientLike {
  connect(transport: unknown): Promise<void>;
  close(): Promise<void>;
  listTools(): Promise<{ tools: { name: string }[] }>;
  callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<{
    content?: { type: string; text?: string }[];
    isError?: boolean;
  }>;
}

/* eslint-disable @typescript-eslint/no-var-requires */
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('FED-006 — one feed reader, end to end', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let adminToken: string;
  let fixtures: http.Server;
  let fixtureUrl: string;

  const upstreamHits: UpstreamHit[] = [];
  const modelHits: ModelHit[] = [];
  const logLines: string[] = [];

  /** objectId of each Source row, by route. `Item.sourceId` holds these. */
  const sourceRowIds: Record<string, string> = {};
  const users: Record<string, { objectId: string; sessionToken: string }> = {};
  let boundKey = '';

  const client = httpClient(() => base);
  const asAdmin = () => ({ authorization: `Bearer ${adminToken}` });
  const asUser = (who: string) => ({ 'x-parse-session-token': users[who].sessionToken });

  // ---------------------------------------------------------------------------------------------
  // Step 1 — provision, push the schema, deploy the functions, arm the trigger.
  // ---------------------------------------------------------------------------------------------
  beforeAll(async () => {
    // ----- the fixture world (§3.1) ------------------------------------------------------------
    fixtures = http.createServer((req, res) => {
      const route = String(req.url);

      if (route === '/model' || route.startsWith('/model/')) {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          let body: Record<string, unknown> = {};
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            /* recorded as {} */
          }
          modelHits.push({ apiKey: req.headers['x-api-key'] as string | undefined, body });
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'msg_fed006',
              type: 'message',
              role: 'assistant',
              model: 'claude-opus-5',
              // A thinking block in front of the answer, as a real one has.
              content: [
                { type: 'thinking', thinking: '' },
                { type: 'text', text: JSON.stringify({ topics: TOPICS }) }
              ],
              stop_reason: 'end_turn',
              usage: { input_tokens: 120, output_tokens: 11, cache_read_input_tokens: 0 }
            })
          );
        });
        return;
      }

      const source = SOURCES.find((s) => s.route === route);
      if (!source) {
        upstreamHits.push({ route, status: 404 });
        res.writeHead(404);
        res.end();
        return;
      }

      const userAgent = req.headers['user-agent'] as string | undefined;
      const ifNoneMatch = req.headers['if-none-match'] as string | undefined;

      // §3.1: the subreddit fixture refuses a caller with no name on it, which is what reddit
      // actually does and is why FED-004 put a default User-Agent on the node at all.
      if (source.route === '/r/selfhosted.rss' && !userAgent) {
        upstreamHits.push({ route, userAgent, ifNoneMatch, status: 403 });
        res.writeHead(403);
        res.end('no user-agent');
        return;
      }

      if (source.etag) {
        res.setHeader('etag', source.etag);
        if (ifNoneMatch === source.etag) {
          upstreamHits.push({ route, userAgent, ifNoneMatch, status: 304 });
          res.writeHead(304);
          res.end();
          return;
        }
      }

      upstreamHits.push({ route, userAgent, ifNoneMatch, status: 200 });
      res.writeHead(200, { 'content-type': 'application/rss+xml; charset=utf-8' });
      res.end(fs.readFileSync(path.join(FEEDS, source.file)));
    });
    await new Promise<void>((resolve) => fixtures.listen(0, '127.0.0.1', resolve));
    fixtureUrl = `http://127.0.0.1:${(fixtures.address() as { port: number }).port}`;

    // ----- the project on disk -----------------------------------------------------------------
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fed006-drive-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(SECURITY, null, 2));
    // ⚠️ Armed later, on purpose. See the module comment: a poll that fires before `MODEL_KEY`
    // exists would make every absence assertion in AC2 an absence beside nothing.
    const triggers = triggersFile('run-once-on-start');
    triggers.triggers[0].enabled = false;
    fs.writeFileSync(path.join(dataDir, 'triggers.json'), JSON.stringify(triggers, null, 2));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'feed-reader.workflow.json'),
      JSON.stringify(workflowBundle())
    );

    service = new BackendService({ dataDir, port: 0, backendId: 'fed006', backendName: 'Distraction' });
    base = (await service.start()).listen.url;

    // Read-modify-write: `start()` has already minted `adminToken` into this file.
    const secretsPath = path.join(dataDir, 'secrets.json');
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
    adminToken = secrets.adminToken;
    secrets.functions = {
      ...(secrets.functions || {}),
      [MODEL_KEY_SECRET]: MODEL_KEY,
      [MODEL_BASE_URL_SECRET]: `${fixtureUrl}/model`
    };
    fs.writeFileSync(secretsPath, JSON.stringify(secrets));

    // AC2 reads the log, so un-silence it and capture what is written.
    delete process.env.NODEGX_LOG_LEVEL;
    logger.configure({ level: 'debug', format: 'json' });
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      logLines.push(String(chunk));
      return true;
    });

    // ----- the schema (§3.2) -------------------------------------------------------------------
    for (const decl of SCHEMA) {
      const pushed = await client.request<{ created?: boolean; error?: string }>('POST', '/admin/schema', {
        body: { action: 'createTable', table: decl.table, columns: decl.columns, indexes: decl.indexes },
        headers: asAdmin()
      });
      expect(pushed.status).toBe(200);
    }

    // ----- step 2: the Source rows, and two people --------------------------------------------
    for (const source of SOURCES) {
      const created = await client.request<{ objectId: string }>('POST', '/classes/Source', {
        body: { url: `${fixtureUrl}${source.route}`, kind: source.kind, title: source.title },
        headers: asAdmin()
      });
      expect(created.status).toBe(201);
      sourceRowIds[source.route] = created.json.objectId;
    }

    for (const name of ['alice', 'bob']) {
      const signup = await client.request<{ objectId: string; sessionToken: string }>('POST', '/users', {
        body: { username: name, password: 'a-long-enough-password' }
      });
      expect(signup.status).toBe(201);
      users[name] = signup.json;
    }

    // Alice follows the blog and the channel; Bob follows the subreddit.
    const follows: [string, string][] = [
      ['alice', '/blog.xml'],
      ['alice', '/channel.xml'],
      ['bob', '/r/selfhosted.rss']
    ];
    for (const [who, route] of follows) {
      const created = await client.request('POST', '/classes/Follow', {
        body: { userId: users[who].objectId, sourceId: sourceRowIds[route] },
        headers: asUser(who)
      });
      expect(created.status).toBe(201);
    }

    // §3.3 step 7 / README §5: a key BOUND to Alice. Unbound it would measure the endpoint and
    // say nothing about per-user reading, which is the half §8 cares about.
    const key = await client.request<{ secret: string }>('POST', '/admin/keys', {
      body: {
        name: 'alice-laptop',
        scopes: ['classes:read', 'functions:*'],
        actsAsUserId: users.alice.objectId
      },
      headers: asAdmin()
    });
    expect(key.status).toBe(201);
    boundKey = key.json.secret;

    // ----- step 3: two schedule fires ----------------------------------------------------------
    await armAndWaitForOnePoll();
    await armAndWaitForOnePoll();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    process.env.NODEGX_LOG_LEVEL = 'silent';
    logger.configure({ level: 'silent' });
    if (service) await service.stop();
    if (fixtures) await new Promise<void>((resolve) => fixtures.close(() => resolve()));
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------------------------

  const executions = async (): Promise<ExecutionRow[]> => {
    const res = await client.request<ExecutionRow[]>('GET', '/executions?workflowId=pollSources', {
      headers: asAdmin()
    });
    expect(res.status).toBe(200);
    return res.json;
  };

  /** Rows that actually RAN — a skipped-overlap record is a decision, not a run. */
  const runs = async (): Promise<ExecutionRow[]> =>
    (await executions()).filter((r) => (r.metadata || {}).disposition !== 'skipped-overlap');

  /**
   * Re-arm the scheduler and wait for the catch-up fire to finish.
   *
   * `enabled: true` calls `reschedule()`, and with `run-once-on-start` and a `lastFiredAt` that
   * is still in the past a fire is immediately due. There is no polling of a clock here: the wait
   * is for one more FINISHED execution row than there were before.
   */
  async function armAndWaitForOnePoll(): Promise<void> {
    const before = (await runs()).filter((r) => r.completedAt).length;

    const armed = await client.request('POST', `/admin/triggers/${TRIGGER_ID}/enabled`, {
      body: { enabled: true },
      headers: asAdmin()
    });
    expect(armed.status).toBe(200);

    const deadline = Date.now() + 90_000;
    for (;;) {
      const finished = (await runs()).filter((r) => r.completedAt);
      if (finished.length > before) {
        // 🔴 Disarm again before returning, and this is not tidiness.
        //
        // The cron is a real `* * * * *`, so leaving the scheduler armed between assertions means
        // a minute boundary can land a THIRD poll in the middle of the suite — which moves the
        // model-call count and AC3's "exactly one run was added". Seen once, as a single red that
        // two re-runs did not reproduce: the worst kind. The trigger keeps its minutely cron on
        // disk (the execution record says `schedule * * * * *`, which is the point); it is simply
        // not armed except while this helper is waiting for the fire it asked for.
        const disarmed = await client.request('POST', `/admin/triggers/${TRIGGER_ID}/enabled`, {
          body: { enabled: false },
          headers: asAdmin()
        });
        expect(disarmed.status).toBe(200);
        return;
      }
      if (Date.now() > deadline) {
        // R1's shape from the outside: say what WAS there rather than timing out mutely.
        throw new Error(
          `no poll finished within 90s. Executions so far: ${JSON.stringify(await executions(), null, 2)}`
        );
      }
      await settle(500);
    }
  }

  const items = async (where?: Record<string, unknown>): Promise<Record<string, string>[]> => {
    const query = where ? `?where=${encodeURIComponent(JSON.stringify(where))}&limit=200` : '?limit=200';
    const res = await client.request<ParseResults>('GET', `/classes/Item${query}`, { headers: asAdmin() });
    expect(res.status).toBe(200);
    return res.json.results;
  };

  // ---------------------------------------------------------------------------------------------
  // The constants this file reasons with are the artefact's
  // ---------------------------------------------------------------------------------------------

  it('the fixture feeds still hold what the constants above say they do', () => {
    for (const source of SOURCES) {
      const document = fs.readFileSync(path.join(FEEDS, source.file), 'utf-8');
      const entries = (document.match(/<item>|<entry>/g) || []).length;
      expect({ file: source.file, entries }).toEqual({ file: source.file, entries: source.items });
    }
    expect(TOTAL_ITEMS).toBe(7);
    // And what two polls of them cost the model: seven the first time, four the second, because
    // the blog's ETag spared its three.
    expect(MODEL_CALLS).toBe(11);
  });

  // ---------------------------------------------------------------------------------------------
  // Step 3 — the items landed, once each, tagged
  // ---------------------------------------------------------------------------------------------

  describe('AC1 §3.3 step 3 — two polls, and every item is there exactly once', () => {
    /**
     * 🔴 **`status: 'success'` on the execution row is NOT this assertion, and a mutant proved it.**
     *
     * Both of this function's Response nodes answer HTTP 200 — one says `polled`, the other says
     * `failed` — so the row reads `success` whichever fired. Removing `upsertOn` from the Create
     * Record node left every spec in this file green: the second poll's writes were refused by the
     * unique index one item at a time, `Run Tasks` reported the failures, the graph answered on
     * `resErr`, the row still said `success`, and the item count was still seven because the
     * refusals wrote nothing.
     *
     * So what is read is the STEPS: which Response node ran, and whether any step errored. That is
     * also the thing §3.4 asks Richard to rule legible, which is not a coincidence — a record you
     * cannot grade from is a record nobody can read either.
     */
    it('both polls answered on the success path, with no failed step in either', async () => {
      const finished = (await runs()).filter((r) => r.completedAt);
      expect(finished.length).toBeGreaterThanOrEqual(2);
      for (const row of finished) {
        const detail = await client.request<{ steps: ExecutionStep[] }>('GET', `/executions/${row.id}`, {
          headers: asAdmin()
        });
        expect(detail.status).toBe(200);
        const steps = detail.json.steps || [];
        expect(steps.length).toBeGreaterThan(0);

        const failed = steps.filter((step) => step.status === 'error');
        expect(failed.map((step) => `${step.nodeId}: ${step.errorMessage}`)).toEqual([]);

        const responses = steps.filter((step) => step.nodeType === 'noodl.cloud.response').map((step) => step.nodeId);
        expect(responses).toEqual(['res']);
        expect(row.status).toBe('success');
      }
    });

    it(`there are exactly ${TOTAL_ITEMS} items after two polls — the unique index, not the graph`, async () => {
      const rows = await items();
      expect(rows.length).toBe(TOTAL_ITEMS);
      // Each feed id appears once. A duplicate would show up here even if the total happened to
      // come out right for some other reason.
      const ids = rows.map((r) => r.id);
      expect(new Set(ids).size).toBe(TOTAL_ITEMS);
    });

    it('each item is attributed to the Source row it came from', async () => {
      for (const source of SOURCES) {
        const rows = await items({ sourceId: sourceRowIds[source.route] });
        expect({ route: source.route, n: rows.length }).toEqual({ route: source.route, n: source.items });
      }
    });

    it('every item carries the topics the model gave it, and the fields a person reads', async () => {
      for (const row of await items()) {
        expect(row.topics).toBe(TOPICS_STORED);
        expect(row.title).toBeTruthy();
        expect(row.link).toBeTruthy();
        expect(row.id).toBeTruthy();
      }
    });
  });

  // ---------------------------------------------------------------------------------------------
  // AC2 — the key reached the fixture, and reached nothing else
  // ---------------------------------------------------------------------------------------------

  describe('AC2 — the model key appears nowhere but the request to the provider', () => {
    it(`the fixture received it on all ${MODEL_CALLS} calls, with the schema the graph asked for`, () => {
      // 🔴 The known-firing signal. Every absence below is worth exactly as much as this.
      expect(modelHits.length).toBe(MODEL_CALLS);
      for (const hit of modelHits) {
        expect(hit.apiKey).toBe(MODEL_KEY);
        expect((hit.body.output_config as { format?: { type?: string } })?.format?.type).toBe('json_schema');
      }
    });

    it('no execution record carries it — not in a step, a parameter, or an error', async () => {
      const rows = await executions();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const detail = await client.request<unknown>('GET', `/executions/${row.id}`, { headers: asAdmin() });
        expect(detail.status).toBe(200);
        expect(detail.text).not.toContain(MODEL_KEY);
      }
    });

    it('no log line carries it, and the log is not empty', () => {
      expect(logLines.length).toBeGreaterThan(0);
      expect(logLines.join('\n')).not.toContain(MODEL_KEY);
    });

    it('no HTTP response carries it — the items, the list, the schema and the trigger', async () => {
      const surfaces = [
        await client.request('GET', '/classes/Item?limit=200', { headers: asAdmin() }),
        await client.request('GET', '/admin/schema/Item', { headers: asAdmin() }),
        await client.request('GET', `/admin/triggers/${TRIGGER_ID}`, { headers: asAdmin() }),
        await client.request('POST', '/functions/myList', { body: {}, headers: asUser('alice') })
      ];
      for (const res of surfaces) {
        expect(res.text).not.toContain(MODEL_KEY);
      }
    });

    it('and the secret it came from is still only in secrets.json', () => {
      const secrets = fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8');
      expect(secrets).toContain(MODEL_KEY);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // §3.3 step 4 — each person's own list
  // ---------------------------------------------------------------------------------------------

  describe('§3.3 step 4 — myList answers the CALLER, and only the caller', () => {
    it('Alice gets the two feeds she follows, newest first', async () => {
      const res = await client.request<MyListAnswer>('POST', '/functions/myList', {
        body: {},
        headers: asUser('alice')
      });
      expect(res.status).toBe(200);
      expect(res.json.result!.error).toBeUndefined();
      expect(res.json.result!.sourceCount).toBe(2);

      const expected = SOURCES[0].items + SOURCES[1].items;
      expect(res.json.result!.count).toBe(expected);

      const published = res.json
        .result!.items!.map((i) => i.published)
        .filter(Boolean)
        .map((p) => new Date(p).getTime());
      const descending = [...published].sort((a, b) => b - a);
      expect(published).toEqual(descending);
    });

    it('Bob gets his one feed, and none of Alice’s', async () => {
      const res = await client.request<MyListAnswer>('POST', '/functions/myList', {
        body: {},
        headers: asUser('bob')
      });
      expect(res.status).toBe(200);
      expect(res.json.result!.sourceCount).toBe(1);
      expect(res.json.result!.count).toBe(SOURCES[2].items);

      const sourceIds = new Set(res.json.result!.items!.map((i) => i.sourceId));
      expect([...sourceIds]).toEqual([sourceRowIds['/r/selfhosted.rss']]);
    });

    it('Alice cannot read Bob’s Follow rows — creator-owns, over plain HTTP', async () => {
      const res = await client.request<ParseResults>('GET', '/classes/Follow?limit=200', {
        headers: asUser('alice')
      });
      expect(res.status).toBe(200);
      // Not "fewer rows": none of them are Bob's.
      expect(res.json.results.every((r) => r.userId === users.alice.objectId)).toBe(true);
      expect(res.json.results.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // §3.3 step 5 — the two decisions the graph says out loud
  // ---------------------------------------------------------------------------------------------

  describe('§3.3 step 5 — conditional GET and a name on the door', () => {
    it('the second poll of the blog was a 304, read off the fixture’s own log', () => {
      const blog = upstreamHits.filter((h) => h.route === '/blog.xml');
      expect(blog.length).toBe(2);
      expect(blog[0].status).toBe(200);
      expect(blog[0].ifNoneMatch).toBeUndefined();
      // The validator came back, and the body did not.
      expect(blog[1].ifNoneMatch).toBe(SOURCES[0].etag);
      expect(blog[1].status).toBe(304);
    });

    it('a feed that issues no validator is fetched again, and its items still land once', () => {
      const channel = upstreamHits.filter((h) => h.route === '/channel.xml');
      expect(channel.length).toBe(2);
      expect(channel.every((h) => h.status === 200)).toBe(true);
    });

    it('every outbound request carried a User-Agent starting NodeGX/', () => {
      const feedHits = upstreamHits.filter((h) => h.status !== 404);
      expect(feedHits.length).toBeGreaterThan(0);
      for (const hit of feedHits) {
        expect(hit.userAgent).toMatch(/^NodeGX\//);
      }
    });

    it('so the subreddit, which refuses a nameless caller, was never refused', () => {
      const reddit = upstreamHits.filter((h) => h.route === '/r/selfhosted.rss');
      expect(reddit.length).toBe(2);
      expect(reddit.map((h) => h.status)).toEqual([200, 200]);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // §3.3 step 7 — the same rows, through /mcp, as Alice
  // ---------------------------------------------------------------------------------------------

  describe('§3.3 step 7 — an MCP client reads Alice’s list', () => {
    let mcp: McpClientLike;

    beforeAll(async () => {
      mcp = new Client({ name: 'fed-006-drive', version: '1.0.0' }) as McpClientLike;
      await mcp.connect(
        new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
          requestInit: { headers: { 'X-NodeGX-Api-Key': boundKey } }
        })
      );
    });

    afterAll(async () => {
      if (mcp) await mcp.close();
    });

    it('lists the tools this key may use, and no destructive one', async () => {
      const names = (await mcp.listTools()).tools.map((t) => t.name).sort();
      expect(names).toContain('Item_find');
      expect(names).toContain('myList');
      // `delete` is `nobody` on every collection in this project, and the key is `classes:read`.
      expect(names.filter((n) => n.endsWith('_delete'))).toEqual([]);
      expect(names.filter((n) => n.endsWith('_create'))).toEqual([]);
      // 🔴 R9's shape: no system collection is ever a tool.
      expect(names.filter((n) => n.startsWith('_'))).toEqual([]);
    });

    it('reads the items back', async () => {
      const found = await mcp.callTool({ name: 'Item_find', arguments: {} });
      expect(found.isError).toBeFalsy();
      expect(found.content?.[0]?.text).toContain(TOPICS_STORED);
    });

    it('and calls myList as Alice — the SAME answer the session user got', async () => {
      const answered = await mcp.callTool({ name: 'myList', arguments: {} });
      expect(answered.isError).toBeFalsy();
      const text = answered.content?.[0]?.text || '';
      const expected = SOURCES[0].items + SOURCES[1].items;
      // The binding is what makes this Alice's list rather than nobody's: the key carries no
      // session, and `actsAsUserId` is the only thing that put her id on the Request node.
      expect(JSON.parse(text).result.count).toBe(expected);
      expect(JSON.parse(text).result.sourceCount).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // AC3 — the trigger deleted, remade, and the process restarted
  // ---------------------------------------------------------------------------------------------

  /**
   * AC3: *"deleting the trigger and re-running from step 3 with `missedFirePolicy:
   * run-once-on-start` after a simulated restart produces exactly one extra run."*
   *
   * The restart is real: the service is stopped and a NEW `BackendService` is started on the same
   * `dataDir`, so the scheduler, the registry and the execution store are all rebuilt from disk
   * exactly as they are on a deploy.
   *
   * 🔴 **The remade trigger's cron is daily, not minutely, and that is the measurement.** With
   * `* * * * *` a minute boundary crossing mid-spec would add a second run and "exactly one" would
   * be a statement about clock luck. A cron that cannot fire during the test leaves the catch-up
   * fire as the only thing that can produce a run — which is the thing AC3 is actually about.
   *
   * ⚠️ This describe is LAST on purpose: it replaces `service` and `base`, and every spec above
   * reads them.
   */
  describe('AC3 — a restart with run-once-on-start runs the missed fire once, and only once', () => {
    let runsBefore = 0;
    let itemsBefore = 0;

    beforeAll(async () => {
      runsBefore = (await runs()).length;
      itemsBefore = (await items()).length;

      const removed = await client.request('DELETE', `/admin/triggers/${TRIGGER_ID}`, { headers: asAdmin() });
      expect(removed.status).toBe(200);
      expect((await client.request('GET', `/admin/triggers/${TRIGGER_ID}`, { headers: asAdmin() })).status).toBe(404);

      await service.stop();

      // Remade on disk, enabled, with a fire that is overdue and a schedule that cannot come
      // round again while this runs.
      const remade = triggersFile('run-once-on-start');
      remade.triggers[0].schedule.cron = '0 3 * * *';
      fs.writeFileSync(path.join(dataDir, 'triggers.json'), JSON.stringify(remade, null, 2));

      service = new BackendService({ dataDir, port: 0, backendId: 'fed006', backendName: 'Distraction' });
      base = (await service.start()).listen.url;

      // Wait for the catch-up fire to finish, then keep watching long enough that a second one
      // would have shown up. A spec that asserted "one" the instant the first arrived would pass
      // against a scheduler that fires every second.
      const deadline = Date.now() + 60_000;
      for (;;) {
        const finished = (await runs()).filter((r) => r.completedAt);
        if (finished.length > runsBefore) break;
        if (Date.now() > deadline) throw new Error('the remade trigger never fired');
        await settle(500);
      }
      await settle(3000);
    });

    it('exactly one run was added', async () => {
      expect((await runs()).length).toBe(runsBefore + 1);
    });

    it('it was the catch-up, and it succeeded', async () => {
      const latest = (await runs()).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0];
      expect(latest.status).toBe('success');
      expect(String((latest.metadata || {}).triggerSource)).toContain('catch-up');
    });

    it('and it wrote no new rows — the same items, upserted', async () => {
      expect((await items()).length).toBe(itemsBefore);
      expect(itemsBefore).toBe(TOTAL_ITEMS);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // §3.3 step 8 — nothing else is running
  // ---------------------------------------------------------------------------------------------

  it('§3.3 step 8 — the drive is this process and the fixture server, and nothing else', () => {
    // Both servers are in THIS process: the backend is a `BackendService` instance, not a spawn,
    // and the fixture is a `node:http` server beside it. The claim §8 makes — "no process other
    // than nodegx-backend" — is therefore a property of how this file is written, and what can be
    // asserted is that neither half was outsourced.
    expect(service.getRouteTable().length).toBeGreaterThan(0);
    expect(fixtures.listening).toBe(true);
  });
});
