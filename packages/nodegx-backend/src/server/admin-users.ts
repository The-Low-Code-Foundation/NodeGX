/**
 * The accounts, administered (BMG-004): what the Users page of the served
 * backend manager stands on.
 *
 *   GET    /admin/users?q=&status=&role=&limit=&skip=   people, with roles, sessions and custom fields
 *   GET    /admin/users/:id                        one person
 *   GET    /admin/users/:id/identities             how they sign in (the same answer as /users/me/identities)
 *   POST   /admin/users                            create (or invite), with roles and fields
 *   PUT    /admin/users/:id                        details, verified, disabled, a new password
 *   DELETE /admin/users/:id                        delete, with their sessions, memberships and identities
 *   DELETE /admin/users/:id/sessions               sign out everywhere
 *
 * ## Why not the routes that were already there
 *
 * Measured before this file (BMG-004 §6): the page created people through the
 * public `POST /users`, which runs the signup rule — a locked backend refused
 * the administrator (403, "signups are disabled"). The BYOB `POST`/`PUT
 * /api/_User` stored `password` as TEXT in a column of its own and the person
 * could not sign in with it; `GET /api/_User` sent the scrypt hash to the
 * browser. So every write here goes through `SystemUsers` — the same door a
 * cloud function uses, which hashes, refuses the backend's own columns and
 * revokes sessions on a password change — and the BYOB door now refuses a
 * password outright (`byob-admin.ts` `assertAccountWrite`).
 *
 * Admin-gated by the dispatcher; audited per `ops/audit-actions.ts`, with the
 * KEYS a request changed and never their values.
 *
 * @module nodegx-backend/server/admin-users
 */

import type { IStorageFacade } from '@noodl/backend-contract';

import { RoleStore } from '../roles/RoleStore';
import { SystemUsers } from '../users/SystemUsers';
import { ACCOUNT_COLUMNS, ADMIN_ACCESS_LEVELS, adminAccessOf, isAccountDisabled, isVisibleAccountColumn } from '../users/accountColumns';
import type { AdminAccess } from '../users/accountColumns';
import { isSessionExpired } from './users';
import { HttpError, readJSONBody, sendJSON } from './http-util';
import type { RequestContext } from './HttpServer';

/** What the admin routes need from the sign-in surface. */
export interface AdminUsersDeps {
  facade: IStorageFacade;
  /** `OAuthRoutes.sendInvite` — the magic-link send, answered honestly. */
  sendInvite(userId: string, email: string): Promise<{ success: boolean; error?: string }>;
  /** `OAuthRoutes.magicLinkUnavailable` — asked BEFORE an invited account is created. */
  inviteUnavailable(): string | null;
  /** `EmailRoutes.sendVerificationEmail`. */
  sendVerification(user: Record<string, unknown>): Promise<{ success: boolean; error?: string }>;
  /** `OAuthRoutes.listIdentities` — one reader of `_UserIdentity`, not two. */
  listIdentities(ctx: RequestContext, userId: string): Promise<void>;
}

/** One person as the Users page draws them. */
export interface AdminUserRow extends Record<string, unknown> {
  objectId: string;
  username: string | null;
  email: string | null;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: unknown;
  /** Role NAMES, resolved from the junction. */
  roles: string[];
  /** Live (unexpired) sessions. */
  sessions: number;
  /** When the newest live session began — a sign-in that has not been signed out of. */
  lastSessionAt: string | null;
  hasPassword: boolean;
  /** BMG-014: whether this person can open the backend manager, and how. */
  adminAccess: AdminAccess | null;
}

/** BMG-014: the sentences the access guards answer with. */
export const OWN_ACCESS_MESSAGE = 'You cannot change your own backend access. Ask another full admin.';
export function lastAdminMessage(name: string, what: string): string {
  return `${name} is the only full admin of this backend, so they cannot be ${what}. Give someone else full access first.`;
}

const MAX_PAGE = 200;
const SYSTEM_FIELDS = ['objectId', 'createdAt', 'updatedAt', 'ACL'];

