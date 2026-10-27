/**
 * The `_Role` table and its membership junction, with no transport attached.
 *
 * Extracted from `server/admin-security.ts` for F86, which needed the same six
 * operations from a place that has no `RequestContext` to answer into. The
 * alternative was a second implementation of "what a role name may contain" and
 * "which junction membership lives in", and two implementations of a security
 * primitive are two policies the first divergence makes silently different —
 * so the routes now delegate here and this file is the only one that knows.
 *
 * ## What is NOT here
 *
 * Nothing decides *whether the caller may do this*. The admin routes are
 * admin-gated by the dispatcher; `roles/SystemRoles.ts` is reachable only from a
 * graph inside this process and gated by that function's own `call` rule. A
 * store that also carried an opinion about authorisation would give both of them
 * a third gate to keep in step.
 *
 * ## Flat, deliberately (F86 design question 2)
 *
 * A role holds users. It does not hold roles. `SecurityState.rolesForUser` is a
 * single non-recursive JOIN over `_Join_users__Role`, so a role-in-role edge
 * would be written and then never resolved — a membership that reads back as
 * stored and grants nothing. Parse allowed it; this backend does not, and the
 * place that would have to change first is that JOIN, not this file.
 *
 * @module nodegx-backend/roles/RoleStore
 */

import type { IStorageFacade } from '@noodl/backend-contract';

/** A `_Role` row. Stored fields stay open; the two anything reads do not. */
export interface RoleRecord {
  objectId: string;
  name: string;
  /** BMG-005: what the role is for, in the operator's words. Absent when never written. */
  description?: string;
  /** When the role was made, as the store answered it. */
  createdAt?: string;
}

/** The longest description the Roles page may store — a sentence, not a document. */
export const ROLE_DESCRIPTION_MAX = 280;

/**
 * What a role name may contain.
 *
 * ⚠️ Load-bearing beyond tidiness: a name goes into an ACL key as
 * `role:<name>` and into a permission rule as the same string, and both are
 * parsed by splitting on `:` and `,` (`security/model.ts`). A name carrying
 * either character would be a rule that means something other than it reads.
 */
export const ROLE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** The one sentence every surface uses when a name is refused. */
export const ROLE_NAME_RULE = 'Role name must be non-empty and use only letters, digits, _ and -';

/** Is this usable as a role name? */
export function isValidRoleName(name: unknown): name is string {
  return typeof name === 'string' && ROLE_NAME_PATTERN.test(name);
}

/**
 * Narrow one raw `_Role` row. Throws naming the row rather than passing an
 * `undefined` objectId into a relation call, where it would silently address
 * nothing.
 */
export function asRole(row: Record<string, unknown>): RoleRecord {
  if (typeof row.objectId !== 'string' || typeof row.name !== 'string') {
    throw new Error(`Malformed _Role row: ${JSON.stringify(row)}`);
  }
  const role: RoleRecord = { objectId: row.objectId, name: row.name };
  if (typeof row.description === 'string' && row.description) role.description = row.description;
  const at = row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt;
  if (typeof at === 'string') role.createdAt = at;
  return role;
}

/**
 * P127-S8-DUPEROLE — one queue per role name, per storage. Four `RoleStore`s wrap one facade (the cloud nodes, the two
 * admin doors, the dashboard), so the queue belongs to the facade, not to an instance.
 */
const nameQueues = new WeakMap<IStorageFacade, Map<string, Promise<unknown>>>();

/** The role table and its membership junction. One reader, two callers. */
export class RoleStore {
  constructor(private readonly facade: IStorageFacade) {}

  /**
   * Run `work` after every earlier call queued on this role name has finished. `ensure` looks for a role and then
   * makes it; two of those for one name in the same moment (one function run firing Add User To Role twice) both
   * found nothing and both made one, so the backend held two rows of one name.
   */
  private serial<T>(name: string, work: () => Promise<T>): Promise<T> {
    let queues = nameQueues.get(this.facade);
    if (!queues) nameQueues.set(this.facade, (queues = new Map()));
    const before = queues.get(name) ?? Promise.resolve();
    const run = before.then(work, work);
    const settled = run.catch(() => undefined);
    queues.set(name, settled);
    void settled.then(() => {
      if (queues!.get(name) === settled) queues!.delete(name);
    });
    return run;
  }

