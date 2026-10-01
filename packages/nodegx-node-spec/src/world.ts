/**
 * The world (NSP-007) — clock, randomness and network as SCRIPTED fakes, owned by the runner and
 * handed to every target for one play. A node that waits, rolls dice or talks to a server is
 * specced as a conversation with this world, so its behaviour is as checkable as Counter's.
 *
 * One `World` per play, built from a `WorldScript` (JSON on a scenario or a generated sequence):
 * the seed of its random source and the network's scripted answers. Two targets playing one
 * scenario get two worlds built from the same script and behave identically by construction —
 * the same numbers, the same answers at the same moments.
 *
 * THE THREE RULES EVERY TARGET SHARES (a target reads these, the spec interpreter implements them
 * in interpreter.ts, the runtime target installs them into the runtime's own seams):
 *
 *   CLOCK.  Time starts at 0 and moves ONLY on an `advance` step — never on its own. `advance(ms)`
 *           first lets any answer already delivered land (a target with an event loop flushes
 *           its microtasks), then moves the clock, firing every timer due on the way in order of
 *           (due time, order scheduled) — and what each timer delivers lands BEFORE the next one
 *           fires, as on an event loop (a target with one yields between timers, `nextDue`; T6). A settle is a frame AT the current time; it does not move
 *           the clock. Every world timer is a JavaScript timer and keeps Node's rule for the
 *           delay: `Number(ms)`, and anything that is not a number from 1 to 2^31-1 is 1 — so a
 *           timer never fires in less than 1 ms, `setTimeout(fn, 0)` fires at +1, `NaN` is 1.
 *   RANDOM. One seeded source (mulberry32, the runner's own) behind `random()`, `bytes(n)` and
 *           `uuid()`; a target's `Math.random`, `crypto.getRandomValues` and `crypto.randomUUID`
 *           are the same three, so every draw a node makes comes out of one stream in the order
 *           the node makes them. A node that draws at mount consumes the first value at mount.
 *   NETWORK. The world is the server. A request is whatever string the node hands it as a URL —
 *           the world parses nothing and refuses nothing on shape (a browser's `fetch` resolves a
 *           relative URL; Node's throws; the world is neither). The first script rule whose
 *           `match` fits answers it: a status with headers and a body, a network error, or
 *           never. `after` > 0 delays the answer on the clock; absent or 0 answers at once (the
 *           same settle sees it). A request no rule answers is a VIOLATION: it is answered with
 *           a network error so the play can go on, and the runner fails the run (AC5). Aborting a
 *           request (a node's `Cancel`, its own timeout) delivers `{ aborted }` at once and drops
 *           any answer still due.
 *
 * WHAT GOES ON THE WIRE, in both directions, is fixed here once so the trace's `request` event
 * and the spec's response event mean the same thing on every target:
 *   - a request is `{ method, url, headers, body? }`: `method` as handed (a fetch's default is
 *     `GET`), `headers` with LOWER-CASED names (what `Headers` does; a later duplicate wins),
 *     `body` a string as handed, `{ "$form": [[name, value], …] }` for a FormData, absent for none;
 *   - an answer is `{ status, statusText, headers, body }` with `statusText` as scripted or `''`,
 *     `body` the TEXT that travels (`null` for no body), and `headers` lower-cased and completed
 *     the way a constructed `Response` completes them: a string body gets
 *     `content-type: text/plain;charset=UTF-8` and a JSON body (any scripted body that is not a
 *     string) gets `content-type: application/json`, unless the script named one.
 *
 *   REGISTRY. (NSP-012, registry.ts) The shared records and arrays the data nodes read and
 *           write — one registry per play, seeded from the script and nothing else; anonymous
 *           entries draw their ids from the random stream above. The rule in full is the header
 *           of registry.ts; a target that has its own tables (the runtime's process-wide
 *           `Model` / `Collection`) empties them for the play and seeds them from the same script.
 *   TIME ZONE. (NSP-013) The play runs in ONE IANA zone, the script's `timeZone`, `UTC` when the
 *           script names none — never the machine's. Everything a node reads of a calendar in
 *           "the host's local zone" (`getHours`, `setMonth`, `new Date(y, m, d)`, an `Intl` call
 *           with no `timeZone` option) reads it in that zone, DST rules included, and a node that
 *           names a zone of its own (Date To String's Timezone port) still reads that one. A
 *           target that cannot set its zone for a play (a browser) refuses a `timezone` need; on
 *           Node the zone is `process.env.TZ`, which V8 re-reads on every change
 *           (`installTimeZone`). Two plays of one script in two zones are two scenarios: the
 *           date nodes are graded in at least two, one crossing a DST change (NSP-013 AC5).
 *   DIGEST. (NSP-013) A SHA-2 digest a node asks the host for (`crypto.subtle.digest`) is
 *           answered by the WORLD, computed synchronously (`digestBytes`) and handed back as an
 *           already-resolved promise — so the answer lands in the microtask after the call, in
 *           the same frame, where a target's `settle` flushes it; on the host it lands on a
 *           thread-pool completion the clock cannot see and a frame boundary may or may not
 *           carry. The bytes are the standard's (FIPS 180-4), so a digest is byte-for-byte the
 *           host's; an algorithm the world does not know (`SHA-1`, `MD5`, a typo) is refused with
 *           the message `digestBytes` throws, as WebCrypto refuses it with `NotSupportedError`.
 *           `importKey` / `sign` (HMAC, JWT — cloud-only nodes) stay the host's.
 *
 * Backend (records, users, files, cloud functions) is the fifth seam NSP-007 names; it arrives
 * with NSP-014, reusing the request seam at the HTTP level (README §8, NSP-007 §2).
 */

