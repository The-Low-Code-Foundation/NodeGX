/**
 * SecurityState — the model wired to disk and database (BAK-003).
 *
 * Three stores, three lifetimes (model doc §2):
 *   - `<dataDir>/security.json` — policy. Diffable, deploys with the backend,
 *     MCP-editable. Strictly validated; an invalid file refuses to start.
 *   - `<dataDir>/secrets.json`  — the admin credential (plaintext, mode 0600).
 *     The editor reads it from the backend dir it owns; deploys provision it
 *     via --token (the WF-004 flag, which now means "admin credential").
 *   - the database — sessions, role membership, hashed API keys.
 *
 * Also home of the deploy interlock: a non-loopback bind with devOpen on is a
 * refuse-to-start error, and enforcement over the ephemeral mock (which cannot
 * evaluate ACLs) likewise refuses. Loud-failure doctrine applied to security.
 *
 * @module nodegx-backend/security/state
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type * as http from 'http';

import type { IStorageFacade } from '@noodl/backend-contract';
import type { AclOption } from '../persistence/AdapterFacade';
import { HttpError } from '../server/http-util';
import {
  ADMIN_TOKEN_ENV,
  describeMissingSecret,
  readProvisionedSecret,
  READONLY_TOKEN_ENV,
  SecretProvenance,
  SecretsStartupError
} from '../config/provisioned-secrets';
import {
  ActingUser,
  ClpOp,
  Principal,
  SecurityConfig,
  defaultSecurityConfig,
  validateSecurityConfig,
  principalKeys,
  checkClp,
  effectiveCreatorOwns,
  AccessDecision,
  DeployedFunction,
  UnresolvedFunction,
  unresolvedFunctionRules,
  proposedFunctionsBlock
} from './model';

export class SecurityStartupError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SecurityStartupError';
    this.code = code;
  }
}

export type { AclOption } from '../persistence/AdapterFacade';

const SECURITY_FILE = 'security.json';
const SECRETS_FILE = 'secrets.json';

/**
 * A key's `scopes` column is a JSON array stored as text. It is parsed in three
 * places and a malformed value means "no scopes", never a thrown request —
 * BRG-002 §3.3 pulled the three inline copies of this out into one function.
 */
function parseScopes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Constant-time string compare (hash both sides to erase length information). */
function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(sha256(a), 'hex'), Buffer.from(sha256(b), 'hex'));
}

function atomicWriteJSON(filePath: string, value: unknown, mode?: number): void {
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', mode !== undefined ? { mode } : undefined);
  fs.renameSync(tmp, filePath);
  if (mode !== undefined) {
    try {
      fs.chmodSync(filePath, mode);
    } catch {
      // chmod is best-effort on platforms without POSIX modes.
    }
  }
}

/**
 * SB-016's refusal, written out.
 *
 * 🔴 **The message is the feature.** The failure this interlock exists to stop
 * is a silent one that the person who hits it misattributes — SB-015 F24: an
 * author told "That page could not be found" about a page they just published.
 * A refusal that said only *some function is unresolved* would reproduce that
 * one layer up, at the exact moment somebody is trying to ship. So it names
 * every endpoint, says what each one currently resolves to and where that came
 * from, and prints the block to paste. Exported so a spec can grade the text
 * rather than the throw.
 */
