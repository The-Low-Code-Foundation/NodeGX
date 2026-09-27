/**
 * The served admin dashboard (BAK-005) — server side.
 *
 * `nodegx-backend` carries its own operator UI, the way Pocketbase does: a
 * deployed backend is administered from a browser with no editor installed.
 * This module is the entire server-side surface, and it is deliberately small:
 *
 *   GET  /_admin          the dashboard document (one self-contained page)
 *   GET  /_admin/whoami   which credential tier you hold + which sections exist
 *   POST /_admin/login    email + password → a session (BMG-014, see ## Auth)
 *   POST /_admin/setup    the first admin account (BMG-014)
 *
 * Everything else the dashboard does — collections, schema, users, roles,
 * permissions, keys, triggers, workflows, executions, email, backups — goes
 * over the ADMIN ROUTES THAT ALREADY EXIST (WF-004/BAK-001/BAK-002/BAK-003/
 * BAK-007/WF-001/WF-005). That is the seam decision recorded in BAK-005-NOTES:
 * the reuse that matters is the HTTP contract, not the editor's React
 * components. It is also why the dashboard cannot drift from the editor's
 * Backend Services panel — both are HTTP clients of this one server, so the
 * existing route tests are the shared contract suite.
 *
 * ## One document, zero external origins
 *
 * The page is a single HTML document with its CSS and JS inlined at build time
 * (esbuild's `text` loader pulls `ui/index.html`, `ui/styles.css` and — since
 * BMG-001 — the app bundle `build/admin/app.js.txt` and the token sheet
 * `build/admin/tokens.css` into the service bundle as strings). The app is
 * Preact + TSX in `src/admin/app/`, bundled by `scripts/build-admin-app.js`
 * with the same esbuild this package already runs; it is still ONE served
 * document with nothing to fetch. No CDN, no asset routes. Consequences worth
 * naming:
 *   - `WF-003`'s "copy this file and run it" story survives intact.
 *   - The CSP can be `default-src 'none'` with a per-response nonce, because
 *     there is genuinely nothing to fetch.
 *   - Client-side routing is hash-based, so the service needs no catch-all
 *     route and the route table stays exactly-length-matched.
 *
 * ## Auth
 *
 * BAK-003's admin credential, unchanged — the dashboard holds it as a bearer
 * token in `sessionStorage` and sends it on every request. There is no
 * dashboard session, no cookie, and therefore no CSRF surface (the spec's
 * "pick token-header auth"). The read-only tier is a second credential, not a
 * client-side toggle: refusal happens in the dispatcher (see ./readonly).
 *
 * BMG-014 adds a PERSON beside the credential, and two more routes:
 *
 *   POST /_admin/login   email + password → a `_Session` for an account with
 *                        backend access (public; on the auth budget)
 *   POST /_admin/setup   the first admin account, made with the credential
 *                        (admin-gated; 409 once a full-access account exists)
 *
 * A session of a person whose `_User` row carries `adminAccess` resolves to the
 * admin principal (`security/state.ts`), so the page sends it in
 * `X-Parse-Session-Token` and every admin route behaves as it did for the
 * token. The credential is not replaced: scripts, the editor and MCP keep it.
 *
 * The DOCUMENT itself is public — it is the login page, and it contains no
 * data. Every byte of actual backend state comes from admin-gated routes.
 *
 * @module nodegx-backend/admin/AdminDashboardRoutes
 */

import * as crypto from 'crypto';

import type { IStorageFacade } from '@noodl/backend-contract';

import type { BackendServiceOptions } from '../config';
import { RoleStore } from '../roles/RoleStore';
import type { SecurityState } from '../security/state';
import type { RequestContext } from '../server/HttpServer';
import { HttpError, readJSONBody, sendJSON } from '../server/http-util';
import { newSessionToken, verifyPassword } from '../server/users';
import { applyAdminSecurityHeaders } from '../ops/headers';
import { SystemUsers } from '../users/SystemUsers';
import { ACCOUNT_COLUMNS, ADMIN_ROLE_NAME, adminAccessOf, isAccountDisabled } from '../users/accountColumns';
import type { AdminAccess } from '../users/accountColumns';