  /**
   * The role with this name, or null. Never throws for "no such role".
   *
   * 🔴 P127-S8-DUPEROLE: a name held by more than one row (made before `ensure` was queued) is put back to one here:
   * every member moves into the oldest row and the others go. Every add, remove and list by name comes through this
   * read, and with `limit: 1` it reached one row of several, so a person in another row could never be removed by name
   * and kept every read the role grants.
   */
  find(name: string): Promise<RoleRecord | null> {
    return this.serial(name, () => this.findOne(name));
  }

  private async findOne(name: string): Promise<RoleRecord | null> {
    const { results } = await this.facade.rawQuery('_Role', { where: { name }, limit: 100 });
    if (results.length <= 1) return results.length === 0 ? null : asRole(results[0]);
    const rows = results.map(asRole).sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? '') || x.objectId.localeCompare(y.objectId));
    const [keep, ...extra] = rows;
    for (const other of extra) {
      for (const userId of this.members(other)) {
        await this.facade.addRelation('_Role', keep.objectId, 'users', userId);
      }
      if (!keep.description && other.description) {
        keep.description = other.description;
        await this.describe(keep, keep.description);
      }
      await this.remove(other);
    }
    return keep;
  }

  /** Every role, in storage order. PRD-001 §3.3: a registry authorization is computed from. */
  async list(): Promise<RoleRecord[]> {
    const { results } = await this.facade.rawQueryAll('_Role', {});
    return results.map(asRole);
  }

  /**
   * Create a role. The caller checks for an existing one first when a duplicate
   * is an error for it — this does not, because `ensure` needs the same write.
   */
  async create(name: string, description?: string): Promise<RoleRecord> {
    const row = await this.facade.rawCreate('_Role', description ? { name, description } : { name });
    return asRole(row);
  }

  /** Say what a role is for. An empty string clears it (stored as null, read back absent). */
  async describe(role: RoleRecord, description: string): Promise<void> {
    await this.facade.rawSave('_Role', role.objectId, { description: description || null });
  }

  /** The role, creating it if it is not there. `created` says which happened. One at a time per name. */
  ensure(name: string): Promise<{ role: RoleRecord; created: boolean }> {
    return this.serial(name, async () => {
      const existing = await this.findOne(name);
      if (existing) return { role: existing, created: false };
      return { role: await this.create(name), created: true };
    });
  }

  /** A new role, or null when one of that name is already there. The admin door's create, one at a time per name. */
  createIfAbsent(name: string, description?: string): Promise<RoleRecord | null> {
    return this.serial(name, async () => ((await this.findOne(name)) ? null : this.create(name, description)));
  }

  /**
   * Delete a role and every membership in it.
   *
   * The memberships go first so a later role reusing this objectId (impossible
   * with UUIDs, but hygiene) cannot inherit them.
   */
  async remove(role: RoleRecord): Promise<void> {
    for (const userId of this.members(role)) {
      await this.facade.removeRelation('_Role', role.objectId, 'users', userId);
    }
    await this.facade.rawDelete('_Role', role.objectId);
  }

  /** The user ids in this role. Synchronous: it is one indexed junction read. */
  members(role: RoleRecord): string[] {
    if (!this.facade.schemaManager) return [];
    return (this.facade.schemaManager.getRelatedIds('_Role', role.objectId, 'users') as string[]) || [];
  }

  isMember(role: RoleRecord, userId: string): boolean {
    return this.members(role).includes(userId);
  }

  /**
   * Put a user in a role. Answers whether this call was the one that changed
   * anything — the junction's own `INSERT OR IGNORE` makes the write idempotent,
   * so the membership is read first to tell "added" from "was already there".
   */
  async addMember(role: RoleRecord, userId: string): Promise<boolean> {
    const already = this.isMember(role, userId);
    await this.facade.addRelation('_Role', role.objectId, 'users', userId);
    return !already;
  }

  /** Take a user out of a role. Answers whether they were in it. */
  async removeMember(role: RoleRecord, userId: string): Promise<boolean> {
    const was = this.isMember(role, userId);
    await this.facade.removeRelation('_Role', role.objectId, 'users', userId);
    return was;
  }
}
