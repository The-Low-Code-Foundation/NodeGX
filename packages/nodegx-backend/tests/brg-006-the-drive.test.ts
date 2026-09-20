/**
 * BRG-006 — the drive: a real app crosses.
 *
 * *"A NodeGX app that a person actually built — pages, workflows, cloud functions, a schedule,
 * login, row ACLs, realtime — is moved onto Postgres by one command and keeps working, and the
 * person never opens the editor to do it."*
 *
 * This is phase 97's close condition. Everything else in the phase says the two adapters agree;
 * this says **the app moves**, and those are different claims (BRG-006 §2).
 *
 * ## What is being driven, and why it is not a fixture of mine
 *
 * The app is **FED-006's feed reader**, imported unmodified from
 * `tests/fixtures/feed-drive/project.ts` — a backend application authored by phase 96 with no
 * knowledge that this phase would exist. Four capabilities §3 requires and it does not carry are
 * composed onto it in `tests/fixtures/bridge-drive/additions.ts`, each one named there against the
 * specific way a migration can be green and wrong. Neither module is edited by this file: what is
 * asserted out here is a property of what is in there.
 *
 * ## The shape, and the one decision that makes the comparison worth anything
 *
 * 🔴 **`probe()` is called once per engine and its answer is compared, not re-asserted.** AC4 says
 * *"every recorded behaviour in AC1 is reproduced, compared against the control, not merely
 * inspected"*. A drive that re-ran a list of expectations against Postgres would pass on any
 * behaviour both engines get equally wrong; a recorded snapshot compared field for field cannot.
 * So the control is taken on SQLite, kept, and `expect(afterPg).toEqual(control)` is the criterion
 * — which is also why the two known, declared divergences below are lifted OUT of the snapshot by
 * name rather than smoothed inside it.
 *
 * The run is one sequence, in one `beforeAll`, because it is one story:
 *
 *   1. provision, push the schema, deploy the graphs, sign two people up, arm the schedule twice
 *   2. **take the control** (AC1) — and hash the project files, which is AC5's baseline
 *   3. stop the app; `migrate --dry-run` (AC2); `migrate` (AC3)
 *   4. restart on `NODEGX_STORAGE_URL`; **probe again** (AC4, AC6)
 *   5. stop; restart on the untouched SQLite file; **probe a third time** (AC7)
 *
 * ## 🔴 Two declared divergences, lifted out of the snapshot by name
 *
 * 1. **BRG-D8** — a `Boolean` reads `0` on SQLite and `false` on PostgreSQL. Filed, declared in
 *    the adapter's divergence register, and deliberately unrepaired: which way they should agree
 *    is a product decision. `Mark.pinned` carries it here, and the case that states it is the only
 *    place it appears. `normalise()` folds it for the snapshot, and **the folding is itself armed**
 *    — when BRG-D8 is repaired, the case asserting the difference goes red and names the
 *    normaliser to delete. A fold nobody can see expiring is a fold that hides the next defect.
 * 2. **Workflow execution history does not cross, by design.** It lives in
 *    `<dataDir>/executions.sqlite`, a second file `migrate` never reads (it surveys `local.db`).
 *    After the move it is still there, still readable, still SQLite. That is a property an
 *    operator must be told rather than discover, so the drive measures it and §7 of the task file
 *    states it.
 *
 * 🔴 **Skipped when no PostgreSQL is reachable.** That skip is the CI hole BRG-006 exists to
 * close: `NODEGX_REQUIRE_PG=1` turns it into a failure, which is what the phase's gate sets.
 * `NODEGX_PG_TEST_URL=postgres://…` points it at another server.
 */
import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { main as cli } from '../src/cli';
import { logger } from '../src/ops/logger';
import { BackendService } from '../src/service';

import {
  MARK_NOTE,
  MARK_TABLE,
  PING_TABLE,
  PING_THRESHOLD,
  ROLE_NAME,
  UPLOAD_BYTES,
  UPLOAD_NAME,
  WAIT_MS,
  WORKFLOW_ID,
  extraComponents,
  securityWith,
  workflowDefinition
} from './fixtures/bridge-drive/additions';
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
import { openStream } from './helpers/sse';

jest.setTimeout(600_000);

// =================================================================================================
// Reachability — and the gate that makes the skip visible
// =================================================================================================

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const STAMP = `${process.pid}_${Date.now().toString(36)}`;
const TARGET_DB = `nodegx_brg006_${STAMP}`;

function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}

let reachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  reachable = true;
} catch {
  reachable = false;
}

/**
 * 🔴 The hole, closed where it is measured rather than described.
 *
 * Five spec files in this phase skip themselves when no PostgreSQL answers, which means a CI run
 * with no database is green and says nothing. `NODEGX_REQUIRE_PG=1` makes that a failure. The
 * phase's gate sets it; a developer's laptop does not, and keeps the skip.
 */
if (!reachable && process.env.NODEGX_REQUIRE_PG === '1') {
  throw new Error(
    `BRG-006: NODEGX_REQUIRE_PG=1 and no PostgreSQL answered at ${ADMIN_URL}. ` +
      'The bridge is unmeasured in this run — that is the condition this gate exists to fail on.'
  );
}

const describeIf = reachable ? describe : describe.skip;

// =================================================================================================
// The fixtures the app polls — FED-006's, read across rather than copied
// =================================================================================================

const FEEDS = path.join(__dirname, '..', '..', 'noodl-runtime', 'test', 'fixtures', 'feeds');

const SOURCES = [
  { route: '/blog.xml', file: 'rss2-blog.xml', kind: 'rss', title: 'The Slow Web', etag: '"blog-v1"' },
  { route: '/channel.xml', file: 'youtube-channel.xml', kind: 'atom', title: 'A channel', etag: undefined },
  { route: '/r/selfhosted.rss', file: 'reddit-subreddit.xml', kind: 'atom', title: 'r/selfhosted', etag: undefined }
] as const;