import * as nodeCrypto from 'crypto';

import { Registry, type RegistryScript } from './registry';
import { mulberry32, type Rng } from './runner/random';

// ------------------------------------------------------------------------------------------------
// the script — JSON, on a scenario or a sequence

export interface WorldScript {
  /** Seed of the world's random source. Default 1. */
  seed?: number;
  /** The network's scripted answers, first match wins. */
  network?: readonly NetworkRule[];
  /** NSP-012: the records and arrays the play starts with (registry.ts). Absent: an empty registry. */
  registry?: RegistryScript;
  /** NSP-013: the IANA zone the play runs in (TIME ZONE above). Absent: `UTC`. */
  timeZone?: string;
}

export interface NetworkRule {
  /** What the rule answers; absent matches every request. `url` matches exactly, or as a prefix when it ends in `*`. */
  match?: { method?: string; url?: string };
  answer: Answer;
  /** Milliseconds on the clock before the answer lands; absent or 0 lands at once. */
  after?: number;
}

export type Answer =
  /** A response. `body`: a string travels as text; anything else travels as its JSON text. */
  | { status: number; statusText?: string; headers?: Record<string, string>; body?: unknown }
  /** The request never reaches a server: rejected with a `TypeError` carrying this message. */
  | { error: string }
  /** No answer ever comes (until the request is aborted). */
  | { never: true };

// ------------------------------------------------------------------------------------------------
// what travels

export interface RequestRecord {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | { $form: Array<[string, string]> };
}

/** The world's answer as a spec sees it (spec.ts `WorldResponse` adds the request id). */
export type Delivery =
  | { status: number; statusText: string; headers: Record<string, string>; body: string | null }
  | { error: { name: string; message: string } }
  | { aborted: true };

/** What the world hands a request's issuer when the answer lands. */
export type Deliver = (d: Delivery) => void;

// ------------------------------------------------------------------------------------------------
// the clock

interface Scheduled {
  id: number;
  due: number;
  seq: number;
  fn: () => void;
}

const TIMEOUT_MAX = 2 ** 31 - 1;

/** Node's rule for a timer's delay (lib/internal/timers.js): not a number from 1 to 2^31-1 → 1. */
export function timerDelay(ms: unknown): number {
  const n = Number(ms);
  return n >= 1 && n <= TIMEOUT_MAX ? n : 1;
}

export class Clock {
  private _now = 0;
  private seq = 0;
  private nextId = 1;
  private timers: Scheduled[] = [];

  now(): number {
    return this._now;
  }

  /** Schedules `fn` at `now + timerDelay(ms)`; returns a handle for `cancel`. */
  schedule(ms: unknown, fn: () => void): number {
    const id = this.nextId++;
    this.timers.push({ id, due: this._now + timerDelay(ms), seq: this.seq++, fn });
    return id;
  }

  cancel(id: number): void {
    this.timers = this.timers.filter((t) => t.id !== id);
  }

  /** Moves the clock by `ms`, firing every timer due on the way in (due, scheduled) order. */
  advance(ms: number): void {
    const target = this._now + Math.max(0, ms);
    for (;;) {
      let next: Scheduled | undefined;
      for (const t of this.timers) {
        if (t.due <= target && (!next || t.due < next.due || (t.due === next.due && t.seq < next.seq))) next = t;
      }
      if (!next) break;
      this.timers = this.timers.filter((t) => t !== next);
      if (next.due > this._now) this._now = next.due;
      next.fn();
    }
    this._now = target;
  }

  pending(): number {
    return this.timers.length;
  }

