/**
 * P115 HST-012: a bucket binding kept in a Map, shaped as Cloudflare's `R2Bucket` is for the calls `BindingDriver`
 * makes. It pages its listing (`pageSize`) so a driver that reads one page only is caught, and it records every call
 * so a spec can say which store a request reached.
 */
import type { BucketBinding, BucketBindingObject } from '../../src/storage/BindingDriver';

export interface FakeBucket extends BucketBinding {
  objects: Map<string, { bytes: Uint8Array; uploaded: Date }>;
  calls: string[];
  /** The ranges `get` was asked for, in order. */
  ranges: Array<{ offset: number; length: number }>;
}

export function fakeBucket(pageSize = 2): FakeBucket {
  const objects = new Map<string, { bytes: Uint8Array; uploaded: Date }>();
  const calls: string[] = [];
  const ranges: Array<{ offset: number; length: number }> = [];
  const asObject = (bytes: Uint8Array, uploaded: Date): BucketBindingObject => ({
    size: bytes.byteLength,
    uploaded,
    arrayBuffer: async () => bytes.slice().buffer
  });
  return {
    objects,
    calls,
    ranges,
    async put(key, value) {
      calls.push('put ' + key);
      const bytes = value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value.slice(0));
      objects.set(key, { bytes, uploaded: new Date() });
      return {};
    },
    async get(key, options) {
      calls.push('get ' + key);
      const o = objects.get(key);
      if (!o) return null;
      if (options?.range) {
        ranges.push(options.range);
        const { offset, length } = options.range;
        return asObject(o.bytes.slice(offset, offset + length), o.uploaded);
      }
      return asObject(o.bytes, o.uploaded);
    },
    async head(key) {
      calls.push('head ' + key);
      const o = objects.get(key);
      return o ? { size: o.bytes.byteLength } : null;
    },
    async delete(key) {
      calls.push('delete ' + key);
      objects.delete(key);
    },
    async list(options) {
      calls.push('list ' + (options?.cursor || ''));
      const keys = [...objects.keys()].sort();
      const start = options?.cursor ? Number(options.cursor) : 0;
      const page = keys.slice(start, start + pageSize);
      const next = start + pageSize;
      return {
        objects: page.map((key) => ({ key, uploaded: (objects.get(key) as { uploaded: Date }).uploaded })),
        truncated: next < keys.length,
        cursor: next < keys.length ? String(next) : undefined
      };
    }
  };
}
