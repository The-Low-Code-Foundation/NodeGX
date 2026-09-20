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

/**
 * 🔴 **FED-007 AC4/AC5 — the served dashboard's own reduction of a record, lifted out of the
 * shipped document and run HERE, against the real one.**
 *
 * `recordSummary` is what `/_admin` puts at the top of an opened execution: the status, what ran,
 * the model cost as a sentence, and the failures with the subject each one names. It is written
 * as a pure, self-contained function precisely so this file can compile it and feed it a record
 * produced by a real poll of a real feed — AC4's *"asserted against the real record, not a
 * fixture"*.
 *
 * ⚠️ Read, never restated. A copy of this reduction in this file would agree with itself forever
 * while the page showed something else, which is register R20's whole lesson.
 */
interface RecordSummary {
  status: string;
  workflow: string;
  trigger: string;
  triggerSource: string;
  errorMessage: string;
  costLine: string;
  stepCount: number;
  failures: Array<{ index: number; step: string; type: string; message: string; detail: Record<string, unknown> | null }>;
}

function dashboardRecordSummary(): (record: unknown) => RecordSummary {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'admin', 'ui', 'index.html'), 'utf-8');
  const at = html.indexOf('function recordSummary(record) {');
  if (at < 0) throw new Error('the dashboard no longer declares recordSummary — re-point this spec');
  const end = html.indexOf('\n    }', at);
  if (end < 0) throw new Error('recordSummary is no longer indented as this spec expects — re-point it');
  const body = html.slice(html.indexOf('{', at) + 1, end);
  return new Function('record', body) as (record: unknown) => RecordSummary;
}

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

/** A fourth source, added late, that never answers. See the AC5 describe near the bottom. */
const BROKEN_PATH = '/broken.xml';

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

interface ModelCost {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  durationMs: number;
  models: string[];
  line: string;
}

interface ExecutionRow {
  id: string;
  workflowId: string;
  status: string;
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
  metadata?: Record<string, unknown>;
  modelCost?: ModelCost;
}

interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  status: string;
  errorMessage?: string;
  outputData?: Record<string, unknown>;
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

      // The subject of the AC5 ruling's spec: a feed that always refuses. Its query string
      // carries the model key, so the record's redaction is measured on the same request.
      if (route.startsWith(BROKEN_PATH)) {
        upstreamHits.push({ route, userAgent: req.headers['user-agent'] as string | undefined, status: 403 });
        res.writeHead(403);
        res.end('nope');
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

    /**
     * 🔴 **`FED007_KEEP_DATA=1` leaves the data dir behind, and it is the re-shoot recipe.**
     *
     * FED-007 AC7 needs screenshots of a REAL record — three schedule fires, a feed that is
     * down, a model cost — and s7 built that backend by hand, threw the script away, and wrote
     * half a page of the next handoff explaining how to do it again. This is the same thing in
     * one flag: run the drive, keep the directory, then point the real CLI at it
     * (`node bin/nodegx-backend.js serve --data-dir <dir> --port <port>`) and the dashboard
     * serves the records this file just produced, admin token and all, from `secrets.json`.
     *
     * ⚠️ Off by default, because a drive that leaves a directory behind every run is a drive
     * that fills a disk.
     */
    if (dataDir && process.env.FED007_KEEP_DATA) {
      // eslint-disable-next-line no-console
      console.log(`\n        FED007_KEEP_DATA: the drive's backend is at ${dataDir}\n`);
      return;
    }
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
  // AC5 — what the run spent, as a sentence
  // ---------------------------------------------------------------------------------------------

  /**
   * 🔴 **FED-003 §5.5, settled.** That task put the model cost on the wire as raw JSON and
   * deliberately did not format it, because §8's close condition is Richard ruling the record
   * LEGIBLE and guessing the presentation first means building it twice. Ruled 2026-09-19: **a
   * summary line** — counts and tokens, no money, because a price table the backend carried would
   * go stale silently while continuing to render confidently.
   *
   * Asserted on the LIST as well as the row: §3.4's first screenshot is the execution list, and
   * "which of these runs was expensive" is a question a list answers at a glance or not at all.
   */
  describe('AC5 — the model cost reads as one sentence, on the row and in the list', () => {
    it('the first poll carries a line naming calls, tokens, time and the model', async () => {
      // Every item of every feed, tagged once: the first poll is the one with a full bill.
      const withCost = (await runs()).filter((r) => r.modelCost).sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
      expect(withCost.length).toBeGreaterThan(0);

      const cost = withCost[0].modelCost!;
      expect(cost.calls).toBe(TOTAL_ITEMS);
      expect(cost.models).toEqual(['claude-opus-5']);

      // The sentence, and every number in it is one this process observed.
      expect(cost.line).toBe(
        `${TOTAL_ITEMS} model calls \u00b7 ${cost.inputTokens.toLocaleString('en-US')} in / ` +
          `${cost.outputTokens.toLocaleString('en-US')} out tokens \u00b7 ` +
          `${cost.durationMs < 1000 ? `${Math.round(cost.durationMs)} ms` : `${(cost.durationMs / 1000).toFixed(1)} s`}` +
          ` \u00b7 claude-opus-5`
      );

      // 🔴 The ruling's own exclusion. No currency symbol, anywhere.
      expect(cost.line).not.toMatch(/[$£€]/);
    });

    it('the detail route says the same thing as the list — one derivation, not two', async () => {
      const row = (await runs()).filter((r) => r.modelCost)[0];
      const detail = await client.request<ExecutionRow>('GET', `/executions/${row.id}`, { headers: asAdmin() });
      expect(detail.status).toBe(200);
      expect(detail.json.modelCost).toEqual(row.modelCost);
    });

    it('a run that called no model carries no cost block at all, not a row of zeros', async () => {
      // "Spent nothing" and "could not have spent anything" are different sentences, and the
      // overwhelming majority of runs on any backend are the second.
      const listed = await client.request<ExecutionRow[]>('GET', '/executions?workflowId=myList', {
        headers: asAdmin()
      });
      expect(listed.status).toBe(200);
      expect(listed.json.length).toBeGreaterThan(0);
      for (const row of listed.json) expect(row.modelCost).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // AC5 — the record says WHICH source failed
  // ---------------------------------------------------------------------------------------------

  /**
   * 🔴 **The condition Richard put on ruling the execution record legible** (2026-09-19).
   *
   * A step is named by `nodeId`, which is the GRAPH node's id — so all three `helpers/pollOne`
   * instances write their fetch under the name `http`. Before this, a record reading
   * `http · error · "The server answered 403 Forbidden"` three steps down a list of forty could
   * not tell you which feed was refused, and the one question a person actually asks of a failed
   * poll is "which feed is broken".
   *
   * The node always knew: `httpnode.ts` composes `detail: { url, status }` for the error bus.
   * `RuntimeStepEnd.detail` now carries it as far as the record.
   *
   * ⚠️ **The URL carries the model key on purpose.** A URL is one of the likelier places a
   * credential turns up, and a record that names the subject is worthless if naming it leaks the
   * secret — so the same request measures both halves: the path is there, the key is not.
   */
  describe('AC5 — a failed poll names the feed that failed, without naming the secret', () => {
    let brokenUrl = '';
    let failedRun: ExecutionRow;
    let steps: ExecutionStep[] = [];
    /** The whole record, as `/_admin` receives it — what FED-007's summariser is fed. */
    let failedRecord: unknown = null;

    beforeAll(async () => {
      brokenUrl = `${fixtureUrl}${BROKEN_PATH}?token=${MODEL_KEY}`;
      const created = await client.request<{ objectId: string }>('POST', '/classes/Source', {
        body: { url: brokenUrl, kind: 'rss', title: 'A feed that is down' },
        headers: asAdmin()
      });
      expect(created.status).toBe(201);

      await armAndWaitForOnePoll();

      failedRun = (await runs()).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0];
      const detail = await client.request<{ steps: ExecutionStep[] }>('GET', `/executions/${failedRun.id}`, {
        headers: asAdmin()
      });
      expect(detail.status).toBe(200);
      steps = detail.json.steps || [];
      failedRecord = detail.json;
    });

    it('exactly one fetch failed, and the record says which URL it was', () => {
      const fetches = steps.filter((step) => step.nodeType === 'net.noodl.HTTP');
      const failed = fetches.filter((step) => step.status === 'error');

      // Four sources now, and only one of them is broken: the discrimination is the point.
      expect(fetches.length).toBe(SOURCES.length + 1);
      expect(failed.length).toBe(1);

      const named = (failed[0].outputData || {}).detail as { url?: string; status?: number } | undefined;
      expect(named).toBeDefined();
      expect(named!.url).toContain(BROKEN_PATH);
      expect(named!.status).toBe(403);
    });

    it('🔴 and the key that was in that URL is not in the record', () => {
      const failed = steps.filter((step) => step.nodeType === 'net.noodl.HTTP' && step.status === 'error')[0];
      const named = (failed.outputData || {}).detail as { url?: string } | undefined;
      // Two known-firing halves, because an absence beside nothing is worth nothing: the URL
      // really did carry the key, and the record really did record a URL.
      expect(brokenUrl).toContain(MODEL_KEY);
      expect(typeof named?.url).toBe('string');
      // And the record does not.
      expect(named!.url).not.toContain(MODEL_KEY);
      expect(JSON.stringify(steps)).not.toContain(MODEL_KEY);
    });

    it('the healthy feeds in the SAME run are still readable as healthy', () => {
      // Without this the spec above would pass on a record that marked everything failed.
      const ok = steps.filter((step) => step.nodeType === 'net.noodl.HTTP' && step.status !== 'error');
      expect(ok.length).toBe(SOURCES.length);
      // A successful fetch carries no detail — nothing went wrong, so there is no subject to name.
      for (const step of ok) expect((step.outputData || {}).detail).toBeUndefined();
    });

    it('no new items were written by the broken source, and the other seven are untouched', async () => {
      expect((await items()).length).toBe(TOTAL_ITEMS);
    });

    /**
     * 🔴 **FED-007 AC1, on the real record.** Richard ruled it on this very run, 2026-09-20,
     * looking at a screenshot of three green rows one of which was this poll: *a run with a
     * failed step must not read `success`.*
     *
     * Before the ruling was built, `status` was the HTTP reply — `WorkflowRunner`'s
     * `response.statusCode >= 200 && < 300` — and this graph answers 200 on BOTH its Response
     * nodes, because CWF-018 requires the failure path to reach one. So the row said `success`
     * over a poll where a feed was down, and the only place the failure appeared was forty steps
     * into the JSON.
     *
     * ⚠️ Its control is the spec at step 3 above: the two HEALTHY polls, in this same file,
     * still read `success`. Without that arm this would pass against a backend that marked every
     * run an error.
     */
    /**
     * 🔴 **FED-007 AC4, on the real record.** *"The failed fetch and the URL it names are
     * reachable without scrolling and without expanding anything."*
     *
     * The page's band is built from exactly this reduction and from nothing else, so what is
     * asserted here is what a person sees at the top of the modal before touching anything: the
     * name of the step, the reason, and the URL it was refused at.
     *
     * ⚠️ Every arm below runs the SHIPPED function. If the page stops computing this, or starts
     * computing it differently, this reddens — which is the property a restated copy could never
     * have.
     */
    it('🔴 FED-007 AC4: the page surfaces the failed fetch and its URL, unexpanded', () => {
      const summary = dashboardRecordSummary()(failedRecord);

      // The reduction really did read THIS run, or every arm below is about an empty object.
      expect(summary.stepCount).toBe(steps.length);
      expect(summary.stepCount).toBeGreaterThan(4);

      const fetchFailure = summary.failures.filter((f) => f.type === 'net.noodl.HTTP');
      expect(fetchFailure).toHaveLength(1);
      expect(fetchFailure[0].message).toContain('403');
      // 🔴 AC4's actual sentence: the URL, in the band, with nothing expanded.
      expect(String(fetchFailure[0].detail?.url)).toContain(BROKEN_PATH);
      expect(fetchFailure[0].detail?.status).toBe(403);
      // …and still not the key that was in it. The band is no less redacted than the record.
      expect(JSON.stringify(summary)).not.toContain(MODEL_KEY);
    });

    /**
     * 🔴 **What AC4's first draft got wrong, kept because it is the finding.**
     *
     * That draft expected ONE failure in the band, on the strength of the spec above it: exactly
     * one fetch failed. The real record carries **five** failed steps for one down feed — the
     * fetch, the `Parse Feed` handed the refusal body, and the enclosing `Run Tasks` reporting
     * *"Task 4 of 4 failed"* **twice, byte for byte**.
     *
     * At least one of those is a duplicate and is folded by the summariser; the rest are a
     * genuine cascade and are shown, because hiding a step that really did fail is how a record
     * stops being a record. 🔴 **One of them — a `Run Tasks` step whose whole message is "The
     * action could not be performed" — is a failure with no subject and no reason, which is the
     * exact complaint FED-006's ruling 1 was about.** Phase register R25.
     *
     * ⚠️ **The COUNT is not asserted, and that is a measurement rather than a shrug.** A first
     * version pinned five raw and four folded; it went red once and green on the two runs after
     * it with the same code, so the cascade's size is not stable run to run — which is register
     * R25's other half. What IS stable is asserted below, and the shape is printed on every run
     * so the variation is visible rather than inferred.
     */
    it('🔴 one down feed makes a CASCADE of failed steps, and the band folds the duplicates', () => {
      const summary = dashboardRecordSummary()(failedRecord);
      const raw = steps.filter((step) => step.status === 'error');
      // eslint-disable-next-line no-console
      console.log(
        '        FED-007 cascade:',
        JSON.stringify({
          raw: raw.map((s) => `${s.nodeType}#${s.nodeId}: ${s.errorMessage}`),
          folded: summary.failures.length
        })
      );

      // One broken feed, and more than one step says so — that is what a cascade is.
      expect(raw.length).toBeGreaterThan(1);
      // The fold never invents a failure and never drops a distinct one.
      expect(summary.failures.length).toBeGreaterThan(0);
      expect(summary.failures.length).toBeLessThanOrEqual(raw.length);
      // …and no two survivors are identical, which is the whole of what folding means here.
      const keys = summary.failures.map((f) => `${f.step}|${f.message}|${JSON.stringify(f.detail)}`);
      expect(new Set(keys).size).toBe(keys.length);

      // 🔴 Register R25: one of the failures a person reads names neither a subject nor a reason.
      const bare = summary.failures.filter((f) => f.message === 'The action could not be performed');
      expect(bare.length).toBeGreaterThan(0);
      expect(bare[0].detail).toBeNull();
    });

    /**
     * 🔴 **FED-007 AC5** — *"the cost line is visible on an opened record without reading raw
     * JSON"*. Richard's ruling 3, which asked for it on the explorer with a list column as the
     * fallback. It rides the band.
     */
    it('🔴 FED-007 AC5: the cost line is on the opened record, as a sentence', () => {
      const summary = dashboardRecordSummary()(failedRecord);
      expect(summary.costLine).toContain('model call');
      expect(summary.costLine).toContain('tokens');
      // The control: it is the record's own line, not something this reduction composed.
      expect(summary.costLine).toBe((failedRun as { modelCost?: ModelCost }).modelCost?.line);
    });

    it('🔴 the run that contained the failure does not read success (FED-007 AC1)', () => {
      // The failure really is in this run, or the status below is about nothing.
      expect(steps.filter((step) => step.status === 'error').length).toBeGreaterThan(0);

      expect(failedRun.status).toBe('error');
      // And it says so in a sentence, naming the node, rather than leaving the row bare — the
      // run DID answer, and a message that omitted that would read as a run that fell over.
      expect(failedRun.errorMessage).toContain('The run answered, but a step failed:');
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

    /**
     * 🔴 **This spec read `status === 'success'` until FED-007 AC1, and the ruling took it.**
     *
     * The run is the catch-up poll, and the broken source the AC5 block added is still in the
     * Source table — nothing removes it — so this poll fetches four feeds and one of them 403s,
     * exactly like the run above. Under the ruling that row is `error`, and it should be: it is
     * the same poll, with the same feed down.
     *
     * So what AC3 is actually about is asserted directly instead of through a green chip — it
     * was the CATCH-UP that ran (the metadata), it ran ONCE (the spec above), and it DID THE
     * WORK (the spec below: the same items, upserted, no new rows). The status is now a
     * statement about the broken feed, and it is asserted as one.
     */
    it('it was the catch-up, and its record is honest about the feed that is still down', async () => {
      const latest = (await runs()).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0];
      expect(String((latest.metadata || {}).triggerSource)).toContain('catch-up');
      expect(latest.status).toBe('error');
      expect(latest.errorMessage).toContain('The run answered, but a step failed:');
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
