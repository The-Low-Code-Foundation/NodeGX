---
title: "WebSocket"
---
Two-way WebSocket connection: send and receive text, JSON or binary, with connection state as graph outputs.

A bidirectional transport for agent chat, collaboration, telemetry and any other stream where the client also talks back. `url` plus `autoConnect` opens the socket; `Connect`/`Disconnect` do it by hand. `Send` transmits whatever is on `message` — a string goes as text, an object is JSON-serialized, an ArrayBuffer or typed array goes as a binary frame, and `messageType: binary` UTF-8 encodes text first. Received text is JSON-parsed onto `received` with the original on `receivedRaw`; binary arrives on `received` as an ArrayBuffer with `receivedIsBinary` true. Everything about the connection's health is an output rather than a console message: `connectionState` moves through idle → connecting → open → reconnecting → closed/error, `retryCount` counts attempts within the current outage, `lastError` says what went wrong, `closeCode`/`closeReason` carry the server's own explanation, and `queueSize`/`droppedCount` account for every message that has not reached the wire. Reconnection is exponential backoff from `reconnectDelay`, doubling to `maxReconnectDelay`, with jitter, stopping after `maxRetries` — or immediately for close codes where retrying is futile (1002, 1003, 1007–1010, 1015). Giving up sets `connectionState` to error and fires `onError`; it is never silent.

## When to use it

When the client needs to send as well as receive — chat with an agent, collaborative editing, live cursors, device control, order placement. If the server only pushes and the client never sends, Server-Sent Events is simpler and more firewall-friendly. This node is transport only: point it at your own endpoint, and use ordinary Object/Array/Function nodes to shape what flows through it. It is client-only, so it stays inert during server-side rendering and connects in the browser after hydration. ⚠️ **It is not the node for your project's own backend data.** NodeGX's built-in backend has no WebSocket server at all — realtime there is Server-Sent Events — and PocketBase, Parse and Supabase each speak something different again, so there is no URL to point this node at. Use **Subscribe To Changes**, which picks the transport from the backend's type and hides it.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.WebSocket` |
| Available in | browser, cloud |
| SSR compatibility | client-only — A WebSocket cannot be meaningfully opened during a server render and would leak a socket per request; the node connects in the browser after hydration. |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `autoConnect` | Boolean | `true` | Connect as soon as a URL is available, without waiting for a Connect signal |
| `autoReconnect` | Boolean | `true` | Retries after an unsolicited close with a growing backoff; turning it off reports the close as an error |
| `heartbeatInterval` | Number | `0` | Milliseconds between heartbeats while the socket is open; 0 disables it, and only enable it if your server expects the message |
| `heartbeatMessage` | String | `ping` | Application text sent as the heartbeat; it is not a protocol ping frame |
| `heartbeatReply` | String | `pong` | Exact text the server answers a heartbeat with; it is measured as Latency, hidden from On Message, and its absence is treated as a dead connection |
| `jitter` | Boolean | `true` | Spreads reconnect attempts randomly across the second half of each backoff window, so a fleet does not return in lockstep |
| `maxQueueSize` | Number | `100` | Messages the queue holds before further Sends are refused and counted as dropped; 0 or less is unlimited and can grow during a long outage |
| `maxReconnectDelay` | Number | `30000` | Ceiling on the backoff in milliseconds, however many attempts there have been |
| `maxRetries` | Number | `10` | Reconnect attempts allowed per outage; 0 disables retrying and a negative value means unlimited |
| `message` | * | — | Value to send; objects are JSON-serialised, and ArrayBuffers and typed arrays go as binary frames |
| `messageType` | Enum (`auto`, `text`, `binary`) | `auto` | Auto sends binary values as binary and everything else as text; Binary encodes text and objects as UTF-8 first |
| `protocols` | String | — | Comma-separated WebSocket subprotocols to offer during the handshake |
| `reconnectDelay` | Number | `1000` | First backoff delay in milliseconds; each further attempt doubles it up to Max Reconnect Delay |
| `url` | String | — | Endpoint to connect to, which must start with ws:// or wss://; changing it reconnects to the new one |
| `whenDisconnected` | Enum (`queue`, `drop`, `error`) | `queue` | What a Send does while the socket is not open: hold it in order, discard and count it, or also report an error |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `connect` | Signal | — | Opens the socket, replacing one already open without reporting a close |
| `disconnect` | Signal | — | Closes the socket and cancels any pending reconnect |
| `send` | Signal | — | Hands the current Message to the socket, or applies the When Disconnected policy |

### What each input does

**URL** (`url`)