/** The name a guard's sentence uses: username, then email, then the id. */
function personName(user: Record<string, unknown>): string {
  if (typeof user.username === 'string' && user.username) return user.username;
  if (typeof user.email === 'string' && user.email) return user.email;
  return String(user.objectId);
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export class AdminUserRoutes {
  private readonly facade: IStorageFacade;
  private readonly roles: RoleStore;
  private readonly system: SystemUsers;

  constructor(private readonly deps: AdminUsersDeps) {
    this.facade = deps.facade;
    this.roles = new RoleStore(deps.facade);
    // No `onAudit`: the dispatcher writes this request's entry (`user.*`), and a
    // second `user.system.*` entry for the same write would count it twice.
    this.system = new SystemUsers({ facade: deps.facade });
  }

  /** The `_User` fields a person added — every visible column that is not the server's. */
  customColumns(): Array<{ name: string; type: string; targetClass?: string }> {
    const sm = this.facade.schemaManager;
    const schema = sm ? sm.getTableSchema('_User') : null;
    const columns = ((schema && schema.columns) || []) as Array<{ name: string; type: string; targetClass?: string }>;
    return columns.filter((c) => isVisibleAccountColumn(c.name) && !ACCOUNT_COLUMNS[c.name] && SYSTEM_FIELDS.indexOf(c.name) === -1);
  }

  // ==========================================================================
  // Reads
  // ==========================================================================

  async list(ctx: RequestContext): Promise<void> {
    const q = str(ctx.query.q);
    const clauses: Record<string, unknown>[] = [];
    if (q) clauses.push({ $or: [{ username: { contains: q } }, { email: { contains: q } }] });
    // BMG-005: the members of one role — the Roles page's table of people.
    const roleName = str(ctx.query.role);
    if (roleName) {
      const role = await this.roles.find(roleName);
      if (!role) throw new HttpError(404, `There is no role called "${roleName}".`);
      const members = this.roles.members(role);
      if (!members.length) {
        sendJSON(ctx.res, 200, { users: [], total: 0, columns: this.customColumns() });
        return;
      }
      clauses.push({ objectId: { $in: members } });
    }
    if (ctx.query.status === 'disabled') clauses.push({ disabled: true });
    else if (ctx.query.status === 'unverified') clauses.push({ emailVerified: { $ne: true } });
    // BMG-014: the people who can open the manager.
    else if (ctx.query.status === 'admins') clauses.push({ adminAccess: { $in: ADMIN_ACCESS_LEVELS.slice() } });
    const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { $and: clauses };

    const limit = Math.min(Math.max(parseInt(ctx.query.limit || '50', 10) || 50, 1), MAX_PAGE);
    const skip = Math.max(parseInt(ctx.query.skip || '0', 10) || 0, 0);
    const { results, count } = await this.facade.rawQuery('_User', { where, limit, skip, count: true, sort: ['-createdAt'] });

    sendJSON(ctx.res, 200, {
      users: await this.rows(results),
      total: count !== undefined ? count : results.length,
      columns: this.customColumns()
    });
  }

  async get(ctx: RequestContext): Promise<void> {
    const user = await this.fetch(ctx.params.id);
    sendJSON(ctx.res, 200, { user: (await this.rows([user]))[0], columns: this.customColumns() });
  }

  async identities(ctx: RequestContext): Promise<void> {
    await this.fetch(ctx.params.id);
    await this.deps.listIdentities(ctx, ctx.params.id);
  }

  // ==========================================================================
  // Writes
  // ==========================================================================

  async create(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const username = str(body.username);
    const email = str(body.email);
    const invite = body.invite === true;
    if (!username) throw new HttpError(400, 'A username is required.');
    if (invite && !email) throw new HttpError(400, 'An invitation is sent by email, so it needs an address.');
    if (invite && body.password) throw new HttpError(400, 'An invited person chooses how they sign in; leave the password empty.');
    if (invite) {
      // Before the account exists: an invite that cannot be sent should not
      // leave a password-less account behind that nobody can get into.
      const off = this.deps.inviteUnavailable();
      if (off) throw new HttpError(409, off);
    }
    const properties = this.checkProperties(body.properties);
    const roles = await this.checkRoles(body.roles);

    const made = await this.system.handle({
      op: 'create',
      username,
      email,
      password: invite ? undefined : body.password,
      emailVerified: body.emailVerified === true,
      properties
    });
    if (made.outcome !== 'done' || !made.userId) {
      throw new HttpError(made.code === 'user/already-exists' ? 409 : 400, made.error || 'The account was not created.');
    }
    const userId = made.userId;
    for (const role of roles) await this.roles.addMember(role, userId);

    const out: Record<string, unknown> = { objectId: userId, username, roles: roles.map((r) => r.name) };
    const user = await this.facade.rawFetch('_User', userId);
    if (invite && email) {
      const sent = await this.deps.sendInvite(userId, email);
      out.invited = sent.success;
      if (!sent.success) out.inviteError = sent.error;
    } else if (body.sendVerification === true && email) {
      const sent = await this.deps.sendVerification(user);
      out.verificationSent = sent.success;
      if (!sent.success) out.verificationError = sent.error;
    }
    ctx.audit({ userId, roles: out.roles, properties: Object.keys(properties), invite, hasPassword: !invite && !!body.password });
    sendJSON(ctx.res, 201, out);
  }

  async update(ctx: RequestContext): Promise<void> {
    const userId = ctx.params.id;
    const before = await this.fetch(userId);
    const body = await readJSONBody(ctx.req);

    const properties: Record<string, unknown> = { ...this.checkProperties(body.properties) };
    if (body.username !== undefined) {
      const username = str(body.username);
      if (!username) throw new HttpError(400, 'A username cannot be blank.');
      properties.username = username;
    }
    if (body.email !== undefined) properties.email = str(body.email) || null;
    for (const flag of ['emailVerified', 'disabled'] as const) {
      if (body[flag] === undefined) continue;
      if (typeof body[flag] !== 'boolean') throw new HttpError(400, `${flag} is a yes/no switch: true or false.`);
      properties[flag] = body[flag];
    }
    const password = body.password === undefined ? undefined : str(body.password);
    if (body.password !== undefined && !password) throw new HttpError(400, 'A new password cannot be blank.');

    // BMG-014: backend access. Written here, directly — `SystemUsers` refuses
    // the key by name so a graph can never write it — and guarded three ways:
    // not your own, not the last full admin's, and only the two spellings.
    let adminAccess: AdminAccess | null | undefined;
    if (body.adminAccess !== undefined) {
      const v = body.adminAccess;
      if (v !== null && v !== 'full' && v !== 'readonly') {
        throw new HttpError(400, 'adminAccess is "full", "readonly" or null (no access).');
      }
      adminAccess = v as AdminAccess | null;
      if (ctx.principal.kind === 'admin' && ctx.principal.userId === userId) throw new HttpError(409, OWN_ACCESS_MESSAGE);
      if (adminAccess !== 'full' && adminAccessOf(before) === 'full' && (await this.isLastFullAdmin(userId))) {
        throw new HttpError(409, lastAdminMessage(personName(before), 'changed to less than full access'));
      }
    }
    // The last full admin cannot be switched off either — a backend nobody can
    // administer is the failure the guard exists for.
    if (properties.disabled === true && adminAccessOf(before) === 'full' && (await this.isLastFullAdmin(userId))) {
      throw new HttpError(409, lastAdminMessage(personName(before), 'disabled'));
    }

    let sessionsRevokedByUpdate = 0;
    if (Object.keys(properties).length || password !== undefined) {
      const result = await this.system.handle({ op: 'update', userId, password, properties });
      if (result.outcome !== 'done') {
        throw new HttpError(result.code === 'user/already-exists' ? 409 : 400, result.error || 'The account was not changed.');
      }
      sessionsRevokedByUpdate = result.sessionsRevoked || 0;
    }
    if (adminAccess !== undefined) {
      await this.facade.rawSave('_User', userId, { adminAccess });
      properties.adminAccess = adminAccess;
    }

    // R3 — switching sign-in off signs the person out everywhere, on the press.
    // (A password change already revoked them inside `SystemUsers.update`.)
    let sessionsRevoked = sessionsRevokedByUpdate;
    if (properties.disabled === true) sessionsRevoked += await this.revokeSessions(userId);

    ctx.audit({
      userId,
      changed: Object.keys(properties),
      passwordChanged: password !== undefined,
      ...(properties.disabled !== undefined && properties.disabled !== isAccountDisabled(before) ? { disabled: properties.disabled } : {}),
      sessionsRevoked
    });
    const after = await this.facade.rawFetch('_User', userId);
    sendJSON(ctx.res, 200, { user: (await this.rows([after]))[0], sessionsRevoked });
  }

  async remove(ctx: RequestContext): Promise<void> {
    const userId = ctx.params.id;
    const before = await this.fetch(userId);
    // BMG-014: see `update` — the last full admin stays.
    if (adminAccessOf(before) === 'full' && (await this.isLastFullAdmin(userId))) {
      throw new HttpError(409, lastAdminMessage(personName(before), 'deleted'));
    }
    // Memberships and identities first: a junction row or an identity naming a
    // user who is gone is a role list with a ghost in it, and a provider sign-in
    // that resolves to an account it cannot fetch.
    let memberships = 0;
    for (const role of await this.roles.list()) {
      if (await this.roles.removeMember(role, userId)) memberships++;
    }
    const { results: identities } = await this.facade.rawQueryAll('_UserIdentity', { where: { userId } });
    for (const row of identities) await this.facade.rawDelete('_UserIdentity', row.objectId as string);

    const result = await this.system.handle({ op: 'delete', userId });
    if (result.outcome === 'failure') throw new HttpError(500, result.error || 'The account was not deleted.');
    ctx.audit({ userId, sessionsRevoked: result.sessionsRevoked || 0, memberships, identities: identities.length });
    sendJSON(ctx.res, 200, { deleted: true, sessionsRevoked: result.sessionsRevoked || 0 });
  }

  async signOutEverywhere(ctx: RequestContext): Promise<void> {
    const userId = ctx.params.id;
    await this.fetch(userId);
    const sessionsRevoked = await this.revokeSessions(userId);
    ctx.audit({ userId, sessionsRevoked });
    sendJSON(ctx.res, 200, { sessionsRevoked });
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private async fetch(userId: string): Promise<Record<string, unknown>> {
    try {
      return await this.facade.rawFetch('_User', userId);
    } catch {
      throw new HttpError(404, 'There is no such person on this backend.');
    }
  }

  /** BMG-014: is `userId` the only account with full backend access? */
  private async isLastFullAdmin(userId: string): Promise<boolean> {
    const { results } = await this.facade.rawQuery('_User', { where: { adminAccess: 'full' }, limit: 2 });
    return results.length === 1 && results[0].objectId === userId;
  }

  private async revokeSessions(userId: string): Promise<number> {
    const { results } = await this.facade.rawQueryAll('_Session', { where: { userId } });
    for (const session of results) await this.facade.rawDelete('_Session', session.objectId as string);
    return results.length;
  }

  /**
   * A person's own fields, from the page's typed editors. The server's columns
   * each have a control of their own and are refused here by name, so there is
   * exactly one path a username or a verified flag is written by (AC7).
   * `SystemUsers` then refuses `_`-prefixed names and the protected keys.
   */
  private checkProperties(raw: unknown): Record<string, unknown> {
    if (raw === undefined || raw === null) return {};
    if (typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, 'properties must be an object of field → value.');
    for (const key of Object.keys(raw as Record<string, unknown>)) {
      if (ACCOUNT_COLUMNS[key]) throw new HttpError(400, `"${key}" belongs to the account: ${ACCOUNT_COLUMNS[key]}`);
      if (SYSTEM_FIELDS.indexOf(key) !== -1) throw new HttpError(400, `"${key}" is set by the backend.`);
    }
    return raw as Record<string, unknown>;
  }

  /** Role names → role rows, every one of which must exist. Nothing is written if one does not. */
  private async checkRoles(raw: unknown): Promise<Array<{ objectId: string; name: string }>> {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw) || raw.some((r) => typeof r !== 'string')) throw new HttpError(400, 'roles must be a list of role names.');
    const out: Array<{ objectId: string; name: string }> = [];
    for (const name of raw as string[]) {
      const role = await this.roles.find(name);
      if (!role) throw new HttpError(400, `There is no role called "${name}". Create it on the Roles page first.`);
      if (!out.some((r) => r.objectId === role.objectId)) out.push(role);
    }
    return out;
  }

  /** Stored rows → what the page draws: roles by name, live sessions, no secrets. */
  private async rows(users: Record<string, unknown>[]): Promise<AdminUserRow[]> {
    if (!users.length) return [];
    const ids = users.map((u) => u.objectId as string);

    const rolesOf: Record<string, string[]> = {};
    for (const role of await this.roles.list()) {
      for (const member of this.roles.members(role)) {
        if (ids.indexOf(member) === -1) continue;
        (rolesOf[member] = rolesOf[member] || []).push(role.name);
      }
    }

    const sessionsOf: Record<string, { n: number; newest: string | null }> = {};
    const { results: sessions } = await this.facade.rawQueryAll('_Session', { where: { userId: { $in: ids } } });
    for (const s of sessions) {
      if (isSessionExpired(s)) continue;
      const id = s.userId as string;
      const entry = (sessionsOf[id] = sessionsOf[id] || { n: 0, newest: null });
      entry.n++;
      const at = typeof s.createdAt === 'string' ? s.createdAt : s.createdAt instanceof Date ? s.createdAt.toISOString() : null;
      if (at && (!entry.newest || at > entry.newest)) entry.newest = at;
    }

    return users.map((u) => {
      const row: AdminUserRow = {
        objectId: u.objectId as string,
        username: typeof u.username === 'string' ? u.username : null,
        email: typeof u.email === 'string' ? u.email : null,
        emailVerified: u.emailVerified === true || u.emailVerified === 1,
        disabled: isAccountDisabled(u),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        roles: rolesOf[u.objectId as string] || [],
        sessions: (sessionsOf[u.objectId as string] || { n: 0 }).n,
        lastSessionAt: (sessionsOf[u.objectId as string] || { newest: null }).newest,
        hasPassword: typeof u._hashed_password === 'string' && u._hashed_password.length > 0,
        adminAccess: adminAccessOf(u)
      };
      for (const [key, value] of Object.entries(u)) {
        if (key in row || !isVisibleAccountColumn(key) || key === 'ACL') continue;
        row[key] = value;
      }
      return row;
    });
  }
}
