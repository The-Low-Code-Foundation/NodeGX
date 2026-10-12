---
id: P107-C157
title: Server-Sent Events — a replayed older event id moves the resume point back silently: the next reconnect asks for events it has already had, and Last Event Id on the wire stays stale until the next delivered event
status: open
severity: medium
area: runtime / Server-Sent Events (noodl-runtime/src/nodes/std-library/agent/sse-connection.ts `_onFrame` :861-868; sse.ts `onDuplicate` :654)
found: P107 NSP-018 s77, 2026-10-10 — writing the node's rules in words
kit: node-spec
evidence: read on the runtime 2026-10-10 — sse-connection.ts :863 `this.lastEventId = frame.id` runs before the dedupe check at :864 (`!this._recentIds.add(frame.id)` → `duplicatesSuppressed++`, `onDuplicate`, return); `_openTransport` hands `lastEventId: this.lastEventId` to the transport (:815) and the fetch transport sends it as `Last-Event-ID` (:454); sse.ts :654 `onDuplicate: () => this.flagOutputDirty('duplicatesSuppressed')` only, `lastEventId` is flagged on the delivered path alone (:724). The spec says the same (packages/nodegx-node-spec/src/nodes/sse.ts `onFrameArrived` :412-417; the Dedupe By Id words at :900 — "though the resume point moves to it")
---

With Dedupe By Id on (the default), a frame whose id is among the last 512 seen is dropped: Duplicates Suppressed counts it
and nothing else is told. But the resume point has already moved: `this.lastEventId = frame.id` (sse-connection.ts :863)
runs **before** the check that drops the frame (:864). The comment at :861-862 says this is deliberate ("it is still the
furthest the server has told us it has got to"), which is true only when the replayed id is the newest one. A server that
replays an **older** event — id `1` arriving again after id `2`, the at-least-once case Dedupe By Id exists for — moves the
resume point back to `1`, and the next reconnect sends `Last-Event-ID: 1`, asking for `2` and everything after it a second
time (each of which Dedupe By Id then has to drop, counting more duplicates, moving the point again).

A second half, on the node: on the suppressed path only Duplicates Suppressed is sent (sse.ts :654), while the Last Event
Id output's value has changed underneath (its getter :493 reads `conn.lastEventId` live). The wire holds the previous id
until the next delivered event flags it (:724) — the same class as row C56 (a value that moves without being sent), which
C56's "send them when they change" rule did not reach because C56 did not know the value moved here.

**Why no test saw it:** the spec's `onFrameArrived` (sse.ts :412-417) assigns `c.lastEventId = frame.id` before its own
dedupe check and sends only `duplicatesSuppressed`, so runtime conformance agrees by construction; its port words at :900
record it — "Duplicates Suppressed counts it (sent) and nothing else is told, though the resume point moves to it".

**Why it matters now:** the sentence is published to agents as the rule. Last Event Id's description (:810) says "the
furthest id the server has reported, which is the point a reconnect resumes from" — on a replay of an older id it is neither
the furthest nor what the wire shows.

**Proposed answer:** move the assignment below the dedupe check — a suppressed duplicate leaves `lastEventId` where it was
(the resume point only ever advances to a delivered event), which also removes the stale-output half since nothing moved.
If the replayed id should still count as "seen", `_recentIds.add` already does that. Spec: the same reorder in
`onFrameArrived`, the :900 words lose "though the resume point moves to it", `version` up with a `changes` entry naming this
row. Regression when fixed: `packages/nodegx-node-spec/scenarios/net.noodl.SSE.json` "a replayed older id is suppressed
and leaves Last Event Id at the newer one; the reconnect after it resumes from the newer one (row C157)".
