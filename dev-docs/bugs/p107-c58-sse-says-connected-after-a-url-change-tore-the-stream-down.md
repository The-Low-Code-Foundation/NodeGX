---
id: P107-C58
title: Server-Sent Events — after a URL change with Auto Connect off, Connected stays true and Connection State "open" though the stream is gone
status: fixed
commit: 5afc27a75
phase: P109
task: ISL-030
severity: low
area: runtime / Server-Sent Events (`agent/sse.ts` :565-580 — `teardownConnection` is silent and `connectionState` is the node's own field)
found: P107 (the node says what it does) s34, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.SSE.json "Auto Connect turned off with a URL change in one frame: torn down, nothing reconnects, and it says idle — Connected false (v3, C58)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.40–§6.42 (row C58); scenario "Auto Connect turned off with a URL change in one frame: torn down, nothing reconnects" (packages/nodegx-node-spec/scenarios/net.noodl.SSE.json), passing on the interpreter AND the runtime — the spec states the runtime's reading
---

When the URL changes while a stream is open, the node tears the old stream down and reconnects only if Auto Connect is on.
With Auto Connect off it does not reconnect — and it says nothing: the teardown is silent by design, and Connection State
is a field of the node, not of the connection, so it keeps the last state it was told. Measured: Connected `true` and
Connection State `open` stay on the wire after the teardown, and a Disconnect then reports Unchanged ("nothing running").

The WebSocket node does the opposite in the same place: its rebuild sends every status output after disposing the old
connection (websocket.ts :820), so the outputs fall to `idle`.

**Plain words:** *"If you change the SSE node's URL while it is streaming and Auto Connect is off, it stops streaming but
still says 'Connected'. Should it say idle (as the WebSocket node does), or keep streaming from the new URL?"*

**Proposed:** in the teardown, set the state to `idle` and send the three state outputs, as the WebSocket rebuild does.

**Ruling:** R3 (a) — the runtime wins until Richard rules. The spec states the runtime's reading.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Say idle, as WebSocket does".** Connected becomes false and Connection State idle. The app connects to the new URL when it chooses. A small change, and the two live-connection nodes then agree. The question as asked: *"After the URL changes with Auto Connect off, what should the node do?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 5afc27a75 (P109 ISL-030, 2026-10-06), as ruled.** A URL change that does not reopen sets Connection State idle and sends Connection State, Connected and Retry Count, as the WebSocket rebuild does. Server-Sent Events v3.