export function undeclaredFunctionMessage(
  configPath: string,
  unresolved: UnresolvedFunction[],
  functionsBlock: string
): string {
  const rows = unresolved.map(
    (fn) =>
      `  - ${fn.name}: "Allow Unauthenticated" is ${fn.allowNoAuth ? 'TICKED' : 'unticked'} in the graph, ` +
      `so this deploy would enforce ${JSON.stringify(fn.rule)}` +
      (fn.rule === 'public' ? '  <-- callable by anyone on the internet' : '')
  );
  return (
    `Refusing to start: ${unresolved.length} cloud function${unresolved.length === 1 ? '' : 's'} ` +
    `${unresolved.length === 1 ? 'has' : 'have'} no rule in ${configPath}, and the service is asked to bind ` +
    `beyond localhost.\n\n` +
    `An undeclared function does NOT fall back to "defaults" the way an undeclared collection does. Its rule ` +
    `comes from the Request node's own "Allow Unauthenticated" port, which has two values and cannot say ` +
    `"role:admin" at all — and a cloud function runs as system, so this gate is the only boundary in front of ` +
    `it.\n\n` +
    `Undeclared here:\n${rows.join('\n')}\n\n` +
    `  Fix: add this to ${configPath}. Every rule below is the one being enforced right now, so pasting it ` +
    `changes nothing about who can call what — it records the decision so the gate stops depending on a ` +
    `checkbox in the graph:\n\n` +
    `${functionsBlock}\n\n` +
    `  Then tighten it. An endpoint only an administrator should reach wants "role:admin", which the graph ` +
    `port cannot express; "authenticated" above means any account that can sign up.\n` +
    `  Or bind to 127.0.0.1, where this does not apply.`
  );
}

export interface SecurityDeps {
  dataDir: string;
  /** Loopback bind? (The interlock and the dev-open fast-path both key on it.) */
  loopback: boolean;
  /** WF-004 --token value, if given: provisions/overrides the admin credential. */
  cliToken: string | null;
  /**
   * BAK-005 --readonly-token, if given: provisions/overrides the SECOND admin
   * credential tier (read everything, write nothing). Deliberately NOT
   * auto-minted — a backend has a read-only tier only when an operator asks
   * for one, so `adminReadonlyToken` stays null on every existing backend.
   */
  readonlyToken?: string | null;
  /**
   * SB-016: every cloud endpoint this backend is about to serve, scanned off
   * the workflow bundles on disk (`workflow/functionDeclarations.ts`).
   *
   * 🔴 **Required, not optional.** An absent list and an empty one mean
   * different things — *nobody looked* versus *there are no endpoints* — and an
   * interlock that silently skips itself when its input is missing is the
   * accept-and-ignore shape this model bans everywhere else. Every construction
   * site says which one it means.
   */
  deployedFunctions: DeployedFunction[];
  facade: IStorageFacade;
  /**
   * PRD-005: refuse to start rather than mint a missing admin credential. The credential may
   * still arrive by `--token`, by `NODEGX_ADMIN_TOKEN` / `NODEGX_ADMIN_TOKEN_FILE`, or from an
   * existing `secrets.json`; only the mint is refused.
   */
  requireSecrets?: boolean;
}

export class SecurityState {
  readonly config: SecurityConfig;
  readonly adminToken: string;
  /** The read-only admin credential, or null when this backend has no such tier. */
  readonly adminReadonlyToken: string | null;
  /** True when the default config was just written (migration notice surface). */
  readonly migratedThisStart: boolean;
  /** True when the admin credential was auto-minted on THIS start (first-run surface). */
  readonly adminTokenMintedThisStart: boolean;
  /** PRD-005: where each admin credential came from. Sources only — never a value. */
  readonly secretProvenance: { adminToken: SecretProvenance; adminReadonlyToken: SecretProvenance };
  private readonly deps: SecurityDeps;

