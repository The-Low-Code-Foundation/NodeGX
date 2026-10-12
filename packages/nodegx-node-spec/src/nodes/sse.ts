/**
 * Server-Sent Events (`net.noodl.SSE`) — read from `packages/noodl-runtime/src/nodes/std-library/agent/sse.ts` (the node) and
 * `agent/sse-connection.ts` (the connection: lifecycle, backoff, duplicate suppression, the two transports) on 2026-10-03
 * (NSP-014 s34), with the parsers in `agent/stream-parsers.ts` (stream-parsers.ts here). No backend layer sits under it: the
 * connection is the node's own code, so its backoff timer is graded here on the world's clock, and the seam is the browser's
 * `fetch` with a body that STREAMS (world.ts NETWORK, A STREAMED BODY).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (`sse` the node, `conn` the connection).
 *
 * THE RULES, before the citations.
 *
 * INPUTS (sse :127-322). Each is stored as the setter converts it; none reaches a connection already made — a connection copies
 * them when it is made (sse :619-642). Only URL and Auto Connect schedule anything: at the frame's end (one pass per frame,
 * sse :555-586), a live connection whose URL is still the one it was opened against is left alone; one whose URL moved is torn
 * down SILENTLY (a pending Connect `Unchanged`) and, with Auto Connect on and a URL, a new one connects. With no connection,
 * Auto Connect on and a URL, one connects. Text Path sends Text at once.
 *
 * CONNECTING (sse :603-647, conn :729-745). A pending Connect is `Unchanged`; the old connection is torn down silently; a new
 * one is made from the inputs. No URL: it FAILS for good — Last Error `No URL was set on the stream`, On Error, `error`, On
 * Close. Otherwise retries 0, Last Error cleared, `connecting`, and the transport opens: Transport `eventsource` asks for an
 * `EventSource`, which no play has (world.ts SOCKET's last line) — `EventSource is not available in this environment`, a
 * failure for good; anything else is `fetch` (conn :964-985 — a play always has one).
 *
 * THE REQUEST (conn :439-501). The method upper-cased; headers `Accept: text/event-stream`, `Cache-Control: no-store`, then
 * the Headers input's (each `String`, `undefined` / `null` skipped), then `Last-Event-ID` when the connection has seen an id;
 * a body only when there is one and the method is not GET or HEAD — a string as itself, anything else as JSON with
 * `Content-Type: application/json` unless a content-type header (any case) is there.
 *
 * THE ANSWER (conn :503-586). A failure to reach the server: `Stream request failed: <message>`, retryable. A status outside
 * 200–299: `The stream endpoint returned HTTP <status>`, for good when it is a 4xx other than 408 and 429, retryable otherwise.
 * Otherwise the stream is OPEN (retries 0, Last Error cleared, `open`, On Open, the Connect's Done). No body: `The response
 * has no readable body; …`, for good. The body is read as it arrives, parsed into events (stream-parsers.ts `parseSseChunk`);
 * when it ENDS, a last event the server did not finish with a blank line is dispatched anyway, and then — with Reconnect On
 * Stream End — a reconnect is scheduled (no error, the retry count unmoved), otherwise `closed` (On Close). A body that FAILS
 * while it is read: `The event stream was interrupted: <message>`, retryable.
 *
 * AN EVENT (conn :849-870, sse :693-712). A `retry:` becomes the backoff's base from then on. An `id:` is the resume point
 * (Last Event Id) and marks the stream as one with ids; with Dedupe By Id on, an id seen in the last 512 is DROPPED — counted
 * in Duplicates Suppressed and told to nobody (nothing is sent). Otherwise Message Count, Last Message Time (the clock), then
 * Data (JSON when it is JSON, sse :696), Raw, Text (the field at Text Path, stream-parsers.ts `textForPath`), Event Type, and
 * On Message.
 *
 * A FAILURE (conn :902-931). Last Error, then On Error (with Last Error, Retry Count and Duplicates Suppressed sent as they are
 * at that moment — before the count moves). For good, Auto Reconnect off, or (Max Retries > 0) the retries spent — the last
 * with Last Error `<message> (gave up after <n> attempts)` and On Error AGAIN: `error`, On Close, a pending Connect `Failure`
 * (`sse/connect-failed`). Otherwise the transport closes, the retry count goes up, and a reconnect is scheduled.
 *
 * THE RECONNECT (conn :933-947). The base is the server's `retry:` when it sent one, else Reconnect Delay; doubled per
 * consecutive failure past the first, capped at Max Reconnect Delay (`backoffDelay`, no jitter). The state becomes
 * `reconnecting` — told only when it was not already. When the timer fires the transport opens again, sending the resume
 * point; nothing is told until the answer.
 *
 * WHAT IS SENT. The connection's state goes to the node only through `onState` (sse :663-691), which sends Connection State,
 * Connected and Retry Count; an event sends the eight data and count outputs; a failure sends Last Error, Retry Count and
 * Duplicates Suppressed. v2 (row C56 ruled "Send them when they change"): an open also sends the Last Error it cleared, a
 * failure that schedules a retry sends Retry Count once it has gone up (`onRetry`), and a suppressed duplicate sends its
 * count (`onDuplicate`) — v1 sent none of the three, so the wire held stale values. v3 (row C58 ruled "Say idle, as
 * WebSocket does"): a URL change that does not reopen (Auto Connect off) sets the state `idle` and sends the three state
 * outputs — v2's silent teardown left Connected true and Connection State `open` with no stream.
 *
 * NOT GRADED HERE, named:
 *   - With Credentials (conn :459): a `fetch` init's `credentials`, which the world's request record does not carry — the
 *     world's server is not across an origin. Stored and handed on, unobservable.
 *   - the EventSource transport's own behaviour (conn :265-373): no play has an `EventSource` — not played yet.
 *   - `_onNodeDeleted` (sse :721-729): no play deletes a node.
 *
 * ROW C57 (fixed in P109 ISL-026, ruled "Turn them into text"): Event Types and Method are read as `String(value)` on both
 * targets; the runtime once kept a value that was not text and threw on Connect calling `.split` / `.toUpperCase` on it.
 */

