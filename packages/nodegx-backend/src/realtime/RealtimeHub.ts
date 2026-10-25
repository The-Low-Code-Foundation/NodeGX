/**
 * RealtimeHub — SSE connection registry and delivery engine (BAK-001).
 *
 * One `GET /realtime` opens a Server-Sent-Events stream; the first frame hands
 * the client a server-generated `clientId`. `POST /realtime/subscriptions`
 * REPLACES that connection's subscription set (Pocketbase-style, idempotent).
 * Change events arrive from the {@link ChangeBus} and are delivered to a
 * connection only when, for one of its subscriptions:
 *   - the collection matches,
 *   - the record satisfies the subscription filter ({@link matchesFilter}), and
 *   - `canReadRecord(principal, record)` is true — the SAME row-level predicate
 *     the query routes enforce, so realtime can never leak a row a query hides.
 *
 * Design commitments from the spec (do not relitigate):
 *   - **Events-only, no replay.** The hub keeps no event log. Per-connection
 *     event ids are monotonic so a `Last-Event-ID` reconnect is *detectable*; a
 *     reconnect (or a slow-client queue overflow) yields a `resync` event and
 *     the client re-runs its query. That is the entire gap contract.
 *   - **Bounded per-connection queue.** A client that stops reading backs up
 *     into a bounded queue; on overflow the queue is dropped, a single `resync`
 *     is enqueued, and the connection is kept. Never buffer unboundedly, never
 *     silently drop a single event.
 *   - Subscription CREATION is gated on the collection's `find` CLP; delivery is
 *     gated per-event per-subscriber on the row ACL.
 *
 * @module nodegx-backend/realtime/RealtimeHub
 */

import * as crypto from 'crypto';

import { Principal, ClpOp, canReadRecord } from '../security/model';
import { ChangeAction, ChangeBus, ChangeEvent } from './ChangeBus';
import { Where, matchesFilter, assertFilterSupported, UnsupportedFilterError } from './filter';
import { addressFiles } from '../storage/fileAddress';

/** The subset of http.ServerResponse the hub writes to (test-injectable). */
export interface SSEResponse {
  writeHead(status: number, headers: Record<string, string>): void;
  write(chunk: string): boolean;
  end(): void;
  on(event: 'close' | 'drain' | 'error', cb: () => void): void;
}

/** The security surface the hub needs — structurally satisfied by SecurityState. */
export interface HubSecurity {
  readonly devOpenActive: boolean;
  checkClp(
    principal: Principal,
    collection: string,
    op: ClpOp
  ): { allowed: boolean; reason: string; narrow?: Record<string, unknown> };
  /**
   * P116 ONT-012 — the details this caller may not read, per collection (`SecurityState.hiddenFor`).
   * Optional only so a test's stand-in need not say "nothing is hidden"; the service passes the state.
   */
  hiddenFor?(principal: Principal): Record<string, Array<{ field: string; shownWhere?: Record<string, unknown> }>>;
}

export interface Subscription {
  collection: string;
  filter?: Where;
}

export interface HubOptions {
  /** Max events buffered per connection before overflow → drop + resync. */
  maxQueue?: number;
  /**
   * BAK-009: max SIMULTANEOUS streams. This is the realtime tier's rate limit —
   * a request-rate bucket makes no sense for a connection that stays open for
   * hours, so the resource that is actually finite (sockets and their queues)
   * is what gets capped. Read live from ops.json, so an operator can raise it
   * without a restart. 0 = unlimited.
   */
  maxConnections?: () => number;
  /** Heartbeat comment-frame interval (ms); 0 disables (tests). */
  heartbeatMs?: number;
  /**
   * P119-S2-LIVEPATH: how a subscription narrowed by a path or `creator` rule is delivered. Without it such a
   * subscription is refused, as before.
   */
  confirm?: RowConfirm;
}

/**
 * P119-S2-LIVEPATH — does `principal`'s own query on `collection`, narrowed to `narrow` the way its rule narrows
 * `/classes`, return the row `id`? The service answers it with the facade query the routes run, so a change frame and
 * a query cannot disagree about who sees a row: there is no second matcher to drift.
 */
export type RowConfirm = (
  principal: Principal,
  collection: string,
  narrow: Record<string, unknown>,
  id: string
) => Promise<boolean>;

/** A subscription as the hub keeps it: what a path or `creator` rule narrows this caller to rides beside it. */
interface LiveSubscription extends Subscription {
  narrow?: Record<string, unknown>;
}

