/**
 * BindingDriver — files kept in a bucket the HOST hands the backend as an object, not as an address and two keys
 * (P115 HST-012, seam 5 of HST-006 §8.7).
 *
 * On a Cloudflare Worker an R2 bucket is a *binding*: the platform gives the code an object with `put`, `get`,
 * `head`, `delete` and `list`, already authorised for that one bucket. There is nothing to type — no endpoint, no
 * access key id, no secret — and the disk beside the data dir is the isolate's memory, gone when it is replaced, so
 * `LocalDriver` cannot hold a file there. The host passes the binding as `BackendServiceOptions.filesBucket`, and
 * `FileSubsystem` makes this driver the store new uploads go to.
 *
 * Its `kind` is `'binding'`, its own: a `_Files` row that says `local` means "a folder beside the data dir" and one
 * that says `s3` means "the bucket files.json names, reached with the stored keys". Neither is true of these bytes,
 * and `FileSubsystem.driverFor` serves a row from the store its `driver` names, so a third key space needs a third
 * name (session 7's spike kept `local` by patching `LocalDriver.prototype`, which only worked because the Worker had
 * no real local store to confuse it with).
 *
 * Keys are written as `S3Driver` and `LocalDriver` write them (`aa/bb/<hash>-<random8>`), and the listing yields only
 * keys of that shape (`isFileKey`): a bucket may hold other things, and the orphan sweep deletes what it lists
 * without a row (BMG-017).
 *
 * A read buffers the object (`arrayBuffer`) before the stream answers: an upload is capped by `maxUploadBytes`, and a
 * Worker's `ReadableStream` → Node stream bridge is one more thing to measure; the ranged read asks the bucket for
 * the slice only, so a seek costs the slice.
 *
 * @module nodegx-backend/storage/BindingDriver
 */

import * as crypto from 'crypto';
import { PassThrough } from 'stream';

import { isFileKey } from './S3Driver';
import type { ByteRange, StorageDriver, StorageStat, StoredEntry } from './types';

/** What a bucket binding returns for `get` (the part this driver reads). */
export interface BucketBindingObject {
  size: number;
  uploaded: Date;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * The part of a bucket binding this driver uses. Cloudflare's `R2Bucket` satisfies it as it is; a test hands in a
 * map-backed fake (`tests/p115-hst012-binding-driver.test.ts`).
 */
export interface BucketBinding {
  put(key: string, value: ArrayBuffer | Uint8Array): Promise<unknown>;
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<BucketBindingObject | null>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  list(options?: { cursor?: string }): Promise<{ objects: Array<{ key: string; uploaded: Date }>; truncated: boolean; cursor?: string }>;
}

/** The error a missing object reads as: the same `code` `fs.readFileSync` throws, so callers branch once. */
function notFound(key: string): Error {
  return Object.assign(new Error(`ENOENT: no such file in the bucket, '${key}'`), { code: 'ENOENT' });
}

export class BindingDriver implements StorageDriver {
  readonly kind = 'binding' as const;

  constructor(private readonly bucket: BucketBinding) {}

  async put(hash: string, data: Buffer): Promise<string> {
    const key = `${hash.slice(0, 2) || '00'}/${hash.slice(2, 4) || '00'}/${hash}-${crypto.randomBytes(4).toString('hex')}`;
    await this.bucket.put(key, new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const object = await this.bucket.get(key);
    if (!object) throw notFound(key);
    return Buffer.from(await object.arrayBuffer());
  }

  createReadStream(key: string, range?: ByteRange): NodeJS.ReadableStream {
    const out = new PassThrough();
    (async () => {
      const object = await this.bucket.get(key, range ? { range: { offset: range.start, length: range.end - range.start + 1 } } : undefined);
      if (!object) throw notFound(key);
      out.end(Buffer.from(await object.arrayBuffer()));
    })().catch((e) => out.destroy(e instanceof Error ? e : new Error(String(e))));
    return out;
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async stat(key: string): Promise<StorageStat> {
    const head = await this.bucket.head(key);
    return head ? { exists: true, size: head.size } : { exists: false, size: 0 };
  }

  async *listKeys(): AsyncIterable<string> {
    for await (const entry of this.listEntries()) yield entry.key;
  }

  async *listEntries(): AsyncIterable<StoredEntry> {
    let cursor: string | undefined;
    do {
      const page = await this.bucket.list(cursor ? { cursor } : undefined);
      for (const o of page.objects) {
        if (!isFileKey(o.key)) continue;
        // Not `instanceof Date`: a binding's Date may come from another realm.
        const time = o.uploaded && typeof o.uploaded.getTime === 'function' ? o.uploaded.getTime() : NaN;
        const modified = Number.isNaN(time) ? null : new Date(time);
        yield { key: o.key, modified };
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  }
}
