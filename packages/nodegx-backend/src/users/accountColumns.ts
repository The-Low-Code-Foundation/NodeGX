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
  disabled: 'Set by the Disable sign-in switch, which also signs the person out everywhere.'
});

/** The sentence every refusing door answers with. */
export const ACCOUNT_DISABLED_MESSAGE = 'This account is disabled.';

/**
 * Fields a signed-in user may not write on their OWN row through
 * `PUT /users/:id`. `disabled` for the obvious reason; `emailVerified` because a
 * person who could set it on themselves would pass a `requireForLogin` policy
 * with an address they never proved (measured on the route before BMG-004: it
 * was written as sent).
 */
export const ADMIN_ONLY_USER_FIELDS: readonly string[] = ['disabled', 'emailVerified'];

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
