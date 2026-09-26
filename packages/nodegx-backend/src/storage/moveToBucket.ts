/**
 * BMG-015 §7 — *Move files to the bucket*. Connecting a bucket points the
 * NEXT upload at it; every file uploaded before stays on this machine, served
 * by the local store its row names. This moves them, one at a time, in the
 * background, with progress the Storage page polls.
 *
 * One file is: read the bytes from this machine → write them to the bucket →
 * check the bucket holds all of them → point the row at the bucket (only if
 * the row still names the local copy — `expect`) → delete the local copy.
 * The row moves only once the bytes are safe in the bucket, so a failure at
 * any step leaves the file serving from where it was; the worst a crash can
 * leave is a copy nothing points at, which the orphan sweep lists.
 *
 * @module nodegx-backend/storage/moveToBucket
 */

import type { IStorageFacade } from '@noodl/backend-contract';

import { FILES_COLLECTION, type FileRecord } from './MetadataStore';
import type { StorageDriver } from './types';

export interface MoveFailure {
  /** The stored name, as the Storage page lists it. */
  name: string;
  /** One sentence. */
  error: string;
}

/** `GET /admin/files/move`'s `progress`. */
export interface MoveProgress {
  state: 'idle' | 'running' | 'done';
  total: number;
  moved: number;
  bytes: number;
  failed: MoveFailure[];
  startedAt: string | null;
  finishedAt: string | null;
}

export interface FileMoverDeps {
  facade: IStorageFacade;
  local: StorageDriver;
  /** Read at start: the bucket connected now, or null. */
  bucket: () => StorageDriver | null;
  now?: () => Date;
}

export const NO_BUCKET_TO_MOVE_TO = 'Connect a bucket first: there is nowhere to move the files to.';
export const MOVE_ALREADY_RUNNING = 'Files are already being moved. Wait for this move to finish.';

function idle(): MoveProgress {
  return { state: 'idle', total: 0, moved: 0, bytes: 0, failed: [], startedAt: null, finishedAt: null };
}

function sentence(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (err && err.code === 'ENOENT') return 'Its bytes are not on this machine any more; the orphan sweep lists its row.';
  if (err && err.message && /^Precondition /.test(err.message)) return 'It changed while it was being moved, and was left where it is.';
  return (err && err.message) || String(e);
}

/**
 * Move ONE file's bytes from `local` to `bucket` and point its row there.
 * Returns the bytes moved; throws with the file still serving from where it was.
 */
export async function moveOneToBucket(row: FileRecord, local: StorageDriver, bucket: StorageDriver, facade: IStorageFacade): Promise<number> {
  const data = await local.get(row.key);
  const key = await bucket.put(row.hash, data);
  const landed = await bucket.stat(key);
  if (!landed.exists || landed.size !== data.length) {
    await bucket.delete(key).catch(() => undefined);
    throw new Error(`The bucket holds ${landed.size} of its ${data.length} bytes, so it was left on this machine.`);
  }
  try {
    await facade.rawSave(FILES_COLLECTION, row.objectId, { driver: 's3', key }, undefined, { driver: 'local', key: row.key });
  } catch (e) {
    await bucket.delete(key).catch(() => undefined);
    throw e;
  }
  // The row names the bucket now; a local copy that will not delete is an orphan, not a failure.
  await local.delete(row.key).catch(() => undefined);
  return data.length;
}

export class FileMover {
  private p: MoveProgress = idle();
  private running: Promise<void> | null = null;
  private stopping = false;

  constructor(private readonly deps: FileMoverDeps) {}

  progress(): MoveProgress {
    return { ...this.p, failed: this.p.failed.slice() };
  }

  /** How many files are still on this machine. */
  onThisMachine(): Promise<number> {
    return this.deps.facade.rawCount(FILES_COLLECTION, { driver: 'local' });
  }

  /** Start a move in the background. Throws (by sentence) with no bucket, or while one runs. */
  start(): MoveProgress {
    if (this.running) throw new Error(MOVE_ALREADY_RUNNING);
    const bucket = this.deps.bucket();
    if (!bucket) throw new Error(NO_BUCKET_TO_MOVE_TO);
    this.stopping = false;
    this.p = { ...idle(), state: 'running', startedAt: this.now() };
    this.running = this.run(bucket).finally(() => {
      this.running = null;
    });
    return this.progress();
  }

  /** Resolves when the current move (if any) has ended. */
  whenDone(): Promise<void> {
    return this.running || Promise.resolve();
  }

  /** The service is stopping: finish the file in hand, start no other. */
  stop(): void {
    this.stopping = true;
  }

  private now(): string {
    return (this.deps.now ? this.deps.now() : new Date()).toISOString();
  }

  private async run(bucket: StorageDriver): Promise<void> {
    try {
      const { results } = await this.deps.facade.rawQueryAll(FILES_COLLECTION, { where: { driver: 'local' }, sort: 'createdAt' });
      const rows = results as unknown as FileRecord[];
      this.p.total = rows.length;
      for (const row of rows) {
        if (this.stopping) break;
        try {
          this.p.bytes += await moveOneToBucket(row, this.deps.local, bucket, this.deps.facade);
          this.p.moved++;
        } catch (e) {
          this.p.failed.push({ name: row.storedName, error: sentence(e) });
        }
      }
    } catch (e) {
      this.p.failed.push({ name: '', error: sentence(e) });
    } finally {
      this.p.state = 'done';
      this.p.finishedAt = this.now();
    }
  }
}
