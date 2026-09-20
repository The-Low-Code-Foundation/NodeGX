/**
 * BAK-005 — the served admin dashboard.
 *
 * Three levels, because three different things can break:
 *
 *   1. Pure policy (no server): the read-only rule and the failure budget.
 *   2. Document assembly: the page is genuinely self-contained and genuinely
 *      substituted. This level exists because a mis-substituted page still
 *      returns 200 with a plausible byte count — the first live load of this
 *      dashboard shipped its entire stylesheet inside an HTML comment while
 *      looking perfectly healthy over curl.
 *   3. End-to-end over real HTTP against a LOCKED backend: who can sign in,
 *      what the read-only tier can and cannot do, `--no-admin`, and the
 *      delete-table capability this task was asked to finally wire up.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { DashboardFeatures } from '../src/admin/AdminDashboardRoutes';
import type { SchemaResponse } from '../src/server/byob-admin';
import { BackendService } from '../src/service';
import { ExecutionHistory } from '../src/execution/ExecutionStore';

import type { ErrorBody, ParseQueryResult, ParseRecord } from './helpers/http';

/**
 * Every body the dashboard suite reads: records, query envelopes, error
 * envelopes and the schema listing. Same reasoning as security-enforcement's
 * `SpecBody` — one named union beats `any` at every call site, and the fields
 * that are actually asserted on are the ones that get checked.
 */
type SpecBody = ParseRecord & Partial<ParseQueryResult> & Partial<ErrorBody> & Partial<SchemaResponse>;
import { SecurityStartupError } from '../src/security/state';
import { AuthAttemptLimiter } from '../src/admin/auth';
import { READONLY_SAFE_ROUTES, readonlyAdminMayCall } from '../src/admin/readonly';

jest.setTimeout(30000);

const LOCKED_CONFIG = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: true
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

const UI_DIR = path.join(__dirname, '..', 'src', 'admin', 'ui');

/**
 * The executions view's own row-extraction expression, lifted out of the served document and
 * compiled. Reading it rather than restating it is what makes the spec below a gate on the PAGE
 * instead of a gate on a copy of the page.
 */
function executionsExtraction(): (data: unknown) => unknown {
  const html = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf-8');
  const at = html.indexOf("api('GET', '/executions?'");
  if (at < 0) throw new Error('the executions view no longer calls /executions — re-point this spec');
  const decl = html.indexOf('var rows =', at);
  const end = html.indexOf(';', decl);
  if (decl < 0 || end < 0) throw new Error('the executions view no longer assigns `var rows` — re-point this spec');
  const expr = html.slice(decl + 'var rows ='.length, end).trim();
  return new Function('data', `return ${expr};`) as (data: unknown) => unknown;
}

/**
 * 🔴 FED-007 AC2 — the two surfaces this suite has to hold together.
 *
 * The dashboard's status vocabulary drifted three ways from the store's (`failed` and
 * `cancelled`, which the store has never written; no `error`, which is the only failure value)
 * and NOTHING caught it, because this document is a string to esbuild's text loader and no
 * compiler reads it. The editor's own filter never drifted — it is declared
 * `ExecutionStatus | ''` and the compiler checks it.
 *
 * So both of these read the LIVE text rather than restating it: the union out of the type file
 * the store is typed by, and the array out of the page that ships.
 */
function executionStatusUnion(): string[] {
  return typeUnion('ExecutionStatus');
}

/** The page's own status list, compiled out of the shipped document. `''` is "any status". */
function dashboardStatusOptions(): string[] {
  const html = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf-8');
  const decl = /var EXECUTION_STATUSES\s*=\s*(\[[^\]]*\])/.exec(html);
  if (!decl) throw new Error('the page no longer declares EXECUTION_STATUSES — re-point this spec');
  return new Function(`return ${decl[1]};`)() as string[];
}

/** The page's own status → affordance mapping, compiled out of the shipped document. */
function dashboardStatusKind(which: 'executionStatusKind' | 'stepStatusKind' = 'executionStatusKind'): (
  status: string
) => string {
  const html = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf-8');
  const at = html.indexOf(`function ${which}(value) {`);
  if (at < 0) throw new Error(`the page no longer declares ${which} — re-point this spec`);
  const end = html.indexOf('\n    }', at);
  const body = html.slice(html.indexOf('{', at) + 1, end);
  return new Function('value', body) as (status: string) => string;
}