interface Connection {
  clientId: string;
  res: SSEResponse;
  principal: Principal;
  subscriptions: LiveSubscription[];
  queue: OutFrame[];
  /** P119-S2-LIVEPATH: frames waiting on a confirmation, delivered in the order their changes happened. */
  waiting: Promise<void> | null;
  waitingCount: number;
  nextId: number;
  writable: boolean;
  closed: boolean;
  heartbeat: ReturnType<typeof setInterval> | null;
  /** The address this stream reached the backend on — what its File fields are answered at. */
  origin?: string;
}

/**
 * The wire payloads this hub emits, one interface per `event`.
 *
 * These were a single `data: unknown` until PLAT-004. That is the shape the
 * ratchet keeps finding: three distinct payloads built as inline literals with
 * nothing naming them, so every reader — the specs above all, which are the
 * closest thing this package has to a contract test for the SSE wire — paid
 * for it with a cast, and a field rename on either side would have gone
 * unnoticed. The union is exported so a consumer can narrow on `event` and get
 * the payload, instead of asserting one.
 */
export interface ConnectedFrameData {
  clientId: string;
}

export interface ChangeFrameData {
  action: ChangeAction;
  collection: string;
  /** The record post-write, or as it was just before deletion. */
  record: Record<string, unknown>;
}

export interface ResyncFrameData {
  /** Why the client must re-query: no replay buffer exists. */
  reason: 'reconnect' | 'overflow' | 'shutdown' | (string & {});
}

/** Why one requested subscription was refused. */
export interface RejectedSubscription {
  collection: string;
  reason: string;
}

/** The body of `POST /realtime/subscriptions`'s 200. */
export interface SubscriptionResult {
  accepted: Subscription[];
  rejected: RejectedSubscription[];
}

export type OutFrame =
  | { event: 'connected'; data: ConnectedFrameData }
  | { event: 'change'; data: ChangeFrameData }
  | { event: 'resync'; data: ResyncFrameData };

const DEFAULT_MAX_QUEUE = 1000;
const DEFAULT_HEARTBEAT_MS = 25000;

const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Defeat nginx/proxy response buffering that would hold the stream (WF-003
  // deploy notes cover reverse proxies).
  'X-Accel-Buffering': 'no'
  // No Access-Control-Allow-Origin here since BAK-009: the dispatcher has
  // already set the configured one on this response, and repeating `*` in
  // writeHead would override it.
};

export class RealtimeHub {
  private readonly security: HubSecurity;
  private readonly connections = new Map<string, Connection>();
  private readonly maxQueue: number;
  private readonly heartbeatMs: number;
  private readonly maxConnections: () => number;
  private readonly unsubscribeBus: () => void;
  private readonly confirm: RowConfirm | undefined;

  constructor(bus: ChangeBus, security: HubSecurity, options: HubOptions = {}) {
    this.security = security;
    this.confirm = options.confirm;
    this.maxQueue = options.maxQueue ?? DEFAULT_MAX_QUEUE;
    this.maxConnections = options.maxConnections ?? (() => 0);
    this.heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
    this.unsubscribeBus = bus.subscribe((event) => this.onChange(event));
  }

  /** Number of live connections (introspection / tests). */
  get connectionCount(): number {
    return this.connections.size;
  }

  // ==========================================================================
  // Connection lifecycle
  // ==========================================================================

  /**
   * Open an SSE stream. Writes the stream headers, registers the connection,
   * and sends the `connected` frame carrying the new clientId. When `lastEventId`
   * is present (a reconnect) an immediate `resync` follows — the hub cannot
   * replay, so it tells the client to re-query.
   *
   * Returns null when the connection cap is reached, having written NOTHING —
   * the caller turns that into a plain 503 with `Retry-After`. Refusing before
   * the stream headers go out matters: a client that has already been told
   * `200 text/event-stream` has no way to learn it was rejected.
   */
  addConnection(res: SSEResponse, principal: Principal, lastEventId?: string, origin?: string): string | null {
    const cap = this.maxConnections();
    if (cap > 0 && this.connections.size >= cap) return null;

    const clientId = crypto.randomBytes(18).toString('base64url');
    res.writeHead(200, SSE_HEADERS);

    const conn: Connection = {
      clientId,
      res,
      principal,
      subscriptions: [],
      queue: [],
      nextId: 1,
      writable: true,
      closed: false,
      heartbeat: null,
      origin,
      waiting: null,
      waitingCount: 0
    };
    this.connections.set(clientId, conn);

    res.on('close', () => this.removeConnection(clientId));
    res.on('error', () => this.removeConnection(clientId));
    res.on('drain', () => {
      conn.writable = true;
      this.drain(conn);
    });

    this.enqueue(conn, { event: 'connected', data: { clientId } });
    if (lastEventId !== undefined && lastEventId !== '') {
      // No replay: any gap is unrecoverable, so a reconnect always resyncs.
      this.enqueue(conn, { event: 'resync', data: { reason: 'reconnect' } });
    }

    if (this.heartbeatMs > 0) {
      conn.heartbeat = setInterval(() => this.sendHeartbeat(conn), this.heartbeatMs);
      // Do not keep the event loop alive for heartbeats alone.
      if (typeof conn.heartbeat.unref === 'function') conn.heartbeat.unref();
    }

    return clientId;
  }

