---
id: P107-C159
title: WebSocket — blanking Heartbeat Reply while a beat awaits its reply leaves the pending ping set; set the reply again before the next beat and that beat declares the connection dead with a stale wait
status: open
severity: low
area: runtime / WebSocket (noodl-runtime/src/nodes/std-library/agent/websocket-connection.ts `_onHeartbeat` :874-908, `configure` :382-394)
found: P107 NSP-018 s77, 2026-10-10 — writing the node's rules in words
kit: node-spec
evidence: read on the runtime 2026-10-10 — websocket-connection.ts :884-886 the dead-check runs only `if (reply && this._pendingPingAt)` and clears the ping there; :897-902 the send path writes `_pendingPingAt` only when `reply` is truthy and never clears it otherwise; :727-735 a reply is matched only against the current (non-empty) marker, so with the marker blank no incoming text clears the ping; `configure` :382-394 copies the new `heartbeatReply` in and restarts the heartbeat (which does clear the ping, :865) only when the interval changed. The spec says the same (packages/nodegx-node-spec/src/nodes/websocket.ts `heartbeatFired` :602-622: `if (reply && c.pendingPingAt)` … `if (reply) c.pendingPingAt = this.w.now()`)
---

A heartbeat beat with Heartbeat Reply set sends the message and records `_pendingPingAt` (websocket-connection.ts :901). If
Heartbeat Reply is then blanked before the reply comes — an author tuning the node, or a wire that momentarily holds an empty
value — nothing clears the ping: the matching path (:727) compares only against the new, empty marker, so the server's "pong"
is delivered as an ordinary message instead of swallowed; the next beat skips the dead-check (`reply` is falsy, :884) and
skips the write (:900); `configure` (:382-394) does not touch the ping on a reply change. The stale timestamp survives any
number of blank beats. Set Heartbeat Reply again, and the very next beat finds `reply && this._pendingPingAt` true (:884),
declares "Heartbeat went unanswered for Nms; treating the connection as dead" with N spanning the whole blank period, fires
On Error and tears the socket down through the unsolicited-close path — a healthy connection, killed by its own tuning.

**Why no test saw it:** the spec's `heartbeatFired` (websocket.ts :602-622) keeps `pendingPingAt` under the same two
conditions as the runtime, and its `applyConfig` (:330-337) mirrors `configure`, so conformance agrees by construction.
No scenario changes Heartbeat Reply between two beats.

**Why it matters now:** NSP-018's rule for Heartbeat Reply would read "blank: no reply is awaited and none is measured"
(the config comment at websocket-connection.ts says "Empty disables both latency measurement and dead-connection
detection"), which is not what the code does for a ping already in flight.

**Proposed answer:** clear `_pendingPingAt` when the reply marker is set to empty in `configure` (the one place the knob
changes), or, simpler and local, clear it in `_onHeartbeat` whenever the dead-check is skipped because `reply` is blank
(:884, an `else this._pendingPingAt = 0`). The spec's `applyConfig` / `heartbeatFired` take the same line, `version` up
with a `changes` entry naming this row. Regression when fixed: `packages/nodegx-node-spec/scenarios/net.noodl.WebSocket.json`
"Heartbeat Reply blanked with a ping in flight and set again before the next beat: the connection stays open and the next
beat sends a fresh ping (row C159)".