// The UI, inlined by esbuild's text loader (and by tests/text-transformer.js
// under jest). `require` rather than `import` so the one call site works
// identically in both without a synthetic-default dance.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const UI_HTML: string = require('./ui/index.html');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const UI_CSS: string = require('./ui/styles.css');
// BMG-001: build products (gitignored). `scripts/build-admin-app.js` writes them;
// `tests/global-setup.js` builds them before the suite. The token sheet goes
// FIRST so the stylesheet's aliases can read it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const UI_TOKENS: string = require('../../build/admin/tokens.css');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const UI_APP: string = require('../../build/admin/app.js.txt');

/** Assembled from fragments so the markers never appear literally in this file. */
const CSS_MARKER = '/*__ADMIN' + '_CSS__*/';
const APP_MARKER = '/*__ADMIN' + '_APP__*/';
const NONCE_MARKER = '__CSP' + '_NONCE__';

/** What the style block carries: the generated tokens, then the page's own rules. */
export function assembledCss(): string {
  return UI_TOKENS + '\n' + UI_CSS;
}

/**
 * Which dashboard sections have a backing implementation in THIS build.
 *
 * The spec requires sections to hide rather than error when their backing task
 * has not shipped. Rather than hard-code today's answer, each flag is derived
 * from whether the subsystem is actually wired into the composition root — so a
 * service constructed without workflows, or with execution history disabled
 * because its database would not open, reports that honestly instead of serving
 * a tab that 503s.
 */
export interface DashboardFeatures {
  collections: boolean;
  schema: boolean;
  users: boolean;
  roles: boolean;
  permissions: boolean;
  apiKeys: boolean;
  triggers: boolean;
  workflows: boolean;
  executions: boolean;
  email: boolean;
  backups: boolean;
  realtime: boolean;
  /** BAK-008: per-collection full-text search config exists (schema manager available). */
  search: boolean;
  /** File storage config (BAK-006) — always true once the subsystem is wired. */
  files: boolean;
  /** BAK-004: OAuth / passwordless providers and the `_UserIdentity` links they create. */
  auth: boolean;
  /** BAK-009: the `_Audit` trail and the operational config it lives beside. */
  ops: boolean;
  /** BMG-011: cloud-function secrets (`/admin/secrets`) — names only, never values. */
  secrets: boolean;
}

export interface AdminDashboardDeps {
  options: BackendServiceOptions;
  security: SecurityState;
  /** BMG-014: the accounts (`_User`, `_Session`, `_Role`) the login and setup routes read and write. */
  facade: IStorageFacade;
  /** Live capability probe — evaluated per request, not captured at construction. */
  features: () => DashboardFeatures;
  /** HLT-024: every response that issues a session carries the person's roles, from the one resolver. */
  rolesForUser: (userId: string) => Promise<string[]>;
  /**
   * BMG-014: count a refused password against the caller's credential budget
   * — the SAME budget a wrong token spends (`AuthAttemptLimiter`), so the
   * password box is not a second, unmetered way to guess.
   */
  recordAuthFailure: (clientIp: string) => void;
}

/**
 * The one sentence every refused sign-in gets. Wrong password, no such
 * account, disabled, or an account with no backend access all read the same,
 * so the form is not an oracle for which addresses have accounts.
 */
export const LOGIN_REFUSED = 'That email and password were not accepted, or this account has no access to the backend manager.';

/** The sentence a second setup gets. */
export const SETUP_DONE =
  'This backend already has an admin account. Sign in as them, or ask them to give you access on the Users page.';

/** What a person signed into the manager is told about themselves. */
export interface DashboardPerson {
  id: string;
  username: string | null;
  email: string | null;
  access: AdminAccess;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Substitute a marker that must occur EXACTLY once, and say so loudly when it
 * does not.
 *
 * This exists because the naive `String.replace(marker, value)` silently
 * replaces the FIRST occurrence — and the first occurrence of the stylesheet
 * marker was, at one point, a mention of it inside this file's own doc comment.
 * The page still rendered "fine" (200, right length, CSS text present) while
 * the entire stylesheet sat inside an HTML comment and the style block was
 * empty. A quiet mis-substitution that produces a plausible page is precisely
 * the failure mode this codebase refuses to ship: count, and throw.
 */
function injectOnce(template: string, marker: string, value: string): string {
  const first = template.indexOf(marker);
  if (first === -1) {
    throw new Error(`Admin dashboard template is missing its "${marker}" marker — the page cannot be assembled.`);
  }
  if (template.indexOf(marker, first + marker.length) !== -1) {
    throw new Error(
      `Admin dashboard template contains more than one "${marker}" marker, so the substitution is ambiguous. ` +
        'Markers must appear exactly once (do not mention them in prose).'
    );
  }
  return template.slice(0, first) + value + template.slice(first + marker.length);
}

export class AdminDashboardRoutes {
  private readonly system: SystemUsers;
  private readonly roles: RoleStore;

