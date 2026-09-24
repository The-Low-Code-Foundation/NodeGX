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
import {
  EXECUTION_STATUSES,
  STEP_STATUSES,
  executionStatusKind,
  extractExecutionRows,
  recordSummary,
  stepStatusKind
} from '../src/admin/app/format';
import type { ExecutionSummary } from '../src/admin/app/format';

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
// BMG-001: the app's source, and the two build products tests/global-setup.js makes before the suite.
const APP_DIR = path.join(__dirname, '..', 'src', 'admin', 'app');
const BUILD_DIR = path.join(__dirname, '..', 'build', 'admin');

/**
 * 🔴 FED-007 AC2 — the two surfaces this suite has to hold together.
 *
 * Before BMG-001 the page was one string to esbuild's text loader and no compiler read it, so
 * these helpers lifted the status vocabulary and the record reduction OUT of the shipped document
 * by regex. The page is an app now (`src/admin/app/`), and those are modules: imported here, and
 * type-checked by `npm run typecheck`. The wrappers keep their names so the specs below read as
 * they did; what each one grades is unchanged — the union out of the type file the store is typed
 * by, against the values the page ships.
 */
function executionsExtraction(): (data: unknown) => unknown {
  return extractExecutionRows;
}

function executionStatusUnion(): string[] {
  return typeUnion('ExecutionStatus');
}

/** The page's own status list. `''` is "any status". */
function dashboardStatusOptions(): string[] {
  return EXECUTION_STATUSES;
}