  constructor(deps: SecurityDeps) {
    this.deps = deps;

    // --- security.json ------------------------------------------------------
    const configPath = path.join(deps.dataDir, SECURITY_FILE);
    if (fs.existsSync(configPath)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (e) {
        throw new SecurityStartupError(
          'SECURITY_CONFIG_INVALID',
          `${configPath} is not valid JSON: ${e instanceof Error ? e.message : e}`
        );
      }
      const errors = validateSecurityConfig(parsed);
      if (errors.length > 0) {
        throw new SecurityStartupError(
          'SECURITY_CONFIG_INVALID',
          `${configPath} is invalid — refusing to start with a security config that would not be fully enforced:\n` +
            errors.map((e) => `  - ${e}`).join('\n')
        );
      }
      this.config = parsed as SecurityConfig;
      this.migratedThisStart = false;
    } else {
      this.config = defaultSecurityConfig();
      fs.mkdirSync(deps.dataDir, { recursive: true });
      atomicWriteJSON(configPath, this.config);
      this.migratedThisStart = true;
    }

    // --- secrets.json -------------------------------------------------------
    // Read-modify-write of the WHOLE file, preserving every namespace another
    // subsystem owns (config/SecretsStore's convention). Security owns exactly
    // the two top-level admin credential keys.
    const secretsPath = path.join(deps.dataDir, SECRETS_FILE);
    let secrets: { adminToken?: string; adminReadonlyToken?: string } = {};
    if (fs.existsSync(secretsPath)) {
      try {
        secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
      } catch {
        throw new SecurityStartupError(
          'SECRETS_INVALID',
          `${secretsPath} is not valid JSON. Delete it to mint a fresh admin credential, or fix it.`
        );
      }
    }
    // Precedence: --token, then the environment, then the file, then — unless the deploy said
    // not to — a mint. PRD-005 added the middle two and the refusal.
    let mintedThisStart = false;
    let adminToken: string;
    let adminTokenProvenance: SecretProvenance;
    const adminFromEnv = readProvisionedSecret(ADMIN_TOKEN_ENV);
    if (deps.cliToken) {
      // WF-004 migration: the --token flag provisions the admin credential.
      secrets.adminToken = deps.cliToken;
      atomicWriteJSON(secretsPath, secrets, 0o600);
      adminToken = deps.cliToken;
      adminTokenProvenance = { source: 'cli', persisted: true };
    } else if (adminFromEnv) {
      // PRD-005: from the environment, and deliberately NOT written to secrets.json — the point
      // of an environment-supplied secret is that it never lands in the volume. A stale value
      // already in the file is left alone; the environment wins while it is set.
      adminToken = adminFromEnv.value;
      adminTokenProvenance = { source: adminFromEnv.source, persisted: false };
    } else if (secrets.adminToken) {
      adminToken = secrets.adminToken;
      adminTokenProvenance = { source: 'file', persisted: true };
    } else if (deps.requireSecrets) {
      throw new SecretsStartupError(
        'SECRET_NOT_PROVISIONED',
        describeMissingSecret({
          name: 'adminToken',
          purpose: 'the admin credential — every /admin route, the dashboard, and CLI backup/restore',
          envName: ADMIN_TOKEN_ENV,
          cliFlag: '--token <value>',
          secretsPath,
          fileKey: '"adminToken"'
        })
      );
    } else {
      secrets.adminToken = crypto.randomBytes(32).toString('base64url');
      mintedThisStart = true;
      atomicWriteJSON(secretsPath, secrets, 0o600);
      adminToken = secrets.adminToken;
      adminTokenProvenance = { source: 'generated', persisted: true };
    }
    this.adminToken = adminToken;
    this.adminTokenMintedThisStart = mintedThisStart;

    // BAK-005's read-only tier. Provisioned only on request — flag, or (PRD-005) the
    // environment; never minted; refused if it collides with the full credential (a read-only
    // token that silently grants write is exactly the accept-and-ignore security config this
    // model bans).
    let readonlyProvenance: SecretProvenance = { source: 'absent', persisted: false };
    const readonlyFromEnv = deps.readonlyToken ? null : readProvisionedSecret(READONLY_TOKEN_ENV);
    const readonlyCandidate = deps.readonlyToken || (readonlyFromEnv ? readonlyFromEnv.value : null);
    if (readonlyCandidate) {
      if (readonlyCandidate === adminToken) {
        throw new SecurityStartupError(
          'READONLY_TOKEN_COLLIDES',
          'Refusing to start: the read-only admin credential is identical to the full admin credential, ' +
            'so "read-only" would silently grant full write access. Use a different --readonly-token.'
        );
      }
      if (deps.readonlyToken) {
        secrets.adminReadonlyToken = deps.readonlyToken;
        atomicWriteJSON(secretsPath, secrets, 0o600);
        readonlyProvenance = { source: 'cli', persisted: true };
      } else if (readonlyFromEnv) {
        readonlyProvenance = { source: readonlyFromEnv.source, persisted: false };
      }
    }
    const storedReadonly =
      typeof secrets.adminReadonlyToken === 'string' && secrets.adminReadonlyToken.length > 0
        ? secrets.adminReadonlyToken
        : null;
    this.adminReadonlyToken = readonlyCandidate || storedReadonly;
    if (!readonlyCandidate && storedReadonly) readonlyProvenance = { source: 'file', persisted: true };
    this.secretProvenance = { adminToken: adminTokenProvenance, adminReadonlyToken: readonlyProvenance };

    // --- The deploy interlock ----------------------------------------------
    if (!deps.loopback && this.config.devOpen) {
      throw new SecurityStartupError(
        'DEV_OPEN_ON_PUBLIC_BIND',
        `Refusing to start: ${configPath} has "devOpen": true but the service is asked to bind beyond ` +
          `localhost. Dev-open disables the data and function gates and exists only for local development ` +
          `(admin routes always require the credential — FH-024).\n` +
          `  Fix: set "devOpen": false in ${SECURITY_FILE} (then configure collection permissions), ` +
          `or bind to 127.0.0.1.`
      );
    }

    // --- SB-016: the second deploy interlock -------------------------------
    // The one above is about a setting that turns the gates off. This one is
    // about the gate that was never on: an endpoint with no `functions` entry
    // takes its rule from the graph's own `Allow Unauthenticated` port, and
    // `defaults` — which closes an undeclared *collection* — is never consulted.
    // So the two gates fall back in opposite directions out of one file, and the
    // one with no defaults tier is the one whose callers run as system.
    if (!deps.loopback) {
      const unresolved = unresolvedFunctionRules(this.config, deps.deployedFunctions);
      if (unresolved.length > 0) {
        throw new SecurityStartupError(
          'UNDECLARED_FUNCTION_ON_PUBLIC_BIND',
          undeclaredFunctionMessage(configPath, unresolved, proposedFunctionsBlock(this.config, unresolved))
        );
      }
    }
  }