import { canonicalKey } from '../canonical';
import { defineNode, said, type SpecRequest, type WorldView } from '../spec';
import type { Answer, StreamChunk } from '../world';
import { parseJsonOrText, parseSseChunk, textForPath, type SseFrame } from './stream-parsers';

/** sse :33 */
export const SSE_ERROR_CONNECT_FAILED = 'sse/connect-failed';
/** conn :73 */
const DEFAULT_DEDUPE_WINDOW = 512;

/** What a connection copies from the inputs when it is made (sse :619-642). */
type Options = {
  url: string;
  transport: string;
  method: string;
  headers: Readonly<Record<string, unknown>> | undefined;
  body: unknown;
  eventTypes: readonly string[];
  autoReconnect: boolean;
  reconnectOnStreamEnd: boolean;
  reconnectDelay: number;
  maxReconnectDelay: number;
  maxRetries: number;
  dedupeById: boolean;
};

/** The fetch transport in flight (`FetchStreamTransport`): its request, and the text read but not yet a whole event. */
type Transport = { request: string; buffer: string };

/** One connection (`SseConnection`). */
type Conn = {
  opts: Options;
  state: string;
  retryCount: number;
  lastError: string;
  lastEventId: string;
  messageCount: number;
  duplicatesSuppressed: number;
  lastMessageTime: number;
  serverRetryMs: number | undefined;
  sawEventIds: boolean;
  /** `RecentIds` — oldest first, at most 512 */
  recentIds: readonly string[];
  transport: Transport | undefined;
  reconnect: string | undefined;
};

type SseState = {
  // the inputs, as their setters store them (sse :75-101)
  url: string;
  transport: string;
  method: string;
  headers: Readonly<Record<string, unknown>> | null;
  body: unknown;
  withCredentials: boolean;
  eventTypes: string;
  textPath: string;
  autoConnect: boolean;
  autoReconnect: boolean;
  reconnectOnStreamEnd: boolean;
  reconnectDelay: number;
  maxReconnectDelay: number;
  maxRetries: number;
  dedupeById: boolean;
  /** `_internal.connection` — never a disposed one (`teardownConnection` drops it, sse :656-661) */
  conn: Conn | undefined;
  /** `_internal.connectionState` — the node's, set only by `onState` */
  connectionState: string;
  data: unknown;
  raw: string;
  eventType: string;
  /** `_internal.autoConnectScheduled` */
  scheduled: boolean;
  /** a Connect invocation is waiting (`_internal.pendingConnect`) */
  pendingConnect: boolean;
  /** `_internal.connectedUrl` — set by every connect (sse :617) */
  connectedUrl: string | undefined;
  /** the spec's counter for request ids and timer tags */
  nextId: number;
};

/** conn :83-90 — base doubled per attempt, capped; no jitter */
function backoffDelay(attempt: number, base: number, max: number): number {
  const b = base > 0 ? base : 1000;
  const m = max > 0 ? max : 30000;
  const n = attempt > 0 ? attempt : 0;
  if (n > 30) return m;
  return Math.min(m, b * Math.pow(2, n));
}

/** conn :616-620 */
function hasHeaderNamed(headers: Readonly<Record<string, string>>, name: string): boolean {
  const lower = name.toLowerCase();
  for (const key in headers) if (key.toLowerCase() === lower) return true;
  return false;
}

/** conn :759 — a stream there is to stop: a request in flight, or one about to be made (connecting, or a retry timer waiting) */
function activeStream(c: Conn): boolean {
  return c.transport !== undefined || c.state === 'connecting' || c.state === 'reconnecting';
}

/** conn :712-715 */
function deliverySemantics(c: Conn | undefined): string {
  if (!c || !c.sawEventIds) return 'at-most-once';
  return c.opts.dedupeById === false ? 'at-least-once' : 'at-least-once-deduped';
}

const STATE_SENDS = ['connectionState', 'connected', 'retryCount'] as const;
const FRAME_SENDS = ['data', 'raw', 'text', 'eventType', 'lastEventId', 'messageCount', 'lastMessageTime', 'deliverySemantics'] as const;
const ERROR_SENDS = ['lastError', 'retryCount', 'duplicatesSuppressed'] as const;

type Settle = { outcome: 'done' | 'unchanged' | 'failure'; error?: string };

/** One call into the node, run on a working copy and handed back as a patch (as websocket.ts's `Run`), every send made at the moment the runtime flags it. */
class Run {
  readonly s: { -readonly [K in keyof SseState]: SseState[K] };
  private readonly emitted: string[] = [];
  private readonly after: Array<{ ms: unknown; tag: string }> = [];
  private readonly cancelled: string[] = [];
  private readonly aborted: string[] = [];
  private request: SpecRequest | undefined;
  readonly settled: Settle[] = [];
  own: { pending: boolean; settled?: Settle } = { pending: false };

  constructor(
    private readonly before: SseState,
    private readonly w: WorldView
  ) {
    const c = before.conn;
    this.s = { ...before, conn: c ? { ...c, recentIds: [...c.recentIds], transport: c.transport ? { ...c.transport } : undefined } : undefined };
  }

  private id(prefix: string): string {
    return prefix + this.s.nextId++;
  }