  /**
   * The earliest due time of a pending timer, or undefined. A target with an event loop steps an
   * `advance` timer by timer with this, yielding between them (NSP-013 s12, T6): in a browser the
   * microtasks a timer starts — a fetch's `.then` chain — run before the next timer fires, so an
   * answer due at +100 lands before a timeout due at +30000 in the same `advance`.
   */
  nextDue(): number | undefined {
    let due: number | undefined;
    for (const t of this.timers) if (due === undefined || t.due < due) due = t.due;
    return due;
  }
}

// ------------------------------------------------------------------------------------------------
// randomness

export class Random {
  private rng: Rng;
  constructor(seed: number) {
    this.rng = mulberry32(seed >>> 0);
  }
  /** [0, 1) */
  next(): number {
    return this.rng.next();
  }
  bytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = Math.floor(this.rng.next() * 256);
    return out;
  }
  /** A version-4 UUID laid out from 16 bytes of the stream (the same layout `crypto.randomUUID` has). */
  uuid(): string {
    const b = this.bytes(16);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    let hex = '';
    for (let i = 0; i < 16; i++) hex += b[i].toString(16).padStart(2, '0');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}

// ------------------------------------------------------------------------------------------------
// the network

interface InFlight {
  id: number;
  deliver: Deliver;
  timer?: number;
  done: boolean;
}

export class Network {
  /** Every request issued, in order — what went over the wire. */
  readonly requests: RequestRecord[] = [];
  /** Requests no rule answered (AC5): the runner fails a run that has any. */
  readonly violations: string[] = [];
  private nextId = 1;
  private inFlight = new Map<number, InFlight>();
  private listeners: Array<(r: RequestRecord) => void> = [];

  constructor(
    private readonly clock: Clock,
    private readonly rules: readonly NetworkRule[]
  ) {}

  /** Called with every request as it is issued — how a target attributes it to the node that made it. */
  onRequest(listener: (r: RequestRecord) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Issues a request: records it, finds its rule, schedules the delivery. Returns the request's
   * id (for `abort`). The record is NORMALISED here (lower-cased header names, the body's wire
   * form) so every issuer — the interpreter from a spec's effect, the runtime through `fetch` —
   * records the same thing.
   */
  issue(request: { method?: unknown; url: unknown; headers?: unknown; body?: unknown }, deliver: Deliver): number {
    const record = normaliseRequest(request);
    this.requests.push(record);
    for (const l of this.listeners) l(record);
    const id = this.nextId++;
    const entry: InFlight = { id, deliver, done: false };
    this.inFlight.set(id, entry);
    const rule = this.rules.find((r) => matches(r, record));
    if (!rule) {
      this.violations.push(`${record.method} ${record.url}: no rule in the world's script answers it`);
      this.land(entry, { error: { name: 'TypeError', message: `the world has no answer for ${record.method} ${record.url}` } });
      return id;
    }
    if ('never' in rule.answer) return id;
    const delivery = toDelivery(rule.answer);
    if (rule.after !== undefined && rule.after > 0) entry.timer = this.clock.schedule(rule.after, () => this.land(entry, delivery));
    else this.land(entry, delivery);
    return id;
  }

  /** Aborts a request still in flight: its answer is dropped and `{ aborted }` lands at once. A finished request is left alone. */
  abort(id: number): void {
    const entry = this.inFlight.get(id);
    if (!entry || entry.done) return;
    if (entry.timer !== undefined) this.clock.cancel(entry.timer);
    this.land(entry, { aborted: true });
  }

  private land(entry: InFlight, d: Delivery): void {
    if (entry.done) return;
    entry.done = true;
    this.inFlight.delete(entry.id);
    entry.deliver(d);
  }
}

function matches(rule: NetworkRule, r: RequestRecord): boolean {
  const m = rule.match;
  if (!m) return true;
  if (m.method !== undefined && m.method.toUpperCase() !== String(r.method).toUpperCase()) return false;
  if (m.url !== undefined) {
    if (m.url.endsWith('*')) return r.url.startsWith(m.url.slice(0, -1));
    return r.url === m.url;
  }
  return true;
}

/** The wire form of a request, from whatever a caller handed `fetch` (or a spec's effect). */
export function normaliseRequest(request: { method?: unknown; url: unknown; headers?: unknown; body?: unknown }): RequestRecord {
  const headers: Record<string, string> = {};
  const h = request.headers;
  if (h && typeof h === 'object') {
    // a `Headers` instance iterates [name, value] already lower-cased; a plain object is lower-cased here
    const entries: Iterable<[string, string]> =
      typeof (h as { entries?: unknown }).entries === 'function' ? ((h as { entries: () => Iterable<[string, string]> }).entries() as Iterable<[string, string]>) : Object.entries(h as Record<string, unknown>).map(([k, v]) => [k, String(v)] as [string, string]);
    for (const [name, value] of entries) headers[String(name).toLowerCase()] = String(value);
  }
  const record: RequestRecord = { method: request.method === undefined || request.method === null ? 'GET' : (request.method as string), url: String(request.url), headers };
  const body = request.body;
  if (body !== undefined && body !== null) {
    const form = body as { $form?: unknown; entries?: unknown };
    if (Array.isArray(form.$form)) record.body = { $form: (form.$form as Array<[string, string]>).map(([k, v]) => [String(k), String(v)]) };
    else if (typeof FormData !== 'undefined' && body instanceof FormData) record.body = { $form: [...body.entries()].map(([k, v]) => [k, String(v)]) };
    else record.body = String(body);
  }
  return record;
}

/** The wire form of a scripted answer (see the header: how headers are completed, what the body's text is). */
export function toDelivery(answer: Answer): Delivery {
  if ('error' in answer) return { error: { name: 'TypeError', message: answer.error } };
  if ('never' in answer) throw new Error('a never-answer has no delivery');
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(answer.headers ?? {})) headers[k.toLowerCase()] = String(v);
  let body: string | null = null;
  if (answer.body !== undefined) {
    if (typeof answer.body === 'string') {
      body = answer.body;
      if (!('content-type' in headers)) headers['content-type'] = 'text/plain;charset=UTF-8';
    } else {
      body = JSON.stringify(answer.body);
      if (!('content-type' in headers)) headers['content-type'] = 'application/json';
    }
  }
  return { status: answer.status, statusText: answer.statusText ?? '', headers, body };
}