  private removeConnection(clientId: string): void {
    const conn = this.connections.get(clientId);
    if (!conn) return;
    conn.closed = true;
    if (conn.heartbeat) clearInterval(conn.heartbeat);
    this.connections.delete(clientId);
  }

  /**
   * BAK-009 graceful shutdown: tell every client the stream is ending before it
   * ends, then close. `resync` is deliberately reused rather than a new frame
   * type — every client already handles it (it means "re-query, you may have
   * missed something"), which is exactly the right instruction for a client
   * whose stream is about to disappear. A new `goodbye` event would be ignored
   * by every client shipped before it.
   */
  closeWithGoodbye(reason: string): void {
    for (const conn of this.connections.values()) {
      if (conn.closed) continue;
      try {
        this.enqueue(conn, { event: 'resync', data: { reason } });
      } catch {
        /* a stream that cannot take the goodbye is closed below anyway */
      }
    }
    this.close();
  }

  /** Shut the hub down: detach from the bus and close every stream. */
  close(): void {
    this.unsubscribeBus();
    for (const conn of Array.from(this.connections.values())) {
      conn.closed = true;
      if (conn.heartbeat) clearInterval(conn.heartbeat);
      try {
        conn.res.end();
      } catch {
        /* already closed */
      }
    }
    this.connections.clear();
  }

  // ==========================================================================
  // Subscription management (POST /realtime/subscriptions) — replace semantics
  // ==========================================================================

  /**
   * Replace `clientId`'s subscription set. Each requested subscription is gated
   * on the collection's `find` CLP for the connection's principal and validated
   * for filter support; accepted ones become the new set, rejected ones are
   * reported. Returns null when the clientId is unknown (caller → 404).
   */
  setSubscriptions(clientId: string, requested: Subscription[]): SubscriptionResult | null {
    const conn = this.connections.get(clientId);
    if (!conn) return null;

    const accepted: LiveSubscription[] = [];
    const rejected: RejectedSubscription[] = [];

    for (const sub of requested) {
      const collection = sub && typeof sub.collection === 'string' ? sub.collection : '';
      if (!collection) {
        rejected.push({ collection: String(sub && sub.collection), reason: 'collection is required' });
        continue;
      }
      try {
        assertFilterSupported(sub.filter);
      } catch (e) {
        rejected.push({ collection, reason: e instanceof UnsupportedFilterError ? e.message : 'invalid filter' });
        continue;
      }
      let narrow: Record<string, unknown> | undefined;
      if (!this.security.devOpenActive) {
        const decision = this.security.checkClp(conn.principal, collection, 'find');
        if (!decision.allowed) {
          rejected.push({ collection, reason: decision.reason });
          continue;
        }
        // P116 ONT-004: a path rule narrows rows through a chain the matcher cannot follow on a change frame.
        // P119-S2-LIVEPATH: so each change is confirmed by the subscriber's own narrowed query (`confirm`) instead;
        // a hub given no way to ask still refuses by name rather than streaming past the rule.
        if (decision.narrow && this.confirm) narrow = decision.narrow;
        else if (decision.narrow) {
          rejected.push({
            collection,
            reason: `"${collection}" lets you see only some of its rows (a path or "creator" rule), and live updates cannot follow that yet — query it instead`
          });
          continue;
        }
        // P116 ONT-012 (R-a): a detail shown on SOME rows needs the path its rule names, which a
        // change frame cannot follow — refused like a narrowed collection. A filter that names a
        // hidden detail is an oracle on it — refused by name, as a query is.
        const hidden = this.security.hiddenFor?.(conn.principal)[collection] ?? [];
        const partly = hidden.find((h) => h.shownWhere);
        if (partly) {
          rejected.push({
            collection,
            reason: `"${partly.field}" on "${collection}" is shown to you only on some records, through a path rule, and live updates cannot follow a path yet — query it instead`
          });
          continue;
        }
        const named = hidden.find((h) => filterNames(sub.filter, h.field));
        if (named) {
          rejected.push({ collection, reason: `"${named.field}" on "${collection}" is a detail you may not read, so a live filter may not name it` });
          continue;
        }
      }
      accepted.push(narrow ? { collection, filter: sub.filter, narrow } : { collection, filter: sub.filter });
    }

    conn.subscriptions = accepted;
    // The rule's narrowing is the hub's to apply, not the client's to read.
    return { accepted: accepted.map(({ collection, filter }) => ({ collection, filter })), rejected };
  }

