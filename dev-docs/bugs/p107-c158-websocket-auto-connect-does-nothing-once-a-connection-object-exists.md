---
id: P107-C158
title: WebSocket — Auto Connect does nothing once a connection object exists: a Send that lands before the first rebuild leaves its message queued forever, and turning Auto Connect on after a Disconnect or a failure never connects
status: open
severity: high
area: runtime / WebSocket (noodl-runtime/src/nodes/std-library/agent/websocket.ts `rebuild` :791-834, the identity short-circuit :800-802)
found: P107 NSP-018 s77, 2026-10-10 — writing the node's rules in words
kit: node-spec
evidence: read on the runtime 2026-10-10 — websocket.ts :800-802 `if (existing && !identityChanged(existing.getConfig(), internal.config)) return;` (`identityChanged` compares url and protocols only); :224-235 the Auto Connect setter schedules a rebuild; :166 `autoConnect = true` at initialize; :397 Send calls `getConnection()`, which builds a `new WebSocketConnection` in state `idle` (websocket-connection.ts :300) without connecting, and its `send` queues when not open (:580-608, `queue` is the default policy); :831-833 the only auto-connect call for a fresh node sits after the short-circuit; `disconnect()` (:496-530) leaves the object in state `closed`, not disposed. The spec says the same (packages/nodegx-node-spec/src/nodes/websocket.ts `rebuild` :339-358)
---

The rebuild is scheduled by any of URL, Protocols and Auto Connect, and starts with the identity short-circuit (websocket.ts
:800-802): when a connection object exists and its url and protocols match the node's, nothing happens — the comment says
this keeps "a queued message, a connection in progress" from being thrown away. It also throws away Auto Connect, in two
cases a person reaches:

**(a) A Send before the first frame-end rebuild.** The URL arrives (setter schedules the rebuild for after inputs), and a
Send in the same frame runs first: `getConnection()` (:397) builds the connection object with the url, idle, and `send`
queues the message (`queue` is the default When Disconnected). The frame-end rebuild then finds an existing object whose
identity matches and returns at :802; the auto-connect at :831-833 is never reached. Connected stays false, the message
stays queued, Queue Size says 1, no error, nothing on On Error — the "silent landing on idle" the same function's comment
(:806-808) says this node exists to prevent. A Connect signal, or a URL change, is the only way out.

**(b) Auto Connect turned on after a Disconnect or a failure.** `disconnect()` sets the object to `closed` and keeps it (not
disposed); the give-up branch leaves it at `error`. Turning Auto Connect on (:232-234) schedules a rebuild, which returns
at :802 because the identity has not changed. The port's own description (:227) — "Connect as soon as a URL is available,
without waiting for a Connect signal" — is false here: a URL is available and nothing connects.

**Why no test saw it:** the spec's `rebuild` (websocket.ts :339-358) is the runtime's line for line, including the
short-circuit, so conformance agrees by construction. No scenario sends before the first settle, and no scenario flips
Auto Connect on over a closed connection; the generated sequences start from a fresh node and do not reach (a) because
`mount` settles before the first signal.

**Why it matters now:** NSP-018's words for the Auto Connect and Send reducers would have to say "…unless a Send got there
first" and "…unless a connection object already exists", which is the defect read out loud rather than a rule.

**Proposed answer:** the short-circuit should keep the object and still honour Auto Connect: when the identity is unchanged
and `internal.autoConnect && internal.config.url` and the existing state is `idle`, `closed` or `error`, call
`connect()` on the existing object (its queue, and so the Send's message, survives, which is what the short-circuit was
protecting). `connecting` / `open` / `reconnecting` stay untouched. A small runtime change; the spec's `rebuild` gains the
same arm with its own `says`, `version` up with a `changes` entry naming this row (NSP-010). Regressions when fixed, in
`packages/nodegx-node-spec/scenarios/net.noodl.WebSocket.json`: "a Send in the frame the URL arrives: the message is queued,
the frame-end rebuild connects, and the message goes out on open (row C158)" and "Auto Connect turned on after a Disconnect
connects to the same URL (row C158)".