  private get c(): Conn {
    return this.s.conn as Conn;
  }

  private send(ports: readonly string[]): void {
    for (const p of ports) this.w.send(p, this.s);
  }

  private emit(port: string): void {
    this.emitted.push(port);
  }

  // -- the node (sse) ------------------------------------------------------------------------------------------------------

  /** sse :595-601 */
  settleConnect(outcome: Settle['outcome'], error?: string): void {
    if (!this.s.pendingConnect) return;
    this.s.pendingConnect = false;
    const settle: Settle = error === undefined ? { outcome } : { outcome, error };
    if (this.own.pending) this.own = { pending: false, settled: settle };
    else this.settled.push(settle);
  }

  /** sse :559-585 — the frame end's pass */
  autoConnectPass(): void {
    if (this.s.conn) {
      if (this.s.connectedUrl === this.s.url) return;
      this.settleConnect('unchanged');
      this.teardownConnection();
      if (this.s.autoConnect && this.s.url) this.doConnect(false);
      else {
        // v3 (row C58 ruled "Say idle, as WebSocket does"): nothing reopens, so the state is idle and the three are sent
        this.s.connectionState = 'idle';
        this.send(STATE_SENDS);
      }
      return;
    }
    if (!this.s.autoConnect || !this.s.url) return;
    this.doConnect(false);
  }

  /** sse :603-647 — `token`: an author's Connect started this */
  doConnect(token: boolean): void {
    this.settleConnect('unchanged');
    this.s.pendingConnect = token;
    if (token) this.own = { pending: true };
    this.teardownConnection();
    this.s.connectedUrl = this.s.url;
    const s = this.s;
    this.s.conn = {
      opts: {
        url: s.url,
        transport: s.transport,
        method: s.method,
        headers: s.headers || undefined,
        body: s.body,
        // row C57 — the runtime calls `.split` on whatever the setter kept (`value || ''`) and throws for a number; the spec reads it as text
        eventTypes: s.eventTypes
          ? String(s.eventTypes)
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        autoReconnect: s.autoReconnect,
        reconnectOnStreamEnd: s.reconnectOnStreamEnd,
        reconnectDelay: s.reconnectDelay,
        maxReconnectDelay: s.maxReconnectDelay,
        maxRetries: s.maxRetries,
        dedupeById: s.dedupeById
      },
      state: 'idle',
      retryCount: 0,
      lastError: '',
      lastEventId: '',
      messageCount: 0,
      duplicatesSuppressed: 0,
      lastMessageTime: 0,
      serverRetryMs: undefined,
      sawEventIds: false,
      recentIds: [],
      transport: undefined,
      reconnect: undefined
    };
    this.connect();
  }

  /** sse :656-661 + conn :769-774 — silent */
  private teardownConnection(): void {
    if (!this.s.conn) return;
    this.clearReconnectTimer();
    this.closeTransport();
    this.s.conn = undefined;
  }

  /** sse :663-691 — the connection's state, told */
  private onState(state: string): void {
    this.s.connectionState = state;
    this.send(STATE_SENDS);
    if (state === 'open') this.send(['lastError']); // v2 (row C56): the cleared Last Error, told at the open
    if (state === 'open') this.emit('onOpen');
    if (state === 'closed' || state === 'error') this.emit('onClose');
    if (state === 'open') this.settleConnect('done');
    if (state === 'error') this.settleConnect('failure', SSE_ERROR_CONNECT_FAILED);
  }

  /** sse :693-712 */
  private onFrame(frame: SseFrame): void {
    this.s.raw = frame.data;
    this.s.data = parseJsonOrText(frame.data);
    this.s.eventType = frame.event;
    this.send(FRAME_SENDS);
    this.emit('onMessage');
  }

  /** sse :714-719 */
  private onError(): void {
    this.send(ERROR_SENDS);
    this.emit('onError');
  }

  // -- the connection (conn) -----------------------------------------------------------------------------------------------

  /** conn :729-745 */
  private connect(): void {
    this.clearReconnectTimer();
    this.closeTransport();
    if (!this.c.opts.url) return this.fail('No URL was set on the stream', true);
    this.c.retryCount = 0;
    this.c.lastError = '';
    this.setState('connecting');
    this.openTransport();
  }

  /** conn :756-763 — whether there was a stream to stop */
  disconnect(): boolean {
    const c = this.c;
    this.clearReconnectTimer();
    const wasActive = activeStream(c);
    this.closeTransport();
    if (wasActive || c.state !== 'closed') this.setState('closed');
    return wasActive;
  }

  /** conn :782-821 — `fetch` unless the author asked for an EventSource, which no play has (conn :300-303) */
  private openTransport(): void {
    const c = this.c;
    if (c.opts.transport === 'eventsource') return this.fail('EventSource is not available in this environment', true);
    // conn :439-478 — the request as FetchStreamTransport builds it
    // row C57 — the runtime's `.toUpperCase()` throws for a method the setter kept that is not text; the spec reads it as text
    const method = String(c.opts.method).toUpperCase();
    const headers: Record<string, string> = { Accept: 'text/event-stream', 'Cache-Control': 'no-store' };
    const extra = c.opts.headers ?? {};
    for (const key in extra) if (extra[key] !== undefined && extra[key] !== null) headers[key] = String(extra[key]);
    if (c.lastEventId) headers['Last-Event-ID'] = c.lastEventId;
    let body: string | undefined;
    const b = c.opts.body;
    if (b !== undefined && b !== null && method !== 'GET' && method !== 'HEAD') {
      if (typeof b === 'string') body = b;
      else {
        body = JSON.stringify(b);
        if (!hasHeaderNamed(headers, 'content-type')) headers['Content-Type'] = 'application/json';
      }
    }
    const id = this.id('request:');
    this.request = body === undefined ? { id, method, url: c.opts.url, headers } : { id, method, url: c.opts.url, headers, body };
    c.transport = { request: id, buffer: '' };
  }

