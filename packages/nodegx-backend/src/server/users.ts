/**
 * Minimal Parse-wire session/user endpoints — the subset `userservice.ts`
 * actually emits (WF-004 wire-protocol decision):
 *
 *   POST /login       { username, password, _method: 'GET' } -> user + sessionToken
 *   POST /logout      {} (session token header)              -> {}
 *   POST /users       signup { username, password, email, ...props } -> 201
 *   GET  /users/me    (session token header)                 -> user + sessionToken
 *   PUT  /users/:id   (session token header, own user only)  -> { updatedAt }
 *
 * Password-reset / email-verification endpoints live in ./email-routes.ts
 * (BAK-002) — this file only carries the per-backend LOGIN POLICY those flows
 * gate on (`emailConfig.config.verification.requireForLogin`) and the
 * best-effort verification-email send on signup (opt-in per backend,
 * `emailConfig.config.verification.sendOnSignup`).
 *
 * Storage: `_User` rows via the same adapter as everything else, passwords as
 * `scrypt$<salt>$<hash>` in `_hashed_password` (never sent over the wire —
 * IStorageFacade strips it). Sessions in `_Session` rows with Parse-style
 * revocable tokens (`r:<random>`). Error code 209 (invalid session) is
 * load-bearing: it is what makes the client drop a stale local session.
 *
 * @module nodegx-backend/server/users
 */

import * as crypto from 'crypto';
import type * as http from 'http';

import type { IStorageFacade } from '@noodl/backend-contract';
import { Sessions } from '../auth/sessions';
import type { SecurityState } from '../security/state';
import type { EmailConfigState } from '../email/EmailConfigState';
import type { EmailRoutes } from './email-routes';
import { HttpError, readJSONBody, sendJSON } from './http-util';
import { ACCOUNT_DISABLED_MESSAGE, ADMIN_ONLY_USER_FIELDS, isAccountDisabled } from '../users/accountColumns';

function safeLog(...args: unknown[]): void {
  try {
    // eslint-disable-next-line no-console
    console.warn('[nodegx-backend/users]', ...args);
  } catch {
    // Ignore EPIPE
  }
}

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// P109 ISL-040: the session helpers live with the one minter and reader (`auth/sessions.ts`).
export { isSessionExpired, newSessionToken, sessionExpiryMs } from '../auth/sessions';

export class UserRoutes {
  private readonly facade: IStorageFacade;
  // Reserved for session-policy decisions (the signup rule itself is enforced
  // by the dispatcher's route gate).
  private readonly security: SecurityState | null;
  // BAK-002: login policy (requireForLogin) + best-effort signup verification
  // send. Both optional — a service built without email wiring (e.g. an older
  // test harness) just runs with no email policy at all.
  private readonly emailConfig: EmailConfigState | null;
  private readonly emailRoutes: EmailRoutes | null;
  // ISL-040: the security state's, so the access check and these routes read one rule.
  private readonly sessions: Sessions;

  constructor(facade: IStorageFacade, security?: SecurityState, emailConfig?: EmailConfigState, emailRoutes?: EmailRoutes) {
    this.facade = facade;
    this.security = security || null;
    this.sessions = security ? security.sessions : new Sessions(facade);
    this.emailConfig = emailConfig || null;
    this.emailRoutes = emailRoutes || null;
  }

  // ==========================================================================
  // Session resolution
  // ==========================================================================

  /**
   * Resolve a session token to its `_Session` row, or null — through `Sessions.resolve`, the
   * reader the access check uses too, so an ended session is refused by both (ISL-040).
   */
  private async findSession(token: string | undefined): Promise<Record<string, unknown> | null> {
    return this.sessions.resolve(token);
  }

  /** Resolve the request's session token header to a user record, or throw 209. */
  async requireUser(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    const token = req.headers['x-parse-session-token'] as string | undefined;
    const session = await this.findSession(token);
    if (!session) {
      throw new HttpError(400, 'Invalid session token', 209);
    }
    let user: Record<string, unknown>;
    try {
      user = await this.facade.rawFetch('_User', session.userId as string);
    } catch {
      throw new HttpError(400, 'Invalid session token', 209);
    }
    // BMG-004 (R3). Disabling revokes the sessions, so this only meets a row
    // minted in the gap between the two writes — answered as an invalid
    // session, 209, because that is the code that makes the client drop it.
    if (isAccountDisabled(user)) throw new HttpError(400, 'Invalid session token', 209);
    return user;
  }