  // ==========================================================================
  // Delivery
  // ==========================================================================

  private onChange(event: ChangeEvent): void {
    for (const conn of this.connections.values()) {
      if (conn.closed) continue;
      for (const sub of conn.subscriptions) {
        if (sub.collection !== event.collection) continue;
        let matches: boolean;
        try {
          matches = matchesFilter(sub.filter, event.record);
        } catch {
          // A filter that slipped past assertFilterSupported: fail closed.
          matches = false;
        }
        if (!matches) continue;
        // Delivery-time row-level permission — the twin of the query ACL filter.
        // In dev-open the query routes bypass row ACLs (aclFor → undefined), so
        // realtime must bypass them too or the twin property breaks locally.
        if (!this.security.devOpenActive && !canReadRecord(conn.principal, event.record)) continue;
        // P116 ONT-012 (R-a): the details this subscriber may not read are not in the frame. Only
        // "hidden on every row" can reach here; "shown on some" was refused at subscribe.
        const hidden = this.security.devOpenActive ? [] : (this.security.hiddenFor?.(conn.principal)[event.collection] ?? []);
        let record = event.record;
        if (hidden.length && record && typeof record === 'object') {
          record = { ...record };
          for (const h of hidden) delete (record as Record<string, unknown>)[h.field];
        }
        // P112-OWN023-FILEURLHOST: the LISTENER's address, not the writer's — this runs inside the write's request.
        if (record && typeof record === 'object') record = addressFiles(record, conn.origin);
        const frame: OutFrame = { event: 'change', data: { action: event.action, collection: event.collection, record } };
        if (sub.narrow && this.confirm) this.deliverLater(conn, this.narrowedFrame(conn.principal, sub.narrow, event, frame));
        else if (conn.waitingCount > 0) this.deliverLater(conn, Promise.resolve(frame));
        else this.enqueue(conn, frame);
        break; // at most one delivery per connection per change
      }
    }
  }

  /**
   * P119-S2-LIVEPATH — the frame a narrowed subscriber is owed for one change, or null. A create or update is theirs
   * when their own narrowed query returns the row. A delete cannot be asked of a query (the row is gone), so it is
   * read from the record as it was through the rule's last link ({@link deleteChecks}); where that cannot be read,
   * the subscriber is told to re-query rather than guessed at — the hub's one gap contract.
   */
  private async narrowedFrame(
    principal: Principal,
    narrow: Record<string, unknown>,
    event: ChangeEvent,
    frame: OutFrame
  ): Promise<OutFrame | null> {
    const confirm = this.confirm as RowConfirm;
    if (event.action !== 'delete') return (await confirm(principal, event.collection, narrow, event.id)) ? frame : null;
    const checks = deleteChecks(narrow, event.collection, event.record);
    let unread = checks === null;
    for (const check of checks ?? []) {
      if (check === true) return frame;
      if (check === 'unread') unread = true;
      else if (check !== false && (await confirm(principal, check.collection, check.narrow, check.id))) return frame;
    }
    return unread ? { event: 'resync', data: { reason: 'unconfirmed' } } : null;
  }

  /**
   * Deliver `decided` once it settles, after every frame already waiting on this connection: confirmations run side
   * by side, frames leave in the order their changes happened. A confirmation that fails sends a `resync` — the
   * subscriber re-queries and sees what its rule lets it see — never the frame.
   */
  private deliverLater(conn: Connection, decided: Promise<OutFrame | null>): void {
    conn.waitingCount++;
    const settled = decided.catch((): OutFrame => ({ event: 'resync', data: { reason: 'unconfirmed' } }));
    conn.waiting = (conn.waiting ?? Promise.resolve())
      .then(() => settled)
      .then((frame) => {
        if (frame) this.enqueue(conn, frame);
      })
      .finally(() => {
        conn.waitingCount--;
        if (conn.waitingCount === 0) conn.waiting = null;
      });
  }

  // ==========================================================================
  // The bounded queue + drain
  // ==========================================================================