  /** conn :823-827 + :588-613 — the request aborted (an answer or a body still coming is dropped) */
  private closeTransport(): void {
    const c = this.s.conn;
    if (!c || !c.transport) return;
    this.aborted.push(c.transport.request);
    c.transport = undefined;
  }

  private clearReconnectTimer(): void {
    const c = this.s.conn;
    if (c && c.reconnect !== undefined) {
      this.cancelled.push(c.reconnect);
      c.reconnect = undefined;
    }
  }

  /** conn :836-840 — told only when it moves */
  private setState(state: string): void {
    if (this.c.state === state) return;
    this.c.state = state;
    this.onState(state);
  }

  /** conn :842-847 */
  private onOpen(): void {
    this.c.retryCount = 0;
    this.c.lastError = '';
    this.setState('open');
  }

  /** conn :849-870 */
  private onFrameArrived(frame: SseFrame): void {
    const c = this.c;
    if (frame.retry !== undefined) c.serverRetryMs = frame.retry;
    if (frame.id) {
      c.sawEventIds = true;
      c.lastEventId = frame.id;
      if (c.opts.dedupeById !== false) {
        if (c.recentIds.includes(frame.id)) {
          c.duplicatesSuppressed++;
          this.send(['duplicatesSuppressed']); // v2 (row C56): `onDuplicate` — sent as it counts
          return;
        }
        const ids = [...c.recentIds, frame.id];
        c.recentIds = ids.length > DEFAULT_DEDUPE_WINDOW ? ids.slice(1) : ids;
      }
    }
    c.messageCount++;
    c.lastMessageTime = this.w.now();
    this.onFrame(frame);
  }

  /** conn :872-883 */
  private onEnd(): void {
    this.closeTransport();
    if (this.c.opts.reconnectOnStreamEnd) return this.scheduleReconnect();
    this.setState('closed');
  }

  /** conn :902-931 */
  private fail(message: string, fatal: boolean): void {
    const c = this.c;
    this.report(message);
    if (fatal || c.opts.autoReconnect === false) {
      this.closeTransport();
      this.setState('error');
      return;
    }
    const max = c.opts.maxRetries || 0;
    if (max > 0 && c.retryCount >= max) {
      this.closeTransport();
      c.lastError = message + ' (gave up after ' + max + ' attempts)';
      this.onError();
      this.setState('error');
      return;
    }
    this.closeTransport();
    c.retryCount++;
    this.send(['retryCount']); // v2 (row C56): `onRetry` — the count, current, before the reconnect is scheduled
    this.scheduleReconnect();
  }

  /** conn :933-947 */
  private scheduleReconnect(): void {
    const c = this.c;
    this.clearReconnectTimer();
    const base = c.serverRetryMs !== undefined ? c.serverRetryMs : c.opts.reconnectDelay;
    const delay = backoffDelay(c.retryCount - 1 > 0 ? c.retryCount - 1 : 0, base, c.opts.maxReconnectDelay);
    this.setState('reconnecting');
    const tag = this.id('reconnect:');
    c.reconnect = tag;
    this.after.push({ ms: delay, tag });
  }

  /** conn :949-952 */
  private report(message: string): void {
    this.c.lastError = message;
    this.onError();
  }

  /** conn :942-946 — the reconnect timer fired */
  reconnectFired(tag: string): void {
    const c = this.s.conn;
    if (!c || c.reconnect !== tag) return;
    c.reconnect = undefined;
    this.openTransport();
  }

  // -- what the world hands back (the fetch transport, conn :495-586) ------------------------------------------------------

  private current(request: string): boolean {
    return !!this.s.conn && this.s.conn.transport?.request === request;
  }

  /** :495-500 — the request's own failure (an abort is ignored) */
  answerFailed(request: string, message: string): void {
    if (!this.current(request)) return;
    this.fail('Stream request failed: ' + message, false);
  }

  /** :503-527 */
  head(request: string, status: number, body: string | null, streams: boolean): void {
    if (!this.current(request)) return;
    if (status < 200 || status >= 300) {
      const fatal = status >= 400 && status < 500 && status !== 408 && status !== 429;
      return this.fail('The stream endpoint returned HTTP ' + status, fatal);
    }
    this.onOpen();
    // the Fetch standard's null-body statuses carry no body however the server answered (world.ts `worldFetch`)
    if ((body === null && !streams) || status === 204 || status === 205) return this.fail('The response has no readable body; this environment cannot stream fetch responses', true);
    // a body that is all there already reads as one piece and then the end
    if (!streams) {
      this.chunk(request, body as string);
      this.end(request);
    }
  }

  /** :532-543 */
  chunk(request: string, text: string): void {
    if (!this.current(request) || !text) return;
    const t = this.c.transport as Transport;
    const { frames, rest } = parseSseChunk(t.buffer + text);
    t.buffer = rest;
    for (const frame of frames) {
      if (!this.current(request)) return;
      this.onFrameArrived(frame);
    }
  }

  /** :571-585 */
  end(request: string): void {
    if (!this.current(request)) return;
    const t = this.c.transport as Transport;
    if (t.buffer.trim() !== '') {
      for (const frame of parseSseChunk(t.buffer + '\n\n').frames) {
        if (!this.current(request)) return;
        this.onFrameArrived(frame);
      }
    }
    this.onEnd();
  }

  /** :565-568 — a body that failed while it was read (an abort is ignored) */
  interrupted(request: string, name: string, message: string): void {
    if (!this.current(request) || name === 'AbortError') return;
    this.fail('The event stream was interrupted: ' + message, false);
  }

