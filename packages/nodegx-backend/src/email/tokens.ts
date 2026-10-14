/**
 * Token infrastructure shared by both email flows (BAK-002 step 2):
 * password reset and email verification. Tokens are:
 *
 *   - single-use     (consumed atomically — see EmailTokenStore.consume)
 *   - time-limited    (kind-specific TTL; see RESET_TTL_MS / VERIFY_TTL_MS)
 *   - HASHED at rest (sha256; only the hash is ever persisted — the plaintext
 *     token exists only in memory long enough to put it in the email)
 *
 * Storage: a plain `_EmailToken` collection via IStorageFacade, auto-created
 * on first write exactly like every other BYOB collection (LocalSQLAdapter's
 * `_ensureTable` + column inference) — no schema migration needed.
 *
 * @module nodegx-backend/email/tokens
 */

import * as crypto from 'crypto';

import type { IStorageFacade } from '@noodl/backend-contract';

export type TokenKind = 'reset' | 'verify' | 'magic' | 'code';

/** Password-reset links are short-lived: a leaked reset email is a live credential. */
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
/** Verification links are informational, not a credential-change — longer-lived. */
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/**
 * BAK-004 magic links. The TTL is configurable (auth.json `magicLink.ttlMinutes`)
 * because deliverability delays vary wildly between SMTP setups; this is the
 * default. A magic link is a *login credential in an inbox*, so it is the
 * shortest-lived of the three by design.
 */
export const MAGIC_LINK_DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * SRK-001: wrong guesses one code survives. With the per-address budget in
 * `oauth-routes.ts`, this is what makes six digits safe to put in an inbox:
 * a code is spent by its fifth wrong guess, so guessing means asking for new
 * codes, and every new code is a mail in the owner's inbox.
 */
export const EMAIL_CODE_MAX_ATTEMPTS = 5;

const TOKEN_BYTES = 32;

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function newPlaintextToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

export class EmailTokenStore {
  private readonly facade: IStorageFacade;

  constructor(facade: IStorageFacade) {
    this.facade = facade;
  }

  /**
   * Mint + persist (hashed) a token for `userId`; returns the PLAINTEXT token to
   * put in the email — never stored.
   *
   * `extra` carries the few fields a flow needs to remember across the round
   * trip to an inbox. BAK-004's magic links use it for two: the `email` (a
   * signup link is issued before any user exists, so `userId` is empty and the
   * address IS the identity) and the `redirectUrl` (already authorised against
   * the redirect allow-list at REQUEST time, so the click cannot smuggle in a
   * new destination). Nothing secret goes in here — the row is queryable by
   * anything with database access, whereas the token itself never is.
   */
  async issue(userId: string, kind: TokenKind, ttlMs: number, extra?: Record<string, unknown>): Promise<string> {
    const token = newPlaintextToken();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    await this.facade.rawCreate('_EmailToken', {
      ...(extra || {}),
      tokenHash: hashToken(token),
      userId,
      kind,
      expiresAt,
      consumedAt: null
    });
    return token;
  }

  /**
   * Verify + consume in one step: a token that fails any check (not found,
   * already used, expired, wrong kind, wrong user when `expectedUserId` is
   * given) returns null — the caller cannot distinguish WHY, which is
   * deliberate (no oracle for token guessing). On success the token row is
   * marked consumed before the userId is returned, so a token can never be
   * used twice even under a race (the second caller reads `consumedAt` set).
   */
  async consume(token: string, kind: TokenKind, expectedUserId?: string): Promise<string | null> {
    const row = await this.consumeRow(token, kind, expectedUserId);
    return row ? (row.userId as string) : null;
  }

  /**
   * Every check `consumeRow` makes, and no write — the row is neither consumed
   * nor touched. For a request that must not spend a token merely by arriving
   * (HLT-015: a magic link's GET, which mail scanners fetch before the person
   * does). A row it returns can still be spent by someone else before the
   * caller acts on it, so nothing may be GRANTED on a peek; only `consumeRow`
   * grants.
   */
  async peekRow(token: string, kind: TokenKind, expectedUserId?: string): Promise<Record<string, unknown> | null> {
    const tokenHash = hashToken(token);
    const { results } = await this.facade.rawQuery('_EmailToken', { where: { tokenHash }, limit: 1 });
    const row = results[0];
    if (!row) return null;
    if (row.kind !== kind) return null;
    if (row.consumedAt) return null;
    if (typeof row.expiresAt !== 'string' || new Date(row.expiresAt).getTime() < Date.now()) return null;
    if (expectedUserId && row.userId !== expectedUserId) return null;
    return row;
  }