  /** Persist the (mutated) config. Callers mutate this.config then save. */
  save(): void {
    atomicWriteJSON(path.join(this.deps.dataDir, SECURITY_FILE), this.config);
  }

  /** Dev-open is only ever active on a loopback bind (the interlock guarantees it). */
  get devOpenActive(): boolean {
    return this.config.devOpen && this.deps.loopback;
  }

  // ==========================================================================
  // Principal resolution (evaluation-order step 1)
  // ==========================================================================

  async resolvePrincipal(req: http.IncomingMessage): Promise<Principal> {
    const h = req.headers;

    // 1. Master key / admin bearer token. The read-only tier (BAK-005) is the
    //    same credential slot, a different secret: it resolves to an admin
    //    principal carrying `readonly`, which the dispatcher then refuses every
    //    state-changing request for.
    const masterKey = h['x-parse-master-key'];
    if (typeof masterKey === 'string' && masterKey.length > 0) {
      const admin = this.matchAdminCredential(masterKey);
      if (admin) return admin;
      throw new HttpError(401, 'Unauthorized.');
    }
    //
    // 🔴 FED-005 — a `Bearer` that is not an admin credential now FALLS THROUGH
    // to the API-key lookup instead of throwing.
    //
    // It used to throw 401 immediately, which made `Authorization: Bearer <api
    // key>` unusable — and that is the header an MCP client sends. (WFA-005/F7
    // had already been bitten by the same throw from the other side: a webhook
    // caller presenting its per-hook secret as a Bearer was rejected before
    // routing, and the fix there was to exempt the route rather than to make
    // the header mean more than one thing.) FED-005 §3.1 requires both
    // spellings, and the alternative — a second credential-resolution path
    // inside the MCP handler — would be a second answer to "is this key
    // valid?", which is the one question that must have exactly one.
    //
    // Nothing is loosened. An admin token still resolves to admin and only to
    // admin; a Bearer that is neither an admin token nor a live key still
    // ends at the same 401 a few lines down, and still counts against the same
    // failure budget. What changes is that one more real credential is
    // recognised in a header that already carried credentials.
    const auth = h['authorization'];
    const bearer =
      typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (bearer) {
      const admin = this.matchAdminCredential(bearer);
      if (admin) return admin;
    }

    // 2. API key — in its own header, or as the Bearer token above.
    const apiKeyHeader = h['x-nodegx-api-key'];
    const apiKey = typeof apiKeyHeader === 'string' && apiKeyHeader.length > 0 ? apiKeyHeader : bearer;
    if (typeof apiKey === 'string' && apiKey.length > 0) {
      const row = await this.lookupApiKey(apiKey);
      if (!row) throw new HttpError(401, 'Unauthorized.');
      this.touchApiKey(row.objectId);
      // FED-005 §3.3 — a bound key resolves as the KEY carrying a user, never
      // as the user. Everything that asks "which credential is this?" — the
      // rate-limit bucket, the audit actor, the readonly tier, revocation —
      // reads `kind` and is unaffected; only the rule and ACL sites consult
      // `actsAs`, and only ever to take access away. See model.ts ActingUser.
      //
      // ⚠️ Roles are resolved HERE, once per request, rather than at each rule
      // site: `rolesForUser` is a join, and the alternative is a query per
      // collection in a `tools/list` that walks every collection on the
      // backend. It is also what a session principal does, so a bound key and
      // the user it acts as carry role lists built by the same call.
      const actsAs = await this.actingUserFor(row.actsAsUserId, row.name);
      return actsAs
        ? { kind: 'apiKey', name: row.name, scopes: row.scopes, actsAs }
        : { kind: 'apiKey', name: row.name, scopes: row.scopes };
    }

    // 3. Session token. The literal strings "undefined"/"null" occur when a
    //    client stringifies an absent token into the header; treat as absent.
    const token = h['x-parse-session-token'];
    if (typeof token === 'string' && token.length > 0 && token !== 'undefined' && token !== 'null') {
      const { results } = await this.deps.facade.rawQuery('_Session', {
        where: { sessionToken: token },
        limit: 1
      });
      const session = results[0];
      if (!session) throw new HttpError(400, 'Invalid session token', 209);
      let user: Record<string, unknown>;
      try {
        user = await this.deps.facade.rawFetch('_User', session.userId as string);
      } catch {
        throw new HttpError(400, 'Invalid session token', 209);
      }
      const userId = user.objectId as string;
      return { kind: 'user', userId, roles: await this.rolesForUser(userId) };
    }

    return { kind: 'anonymous' };
  }

