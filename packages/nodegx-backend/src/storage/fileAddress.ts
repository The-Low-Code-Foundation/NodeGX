/**
 * P112-OWN023-FILEURLHOST — a File field's address is filled in when it is read.
 *
 * A File field is stored as `{__type: 'File', name, url}` with the url the upload
 * answered, and that url used to be read back verbatim. Built on a laptop, every
 * url said `http://127.0.0.1:8584`; on a VM the backend listens on `0.0.0.0` and
 * the browser reaches it through a domain, so the saved data pointed at a machine
 * nobody else can reach. Richard ruled (2026-10-25) that the backend fills the
 * address in, Parse Server's way: the NAME is the file, and every answer builds
 * the url from the address the request reached this backend on.
 *
 * The address is the request's, carried by `AsyncLocalStorage` from the HTTP
 * dispatcher (`HttpServer.start`) through every read it makes, so the facade's
 * one serializer (`toWire`) can fill it in without each of its callers passing
 * it. Outside a request (a trigger, a scheduled workflow) there is no address,
 * and a File keeps what was stored.
 *
 * Two things are deliberately NOT rewritten:
 *   - a File whose stored url is not this backend's `/files/<name>` — it lives
 *     somewhere else (an import from another host, a CDN) and that url is the
 *     only way to it;
 *   - a url held in a plain text field. Only a File field says "this is a file
 *     of mine"; the kit says to keep a file in one.
 *
 * @module nodegx-backend/storage/fileAddress
 */
import { AsyncLocalStorage } from 'async_hooks';

const origins = new AsyncLocalStorage<string>();

/** Run `fn` with `origin` (`https://host[:port]`, no trailing slash) as the address files are answered at. */
export function withFileOrigin<T>(origin: string, fn: () => T): T {
  return origins.run(origin.replace(/\/+$/, ''), fn);
}

/** The address of the request being answered, or undefined outside one. */
export function currentFileOrigin(): string | undefined {
  return origins.getStore();
}

/** Where this backend serves the stored file `name` when reached at `origin`. */
export function fileUrlAt(origin: string, name: string): string {
  return `${origin}/files/${encodeURIComponent(name)}`;
}

/** Is `url` this backend's own address for `name` — any host, the path `/files/<name>`? */
function isOwnFileUrl(url: string, name: string): boolean {
  try {
    return new URL(url).pathname === `/files/${encodeURIComponent(name)}`;
  } catch {
    // A relative or unparseable url names no other host.
    return url.split('?')[0] === `/files/${encodeURIComponent(name)}`;
  }
}

/** Deeper than any field a person builds; a bound so a pathological value cannot make a read recurse without end. */
const MAX_DEPTH = 32;

/**
 * `value` with the url of every one of this backend's File values in it filled in
 * from `origin`: the value itself, or one held anywhere inside an Array or Object
 * field (a gallery's photos, a page's scans). Copy on write: a value with no File
 * in it is returned as it is, and nothing stored is changed.
 */
export function addressFile(value: unknown, origin: string | undefined): unknown {
  return origin ? addressAt(value, origin, 0) : value;
}

function addressAt(value: unknown, origin: string, depth: number): unknown {
  if (!value || typeof value !== 'object' || depth > MAX_DEPTH) return value;
  if (Array.isArray(value)) {
    let out: unknown[] | null = null;
    value.forEach((item, i) => {
      const addressed = addressAt(item, origin, depth + 1);
      if (addressed !== item) (out ??= value.slice())[i] = addressed;
    });
    return out ?? value;
  }
  const v = value as Record<string, unknown>;
  if (v.__type === 'File') {
    if (typeof v.name !== 'string' || !v.name) return value;
    if (typeof v.url === 'string' && v.url && !isOwnFileUrl(v.url, v.name)) return value;
    return { ...v, url: fileUrlAt(origin, v.name) };
  }
  let out: Record<string, unknown> | null = null;
  for (const [key, item] of Object.entries(v)) {
    const addressed = addressAt(item, origin, depth + 1);
    if (addressed !== item) (out ??= { ...v })[key] = addressed;
  }
  return out ?? value;
}

/** A record with every File in it addressed at `origin` (the realtime frame's shape). */
export function addressFiles(record: Record<string, unknown>, origin: string | undefined): Record<string, unknown> {
  if (!origin) return record;
  let out: Record<string, unknown> | null = null;
  for (const [key, value] of Object.entries(record)) {
    const addressed = addressFile(value, origin);
    if (addressed !== value) (out ??= { ...record })[key] = addressed;
  }
  return out ?? record;
}