/** A union of string literals declared in the execution-history types, read live. */
function typeUnion(name: string): string[] {
  const types = path.join(__dirname, '..', '..', 'noodl-viewer-cloud', 'src', 'execution-history', 'types.ts');
  const source = fs.readFileSync(types, 'utf-8');
  const decl = new RegExp(`export type ${name}\\s*=([^;]+);`).exec(source);
  if (!decl) throw new Error(`${name} is no longer declared where this spec looks — re-point it`);
  const values = decl[1].match(/'([^']+)'/g);
  if (!values) throw new Error(`${name} is no longer a union of string literals — re-point this spec`);
  return values.map((v) => v.replace(/'/g, ''));
}

/** The page's own STEP status list, compiled out of the shipped document. FED-007 AC3. */
function dashboardStepStatuses(): string[] {
  const html = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf-8');
  const decl = /var STEP_STATUSES\s*=\s*(\[[^\]]*\])/.exec(html);
  if (!decl) throw new Error('the page no longer declares STEP_STATUSES — re-point this spec');
  return new Function(`return ${decl[1]};`)() as string[];
}

/** The record reduction the opened-execution view is built from. FED-007 AC3–AC5. */
function dashboardRecordSummary(): (record: unknown) => {
  status: string;
  workflow: string;
  costLine: string;
  stepCount: number;
  failures: Array<{ index: number; step: string; type: string; message: string; detail: unknown }>;
} {
  const html = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf-8');
  const at = html.indexOf('function recordSummary(record) {');
  if (at < 0) throw new Error('the page no longer declares recordSummary — re-point this spec');
  const end = html.indexOf('\n    }', at);
  const body = html.slice(html.indexOf('{', at) + 1, end);
  return new Function('record', body) as never;
}

// ============================================================================
// 1. Policy, with no server in the way
// ============================================================================

describe('BAK-005 read-only policy', () => {
  it('permits every safe method', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(readonlyAdminMayCall(method, 'admin/schema')).toBe(true);
      expect(readonlyAdminMayCall(method, 'api/:table')).toBe(true);
    }
  });

  it('refuses state-changing methods by DEFAULT, including routes it has never heard of', () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      expect(readonlyAdminMayCall(method, 'admin/schema')).toBe(false);
      // The point of the coarse rule: a route added by a future task is
      // refused without anyone remembering to annotate it.
      expect(readonlyAdminMayCall(method, 'admin/some-future-task/thing')).toBe(false);
    }
  });

  it('permits exactly the reviewed safe-POST set, and nothing adjacent to it', () => {
    for (const pattern of READONLY_SAFE_ROUTES) {
      expect(readonlyAdminMayCall('POST', pattern)).toBe(true);
    }
    // The mutating sibling of a safe route must not be swept in.
    expect(READONLY_SAFE_ROUTES.has('admin/schema/diff')).toBe(true);
    expect(readonlyAdminMayCall('POST', 'admin/schema/apply')).toBe(false);
    expect(readonlyAdminMayCall('POST', 'admin/backups/restore')).toBe(false);
  });
});

describe('BAK-005 credential failure budget', () => {
  it('locks out only after the budget is spent, and only that client', () => {
    const limiter = new AuthAttemptLimiter(3, 60_000);
    expect(limiter.isLockedOut('1.2.3.4')).toBe(false);
    limiter.recordFailure('1.2.3.4');
    limiter.recordFailure('1.2.3.4');
    expect(limiter.isLockedOut('1.2.3.4')).toBe(false);
    limiter.recordFailure('1.2.3.4');
    expect(limiter.isLockedOut('1.2.3.4')).toBe(true);
    expect(limiter.isLockedOut('5.6.7.8')).toBe(false);
    expect(limiter.retryAfterSeconds('1.2.3.4')).toBeGreaterThan(0);
  });

  it('forgets the window once it expires', async () => {
    const limiter = new AuthAttemptLimiter(1, 30);
    limiter.recordFailure('k');
    expect(limiter.isLockedOut('k')).toBe(true);
    await new Promise((r) => setTimeout(r, 60));
    expect(limiter.isLockedOut('k')).toBe(false);
  });

  it('successes do not launder a guessing run (only failures are counted)', () => {
    const limiter = new AuthAttemptLimiter(2, 60_000);
    limiter.recordFailure('k');
    // There is deliberately no recordSuccess(): a valid session running
    // alongside an attack must not refill the attacker's budget.
    expect(typeof (limiter as unknown as Record<string, unknown>).recordSuccess).toBe('undefined');
    limiter.recordFailure('k');
    expect(limiter.isLockedOut('k')).toBe(true);
  });
});

