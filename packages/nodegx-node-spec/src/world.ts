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
 *   VIEWPORT. (NSP-013 s13) A play either HAS a browser viewport — the script's `viewport`,
 *           `{ width, height }` in CSS pixels — or it has NONE, which is a server render: no
 *           `window` at all (a node's `typeof window === 'undefined'` branch). With one, the size
 *           is read the way a page reads it (`window.innerWidth` / `innerHeight`) and changes ONLY
 *           at the script's `resizes`, each `{ at, width, height }` a world TIMER on the clock
 *           (Node's rule above: `at` ms after the play starts, never before 1): the size moves,
 *           then every `resize` listener runs, in the order it subscribed — synchronously, inside
 *           the `advance` that reaches it, as a DOM event's listeners run at its dispatch. A target
 *           with a real window (a browser, jsdom) refuses a `viewport` need it cannot size; on Node
 *           the world defines the `window` for the play (`installWorld`) and removes it after.
 *   LOCATION. (NSP-015 s16, s17) A play with a window has a LOCATION, the seam the navigation
 *           family writes through. The family reaches the browser through exactly three calls, and
 *           the world RECORDS each as handed and loads, renders and parses nothing on the way in —
 *           as the network parses nothing — each a trace event in the frame it is made, the three
 *           kinds in ONE group in the order made (trace.ts):
 *             `window.open(url, target, features)` — an `open` event `{ url, target, features }`,
 *               each canonical, a `target` or `features` not handed absent. It returns `null` when
 *               the features name `noopener` or `noreferrer` (a browser hands no handle then), or
 *               when the popup blocker refuses it: the activation is `false` and the target is not
 *               the page itself (`_self`, `_parent`, `_top`). Otherwise it returns a stand-in for the
 *               new window, `{ closed: false }` — the world has no second window to load.
 *             `history.pushState(state, title, url)` — a `history` event `{ op: 'push', url }`,
 *               `url` canonical as handed. The location's href becomes `url` resolved against the
 *               current href (`new URL(String(url), href)`). A url that does not resolve, or that
 *               resolves to another ORIGIN, is refused as a browser refuses it: the call is
 *               recorded, the href does not move, and the call THROWS a `SecurityError`
 *               (`DOMException`). A push fires neither `popstate` nor `hashchange` — a hash change
 *               is not a navigation; a node that wants its router to hear one dispatches it.
 *             `window.dispatchEvent(event)` (the global `dispatchEvent` in a page) — a `dispatch`
 *               event `{ event: <its type> }`; the play's listeners for that type
 *               (`addEventListener('popstate' | 'hashchange', fn)`) run at once, in the order they
 *               subscribed, as a DOM dispatch runs them. `PopStateEvent` is the play's too.
 *           The href STARTS at the script's `location` (absent: `https://app.example/`); a page
 *           reads it as `location.href` / `pathname` / `search` / `hash`, live.
 *           USER ACTIVATION — whether the press came from a person — is a fact of the play, the
 *           script's `activation`: `true` / `false` is `navigator.userActivation.isActive` for
 *           the whole play; absent, the browser has no `userActivation` (Safari before 16.4,
 *           Firefox before 120) and its popup blocker lets the open through. Without a window
 *           there is no location and no activation.
 *   PROJECT. (NSP-015 s17) The project's settings, as a node reads them
 *           (`NoodlRuntime.instance.getProjectSettings()`) — the script's `projectSettings`, an
 *           object of setting name → value; absent, `{}`: a project that set nothing, where every
 *           reader takes its own default (Navigate To Path: `navigationPathType` unset is `hash`).
 *           Fixed for the play.
 *   STACK.  (NSP-015 s18) The Component Stacks a play's navigation nodes hand their requests to —
 *           played by the world as the network plays a server: what a stack DOES with a request
 *           (which page, how deep, the transition) is the Component Stack's own behaviour (a visual
 *           node, NSP-016); what the NODE hands it and what it is told back is the node's. Two
 *           protocols, each call recorded AS HANDED, a `stack` trace event in the LOCATION group
 *           (trace.ts), in the order made:
 *             a push or a replace (`NavigationHandler.instance.navigate(name, args)` /
 *               `.replace(name, args)`, Push Component To Stack) — `{ op: 'push' | 'replace', stack,
 *               target, params, transition }`, each canonical, `stack` / `target` absent when not
 *               handed. The HANDLER's rules are the world's: a blank name (`name || 'Main'`) is
 *               `Main`; a name with no registered stack (the script's `names`, absent: none) is
 *               QUEUED and, since no stack registers during a play, never answered; every stack
 *               registered under the name answers (the node settles once). A stack answers by the
 *               script's `answers`, the first rule whose `match` fits (`op`, `target` canonically
 *               equal), `done` when none does: `unchanged` or a `failure` (`code`, `message`) is
 *               told inside the call, as a stack's checks run before it builds anything; `done` is
 *               told a microtask later, once it has built the page — both land in the settle whose
 *               frame made the call.
 *             a pop (the back callback a stack installs on every Pop Component Stack in a page it
 *               pushed) — `{ op: 'back', action, results }`, `action` absent when none. Whether the
 *               node SITS in a pushed page is the script's: `back` absent, it does not (no callback,
 *               nothing is called); present, the n-th pop of the play is answered with the n-th
 *               entry (the last repeating) — `done` (`{ ok: true }`), `unchanged` (the stack is at its
 *               first page) or a `failure` (still animating) — returned from the call.
 *           The pushing node's back channel (the stack calling a pushed request's `backCallback`
 *           when its page is popped) is not scripted: on the runtime it reaches nothing (row C26).
 *   ROUTE.  (NSP-015 s19) The Routers a play's Navigate nodes hand their requests to, and the Router
 *           whose page a Page Inputs sits in — played by the world as STACK plays the Component
 *           Stacks: which page a Router builds, its URL, its transition, are the Router's own spec (a
 *           visual node, NSP-016); what the NODE hands it and what it is told back is the node's.
 *             a navigate (`RouterHandler.instance.navigate(name, args)`, Navigate) — a `route` trace
 *               event in the LOCATION group, `{ router, target, params, openInNewTab }`, each canonical
 *               AT THE CALL, `router` / `target` absent when not handed. The HANDLER's rules are the
 *               world's (router-handler.ts :51-67): it hands the request on ONE MILLISECOND LATER, a
 *               world timer (`setTimeout(…, 1)`), and only then picks the routers: when the script
 *               registers routers under exactly ONE name, that name, whatever the node handed;
 *               otherwise the name AS HANDED, as a property key — there is no blank-is-`Main` rule on
 *               this side (a router registers under `name || 'Main'`, :70, but `navigate` looks up
 *               `String(name)`). A name with no router is QUEUED and, since no router registers during
 *               a play, never answered. Every router under the name answers; the node settles once. A
 *               router answers by the script's `answers`, the first rule whose `match` fits (`target`
 *               equal canonically; `noTarget: true` — Target never set; `openInNewTab`), `done` when none
 *               does — told inside that +1 ms timer (a `done` a microtask later, once the page is
 *               built), so the answer lands in the `advance` that reaches it.
 *             the params a Router hands the page it built (`_setPageParams`, router.tsx :604, :926)
 *               — the script's `page`, in order: an entry with no `at` (or 0) when the page is built,
 *               i.e. at the node's mount, before its first frame; an entry `at` > 0 at that time on the
 *               clock (a Router reset onto the same page with other params, router.tsx :528-531). Absent:
 *               the node sits in no Router's page (a Component Stack hands a page its params as the
 *               page component's own inputs, navigation-stack.tsx :974-977, never to a Page Inputs).
 *               Not a trace event — the world's hand-off, as a timer's firing is not.
 *
 * A TARGET'S VIEW (s13, from the third stranger's first question). A spec's reducers read the world
 * as `WorldView` (spec.ts); a target is handed THIS module's `World` by `install(world)`. One to one:
 *   `now()` = `world.clock.now()` · `random()` / `bytes(n)` / `uuid()` = `world.random.next()` /
 *   `.bytes(n)` / `.uuid()` · a patch's `after` / `cancel` = `world.clock.schedule(ms, fn)` (returns
 *   an id) / `world.clock.cancel(id)` · a `request` / `abort` = `world.network.issue(request,
 *   deliver)` / `world.network.abort(id)` · `registry` = `world.registry` · `viewport()` =
 *   `world.viewport` (`undefined`: no window) read as `{ width, height }` · `listen('resize')` =
 *   `world.viewport.listen(fn)` (returns the unsubscribe). `dispose(h)` releases what the instance
 *   holds in the world — cancels its timers, aborts its requests, unsubscribes its listeners: a
 *   play's world is thrown away after the play, so nothing graded today depends on it, but a target
 *   that keeps a world across plays would hear a disposed node. The clock is ONE per world:
 *   `advance(h, ms)` moves it for every instance and records the `advance` event on `h`'s trace
 *   only (a graph's trace is assembled per node, runner/graph.ts).
 *
 * Backend (records, users, files, cloud functions) is the fifth seam NSP-007 names; it arrives
 * with NSP-014, reusing the request seam at the HTTP level (README §8, NSP-007 §2).
 */

import * as nodeCrypto from 'crypto';

import { canonicalise } from './canonical';
import { Registry, type RegistryScript } from './registry';
import type { TraceEvent } from './trace';
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
  /** NSP-013 s13: the browser viewport (VIEWPORT above). Absent: no window — a server render. */
  viewport?: ViewportScript;
  /** NSP-015 s16: `navigator.userActivation.isActive` for the play (LOCATION above). Absent: no `userActivation`. Read only with a window. */
  activation?: boolean;
  /** NSP-015 s17: the href the play's location starts at (LOCATION above). Absent: `https://app.example/`. Read only with a window. */
  location?: string;
  /** NSP-015 s17: the project's settings (PROJECT above). Absent: `{}`. */
  projectSettings?: Record<string, unknown>;
  /** NSP-015 s18: the Component Stacks (STACK above). Absent: none — a push is queued for good, and no Pop Component Stack sits in a pushed page. */
  stack?: StackScript;
  /** NSP-015 s19: the Routers (ROUTE above). Absent: none — every navigate is queued, and no Page Inputs sits in a Router's page. */
  router?: RouterScript;
}