  /**
   * DEF-005 (a) — the roles this user is in, for the session responses.
   *
   * 🔴 **Synthetic: `roles` is NOT a `_User` column and must never become one.**
   * It is resolved per response from `SecurityState.rolesForUser`, the single
   * non-recursive JOIN over `_Join_users__Role` that the access check itself
   * calls when it evaluates `role:member`. A second resolver here could have
   * answered "member" while enforcement disagreed; this cannot. The same
   * sentence `SystemRoles`' `roles` field carries, for the same reason.
   *
   * ⚠️ **Reading one's own roles grants nothing.** The server resolves them
   * again on every request it gates, from the junction and never from anything
   * the client sent — so a client that rewrites this value in its own memory
   * changes what its graph *renders* and nothing about what it may *do*. That
   * asymmetry is the whole reason the read is safe to hand to the browser while
   * the WRITES (`addusertorole`, `removeuserfromrole`) stay cloud-only.
   *
   * `undefined` rather than `[]` when there is no `SecurityState` at all — a
   * service built without one (older test harnesses) does not track membership,
   * and "this backend has no roles" must not be reported as "you are in none of
   * them". The same absent-versus-false distinction `emailVerified` records in
   * `signup` below.
   */
  private async rolesFor(userId: unknown): Promise<string[] | undefined> {
    if (!this.security || typeof userId !== 'string' || !userId) return undefined;
    return this.security.rolesForUser(userId);
  }

  // ==========================================================================
  // Handlers
  // ==========================================================================

  async login(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readJSONBody(req);
    const username = body.username as string;
    const password = body.password as string;
    if (!username || !password) {
      throw new HttpError(400, 'Invalid username/password.', 101);
    }

    const { results } = await this.facade.rawQuery('_User', { where: { username }, limit: 1 });
    const user = results[0];
    if (!user || !verifyPassword(password, user._hashed_password as string)) {
      // Parse answers 404 with code 101 for a failed login.
      throw new HttpError(404, 'Invalid username/password.', 101);
    }

    // BMG-004 (R3). AFTER the password check, so "disabled" is only ever told
    // to somebody who proved they hold the account — never an oracle for
    // which usernames exist.
    if (isAccountDisabled(user)) {
      throw new HttpError(403, ACCOUNT_DISABLED_MESSAGE, 119);
    }

    // BAK-002 login policy: a backend can require a verified email before
    // login. 205 mirrors Parse's own EMAIL_NOT_FOUND-family numbering
    // (distinct from the 209 session-invalid code the client branches on).
    if (this.emailConfig && this.emailConfig.config.verification.requireForLogin && !user.emailVerified) {
      throw new HttpError(403, 'Please verify your email address before logging in.', 205);
    }

    const sessionToken = await this.sessions.mint(user.objectId as string);

    const wire = await this.facade.wireRecord('_User', user);
    // ⚠️ The resolved roles go AFTER the spread, deliberately. If a `_User` row
    // ever acquired a literal `roles` column — an admin-side import, a restored
    // backup — `wire` would carry it, and a stored value outranking the live
    // junction is exactly the lie this field must never tell.
    sendJSON(res, 200, { ...wire, roles: await this.rolesFor(user.objectId), sessionToken });
  }

  async logout(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const token = req.headers['x-parse-session-token'] as string | undefined;
    const session = await this.findSession(token);
    if (session) {
      await this.facade.rawDelete('_Session', session.objectId as string);
    }
    sendJSON(res, 200, {});
  }