// ============================================================================
// 2. The document itself
// ============================================================================

describe('BAK-005 dashboard document', () => {
  const html = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf-8');
  const css = fs.readFileSync(path.join(UI_DIR, 'styles.css'), 'utf-8');

  function occurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
  }

  it('carries each substitution marker exactly where it belongs', () => {
    // Assembled from fragments so this assertion does not become its own
    // second occurrence — which is exactly the bug it guards against.
    expect(occurrences(html, '/*__ADMIN' + '_CSS__*/')).toBe(1);
    // One for the style tag, one for the script tag.
    expect(occurrences(html, '__CSP' + '_NONCE__')).toBe(2);
  });

  it('references no external origin', () => {
    // A CDN link, a remote font, a tracking pixel: none of them may exist, or
    // the CSP that forbids them would break the page instead of protecting it.
    const external = html.match(/(?:src|href)\s*=\s*["'](https?:)?\/\//gi);
    expect(external).toBeNull();
    expect(css).not.toMatch(/@import|url\(\s*["']?https?:/i);
  });

  /**
   * The page is one large inline script that no compiler ever sees: esbuild
   * inlines it as TEXT, tsc never reads it, and every other test here asserts
   * on the SOURCE rather than running it. So a stray bracket ships a document
   * that serves with a 200, passes every other assertion, and renders a blank
   * page in a browser.
   *
   * `new Function` parses without executing, which is exactly the guard that
   * was missing. Added while BAK-004 was adding a whole view to this file.
   */
  it('is syntactically valid JavaScript, which nothing else here would notice', () => {
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const source of scripts) {
      if (!source.trim()) continue;
      // eslint-disable-next-line no-new-func
      expect(() => new Function(source)).not.toThrow();
    }
  });

  it('renders backend values through textContent, never innerHTML', () => {
    // The dashboard prints record contents. If any of it went through
    // innerHTML, a hostile value in a row would execute.
    expect(html).not.toMatch(/\.innerHTML\s*=/);
    expect(html).not.toMatch(/insertAdjacentHTML/);
  });

  /**
   * 🔴 **FED-007 AC6 — every byte of this page ships, to every admin, on every load.**
   *
   * The document and its stylesheet are inlined by esbuild's text loader, so there is no lazy
   * anything: a comment written here is a comment downloaded there. FED-001's precedent for an
   * addition this size is a measured delta against a stated ceiling, so here is both.
   *
   * | | gzipped |
   * |---|---|
   * | before FED-007 | 23.9 KB |
   * | after (the explorer, the bands, the step table, the vocabularies) | 30.7 KB |
   * | **delta** | **+6.8 KB** |
   *
   * ⚠️ **The ceiling is deliberately loose and absolute, not a ratchet.** A ratchet set at the
   * current figure makes the next person's honest 400 bytes into a red gate and teaches them to
   * bump the number — this phase's register carries a row (R8) about a budget with six tokens of
   * headroom that nobody knew about. This is a smoke alarm: it fires when the page has doubled,
   * which is the failure worth catching.
   */
  it('the served page is still small enough to be one document (FED-007 AC6)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const zlib = require('zlib') as typeof import('zlib');
    const shipped = Buffer.concat([
      fs.readFileSync(path.join(UI_DIR, 'index.html')),
      fs.readFileSync(path.join(UI_DIR, 'styles.css'))
    ]);
    const gzipped = zlib.gzipSync(shipped, { level: 9 }).length;

    // The reading is real — a mis-pointed path would give a tiny number and pass.
    expect(shipped.length).toBeGreaterThan(50_000);
    expect(gzipped).toBeLessThan(48_000);
  });

  it('keeps red for danger only (the phase-23 palette law)', () => {
    // Every rule that CONSUMES the red token must be a destructive/failure
    // affordance. `:root` is where the token is defined, not used.
    const rules = css.split('}');
    const offenders: string[] = [];
    for (const rule of rules) {
      if (!rule.includes('var(--danger')) continue;
      const selector = rule.slice(0, rule.indexOf('{')).trim();
      if (selector === ':root') continue;
      if (!/danger|\.bad/.test(selector)) offenders.push(selector);
    }
    expect(offenders).toEqual([]);
  });
});

// ============================================================================
// 3. End to end, on a locked backend
// ============================================================================

describe('BAK-005 dashboard over HTTP (locked backend)', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let adminToken: string;
  const readonlyToken = 'readonly-secret-for-tests';

  async function req(
    method: string,
    pathName: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; json: SpecBody; text: string; headers: Headers }> {
    const res = await fetch(`${base}${pathName}`, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = {} as SpecBody;
    try {
      json = JSON.parse(text) as SpecBody;
    } catch {
      /* html */
    }
    return { status: res.status, json, text, headers: res.headers };
  }

  const asAdmin = () => ({ authorization: `Bearer ${adminToken}` });
  const asReadonly = () => ({ authorization: `Bearer ${readonlyToken}` });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bak005-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED_CONFIG));
    service = new BackendService({ dataDir, port: 0, backendId: 'dash_test', backendName: 'Dashboard Test', readonlyToken });
    const started = await service.start();
    base = started.listen.url;
    expect(started.security.enforced).toBe(true);
    expect(started.security.hasReadonlyTier).toBe(true);
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // -- the page ------------------------------------------------------------

  it('serves a fully-assembled document with no leftover markers', async () => {
    const { status, text } = await req('GET', '/_admin');
    expect(status).toBe(200);
    expect(text).not.toContain('ADMIN_CSS');
    expect(text).not.toContain('CSP_NONCE');
    // The stylesheet is inside the style block, not somewhere that merely
    // contains the bytes. (The original bug put it inside an HTML comment.)
    const styleBlock = text.slice(text.indexOf('<style'), text.indexOf('</style>'));
    expect(styleBlock).toContain('--bg-page');
    expect(styleBlock).toContain('button.btn.primary');
  });

  it('locks the page down with a CSP that forbids every external origin', async () => {
    const { headers } = await req('GET', '/_admin');
    const csp = headers.get('content-security-policy') || '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toMatch(/script-src 'nonce-[^']+'/);
    // No 'unsafe-inline' anywhere — the nonce is what allows our own script.
    expect(csp).not.toContain('unsafe-inline');
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('cache-control')).toBe('no-store');
  });

  it('mints a fresh nonce per response', async () => {
    const a = await req('GET', '/_admin');
    const b = await req('GET', '/_admin');
    expect(a.headers.get('content-security-policy')).not.toBe(b.headers.get('content-security-policy'));
  });

  // -- sign-in -------------------------------------------------------------

  it('the document is public (it IS the login page) but whoami is not', async () => {
    expect((await req('GET', '/_admin')).status).toBe(200);
    expect((await req('GET', '/_admin/whoami')).status).toBe(401);
    expect((await req('GET', '/_admin/whoami', undefined, { authorization: 'Bearer wrong' })).status).toBe(401);
  });

  it('whoami reports the tier, the posture and the available sections', async () => {
    const { status, json } = await req('GET', '/_admin/whoami', undefined, asAdmin());
    expect(status).toBe(200);
    expect(json.readonly).toBe(false);
    expect(json.security).toEqual({ devOpen: false, enforced: true, hasReadonlyTier: true });
    // Derived from the wired subsystems, not hard-coded.
    const features = json.features as DashboardFeatures;
    expect(features.collections).toBe(true);
    expect(features.triggers).toBe(true);
    expect(features.backups).toBe(true);
    // BAK-004's Sign-in view. Gated on a schema manager like the other views
    // that need a system table (`_UserIdentity` here).
    expect(features.auth).toBe(true);
    expect(Object.values(features).every((v) => typeof v === 'boolean')).toBe(true);
  });

  it('the read-only credential signs in and is told so', async () => {
    const { status, json } = await req('GET', '/_admin/whoami', undefined, asReadonly());
    expect(status).toBe(200);
    expect(json.readonly).toBe(true);
  });

  // -- the read-only tier, for real ----------------------------------------

  it('a read-only admin reads everything an admin can', async () => {
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Widget', columns: [] }, asAdmin());
    await req('POST', '/api/Widget', { name: 'one' }, asAdmin());

    const schema = await req('GET', '/admin/schema', undefined, asReadonly());
    expect(schema.status).toBe(200);
    expect(schema.json.tables!.map((t) => t.name)).toContain('Widget');

    const rows = await req('GET', '/api/Widget?limit=10', undefined, asReadonly());
    expect(rows.status).toBe(200);
    expect(rows.json.results).toHaveLength(1);

    // Including the permission surface it is there to inspect.
    expect((await req('GET', '/admin/permissions', undefined, asReadonly())).status).toBe(200);
    expect((await req('GET', '/admin/keys', undefined, asReadonly())).status).toBe(200);
  });

  it('a read-only admin changes nothing, and is told exactly why', async () => {
    const attempts: [string, string, unknown][] = [
      ['POST', '/api/Widget', { name: 'nope' }],
      ['PUT', '/admin/permissions/collections/Widget', { permissions: { find: 'public' } }],
      ['POST', '/admin/roles', { name: 'sneaky' }],
      ['POST', '/admin/keys', { name: 'k', scopes: ['classes:*'] }],
      ['POST', '/admin/schema', { action: 'deleteTable', table: 'Widget' }],
      ['POST', '/admin/backups', {}]
    ];
    for (const [method, url, body] of attempts) {
      const { status, json } = await req(method, url, body, asReadonly());
      expect(`${method} ${url} -> ${status}`).toContain('-> 403');
      expect(json.code).toBe(119);
      expect(json.error).toContain('READ-ONLY admin credential');
    }
    // And nothing actually changed.
    const rows = await req('GET', '/api/Widget?limit=10', undefined, asAdmin());
    expect(rows.json.results).toHaveLength(1);
  });

  it('a read-only admin may still dry-run a permission check (the reviewed exception)', async () => {
    const { status, json } = await req(
      'POST',
      '/admin/permissions/check',
      { principal: { kind: 'anonymous' }, collection: 'Widget', op: 'find' },
      asReadonly()
    );
    expect(status).toBe(200);
    expect(json.allowed).toBe(false);
  });

  // -- delete table, finally wired -----------------------------------------

  it('delete-table works end to end through the route the dashboard calls', async () => {
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Doomed', columns: [] }, asAdmin());
    await req('POST', '/api/Doomed', { a: 1 }, asAdmin());
    expect((await req('GET', '/admin/schema', undefined, asAdmin())).json.tables!.map((t) => t.name)).toContain('Doomed');

    const deleted = await req('POST', '/admin/schema', { action: 'deleteTable', table: 'Doomed' }, asAdmin());
    expect(deleted.status).toBe(200);
    expect(deleted.json.deleted).toBe(true);

    const after = await req('GET', '/admin/schema', undefined, asAdmin());
    expect(after.json.tables!.map((t) => t.name)).not.toContain('Doomed');
  });

  /**
   * 🔴 **The Executions view showed "Nothing here yet." on a backend with executions in it**,
   * from BAK-005's first commit until FED-006's AC5 screenshots went looking for it.
   *
   * `GET /executions` answers a BARE ARRAY. Every other list route this page reads is enveloped
   * — `/classes/*` gives `{results}`, `/admin/triggers` gives `{triggers}` — and the executions
   * view read `data.executions || data.results || []`, which on an array is `[]`. Status 200,
   * a well-formed page, an empty table, and no error anywhere.
   *
   * ⚠️ **Nothing above could see it.** Level 2 grades the document (markers, CSP, valid JS,
   * `textContent` over `innerHTML`, the palette) and level 3 grades the HTTP tiers — so every
   * view on this page could read a key its route does not answer and this suite would stay
   * green. That is the hole, and this is the spec shaped to fill it.
   *
   * 🔴 **The extraction is read OUT OF THE SHIPPED DOCUMENT, never copied into this file.** A
   * copy would grade itself: it would agree with the route forever while the page showed
   * nothing. If the view is restructured this spec fails loudly asking to be re-pointed, which
   * is the correct outcome — it cannot silently start grading a page that no longer exists.
   */
  it('the Executions view finds the rows GET /executions actually answers', async () => {
    // A real row, written by the real store into the dataDir this service is serving.
    const history = new ExecutionHistory();
    const status = history.open(dataDir, { getRetentionDays: () => 0 });
    expect(status.enabled).toBe(true);
    const store = history.createLogger()!.getStore();
    const startedAt = Date.now();
    const seeded = store.createExecution({
      workflowId: 'pollSources',
      workflowName: 'pollSources',
      triggerType: 'schedule',
      status: 'success',
      startedAt,
      completedAt: startedAt + 5,
      durationMs: 5
    });
    history.close?.();

    const listed = await req('GET', '/executions?limit=100', undefined, asAdmin());
    expect(listed.status).toBe(200);
    const data = JSON.parse(listed.text);

    // 🔴 Seeding has to have WORKED, or the two arms below both read zero and grade nothing.
    const real = (Array.isArray(data) ? data : []) as { id: string }[];
    expect(real.map((r) => r.id)).toContain(seeded);

    const rows = executionsExtraction()(data) as { id: string }[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.map((r) => r.id)).toContain(seeded);
  });

  /**
   * 🔴 FED-007 AC2. Three defects in five list entries, all invisible until R20's fix made the
   * table show rows at all: `failed` and `cancelled` filtered to nothing whatever the backend
   * held, and `error` — the store's only failure value — could not be picked.
   *
   * The filter is passed straight through to the store (`byob-admin.listExecutions`), so there
   * was never a translation layer that could have absorbed the mismatch.
   */
  it('the status filter offers exactly the values a record can hold, and no others', () => {
    const offered = dashboardStatusOptions();
    const union = executionStatusUnion();

    // The union has to have been READ, or an empty list would agree with an empty list.
    expect(union).toContain('error');
    expect(offered).toContain('');
    expect(offered.filter((s) => s !== '').sort()).toEqual([...union].sort());
  });

  /**
   * 🔴 FED-007 AC2, the other half: the chip tested `x.status === 'failed'` for its danger
   * affordance, and the store writes `error`. Every failure this backend has ever recorded
   * rendered AMBER — a warning, on a run that broke.
   */
  it('a failed run wears the danger affordance, and a healthy one does not', () => {
    const kind = dashboardStatusKind();

    expect(kind('error')).toBe('bad');
    expect(kind('success')).toBe('ok');
    expect(kind('running')).toBe('warn');
  });

  /**
   * FED-007 AC2 — and the reason both specs above exist rather than one: a page that agrees with
   * the union but colours by a value outside it is still broken, and vice versa. This is the
   * seam they share.
   */
  it('colours every status it offers, and nothing it offers falls through to the warning', () => {
    const kind = dashboardStatusKind();
    const offered = dashboardStatusOptions().filter((s) => s !== '');

    const coloured = offered.map((s) => [s, kind(s)]);
    expect(coloured).toEqual(expect.arrayContaining([['success', 'ok'], ['error', 'bad']]));
    // A status nobody thought about lands on `warn`, which is the fallback — that is correct for
    // `running` and would be silence for anything new.
    expect(offered.filter((s) => kind(s) === 'warn')).toEqual(['running']);
  });

  /**
   * 🔴 FED-007 AC3 — the STEP vocabulary, held to the same standard as the run vocabulary and
   * for the same reason: the record view now draws a chip per step, and `StepStatus` has a
   * fourth value the run status does not.
   */
  it('the step vocabulary is the store’s, and `skipped` is not painted as a fault', () => {
    const offered = dashboardStepStatuses();
    const union = typeUnion('StepStatus');

    expect(union).toContain('skipped');
    expect([...offered].sort()).toEqual([...union].sort());

    const kind = dashboardStatusKind('stepStatusKind');
    expect(kind('error')).toBe('bad');
    expect(kind('success')).toBe('ok');
    expect(kind('running')).toBe('warn');
    // A branch the run did not take is not a warning. It gets the plain chip.
    expect(kind('skipped')).toBe('');
  });

  /**
   * 🔴 **FED-007 AC3 — the reduction the opened record is built from, over a real one.**
   *
   * The record here is SEEDED through the real store and read back through the real route, so
   * what the reduction is fed is the shape `/_admin` is actually handed — which is the half
   * register R20 proved nobody was checking.
   *
   * ⚠️ AC4's *"against the real record, not a fixture"* is graded in `feed-drive.test.ts`, on a
   * record produced by a real poll of a real feed. This arm is the cheap, always-run half: that
   * the reduction finds a failed step at all, and does not find one where there is none.
   */
  it('the opened record surfaces its failed step, with the subject that step named', async () => {
    const history = new ExecutionHistory();
    expect(history.open(dataDir, { getRetentionDays: () => 0 }).enabled).toBe(true);
    const logger = history.createLogger()!;
    const startedAt = Date.now();
    const executionId = logger.startExecution({
      workflowId: 'pollSources',
      workflowName: 'pollSources',
      triggerType: 'schedule',
      triggerData: { cron: '* * * * *' }
    });
    const healthy = logger.startNode({ nodeId: 'http', nodeType: 'net.noodl.HTTP', nodeName: 'Fetch the blog' });
    logger.completeNode(healthy, true, { outcome: 'success' });
    const broken = logger.startNode({ nodeId: 'http', nodeType: 'net.noodl.HTTP', nodeName: 'Fetch the channel' });
    logger.completeNode(
      broken,
      false,
      { outcome: 'failure', detail: { url: 'http://127.0.0.1:65454/broken.xml', status: 403 } },
      new Error('http/error-status: The server answered 403 Forbidden')
    );
    logger.completeExecution(true);
    history.close?.();

    const opened = await req('GET', `/executions/${executionId}`, undefined, asAdmin());
    expect(opened.status).toBe(200);
    const record = JSON.parse(opened.text) as { steps?: unknown[]; startedAt?: number };

    // Seeding worked, or both arms below read zero and grade nothing.
    expect(record.steps).toHaveLength(2);
    expect(record.startedAt).toBeGreaterThanOrEqual(startedAt);

    const summary = dashboardRecordSummary()(record);
    expect(summary.stepCount).toBe(2);
    expect(summary.failures).toHaveLength(1);
    expect(summary.failures[0].step).toBe('Fetch the channel');
    expect(summary.failures[0].message).toContain('403');
    expect((summary.failures[0].detail as { url?: string }).url).toContain('/broken.xml');

    // 🔴 FED-007 AC1 again, and here it is the ROUTE that says so rather than a unit: the run was
    // completed as a success and the record answers `error`.
    expect(summary.status).toBe('error');

    // The negative arm, in the same breath: a run with no failed step surfaces no failure, so
    // the band above is a reading rather than a constant.
    expect(dashboardRecordSummary()({ steps: [{ nodeId: 'http', status: 'success' }] }).failures).toEqual([]);
  });

  it('registers both dashboard routes in the one route table the walk test checks', () => {
    const table = service.getRouteTable();
    const page = table.find((r) => r.pattern === '_admin');
    const whoami = table.find((r) => r.pattern === '_admin/whoami');
    expect(page).toBeDefined();
    expect(page!.access.kind).toBe('public');
    expect(whoami).toBeDefined();
    expect(whoami!.access.kind).toBe('admin');
  });
});