  // -- the patch -----------------------------------------------------------------------------------------------------------

  patch() {
    const set: Record<string, unknown> = {};
    for (const key of Object.keys(this.s) as Array<keyof SseState>) {
      if (canonicalKey(this.s[key]) !== canonicalKey(this.before[key])) set[key] = this.s[key];
    }
    return {
      set: set as Partial<SseState>,
      emit: this.emitted as never[],
      send: [] as never[],
      ...(this.after.length > 0 ? { after: this.after } : {}),
      ...(this.cancelled.length > 0 ? { cancel: this.cancelled } : {}),
      ...(this.request ? { request: this.request } : {}),
      ...(this.aborted.length > 0 ? { abort: this.aborted } : {})
    };
  }

  handlerPatch() {
    const p = this.patch();
    return this.settled.length > 0 ? { ...p, outcomes: this.settled.map((o) => ({ port: 'connect' as const, ...o })) } : p;
  }
}

// ------------------------------------------------------------------------------------------------
// what a sequence plays with

/**
 * An agent-style stream, one piece at every doubling of the clock from 1 ms to 16 s after the head: plain data, JSON with ids
 * (one of them a replay), a named event, an event split across two pieces, a comment, a server `retry:`, a sentinel, an event
 * with no blank line before the end (`tail`).
 */
const PIECES: readonly string[] = [
  'data: hello\n\n',
  'id: 1\ndata: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
  'event: token\ndata: {"delta":"x"}\n\n',
  'data: par',
  'tial\n\n',
  ': keep-alive\n\n',
  'retry: 5\nid: 2\ndata: 42\n\n',
  'id: 1\ndata: replayed\n\n',
  'data: line one\ndata: line two\r\n\r\n',
  'data: [DONE]\n\n',
  'data: null\n\n',
  'event: done\ndata: tail'
];
const streamed = (from: number, to: number, last?: { end: true } | { error: string }): StreamChunk[] => [
  ...PIECES.slice(from, to).map((text, k) => ({ at: 2 ** k, text })),
  ...(last ? [{ at: 2 ** (to - from), ...last }] : [])
];

/** The answers a sequence plays with (one rule answers every request of the sequence, so a reconnect is answered alike). */
const STREAMING: readonly Answer[] = [
  { status: 200, headers: { 'content-type': 'text/event-stream' }, chunks: streamed(0, 12, { end: true }) },
  { status: 200, chunks: streamed(0, 8) },
  { status: 200, chunks: streamed(3, 12, { error: 'terminated' }) }
];
/** One rule answers every request of a sequence; the streams are weighted three times (s34 reach: events were seen in 20 of 400). */
const RESPONSES: readonly Answer[] = [
  ...STREAMING,
  ...STREAMING,
  ...STREAMING,
  { status: 200, body: 'id: 7\ndata: one\n\nevent: last\ndata: two' },
  { status: 200, body: 'data: {"delta":"a"}\n\n' },
  { status: 500, body: 'oops' },
  { status: 503 },
  { status: 404, body: 'missing' },
  { status: 429 },
  { status: 200 },
  { status: 204 },
  { error: 'Failed to fetch' },
  { never: true }
];

