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


:::info Generated
This page is generated from `node-catalog-enriched.json`. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source enrichment instead.
:::