// ============================================================================
// --no-admin, and the credential-collision interlock
// ============================================================================

describe('BAK-005 --no-admin', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bak005-off-'));
    service = new BackendService({ dataDir, port: 0, adminDashboard: false });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('removes the routes entirely rather than blocking them', async () => {
    // A 404 (not a 401/403) is the point: an operator who turned the dashboard
    // off leaks no evidence that there was ever one to turn off.
    expect((await fetch(`${base}/_admin`)).status).toBe(404);
    expect((await fetch(`${base}/_admin/whoami`)).status).toBe(404);
    expect((await fetch(`${base}/health`)).status).toBe(200);
    expect(service.getRouteTable().some((r) => r.pattern.startsWith('_admin'))).toBe(false);
  });
});

describe('BAK-005 read-only credential provisioning', () => {
  it('refuses to start when the read-only credential equals the full one', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bak005-collide-'));
    try {
      const service = new BackendService({ dataDir, port: 0, authToken: 'same-secret', readonlyToken: 'same-secret' });
      await expect(service.start()).rejects.toThrow(SecurityStartupError);
      await expect(service.start()).rejects.toThrow(/silently grant full write access/);
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('is absent unless asked for — no backend grows a second credential by accident', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bak005-none-'));
    const service = new BackendService({ dataDir, port: 0 });
    try {
      const started = await service.start();
      expect(started.security.hasReadonlyTier).toBe(false);
      const secrets = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8'));
      expect(secrets.adminReadonlyToken).toBeUndefined();
      expect(typeof secrets.adminToken).toBe('string');
      // The credential WAS minted here, so the first-run surface says so.
      expect(started.security.adminTokenMintedThisStart).toBe(true);
    } finally {
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
