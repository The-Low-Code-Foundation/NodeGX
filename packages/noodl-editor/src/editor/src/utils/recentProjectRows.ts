/**
 * HLT-003 — one row per project directory in the launcher's recents.
 *
 * ## What this is for, and why it is not "a React key fix"
 *
 * The launcher grid renders `recently_opened_project.json` and keyed each card
 * on the stored `id`. Measured on Richard's machine, 2026-09-21, across the 104
 * persisted entries:
 *
 * - **two different projects share one `id`** — `tut001-drive` and
 *   `Puppy test 3`, different directories, both carrying
 *   `692d3658-f11a-10db-e6c8-6b000f774898`. That collision *is* HLT-003's
 *   duplicate-key warning: every one of the 62 events measured across two
 *   sessions reported that single key, and the bursts begin ~2s after launch,
 *   about ten seconds **before** any project is opened — which is what ruled the
 *   canvas out and the launcher in.
 * - **one directory is registered twice** under two different ids
 *   (`TVW-004 s15 Drive`), which React never complained about and a person sees
 *   immediately: the same project, twice, in the grid.
 *
 * 🔴 So neither field was unique, and that is the whole reason this module
 * exists. Re-keying the grid on the directory — the thing a row actually *is* —
 * fixes the first defect and **would have caused** the second to start warning
 * instead. Per the phase's §5a rule, the fix has to count what it causes: the
 * de-duplication here is not a tidy-up beside the key change, it is the half
 * that makes the key change safe.
 *
 * ## Why the directory, and not a repaired `id`
 *
 * `project.id` is documented in `projectmodel.ts` as the project's *durable*
 * identity and the ownership half of `findReusableBackend`. Re-minting one to
 * break a collision would silently change which project owns a backend, so it
 * is deliberately **not** done here. A launcher row, by contrast, simply is "a
 * project directory you have opened", and a directory cannot be two rows.
 *
 * ⚠️ The id collision has consequences beyond the warning this task measured —
 * `getProjectEntryWithId` returns the *first* match, so a click on one of the
 * two colliding cards opens the other project, and per-project local settings
 * and git auth are keyed on that same id. Those are filed as their own row
 * rather than fixed here; see the phase README. Nothing about them is improved
 * or worsened by this module.
 *
 * Pure, so the property can be demonstrated against the real colliding data
 * rather than argued from the shape of the model: `LocalProjectsModel` itself
 * reaches `electron-store` and cannot be imported by a plain-Node runner.
 *
 * @module utils/recentProjectRows
 */

/** The fields this module needs. The stored entry has more; none of it matters here. */
export interface RecentProjectRow {
  retainedProjectDirectory: string;
  latestAccessed?: number;
}

/**
 * The key two entries must share before they are called the same row.
 *
 * Only the trailing separator is normalised. Case deliberately is **not**: macOS
 * is usually case-insensitive and Linux never is, and folding case here would
 * merge two genuinely different directories on the one platform where they can
 * both exist. A trailing slash, by contrast, is the same directory written two
 * ways and is exactly what a hand-typed or script-supplied path differs by.
 */
export function projectRowKey(directory: string): string {
  return String(directory ?? '').replace(/[/\\]+$/, '');
}

/**
 * One entry per directory, order preserved, **first occurrence wins**.
 *
 * The caller sorts by `latestAccessed` descending before calling, so first
 * means most-recently-opened — the row whose thumbnail and name are current.
 * The function does not sort for itself: doing so would hide from the caller
 * that the choice of survivor is a decision, and `fetch()` already owns the
 * ordering the grid displays.
 */
export function dedupeProjectRowsByDirectory<T extends RecentProjectRow>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];

  for (const row of rows) {
    const key = projectRowKey(row && row.retainedProjectDirectory);
    // An entry with no directory cannot be opened, deduplicated or rendered as
    // a row. Dropping it here keeps the grid's keys total, and `fetch()`'s
    // existence filter would drop it a moment later anyway.
    if (key === '') continue;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }

  return kept;
}