  constructor(private readonly deps: AdminDashboardDeps) {
    // Its own door, like AdminUserRoutes: the route's audit entry covers the
    // write, so no `onAudit` (a second entry per setup would be noise).
    this.system = new SystemUsers({ facade: deps.facade });
    this.roles = new RoleStore(deps.facade);
  }

  /**
   * `GET /_admin`. Renders the one document, with a fresh CSP nonce so the
   * inline script and style run under a policy that still forbids any other
   * script — including one injected into a record value we render.
   */
  serve(ctx: RequestContext): void {
    // BAK-009: the surrounding security headers for an HTML document that
    // carries a credential. The CSP below is this page's own, and stricter.
    applyAdminSecurityHeaders(ctx.res);
    const nonce = crypto.randomBytes(16).toString('base64');
    // The nonce genuinely appears more than once (one style tag, one script
    // tag), so it is a global replace; the stylesheet must not be.
    const html = injectOnce(injectOnce(UI_HTML, CSS_MARKER, assembledCss()), APP_MARKER, UI_APP)
      .split(NONCE_MARKER)
      .join(nonce);

    const body = Buffer.from(html, 'utf-8');
    ctx.res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      // Everything the page needs is in the page. `connect-src 'self'` is what
      // lets it call this backend's own API (and open the SSE stream); nothing
      // else is reachable, so a hostile record value cannot exfiltrate.
      'Content-Security-Policy':
        "default-src 'none'; " +
        `script-src 'nonce-${nonce}'; ` +
        `style-src 'nonce-${nonce}'; ` +
        "connect-src 'self'; " +
        "img-src 'self' data:; " +
        "font-src 'none'; " +
        "form-action 'none'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    ctx.res.end(body);
  }

  /**
   * `GET /_admin/whoami`. Admin-gated, so reaching it at all proves the
   * credential — that is the dashboard's "login". Answers the two things the
   * client cannot know on its own: which tier it holds, and which sections to
   * render.
   */
  async whoami(ctx: RequestContext): Promise<void> {
    const readonly = ctx.principal.kind === 'admin' && ctx.principal.readonly === true;
    sendJSON(ctx.res, 200, {
      ok: true,
      readonly,
      /**
       * BMG-014: who is signed in, when it is a person (null for the
       * credential), and whether the setup step has been done — the page shows
       * "Create your admin account" first while `adminAccount` is false.
       */
      person: await this.personOf(ctx),
      adminAccount: await this.fullAdminExists(),
      backend: {
        id: this.deps.options.backendId,
        name: this.deps.options.backendName,
        host: this.deps.options.host,
        port: this.deps.options.port
      },
      security: {
        devOpen: this.deps.security.config.devOpen,
        enforced: !this.deps.security.devOpenActive,
        hasReadonlyTier: this.deps.security.adminReadonlyToken !== null
      },
      /**
       * First run, honestly (see BAK-005-NOTES §first-run): under BAK-003 an
       * admin credential ALWAYS exists by the time anything can be served, so
       * the Pocketbase "create the first admin" page has no safe analogue —
       * an unauthenticated setup route on an already-provisioned backend is a
       * takeover. What the dashboard shows instead is this flag: the credential
       * was auto-minted on this very start, which means no operator has ever
       * chosen one, and the page explains where to find it and how to replace
       * it with `--token`.
       */
      firstRun: this.deps.security.adminTokenMintedThisStart,
      features: this.deps.features(),
      /**
       * BMG-004 AC7 — the `_User` columns whose values only their own control
       * writes, with the reason the page shows on hover. Served, not copied:
       * the page has no list of its own (`users/accountColumns.ts`).
       */
      accountColumns: ACCOUNT_COLUMNS
    });
  }