// ------------------------------------------------------------------------------------------------
// the world

export class World {
  readonly script: WorldScript;
  readonly clock = new Clock();
  readonly random: Random;
  readonly network: Network;
  readonly registry: Registry;
  /** The IANA zone the play runs in (TIME ZONE above): the script's, or `UTC`. */
  readonly timeZone: string;

  constructor(script: WorldScript = {}) {
    this.script = script;
    this.random = new Random(script.seed ?? 1);
    this.network = new Network(this.clock, script.network ?? []);
    this.registry = new Registry(this.random, script.registry);
    this.timeZone = script.timeZone ?? 'UTC';
  }

  /** The AC5 check: every way this play touched something the script did not answer. */
  get violations(): string[] {
    return [...this.network.violations];
  }
}

// ------------------------------------------------------------------------------------------------
// the globals — how a target whose nodes reach the world through JavaScript's own seams
// (`setTimeout`, `fetch`, `crypto`, `Math.random`, `Date.now`) is pointed at this world.

export interface Installed {
  /** Puts every global back exactly as it was. */
  restore(): void;
  /** The real timer functions, for a harness that needs to yield to the event loop while the fakes are in place. */
  real: { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };
}

/** A `fetch` over this world: `init.signal` aborts through the world; a `Response` is built from the delivery. */
export function worldFetch(world: World): (input: unknown, init?: RequestInit) => Promise<Response> {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input && typeof input === 'object' && 'url' in (input as object) ? String((input as { url: unknown }).url) : String(input);
    return new Promise<Response>((resolve, reject) => {
      const id = world.network.issue({ method: init?.method, url, headers: init?.headers, body: init?.body }, (d) => {
        if ('aborted' in d) reject(new DOMException('This operation was aborted', 'AbortError'));
        else if ('error' in d) reject(Object.assign(new TypeError(d.error.message), { name: d.error.name }));
        else resolve(new Response(NULL_BODY_STATUSES.has(d.status) ? null : d.body, { status: d.status, statusText: d.statusText, headers: d.headers }));
      });
      const signal = init?.signal;
      if (signal) {
        if (signal.aborted) world.network.abort(id);
        else signal.addEventListener('abort', () => world.network.abort(id), { once: true });
      }
    });
  };
}

/** Statuses a `Response` may not carry a body for (the Fetch standard's null body statuses). */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

/**
 * Makes the world's zone the process's for a play (TIME ZONE above) and hands back the undo.
 * `process.env.TZ` is the one seam Node has: V8 drops its cached zone on every assignment, so a
 * `Date` constructed after the assignment reads the new rules — measured on Node 20 (2026-10-01,
 * NSP-013) before it was relied on. A target with no `process` (a browser) gets the undo and
 * nothing else, and must refuse a `timezone` need itself. A test file that plays a `timezone`
 * spec runs under tests/jest-env-real-process.js (see its header): jest's sandboxed
 * `process.env` is a copy, and a write to it moves nothing.
 */
