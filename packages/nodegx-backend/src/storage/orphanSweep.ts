/**
 * Orphan sweep (BAK-006) — blobs with no `_Files` row, and rows whose blob is
 * missing. Compares the driver's actual key listing against the metadata
 * table; REPORT-ONLY by default (the default the spec calls for: "reporting
 * loudly rather than auto-deleting"). Passing `delete: true` opts into
 * actually removing orphan blobs (never rows — an orphan row with a missing
 * blob is a data-integrity problem for an operator to look at, not something
 * this job silently prunes).
 *
 * Runs on WF-005's `CronScheduler` — the SAME class BAK-007 already reuses
 * for scheduled backups (`BackupSubsystem`'s module doc: "ONE scheduler
 * class, two consumers" — this makes it three, still one scheduler).
 *
 * BMG-015: a backend can hold files in two stores at once (the local one and
 * a bucket — switching never moves a blob), so the sweep takes every store
 * and judges each `_Files` row against the store its `driver` column names.
 * A row whose store is not connected (an `s3` row, no bucket) is an orphan
 * row: its bytes may well exist, but nothing here can reach them.
 *
 * BMG-017: an upload writes its bytes BEFORE its row, and a move writes the
 * bucket copy before the row points there. The sweep reads the rows, then
 * lists the stores — a blob landing between the two had no row, and was
 * deleted; its row then pointed at nothing. So a blob younger than
 * `SWEEP_GRACE_MINUTES` (by the store's own clock: mtime, `LastModified`) is
 * reported as too new to judge and never deleted, and just before deleting,
 * the rows are read again and any candidate that has one now is kept.
 *
 * @module nodegx-backend/storage/orphanSweep
 */

import type { StorageDriver } from './types';
import type { MetadataStore } from './MetadataStore';
import type { OrphanSweepReport } from './config';

export interface SweepOptions {
  /** Actually delete orphan BLOBS (never rows). Default false — report only. */
  delete?: boolean;
  now?: () => Date;
}

/** A blob younger than this may be an upload or a move still writing its row: never judged. */
export const SWEEP_GRACE_MINUTES = 5;

export async function runOrphanSweep(
  stores: StorageDriver | StorageDriver[],
  metadata: MetadataStore,
  options: SweepOptions = {}
): Promise<OrphanSweepReport> {
  const now = options.now || (() => new Date());
  const drivers = Array.isArray(stores) ? stores : [stores];
  const graceMinutes = SWEEP_GRACE_MINUTES;
  // A row is identified by (store kind, key): the two stores' key spaces are independent.
  const rowKeysOf = async () => new Set((await metadata.listAll()).map((row) => `${row.driver}:${row.key}`));
  try {
    const rows = await metadata.listAll();
    const rowKeys = new Set<string>();
    for (const row of rows) rowKeys.add(`${row.driver}:${row.key}`);

    const blobs = new Map<string, Date | null>(); // `${kind}:${key}` → the store's age for it
    const known = new Set<string>();
    for (const driver of drivers) {
      known.add(driver.kind);
      for await (const entry of driver.listEntries()) blobs.set(`${driver.kind}:${entry.key}`, entry.modified);
    }

    const oldest = now().getTime() - graceMinutes * 60 * 1000;
    const orphanBlobs: string[] = [];
    const tooNew: string[] = [];
    let orphanPairs: Array<{ driver: StorageDriver; key: string; tagged: string }> = [];
    for (const driver of drivers) {
      for (const [tagged, modified] of blobs) {
        if (!tagged.startsWith(`${driver.kind}:`)) continue;
        if (rowKeys.has(tagged)) continue;
        const key = tagged.slice(driver.kind.length + 1);
        // An age the store did not give is not an age: judged as young.
        if (!modified || modified.getTime() > oldest) {
          tooNew.push(key);
          continue;
        }
        orphanBlobs.push(key);
        orphanPairs.push({ driver, key, tagged });
      }
    }
    const orphanRows: string[] = [];
    for (const row of rows) {
      if (!known.has(row.driver) || !blobs.has(`${row.driver}:${row.key}`)) orphanRows.push(row.objectId);
    }

    let deleted = false;
    if (options.delete) {
      // The listing took time; a row written since then claims its blob back.
      if (orphanPairs.length) {
        const nowRows = await rowKeysOf();
        orphanPairs = orphanPairs.filter((p) => !nowRows.has(p.tagged));
      }
      for (const { driver, key } of orphanPairs) await driver.delete(key);
      deleted = true;
      const gone = new Set(orphanPairs.map((p) => p.key));
      return { at: now().toISOString(), orphanBlobs: orphanBlobs.filter((k) => gone.has(k)), orphanRows, tooNew, graceMinutes, deleted };
    }

    return { at: now().toISOString(), orphanBlobs, orphanRows, tooNew, graceMinutes, deleted };
  } catch (e) {
    return {
      at: now().toISOString(),
      orphanBlobs: [],
      orphanRows: [],
      tooNew: [],
      graceMinutes,
      deleted: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}