/** What the fake provider tags everything with, and what `Item.topics` therefore reads. */
const TOPICS = ['ai-coding', 'self-hosting'];
const TOPICS_STORED = TOPICS.join(', ');

const settle = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const sha256 = (buf: Buffer | string): string => crypto.createHash('sha256').update(buf).digest('hex');

function sha256File(file: string): string {
  return sha256(fs.readFileSync(file));
}

// =================================================================================================
// What one engine answers — the thing that is compared
// =================================================================================================

interface ListAnswer {
  count: number;
  sourceCount: number;
  ids: string[];
}

interface Snapshot {
  /** Every `Item` the polls wrote, by the feed's own id. Sorted: order is not the claim. */
  itemIds: string[];
  /** `Item.topics` for every row, deduplicated — the model's answer survived the move. */
  topics: string[];
  /** `myList` as Alice and as Bob, through a session token. */
  alice: ListAnswer;
  bob: ListAnswer;
  /**
   * Alice's own creator-owned rows, read twice: through her session, and through the scoped API
   * key BOUND to her. The two must agree, and neither may see Bob's.
   *
   * 🔴 Not `myList` through the key, which is what this first tried. The cloud `Request` node
   * decides "authenticated" from `x-parse-session-token` alone (`nodes/cloud/request.ts:220`), so
   * a bound key over `POST /functions/:name` is refused by a graph with `allowNoAuth: false` —
   * only `/mcp` mints an ephemeral session for one (`McpRoutes.sessionForGraph`). That asymmetry
   * is FED-005 §3.3 and phase 96's register R11: **known, documented, and identical on both
   * engines**, so it is terrain this drive routes around rather than a finding it makes.
   *
   * Reading `Follow` instead keeps what §3 actually asked for — a second auth path with different
   * enforcement — and makes the answer depend on the row ACL, which is the half that has to cross.
   */
  followsViaSession: string[];
  followsViaKey: string[];
  /** AC6 — a non-owner's read, update and delete of another person's row, two ways in. */
  denials: Record<string, number>;
  /** The relation: who is in the role, read back through the route that traverses the junction. */
  roleMembers: string[];
  /** The uploaded file, fetched back and hashed. */
  file: { status: number; sha256: string; contentType: string };
  /**
   * The workflow's own answer. `firstPinned` is raw — see BRG-D8 above.
   *
   * 🔴 `added`, not a total. Every probe runs the workflow again, so a total counts the rows this
   * probe wrote PLUS everything the migration carried — which grows by two per engine and would
   * make the comparison a statement about how many times `probe()` has been called.
   */
  marks: { added: number; firstNote: unknown; firstPinned: unknown };
  /** Mark rows as this probe FOUND them, and as it LEFT them. Compared across the move by hand. */
  marksAtStart: string[];
  marksAtEnd: string[];
  /**
   * 🔴 The SAME `Boolean` in the SAME row, read back three ways: `GET /api/:c`, `GET /classes/:c`,
   * and a cloud function's own `Query Records` node. BRG-D8 was measured on the first alone.
   */
  booleanReads: { viaApi: unknown; viaClasses: unknown; viaFunction: unknown };
  /** Which realtime frames arrived, and whether the filtered-out one leaked. */
  realtime: { delivered: string[]; excludedLeaked: boolean };
  /** Upsert-on-unique: one more poll must not duplicate a single row. */
  itemCountAfterAnotherPoll: number;
}

// =================================================================================================