  private enqueue(conn: Connection, frame: OutFrame): void {
    if (conn.closed) return;
    conn.queue.push(frame);
    if (conn.queue.length > this.maxQueue) {
      // Overflow: a slow reader has backed up past the bound. Drop everything
      // pending and collapse to a single resync — the client re-queries and is
      // whole again. Bounded memory, no silent single-event loss.
      conn.queue = [{ event: 'resync', data: { reason: 'overflow' } }];
    }
    this.drain(conn);
  }

  private drain(conn: Connection): void {
    while (!conn.closed && conn.writable && conn.queue.length > 0) {
      const frame = conn.queue.shift() as OutFrame;
      const id = conn.nextId++;
      const ok = conn.res.write(serializeFrame(frame, id));
      if (!ok) {
        // Backpressure: the socket buffer is full. Stop feeding it and wait for
        // 'drain'. Frames still in conn.queue are what the bound protects.
        conn.writable = false;
      }
    }
  }

  private sendHeartbeat(conn: Connection): void {
    if (conn.closed || !conn.writable) return;
    // A comment frame keeps idle proxies from closing the stream. No id.
    const ok = conn.res.write(': heartbeat\n\n');
    if (!ok) conn.writable = false;
  }
}

/** Serialize one frame to the SSE wire, stamping a monotonic per-connection id. */
function serializeFrame(frame: OutFrame, id: number): string {
  return `id: ${id}\nevent: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`;
}

/** A link's value as an id: a pointer, or the id itself. `undefined` for nothing; `null` for a value it cannot read. */
function linkedId(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof (value as { objectId?: unknown }).objectId === 'string') {
    return (value as { objectId: string }).objectId;
  }
  return null;
}

/**
 * P119-S2-LIVEPATH — how a deleted row is judged against a rule's narrowing, from the record as it was: `true` or
 * `false` when the record answers it alone, a query to confirm on the collection one link back, or `'unread'` where
 * neither works (a list or a repeated last hop, a link stored elsewhere). Several narrowings (`$or`) are one each.
 * `null` when the narrowing is not a shape this knows.
 *
 * The last link of a path is the end row's own field naming a row one hop back (`{ from, by }`): the deleted row
 * was reached exactly when that row is reached by the path without its last hop — the same `$path`, one hop shorter,
 * narrowing the collection it ends on. Every other narrowing (`creator`'s `owner`) is a condition on the row's own
 * values, which the record still holds.
 */
type DeleteCheck = boolean | 'unread' | { collection: string; narrow: Record<string, unknown>; id: string };
function deleteChecks(narrow: Record<string, unknown>, collection: string, record: Record<string, unknown>): DeleteCheck[] | null {
  const keys = Object.keys(narrow);
  if (keys.length === 1 && keys[0] === '$or' && Array.isArray(narrow.$or)) {
    const all: DeleteCheck[] = [];
    for (const one of narrow.$or as Record<string, unknown>[]) all.push(...(deleteChecks(one, collection, record) ?? ['unread']));
    return all;
  }
  if (keys.length === 1 && keys[0] === '$path') {
    const p = narrow.$path as {
      from: { collection: string; where?: Record<string, unknown> };
      hops: Array<Record<string, unknown>>;
      maxDepth: number;
    };
    const last = p.hops[p.hops.length - 1];
    if (!last || last.repeat || typeof last.by !== 'string' || last.from !== collection) return ['unread'];
    if (last.where) {
      try {
        if (!matchesFilter(last.where as Where, record)) return [false];
      } catch {
        return ['unread'];
      }
    }
    const id = linkedId(record[last.by]);
    if (id === undefined) return [false];
    if (id === null) return ['unread'];
    if (p.hops.length === 1) return [{ collection: p.from.collection, narrow: p.from.where ?? {}, id }];
    const before = p.hops[p.hops.length - 2];
    const prev = typeof before.from === 'string' ? before.from : typeof before.to === 'string' ? before.to : undefined;
    if (!prev) return ['unread'];
    return [{ collection: prev, narrow: { $path: { from: p.from, hops: p.hops.slice(0, -1), maxDepth: p.maxDepth - 1 } }, id }];
  }
  if (keys.some((k) => k.startsWith('$'))) return null;
  try {
    return [matchesFilter(narrow as Where, record)];
  } catch {
    return null;
  }
}

/** P116 ONT-012 — does a live filter name `field` anywhere (`$and`/`$or` included)? */
function filterNames(filter: unknown, field: string): boolean {
  if (!filter || typeof filter !== 'object') return false;
  if (Array.isArray(filter)) return filter.some((f) => filterNames(f, field));
  for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
    if (key.split('.')[0] === field) return true;
    if (key.startsWith('$') && filterNames(value, field)) return true;
  }
  return false;
}