  /**
   * Match a presented secret against the two admin credentials. Both branches
   * are compared unconditionally so the answer's timing does not reveal which
   * tier (if either) was hit.
   */
  private matchAdminCredential(secret: string): Principal | null {
    const full = safeEqual(secret, this.adminToken);
    const readonly = this.adminReadonlyToken ? safeEqual(secret, this.adminReadonlyToken) : false;
    if (full) return { kind: 'admin' };
    if (readonly) return { kind: 'admin', readonly: true };
    return null;
  }

  // ==========================================================================
  // Decisions (evaluation-order steps 2–4 helpers)
  // ==========================================================================

  checkClp(principal: Principal, collection: string, op: ClpOp): AccessDecision {
    return checkClp(this.config, principal, collection, op);
  }

  /**
   * The acl option for an adapter call, or undefined when the caller bypasses
   * row-level checks (dev-open, admin, or an API key whose scope covers the
   * access — scoped keys are data-plane tools, not users; model doc §6).
   */
  aclFor(principal: Principal, access: 'read' | 'write'): AclOption | undefined {
    if (this.devOpenActive) return undefined;
    if (principal.kind === 'admin') return undefined;
    if (principal.kind === 'apiKey') {
      const covered =
        principal.scopes.includes('classes:*') ||
        principal.scopes.includes(access === 'read' ? 'classes:read' : 'classes:write');
      if (!covered) return { access, keys: [] };
      // 🔴 FED-005 §3.3 — a BOUND key stops bypassing. This one line is what
      // makes "whose rows does a key see?" have an answer other than "all of
      // them", and it applies to the whole data plane, not only to /mcp: the
      // same key doing the same `find` over plain HTTP must return the same
      // set, or there are two authorization models and the weaker one is the
      // one an attacker uses. (FED-005 AC2 asserts exactly that pair.)
      if (principal.actsAs) return { access, keys: principalKeys(principal) };
      // An unbound key that got past the CLP check has a covering scope, so
      // this is effectively always a bypass; the branch is defensive.
      return undefined;
    }
    return { access, keys: principalKeys(principal) };
  }

