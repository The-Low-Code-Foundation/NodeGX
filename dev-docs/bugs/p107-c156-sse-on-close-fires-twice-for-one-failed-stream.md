---
id: P107-C156
title: Server-Sent Events — On Close fires twice for one failed stream: once when the connection fails for good, and again on the Disconnect that follows
status: open
severity: medium
area: runtime / Server-Sent Events (noodl-runtime/src/nodes/std-library/agent/sse-connection.ts `disconnect` :763-766; sse.ts `handleState` :690)
found: P107 NSP-018 s77, 2026-10-10 — writing the node's rules in words
kit: node-spec
evidence: read on the runtime 2026-10-10 — sse-connection.ts `_fail` :907-914 (fatal: `_closeTransport()` then `_setState('error')`), `_setState` :841-845 (notifies on every change), `disconnect` :763-766 (`if (wasActive || this.state !== 'closed') this._setState('closed')`), sse.ts :690 (`if (state === 'closed' || state === 'error') this.sendSignalOnOutput('onClose')`); the spec says the same (packages/nodegx-node-spec/src/nodes/sse.ts `disconnect` reducer :938-955, the arm at :951)
---

A stream that fails for good — a fatal `_fail` (no URL, a non-text Event Types, the give-up branch after Max Retries) —
goes `error`, and `handleState('error')` fires **On Close** (sse.ts :690: `'error'` is terminal, "a Close handler must
run whether the stream stopped cleanly or not"). A **Disconnect** after that finds no transport and a state of `error`:
`wasActive` is false, but `this.state !== 'closed'` is true (sse-connection.ts :766), so the connection is marked `closed`,
`_setState` notifies (:844), and `handleState('closed')` fires **On Close a second time** for the same stream. The Disconnect
itself reports Unchanged (it closed nothing), while the wire gets a second close.

**Why no test saw it:** the spec mirrors the runtime arm for arm. Its `disconnect` reducer (sse.ts :949-953) carries the
rule in words — "a connection that already failed for good: it is marked closed — Connection State closed, Connected,
Retry Count, and On Close once more; Unchanged" — so runtime conformance agrees by construction, and the phrase "once
more" is the spec recording the double signal, not grading it.

**Why it matters now:** NSP-018 writes the rule for agents (`get_node_type` rules). "On Close once more" is now a published
sentence; a counter, a toggle or a "show the reconnect button" wired to On Close runs twice for one failure. The sibling
WebSocket connection decided the opposite on purpose: its `disconnect()` (websocket-connection.ts :496-530) "deliberately
excludes `idle`/`closed`/`error`, so disconnecting twice does not emit On Close twice" — a Disconnect on a failed WebSocket
sets `closed` and emits status only, no On Close. The two stream nodes disagree on the same case.

**Proposed answer:** make the SSE `disconnect()` match the WebSocket's — the `error → closed` bookkeeping transition on a
Disconnect changes Connection State (and Connected, Retry Count, as it does today) but does not re-fire On Close; the
runtime's `handleState` would need the state change without the signal (a flag on the callback, or `disconnect()` emitting
status directly as the WebSocket connection does), and the spec's :951 arm loses its "On Close once more". A small runtime
change plus a spec `version` bump with a `changes` entry naming this row (NSP-010). Regression when fixed:
`packages/nodegx-node-spec/scenarios/net.noodl.SSE.json` "a Disconnect after a fatal failure marks the stream closed and
fires On Close no second time (row C156)".
