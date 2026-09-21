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
