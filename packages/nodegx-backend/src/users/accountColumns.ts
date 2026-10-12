/**
 * What an account (`_User` row) carries that belongs to the server, and the one
 * flag that stops an account signing in (BMG-004).
 *
 * ## One list, read by every surface
 *
 * The served backend manager reads {@link ACCOUNT_COLUMNS} from
 * `GET /_admin/whoami` (it is not copied into the page), the admin user routes
 * refuse a generic write to any of them, and the Schema page refuses to rename
 * or retype them. Before BMG-004 there were two copies — the editor's
 * `serverOwnedColumns.ts` and the page's `ACCOUNT_OWNED` — and they already
 * disagreed about `emailVerified`. The editor's copy leaves with its panels
 * (BMG-012).
 *
 * Names beginning with `_` are the backend's own storage (`_hashed_password`,
 * the single-use email tokens) and are never shown at all, so they are not
 * listed here: they are hidden by pattern, everywhere.
 *
 * ## Disabled (R3)
 *
 * Richard's ruling, 2026-09-24: *"should the Users page get a Disable button?"*
 * → yes. A disabled account keeps its row, its records and its roles; it cannot
 * obtain a session by any door, and a session or bound API key it already had
 * stops working. Every door checks {@link isAccountDisabled} — the check lives
 * in one function so that a door added later has one thing to call.
 *
 * @module nodegx-backend/users/accountColumns
 */

/**
 * `_User` columns whose VALUES a generic editor must not write, with the reason
 * a person is shown on hover. Some of them have a dedicated control of their
 * own on the Users page (a username field that refuses a clash, the verified
 * switch, the disable switch, *Set a new password*) — which is the point: they
 * are written through the path that knows their rule, never as a cell.
 */
export const ACCOUNT_COLUMNS: Readonly<Record<string, string>> = Object.freeze({
  username: 'The sign-in name. Change it in the person’s Details, where a name somebody else has is refused.',
  email: 'The address mail goes to. Change it in the person’s Details.',
  emailVerified: 'Set by the verification link, or by the Verified switch in the person’s Details.',
  password: 'Never stored as text. Set a new one from the person’s Sign-in section.',
  authData: 'Written by sign-in providers.',
  disabled: 'Set by the Disable sign-in switch, which also signs the person out everywhere.',
  adminAccess: 'Whether this person can open the backend manager. Set in the person’s Backend access section, by a full admin.'
});

/**
 * P116 R-h (Richard, 2026-10-11): *"someone reads a message that links to its author — what do
 * they get?"* → **the name, not the account.** Every account column except the username is
 * hidden from every reader the row ACL binds (`SecurityState.aclFor` puts it in the `hidden`
 * mask), so an `include` of an author carries the username and the fields the app added, and a
 * filter on these is refused by name. The person's own details reach them through `/users/me`
 * and sign-in, which read the account without a reader's ACL.
 */
export const ACCOUNT_DETAILS: readonly string[] = Object.freeze(Object.keys(ACCOUNT_COLUMNS).filter((c) => c !== 'username'));

/**
 * BMG-014 — what a person may do in the backend manager, stored on their
 * `_User` row as `adminAccess`. Absent (or anything else) is "no access".
 *
 *   - `full`: a session of theirs is the admin principal — every `/admin`
 *     route, the manager, and (in their own app) every collection rule and row
 *     ACL bypassed, exactly as the admin credential is.
 *   - `readonly`: the same, carrying `readonly: true` — BAK-005's look-don't-
 *     touch tier, refused every state-changing request by the dispatcher.
 *
 * A person's ROLES are a separate thing: the setup route puts the first admin
 * in an `admin` role so the app's rules can name it, but the rule engine gives
 * that role no special meaning. Access to the manager is this column alone.
 */
export type AdminAccess = 'full' | 'readonly';

export const ADMIN_ACCESS_LEVELS: readonly AdminAccess[] = ['full', 'readonly'];

/** The stored value, or null for no access. Only the two spellings count. */
export function adminAccessOf(user: Record<string, unknown> | null | undefined): AdminAccess | null {
  if (!user) return null;
  const v = user.adminAccess;
  return v === 'full' || v === 'readonly' ? v : null;
}

/** The name the setup route gives the first admin's role. Ordinary in every other way. */
export const ADMIN_ROLE_NAME = 'admin';

/** The sentence every refusing door answers with. */
export const ACCOUNT_DISABLED_MESSAGE = 'This account is disabled.';

/**
 * Fields a signed-in user may not write on their OWN row through
 * `PUT /users/:id`. `disabled` for the obvious reason; `emailVerified` because a
 * person who could set it on themselves would pass a `requireForLogin` policy
 * with an address they never proved (measured on the route before BMG-004: it
 * was written as sent). `adminAccess` (BMG-014) for the loudest reason of all:
 * a signup that could write it would be a signup that makes itself the admin.
 * BMG-014 also made `signup` strip this list — it used to spread every field
 * it was sent into the row.
 */
export const ADMIN_ONLY_USER_FIELDS: readonly string[] = ['disabled', 'emailVerified', 'adminAccess'];

/** True only for an explicit `true`. Absent, null and false are all "enabled". */
export function isAccountDisabled(user: Record<string, unknown> | null | undefined): boolean {
  if (!user) return false;
  // The same four spellings as `auth/identities.ts` `isFlagSet` — SQLite hands
  // a Boolean column back as 1/0 on some read paths. Not imported from there:
  // identities.ts calls THIS module, and a cycle between the two is a load
  // order away from an undefined.
  const v = user.disabled;
  return v === true || v === 1 || v === '1' || v === 'true';
}

/** A `_User` column a person may see: not the backend's own `_`-prefixed storage, not a password. */
export function isVisibleAccountColumn(name: string): boolean {
  return name.charAt(0) !== '_' && name !== 'password';
}

/**
 * P109 ISL-040 (P78-DBT-USERCOLS) — why a GENERIC data door (`/classes/_User`, BYOB `/api/_User`, their
 * batches) refuses to write `key` on an account, or null when it may. For every principal: the
 * master key a cloud function holds is the admin principal, and before this a function could write
 * `adminAccess: "full"` on anybody's row, its caller's included. The doors that own these columns
 * (the Users page's routes, `/users` for a person's own row, the Create/Update User nodes) never
 * pass through here. `username` and `email` stay writable: changing them grants nothing.
 */
export function accountWriteRefusal(key: string, door: string): string | null {
  if (ADMIN_ONLY_USER_FIELDS.includes(key)) {
    return `"${key}" is not written through ${door}: ${ACCOUNT_COLUMNS[key]} Nothing was saved.`;
  }
  if (key === 'password') {
    return `A password is not written through ${door} — it would be stored as text. Use the Users page (PUT /admin/users/:id { password }), or the Update User node, which hash it. Nothing was saved.`;
  }
  if (!isVisibleAccountColumn(key)) return `"${key}" is the backend's own column and cannot be written. Nothing was saved.`;
  return null;
}