export const ServerSentEvents = defineNode({
  type: 'net.noodl.SSE',
  // v2 (P109 ISL-030, row C56 ruled "Send them when they change"): Last Error at an open, Retry Count once it moved, and
  // Duplicates Suppressed as it counts are sent; v1 left all three stale on the wire.
  // v3 (P109 ISL-030, row C58 ruled "Say idle, as WebSocket does"): a URL change that does not reopen says idle.
  version: 3,
  source: 'packages/noodl-runtime/src/nodes/std-library/agent/sse.ts; agent/sse-connection.ts; agent/stream-parsers.ts',
  needs: ['network', 'clock'],
  worldPool: { responses: RESPONSES, delays: [0, 0, 0, 3], advances: [0, 1, 1, 2, 3, 5, 10, 50, 100, 1000, 5000, 30000] },

  state: {
    url: '',
    transport: 'auto',
    method: 'GET',
    headers: null,
    body: undefined,
    withCredentials: false,
    eventTypes: '',
    textPath: '',
    autoConnect: false,
    autoReconnect: true,
    reconnectOnStreamEnd: false,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    maxRetries: 0,
    dedupeById: true,
    conn: undefined,
    connectionState: 'idle',
    data: undefined,
    raw: '',
    eventType: '',
    scheduled: false,
    pendingConnect: false,
    connectedUrl: undefined,
    nextId: 1
  } as SseState,

  // sse :425-432
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // sse :128-322
    url: {
      type: 'string',
      coerce: 'none',
      displayName: 'URL',
      group: 'Connection',
      description: 'Endpoint to stream from; changing it while connected reconnects to the new one',
      examples: ['https://api.example/stream', 'https://api.example/stream', 'https://api.example/other', '', undefined]
    },
    transport: {
      type: 'enum',
      coerce: 'none',
      enums: ['auto', 'fetch', 'eventsource'],
      default: 'auto',
      displayName: 'Transport',
      group: 'Connection',
      description: 'How the stream is fetched: Fetch carries headers and a body, EventSource lets the browser handle reconnection, Auto prefers Fetch',
      examples: ['auto', 'fetch']
    },
    method: {
      type: 'enum',
      coerce: 'none',
      enums: ['GET', 'POST', 'PUT', 'PATCH'],
      default: 'GET',
      displayName: 'Method',
      group: 'Request',
      description: 'HTTP method for the request; anything other than GET needs the Fetch transport',
      examples: ['GET', 'POST', 'post']
    },
    headers: {
      type: 'object',
      // node.ts — an object port parses a JSON string before the setter sees it
      coerce: 'object-literal',
      displayName: 'Headers',
      group: 'Request',
      description: 'Request headers as an object, for bearer tokens and the like; ignored by the EventSource transport, which cannot set them',
      examples: [{ Authorization: 'Bearer t' }, { 'content-type': 'text/plain', 'X-N': 3, skip: null }, { Accept: 'application/json' }]
    },
    body: {
      type: '*',
      coerce: 'none',
      displayName: 'Body',
      group: 'Request',
      description: 'Request body, sent as JSON unless it is already a string; ignored for GET and HEAD',
      examples: [{ prompt: 'hi' }, 'raw text', [1, 2]]
    },
    withCredentials: {
      type: 'boolean',
      coerce: 'none',
      default: false,
      displayName: 'With Credentials',
      group: 'Request',
      description: 'Sends cookies and HTTP auth to a cross-origin endpoint, which the server must also allow',
      examples: [true, false]
    },
    eventTypes: {
      type: 'string',
      coerce: 'none',
      displayName: 'Event Types',
      group: 'Connection',
      description: 'Comma-separated named event types to subscribe to; only needed for the EventSource transport, as Fetch delivers every type',
      examples: ['', 'token, done']
    },
    textPath: {
      type: 'string',
      coerce: 'none',
      displayName: 'Text Path',
      group: 'Data',
      description: 'Where the text lives inside a JSON payload, as a dot path such as choices.0.delta.content; leave blank for a stream of bare text',
      examples: ['', 'choices.0.delta.content', 'delta', 'choices[0].delta', '__proto__']
    },
    autoConnect: { type: 'boolean', coerce: 'none', default: false, displayName: 'Auto Connect', group: 'Connection', description: 'Opens the stream as soon as a URL is available, without waiting for a Connect signal', examples: [true, true, false] },
    autoReconnect: {
      type: 'boolean',
      coerce: 'none',
      default: true,
      displayName: 'Auto Reconnect',
      group: 'Reconnection',
      description: 'Retries after a failure with a growing backoff; turning it off reports the failure and stops',
      examples: [true, false]
    },
    reconnectOnStreamEnd: {
      type: 'boolean',
      coerce: 'none',
      default: false,
      displayName: 'Reconnect On Stream End',
      group: 'Reconnection',
      description: 'Reconnects when the server closes the stream cleanly; off by default because reconnecting an agent stream re-issues the request',
      examples: [true, false]
    },
    reconnectDelay: {
      type: 'number',
      coerce: 'none',
      default: 1000,
      displayName: 'Reconnect Delay (ms)',
      group: 'Reconnection',
      description: 'First retry delay in milliseconds, doubling per consecutive failure up to Max Reconnect Delay',
      examples: [1000, 10, 3, 0]
    },
    maxReconnectDelay: {
      type: 'number',
      coerce: 'none',
      default: 30000,
      displayName: 'Max Reconnect Delay (ms)',
      group: 'Reconnection',
      description: 'Ceiling on the backoff in milliseconds, however many failures there have been',
      examples: [30000, 20]
    },
    maxRetries: {
      type: 'number',
      coerce: 'none',
      default: 0,
      displayName: 'Max Retries',
      group: 'Reconnection',
      description: 'Consecutive failures allowed before the connection gives up and reports an error; 0 keeps retrying',
      examples: [0, 1, 2, 3]
    },
    dedupeById: {
      type: 'boolean',
      coerce: 'none',
      default: true,
      displayName: 'Dedupe By Id',
      group: 'Reconnection',
      description: 'Drops events whose id has already been seen, so a reconnect that resumes cannot re-deliver messages',
      examples: [true, false]
    },
    connect: { type: 'signal', outcome: true, displayName: 'Connect', group: 'Actions', description: 'Opens the stream, replacing any connection already open and resetting the retry count' },
    disconnect: { type: 'signal', outcome: true, displayName: 'Disconnect', group: 'Actions', description: 'Closes the stream and stops retrying' }
  },

  outputs: {
    // sse :354-415
    connectionState: { type: 'string', displayName: 'Connection State', group: 'Status', description: 'Where the connection is: idle, connecting, open, reconnecting, closed or error', from: (s) => s.connectionState },
    connected: { type: 'boolean', displayName: 'Connected', group: 'Status', description: 'True only while the stream is open and frames may arrive', from: (s) => s.connectionState === 'open' },
    lastError: { type: 'string', displayName: 'Last Error', group: 'Status', description: 'What went wrong most recently, including the reason a retry was scheduled', from: (s) => (s.conn ? s.conn.lastError : '') },
    retryCount: { type: 'number', displayName: 'Retry Count', group: 'Status', description: 'Consecutive failed attempts in the current outage; back to zero once the stream opens', from: (s) => (s.conn ? s.conn.retryCount : 0) },
    onOpen: { type: 'signal', displayName: 'On Open', group: 'Events', description: 'Fires when the stream has been established' },
    onMessage: { type: 'signal', displayName: 'On Message', group: 'Events', description: 'Fires once per event, after Data, Raw and Text already hold it' },
    onError: { type: 'signal', displayName: 'On Error', group: 'Events', description: 'Fires when the stream failed or dropped, whether or not a retry is going to follow' },
    onClose: { type: 'signal', displayName: 'On Close', group: 'Events', description: 'Fires when the stream has stopped for good, whether it ended cleanly or gave up' },
    // sse :435-531
    data: { type: '*', displayName: 'Data', group: 'Data', description: 'The event payload, parsed as JSON when it is JSON and handed over as text when it is not', from: (s) => s.data },
    raw: { type: 'string', displayName: 'Raw', group: 'Data', description: 'The event payload exactly as it arrived, before any parsing', from: (s) => s.raw },
    text: {
      type: 'string',
      displayName: 'Text',
      group: 'Data',
      description: 'The one data output guaranteed to be a string: Raw when no Text Path is set, the field at that path when one is, blank when it does not resolve',
      from: (s) => textForPath(s.raw, s.data, s.textPath)
    },
    eventType: { type: 'string', displayName: 'Event Type', group: 'Data', description: 'The event name the server sent, or message when it sent none', from: (s) => s.eventType },
    lastEventId: { type: 'string', displayName: 'Last Event Id', group: 'Data', description: 'The furthest id the server has reported, which is the point a reconnect resumes from', from: (s) => (s.conn ? s.conn.lastEventId : '') },
    messageCount: { type: 'number', displayName: 'Message Count', group: 'Status', description: 'How many events have been delivered on this connection, not counting suppressed duplicates', from: (s) => (s.conn ? s.conn.messageCount : 0) },
    lastMessageTime: {
      type: 'number',
      displayName: 'Last Message Time',
      group: 'Status',
      description: 'When the last event arrived, as milliseconds since the epoch; useful for spotting a stalled stream',
      from: (s) => (s.conn ? s.conn.lastMessageTime : 0)
    },
    duplicatesSuppressed: { type: 'number', displayName: 'Duplicates Suppressed', group: 'Status', description: 'How many replayed events Dedupe By Id has dropped on this connection', from: (s) => (s.conn ? s.conn.duplicatesSuppressed : 0) },
    deliverySemantics: {
      type: 'string',
      displayName: 'Delivery Semantics',
      group: 'Status',
      description: 'What this stream actually guarantees, derived from whether the server sends ids: at-most-once, at-least-once or at-least-once-deduped',
      from: (s) => deliverySemantics(s.conn)
    }
  }
}).on(
  {
    // NSP-018 (s77): every patch here is computed on a working copy (`Run`), so each is `said` — the words carry what the wire does.
    // sse :133-136, :244-247 — the two that schedule the frame end's pass
    url: (s, v, _i, w) =>
      said(
        'always: stored as text (nothing as empty); at the end of the frame a stream opened against another URL is dropped silently (a Connect still waiting: Unchanged) and reopened to this one when Auto Connect is on and it is not blank, else said idle (Connection State, Connected, Retry Count); with no stream, Auto Connect on and a URL: it connects; the URL the stream was opened against: left alone',
        store(s, w, { url: v === undefined || v === null ? '' : String(v), scheduled: true })
      ),
    autoConnect: (s, v, _i, w) =>
      said(
        'always: on or off, read at the end of the frame — on with a URL and no stream: it connects; a stream opened against another URL is dropped silently (a Connect still waiting: Unchanged) and reopened when on, said idle when off; a stream on the URL it holds is left alone either way, so off never closes one',
        store(s, w, { autoConnect: !!v, scheduled: true })
      ),
    // sse :153-322 — stored for the next connection
    transport: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open (nothing as Auto) — Auto and Fetch make a streaming request that carries Method, Headers and Body; EventSource asks the browser for one, which carries none of them and listens for Event Types, and where there is none that Connect fails for good (Last Error `EventSource is not available in this environment`)',
        store(s, w, { transport: (v as string) || 'auto' })
      ),
    method: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — the request\'s method, upper-cased (nothing as GET); with GET the Body stays home',
        store(s, w, { method: (v as string) || 'GET' })
      ),
    headers: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — an object\'s entries go on the request as text after Accept and Cache-Control (a null or undefined one skipped), and a content-type among them, any case, keeps the JSON one off; anything else: none; the EventSource transport carries none',
        store(s, w, { headers: v && typeof v === 'object' ? (v as Record<string, unknown>) : null })
      ),
    body: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — with a Method other than GET or HEAD a string goes as itself, anything else as JSON with Content-Type application/json unless Headers names one; nothing, or GET: no body; the EventSource transport carries none',
        store(s, w, { body: v })
      ),
    withCredentials: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — on, the request carries cookies and HTTP auth across origins (credentials include); off, same-origin only',
        store(s, w, { withCredentials: !!v })
      ),
    eventTypes: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open, as text (nothing as none) split on commas and trimmed — the named events the EventSource transport listens for beside message; the Fetch transport delivers every type whatever is here',
        store(s, w, { eventTypes: (v as string) || '' })
      ),
    autoReconnect: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — on, a failure that can be retried (the server unreachable, a 5xx, 408 or 429, a stream cut short) schedules a reconnect; off, it is reported and the stream stops: Last Error, On Error, Connection State error, On Close',
        store(s, w, { autoReconnect: !!v })
      ),
    reconnectOnStreamEnd: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — on, a stream the server ends cleanly is reopened after the backoff wait, no error told and the retry count unmoved; off, it is closed (Connection State closed, On Close); either way a last event the server did not finish with a blank line is delivered first',
        store(s, w, { reconnectOnStreamEnd: !!v })
      ),
    reconnectDelay: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — the first retry\'s wait in milliseconds, doubled per consecutive failure after the first and capped at Max Reconnect Delay; a `retry:` the server sends replaces it for the rest of that connection; 0, below, or not a number: 1000',
        store(s, w, { reconnectDelay: Number(v) > 0 ? Number(v) : 1000 })
      ),
    maxReconnectDelay: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — the ceiling on the retry wait in milliseconds, however many failures in a row; 0, below, or not a number: 30000',
        store(s, w, { maxReconnectDelay: Number(v) > 0 ? Number(v) : 30000 })
      ),
    maxRetries: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — above 0, that many retries are made and the failure after the last gives up: Last Error `… (gave up after n attempts)`, On Error again, Connection State error, On Close, a waiting Connect Failure; 0, below, or not a number: it retries for as long as Auto Reconnect is on',
        store(s, w, { maxRetries: Number(v) > 0 ? Number(v) : 0 })
      ),
    dedupeById: (s, v, _i, w) =>
      said(
        'always: read by the next connection, not one already open — on, an event whose id is among the last 512 seen on that connection is dropped: Duplicates Suppressed counts it (sent) and nothing else is told, though the resume point moves to it; off, every event is delivered and Delivery Semantics says at-least-once once ids are seen',
        store(s, w, { dedupeById: !!v })
      ),
    // sse :232-235 — and Text is sent at once
    textPath: (s, v, _i, w) => {
      const run = new Run(s, w);
      run.s.textPath = v === undefined || v === null ? '' : String(v);
      w.send('text', run.s);
      return said(
        'always: stored as text (nothing as empty) and Text is sent at once, re-read from the last event — the field at this dot path in Data when it is a string, number or boolean, Raw when the path is blank, empty when it does not resolve',
        run.patch()
      );
    },
    // sse :328-334 — the words are chosen by the inputs the connection is made from, as `connect()` and `openTransport()` read them
    connect: (s, _i, w) => {
      const run = new Run(s, w);
      const settles = s.pendingConnect ? [{ outcome: 'unchanged' as const }] : undefined;
      run.s.pendingConnect = false;
      run.doConnect(true);
      const own = run.own.settled;
      const p = run.patch();
      const patch = own ? { ...p, outcome: own.outcome, ...(own.error !== undefined ? { error: own.error } : {}), ...(settles ? { settles } : {}) } : { ...p, outcome: 'pending' as const, ...(settles ? { settles } : {}) };
      if (!s.url)
        return said(
          'no URL: a stream already open or retrying is dropped silently (its request abandoned, its timer cancelled; a Connect still waiting: Unchanged), then it fails for good — Last Error `No URL was set on the stream`, On Error, Connection State error (Connected false, Retry Count 0), On Close; Failure (sse/connect-failed)',
          patch
        );
      if (s.transport === 'eventsource')
        return said(
          'Transport EventSource: the old stream dropped silently (a Connect still waiting: Unchanged), Retry Count 0, Last Error cleared, Connection State connecting, then the browser\'s EventSource is asked for — none here, so it fails for good: Last Error `EventSource is not available in this environment`, On Error, Connection State error, On Close; Failure (sse/connect-failed)',
          patch
        );
      return said(
        'otherwise: the old stream dropped silently (its request abandoned, its timer cancelled; a Connect still waiting: Unchanged), Retry Count 0, Last Error cleared, Connection State connecting (Connected false), and a fresh request goes out — Method, Headers, Body, no Last-Event-ID (only a reconnect resumes); the answer settles it later: Connection State open, Last Error, On Open and Done at a 2xx with a body, else a failure (retried with Auto Reconnect unless it is a 4xx other than 408 and 429)',
        patch
      );
    },
    // sse :340-348 — the words are chosen as `disconnect()` decides: whether there was a stream to stop (conn :759)
    disconnect: (s, _i, w) => {
      const run = new Run(s, w);
      run.settleConnect('unchanged');
      if (run.s.conn) run.disconnect();
      const settles = run.settled.map((o) => ({ port: 'connect', ...o }));
      if (!s.conn) return said('no connection (none made yet, or the last dropped by a URL change): nothing is sent; Unchanged', { ...run.patch(), outcome: 'unchanged' as const, ...(settles.length > 0 ? { settles } : {}) });
      if (activeStream(s.conn))
        return said(
          'a stream open, connecting or waiting to retry: its request is abandoned and its timer cancelled, nothing more arrives, Connection State closed (Connected false), On Close; a Connect still waiting: Unchanged; Done',
          { ...run.patch(), outcome: 'done' as const, ...(settles.length > 0 ? { settles } : {}) }
        );
      if (s.conn.state !== 'closed')
        return said(
          'a connection that already failed for good: it is marked closed — Connection State closed, Connected, Retry Count, and On Close once more; Unchanged',
          { ...run.patch(), outcome: 'unchanged' as const, ...(settles.length > 0 ? { settles } : {}) }
        );
      return said('a connection already closed: nothing is sent; Unchanged', { ...run.patch(), outcome: 'unchanged' as const, ...(settles.length > 0 ? { settles } : {}) });
    }
  },
  {
    // sse :559-585
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const run = new Run(s, w);
      run.s.scheduled = false;
      run.autoConnectPass();
      return run.handlerPatch();
    },
    world: {
      timer: (s, _i, tag, w) => {
        const run = new Run(s, w);
        run.reconnectFired(tag);
        return run.handlerPatch();
      },
      response: (s, _i, res, w) => {
        const run = new Run(s, w);
        if ('aborted' in res) return run.handlerPatch();
        if ('error' in res) run.answerFailed(res.id, res.error.message);
        else run.head(res.id, res.status, res.body, !!res.stream);
        return run.handlerPatch();
      },
      stream: (s, _i, e, w) => {
        const run = new Run(s, w);
        if ('chunk' in e) run.chunk(e.id, e.chunk);
        else if ('end' in e) run.end(e.id);
        else run.interrupted(e.id, e.streamError.name, e.streamError.message);
        return run.handlerPatch();
      }
    }
  }
);

/** A setter that stores (sse :128-322). */
function store(s: Readonly<SseState>, w: WorldView, fields: Partial<SseState>) {
  const run = new Run(s, w);
  Object.assign(run.s, fields);
  return run.patch();
}