  async signup(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readJSONBody(req);
    const { username, password, ...rest } = body as Record<string, unknown> & {
      username?: string;
      password?: string;
    };
    if (!username) throw new HttpError(400, 'bad or missing username', 200);
    if (!password) throw new HttpError(400, 'password is required', 201);

    const { results } = await this.facade.rawQuery('_User', { where: { username }, limit: 1 });
    if (results.length > 0) {
      throw new HttpError(400, 'Account already exists for this username.', 202);
    }

    delete (rest as Record<string, unknown>).ACL;
    delete (rest as Record<string, unknown>)._method;
    // BMG-014: the flags an administrator sets are never taken from a signup.
    // Measured before this line existed: `...rest` below spread every field the
    // caller sent into the row, so a signup could arrive verified, or — once
    // the column existed — as the backend's admin.
    for (const field of ADMIN_ONLY_USER_FIELDS) delete (rest as Record<string, unknown>)[field];
    const user = await this.facade.rawCreate('_User', {
      // ⚠️ **`emailVerified: false` is written here, and it is the close of a
      // defect BCN-006 could only half-fix from the client.**
      //
      // The column was absent from every response on this wire — `/users`,
      // `/login` and `/users/me` alike — because a password signup never wrote
      // it. So the `User` node's `emailVerified` output read `undefined` for
      // every account, and a graph doing `if (!user.emailVerified) show the
      // "please verify" banner` could not tell "not verified" from "this
      // backend does not track it". BCN-006 made the *client* default a
      // brand-new sign-up to `false`, which fixed the account it had just
      // created and nothing else: a user whose row predates that, or who signs
      // in on a fresh page load, still read `undefined`.
      //
      // Writing the column is the honest fix, because it makes the value a
      // fact rather than a client-side guess. It also matches what this server
      // already believes — `login` gates on `!user.emailVerified`, i.e. it has
      // been reading absent as false all along.
      //
      // `...rest` first, so a custom field a signup supplies is kept; the
      // account flags were stripped from it above (BMG-014), so this default
      // is what every signup gets.
      emailVerified: false,
      ...rest,
      username,
      _hashed_password: hashPassword(password)
    });

    const sessionToken = await this.sessions.mint(user.objectId as string);

    // BAK-002: opt-in verification email on signup. Best-effort and NEVER
    // fails the signup itself — an operator who enabled sendOnSignup without
    // finishing SMTP setup gets a loud server-log warning (Mailer.send's
    // notConfiguredReason), not a broken signup flow. If requireForLogin is
    // also on, the user simply can't log in until the operator fixes SMTP and
    // the user (re-)requests verification — a strong, visible nudge.
    if (this.emailConfig && this.emailConfig.config.verification.sendOnSignup && this.emailRoutes && user.email) {
      this.emailRoutes.sendVerificationEmail(user).catch((e) => safeLog('signup verification send failed:', e));
    }

    // Parse's signup response: objectId + createdAt + sessionToken. The client
    // merges its own username/properties over this, so keep it minimal.
    sendJSON(res, 201, {
      objectId: user.objectId,
      createdAt: user.createdAt,
      // Resolved rather than assumed empty. A signup cloud function that puts
      // the new account straight into a role runs BEFORE this responds on some
      // graphs and after on others; asking the junction is right either way,
      // and hard-coding `[]` would be a guess that is wrong exactly when a
      // membership app's first screen depends on it.
      roles: await this.rolesFor(user.objectId),
      sessionToken
    });
  }

  async me(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const user = await this.requireUser(req);
    const wire = await this.facade.wireRecord('_User', user);
    // /users/me must echo the session token — the client stores this whole
    // response as its current user and reads sessionToken from it afterwards.
    //
    // Which is also why `roles` is answered HERE and not on a route of its own:
    // this response is already the client's current-user record, so membership
    // arrives on the read the client was making anyway. No new route, no second
    // round trip, and nothing for a `User` node to schedule.
    sendJSON(res, 200, {
      ...wire,
      roles: await this.rolesFor(user.objectId),
      sessionToken: req.headers['x-parse-session-token']
    });
  }

  async updateUser(req: http.IncomingMessage, res: http.ServerResponse, objectId: string): Promise<void> {
    const user = await this.requireUser(req);
    if (user.objectId !== objectId) {
      throw new HttpError(403, 'Cannot modify another user.', 206);
    }

    const body = await readJSONBody(req);
    delete body.ACL;
    delete body.objectId;
    delete body.sessionToken;
    delete body._hashed_password;
    // 🔴 DEF-005 AC3. `roles` is resolved, never stored, so a client PUTting it
    // could not escalate anything even if this line were absent — enforcement
    // reads the junction and has never read a `_User` column. It is stripped
    // anyway because the alternative is a row that CARRIES a roles list which
    // nothing consults: the next reader to find `roles` on a `_User` row would
    // reasonably believe it meant something. A field that cannot be trusted
    // must not be storable.
    delete body.roles;
    // BMG-004: account flags an administrator sets, never the account itself.
    for (const field of ADMIN_ONLY_USER_FIELDS) delete body[field];
    const passwordChanged = typeof body.password === 'string' && body.password;
    if (passwordChanged) {
      body._hashed_password = hashPassword(body.password as string);
    }
    delete body.password;

    const updated = await this.facade.rawSave('_User', objectId, body);

    // A password change revokes every OTHER session for this user (the one
    // that authorized the change stays valid) — a stolen session must not
    // survive the victim rotating their password. Adversarial-suite item.
    if (passwordChanged) {
      const currentToken = req.headers['x-parse-session-token'] as string;
      // PRD-001 §3.3: every other session, not a page — see IdentityStore.revokeAllSessions.
      const { results: sessions } = await this.facade.rawQueryAll('_Session', { where: { userId: objectId } });
      for (const session of sessions) {
        if (session.sessionToken !== currentToken) {
          await this.facade.rawDelete('_Session', session.objectId as string);
        }
      }
    }

    sendJSON(res, 200, { updatedAt: updated.updatedAt });
  }
}
