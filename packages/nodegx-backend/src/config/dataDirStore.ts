/**
 * P115 HST-011 — the data dir's own files, kept in a store the host hands in.
 *
 * The backend keeps its rules, roles' policy, keys, secrets, sign-in settings, triggers and deployed cloud
 * functions as JSON files in its data dir (`security.json`, `secrets.json`, `auth.json`, `workflows/*.json`, …).
 * On a machine the disk keeps them. On a Cloudflare Worker `node:fs` is the isolate's memory: it survives
 * requests and is gone when Cloudflare replaces the isolate (an eviction, a redeploy), while the records, kept in
 * the Durable Object's SQLite, stay. So the host can hand the service a `DataDirStore` (the object's storage) and:
 *
 *   - at `start()`, every file the store holds is written into the data dir first (`restoreDataDir`), so a service
 *     started in a fresh isolate reads the same files a long-running one would;
 *   - every write and removal of one of those files goes through `writeDataFile` / `removeDataFile` below, which
 *     change the disk exactly as before and then the store.
 *
 * Reads stay on the disk: after the restore it holds what the store holds, and the ~30 read sites stay unchanged.
 * With no store (every Node spawner, the default) these helpers are the atomic writes the subsystems each had a copy
 * of, and nothing else happens.
 *
 * Out of the store on purpose (each kept by something else, or rebuilt): the records (`data/local.db`, the adapter's
 * engine), the execution history (`executions.sqlite`), file bytes (`files/blobs`, the file driver, HST-012), the
 * thumbnail cache (`files/thumbs`, rebuilt on a miss), backup archives (`backups/`, written to their destination).
 *
 * @module nodegx-backend/config/dataDirStore
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Where a host keeps the data dir's files: relative POSIX paths (`security.json`, `workflows/subscribe.workflow.json`)
 * to their text. Synchronous because every writer in the service is (a Durable Object's `ctx.storage.sql.exec` and
 * `ctx.storage.kv` are). A throw from `put` or `delete` fails the write that caused it, loudly: a setting that only
 * reached the isolate's memory would be lost on the next restart without anyone being told.
 */
export interface DataDirStore {
  list(): string[];
  get(rel: string): string | undefined;
  put(rel: string, contents: string): void;
  delete(rel: string): void;
}

const attached = new Map<string, DataDirStore>();

/** The store that keeps `filePath`, and its path relative to that data dir; null when none does. */
function storeFor(filePath: string): { store: DataDirStore; rel: string } | null {
  if (!attached.size) return null;
  const full = path.resolve(filePath);
  for (const [dir, store] of attached) {
    if (full.startsWith(dir + path.sep)) return { store, rel: path.relative(dir, full).split(path.sep).join('/') };
  }
  return null;
}

/**
 * Writes the store's files into `dataDir` (over what is there) and keeps it there until the returned detach is
 * called. Answers how many files it wrote. A second attach of the same dir replaces the first.
 */
export function attachDataDirStore(dataDir: string, store: DataDirStore): { restored: number; detach: () => void } {
  const dir = path.resolve(dataDir);
  let restored = 0;
  for (const rel of store.list()) {
    const contents = store.get(rel);
    if (contents === undefined) continue;
    const full = path.join(dir, ...rel.split('/'));
    if (!full.startsWith(dir + path.sep)) throw new Error(`data dir store: "${rel}" is outside the data dir`);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents, rel === 'secrets.json' ? { mode: 0o600 } : undefined);
    restored++;
  }
  attached.set(dir, store);
  return {
    restored,
    detach: () => {
      if (attached.get(dir) === store) attached.delete(dir);
    }
  };
}

/**
 * Writes a data-dir file the way every subsystem did (a temporary file renamed over the target, so a crash leaves the
 * old file or the new one, never half of one; `mode` applied best-effort), then into the attached store, if any.
 */
export function writeDataFile(filePath: string, contents: string, options: { mode?: number } = {}): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, contents, options.mode !== undefined ? { mode: options.mode } : undefined);
  fs.renameSync(tmp, filePath);
  if (options.mode !== undefined) {
    try {
      fs.chmodSync(filePath, options.mode);
    } catch {
      // chmod is best-effort on platforms without POSIX modes.
    }
  }
  const kept = storeFor(filePath);
  if (kept) kept.store.put(kept.rel, contents);
}

/** `writeDataFile` for a JSON value, formatted as every config file in the data dir is. */
export function writeDataJSON(filePath: string, value: unknown, options: { mode?: number } = {}): void {
  writeDataFile(filePath, JSON.stringify(value, null, 2) + '\n', options);
}

/** Removes a data-dir file (throws, as `unlinkSync` does, when it is missing), then from the attached store. */
export function removeDataFile(filePath: string): void {
  fs.unlinkSync(filePath);
  const kept = storeFor(filePath);
  if (kept) kept.store.delete(kept.rel);
}

/** Removes a data-dir folder and everything under it (no throw when it is missing), then the same from the store. */
export function removeDataDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
  const kept = storeFor(path.join(dirPath, '_'));
  if (!kept) return;
  const prefix = kept.rel.slice(0, -1);
  for (const rel of kept.store.list()) if (rel.startsWith(prefix)) kept.store.delete(rel);
}