export function installTimeZone(world: World): () => void {
  // under jest the sandbox's `process.env` is a copy V8 never hears about (jest-util
  // createProcessObject); tests/jest-env-real-process.js hands the real one over on this global
  const g = globalThis as { process?: { env?: Record<string, string | undefined> }; __nodeSpecRealProcessEnv?: Record<string, string | undefined> };
  const env = g.__nodeSpecRealProcessEnv ?? g.process?.env;
  if (!env) return () => undefined;
  const previous = env.TZ;
  env.TZ = world.timeZone;
  return () => {
    if (previous === undefined) delete env.TZ;
    else env.TZ = previous;
  };
}

/** WebCrypto's digest names and Node's, the three WebCrypto has (crypto/encoding.ts `DigestAlgorithm`). */
const DIGESTS: Readonly<Record<string, string>> = Object.freeze({ 'SHA-256': 'sha256', 'SHA-384': 'sha384', 'SHA-512': 'sha512' });

/**
 * The world's digest (DIGEST above): the standard's bytes for a name WebCrypto knows, computed
 * now. An unknown name throws — the message a node's `Error` port then carries, on every target.
 */
export function digestBytes(algorithm: unknown, data: Uint8Array): Uint8Array {
  const name = DIGESTS[String(algorithm)];
  if (!name) throw new Error(`Unrecognized algorithm name: ${String(algorithm)}`);
  return new Uint8Array(nodeCrypto.createHash(name).update(data).digest());
}

/**
 * Installs the world into the globals for the duration of a play. Everything is restored by
 * `restore()`, whatever happened. `crypto.subtle.digest` is the world's (DIGEST above); the rest
 * of `subtle` stays the host's. The process's zone becomes the world's (TIME ZONE above).
 */
export function installWorld(world: World): Installed {
  const g = globalThis as unknown as Record<string, unknown>;
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const define = (name: string, value: unknown) => {
    saved.set(name, Object.getOwnPropertyDescriptor(g, name));
    Object.defineProperty(g, name, { value, configurable: true, writable: true, enumerable: false });
  };
  const real = { setTimeout: g.setTimeout as typeof setTimeout, clearTimeout: g.clearTimeout as typeof clearTimeout };
  const mathRandom = Math.random;
  const dateNow = Date.now;
  const perf = g.performance as { now?: () => number } | undefined;
  const perfNow = perf?.now;

  const timers = new Map<number, number>(); // fake handle → clock id
  let nextHandle = 1;
  const fakeSetTimeout = (fn: (...a: unknown[]) => void, ms?: unknown, ...args: unknown[]) => {
    const handle = nextHandle++;
    timers.set(handle, world.clock.schedule(ms, () => {
      timers.delete(handle);
      fn(...args);
    }));
    return handle;
  };
  const fakeClearTimeout = (handle: unknown) => {
    const id = timers.get(handle as number);
    if (id !== undefined) {
      world.clock.cancel(id);
      timers.delete(handle as number);
    }
  };
  define('setTimeout', fakeSetTimeout);
  define('clearTimeout', fakeClearTimeout);
  define('fetch', worldFetch(world));
  const hostCrypto = g.crypto as { subtle?: Record<string, unknown> } | undefined;
  const hostSubtle = hostCrypto?.subtle;
  const restoreZone = installTimeZone(world);
  define('crypto', {
    subtle: {
      ...(hostSubtle ? { importKey: (hostSubtle.importKey as (...a: unknown[]) => unknown).bind(hostSubtle), sign: (hostSubtle.sign as (...a: unknown[]) => unknown).bind(hostSubtle) } : {}),
      digest: (algorithm: unknown, data: Uint8Array): Promise<ArrayBuffer> => {
        try {
          const bytes = digestBytes(algorithm, data);
          return Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
        } catch (e) {
          return Promise.reject(e);
        }
      }
    },
    getRandomValues: (arr: Uint8Array) => {
      arr.set(world.random.bytes(arr.length));
      return arr;
    },
    randomUUID: () => world.random.uuid()
  });
  Math.random = () => world.random.next();
  Date.now = () => world.clock.now();
  if (perf && perfNow) perf.now = () => world.clock.now();

  return {
    real,
    restore() {
      for (const [name, desc] of saved) {
        if (desc) Object.defineProperty(g, name, desc);
        else delete g[name];
      }
      Math.random = mathRandom;
      Date.now = dateNow;
      if (perf && perfNow) perf.now = perfNow;
      restoreZone();
    }
  };
}