- no connection yet: stored as text (nothing as blank); at the end of the frame one connects to it when Auto Connect is on and it is not blank — Connection State connecting, the Status outputs sent (a URL not starting with ws:// or wss:// fails at once instead: Connection State error, Last Error, On Error); with Auto Connect off it waits for a Connect
- the URL the connection was made with (its Protocols too): stored; nothing else, now or at the end of the frame — a closed or failed connection is not retried by setting its URL again
- a URL other than the connection's: stored; at the end of the frame that connection is dropped silently (its socket closed, its countdown and heartbeat stopped, no On Close; a Connect still waiting, or made before then against the old URL: Unchanged), the Status outputs sent, and a fresh one (Retry Count 0, Queue Size 0, Dropped 0) connects to this URL when it is not blank and Auto Connect is on or the old one was connecting, open or reconnecting — Connection State connecting (not starting with ws:// or wss://: error, Last Error, On Error); otherwise idle

**Auto Connect** (`autoConnect`)

- on or off, with a connection (open, closed or failed alike): held for the next URL or Protocols change, after which the new one connects when this is on; nothing now or at the end of the frame — off closes nothing, on reopens nothing
- on, with no connection yet: at the end of the frame one connects when the URL is not blank — Connection State connecting, the Status outputs sent (a URL not starting with ws:// or wss://: error, Last Error, On Error); a blank URL: idle until one arrives
- off, with no connection yet: nothing — it waits for a Connect

**Protocols** (`protocols`)

- no connection yet: split on commas and trimmed (blank or not text: none), offered at the handshake when a connection is made — at the end of the frame when Auto Connect is on and there is a URL, else at the next Connect
- the list the connection was made with (its URL too): stored; nothing else, now or at the end of the frame
- a list other than the connection's: stored; at the end of the frame that connection is dropped silently (no On Close; a Connect still waiting: Unchanged), the Status outputs sent, and a fresh one offering these connects when the URL is not blank and Auto Connect is on or the old one was connecting, open or reconnecting — Connection State connecting; otherwise idle

**Auto Reconnect** (`autoReconnect`)

- on or off: onto the connection at once, read at its next unsolicited close — on, the drop is retried after the backoff wait (Connection State reconnecting, Last Error says when, On Close); off, it is final: a goodbye (1000 or 1001) is Connection State closed and On Close, anything else error, Last Error, On Error and On Close; a reconnect already counting down still fires either way

**Reconnect Delay (ms)** (`reconnectDelay`)

- always: onto the connection at once, read when the next backoff is drawn — the first retry of an outage waits this many milliseconds, each later one twice the last, capped at Max Reconnect Delay (ms); 0, below, or not a number: 1000; a wait already counting down keeps its length

**Max Reconnect Delay (ms)** (`maxReconnectDelay`)

- always: onto the connection at once, read when the next backoff is drawn — the ceiling on the wait in milliseconds, however many retries; 0, below, or not a number: 30000

**Max Retries** (`maxRetries`)

- always: onto the connection at once, read at its next unsolicited close — Retry Count (the retries so far in this outage) below it: one more; at it: gives up — Connection State error, Last Error `… gave up after n reconnect attempts`, On Error, On Close (a waiting Connect: Failure); 0, or not a number: no retry; below 0: unlimited; a close code retrying cannot help (1002, 1003, 1007 to 1010, 1015) gives up whatever this is

**Backoff Jitter** (`jitter`)

- on or off: onto the connection at once, read when the next backoff is drawn — on, the wait is scaled by a random draw into its second half (from half of it to all of it); off, the whole wait exactly

**Heartbeat Interval (ms)** (`heartbeatInterval`)

- a different interval while the socket is open: the heartbeat restarts now — a reply still awaited is forgotten, and the Heartbeat Message goes this many milliseconds from now, then every interval; 0, below, or not a number: the heartbeat stops
- the same interval, or no open socket: read when the socket next opens — above 0, the Heartbeat Message is sent every this many milliseconds (not On Message Sent) and the Heartbeat Reply swallowed; 0, below, or not a number: no heartbeat, and a Heartbeat Reply arriving is an ordinary message

**Heartbeat Message** (`heartbeatMessage`)

- always: onto the connection at once (not text: blank), read at the next beat — the text sent as the heartbeat, not On Message Sent; blank: no beat is sent and no reply awaited, so no connection is declared dead

**Heartbeat Reply** (`heartbeatReply`)

- always: onto the connection at once (not text: blank), read at the next beat and the next message — while a heartbeat runs, a message equal to it is swallowed instead of On Message and, when a beat was awaiting it, measured as Latency (ms) (the Status outputs sent); a beat still unanswered when the next is due is a dead connection: Last Error, On Error, then handled as a 1006 close; blank: nothing is awaited

**Message** (`message`)

- always: held for the next Send (nothing or null fails it)

**Message Type** (`messageType`)

- always: onto the connection at once (nothing as Auto), read at the next send — Binary encodes text, and an object's JSON, as UTF-8 bytes; Auto and Text send them as text; a buffer or typed array goes as bytes whatever this says

**When Disconnected** (`whenDisconnected`)

- always: onto the connection at once (nothing as Queue), read by the next Send while the socket is not open — Queue holds it in order (Done; sent at the next open), Drop discards it and counts it in Dropped (Unchanged), Report Error counts it and fails (Last Error, On Error, Failure websocket/not-connected); messages already queued stay queued

**Max Queue Size** (`maxQueueSize`)

- always: onto the connection at once, read by the next Send that would queue — above 0, a queue already this long refuses it: Dropped, Last Error, On Error, Failure websocket/queue-full; 0, below, or not a number: no limit; a queue already longer than a new limit keeps what it holds

**Connect** (`connect`)

- a blank URL: any socket held is closed quietly and the countdown and heartbeat stopped (a Connect still waiting: Unchanged), then it fails at once — Connection State error, Last Error `URL is required to connect`, Retry Count 0, the Status outputs sent, On Error; Failure (websocket/connect-failed)
- a URL not starting with ws:// or wss://: any socket held is closed quietly (a Connect still waiting: Unchanged), then it fails at once — Connection State error, Last Error `URL must start with ws:// or wss://`, Retry Count 0, the Status outputs sent, On Error; Failure (websocket/connect-failed)
- a URL the browser refuses to open: any socket held is closed quietly (a Connect still waiting: Unchanged), Connection State connecting, then error at once — Last Error `Could not open WebSocket: …`, Retry Count 0, the Status outputs sent, On Error; Failure (websocket/connect-failed)
- a URL starting with ws:// or wss:// (the connection's own: one changed this frame is taken at the frame's end, which then supersedes this): any socket held is closed quietly, the countdown and heartbeat stopped (a Connect still waiting: Unchanged), Retry Count 0, Close Code 0, Connection State connecting (Connected false), the Status outputs sent, and a socket is made with the URL trimmed and the Protocols; settled later — Done when it opens (On Open, however many retried drops lie between), Failure (websocket/connect-failed) when the connection fails or gives up, Unchanged when a later Connect, a Disconnect or a URL change supersedes it

**Disconnect** (`disconnect`)

- no connection was ever made: nothing is sent (a Connect still waiting: Unchanged); Unchanged
- a socket held, or a connection connecting, open or reconnecting: the socket is closed (1000 `Client disconnect`), the countdown and heartbeat stopped, nothing more arrives — Connection State closed, Connected false, Retry Count 0, Close Code 1000, Close Reason `Client disconnect`, the Status outputs sent, On Close (a Connect still waiting: Unchanged); Done
- a connection idle, closed or failed, holding no socket: Connection State closed, Retry Count 0, Close Code 1000, Close Reason `Client disconnect` (Last Error kept), the Status outputs sent, no On Close; Unchanged

**Send** (`send`)

- Message empty (nothing or null), whatever the socket is doing: Last Error `Nothing to send: the Message input is empty`, the Status outputs sent, On Error; Failure (websocket/nothing-to-send)
- the socket not open (idle, connecting, reconnecting, closed or failed), When Disconnected Report Error: Dropped counts it, Last Error `Cannot send: the connection is not open`, the Status outputs sent, On Error; Failure (websocket/not-connected)
- the socket not open, When Disconnected Queue, Max Queue Size above 0 and Queue Size at it: Dropped counts it, Last Error `Send queue is full`, the Status outputs sent, On Error; Failure (websocket/queue-full)
- the socket not open, When Disconnected Drop: discarded — Dropped counts it, the Status outputs sent, no On Error; Unchanged
- the socket not open (an idle connection is made if there is none), When Disconnected Queue, with room: held at the back of the queue — Queue Size, the Status outputs sent; sent in order when the socket next opens, On Message Sent for each then; Done
- the socket open: handed to it now — text as itself, an object as JSON, anything else as text, a buffer or typed array as bytes, and with Message Type Binary the text as UTF-8 bytes — On Message Sent; the Status outputs stay silent; Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `closeCode` | Number | — | WebSocket close code from the last close, or 1006 when the socket died without one |
| `closeReason` | String | — | Reason the server gave for closing, which is often blank |
| `connected` | Boolean | — | True only while the socket is open and messages can be sent without queueing |
| `connectionState` | String | — | Where the connection is: idle, connecting, open, reconnecting, closed or error |
| `droppedCount` | Number | — | Messages that will never be sent, whether discarded by policy, by a full queue, or by the node being removed |
| `latency` | Number | — | Round trip of the last heartbeat in milliseconds; 0 until one has been measured |
| `queueSize` | Number | — | Messages held because the socket was not open when Send ran |
| `received` | * | — | The last message, parsed as JSON when it is JSON and handed over as text when it is not |
| `receivedIsBinary` | Boolean | — | True when the last message was a binary frame, in which case Received holds the buffer |
| `receivedRaw` | String | — | The last text message exactly as it arrived; blank for a binary frame |
| `retryCount` | Number | — | Attempts made during the current outage; back to zero once the socket opens |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when the action finished: a Connect whose socket opened, a Send accepted for delivery (sent, or queued for the next open), or a Disconnect that closed something |
| `onClose` | Signal | — | Fires whenever the socket goes down, whether or not a reconnect is going to follow |
| `onMessage` | Signal | — | Fires once per message, after Received already holds it; heartbeat replies are not messages |
| `onMessageSent` | Signal | — | Fires when a message has been handed to the socket, including a queued one flushed on reopen; not for heartbeats |
| `onOpen` | Signal | — | Fires every time the socket opens, including after a reconnect |
| `onReconnect` | Signal | — | Fires on every open after the first; a WebSocket cannot resume, so this is the cue to re-fetch rather than assume continuity |
| `unchanged` | Signal | — | Fires when there was nothing to do: a Disconnect with nothing open, a Send discarded by the Drop policy, or a Connect a later Connect or Disconnect superseded before it opened |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when the action could not be performed — no URL, a URL that is not ws:// or wss://, a connection that gave up, or a refused Send. Last Error carries the reason |
| `lastError` | String | — | What went wrong most recently, including why a reconnect was scheduled or abandoned |
| `onError` | Signal | — | Fires when something went wrong: a failed connect, a refused send, a dead heartbeat, or a give-up |

## Patterns

- `connectionState` → a status Text, and `lastError` → an error Text: an outage becomes something the user can see rather than a UI that has quietly stopped answering.
- Leave `whenDisconnected` on Queue so a message typed during a reconnect is held in order and sent on reopen instead of lost.
- `onOpen` → send an auth or subscribe frame: the queue is flushed after On Open, so the handshake always precedes the backlog.
- `onReconnect` → re-fetch history or re-subscribe, since the new session replays nothing.
- `droppedCount` → a Condition → a 'messages were lost' notice, for apps where silent loss is not acceptable.

## Watch out for

- Assuming a message handed to Send arrived. `socket.send` only buffers, and a connection that dies before the frame leaves loses it with no way to say which — add application-level acknowledgements if that matters.
- Turning on the heartbeat against a server that does not expect it: the message is ordinary application data and most servers will either ignore it or close the connection.
- Using this where the client only listens — Server-Sent Events reconnects natively and passes through more firewalls.
- Setting Max Queue Size to 0 on a long-lived page: an outage then grows the queue without bound.
- Putting a long-lived secret in the URL. Browsers cannot set WebSocket headers, but a query-string token ends up in server logs; prefer a short-lived ticket, or authenticate with a first message from On Open.

## Examples

**Agent chat over a WebSocket, with the connection visible**

A minimal two-way agent surface: the WebSocket node connects on load, the prompt field feeds `message`, the Send button fires `send`, and each reply arrives on `receivedRaw`. The two status texts are the point of the example rather than decoration — `connectionState` reads idle/connecting/open/reconnecting/closed/error, and `lastError` says why whenever it lands on the last of those, so an outage is something the user can see instead of a screen that has quietly stopped answering. `whenDisconnected` is left on Queue, so a message typed during a reconnect is held in order and sent once the socket is back rather than lost.

## Related nodes

[Subscribe To Changes](../cloud-services/subscribe-to-changes.md), [REST](./rest2.md), [HTTP Request](./net-noodl-http.md), [Query Records](../cloud-services/db-collection2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- WebSockets (`socket`)
- time: timers, delays and the frame clock (`clock`)
- random numbers (`random`)

### Starting state

```json
{
  "config": {
    "url": "",
    "protocols": [],
    "autoReconnect": true,
    "reconnectDelay": 1000,
    "maxReconnectDelay": 30000,
    "maxRetries": 10,
    "jitter": true,
    "heartbeatInterval": 0,
    "heartbeatMessage": "ping",
    "heartbeatReply": "pong",
    "sendWhenDisconnected": "queue",
    "maxQueueSize": 100,
    "messageEncoding": "auto"
  },
  "autoConnect": true,
  "scheduled": false,
  "pendingConnect": false,
  "receivedRaw": "",
  "receivedIsBinary": false,
  "nextId": 1
}
```

### How actions report back

Each time Connect, Disconnect or Send is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/websocket.ts"
/**
 * WebSocket (`net.noodl.WebSocket`) — read from `packages/noodl-runtime/src/nodes/std-library/agent/websocket.ts` (the node: ports,
 * the input-change policy, the outcomes) and `agent/websocket-connection.ts` (the connection: lifecycle, backoff, heartbeat, send
 * queue) on 2026-10-03 (NSP-014 s34). Unlike Subscribe To Changes, NO backend layer sits under this node: the connection class is
 * the node's own code, so its reconnect timers, its jitter and its heartbeat ARE graded here, on the world's clock and random
 * stream, and the seam is the browser's `WebSocket` (world.ts SOCKET).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (`ws` the node, `conn` the connection).
 *
 * THE RULES, before the citations.
 *
 * TWO CONFIGURATIONS. The node keeps its inputs (`config`); the CONNECTION, made lazily the first time something needs one
 * (`getConnection`, ws :677-736 — a Connect, a Send, or a rebuild that connects), copies them at its making with its own
 * defaults for anything missing (conn :334-350). After that the TUNING inputs (backoff, retries, jitter, heartbeat, queue
 * policy, encoding) are pushed onto the live connection in place (`applyConfig` → `configure`, ws :762-771, conn :382-394: a
 * value that is `undefined` is skipped; a changed Heartbeat Interval restarts the heartbeat at once while open). URL,
 * Protocols and Auto Connect are not tuning: each schedules a REBUILD at the frame's end (one per frame, ws :781-789).
 *
 * THE REBUILD (ws :791-834). With a live connection whose URL and protocol list still match the inputs: nothing. With one that
 * does not: it is DISPOSED (silently — its socket closed with 1000 "Node deleted", its timers stopped, conn :538-553), a Connect
 * still pending is `Unchanged`, every status output is sent (now the resting values: no connection), and a new connection
 * connects when there is a URL and either Auto Connect is on or the old one was connecting, open or reconnecting. With none:
 * it connects when Auto Connect is on (the node starts with it ON, ws :166 — the port's default is the panel's) and there is a
 * URL.
 *
 * CONNECTING (conn :415-480). Any reconnect timer and heartbeat stop, the socket held is closed (no code), the retry count
 * resets unless this is a retry. A URL that is blank after trimming, or does not start with ws:// or wss://, FAILS: state
 * `error`, the reason in Last Error, On Error. Otherwise the state is `connecting` (`reconnecting` for a retry), the close code
 * and reason clear, the status is told, and the socket is made with the trimmed URL and the protocol list (none when empty). A
 * constructor that throws fails the same way, `Could not open WebSocket: <message>`.
 *
 * WHAT THE SOCKET TELLS (conn :693-846). OPEN — `open`, Connected, retries 0, Last Error and the close code cleared; told; On
 * Open, and On Reconnect on every open after the connection's first; the heartbeat starts; the queue is flushed in order. A
 * text MESSAGE — the heartbeat's reply (only while a heartbeat runs) is swallowed and measured as Latency when one was
 * awaited; anything else is Received (parsed as JSON when it is JSON), Received Raw, not binary, On Message. A BINARY one —
 * Received is the bytes, Received Raw blank, binary. An ERROR — Last Error is `WebSocket connection error` once it has ever
 * opened, `Could not connect to <url>` before; On Error; then it is handled as a close with code 1006. A CLOSE (or that error):
 * the socket is closed (no code), the heartbeat stops, the close code and reason are kept; then — unless the node asked for it
 * — it RECONNECTS when Auto Reconnect is on, the code is not one retrying cannot help (1002, 1003, 1007, 1008, 1009, 1010,
 * 1015) and the retries are not spent (Max Retries negative: never spent; 0: no retries): the backoff delay is drawn
 * (Reconnect Delay doubled per attempt, capped at the maximum, and with Backoff Jitter scaled by a random draw into its
 * second half), the retry count goes up, `reconnecting`, Last Error says when; told; On Close; and a timer reconnects then.
 * Not reconnecting: a goodbye (1000 / 1001) with Auto Reconnect off is `closed` (told, On Close); anything else is `error`
 * with the reason (told, On Error, On Close).
 *
 * THE HEARTBEAT (conn :863-916). While open, every Heartbeat Interval ms (0 or less: none): if a heartbeat is still unanswered
 * and a reply is expected, the connection is DEAD — Last Error, On Error, handled as a 1006 close; otherwise the Heartbeat
 * Message is sent (not a message: no On Message Sent) and, when a reply is expected, the time noted.
 *
 * SEND (conn :569-647). Nothing to send (`undefined` / `null`) FAILS (`websocket/nothing-to-send`, On Error). Not open: by When
 * Disconnected — Drop counts it (`Unchanged`); Report Error counts it and fails (`websocket/not-connected`); Queue holds it in
 * order (`Done`) unless the queue is full (Max Queue Size > 0), which counts it and fails (`websocket/queue-full`). Open: the
 * value goes to the socket — text as itself, an object as JSON, anything else as `String`; with Message Type Binary, those
 * UTF-8 encoded — and On Message Sent (`Done`).
 *
 * THE OUTCOMES (ws :354-410, :683-709, :747-753). Connect: a Connect still pending is `Unchanged` first; then this one is
 * `Done` when the socket opens — however many failed attempts lie between — `Failure` (`websocket/connect-failed`) when the
 * connection reaches `error`, and `Unchanged` when a later Connect, a Disconnect or a rebuild supersedes it. Disconnect: a
 * pending Connect `Unchanged`, then `Done` when there was something to close (a socket, or a connection connecting, open or
 * reconnecting), `Unchanged` otherwise — and the state is `closed` either way when there is a connection.
 *
 * WHAT IS SENT (the status outputs, ws :100-110, :683-696). Every time the connection tells its status, ALL nine status outputs
 * are sent; nothing else sends them but the rebuild. A message sends the three Data outputs. Checked path by path: no status
 * field moves after the last time it is told inside one call, so the values a patch's end reads are the values last sent.
 *
 * NOT GRADED HERE, named:
 *   - `WebSocket is not available in this environment` (conn :427-430): every play has the world's WebSocket (world.ts SOCKET).
 *   - an encode or send that throws (conn :622-641): the world's socket never throws on an open socket, and the node sends only
 *     while open; JSON from a scenario always stringifies.
 *   - `_onNodeDeleted` (ws :841-855): no play deletes a node.
 *   - the error-then-close double report (conn :767-771's guard): the world delivers nothing after the node closes a socket,
 *     and the node closes one in the same call it handles its first `error` or `close` in.
 */

import { canonicalKey } from '../canonical';
import { defineNode, said, type SpecSocketOp, type WorldView } from '../spec';
import type { SocketScript, SocketScriptEvent } from '../world';

const STATUS = ['connectionState', 'connected', 'retryCount', 'lastError', 'queueSize', 'droppedCount', 'latency', 'closeCode', 'closeReason'] as const;
const DATA = ['received', 'receivedRaw', 'receivedIsBinary'] as const;

/** ws :55 — the code a Connect fails with */
export const WS_ERROR_CONNECT_FAILED = 'websocket/connect-failed';
/** conn :111-115 */
const WS_ERROR_NOTHING_TO_SEND = 'websocket/nothing-to-send';
const WS_ERROR_NOT_CONNECTED = 'websocket/not-connected';
const WS_ERROR_QUEUE_FULL = 'websocket/queue-full';

/** conn :177-180 */
const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;
const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_MAX_QUEUE_SIZE = 100;
/** conn :183 */
const CLOSE_CODE_ABNORMAL = 1006;
/** conn :196 — codes where reconnecting cannot help */
const FATAL_CLOSE_CODES = [1002, 1003, 1007, 1008, 1009, 1010, 1015];

/** A configuration — the node's inputs (ws :173-187), or a connection's copy of them (conn :335-350). */
type Config = {
  url: string;
  protocols: readonly string[];
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectDelay: number;
  maxRetries: number;
  jitter: boolean;
  heartbeatInterval: number;
  heartbeatMessage: string;
  heartbeatReply: string;
  sendWhenDisconnected: string;
  maxQueueSize: number;
  messageEncoding: string;
};

/** One connection (`WebSocketConnection`): its own config, its observable status, and what it holds. */
type Conn = {
  cfg: Config;
  state: string;
  connected: boolean;
  retryCount: number;
  lastError: string;
  /** `_queue` — `queueSize` is always its length where it is read (conn :609-610, :682, :549-550) */
  queue: readonly unknown[];
  droppedCount: number;
  latency: number;
  closeCode: number;
  closeReason: string;
  /** the spec's id of the socket held (`_socket`), `undefined` when none */
  socket: string | undefined;
  /** the tag of the pending reconnect timer (`_reconnectTimer`) / heartbeat timer (`_heartbeatTimer`) */
  reconnect: string | undefined;
  heartbeat: string | undefined;
  pendingPingAt: number;
  intentionalClose: boolean;
  hasEverOpened: boolean;
};

type WsState = {
  /** `_internal.config` — the inputs (ws :173-187) */
  config: Config;
  /** `_internal.autoConnect` — on at the making (ws :166) */
  autoConnect: boolean;
  /** `_internal.hasScheduledRebuild` */
  scheduled: boolean;
  /** a Connect invocation is waiting (`_internal.pendingConnect`) */
  pendingConnect: boolean;
  message: unknown;
  received: unknown;
  receivedRaw: string;
  receivedIsBinary: boolean;
  /** `_internal.connection` — never a disposed one: the rebuild drops it (ws :814-815) */
  conn: Conn | undefined;
  /** the spec's counter for socket ids and timer tags */
  nextId: number;
};

const NODE_CONFIG: Config = {
  url: '',
  protocols: [],
  autoReconnect: true,
  reconnectDelay: DEFAULT_RECONNECT_DELAY,
  maxReconnectDelay: DEFAULT_MAX_RECONNECT_DELAY,
  maxRetries: DEFAULT_MAX_RETRIES,
  jitter: true,
  heartbeatInterval: 0,
  heartbeatMessage: 'ping',
  heartbeatReply: 'pong',
  sendWhenDisconnected: 'queue',
  maxQueueSize: DEFAULT_MAX_QUEUE_SIZE,
  messageEncoding: 'auto'
};

/** conn :335-350 — a connection's copy of the node's config, with its own defaults for what is missing */
function connectionConfig(o: Config): Config {
  return {
    url: o.url || '',
    protocols: o.protocols || [],
    autoReconnect: o.autoReconnect !== false,
    reconnectDelay: o.reconnectDelay !== undefined ? o.reconnectDelay : DEFAULT_RECONNECT_DELAY,
    maxReconnectDelay: o.maxReconnectDelay !== undefined ? o.maxReconnectDelay : DEFAULT_MAX_RECONNECT_DELAY,
    maxRetries: o.maxRetries !== undefined ? o.maxRetries : DEFAULT_MAX_RETRIES,
    jitter: o.jitter !== false,
    heartbeatInterval: o.heartbeatInterval || 0,
    heartbeatMessage: o.heartbeatMessage !== undefined ? o.heartbeatMessage : 'ping',
    heartbeatReply: o.heartbeatReply !== undefined ? o.heartbeatReply : 'pong',
    sendWhenDisconnected: o.sendWhenDisconnected || 'queue',
    maxQueueSize: o.maxQueueSize !== undefined ? o.maxQueueSize : DEFAULT_MAX_QUEUE_SIZE,
    messageEncoding: o.messageEncoding || 'auto'
  };
}

/** ws :125-131 — `"json, chat.v1"` → `['json', 'chat.v1']` */
function parseProtocols(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  return value
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** ws :117-122 — only URL and protocols decide what a connection is connected to */
function identityChanged(built: Config, wanted: Config): boolean {
  if ((built.url || '') !== (wanted.url || '')) return true;
  const a = built.protocols || [];
  const b = wanted.protocols || [];
  return a.length !== b.length || a.some((protocol, index) => protocol !== b[index]);
}

/** conn :221-236 — base doubled per attempt, capped, then with jitter scaled into [50%, 100%] by one random draw */
function nextReconnectDelay(attempt: number, base: number, max: number, jitter: boolean, random: () => number): number {
  const safeBase = base > 0 ? base : DEFAULT_RECONNECT_DELAY;
  const safeMax = max > 0 ? max : DEFAULT_MAX_RECONNECT_DELAY;
  const exponent = Math.min(attempt, 30);
  const raw = Math.min(safeMax, safeBase * Math.pow(2, exponent));
  if (!jitter) return Math.round(raw);
  return Math.round(raw * (0.5 + 0.5 * random()));
}

/** conn :239-247 — a value a socket sends as a binary frame unchanged; by brand (a host's typed array is of another realm) */
function isBinaryPayload(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== 'object') return false;
  if (ArrayBuffer.isView(value) || Object.prototype.toString.call(value) === '[object ArrayBuffer]') return true;
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

/** conn :250-254 */
function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** conn :263-269 — JSON when it is JSON, the text otherwise */
function parseIncoming(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** conn :985-988 */
function describeClose(code: number, reason: string): string {
  const base = code === CLOSE_CODE_ABNORMAL ? 'Connection lost (no close frame)' : 'Connection closed (' + code + ')';
  return reason ? base + ': ' + reason : base;
}

type Settle = { outcome: 'done' | 'unchanged' | 'failure'; error?: string };
type SendResult = { kind: 'sent' } | { kind: 'queued' } | { kind: 'dropped' } | { kind: 'failed'; code: string };

/**
 * One call into the node — a reducer, the frame end, a timer, a socket event — run on a working copy of the state, the way the
 * runtime runs it on the node's internals, and handed back as a patch: the state that moved, the signals in the order they
 * fired, which outputs were sent, the timers started and stopped, the calls made on sockets, and the Connect it settled.
 */
class Run {
  readonly s: { -readonly [K in keyof WsState]: WsState[K] };
  private readonly emitted: string[] = [];
  private status = false;
  private data = false;
  private readonly after: Array<{ ms: unknown; tag: string }> = [];
  private readonly cancelled: string[] = [];
  private readonly socket: SpecSocketOp[] = [];
  /** settles of a Connect invoked BEFORE this call */
  readonly settled: Settle[] = [];
  /** the Connect this call itself invoked is the one pending (the connect reducer), and how it settled inside the call */
  own: { pending: boolean; settled?: Settle } = { pending: false };

  constructor(
    private readonly before: WsState,
    private readonly w: WorldView
  ) {
    const c = before.conn;
    this.s = { ...before, config: { ...before.config }, conn: c ? { ...c, cfg: { ...c.cfg }, queue: [...c.queue] } : undefined };
  }

  private id(prefix: string): string {
    return prefix + this.s.nextId++;
  }

  private get c(): Conn {
    return this.s.conn as Conn;
  }

  private emit(port: string): void {
    this.emitted.push(port);
  }

  // -- the node ------------------------------------------------------------------------------------------------------------

  /** ws :747-753 — the one place a pending Connect is settled */
  settleConnect(outcome: Settle['outcome'], error?: string): void {
    if (!this.s.pendingConnect) return;
    this.s.pendingConnect = false;
    const settle: Settle = error === undefined ? { outcome } : { outcome, error };
    if (this.own.pending) {
      this.own = { pending: false, settled: settle };
      return;
    }
    this.settled.push(settle);
  }

  /** ws :677-736 — the live connection, made from the node's config the first time one is needed */
  getConnection(): Conn {
    if (!this.s.conn) {
      this.s.conn = {
        cfg: connectionConfig(this.s.config),
        state: 'idle',
        connected: false,
        retryCount: 0,
        lastError: '',
        queue: [],
        droppedCount: 0,
        latency: 0,
        closeCode: 0,
        closeReason: '',
        socket: undefined,
        reconnect: undefined,
        heartbeat: undefined,
        pendingPingAt: 0,
        intentionalClose: false,
        hasEverOpened: false
      };
    }
    return this.s.conn;
  }

  /** ws :762-771 + conn :382-394 — tuning onto the node's config, and onto the live connection in place */
  applyConfig(partial: Partial<Config>): void {
    for (const [key, value] of Object.entries(partial)) if (value !== undefined) (this.s.config as Record<string, unknown>)[key] = value;
    if (!this.s.conn) return;
    const previous = this.c.cfg.heartbeatInterval;
    for (const [key, value] of Object.entries(partial)) if (value !== undefined) (this.c.cfg as Record<string, unknown>)[key] = value;
    if (this.c.cfg.heartbeatInterval !== previous && this.c.state === 'open') this.startHeartbeat();
  }

  /** ws :791-834 */
  rebuild(): void {
    const existing = this.s.conn;
    if (existing && !identityChanged(existing.cfg, this.s.config)) return;
    if (existing) {
      const wasActive = existing.state === 'connecting' || existing.state === 'open' || existing.state === 'reconnecting';
      this.dispose();
      this.s.conn = undefined;
      this.settleConnect('unchanged');
      this.status = true;
      if (this.s.config.url && (this.s.autoConnect || wasActive)) {
        this.getConnection();
        this.connect(false);
      }
      return;
    }
    if (this.s.autoConnect && this.s.config.url) {
      this.getConnection();
      this.connect(false);
    }
  }

  // -- the connection's callbacks to the node (ws :683-726) ---------------------------------------------------------------

  private emitStatus(): void {
    this.status = true;
    if (this.c.state === 'error') this.settleConnect('failure', WS_ERROR_CONNECT_FAILED);
  }

  private onMessage(value: unknown, raw: string, isBinary: boolean): void {
    this.s.received = value;
    this.s.receivedRaw = raw;
    this.s.receivedIsBinary = isBinary;
    this.data = true;
    this.emit('onMessage');
  }

  // -- the connection (conn) -----------------------------------------------------------------------------------------------

  /** conn :415-480 */
  connect(isRetry: boolean): void {
    const c = this.c;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.teardownSocket();
    c.intentionalClose = false;
    if (!isRetry) c.retryCount = 0;
    const url = (c.cfg.url || '').trim();
    if (!url) return this.fail('URL is required to connect');
    if (!/^wss?:\/\//i.test(url)) return this.fail('URL must start with ws:// or wss:// — got: ' + url);
    c.state = isRetry ? 'reconnecting' : 'connecting';
    c.connected = false;
    c.closeCode = 0;
    c.closeReason = '';
    this.emitStatus();
    const protocols = c.cfg.protocols && c.cfg.protocols.length ? c.cfg.protocols : undefined;
    // world.ts SOCKET — a constructor the script refuses throws inside the call; the call is still made (recorded)
    const answer = this.w.socketAnswer(url);
    const id = this.id('socket:');
    this.socket.push(protocols === undefined ? { op: 'connect', id, url } : { op: 'connect', id, url, protocols: [...protocols] });
    if (answer && 'throws' in answer) return this.fail('Could not open WebSocket: ' + answer.throws);
    c.socket = id;
  }

  /** conn :496-529 — returns whether there was something to close */
  disconnect(): boolean {
    const c = this.c;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    const hadSomethingToClose = c.socket !== undefined || c.state === 'connecting' || c.state === 'reconnecting' || c.state === 'open';
    c.intentionalClose = true;
    this.teardownSocket(1000, 'Client disconnect');
    c.connected = false;
    c.retryCount = 0;
    c.closeCode = 1000;
    c.closeReason = 'Client disconnect';
    c.state = 'closed';
    this.emitStatus();
    if (hadSomethingToClose) this.emit('onClose');
    return hadSomethingToClose;
  }

  /** conn :538-553 — silent: no callback reaches the node */
  private dispose(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.teardownSocket(1000, 'Node deleted');
  }

  /** conn :569-618 */
  send(value: unknown): SendResult {
    const c = this.c;
    if (value === undefined || value === null) {
      this.reportError('Nothing to send: the Message input is empty');
      return { kind: 'failed', code: WS_ERROR_NOTHING_TO_SEND };
    }
    if (c.state !== 'open' || c.socket === undefined) {
      switch (c.cfg.sendWhenDisconnected) {
        case 'drop':
          c.droppedCount++;
          this.emitStatus();
          return { kind: 'dropped' };
        case 'error':
          c.droppedCount++;
          this.reportError('Cannot send: the connection is not open (state: ' + c.state + ')');
          return { kind: 'failed', code: WS_ERROR_NOT_CONNECTED };
        default: {
          const limit = c.cfg.maxQueueSize;
          if (limit > 0 && c.queue.length >= limit) {
            c.droppedCount++;
            this.reportError('Send queue is full (' + limit + ' messages); this message was dropped');
            return { kind: 'failed', code: WS_ERROR_QUEUE_FULL };
          }
          c.queue = [...c.queue, value];
          this.emitStatus();
          return { kind: 'queued' };
        }
      }
    }
    return this.sendNow(value, true);
  }

  /** conn :621-647 — on an open socket the world's `send` never throws, and a scenario's value always encodes */
  private sendNow(value: unknown, notify: boolean): SendResult {
    let frame: unknown;
    if (isBinaryPayload(value)) frame = value;
    else if (this.c.cfg.messageEncoding === 'binary') frame = new TextEncoder().encode(toText(value));
    else frame = toText(value);
    this.socket.push({ op: 'send', id: this.c.socket as string, data: frame });
    if (notify) this.emit('onMessageSent');
    return { kind: 'sent' };
  }

  /** conn :671-684 */
  private flushQueue(): void {
    const c = this.c;
    if (c.queue.length === 0) return;
    const queue = [...c.queue];
    while (queue.length > 0 && c.state === 'open' && c.socket !== undefined) this.sendNow(queue.shift(), true);
    c.queue = queue;
    this.emitStatus();
  }

  /** conn :693-713 */
  handleOpen(id: string): void {
    const c = this.s.conn;
    if (!c || id !== c.socket) return;
    const isReconnect = c.hasEverOpened;
    c.hasEverOpened = true;
    c.state = 'open';
    c.connected = true;
    c.retryCount = 0;
    c.lastError = '';
    c.closeCode = 0;
    c.closeReason = '';
    this.emitStatus();
    // ws :697-709 — On Open, On Reconnect, then the Connect's Done
    this.emit('onOpen');
    if (isReconnect) this.emit('onReconnect');
    this.settleConnect('done');
    this.startHeartbeat();
    this.flushQueue();
  }

  /** conn :715-744 */
  handleMessage(id: string, data: string | ArrayBuffer): void {
    const c = this.s.conn;
    if (!c || id !== c.socket) return;
    if (typeof data !== 'string') return this.onMessage(data, '', true);
    const reply = c.cfg.heartbeatInterval > 0 ? c.cfg.heartbeatReply : '';
    if (reply && data === reply) {
      if (c.pendingPingAt) {
        c.latency = Math.max(0, this.w.now() - c.pendingPingAt);
        c.pendingPingAt = 0;
        this.emitStatus();
      }
      return;
    }
    this.onMessage(parseIncoming(data), data, false);
  }

  /** conn :746-761 */
  handleSocketError(id: string): void {
    const c = this.s.conn;
    if (!c || id !== c.socket) return;
    const message = c.hasEverOpened ? 'WebSocket connection error' : 'Could not connect to ' + (c.cfg.url || '(no url)');
    c.lastError = message;
    this.emit('onError');
    this.handleSocketDown(id, CLOSE_CODE_ABNORMAL, message);
  }

  /** conn :767-846 — the one place a socket's death is processed */
  handleSocketDown(id: string, code: number, reason: string): void {
    // :773-778 — the handlers come off, the socket is closed (it may be closed already)
    this.socket.push({ op: 'close', id });
    const c = this.s.conn;
    if (!c || id !== c.socket) return;
    c.socket = undefined;
    this.stopHeartbeat();
    c.connected = false;
    c.closeCode = code;
    c.closeReason = reason;
    if (c.intentionalClose) return;
    if (this.shouldReconnect(code)) {
      const delay = nextReconnectDelay(c.retryCount, c.cfg.reconnectDelay, c.cfg.maxReconnectDelay, c.cfg.jitter, () => this.w.random());
      c.retryCount++;
      c.state = 'reconnecting';
      c.lastError = describeClose(code, reason) + '; reconnecting in ' + delay + 'ms';
      this.emitStatus();
      this.emit('onClose');
      const tag = this.id('reconnect:');
      c.reconnect = tag;
      this.after.push({ ms: delay, tag });
      return;
    }
    if ((code === 1000 || code === 1001) && !c.cfg.autoReconnect) {
      c.state = 'closed';
      this.emitStatus();
      this.emit('onClose');
      return;
    }
    c.state = 'error';
    const why = FATAL_CLOSE_CODES.includes(code)
      ? describeClose(code, reason) + '; this will not be retried'
      : !c.cfg.autoReconnect
        ? describeClose(code, reason) + '; Auto Reconnect is off'
        : describeClose(code, reason) + '; gave up after ' + c.retryCount + ' reconnect attempts';
    c.lastError = why;
    this.emitStatus();
    this.emit('onError');
    this.emit('onClose');
  }

  /** conn :848-854 */
  private shouldReconnect(code: number): boolean {
    const c = this.c;
    if (!c.cfg.autoReconnect) return false;
    if (FATAL_CLOSE_CODES.includes(code)) return false;
    const max = c.cfg.maxRetries;
    if (max < 0) return true;
    return c.retryCount < max;
  }

  /** conn :816-819 — the reconnect timer fired */
  reconnectFired(tag: string): void {
    const c = this.s.conn;
    if (!c || c.reconnect !== tag) return;
    c.reconnect = undefined;
    this.connect(true);
  }

  /** conn :863-871 */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    const c = this.c;
    c.pendingPingAt = 0;
    const interval = c.cfg.heartbeatInterval;
    if (!interval || interval <= 0) return;
    const tag = this.id('heartbeat:');
    c.heartbeat = tag;
    this.after.push({ ms: interval, tag });
  }

  /** conn :873-908 */
  heartbeatFired(tag: string): void {
    const c = this.s.conn;
    if (!c || c.heartbeat !== tag) return;
    c.heartbeat = undefined;
    if (c.state !== 'open' || c.socket === undefined) return;
    const reply = c.cfg.heartbeatReply;
    if (reply && c.pendingPingAt) {
      const waited = this.w.now() - c.pendingPingAt;
      c.pendingPingAt = 0;
      const message = 'Heartbeat went unanswered for ' + waited + 'ms; treating the connection as dead';
      c.lastError = message;
      this.emit('onError');
      this.handleSocketDown(c.socket, CLOSE_CODE_ABNORMAL, message);
      return;
    }
    const message = c.cfg.heartbeatMessage;
    if (message) {
      this.sendNow(message, false);
      if (reply) c.pendingPingAt = this.w.now();
    }
    if (c.state === 'open' && c.socket !== undefined) {
      const next = this.id('heartbeat:');
      c.heartbeat = next;
      this.after.push({ ms: c.cfg.heartbeatInterval, tag: next });
    }
  }

  /** conn :910-916 */
  private stopHeartbeat(): void {
    const c = this.c;
    if (c.heartbeat !== undefined) {
      this.cancelled.push(c.heartbeat);
      c.heartbeat = undefined;
    }
    c.pendingPingAt = 0;
  }

  /** conn :920-925 */
  private clearReconnectTimer(): void {
    const c = this.c;
    if (c.reconnect !== undefined) {
      this.cancelled.push(c.reconnect);
      c.reconnect = undefined;
    }
  }

  /** conn :935-946 */
  private teardownSocket(code?: number, reason?: string): void {
    const c = this.c;
    if (c.socket === undefined) return;
    const id = c.socket;
    c.socket = undefined;
    this.socket.push(code !== undefined ? { op: 'close', id, code, reason } : { op: 'close', id });
  }

  /** conn :949-955 */
  private fail(message: string): void {
    const c = this.c;
    c.state = 'error';
    c.connected = false;
    c.lastError = message;
    this.emitStatus();
    this.emit('onError');
  }

  /** conn :957-961 */
  private reportError(message: string): void {
    this.c.lastError = message;
    this.emitStatus();
    this.emit('onError');
  }

  // -- the patch -----------------------------------------------------------------------------------------------------------

  /** What this call did, as a patch: the state keys that moved, and the effects in the order they were made. */
  patch(): { set: Partial<WsState>; emit: never[]; send: never[]; after?: Array<{ ms: unknown; tag: string }>; cancel?: string[]; socket?: SpecSocketOp[] } {
    const set: Record<string, unknown> = {};
    for (const key of Object.keys(this.s) as Array<keyof WsState>) {
      if (canonicalKey(this.s[key]) !== canonicalKey(this.before[key])) set[key] = this.s[key];
    }
    const send = [...(this.status ? STATUS : []), ...(this.data ? DATA : [])] as never[];
    return {
      set: set as Partial<WsState>,
      emit: this.emitted as never[],
      send,
      ...(this.after.length > 0 ? { after: this.after } : {}),
      ...(this.cancelled.length > 0 ? { cancel: this.cancelled } : {}),
      ...(this.socket.length > 0 ? { socket: this.socket } : {})
    };
  }

  /** A world handler's or the frame end's patch: the Connect it settled resolves the pending invocation. */
  handlerPatch() {
    const p = this.patch();
    return this.settled.length > 0 ? { ...p, outcomes: this.settled.map((o) => ({ port: 'connect' as const, ...o })) } : p;
  }
}

// ------------------------------------------------------------------------------------------------
// what a sequence plays with

/** A URL a browser refuses in the constructor (world.ts SOCKET `throws`) — what `new WebSocket` says for a URL it cannot parse. */
const REFUSED = { match: { url: 'wss://bad*' }, answer: { throws: "Failed to construct 'WebSocket': The URL 'wss://bad host/' is invalid." } };
/** The server answers a heartbeat of `ping` with `pong`, 3 ms later. */
const PONG = [{ to: 'ping', with: 'pong', after: 3 }];

/**
 * What a talking server says, one entry at every doubling of the clock from 2 ms to 32 s after the socket is made, after an
 * open at 1 — so an advance after any construction reaches some, whatever its size (Subscribe To Changes' TOLD_CYCLE, s33).
 */
const TALK: ReadonlyArray<Omit<SocketScriptEvent, 'at'>> = [
  { message: '{"a":1}' },
  { message: 'plain text' },
  { message: 'pong' },
  { binary: [104, 105] },
  { message: '42' },
  { message: 'null' },
  { close: { code: 1001, reason: 'going away' } }
];
const talk = (offset: number): SocketScriptEvent[] => [{ at: 1, open: true }, ...Array.from({ length: 15 }, (_, k) => ({ at: 2 ** (k + 1), ...TALK[(k + offset) % TALK.length] }) as SocketScriptEvent)];

/** The servers a sequence plays with: talkers in three phases, a first refusal then a talker, drops, a fatal and a clean close, error-then-close, silence, a binary feed. */
const SERVERS: ReadonlyArray<SocketScript> = [
  { answers: [REFUSED, { answer: { events: talk(0), replies: PONG } }] },
  { answers: [REFUSED, { answer: { events: talk(2), replies: PONG } }] },
  { answers: [REFUSED, { answer: { events: talk(5), replies: PONG } }] },
  { answers: [REFUSED, { times: 1, answer: { events: [{ at: 1, error: true }] } }, { answer: { events: talk(1), replies: PONG } }] },
  { answers: [REFUSED, { answer: { events: [{ at: 1, open: true }, { at: 3, message: 'hi' }, { at: 8, close: {} }] } }] },
  { answers: [REFUSED, { answer: { events: [{ at: 2, open: true }, { at: 4, close: { code: 1008, reason: 'policy' } }] } }] },
  { answers: [REFUSED, { answer: { events: [{ at: 1, open: true }, { at: 16, close: { code: 1000, reason: 'done' } }] } }] },
  { answers: [REFUSED, { answer: { events: [{ at: 1, error: true }, { at: 1, close: { code: 1006 } }] } }] },
  { answers: [REFUSED, { answer: { never: true } }] },
  { answers: [REFUSED, { answer: { events: [{ at: 1, open: true }, { at: 2, binary: [1, 2, 255] }, { at: 4, message: 'pong' }, { at: 8, message: '12' }] } }] }
];

/**
 * Weighted (s34 reach): the string pool a wire can deliver joins these, and none of it is a ws:// URL — at two of each, 41 of
 * 400 sequences made a socket and 9 saw it open. Now most draws are a URL a socket opens on.
 */
const URLS = [...Array(12).fill('ws://srv/a'), ...Array(12).fill('wss://srv/b'), '  ws://srv/a  ', 'wss://bad host/', 'http://srv/a', '', 'WS://SRV/C'];

export const WebSocketNode = defineNode({
  type: 'net.noodl.WebSocket',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/agent/websocket.ts; agent/websocket-connection.ts',
  needs: ['socket', 'clock', 'random'],
  worldPool: { sockets: SERVERS, advances: [0, 1, 1, 2, 3, 5, 10, 50, 100, 600, 1000, 5000, 30000] },

  state: {
    config: NODE_CONFIG,
    autoConnect: true,
    scheduled: false,
    pendingConnect: false,
    message: undefined,
    received: undefined,
    receivedRaw: '',
    receivedIsBinary: false,
    conn: undefined,
    nextId: 1
  } as WsState,

  // ws :656-666
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // ── Connection ── ws :213-351
    url: {
      type: 'string',
      coerce: 'none',
      displayName: 'URL',
      group: 'Connection',
      description: 'Endpoint to connect to, which must start with ws:// or wss://; changing it reconnects to the new one',
      examples: URLS
    },
    autoConnect: { type: 'boolean', coerce: 'none', default: true, displayName: 'Auto Connect', group: 'Connection', description: 'Connect as soon as a URL is available, without waiting for a Connect signal', examples: [true, true, false] },
    protocols: { type: 'string', coerce: 'none', displayName: 'Protocols', group: 'Connection', description: 'Comma-separated WebSocket subprotocols to offer during the handshake', examples: ['', 'json', 'json, chat.v1', ' , ', undefined] },
    autoReconnect: {
      type: 'boolean',
      coerce: 'none',
      default: true,
      displayName: 'Auto Reconnect',
      group: 'Connection',
      description: 'Retries after an unsolicited close with a growing backoff; turning it off reports the close as an error',
      examples: [true, false]
    },
    reconnectDelay: {
      type: 'number',
      coerce: 'none',
      default: DEFAULT_RECONNECT_DELAY,
      displayName: 'Reconnect Delay (ms)',
      group: 'Connection',
      description: 'First backoff delay in milliseconds; each further attempt doubles it up to Max Reconnect Delay',
      examples: [1000, 10, 3, 0, -5]
    },
    maxReconnectDelay: {
      type: 'number',
      coerce: 'none',
      default: DEFAULT_MAX_RECONNECT_DELAY,
      displayName: 'Max Reconnect Delay (ms)',
      group: 'Connection',
      description: 'Ceiling on the backoff in milliseconds, however many attempts there have been',
      examples: [30000, 50, 20]
    },
    maxRetries: {
      type: 'number',
      coerce: 'none',
      default: DEFAULT_MAX_RETRIES,
      displayName: 'Max Retries',
      group: 'Connection',
      description: 'Reconnect attempts allowed per outage; 0 disables retrying and a negative value means unlimited',
      examples: [10, 0, 1, 2, -1]
    },
    jitter: {
      type: 'boolean',
      coerce: 'none',
      default: true,
      displayName: 'Backoff Jitter',
      group: 'Connection',
      description: 'Spreads reconnect attempts randomly across the second half of each backoff window, so a fleet does not return in lockstep',
      examples: [true, false]
    },
    heartbeatInterval: {
      type: 'number',
      coerce: 'none',
      default: 0,
      displayName: 'Heartbeat Interval (ms)',
      group: 'Connection',
      description: 'Milliseconds between heartbeats while the socket is open; 0 disables it, and only enable it if your server expects the message',
      examples: [0, 4, 5, 20, 1]
    },
    heartbeatMessage: { type: 'string', coerce: 'none', default: 'ping', displayName: 'Heartbeat Message', group: 'Connection', description: 'Application text sent as the heartbeat; it is not a protocol ping frame', examples: ['ping', 'ping', 'hb', ''] },
    heartbeatReply: {
      type: 'string',
      coerce: 'none',
      default: 'pong',
      displayName: 'Heartbeat Reply',
      group: 'Connection',
      description: 'Exact text the server answers a heartbeat with; it is measured as Latency, hidden from On Message, and its absence is treated as a dead connection',
      examples: ['pong', 'pong', '', 'ack']
    },

    // ── Actions ── ws :354-410
    connect: { type: 'signal', outcome: true, displayName: 'Connect', group: 'Actions', description: 'Opens the socket, replacing one already open without reporting a close' },
    disconnect: { type: 'signal', outcome: true, displayName: 'Disconnect', group: 'Actions', description: 'Closes the socket and cancels any pending reconnect' },
    send: { type: 'signal', outcome: true, displayName: 'Send', group: 'Actions', description: 'Hands the current Message to the socket, or applies the When Disconnected policy' },

    // ── Message ── ws :413-481
    message: {
      type: '*',
      coerce: 'none',
      displayName: 'Message',
      group: 'Message',
      description: 'Value to send; objects are JSON-serialised, and ArrayBuffers and typed arrays go as binary frames',
      examples: ['hello', 'ping', { op: 'sub', ch: 'x' }, 7, 'é', null]
    },
    messageType: {
      type: 'enum',
      coerce: 'none',
      enums: ['auto', 'text', 'binary'],
      default: 'auto',
      displayName: 'Message Type',
      group: 'Message',
      description: 'Auto sends binary values as binary and everything else as text; Binary encodes text and objects as UTF-8 first',
      examples: ['auto', 'binary']
    },
    whenDisconnected: {
      type: 'enum',
      coerce: 'none',
      enums: ['queue', 'drop', 'error'],
      default: 'queue',
      displayName: 'When Disconnected',
      group: 'Message',
      description: 'What a Send does while the socket is not open: hold it in order, discard and count it, or also report an error',
      examples: ['queue', 'drop', 'error']
    },
    maxQueueSize: {
      type: 'number',
      coerce: 'none',
      default: DEFAULT_MAX_QUEUE_SIZE,
      displayName: 'Max Queue Size',
      group: 'Message',
      description: 'Messages the queue holds before further Sends are refused and counted as dropped; 0 or less is unlimited and can grow during a long outage',
      examples: [100, 1, 2, 0, -1]
    }
  },

  outputs: {
    // ── Status ── ws :486-576 — the connection's, or the resting value when there is none
    connectionState: { type: 'string', displayName: 'Connection State', group: 'Status', description: 'Where the connection is: idle, connecting, open, reconnecting, closed or error', from: (s) => (s.conn ? s.conn.state : 'idle') },
    connected: { type: 'boolean', displayName: 'Connected', group: 'Status', description: 'True only while the socket is open and messages can be sent without queueing', from: (s) => (s.conn ? s.conn.connected : false) },
    retryCount: { type: 'number', displayName: 'Retry Count', group: 'Status', description: 'Attempts made during the current outage; back to zero once the socket opens', from: (s) => (s.conn ? s.conn.retryCount : 0) },
    lastError: { type: 'string', displayName: 'Last Error', group: 'Status', description: 'What went wrong most recently, including why a reconnect was scheduled or abandoned', from: (s) => (s.conn ? s.conn.lastError : '') },
    queueSize: { type: 'number', displayName: 'Queue Size', group: 'Status', description: 'Messages held because the socket was not open when Send ran', from: (s) => (s.conn ? s.conn.queue.length : 0) },
    droppedCount: {
      type: 'number',
      displayName: 'Dropped',
      group: 'Status',
      description: 'Messages that will never be sent, whether discarded by policy, by a full queue, or by the node being removed',
      from: (s) => (s.conn ? s.conn.droppedCount : 0)
    },
    latency: { type: 'number', displayName: 'Latency (ms)', group: 'Status', description: 'Round trip of the last heartbeat in milliseconds; 0 until one has been measured', from: (s) => (s.conn ? s.conn.latency : 0) },
    closeCode: { type: 'number', displayName: 'Close Code', group: 'Status', description: 'WebSocket close code from the last close, or 1006 when the socket died without one', from: (s) => (s.conn ? s.conn.closeCode : 0) },
    closeReason: { type: 'string', displayName: 'Close Reason', group: 'Status', description: 'Reason the server gave for closing, which is often blank', from: (s) => (s.conn ? s.conn.closeReason : '') },

    // ── Data ── ws :579-605
    received: { type: '*', displayName: 'Received', group: 'Data', description: 'The last message, parsed as JSON when it is JSON and handed over as text when it is not', from: (s) => s.received },
    receivedRaw: { type: 'string', displayName: 'Received Raw', group: 'Data', description: 'The last text message exactly as it arrived; blank for a binary frame', from: (s) => s.receivedRaw },
    receivedIsBinary: { type: 'boolean', displayName: 'Received Is Binary', group: 'Data', description: 'True when the last message was a binary frame, in which case Received holds the buffer', from: (s) => s.receivedIsBinary },

    // ── Events ── ws :608-645
    onOpen: { type: 'signal', displayName: 'On Open', group: 'Events', description: 'Fires every time the socket opens, including after a reconnect' },
    onMessage: { type: 'signal', displayName: 'On Message', group: 'Events', description: 'Fires once per message, after Received already holds it; heartbeat replies are not messages' },
    onMessageSent: { type: 'signal', displayName: 'On Message Sent', group: 'Events', description: 'Fires when a message has been handed to the socket, including a queued one flushed on reopen; not for heartbeats' },
    onError: { type: 'signal', displayName: 'On Error', group: 'Events', description: 'Fires when something went wrong: a failed connect, a refused send, a dead heartbeat, or a give-up' },
    onClose: { type: 'signal', displayName: 'On Close', group: 'Events', description: 'Fires whenever the socket goes down, whether or not a reconnect is going to follow' },
    onReconnect: {
      type: 'signal',
      displayName: 'On Reconnect',
      group: 'Events',
      description: 'Fires on every open after the first; a WebSocket cannot resume, so this is the cue to re-fetch rather than assume continuity'
    }
  }
}).on(
  {
    // ws :219-222 — a string, else blank; the rebuild decides. NSP-018: the patch is the draft's (`said`), one arm per
    // state the frame's end will find (ws :791-834)
    url: (s, v, _i, w) => {
      const run = new Run(s, w);
      run.s.config = { ...run.s.config, url: typeof v === 'string' ? v : '' };
      run.s.scheduled = true;
      if (!s.conn)
        return said(
          'no connection yet: stored as text (nothing as blank); at the end of the frame one connects to it when Auto Connect is on and it is not blank — Connection State connecting, the Status outputs sent (a URL not starting with ws:// or wss:// fails at once instead: Connection State error, Last Error, On Error); with Auto Connect off it waits for a Connect',
          run.patch()
        );
      if (!identityChanged(s.conn.cfg, run.s.config))
        return said(
          'the URL the connection was made with (its Protocols too): stored; nothing else, now or at the end of the frame — a closed or failed connection is not retried by setting its URL again',
          run.patch()
        );
      return said(
        "a URL other than the connection's: stored; at the end of the frame that connection is dropped silently (its socket closed, its countdown and heartbeat stopped, no On Close; a Connect still waiting, or made before then against the old URL: Unchanged), the Status outputs sent, and a fresh one (Retry Count 0, Queue Size 0, Dropped 0) connects to this URL when it is not blank and Auto Connect is on or the old one was connecting, open or reconnecting — Connection State connecting (not starting with ws:// or wss://: error, Last Error, On Error); otherwise idle",
        run.patch()
      );
    },
    // ws :231-234 — the rebuild (ws :797-799) leaves a connection whose URL and Protocols still match alone, whatever this says
    autoConnect: (s, v, _i, w) => {
      const run = new Run(s, w);
      run.s.autoConnect = !!v;
      run.s.scheduled = true;
      if (s.conn)
        return said(
          'on or off, with a connection (open, closed or failed alike): held for the next URL or Protocols change, after which the new one connects when this is on; nothing now or at the end of the frame — off closes nothing, on reopens nothing',
          run.patch()
        );
      if (v)
        return said(
          'on, with no connection yet: at the end of the frame one connects when the URL is not blank — Connection State connecting, the Status outputs sent (a URL not starting with ws:// or wss://: error, Last Error, On Error); a blank URL: idle until one arrives',
          run.patch()
        );
      return said('off, with no connection yet: nothing — it waits for a Connect', run.patch());
    },
    // ws :242-245
    protocols: (s, v, _i, w) => {
      const run = new Run(s, w);
      run.s.config = { ...run.s.config, protocols: parseProtocols(v) };
      run.s.scheduled = true;
      if (!s.conn)
        return said(
          'no connection yet: split on commas and trimmed (blank or not text: none), offered at the handshake when a connection is made — at the end of the frame when Auto Connect is on and there is a URL, else at the next Connect',
          run.patch()
        );
      if (!identityChanged(s.conn.cfg, run.s.config))
        return said('the list the connection was made with (its URL too): stored; nothing else, now or at the end of the frame', run.patch());
      return said(
        "a list other than the connection's: stored; at the end of the frame that connection is dropped silently (no On Close; a Connect still waiting: Unchanged), the Status outputs sent, and a fresh one offering these connects when the URL is not blank and Auto Connect is on or the old one was connecting, open or reconnecting — Connection State connecting; otherwise idle",
        run.patch()
      );
    },
    // ws :254-350 — tuning, pushed onto the live connection in place (conn :382-394); each read where the connection uses it
    autoReconnect: (s, v, _i, w) =>
      said(
        'on or off: onto the connection at once, read at its next unsolicited close — on, the drop is retried after the backoff wait (Connection State reconnecting, Last Error says when, On Close); off, it is final: a goodbye (1000 or 1001) is Connection State closed and On Close, anything else error, Last Error, On Error and On Close; a reconnect already counting down still fires either way',
        tune(s, w, { autoReconnect: !!v })
      ),
    reconnectDelay: (s, v, _i, w) =>
      said(
        'always: onto the connection at once, read when the next backoff is drawn — the first retry of an outage waits this many milliseconds, each later one twice the last, capped at Max Reconnect Delay (ms); 0, below, or not a number: 1000; a wait already counting down keeps its length',
        tune(s, w, { reconnectDelay: Number(v) })
      ),
    maxReconnectDelay: (s, v, _i, w) =>
      said(
        'always: onto the connection at once, read when the next backoff is drawn — the ceiling on the wait in milliseconds, however many retries; 0, below, or not a number: 30000',
        tune(s, w, { maxReconnectDelay: Number(v) })
      ),
    maxRetries: (s, v, _i, w) =>
      said(
        'always: onto the connection at once, read at its next unsolicited close — Retry Count (the retries so far in this outage) below it: one more; at it: gives up — Connection State error, Last Error `… gave up after n reconnect attempts`, On Error, On Close (a waiting Connect: Failure); 0, or not a number: no retry; below 0: unlimited; a close code retrying cannot help (1002, 1003, 1007 to 1010, 1015) gives up whatever this is',
        tune(s, w, { maxRetries: Number(v) })
      ),
    jitter: (s, v, _i, w) =>
      said(
        'on or off: onto the connection at once, read when the next backoff is drawn — on, the wait is scaled by a random draw into its second half (from half of it to all of it); off, the whole wait exactly',
        tune(s, w, { jitter: !!v })
      ),
    // conn :389-393 — a changed interval restarts the heartbeat while open; otherwise it is read at the next open
    heartbeatInterval: (s, v, _i, w) => {
      const interval = Number(v);
      if (s.conn && s.conn.state === 'open' && interval !== s.conn.cfg.heartbeatInterval)
        return said(
          'a different interval while the socket is open: the heartbeat restarts now — a reply still awaited is forgotten, and the Heartbeat Message goes this many milliseconds from now, then every interval; 0, below, or not a number: the heartbeat stops',
          tune(s, w, { heartbeatInterval: interval })
        );
      return said(
        'the same interval, or no open socket: read when the socket next opens — above 0, the Heartbeat Message is sent every this many milliseconds (not On Message Sent) and the Heartbeat Reply swallowed; 0, below, or not a number: no heartbeat, and a Heartbeat Reply arriving is an ordinary message',
        tune(s, w, { heartbeatInterval: interval })
      );
    },
    heartbeatMessage: (s, v, _i, w) =>
      said(
        'always: onto the connection at once (not text: blank), read at the next beat — the text sent as the heartbeat, not On Message Sent; blank: no beat is sent and no reply awaited, so no connection is declared dead',
        tune(s, w, { heartbeatMessage: typeof v === 'string' ? v : '' })
      ),
    heartbeatReply: (s, v, _i, w) =>
      said(
        'always: onto the connection at once (not text: blank), read at the next beat and the next message — while a heartbeat runs, a message equal to it is swallowed instead of On Message and, when a beat was awaiting it, measured as Latency (ms) (the Status outputs sent); a beat still unanswered when the next is due is a dead connection: Last Error, On Error, then handled as a 1006 close; blank: nothing is awaited',
        tune(s, w, { heartbeatReply: typeof v === 'string' ? v : '' })
      ),
    // ws :419-421
    message: (_s, v) => ({ says: 'always: held for the next Send (nothing or null fails it)', set: { message: v }, send: [] }),
    // ws :439-443, :461-465, :476-480
    messageType: (s, v, _i, w) =>
      said(
        "always: onto the connection at once (nothing as Auto), read at the next send — Binary encodes text, and an object's JSON, as UTF-8 bytes; Auto and Text send them as text; a buffer or typed array goes as bytes whatever this says",
        tune(s, w, { messageEncoding: (v as string) || 'auto' })
      ),
    whenDisconnected: (s, v, _i, w) =>
      said(
        'always: onto the connection at once (nothing as Queue), read by the next Send while the socket is not open — Queue holds it in order (Done; sent at the next open), Drop discards it and counts it in Dropped (Unchanged), Report Error counts it and fails (Last Error, On Error, Failure websocket/not-connected); messages already queued stay queued',
        tune(s, w, { sendWhenDisconnected: (v as string) || 'queue' })
      ),
    maxQueueSize: (s, v, _i, w) =>
      said(
        'always: onto the connection at once, read by the next Send that would queue — above 0, a queue already this long refuses it: Dropped, Last Error, On Error, Failure websocket/queue-full; 0, below, or not a number: no limit; a queue already longer than a new limit keeps what it holds',
        tune(s, w, { maxQueueSize: Number(v) })
      ),

    // ws :358-369 — a pending Connect superseded, a token, the connection connects (and may fail inside the call)
    connect: (s, _i, w) => {
      const run = new Run(s, w);
      const settles = s.pendingConnect ? [{ outcome: 'unchanged' as const }] : undefined;
      run.s.pendingConnect = true;
      run.own = { pending: true };
      // the URL the CONNECTION holds (conn :335-350): one set this frame reaches it at the frame's end, not here
      const url = (run.getConnection().cfg.url || '').trim();
      run.connect(false);
      const own = run.own.settled;
      const p = run.patch();
      // NSP-018: the three ways a connect fails inside the call (conn :415-480), then the one that waits for the socket
      if (own) {
        const failed = { ...p, outcome: own.outcome, ...(own.error !== undefined ? { error: own.error } : {}), ...(settles ? { settles } : {}) };
        if (!url)
          return said(
            'a blank URL: any socket held is closed quietly and the countdown and heartbeat stopped (a Connect still waiting: Unchanged), then it fails at once — Connection State error, Last Error `URL is required to connect`, Retry Count 0, the Status outputs sent, On Error; Failure (websocket/connect-failed)',
            failed
          );
        if (!/^wss?:\/\//i.test(url))
          return said(
            'a URL not starting with ws:// or wss://: any socket held is closed quietly (a Connect still waiting: Unchanged), then it fails at once — Connection State error, Last Error `URL must start with ws:// or wss://`, Retry Count 0, the Status outputs sent, On Error; Failure (websocket/connect-failed)',
            failed
          );
        return said(
          'a URL the browser refuses to open: any socket held is closed quietly (a Connect still waiting: Unchanged), Connection State connecting, then error at once — Last Error `Could not open WebSocket: …`, Retry Count 0, the Status outputs sent, On Error; Failure (websocket/connect-failed)',
          failed
        );
      }
      return said(
        "a URL starting with ws:// or wss:// (the connection's own: one changed this frame is taken at the frame's end, which then supersedes this): any socket held is closed quietly, the countdown and heartbeat stopped (a Connect still waiting: Unchanged), Retry Count 0, Close Code 0, Connection State connecting (Connected false), the Status outputs sent, and a socket is made with the URL trimmed and the Protocols; settled later — Done when it opens (On Open, however many retried drops lie between), Failure (websocket/connect-failed) when the connection fails or gives up, Unchanged when a later Connect, a Disconnect or a URL change supersedes it",
        { ...p, outcome: 'pending' as const, ...(settles ? { settles } : {}) }
      );
    },
    // ws :375-386 — a pending Connect is Unchanged first; Done when there was something to close (conn :496-529)
    disconnect: (s, _i, w) => {
      const run = new Run(s, w);
      run.settleConnect('unchanged');
      const closed = run.s.conn ? run.disconnect() : false;
      const settles = run.settled.map((o) => ({ port: 'connect', ...o }));
      const p = { ...run.patch(), outcome: closed ? ('done' as const) : ('unchanged' as const), ...(settles.length > 0 ? { settles } : {}) };
      if (!s.conn) return said('no connection was ever made: nothing is sent (a Connect still waiting: Unchanged); Unchanged', p);
      if (closed)
        return said(
          'a socket held, or a connection connecting, open or reconnecting: the socket is closed (1000 `Client disconnect`), the countdown and heartbeat stopped, nothing more arrives — Connection State closed, Connected false, Retry Count 0, Close Code 1000, Close Reason `Client disconnect`, the Status outputs sent, On Close (a Connect still waiting: Unchanged); Done',
          p
        );
      return said(
        'a connection idle, closed or failed, holding no socket: Connection State closed, Retry Count 0, Close Code 1000, Close Reason `Client disconnect` (Last Error kept), the Status outputs sent, no On Close; Unchanged',
        p
      );
    },
    // ws :392-409 — what became of the value: queued or sent is Done, dropped Unchanged, refused Failure (conn :569-618)
    send: (s, _i, w) => {
      const run = new Run(s, w);
      run.getConnection();
      const result = run.send(s.message);
      const p = run.patch();
      if (result.kind === 'failed') {
        const failed = { ...p, outcome: 'failure' as const, error: result.code };
        if (result.code === WS_ERROR_NOTHING_TO_SEND)
          return said(
            'Message empty (nothing or null), whatever the socket is doing: Last Error `Nothing to send: the Message input is empty`, the Status outputs sent, On Error; Failure (websocket/nothing-to-send)',
            failed
          );
        if (result.code === WS_ERROR_NOT_CONNECTED)
          return said(
            'the socket not open (idle, connecting, reconnecting, closed or failed), When Disconnected Report Error: Dropped counts it, Last Error `Cannot send: the connection is not open`, the Status outputs sent, On Error; Failure (websocket/not-connected)',
            failed
          );
        return said(
          'the socket not open, When Disconnected Queue, Max Queue Size above 0 and Queue Size at it: Dropped counts it, Last Error `Send queue is full`, the Status outputs sent, On Error; Failure (websocket/queue-full)',
          failed
        );
      }
      if (result.kind === 'dropped')
        return said('the socket not open, When Disconnected Drop: discarded — Dropped counts it, the Status outputs sent, no On Error; Unchanged', { ...p, outcome: 'unchanged' as const });
      if (result.kind === 'queued')
        return said(
          'the socket not open (an idle connection is made if there is none), When Disconnected Queue, with room: held at the back of the queue — Queue Size, the Status outputs sent; sent in order when the socket next opens, On Message Sent for each then; Done',
          { ...p, outcome: 'done' as const }
        );
      return said(
        'the socket open: handed to it now — text as itself, an object as JSON, anything else as text, a buffer or typed array as bytes, and with Message Type Binary the text as UTF-8 bytes — On Message Sent; the Status outputs stay silent; Done',
        { ...p, outcome: 'done' as const }
      );
    }
  },
  {
    // ws :785-788 — the frame's one rebuild
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const run = new Run(s, w);
      run.s.scheduled = false;
      run.rebuild();
      return run.handlerPatch();
    },
    world: {
      // conn :816-819 (a reconnect), :870 / :906 (a heartbeat)
      timer: (s, _i, tag, w) => {
        const run = new Run(s, w);
        if (tag.startsWith('reconnect:')) run.reconnectFired(tag);
        else run.heartbeatFired(tag);
        return run.handlerPatch();
      },
      // conn :472-479 — what the socket fires
      socket: (s, _i, e, w) => {
        const run = new Run(s, w);
        if (e.kind === 'open') run.handleOpen(e.id);
        else if (e.kind === 'message') run.handleMessage(e.id, e.data);
        else if (e.kind === 'binary') run.handleMessage(e.id, new Uint8Array(e.bytes).buffer);
        else if (e.kind === 'error') run.handleSocketError(e.id);
        else if (s.conn && e.id === s.conn.socket) run.handleSocketDown(e.id, e.code, e.reason);
        return run.handlerPatch();
      }
    }
  }
);

/** A tuning input (ws :254-350, :439-480): onto the node's config, and onto the live connection — which may restart its heartbeat. */
function tune(s: Readonly<WsState>, w: WorldView, partial: Partial<Config>) {
  const run = new Run(s, w);
  run.applyConfig(partial);
  return run.patch();
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