  creatorOwns(collection: string): boolean {
    return effectiveCreatorOwns(this.config, collection);
  }

  // ==========================================================================
  // Roles (flat; membership in the _Join_users__Role junction)
  // ==========================================================================

  // BRG-002 §3.3 — these were six prepared statements on the raw SQLite handle,
  // and they were the LAST thing in the backend reaching past the storage
  // interface. They are now ordinary facade calls, which is what makes
  // "your app moves to Postgres" true for PERMISSIONS rather than true for
  // everything except permissions.
  //
  // The one that could not simply become a facade call was `rolesForUser`: it
  // joined `_Role` to `_Join_users__Role`, and the query layer's `$relatedTo`
  // only filters by `owningId` — the other direction. Richard ruled 2026-09-19
  // that the missing lookup be added to the storage layer beside its mirror
  // image rather than worked around, so `getRelationOwners` exists and this is
  // its only caller.

  /**
   * Which roles this user is in.
   *
   * Two portable calls where there was one hand-written JOIN: the owning role
   * ids from the relation, then the rows themselves for their names. The second
   * is skipped entirely when the user is in no roles, which is the common case
   * on the authorization path.
   */
  async rolesForUser(userId: string): Promise<string[]> {
    try {
      const sm = this.deps.facade.schemaManager;
      const roleIds = sm.getRelationOwners('_Role', 'users', userId);
      if (roleIds.length === 0) return [];
      const { results } = await this.deps.facade.rawQuery('_Role', {
        where: { objectId: { $in: roleIds } },
        select: ['name'],
        limit: roleIds.length
      });
      return results.map((r) => r.name).filter((n): n is string => typeof n === 'string');
    } catch {
      // Tables exist from service start; a failure here means no memberships.
      return [];
    }
  }

  // ==========================================================================
  // API keys (_ApiKey: name, keyHash, scopes JSON, revoked, lastUsedAt)
  // ==========================================================================

  private async lookupApiKey(
    secret: string
  ): Promise<{ objectId: string; name: string; scopes: string[]; actsAsUserId: string | null } | null> {
    try {
      const { results } = await this.deps.facade.rawQuery('_ApiKey', {
        where: { keyHash: sha256(secret) },
        limit: 1
      });
      const row = results[0];
      if (!row || row.revoked) return null;
      return {
        objectId: row.objectId as string,
        name: row.name as string,
        scopes: parseScopes(row.scopes),
        actsAsUserId: typeof row.actsAsUserId === 'string' && row.actsAsUserId.length > 0 ? row.actsAsUserId : null
      };
    } catch {
      return null;
    }
  }

  /**
   * FED-005 — the `ActingUser` for a stored `actsAsUserId`, or null.
   *
   * 🔴 **A binding that names a user this backend does not have is a REFUSAL,
   * not a downgrade.** The tempting shape is "fall back to an ordinary key" —
   * and it is the dangerous one: deleting the user a key is bound to would then
   * silently promote that key from "sees one person's rows" to "sees
   * everybody's". Failing shut costs a bound key its access when its user is
   * removed, which is the direction an operator can recover from.
   */
  private async actingUserFor(userId: string | null, keyName: string): Promise<ActingUser | null> {
    if (!userId) return null;
    try {
      await this.deps.facade.rawFetch('_User', userId);
    } catch {
      throw new HttpError(
        401,
        `API key "${keyName}" acts as a user that no longer exists. Revoke the key, or re-create it bound to a user that does.`
      );
    }
    return { userId, roles: await this.rolesForUser(userId) };
  }