  /**
   * SRK-001: mint a six-digit code for `email`, and spend every code still
   * open for that address first, so there is only ever one to guess.
   * Returns the PLAINTEXT code to put in the email — only its hash is stored,
   * keyed to the address, so the same six digits for another address hash
   * differently. (Six digits hash-at-rest stop a casual reader of the table,
   * not a determined one: anyone with the database can try a million hashes.
   * They could also mint themselves a session, so that is not the line.)
   */
  async issueCode(email: string, userId: string, ttlMs: number, extra?: Record<string, unknown>): Promise<string> {
    await this.spendOpenCodes(email);
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await this.facade.rawCreate('_EmailToken', {
      ...(extra || {}),
      email,
      tokenHash: hashToken(`${email}:${code}`),
      userId,
      kind: 'code',
      attempts: 0,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      consumedAt: null
    });
    return code;
  }

  /**
   * SRK-001: the open code for `email`, spent if `code` matches it. A wrong
   * guess counts against the code, and the guess that reaches
   * `EMAIL_CODE_MAX_ATTEMPTS` spends it, so the right code typed afterwards
   * no longer works either. Every failure returns null, for the same reason
   * `consume` does.
   */
  async redeemCode(email: string, code: string): Promise<Record<string, unknown> | null> {
    if (!/^\d{6}$/.test(code)) return null;
    const row = await this.openCode(email);
    if (!row) return null;
    const given = Buffer.from(hashToken(`${email}:${code}`), 'utf8');
    const stored = Buffer.from(String(row.tokenHash || ''), 'utf8');
    const now = new Date().toISOString();
    if (given.length === stored.length && crypto.timingSafeEqual(given, stored)) {
      await this.facade.rawSave('_EmailToken', row.objectId as string, { consumedAt: now });
      return row;
    }
    const attempts = (Number(row.attempts) || 0) + 1;
    await this.facade.rawSave('_EmailToken', row.objectId as string, {
      attempts,
      ...(attempts >= EMAIL_CODE_MAX_ATTEMPTS ? { consumedAt: now } : {})
    });
    return null;
  }

  /**
   * The open code for an address, or null. Only the NEWEST row can be open,
   * because `issueCode` spends the others first, so this reads one row however
   * many spent codes an address has collected.
   */
  private async openCode(email: string): Promise<Record<string, unknown> | null> {
    const { results } = await this.facade.rawQuery('_EmailToken', {
      where: { email, kind: 'code' },
      sort: '-createdAt',
      limit: 1
    });
    const row = results[0];
    if (!row || row.consumedAt) return null;
    if (typeof row.expiresAt !== 'string' || new Date(row.expiresAt).getTime() < Date.now()) return null;
    return row;
  }

  /** The newest few, which is where an open one can be (two requests racing can leave two). */
  private async spendOpenCodes(email: string): Promise<void> {
    const { results } = await this.facade.rawQuery('_EmailToken', {
      where: { email, kind: 'code' },
      sort: '-createdAt',
      limit: 10
    });
    const now = new Date().toISOString();
    for (const r of results) {
      if (!r.consumedAt) await this.facade.rawSave('_EmailToken', r.objectId as string, { consumedAt: now });
    }
  }

  /**
   * The same single-use consumption, returning the WHOLE row rather than just
   * its userId — what a flow needs when it stored `extra` fields at issue time
   * (BAK-004 magic links). `consume` above is this, projected.
   */
  async consumeRow(token: string, kind: TokenKind, expectedUserId?: string): Promise<Record<string, unknown> | null> {
    const row = await this.peekRow(token, kind, expectedUserId);
    if (!row) return null;

    // Mark consumed FIRST — a concurrent second consume() on the same row now
    // sees consumedAt set and reads null, even though this isn't a single
    // transaction (single-process SQLite serializes writes; documented
    // best-effort, not a distributed-lock claim).
    await this.facade.rawSave('_EmailToken', row.objectId as string, { consumedAt: new Date().toISOString() });
    return row;
  }
}
