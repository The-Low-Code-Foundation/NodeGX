/**
 * Sign-in sessions: the one place a `_Session` row is minted for a person, and the one place a
 * session token is turned back into a row (P109 ISL-040, P78-DBT-SESSIONS).
 *
 * **The rule, as Richard ruled it on 2026-10-11: a sign-in ends after 30 days unused**, and each
 * backend can change the number on its Sign-in page (`auth.json` `sessions.idleDays`). So:
 *
 *   - every door that signs a person in (`POST /login`, `POST /users`, the provider and magic-link
 *     exchange, the manager's sign-in and first-admin setup) calls `mint()`, which writes
 *     `expiresAt` = now + the window and `renews: true`;
 *   - every reader (`SecurityState.resolvePrincipal` for the access check, `UserRoutes` for
 *     `/users/me` and friends, `SystemUsers` for the cloud Verify Session Token node) calls
 *     `resolve()`, which refuses a row whose end has passed and moves a renewing row's end on.
 *
 * Before this, nothing that signed a person in wrote an end, and only `/users/me`'s reader read
 * one — so an impersonation session past its hour still read `/classes` and still verified.
 *
 * ⚠️ **Only a renewing row is moved on.** A row minted with a fixed end (the cloud runtime's
 * `Users.impersonate()`, the MCP door's one-minute session for a bound key) keeps that end however
 * often it is used; stretching it would turn a one-hour impersonation into a 30-day one.
 *
 * ⚠️ **A row with no end is a session minted before this change, not an expired one.** It keeps
 * working and is given an end (and made renewing) by its next use, or by `settle()` on start —
 * the deploy that brings the rule in must not sign everyone out.
 *
 * @module nodegx-backend/auth/sessions
 */

import * as crypto from 'crypto';

import type { IStorageFacade } from '@noodl/backend-contract';

import { logger } from '../ops/logger';
import { DEFAULT_SESSION_IDLE_DAYS, MAX_SESSION_IDLE_DAYS } from './model';

export { DEFAULT_SESSION_IDLE_DAYS, MAX_SESSION_IDLE_DAYS };

const DAY_MS = 24 * 60 * 60 * 1000;

type Row = Record<string, unknown>;

export function newSessionToken(): string {
  return 'r:' + crypto.randomBytes(24).toString('hex');
}

/**
 * When does this `_Session` row stop being valid? `null` = it carries no end.
 *
 * CWF-015 filed this as "`impersonate()` writes `expiresAt` and `findSession` never reads it". It
 * is deliberately liberal about the stored shape, because the writers do not agree: `mint()`
 * writes an ISO string, the cloud runtime's `Users.impersonate()` writes a real `Date` through
 * `Records.create` (an ISO string by the time it reaches the adapter), a Parse-wire client can send
 * `{__type: 'Date', iso}`, and a hand-written admin row may carry epoch milliseconds.
 *
 * ⚠️ **An unreadable value means "no end", not "ended".** Guessing wrong in the other direction
 * signs out every account on a backend at once, so an absent, null, empty or unparseable value
 * keeps the session alive and only a value we can genuinely read as a past instant ends it.
 */
export function sessionExpiryMs(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'object') {
    const iso = (value as Row).iso;
    if (typeof iso === 'string') {
      const t = Date.parse(iso);
      return Number.isNaN(t) ? null : t;
    }
  }
  return null;
}

/** True only when the row carries a readable `expiresAt` that has passed. */
export function isSessionExpired(session: Row, now: number = Date.now()): boolean {
  const expiry = sessionExpiryMs(session.expiresAt);
  return expiry !== null && expiry <= now;
}

/** A row the sign-in rule owns: minted by `mint()`, or minted before there was a rule. */
function renews(row: Row): boolean {
  return row.renews === true || sessionExpiryMs(row.expiresAt) === null;
}

export class Sessions {
  private readonly facade: IStorageFacade;
  private readonly idleDays: () => number;

  /**
   * `idleDays` is read on every call, never captured, so a number saved on the Sign-in page takes
   * effect on the next request. Absent (an older harness) is the ruled default.
   */
  constructor(facade: IStorageFacade, idleDays?: () => number) {
    this.facade = facade;
    this.idleDays = idleDays || (() => DEFAULT_SESSION_IDLE_DAYS);
  }

  private idleMs(): number {
    return this.idleDays() * DAY_MS;
  }

  /**
   * How stale a renewing row's end may get before a use writes a new one. Without it every
   * request would be a write; with it a session is moved on at most once a day (sooner when the
   * window is shorter than a day's worth of steps), so "30 days unused" is accurate to a day.
   */
  private step(): number {
    return Math.min(DAY_MS, this.idleMs() / 30);
  }

  /** Sign a person in: a new token whose session ends after the window unused. */
  async mint(userId: string): Promise<string> {
    const sessionToken = newSessionToken();
    await this.facade.rawCreate('_Session', {
      sessionToken,
      userId,
      expiresAt: new Date(Date.now() + this.idleMs()).toISOString(),
      renews: true
    });
    return sessionToken;
  }

  /**
   * The `_Session` row for this token, or null when there is none or it has ended. An ended row is
   * deleted (best effort: a failed delete still refuses it). A renewing row's end is moved on.
   */
  async resolve(token: string | undefined): Promise<Row | null> {
    if (!token) return null;
    const { results } = await this.facade.rawQuery('_Session', { where: { sessionToken: token }, limit: 1 });
    const session = results[0] || null;
    if (!session) return null;
    const now = Date.now();
    if (isSessionExpired(session, now)) {
      await this.drop(session);
      return null;
    }
    if (renews(session)) await this.moveOn(session, now);
    return session;
  }

  /**
   * Give an end to every session that has none, pull in any renewing end past the window (after
   * the number was made smaller), and delete the ended ones. Run on start and after the Sign-in
   * page saves a new number. Returns how many rows it wrote or deleted.
   */
  async settle(): Promise<number> {
    const { results } = await this.facade.rawQueryAll('_Session', {});
    const now = Date.now();
    let changed = 0;
    for (const session of results) {
      if (isSessionExpired(session, now)) {
        await this.drop(session);
        changed++;
        continue;
      }
      const end = sessionExpiryMs(session.expiresAt);
      if (end === null || (session.renews === true && end > now + this.idleMs())) {
        await this.write(session, now + this.idleMs());
        changed++;
      }
    }
    return changed;
  }

  private async moveOn(session: Row, now: number): Promise<void> {
    const end = sessionExpiryMs(session.expiresAt);
    const target = now + this.idleMs();
    // No end yet, an end older than a step, or an end past a window made shorter since.
    if (end !== null && end >= target - this.step() && end <= target) return;
    await this.write(session, target);
  }

  private async write(session: Row, end: number): Promise<void> {
    const expiresAt = new Date(end).toISOString();
    try {
      await this.facade.rawSave('_Session', session.objectId as string, { expiresAt, renews: true });
      session.expiresAt = expiresAt;
      session.renews = true;
    } catch (e) {
      // Moving an end on must never turn a working session into a 500; the row keeps its old end.
      logger.warn('auth.session-renew-failed', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  private async drop(session: Row): Promise<void> {
    try {
      await this.facade.rawDelete('_Session', session.objectId as string);
    } catch {
      /* the row stays; it is still refused */
    }
  }
}
