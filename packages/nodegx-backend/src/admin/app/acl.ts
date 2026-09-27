/**
 * "Who can see this record" (BMG-002 §3.4) — the record ACL as rows a person
 * ticks, and back. Pure; the card is `composers/AclCard.tsx`.
 *
 * The rules are the editor's `databrowser/acl.ts` (SPR-001 / F84), ported:
 *  - **no ACL and an empty ACL are opposites.** `null` is *public* — whoever
 *    the collection's permissions let in; `{}` grants no one, so only the
 *    admin credential reaches the record. The card shows both as a STATE
 *    (*Everyone* / *No one*), never as `null` or `{}`;
 *  - a key is `*` (everyone), `role:<name>`, or a user's objectId;
 *  - only `true` flags are written (the server's `validateAclShape` accepts
 *    `read`/`write` booleans and nothing else), and a row granting nothing is
 *    dropped rather than stored as `{}` for that key.
 *
 * There is no "signed-in users" row because the model has no key for it: a
 * record ACL names everyone, a role, or a person.
 */

export interface AclRow {
  /** `*`, `role:<name>`, or a user objectId. */
  key: string;
  read: boolean;
  write: boolean;
}

/** `public` = no ACL of its own (`null`); `rows` = exactly these grants (none = no one). */
export type AclState = { mode: 'public' } | { mode: 'rows'; rows: AclRow[] };

export const EVERYONE = '*';

export function isRole(key: string): boolean {
  return key.indexOf('role:') === 0;
}

export function roleName(key: string): string {
  return isRole(key) ? key.slice(5) : key;
}

/** The stored value as the card's state. Everyone's row comes first, always present in `rows` mode. */
export function aclFromValue(value: unknown): AclState {
  if (value === null || value === undefined || value === '') return { mode: 'public' };
  const obj = (typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, { read?: unknown; write?: unknown }>;
  const rows: AclRow[] = [];
  const everyone = obj[EVERYONE] || {};
  rows.push({ key: EVERYONE, read: everyone.read === true, write: everyone.write === true });
  const keys = Object.keys(obj).filter((k) => k !== EVERYONE);
  // Roles before people, each in the order stored.
  keys.filter(isRole).concat(keys.filter((k) => !isRole(k))).forEach((key) => {
    const e = obj[key] || {};
    rows.push({ key, read: e.read === true, write: e.write === true });
  });
  return { mode: 'rows', rows };
}

/** The card's state as the value to store: `null` for public, otherwise only what is granted. */
export function aclToValue(state: AclState): Record<string, { read?: true; write?: true }> | null {
  if (state.mode === 'public') return null;
  const out: Record<string, { read?: true; write?: true }> = {};
  state.rows.forEach((row) => {
    if (!row.key || (!row.read && !row.write)) return;
    const entry: { read?: true; write?: true } = {};
    if (row.read) entry.read = true;
    if (row.write) entry.write = true;
    out[row.key] = entry;
  });
  return out;
}

/** True when the rows grant nothing to anyone — the *No one* state. */
export function grantsNobody(state: AclState): boolean {
  return state.mode === 'rows' && !state.rows.some((r) => r.read || r.write);
}

/** Restricting a public record starts from what public means: everyone may read and write. */
export function restrict(): AclState {
  return { mode: 'rows', rows: [{ key: EVERYONE, read: true, write: true }] };
}

export function addRow(state: AclState, key: string): AclState {
  if (state.mode !== 'rows' || !key || state.rows.some((r) => r.key === key)) return state;
  return { mode: 'rows', rows: state.rows.concat([{ key, read: true, write: false }]) };
}

export function setRow(state: AclState, key: string, patch: Partial<AclRow>): AclState {
  if (state.mode !== 'rows') return state;
  return { mode: 'rows', rows: state.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) };
}

export function removeRow(state: AclState, key: string): AclState {
  if (state.mode !== 'rows' || key === EVERYONE) return state;
  return { mode: 'rows', rows: state.rows.filter((r) => r.key !== key) };
}

/** A one-line reading for the grid cell: *Everyone*, *No one*, or who. */
export function aclSummary(value: unknown, userLabel?: (id: string) => string): string {
  const state = aclFromValue(value);
  if (state.mode === 'public') return 'Everyone';
  if (grantsNobody(state)) return 'No one';
  return state.rows
    .filter((r) => r.read || r.write)
    .map((r) => {
      const who = r.key === EVERYONE ? 'everyone' : isRole(r.key) ? roleName(r.key) : userLabel ? userLabel(r.key) : 'a person';
      return who + ' (' + (r.read && r.write ? 'read, write' : r.read ? 'read' : 'write') + ')';
    })
    .join(', ');
}