describeIf('BRG-006 — the drive: a real app crosses', () => {
  let dataDir: string;
  let service: BackendService | null = null;
  let fixtures: http.Server;
  let fixtureUrl = '';
  let base = '';
  let adminToken = '';
  let targetUrl = '';

  const users: Record<string, { objectId: string; sessionToken: string }> = {};
  const sourceRowIds: Record<string, string> = {};
  let boundKey = '';

  const client = httpClient(() => base);
  const asAdmin = (): Record<string, string> => ({ authorization: `Bearer ${adminToken}` });
  const asUser = (who: string): Record<string, string> => ({ 'x-parse-session-token': users[who].sessionToken });
  const asKey = (): Record<string, string> => ({ 'X-NodeGX-Api-Key': boundKey });

  /** Filled in order by the stages below; every `it` reads these. */
  let control: Snapshot;
  let afterPg: Snapshot;
  let afterBack: Snapshot;
  let carryReport = '';
  let carryExit: number | undefined;
  let migrateOutput = '';
  let migrateExit: number | undefined;
  /** Byte-for-byte, either side of `migrate` itself — AC5's strict claim. */
  let filesBeforeMigrate: Record<string, string> = {};
  let filesAfterMigrate: Record<string, string> = {};
  /** The declaration only, either side of the WHOLE exercise — AC5's authorship claim. */
  let declaredBefore: Record<string, string> = {};
  let declaredAfter: Record<string, string> = {};
  let sourceDbSha = '';
  let sourceDbShaAfter = '';
  let executionsAfterCutover: { rows: number; file: string | null } = { rows: 0, file: null };
  let workflowElapsedMs = 0;
  let workflowRunText = '';

  // -----------------------------------------------------------------------------------------------
  // Stage helpers
  // -----------------------------------------------------------------------------------------------

  const dbPath = (): string => path.join(dataDir, 'data', 'local.db');

  async function startOn(storageUrl: string | null): Promise<void> {
    if (storageUrl) process.env.NODEGX_STORAGE_URL = storageUrl;
    else delete process.env.NODEGX_STORAGE_URL;
    service = new BackendService({ dataDir, port: 0, backendId: 'brg006', backendName: 'The Slow Web' });
    base = (await service.start()).listen.url;
  }

  async function stopService(): Promise<void> {
    if (service) await service.stop();
    service = null;
  }

  /**
   * Run one CLI command exactly as a person would, capturing what it printed and the exit code it
   * set. `main()` is the real entry point — the same parse, the same refusals, the same output.
   *
   * 🔴 `process.exitCode` is saved and restored. The CLI sets it on a refusal, and a test runner
   * that inherits a `1` nobody reset reports a red suite with every case green.
   */
  async function runCli(argv: string[]): Promise<{ out: string; exit: number | undefined }> {
    const chunks: string[] = [];
    const before = process.exitCode;
    process.exitCode = undefined;
    const outSpy = jest.spyOn(process.stdout, 'write').mockImplementation((c: string | Uint8Array) => {
      chunks.push(String(c));
      return true;
    });
    const errSpy = jest.spyOn(process.stderr, 'write').mockImplementation((c: string | Uint8Array) => {
      chunks.push(String(c));
      return true;
    });
    try {
      await cli(argv);
    } finally {
      outSpy.mockRestore();
      errSpy.mockRestore();
    }
    const exit = typeof process.exitCode === 'number' ? process.exitCode : undefined;
    process.exitCode = before;
    return { out: chunks.join(''), exit };
  }

  const executionsOf = async (workflowId: string): Promise<{ completedAt?: number; status: string }[]> => {
    const res = await client.request<{ completedAt?: number; status: string }[]>(
      `GET`,
      `/executions?workflowId=${encodeURIComponent(workflowId)}`,
      { headers: asAdmin() }
    );
    expect(res.status).toBe(200);
    return res.json;
  };

  /** FED-006's compression: arm the catch-up fire, wait for one more finished run, disarm. */
  async function armAndWaitForOnePoll(): Promise<void> {
    const finished = async (): Promise<number> =>
      (await executionsOf('pollSources')).filter((r) => r.completedAt).length;
    const before = await finished();

    expect(
      (
        await client.request('POST', `/admin/triggers/${TRIGGER_ID}/enabled`, {
          body: { enabled: true },
          headers: asAdmin()
        })
      ).status
    ).toBe(200);

    const deadline = Date.now() + 120_000;
    for (;;) {
      if ((await finished()) > before) break;
      if (Date.now() > deadline) throw new Error('BRG-006: no poll finished within 120s');
      await settle(500);
    }

    // Disarmed between stages for FED-006's reason: a real `* * * * *` will otherwise land an
    // unasked-for poll in the middle of a probe and move the counts it is comparing.
    expect(
      (
        await client.request('POST', `/admin/triggers/${TRIGGER_ID}/enabled`, {
          body: { enabled: false },
          headers: asAdmin()
        })
      ).status
    ).toBe(200);
  }

  const itemRows = async (): Promise<Record<string, string>[]> => {
    const res = await client.request<{ results: Record<string, string>[] }>('GET', '/classes/Item', {
      headers: asAdmin()
    });
    expect(res.status).toBe(200);
    return res.json.results;
  };

  async function callMyList(headers: Record<string, string>): Promise<ListAnswer> {
    const res = await client.request<{
      result?: { items?: { id: string }[]; count?: number; sourceCount?: number };
    }>('POST', '/functions/myList', { body: {}, headers });
    expect(res.status).toBe(200);
    const r = res.json.result || {};
    return {
      count: r.count ?? -1,
      sourceCount: r.sourceCount ?? -1,
      ids: (r.items || []).map((i) => i.id).sort()
    };
  }

  /** Alice's `Follow` rows by the source they point at — the creator-owned read, either way in. */
  async function followSourceIds(headers: Record<string, string>): Promise<string[]> {
    const res = await client.request<{ results: Record<string, string>[] }>('GET', '/classes/Follow', {
      headers
    });
    expect(res.status).toBe(200);
    return res.json.results.map((r) => r.sourceId).sort();
  }

  /**
   * AC6 — the row ACL, both ways in.
   *
   * Bob's `Keep` row is the subject. Alice is a signed-in stranger to it, and her API key is a
   * *second* principal with different enforcement (`security/state.ts`), which is why both are
   * here: a key that read the row would be a hole a session test cannot see.
   */
  async function denialCodes(bobKeepId: string): Promise<Record<string, number>> {
    const codes: Record<string, number> = {};
    const probes: [string, string, string, Record<string, string>, unknown][] = [
      ['session.get', 'GET', `/classes/Keep/${bobKeepId}`, asUser('alice'), undefined],
      ['session.update', 'PUT', `/classes/Keep/${bobKeepId}`, asUser('alice'), { value: 'stolen' }],
      ['session.delete', 'DELETE', `/classes/Keep/${bobKeepId}`, asUser('alice'), undefined],
      ['key.get', 'GET', `/classes/Keep/${bobKeepId}`, asKey(), undefined],
      ['key.update', 'PUT', `/classes/Keep/${bobKeepId}`, asKey(), { value: 'stolen' }],
      ['key.delete', 'DELETE', `/classes/Keep/${bobKeepId}`, asKey(), undefined]
    ];
    for (const [name, method, url, headers, body] of probes) {
      const res = await client.request(method, url, body === undefined ? { headers } : { body, headers });
      codes[name] = res.status;
    }
    // And the owner still can — an absence beside a signal that fires.
    const own = await client.request('GET', `/classes/Keep/${bobKeepId}`, { headers: asUser('bob') });
    codes['owner.get'] = own.status;
    return codes;
  }

  let bobKeepId = '';
  let storedFileName = '';

  /**
   * One engine's answer to every question AC1 records.
   *
   * Called three times — SQLite, PostgreSQL, SQLite again — and the three are compared. Nothing in
   * here asserts a VALUE; it collects them, so a behaviour both engines get wrong is still a
   * difference from nothing and shows up in the cases that read the counts directly.
   */
  async function probe(): Promise<Snapshot> {
    const rows = await itemRows();

    const alice = await callMyList(asUser('alice'));
    const bob = await callMyList(asUser('bob'));
    const followsViaSession = await followSourceIds(asUser('alice'));
    const followsViaKey = await followSourceIds(asKey());

    const denials = await denialCodes(bobKeepId);

    const roles = await client.request<{ roles?: { name: string; users?: string[] }[] }>('GET', '/admin/roles', {
      headers: asAdmin()
    });
    expect(roles.status).toBe(200);
    const role = (roles.json.roles || []).find((r) => r.name === ROLE_NAME);
    const roleMembers = (role?.users || []).slice().sort();

    const fetched = await client.request('GET', `/files/${encodeURIComponent(storedFileName)}`, {
      headers: asUser('alice')
    });
    const fileBytes = await downloadFile(storedFileName, asUser('alice'));

    // ----- realtime: one filtered subscription, one excluded write, one delivered write ---------
    const stream = await openStream(base, asUser('alice'));
    const connected = await stream.waitFor('connected');
    const subscribed = await client.request('POST', '/realtime/subscriptions', {
      body: {
        clientId: connected.data.clientId,
        subscriptions: [{ collection: PING_TABLE.table, filter: { priority: { $gte: PING_THRESHOLD } } }]
      },
      headers: asUser('alice')
    });
    expect(subscribed.status).toBe(200);

    const low = await client.request<{ objectId: string }>('POST', `/classes/${PING_TABLE.table}`, {
      body: { title: 'quiet', priority: PING_THRESHOLD - 1 },
      headers: asUser('alice')
    });
    expect(low.status).toBe(201);
    const high = await client.request<{ objectId: string }>('POST', `/classes/${PING_TABLE.table}`, {
      body: { title: 'loud', priority: PING_THRESHOLD },
      headers: asUser('alice')
    });
    expect(high.status).toBe(201);

    await stream.waitFor('change', (d) => d.record.objectId === high.json.objectId);
    // The excluded write is given the same grace the delivered one took, so "it never arrived" is
    // a statement about the filter and not about the clock.
    await settle(250);
    const delivered = stream
      .changes()
      .map((f) => String((f.data.record as { title?: string }).title))
      .filter((t) => t !== 'undefined');
    const excludedLeaked = delivered.includes('quiet');
    stream.close();

    // ----- the workflow: for-each, a wait across the step boundary, then the tally -------------
    const marksAtStart = await markRows();
    const marks = await runWorkflow(rows.slice(0, 2).map((r) => r.id), marksAtStart.length);
    const marksAtEnd = await markRows();
    const classesRows = await markRowsRaw('/classes');
    const apiRows = await markRowsRaw('/api');
    const booleanReads = {
      viaApi: apiRows.length ? apiRows[0].pinned : null,
      viaClasses: classesRows.length ? classesRows[0].pinned : null,
      viaFunction: marks.firstPinned
    };

    // ----- upsert-on-unique: one more poll, and not one duplicate row --------------------------
    await armAndWaitForOnePoll();
    const after = await itemRows();

    return {
      itemIds: rows.map((r) => r.id).sort(),
      topics: Array.from(new Set(rows.map((r) => r.topics))).sort(),
      alice,
      bob,
      followsViaSession,
      followsViaKey,
      denials,
      roleMembers,
      file: {
        status: fetched.status,
        sha256: sha256(fileBytes),
        contentType: String(fetched.headers.get('content-type') || '')
      },
      marks,
      marksAtStart,
      marksAtEnd,
      booleanReads,
      realtime: { delivered: delivered.slice().sort(), excludedLeaked },
      itemCountAfterAnotherPoll: after.length
    };
  }

  /** Fetch a stored file as bytes. `request()` decodes JSON, and a PNG is not JSON. */
  async function downloadFile(name: string, headers: Record<string, string>): Promise<Buffer> {
    const res = await fetch(`${base}/files/${encodeURIComponent(name)}`, { headers });
    return Buffer.from(await res.arrayBuffer());
  }

  /**
   * Run the workflow once and return its answer.
   *
   * The elapsed time is kept because §3's reason for asking for a `wait` is occupancy: the run has
   * to still be a run on the other side of the step boundary, and a `wait` that returned instantly
   * would satisfy every assertion about the tally while measuring nothing about the boundary.
   */
  async function runWorkflow(itemIds: string[], before: number): Promise<Snapshot['marks']> {
    const started = Date.now();
    // 🔴 `run.output.result` — two unwrappings, and both were wrong on the first try.
    //
    // CWF-002 named the run's answer `output`, not `result`: it is the last successfully-run
    // step's own output when there is no `return` step. And that output is the cloud function's
    // HTTP body, which a `Response` node wraps in `result` exactly as `POST /functions/:name`
    // does. Reading either key alone gives `undefined`, `undefined ?? -1` is a number, and the
    // run stays green while the count goes quietly wrong — which is why the case below throws
    // with the whole answer in it rather than comparing two integers.
    const res = await client.request<{
      run?: { status?: string; output?: { result?: Record<string, unknown> } };
    }>('POST', `/admin/workflow-defs/${WORKFLOW_ID}/run`, {
      body: { items: itemIds.map((id) => ({ itemId: id, byUserId: users.alice.objectId })) },
      headers: asAdmin()
    });
    workflowElapsedMs = Date.now() - started;
    expect(res.status).toBe(200);
    // R1's shape from the outside: a run that did not succeed says what it did instead, here,
    // rather than as a `-1` three assertions later.
    workflowRunText = res.text;
    const result = (res.json.run?.output?.result || {}) as Record<string, unknown>;
    return {
      added: Number(result.marked ?? -1) - before,
      firstNote: result.firstNote ?? null,
      firstPinned: result.firstPinned ?? null
    };
  }

  /** Every `Mark` row over one of the two REST surfaces, sorted by `itemId`. */
  async function markRowsRaw(prefix: '/classes' | '/api' = '/classes'): Promise<Record<string, unknown>[]> {
    const res = await client.request<{ results: Record<string, unknown>[] }>('GET', `${prefix}/Mark`, {
      headers: asAdmin()
    });
    expect(res.status).toBe(200);
    return res.json.results
      .slice()
      .sort((a, b) => String(a.itemId).localeCompare(String(b.itemId)));
  }

  /** The same rows as `itemId|note`, so the identity compared is the app's and not a rowid. */
  async function markRows(): Promise<string[]> {
    return (await markRowsRaw()).map((r) => `${String(r.itemId)}|${String(r.note)}`).sort();
  }

  /**
   * AC5's hash set — the project as a person wrote it.
   *
   * `security.json`, the deployed graphs and the workflow definition are hashed byte for byte.
   * `triggers.json` is hashed with `status` stripped from each trigger, and that is a decision:
   * `status` holds `lastFiredAt` and `fireCount`, which the scheduler writes every time the
   * schedule fires. It is runtime state that happens to share a file with a declaration, and
   * asserting it were unchanged would assert that the app did not run.
   */
  function projectFiles(): string[] {
    const files = [path.join(dataDir, 'security.json'), path.join(dataDir, 'triggers.json')];
    for (const dir of ['workflows', 'workflow-defs']) {
      const full = path.join(dataDir, dir);
      if (!fs.existsSync(full)) continue;
      for (const f of fs.readdirSync(full).sort()) files.push(path.join(full, f));
    }
    return files;
  }

  /** Every project file, byte for byte. The pair either side of `migrate` is AC5's strict claim. */
  function hashFiles(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of projectFiles()) out[path.relative(dataDir, f)] = sha256File(f);
    return out;
  }

  /**
   * The same files with RUNTIME STATE projected out, for the comparison across the whole exercise.
   *
   * Three fields on a trigger are written by the service, not by the person: `status` (which holds
   * `lastFiredAt` and `fireCount`), `enabled` (which this drive itself toggles six times, and the
   * admin route is the supported way to do it), and `updatedAt` (stamped by that same route). They
   * live in a file beside the declaration, and asserting they were unchanged across the exercise
   * would be asserting that the app did not run — which is the opposite of what a drive is for.
   *
   * 🔴 So AC5 is graded TWICE and the strict half is the one that owns the criterion: nothing
   * changed at all across `migrate`, and nothing a person AUTHORED changed across everything.
   */
  function hashDeclarations(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of projectFiles()) {
      const rel = path.relative(dataDir, f);
      if (rel !== 'triggers.json') {
        out[rel] = sha256File(f);
        continue;
      }
      const parsed = JSON.parse(fs.readFileSync(f, 'utf-8')) as { triggers: Record<string, unknown>[] };
      const declared = parsed.triggers.map(({ status, enabled, updatedAt, ...rest }) => {
        void status;
        void enabled;
        void updatedAt;
        return rest;
      });
      out['triggers.json(declaration)'] = sha256(JSON.stringify(declared));
    }
    return out;
  }

  // -----------------------------------------------------------------------------------------------
  // The drive
  // -----------------------------------------------------------------------------------------------

  beforeAll(async () => {
    process.env.NODEGX_LOG_LEVEL = 'silent';
    logger.configure({ level: 'silent' });
    delete process.env.NODEGX_STORAGE_URL;

    // ----- the fixture world (FED-006's feeds, and a model that tags anything) -----------------
    fixtures = http.createServer((req, res) => {
      const route = String(req.url);

      // 🔴 `/model/...` as well as `/model`. `Model Request` appends the provider's own path to
      // the base URL, so an exact match answers 404 for every call and the whole poll then fails
      // with a runtime error rather than a tagged row — which is exactly what the first run of
      // this drive did. The answer shape is Anthropic's, thinking block and all, because that is
      // what the node parses.
      if (route === '/model' || route.startsWith('/model/')) {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'msg_brg006',
              type: 'message',
              role: 'assistant',
              model: 'claude-opus-5',
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
        res.writeHead(404);
        res.end();
        return;
      }

      // FED-001's subreddit fixture refuses a caller with no name on it, which is what reddit
      // does. Kept, because a drive that quietly relaxed a fixture would be driving a different
      // app from the one phase 96 shipped.
      if (source.route === '/r/selfhosted.rss' && !req.headers['user-agent']) {
        res.writeHead(403);
        res.end('no user-agent');
        return;
      }

      if (source.etag) {
        res.setHeader('etag', source.etag);
        if (req.headers['if-none-match'] === source.etag) {
          res.writeHead(304);
          res.end();
          return;
        }
      }

      res.writeHead(200, { 'content-type': 'application/rss+xml; charset=utf-8' });
      res.end(fs.readFileSync(path.join(FEEDS, source.file)));
    });
    await new Promise<void>((resolve) => fixtures.listen(0, '127.0.0.1', resolve));
    fixtureUrl = `http://127.0.0.1:${(fixtures.address() as { port: number }).port}`;

    // ----- the project on disk: FED-006's, composed with BRG-006's additions -------------------
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg006-drive-'));
    fs.writeFileSync(
      path.join(dataDir, 'security.json'),
      JSON.stringify(securityWith(SECURITY as never), null, 2)
    );
    const triggers = triggersFile('run-once-on-start');
    triggers.triggers[0].enabled = false;
    fs.writeFileSync(path.join(dataDir, 'triggers.json'), JSON.stringify(triggers, null, 2));

    const bundle = workflowBundle();
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'feed-reader.workflow.json'),
      JSON.stringify({ ...bundle, components: [...bundle.components, ...extraComponents()] })
    );

    fs.mkdirSync(path.join(dataDir, 'workflow-defs'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflow-defs', `${WORKFLOW_ID}.workflow-def.json`),
      JSON.stringify(workflowDefinition(), null, 2) + '\n'
    );

    await startOn(null);

    const secretsPath = path.join(dataDir, 'secrets.json');
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
    adminToken = secrets.adminToken;
    secrets.functions = {
      ...(secrets.functions || {}),
      [MODEL_KEY_SECRET]: MODEL_KEY,
      [MODEL_BASE_URL_SECRET]: `${fixtureUrl}/model`
    };
    fs.writeFileSync(secretsPath, JSON.stringify(secrets));

    // ----- the schema: FED-006's four tables, plus the drive's two ----------------------------
    for (const decl of [...SCHEMA, MARK_TABLE, PING_TABLE]) {
      const pushed = await client.request('POST', '/admin/schema', {
        body: { action: 'createTable', table: decl.table, columns: decl.columns, indexes: decl.indexes },
        headers: asAdmin()
      });
      expect(pushed.status).toBe(200);
    }

    // ----- the app's own data: sources, two people, their follows ------------------------------
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

    for (const [who, route] of [
      ['alice', '/blog.xml'],
      ['alice', '/channel.xml'],
      ['bob', '/r/selfhosted.rss']
    ] as [string, string][]) {
      const created = await client.request('POST', '/classes/Follow', {
        body: { userId: users[who].objectId, sourceId: sourceRowIds[route] },
        headers: asUser(who)
      });
      expect(created.status).toBe(201);
    }

    // Bob's row, which Alice must not be able to touch. AC6's subject.
    const keep = await client.request<{ objectId: string }>('POST', '/classes/Keep', {
      body: { userId: users.bob.objectId, itemId: 'anything', value: 'bob-only' },
      headers: asUser('bob')
    });
    expect(keep.status).toBe(201);
    bobKeepId = keep.json.objectId;

    // The API key, BOUND to Alice: a second principal with its own enforcement.
    const key = await client.request<{ secret: string }>('POST', '/admin/keys', {
      body: { name: 'alice-laptop', scopes: ['classes:read', 'functions:*'], actsAsUserId: users.alice.objectId },
      headers: asAdmin()
    });
    expect(key.status).toBe(201);
    boundKey = key.json.secret;

    // The relation: a role, and a member in it. `_Join_users__Role` is what has to cross.
    expect(
      (await client.request('POST', '/admin/roles', { body: { name: ROLE_NAME }, headers: asAdmin() })).status
    ).toBe(201);
    expect(
      (
        await client.request('POST', `/admin/roles/${ROLE_NAME}/users`, {
          body: { userId: users.alice.objectId },
          headers: asAdmin()
        })
      ).status
    ).toBe(200);

    // The file. Storage should be untouched by the database moving — "should be" is why it is here.
    // 🔴 The name a file is STORED under is not the name it was posted under: `POST /files/:name`
    // answers with `{ url, name }` and the stored name carries a uniquifier (`server/files.ts:165`).
    // Fetching back under the posted name is a 404 — which is what the first run of this drive
    // measured, and it would have read as "the file did not cross" on every engine equally.
    const uploaded = await client.request<{ name: string; url: string }>('POST', `/files/${UPLOAD_NAME}`, {
      body: UPLOAD_BYTES,
      headers: { ...asUser('alice'), 'content-type': 'image/png' },
      raw: true
    });
    expect(uploaded.status).toBe(201);
    storedFileName = uploaded.json.name;
    expect(storedFileName).toBeTruthy();

    // ----- two schedule fires, and the control ------------------------------------------------
    await armAndWaitForOnePoll();
    await armAndWaitForOnePoll();

    control = await probe();

    // AC5's baseline is taken HERE — after the app has run, before anything moves. Taken before
    // the run it would be a hash of files the service had not yet normalised, and the difference
    // would be the service's, not the migration's.
    declaredBefore = hashDeclarations();

    // -------------------------------------------------------------------------------------------
    // The move
    // -------------------------------------------------------------------------------------------
    await stopService();
    sourceDbSha = sha256File(dbPath());
    filesBeforeMigrate = hashFiles();

    psql(ADMIN_URL, `CREATE DATABASE ${TARGET_DB}`);
    // The admin URL with its database name swapped — never rebuilt from parts, so whatever
    // credentials, host and port reached the server a moment ago reach the new database too.
    targetUrl = ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${TARGET_DB}$1`);

    const dry = await runCli(['migrate', '--data-dir', dataDir, '--to', targetUrl, '--dry-run']);
    carryReport = dry.out;
    carryExit = dry.exit;

    const moved = await runCli(['migrate', '--data-dir', dataDir, '--to', targetUrl]);
    migrateOutput = moved.out;
    migrateExit = moved.exit;

    sourceDbShaAfter = sha256File(dbPath());
    filesAfterMigrate = hashFiles();

    // -------------------------------------------------------------------------------------------
    // The cutover, and the same questions again
    // -------------------------------------------------------------------------------------------
    await startOn(targetUrl);
    afterPg = await probe();

    const execFile = path.join(dataDir, 'executions.sqlite');
    executionsAfterCutover = {
      rows: (await executionsOf('pollSources')).length,
      file: fs.existsSync(execFile) ? 'sqlite' : null
    };

    // -------------------------------------------------------------------------------------------
    // AC7 — going back
    // -------------------------------------------------------------------------------------------
    await stopService();
    await startOn(null);
    afterBack = await probe();
    declaredAfter = hashDeclarations();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await stopService();
    delete process.env.NODEGX_STORAGE_URL;
    if (fixtures) await new Promise<void>((resolve) => fixtures.close(() => resolve()));
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${TARGET_DB} WITH (FORCE)`);
    } catch {
      /* the database is a per-run name; a failure here is not a failure of the drive */
    }
  });

  // ===============================================================================================
  // AC1 — the control is real
  // ===============================================================================================

  describe('AC1 — the app runs on SQLite, and its behaviour is recorded', () => {
    it('polled three feeds and wrote every item once, tagged', () => {
      expect(control.itemIds.length).toBeGreaterThan(0);
      expect(new Set(control.itemIds).size).toBe(control.itemIds.length);
      expect(control.topics).toEqual([TOPICS_STORED]);
    });

    it('answers each person their own list, and the API key answers the same as the session', () => {
      expect(control.alice.sourceCount).toBe(2);
      expect(control.bob.sourceCount).toBe(1);
      expect(control.alice.ids).not.toEqual(control.bob.ids);
      // The key bound to Alice sees exactly Alice's creator-owned rows — the same two her session
      // sees, and not the one Bob owns.
      expect(control.followsViaKey).toEqual(control.followsViaSession);
      expect(control.followsViaSession).toEqual(
        [sourceRowIds['/blog.xml'], sourceRowIds['/channel.xml']].sort()
      );
    });

    it('denies a non-owner and allows the owner — the signal the denials sit beside', () => {
      expect(control.denials['owner.get']).toBe(200);
      for (const probe of ['session.get', 'session.update', 'session.delete', 'key.get', 'key.update', 'key.delete']) {
        expect(control.denials[probe]).toBeGreaterThanOrEqual(400);
      }
    });

    it('holds the relation, the file and a realtime frame', () => {
      expect(control.roleMembers).toEqual([users.alice.objectId]);
      expect(control.file.status).toBe(200);
      expect(control.file.sha256).toBe(sha256(UPLOAD_BYTES));
      expect(control.realtime.delivered).toContain('loud');
      expect(control.realtime.excludedLeaked).toBe(false);
    });

    it('ran the workflow: a for-each, a wait across the step boundary, then the tally', () => {
      expect(workflowRunText).toContain('"status":"success"');
      // R1's shape from the outside: a run that wrote the wrong number of rows says what it
      // ANSWERED, here, instead of failing as a bare `-1` that names no step.
      if (control.marks.added !== 2) {
        throw new Error(`the workflow did not write two marks. The run answered: ${workflowRunText}`);
      }
      expect(control.marks.firstNote).toBe(MARK_NOTE);
      // §3's claim is occupancy, not duration: the run was still a run on the far side of the wait.
      expect(workflowElapsedMs).toBeGreaterThanOrEqual(WAIT_MS);
    });
  });

  // ===============================================================================================
  // AC2 / AC3 — the command
  // ===============================================================================================

  describe('AC2 — the carry report is clean, and says so by name', () => {
    it('exits 0 and names nothing that cannot cross', () => {
      expect(carryExit).toBeUndefined();
      expect(carryReport).not.toMatch(/cannot-cross/);
    });

    it('names the system tables a reader would not think to check', () => {
      // The finding the survey exists to carry: `exportSchemas()` filters `_%`, so a migrator
      // built on it carries an app with no accounts.
      for (const name of ['_User', '_Session', '_Role', 'Item', 'Follow', 'Keep', 'Mark', 'Ping']) {
        expect(carryReport).toContain(name);
      }
    });

    it('is recorded as part of the drive when a record directory is given', () => {
      const dir = process.env.BRG006_RECORD_DIR;
      if (dir) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'carry-report.txt'), carryReport);
        fs.writeFileSync(path.join(dir, 'migrate.txt'), migrateOutput);
      }
      expect(carryReport.length).toBeGreaterThan(0);
    });
  });

  describe('AC3 — migrate runs to completion and verify is green', () => {
    it('exits 0', () => {
      expect(migrateExit).toBeUndefined();
    });

    it('verified its own work, and said the source is unchanged', () => {
      expect(migrateOutput).toMatch(/Source unchanged/);
      expect(migrateOutput).not.toMatch(/do not cut over/);
    });

    it('left the source database byte-identical', () => {
      expect(sourceDbShaAfter).toBe(sourceDbSha);
    });
  });

  // ===============================================================================================
  // AC4 — the app on Postgres answers what it answered on SQLite
  // ===============================================================================================

  describe('AC4 — every recorded behaviour is reproduced, compared against the control', () => {
    /**
     * 🔴 The whole criterion, in one line.
     *
     * Everything but the two declared divergences. If this is green the app did not notice the
     * move; if it is red the diff names the field that did.
     */
    it('the snapshot on Postgres equals the snapshot on SQLite', () => {
      expect(normalise(afterPg)).toEqual(normalise(control));
    });

    it('and the upsert on a unique index still deduplicates after the move', () => {
      expect(afterPg.itemCountAfterAnotherPoll).toBe(afterPg.itemIds.length);
    });
  });

  // ===============================================================================================
  // The two declared divergences, each measured where it is
  // ===============================================================================================

  describe('the declared divergences — measured, not smoothed', () => {
    /**
     * 🔴 BRG-D8, end to end — and **bounded**, which is what this drive added to it.
     *
     * BRG-004 s9 measured the divergence over `GET /api/:collection` alone and filed it as a
     * difference between two ENGINES. This drive read the same column in the same row three ways,
     * on both engines, and the table is not what the filing says:
     *
     * | read through | SQLite | PostgreSQL |
     * |---|---|---|
     * | `GET /api/Mark` | **`1`** | `true` |
     * | `GET /classes/Mark` | **`true`** | `true` |
     * | a cloud function's `Query Records` | `true` | `true` |
     *
     * 🔴 **`/api` and `/classes` disagree with each other on ONE engine, today, with no
     * PostgreSQL anywhere near it.** Two REST surfaces over the same store, the same row and
     * the same column, answering `1` and `true`. That is BRG-D10, filed on its own: it is a
     * product defect the bridge did not cause and would never have found, and it is strictly
     * larger than BRG-D8, which turns out to be one cell of it.
     *
     * It also changes the ruling BRG-D8 is waiting on. The argument for keeping SQLite's `0`/`1`
     * is "every existing app reads that" — and it is false as stated: an app on `/classes`, and
     * every NodeGX graph reading its own data, already gets `true`. Only `/api` on SQLite reads
     * `1`, and moving to PostgreSQL makes it agree with everything else.
     *
     * When BRG-D8 is repaired this case goes red, and the repair is not finished until
     * `normalise()` has lost its `booleanReads` fold. A fold nobody can see expiring is a fold
     * that hides the next defect.
     */
    it('BRG-D8: the divergence is in the REST reader, not in storage — a graph already agrees', () => {
      // BRG-D8 as filed, reproduced in a running app: `/api` differs across the move.
      expect(control.booleanReads.viaApi).toBe(1);
      expect(afterPg.booleanReads.viaApi).toBe(true);

      // 🔴 BRG-D10: on SQLite, the OTHER prefix over the same row already says `true`. One engine,
      // one record, one column, two routes, two answers.
      expect(control.booleanReads.viaClasses).toBe(true);
      expect(control.booleanReads.viaApi).not.toBe(control.booleanReads.viaClasses);

      // And on PostgreSQL every reader agrees — which is what makes `/api` on SQLite the outlier
      // rather than PostgreSQL the odd one out.
      expect(afterPg.booleanReads.viaClasses).toBe(true);
      expect(control.booleanReads.viaFunction).toBe(true);
      expect(afterPg.booleanReads.viaFunction).toBe(true);

      // The control that says this is about `Boolean` and not about the write: the `String`
      // written by the same node in the same write reads identically everywhere.
      expect(afterPg.marks.firstNote).toBe(control.marks.firstNote);
      expect(control.marks.firstNote).toBe(MARK_NOTE);
    });

    it('execution history stays in executions.sqlite — migrate never surveyed it', () => {
      expect(executionsAfterCutover.file).toBe('sqlite');
      expect(executionsAfterCutover.rows).toBeGreaterThan(0);
    });
  });

  // ===============================================================================================
  // AC5 — nothing the person wrote changed
  // ===============================================================================================

  describe('AC5 — zero changes to the project', () => {
    it('migrate itself changed not one byte of any project file', () => {
      expect(filesAfterMigrate).toEqual(filesBeforeMigrate);
    });

    it('and nothing a person AUTHORED changed across the whole exercise', () => {
      expect(declaredAfter).toEqual(declaredBefore);
    });

    it('over a hash set that is not empty — an equality over two empty objects proves nothing', () => {
      expect(Object.keys(filesBeforeMigrate).sort()).toEqual([
        'security.json',
        'triggers.json',
        'workflow-defs/wf_brg006_pin.workflow-def.json',
        'workflows/feed-reader.workflow.json'
      ]);
      expect(Object.keys(declaredBefore).sort()).toEqual([
        'security.json',
        'triggers.json(declaration)',
        'workflow-defs/wf_brg006_pin.workflow-def.json',
        'workflows/feed-reader.workflow.json'
      ]);
    });
  });

  // ===============================================================================================
  // AC6 — the row ACL, on Postgres, through both principals
  // ===============================================================================================

  describe('AC6 — a non-owner is still denied, through session and API key', () => {
    it('re-runs AC1’s denials on Postgres and gets the same codes', () => {
      expect(afterPg.denials).toEqual(control.denials);
    });

    it('and the owner still reads their own row — the signal beside the absence', () => {
      expect(afterPg.denials['owner.get']).toBe(200);
    });
  });

  // ===============================================================================================
  // AC7 — going back
  // ===============================================================================================

  describe('AC7 — the way back', () => {
    it('serves again from the untouched SQLite file', () => {
      expect(normalise(afterBack)).toEqual(normalise(control));
    });

    it('and the file is the one AC1 hashed', () => {
      expect(sha256File(dbPath())).toBe(sourceDbSha);
    });
  });
});

/**
 * Fold the ONE declared difference out of a snapshot, and nothing else.
 *
 * `marks.firstPinned` is BRG-D8 and is asserted by name above. Everything else is compared as it
 * came back. 🔴 Adding a second entry here without a case that states the divergence is how a
 * drive stops measuring: see the case above for the shape the next one must take.
 *
 * `itemCountAfterAnotherPoll` is dropped because it is a count of the same rows taken at a
 * different moment on each engine, and AC4 asserts it directly instead.
 */
function normalise(s: Snapshot): Record<string, unknown> {
  const { marks, itemCountAfterAnotherPoll, marksAtStart, marksAtEnd, booleanReads, ...rest } = s;
  void itemCountAfterAnotherPoll;
  void marksAtStart;
  void marksAtEnd;
  void booleanReads;
  return { ...rest, marks: { added: marks.added, firstNote: marks.firstNote } };
}