/** What a Component Stack tells a request (STACK above). */
export type StackAnswer = 'done' | 'unchanged' | { failure: { code: string; message: string } };

/** STACK above: one answer rule — first match wins; absent `match` fits every request. `target` matches canonically. */
export interface StackRule {
  match?: { op?: 'push' | 'replace'; target?: unknown };
  answer: StackAnswer;
}

/** STACK above: the registered stacks, how they answer, and what a pop is told. */
export interface StackScript {
  /** The names stacks are registered under (`''` is `Main`); absent: none. */
  names?: readonly string[];
  /** How a registered stack answers a push or a replace; absent or no match: `done`. */
  answers?: readonly StackRule[];
  /** What the n-th pop is told (the last repeating); absent: no Pop Component Stack sits in a pushed page. */
  back?: StackAnswer | readonly StackAnswer[];
}

/** ROUTE above: one answer rule — first match wins; absent `match` fits every request. `target` matches canonically. */
export interface RouteRule {
  /** `noTarget: true` fits a navigate whose Target was never set (`undefined`, which JSON cannot say); `target` never fits that one. */
  match?: { target?: unknown; noTarget?: true; openInNewTab?: boolean };
  answer: StackAnswer;
}

/** ROUTE above: the registered routers, how they answer, and the params a Router hands the page a Page Inputs sits in. */
export interface RouterScript {
  /** The names routers are registered under (`''` is `Main`); absent: none. */
  names?: readonly string[];
  /** How a registered router answers a navigate; absent or no match: `done`. */
  answers?: readonly RouteRule[];
  /** What the Router hands its page's Page Inputs, in order: no `at` (or 0) at the build (mount), `at` > 0 on the clock. Absent: the node sits in no Router's page. */
  page?: ReadonlyArray<{ at?: number; params: Record<string, unknown> }>;
}

