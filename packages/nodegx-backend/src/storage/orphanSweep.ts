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

export async function runOrphanSweep(
  stores: StorageDriver | StorageDriver[],
  metadata: MetadataStore,
  options: SweepOptions = {}
): Promise<OrphanSweepReport> {
  const now = options.now || (() => new Date());
  const drivers = Array.isArray(stores) ? stores : [stores];
  try {
    const rows = await metadata.listAll();
    // A row is identified by (store kind, key): the two stores' key spaces are independent.
    const rowKeys = new Set<string>();
    for (const row of rows) rowKeys.add(`${row.driver}:${row.key}`);

    const blobKeys = new Set<string>(); // `${kind}:${key}`
    const known = new Set<string>();
    for (const driver of drivers) {
      known.add(driver.kind);
      for await (const key of driver.listKeys()) blobKeys.add(`${driver.kind}:${key}`);
    }

    const orphanBlobs: string[] = [];
    const orphanPairs: Array<{ driver: StorageDriver; key: string }> = [];
    for (const driver of drivers) {
      for (const tagged of blobKeys) {
        if (!tagged.startsWith(`${driver.kind}:`)) continue;
        if (rowKeys.has(tagged)) continue;
        const key = tagged.slice(driver.kind.length + 1);
        orphanBlobs.push(key);
        orphanPairs.push({ driver, key });
      }
    }
    const orphanRows: string[] = [];
    for (const row of rows) {
      if (!known.has(row.driver) || !blobKeys.has(`${row.driver}:${row.key}`)) orphanRows.push(row.objectId);
    }

    let deleted = false;
    if (options.delete) {
      for (const { driver, key } of orphanPairs) await driver.delete(key);
      deleted = true;
    }

    return { at: now().toISOString(), orphanBlobs, orphanRows, deleted };
  } catch (e) {
    return {
      at: now().toISOString(),
      orphanBlobs: [],
      orphanRows: [],
      deleted: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}