  /**
   * `lastUsedAt` is advisory — nothing authorizes on it; the admin UI shows it
   * in a "last used" column on a later request. So it is NOT awaited.
   *
   * Measured (BRG-002 AC5): through the facade this write is **179 ms of the
   * 273 ms** that 2,000 authorizations cost — two thirds of the whole path, for
   * a column no decision reads. The raw SQL this replaced was one `UPDATE`; the
   * same write through the adapter is a fetch, a serialize and a change event.
   *
   * 🔴 **Not awaiting it saves nothing today, and that is worth knowing rather
   * than assuming.** Measured both ways: throughput 0.137 ms/auth, latency
   * 0.131 ms/auth, unchanged by this. The adapter is synchronous under the hood
   * (`node:sqlite` wrapped in a promise), so the write runs on this call stack
   * before the promise is even returned — there is no "later" to defer it to.
   *
   * It is written this way anyway, because it is the shape that pays off on the
   * adapter this whole phase exists to enable: over a socket the advisory write
   * is a round trip, and a request that waits for it pays for it. Kept as a
   * correctness statement about `lastUsedAt` — nothing authorizes on it — not
   * as an optimization anyone has measured a win from.
   */
  private touchApiKey(objectId: string): void {
    void this.deps.facade.rawSave('_ApiKey', objectId, { lastUsedAt: new Date().toISOString() }).catch(() => {
      // Advisory: a failed timestamp must never fail the request it describes.
    });
  }

  /**
   * Create a key; returns the plaintext secret exactly once.
   *
   * FED-005: `actsAsUserId` binds the key to one `_User` (see model.ts
   * {@link ActingUser}). It is written only when given, so a key created
   * without one is byte-identical on disk to every key created before this
   * task, and the column stays absent on rows nobody bound.
   */
  async createApiKey(
    name: string,
    scopes: string[],
    actsAsUserId?: string | null
  ): Promise<{ objectId: string; secret: string }> {
    const secret = 'ngxk_' + crypto.randomBytes(32).toString('base64url');
    // 🔴 `scopes` is declared `Array` (service.ts:888), so the ADAPTER serializes
    // it. The raw SQL this replaced wrote `JSON.stringify(scopes)` into the
    // column itself; passing that same string through the facade would store a
    // JSON string *inside* a JSON array and every scope check would silently
    // fail open or closed. Pass the array; `parseScopes` still reads the rows
    // the old code wrote.
    const created = await this.deps.facade.rawCreate('_ApiKey', {
      name,
      keyHash: sha256(secret),
      scopes,
      revoked: false,
      ...(actsAsUserId ? { actsAsUserId } : {})
    });
    return { objectId: created.objectId as string, secret };
  }

  async listApiKeys(): Promise<
    {
      objectId: string;
      name: string;
      scopes: string[];
      revoked: boolean;
      createdAt: string;
      lastUsedAt: string | null;
      /** FED-005 — the `_User` this key acts as, or null for an unbound key. */
      actsAsUserId: string | null;
    }[]
  > {
    const { results } = await this.deps.facade.rawQuery('_ApiKey', {});
    return results.map((r) => ({
      objectId: r.objectId as string,
      name: r.name as string,
      scopes: parseScopes(r.scopes),
      revoked: Boolean(r.revoked),
      createdAt: r.createdAt as string,
      lastUsedAt: (r.lastUsedAt as string) || null,
      actsAsUserId: typeof r.actsAsUserId === 'string' && r.actsAsUserId.length > 0 ? r.actsAsUserId : null
    }));
  }

  async revokeApiKey(objectId: string): Promise<boolean> {
    try {
      await this.deps.facade.rawSave('_ApiKey', objectId, { revoked: true });
      return true;
    } catch {
      return false;
    }
  }
}