/**
 * HLT-011 — the row a person pointed at, addressed by the thing a row IS.
 *
 * 🔴 **The alternative is `rows.find((r) => r.id === id)`, and that is the
 * defect.** Two rows can carry one `id`, so `.find` answers about whichever was
 * sorted first — measured on a real store, driven on a real click: the second
 * of two colliding cards opened the first card's project.
 *
 * ⚠️ **Unique because {@link dedupeProjectRowsByDirectory} ran first.** The
 * caller owes this function a de-duplicated list; on a raw store a directory
 * registered twice would make *this* lookup ambiguous instead, which is the
 * trade HLT-003 measured and took deliberately. The two functions belong to one
 * rule and are read together.
 */
export function findRowByDirectory<T extends RecentProjectRow>(
  rows: readonly T[],
  directory: string
): T | undefined {
  const key = projectRowKey(directory);
  if (key === '') return undefined;
  return rows.find((row) => projectRowKey(row && row.retainedProjectDirectory) === key);
}

/**
 * HLT-011 — the rows that claim one durable identity.
 *
 * ## Why this lives beside the de-duplication rather than in its own module
 *
 * HLT-003 landed here having measured the same store and written the sentence
 * *"neither field was unique"*. The directory half became
 * {@link dedupeProjectRowsByDirectory}; this is the other half, and a second
 * module reading the same array for the other uniqueness property is how one
 * rule grows two copies ([[a-second-copy-of-a-palette-drifts-silently]]).
 *
 * ## What a collision IS, and what the editor may do about it
 *
 * 🔴 **`project.id` is not the launcher's to re-mint.** `projectmodel.ts`
 * documents it as the ownership key a backend is bound to, and
 * `findReusableBackend` matches on *"this project's id is in the backend's
 * `projectIds`"*. Measured on Richard's machine 2026-09-21:
 * `backend_msjck0y2ukxwv`, **"Puppy test 3 backend"**, carries the very id that
 * `tut001-drive` and `Puppy test 3` share — so healing the collision silently
 * would hand one of two real projects a different datastore than the one it
 * opened yesterday. This function therefore **reports**; it repairs nothing,
 * and nothing downstream of it repairs anything either.
 *
 * ⚠️ **No path inside the editor can produce one.** `_addProject` has minted a
 * fresh `guid()` since the initial commit, and that guid is 128 bits of
 * `Math.random` — a collision across a hundred rows is not a credible event.
 * The one on this machine was **manufactured by a session's drive fixture**:
 * P73 `TUT-001`'s verdict records cloning the store entry of the project it
 * copied, *"its `id` … is the one `backend_msjck0y2ukxwv` carries in
 * `projectIds`"* — deliberately, so the copy would inherit the backend. So the
 * property being defended here is against writers this module cannot see: a
 * script, a restored backup, a hand-edited file. Which is exactly why the
 * answer is to say so out loud rather than to assume it cannot happen.
 *
 * Deliberately takes the rows AFTER de-duplication: two entries for one
 * directory are one project registered twice, not two projects with one
 * identity, and reporting that to a person as a collision would be a lie.
 */
export interface DurableIdCollision {
  id: string;
  directories: string[];
  names: string[];
}

export function findDurableIdCollisions<T extends RecentProjectRow & { id?: string; name?: string }>(
  rows: readonly T[]
): DurableIdCollision[] {
  const byId = new Map<string, T[]>();

  for (const row of rows) {
    const id = row && typeof row.id === 'string' ? row.id.trim() : '';
    // A row with no id shares nothing. Grouping the empty string would report
    // every legacy project as colliding with every other one.
    if (id === '') continue;
    const group = byId.get(id);
    if (group) group.push(row);
    else byId.set(id, [row]);
  }

  const collisions: DurableIdCollision[] = [];
  for (const [id, group] of byId) {
    if (group.length < 2) continue;
    collisions.push({
      id,
      directories: group.map((row) => projectRowKey(row.retainedProjectDirectory)),
      names: group.map((row) => String(row.name ?? '').trim() || projectRowKey(row.retainedProjectDirectory))
    });
  }

  return collisions;
}