/** The page's own status → affordance mapping. */
function dashboardStatusKind(which: 'executionStatusKind' | 'stepStatusKind' = 'executionStatusKind'): (status: string) => string {
  return which === 'stepStatusKind' ? stepStatusKind : executionStatusKind;
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

/** The page's own STEP status list. FED-007 AC3. */
function dashboardStepStatuses(): string[] {
  return STEP_STATUSES;
}

/** The record reduction the opened-execution view is built from. FED-007 AC3–AC5. */
function dashboardRecordSummary(): (record: unknown) => ExecutionSummary {
  return recordSummary;
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

describe('BAK-005 dashboard document (BMG-001: the shell, the bundle, the token sheet)', () => {
  const html = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf-8');
  const css = fs.readFileSync(path.join(UI_DIR, 'styles.css'), 'utf-8');
  const tokens = fs.readFileSync(path.join(BUILD_DIR, 'tokens.css'), 'utf-8');
  const bundle = fs.readFileSync(path.join(BUILD_DIR, 'app.js.txt'), 'utf-8');

  function occurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
  }

  function stripCssComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  /** Every TypeScript source of the app, recursively. */
  function appSources(dir = APP_DIR): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...appSources(full));
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
    return out;
  }

  it('carries each substitution marker exactly where it belongs', () => {
    // Assembled from fragments so this assertion does not become its own
    // second occurrence — which is exactly the bug it guards against.
    expect(occurrences(html, '/*__ADMIN' + '_CSS__*/')).toBe(1);
    expect(occurrences(html, '/*__ADMIN' + '_APP__*/')).toBe(1);
    // One for the style tag, one for the script tag.
    expect(occurrences(html, '__CSP' + '_NONCE__')).toBe(2);
    // And nothing the injector substitutes may carry a marker of its own.
    for (const text of [css, tokens, bundle]) {
      expect(text).not.toContain('__CSP' + '_NONCE__');
      expect(text).not.toContain('/*__ADMIN' + '_');
    }
  });

  it('references no external origin', () => {
    // A CDN link, a remote font, a tracking pixel: none of them may exist, or
    // the CSP that forbids them would break the page instead of protecting it.
    expect(html.match(/(?:src|href)\s*=\s*["'](https?:)?\/\//gi)).toBeNull();
    expect(css).not.toMatch(/@import|url\(\s*["']?https?:/i);
    expect(tokens).not.toMatch(/@import|url\(\s*["']?https?:/i);
    // The bundle FETCHES nothing from anywhere. The URLs it carries are Preact's XML namespaces
    // and the placeholders a form shows in an empty field (an OIDC issuer, an app origin); the
    // gate reads what the code would REACH FOR, which is what the CSP would refuse.
    expect(bundle).not.toMatch(/\b(fetch|EventSource|WebSocket|import|importScripts)\s*\(\s*["'`]https?:/);
    expect(bundle).not.toMatch(/\b(src|href)\s*[:=]\s*["'`]https?:/);
    const urls = Array.from(new Set(bundle.match(/https?:\/\/[^"'`\s)]*/g) || []));
    expect(urls.length).toBeGreaterThan(0);
    const allowed = (u: string) => /^https?:\/\/www\.w3\.org\//.test(u) || /example\.com/.test(u) || u === 'https://accounts.google.com';
    expect(urls.filter((u) => !allowed(u))).toEqual([]);
  });

  /**
   * The bundle is inlined into a classic <script>. Two strings would end it early: the
   * closing tag itself, and an HTML comment opener, which a classic script treats as one.
   * `new Function` parses without executing, which catches a bundle esbuild wrote but a browser
   * would refuse.
   */
  it('the bundle is valid JavaScript that cannot close its own script tag', () => {
    expect(bundle.length).toBeGreaterThan(10_000);
    // eslint-disable-next-line no-new-func
    expect(() => new Function(bundle)).not.toThrow();
    expect(bundle).not.toContain('</script');
    expect(bundle).not.toContain('<!--');
  });

  /**
   * The page prints record contents. Preact renders text nodes, so the only way markup could
   * be injected is by asking for it: the gate reads the SOURCE for the three ways to ask.
   * (The bundle itself contains Preact's own `innerHTML` branch — that is the runtime's support
   * for the prop nobody here may use, which is why the gate moved to the source in BMG-001.)
   */
  it('renders backend values as text: no innerHTML path in the app source', () => {
    const sources = appSources();
    // The reading is real — a mis-pointed directory would pass with zero files.
    expect(sources.length).toBeGreaterThan(20);
    const offenders = sources.filter((file) => /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/.test(fs.readFileSync(file, 'utf-8')));
    expect(offenders.map((f) => path.relative(APP_DIR, f))).toEqual([]);
  });

  /**
   * 🔴 **FED-007 AC6, carried onto the bundle (BMG-001 AC7) — every byte of this page ships, to
   * every admin, on every load.** The document budget was 48,000 gzip and the hand-written page
   * stood at 39,067 after BMG-000; ten more pages of composers did not fit, which is why the
   * page is an app now. The budget is a smoke alarm, not a ratchet: it fires when the app has
   * grown far past what it does, not when someone's honest 400 bytes lands.
   */
  it('the app bundle stays under its budget (BMG-001 AC7)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const zlib = require('zlib') as typeof import('zlib');
    const raw = Buffer.from(bundle, 'utf-8');
    const gzipped = zlib.gzipSync(raw, { level: 9 }).length;
    // The reading is real — a mis-pointed path would give a tiny number and pass.
    expect(raw.length).toBeGreaterThan(40_000);
    expect(gzipped).toBeLessThan(160_000);
    // And the whole served document — shell, tokens, stylesheet, bundle — stays one page.
    const shipped = Buffer.concat([Buffer.from(html), Buffer.from(tokens), Buffer.from(css), raw]);
    expect(zlib.gzipSync(shipped, { level: 9 }).length).toBeLessThan(200_000);
  });

  it('keeps red for danger only (the phase-23 palette law)', () => {
    // Every rule that CONSUMES the red token must be a destructive/failure
    // affordance. `:root` is where the token is defined, not used.
    const rules = stripCssComments(css).split('}');
    const offenders: string[] = [];
    for (const rule of rules) {
      if (!rule.includes('var(--danger')) continue;
      const selector = rule.slice(0, rule.indexOf('{')).trim();
      if (selector === ':root') continue;
      if (!/danger|\.bad/.test(selector)) offenders.push(selector);
    }
    expect(offenders).toEqual([]);
  });

  /**
   * 🔴 BMG-001 AC4 — light and dark both render every page from the tokens. A colour literal
   * outside a `:root` block is a colour one of the two themes cannot reach.
   */
  it('paints both themes from the tokens: no colour literal outside a :root block', () => {
    const sheet = stripCssComments(tokens + '\n' + css);
    const offenders: string[] = [];
    for (const rule of sheet.split('}')) {
      const brace = rule.indexOf('{');
      if (brace < 0) continue;
      const selector = rule.slice(0, brace).trim();
      if (selector.startsWith(':root')) continue;
      const body = rule.slice(brace + 1);
      if (/#[0-9a-f]{3,8}\b/i.test(body) || /\brgba?\(/.test(body)) offenders.push(selector);
    }
    expect(offenders).toEqual([]);
  });

  /**
   * The token sheet is core-ui's canonical palette, copied by the build — never by hand, which
   * is how the previous copy drifted (BAK-005-NOTES §5, CHR-013). Both theme blocks must be in
   * it, and the names the stylesheet aliases onto must exist.
   */
  it("the token sheet is core-ui's, with both themes, and the stylesheet's aliases resolve", () => {
    expect(tokens.startsWith('/* GENERATED by scripts/build-admin-app.js')).toBe(true);
    expect(tokens).toContain(':root {');
    expect(tokens).toContain(":root[data-theme='light'] {");
    const defined = new Set((tokens.match(/--theme-color-[a-z0-9-]+(?=\s*:)/g) || []).map((m) => m.trim()));
    // The reading is real.
    expect(defined.size).toBeGreaterThan(60);
    const referenced = Array.from(new Set(css.match(/var\(--theme-color-[a-z0-9-]+/g) || [])).map((m) => m.slice('var('.length));
    expect(referenced.length).toBeGreaterThan(10);
    expect(referenced.filter((name) => !defined.has(name))).toEqual([]);
    // Straight from the source file, not from a second copy anywhere in this package.
    const coreUi = fs.readFileSync(
      path.join(__dirname, '..', '..', 'noodl-core-ui', 'src', 'styles', 'custom-properties', 'colors.css'),
      'utf-8'
    );
    for (const name of ['--theme-color-bg-page', '--theme-color-fg-danger', '--theme-color-syntax-string']) {
      expect(coreUi).toContain(name);
      expect(defined.has(name)).toBe(true);
    }
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
    expect(text).not.toContain('ADMIN_APP');
    expect(text).not.toContain('CSP_NONCE');
    // The stylesheet is inside the style block, not somewhere that merely
    // contains the bytes. (The original bug put it inside an HTML comment.)
    const styleBlock = text.slice(text.indexOf('<style'), text.indexOf('</style>'));
    expect(styleBlock).toContain('--theme-color-bg-page');
    expect(styleBlock).toContain('--bg-page');
    expect(styleBlock).toContain('button.btn.primary');
    // BMG-001: and the app is inside the script block, whole.
    const scriptBlock = text.slice(text.indexOf('<script'), text.indexOf('</script>'));
    expect(scriptBlock.length).toBeGreaterThan(10_000);
    expect(scriptBlock).toContain('getElementById("root")');
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