/** VIEWPORT above: the size at the start, and the resizes the clock will deliver. */
export interface ViewportScript {
  width: number;
  height: number;
  resizes?: ReadonlyArray<{ at: number; width: number; height: number }>;
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

  /**
   * NSP-015 s19 (T9) — fires the ONE earliest timer due at or before `until` (due, then scheduled
   * order) and returns true, or returns false when none is due. A target with an event loop steps an
   * `advance` with this and yields after EVERY timer — two timers due at the same moment included:
   * on an event loop a timer's microtasks run before the next timer fires, whatever its due time
   * (two Navigates answered in one millisecond; stepping by due TIME fired both in one sweep).
   */
  step(until: number): boolean {
    let next: Scheduled | undefined;
    for (const t of this.timers) {
      if (t.due <= until && (!next || t.due < next.due || (t.due === next.due && t.seq < next.seq))) next = t;
    }
    if (!next) return false;
    this.timers = this.timers.filter((t) => t !== next);
    if (next.due > this._now) this._now = next.due;
    next.fn();
    return true;
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

/** The play's viewport (VIEWPORT above): its size now, and the `resize` listeners the scripted resizes run. */
export class Viewport {
  width: number;
  height: number;
  private listeners: Array<() => void> = [];

  constructor(clock: Clock, script: ViewportScript) {
    this.width = script.width;
    this.height = script.height;
    for (const r of script.resizes ?? []) {
      clock.schedule(r.at, () => {
        this.width = r.width;
        this.height = r.height;
        for (const l of [...this.listeners]) l();
      });
    }
  }

  /** Subscribes a `resize` listener; returns the unsubscribe. */
  listen(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }
}

/** One `window.open` call, as handed (LOCATION above). */
export interface OpenRecord {
  url: unknown;
  target: unknown;
  features: unknown;
}

/** One call the location recorded, in the order made (LOCATION above): an open, a push, a dispatch. */
export type LocationCall =
  | ({ call: 'open' } & OpenRecord)
  | { call: 'push'; url: unknown }
  | { call: 'dispatch'; event: string };

/** Where a play's location starts when its script names none (LOCATION above). */
export const DEFAULT_HREF = 'https://app.example/';

/** The targets a popup blocker never refuses: the page itself (LOCATION above). */
const SAME_PAGE_TARGETS = ['_self', '_parent', '_top'];

/**
 * What `window.open` hands back (LOCATION above): `null` with `noopener` / `noreferrer` in the
 * features, or when the popup blocker refuses — activation `false` and a target that is not the
 * page itself; a window otherwise. A spec reads it through `WorldView.opens`.
 */
export function openReturnsWindow(target: unknown, features: unknown, activation: boolean | undefined): boolean {
  const tokens = typeof features === 'string' ? features.toLowerCase().split(/[\s,]+/) : [];
  if (tokens.some((t) => t === 'noopener' || t.startsWith('noopener=') || t === 'noreferrer' || t.startsWith('noreferrer='))) return false;
  const samePage = typeof target === 'string' && SAME_PAGE_TARGETS.includes(target.toLowerCase());
  return !(activation === false && !samePage);
}

/** The trace event a location call is recorded as (LOCATION above; trace.ts) — the one translation every target shares. */
export function locationEvent(c: LocationCall): TraceEvent {
  if (c.call === 'push') return { t: 'history', op: 'push', url: canonicalise(c.url) };
  if (c.call === 'dispatch') return { t: 'dispatch', event: c.event };
  const e: TraceEvent = { t: 'open', url: canonicalise(c.url) };
  if (c.target !== undefined) e.target = canonicalise(c.target);
  if (c.features !== undefined) e.features = canonicalise(c.features);
  return e;
}

/**
 * Where `history.pushState(…, url)` takes a location at `href` (LOCATION above): `url` resolved
 * against it, or `null` when the browser refuses — a url that does not resolve, or one on another
 * origin. A spec reads it through `WorldView.pushes`.
 */
export function pushTarget(url: unknown, href: string): string | null {
  let next: URL;
  try {
    next = new URL(String(url), href);
  } catch {
    return null;
  }
  return next.origin === new URL(href).origin ? next.href : null;
}

/** One call a navigation node made to a Component Stack (STACK above), as handed. */
export type StackCall =
  | { call: 'push' | 'replace'; stack: unknown; target: unknown; params: unknown; transition: unknown }
  | { call: 'back'; action: unknown; results: unknown };

/** The trace event a stack call is recorded as (STACK above; trace.ts) — canonical NOW, since a node hands its live objects. */
export function stackEvent(c: StackCall): TraceEvent {
  if (c.call === 'back') {
    const e: TraceEvent = { t: 'stack', op: 'back', results: canonicalise(c.results) ?? null };
    if (c.action !== undefined) e.action = canonicalise(c.action);
    return e;
  }
  const e: TraceEvent = { t: 'stack', op: c.call, params: canonicalise(c.params) ?? null, transition: canonicalise(c.transition) ?? null };
  if (c.stack !== undefined) e.stack = canonicalise(c.stack);
  if (c.target !== undefined) e.target = canonicalise(c.target);
  return e;
}

/** The handler's name rule (STACK above): `name || 'Main'`, as a property key. */
export function stackName(name: unknown): string {
  return String(name || 'Main');
}

/** The Component Stacks of a play (STACK above): who is registered, what they answer, every call made. */
export class WorldStack {
  /** Every call, as its trace event, in the order made. */
  readonly calls: TraceEvent[] = [];
  private listeners: Array<(e: TraceEvent) => void> = [];
  private pops = 0;

  constructor(readonly script: StackScript) {}

  /** Called with every call's event as it is made — how a target attributes it to the node that made it. */
  onCall(listener: (e: TraceEvent) => void): void {
    this.listeners.push(listener);
  }

  /** Records a call as handed. */
  record(c: StackCall): void {
    const e = stackEvent(c);
    this.calls.push(e);
    for (const l of this.listeners) l(e);
  }

  /** How many stacks are registered under the name a node handed (`stackName`). */
  registered(name: unknown): number {
    const key = stackName(name);
    return (this.script.names ?? []).filter((n) => stackName(n) === key).length;
  }

  /** What ONE registered stack tells a push or a replace for this target (first rule, `done` when none fits). */
  answerFor(op: 'push' | 'replace', target: unknown): StackAnswer {
    const key = JSON.stringify(canonicalise(target) ?? null);
    const rule = (this.script.answers ?? []).find((r) => (r.match?.op === undefined || r.match.op === op) && (r.match === undefined || !('target' in r.match) || JSON.stringify(canonicalise(r.match.target) ?? null) === key));
    return rule ? rule.answer : 'done';
  }

  /** What the node is told for a push or a replace — `undefined` when no stack is registered under the name: queued, for good. */
  answer(op: 'push' | 'replace', name: unknown, target: unknown): StackAnswer | undefined {
    return this.registered(name) > 0 ? this.answerFor(op, target) : undefined;
  }

  /** Whether a Pop Component Stack sits in a pushed page (the stack installed its back callback). */
  get inPushedPage(): boolean {
    return this.script.back !== undefined;
  }

  /** What the pop `ahead` calls from now is told (0 = the next); `undefined` when not in a pushed page. Reads; consumes nothing. */
  backAnswer(ahead = 0): StackAnswer | undefined {
    const b = this.script.back;
    if (b === undefined) return undefined;
    const list: readonly StackAnswer[] = Array.isArray(b) ? b : [b as StackAnswer];
    if (list.length === 0) return 'done';
    return list[Math.min(this.pops + ahead, list.length - 1)];
  }

  /** A pop: records it as handed and returns what the stack tells it (consumes one answer). Only in a pushed page. */
  back(action: unknown, results: unknown): StackAnswer {
    const answer = this.backAnswer(0);
    if (answer === undefined) throw new Error('world: a pop with no stack to pop — the node is not in a pushed page');
    this.record({ call: 'back', action, results });
    this.pops++;
    return answer;
  }
}

/** One navigate a Navigate node handed the RouterHandler (ROUTE above), as handed. */
export interface RouteCall {
  router: unknown;
  target: unknown;
  params: unknown;
  openInNewTab: unknown;
}

/** The trace event a navigate is recorded as (ROUTE above; trace.ts) — canonical NOW, since a node hands its live objects. */
export function routeEvent(c: RouteCall): TraceEvent {
  const e: TraceEvent = { t: 'route', params: canonicalise(c.params) ?? null, openInNewTab: canonicalise(c.openInNewTab) ?? null };
  if (c.router !== undefined) e.router = canonicalise(c.router);
  if (c.target !== undefined) e.target = canonicalise(c.target);
  return e;
}

/** A router registers under `name || 'Main'` (router-handler.ts :70), as a property key. */
export function routerName(name: unknown): string {
  return String(name || 'Main');
}

function sameCanonical(a: unknown, b: unknown): boolean {
  if (a === undefined || b === undefined) return a === b;
  return JSON.stringify(canonicalise(a)) === JSON.stringify(canonicalise(b));
}

/** The Routers of a play (ROUTE above): who is registered, what they answer, every navigate handed. */
export class WorldRouter {
  /** Every navigate, as its trace event, in the order handed. */
  readonly calls: TraceEvent[] = [];
  private listeners: Array<(e: TraceEvent) => void> = [];

  constructor(readonly script: RouterScript) {}

  /** Called with every navigate's event as it is handed — how a target attributes it to the node that made it. */
  onCall(listener: (e: TraceEvent) => void): void {
    this.listeners.push(listener);
  }

  /** Records a navigate as handed. */
  record(c: RouteCall): void {
    const e = routeEvent(c);
    this.calls.push(e);
    for (const l of this.listeners) l(e);
  }

  /** The handler's lookup at +1 ms (router-handler.ts :54-59): the one registered name when there is exactly one, else the name as handed. */
  resolve(name: unknown): string {
    const keys = Array.from(new Set((this.script.names ?? []).map(routerName)));
    return keys.length === 1 ? keys[0] : String(name);
  }

  /** How many routers answer a navigate handed under `name`. */
  registered(name: unknown): number {
    const key = this.resolve(name);
    return (this.script.names ?? []).filter((n) => routerName(n) === key).length;
  }

  /** What ONE registered router tells a navigate to this target (first rule, `done` when none fits). */
  answerFor(target: unknown, openInNewTab: unknown): StackAnswer {
    const rule = (this.script.answers ?? []).find(
      (r) =>
        r.match === undefined ||
        ((!('target' in r.match) || sameCanonical(r.match.target, target)) && (!r.match.noTarget || target === undefined) && (r.match.openInNewTab === undefined || r.match.openInNewTab === openInNewTab))
    );
    return rule ? rule.answer : 'done';
  }

  /** What the node is told at +1 ms — `undefined` when no router answers to the name: queued, for good. */
  answer(name: unknown, target: unknown, openInNewTab: unknown): StackAnswer | undefined {
    return this.registered(name) > 0 ? this.answerFor(target, openInNewTab) : undefined;
  }

  /** The params the Router hands its page (`page`), in order; empty when the node sits in no Router's page. */
  get pages(): ReadonlyArray<{ at: number; params: Record<string, unknown> }> {
    return (this.script.page ?? []).map((p) => ({ at: Number(p.at ?? 0) || 0, params: p.params }));
  }
}

/** The location of a play with a window (LOCATION above): its href, every call made, and the user activation. */
export class WorldLocation {
  /** Every `window.open`, in order. */
  readonly opened: OpenRecord[] = [];
  /** Every call, opens included, in the order made. */
  readonly calls: LocationCall[] = [];
  /** The current href. */
  href: string;
  private listeners: Array<(c: LocationCall) => void> = [];
  private eventListeners: Array<{ type: string; fn: (e: unknown) => void }> = [];

  constructor(
    readonly activation: boolean | undefined,
    start: string = DEFAULT_HREF
  ) {
    this.href = new URL(start).href;
  }

  /** Called with every call as it is made — how a target attributes it to the node that made it. */
  onCall(listener: (c: LocationCall) => void): void {
    this.listeners.push(listener);
  }

  private record(c: LocationCall): void {
    this.calls.push(c);
    for (const l of this.listeners) l(c);
  }

  /** `window.open`: records the call as handed; opens nothing; returns a stand-in window or `null` (`openReturnsWindow`). */
  open(url: unknown, target: unknown, features: unknown): { closed: false } | null {
    const record: OpenRecord = { url, target, features };
    this.opened.push(record);
    this.record({ call: 'open', ...record });
    return openReturnsWindow(target, features, this.activation) ? { closed: false } : null;
  }

  /** `history.pushState`: records the call as handed; moves the href, or throws a `SecurityError` for a url another origin's or none (`pushTarget`). */
  push(url: unknown): void {
    this.record({ call: 'push', url });
    const next = pushTarget(url, this.href);
    if (next === null) {
      throw new DOMException(`Failed to execute 'pushState' on 'History': A history state object with URL '${String(url)}' cannot be created in a document with origin '${new URL(this.href).origin}'`, 'SecurityError');
    }
    this.href = next;
  }

  /** `window.dispatchEvent`: records the event's type, then runs that type's listeners in subscription order. */
  dispatch(event: { type: string }): true {
    this.record({ call: 'dispatch', event: event.type });
    for (const l of this.eventListeners.filter((x) => x.type === event.type)) l.fn(event);
    return true;
  }

  /** `addEventListener` for a location event (`popstate`, `hashchange`); returns the unsubscribe. A listener already subscribed to that type is not added twice. */
  listen(type: string, fn: (e: unknown) => void): () => void {
    if (!this.eventListeners.some((x) => x.type === type && x.fn === fn)) this.eventListeners.push({ type, fn });
    return () => {
      this.eventListeners = this.eventListeners.filter((x) => !(x.type === type && x.fn === fn));
    };
  }
}

export class World {
  readonly script: WorldScript;
  readonly clock = new Clock();
  readonly random: Random;
  readonly network: Network;
  readonly registry: Registry;
  /** The IANA zone the play runs in (TIME ZONE above): the script's, or `UTC`. */
  readonly timeZone: string;
  /** The viewport (VIEWPORT above), or none: a server render. */
  readonly viewport: Viewport | undefined;
  /** The location (LOCATION above) — exactly when there is a window. */
  readonly location: WorldLocation | undefined;
  /** The project's settings (PROJECT above). */
  readonly projectSettings: Readonly<Record<string, unknown>>;
  /** The Component Stacks (STACK above) — always: a play with none registered queues every push. */
  readonly stack: WorldStack;
  /** The Routers (ROUTE above) — always: a play with none registered queues every navigate. */
  readonly router: WorldRouter;

  constructor(script: WorldScript = {}) {
    this.script = script;
    this.random = new Random(script.seed ?? 1);
    this.network = new Network(this.clock, script.network ?? []);
    this.registry = new Registry(this.random, script.registry);
    this.timeZone = script.timeZone ?? 'UTC';
    this.viewport = script.viewport ? new Viewport(this.clock, script.viewport) : undefined;
    this.location = this.viewport ? new WorldLocation(script.activation, script.location) : undefined;
    this.projectSettings = { ...(script.projectSettings ?? {}) };
    this.stack = new WorldStack(script.stack ?? {});
    this.router = new WorldRouter(script.router ?? {});
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
  // VIEWPORT: a window only when the script has a viewport — none is a server render, left as the host has it
  const viewport = world.viewport;
  const location = world.location;
  if (viewport && location) {
    const subscribed = new Map<unknown, () => void>();
    // LOCATION: `navigator.userActivation` only when the script says what it is
    const navigator = location.activation === undefined ? {} : { userActivation: { isActive: location.activation } };
    const parts = () => new URL(location.href);
    const pageLocation = {
      get href() {
        return location.href;
      },
      get origin() {
        return parts().origin;
      },
      get pathname() {
        return parts().pathname;
      },
      get search() {
        return parts().search;
      },
      get hash() {
        return parts().hash;
      }
    };
    const history = { pushState: (_state: unknown, _title: unknown, url?: unknown) => location.push(url) };
    const dispatchEvent = (event: { type: string }) => location.dispatch(event);
    const unsubscribe = new Map<string, Map<unknown, () => void>>();
    define('window', {
      navigator,
      location: pageLocation,
      history,
      dispatchEvent,
      open: (url: unknown, target: unknown, features: unknown) => location.open(url, target, features),
      get innerWidth() {
        return viewport.width;
      },
      get innerHeight() {
        return viewport.height;
      },
      addEventListener(type: string, fn: (e: unknown) => void) {
        if (type === 'resize') {
          if (subscribed.has(fn)) return;
          subscribed.set(fn, viewport.listen(() => fn({ type: 'resize' })));
          return;
        }
        if (type !== 'popstate' && type !== 'hashchange') return;
        const byFn = unsubscribe.get(type) ?? new Map<unknown, () => void>();
        unsubscribe.set(type, byFn);
        if (!byFn.has(fn)) byFn.set(fn, location.listen(type, fn));
      },
      removeEventListener(type: string, fn: unknown) {
        if (type === 'resize') {
          subscribed.get(fn)?.();
          subscribed.delete(fn);
          return;
        }
        unsubscribe.get(type)?.get(fn)?.();
        unsubscribe.get(type)?.delete(fn);
      }
    });
    // a page's globals ARE its window's: `location.hash`, `history.pushState`, a bare `dispatchEvent(…)`
    define('location', pageLocation);
    define('history', history);
    define('dispatchEvent', dispatchEvent);
    define(
      'PopStateEvent',
      class PopStateEvent {
        readonly type: string;
        readonly state: unknown;
        constructor(type: string, init?: { state?: unknown }) {
          this.type = type;
          this.state = init?.state ?? null;
        }
      }
    );
  }
  // PROJECT: the settings a node reads through the runtime are the target's to install (the runtime target's `install`)
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