  /**
   * `POST /_admin/login {email, password}` (BMG-014). Public: a password is
   * what it checks. The lookup is by email OR username (the setup step makes
   * them the same unless asked otherwise), and every refusal is the one
   * sentence, after spending one unit of the caller's credential budget.
   *
   * The account must carry backend access: an ordinary app user with the right
   * password is refused here exactly like a wrong password — this door opens
   * the manager, not the app.
   */
  async login(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const email = str(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) throw new HttpError(400, 'An email and a password are needed.');

    const refuse = (): never => {
      this.deps.recordAuthFailure(ctx.clientIp);
      throw new HttpError(401, LOGIN_REFUSED, 101);
    };

    // Two lookups rather than one `$or`, so each is an indexed equality; the
    // password decides between candidates (email is not unique on this wire).
    const byEmail = (await this.deps.facade.rawQuery('_User', { where: { email }, limit: 5 })).results;
    const byName = (await this.deps.facade.rawQuery('_User', { where: { username: email }, limit: 5 })).results;
    const seen = new Set<string>();
    const candidates = byEmail.concat(byName).filter((u) => {
      const id = u.objectId as string;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const user = candidates.find((u) => typeof u._hashed_password === 'string' && verifyPassword(password, u._hashed_password));
    if (!user) return refuse();
    // AFTER the password, like `POST /login` (BMG-004): "disabled" and "no
    // access" are only ever told through the one sentence, never as a code.
    if (isAccountDisabled(user)) return refuse();
    const access = adminAccessOf(user);
    if (!access) return refuse();

    const userId = user.objectId as string;
    const sessionToken = newSessionToken();
    await this.deps.facade.rawCreate('_Session', { sessionToken, userId });
    ctx.audit({ actor: userId, access });
    sendJSON(ctx.res, 200, { sessionToken, access, person: this.person(user, access), roles: await this.deps.rolesForUser(userId) });
  }

  /**
   * `POST /_admin/setup {email, password, username?}` (BMG-014). The first
   * admin account. Admin-gated: the credential (the editor hands it to the page
   * on the first load; an operator reads it from secrets.json) is the proof —
   * so this is not the unauthenticated setup route BAK-005-NOTES refused, and
   * it is not a password-change form either: it ADDS a person and leaves the
   * credential as it was.
   *
   * Once any full-access account exists this answers 409 for good: from then on
   * access is given on the Users page, by a full admin, to a named person.
   */
  async setup(ctx: RequestContext): Promise<void> {
    if (await this.fullAdminExists()) throw new HttpError(409, SETUP_DONE);
    const body = await readJSONBody(ctx.req);
    const email = str(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || email.indexOf('@') === -1) throw new HttpError(400, 'An email address is needed — it is what you will sign in with.');
    if (!password) throw new HttpError(400, 'Choose a password.');
    const username = str(body.username) || email;

    const made = await this.system.handle({ op: 'create', username, email, password, emailVerified: true });
    if (made.outcome !== 'done' || !made.userId) {
      throw new HttpError(
        made.code === 'user/already-exists' ? 409 : 400,
        made.code === 'user/already-exists'
          ? `There is already an account called "${username}". Give it backend access on the Users page instead, or choose another username.`
          : made.error || 'The account was not created.'
      );
    }
    const userId = made.userId;
    await this.deps.facade.rawSave('_User', userId, { adminAccess: 'full' });

    // The `admin` role: ordinary, so the app's rules can say `role:admin`.
    const ensured = await this.roles.ensure(ADMIN_ROLE_NAME);
    if (ensured.created) {
      await this.roles.describe(ensured.role, 'People who administer this backend. Made with the first admin account — use it in permission rules.');
    }
    await this.roles.addMember(ensured.role, userId);

    const sessionToken = newSessionToken();
    await this.deps.facade.rawCreate('_Session', { sessionToken, userId });
    ctx.audit({ userId, username, role: ADMIN_ROLE_NAME });
    const user = await this.deps.facade.rawFetch('_User', userId);
    sendJSON(ctx.res, 201, { sessionToken, access: 'full', person: this.person(user, 'full'), roles: await this.deps.rolesForUser(userId) });
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private async fullAdminExists(): Promise<boolean> {
    const { results } = await this.deps.facade.rawQuery('_User', { where: { adminAccess: 'full' }, limit: 1 });
    return results.length > 0;
  }

  /** The signed-in person, or null when the credential (or nothing) signed in. */
  private async personOf(ctx: RequestContext): Promise<DashboardPerson | null> {
    const p = ctx.principal;
    if (p.kind !== 'admin' || !p.userId) return null;
    try {
      const user = await this.deps.facade.rawFetch('_User', p.userId);
      return this.person(user, p.readonly ? 'readonly' : 'full');
    } catch {
      return null;
    }
  }

  private person(user: Record<string, unknown>, access: AdminAccess): DashboardPerson {
    return {
      id: user.objectId as string,
      username: typeof user.username === 'string' ? user.username : null,
      email: typeof user.email === 'string' ? user.email : null,
      access
    };
  }
}
