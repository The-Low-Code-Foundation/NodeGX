---
id: P107-C56
title: Server-Sent Events — Last Error, Retry Count and Duplicates Suppressed change without being sent, so the wire shows stale values
status: fixed
commit: af96a5310
phase: P109
task: ISL-030
severity: low
area: runtime / Server-Sent Events (`agent/sse.ts` :663-719 — only `handleState` and `handleError` flag status outputs; `agent/sse-connection.ts` :842-847, :902-931, :854-863)
found: P107 (the node says what it does) s34, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.SSE.json "Dedupe By Id drops a replayed id and counts it on Duplicates Suppressed (v2, C56); …" (and the retry scenarios: "A 500 retries with backoff; …", "A stream interrupted mid-way retries and resumes from the last id")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.40–§6.42 (row C56); scenarios "A 429 is retried" and "A stream interrupted mid-way retries and resumes from the last id" (packages/nodegx-node-spec/scenarios/net.noodl.SSE.json), passing on the interpreter AND the runtime — the spec states the runtime's reading
---

The node sends its status outputs only from two places: a state change (Connection State, Connected, Retry Count) and an
error (Last Error, Retry Count, Duplicates Suppressed). Three values move outside those moments, so what a wire holds is
not what the node holds:

- **Last Error after a reconnect.** When a retry opens the stream, the connection clears its last error, but nothing sends
  Last Error. Measured: after "The event stream was interrupted: terminated" and a successful retry, the wire still says
  that sentence beside Connection State `open` and Retry Count 0.
- **Retry Count during an outage.** A failure sends Retry Count BEFORE the count goes up. The state change that follows
  would send it again, but the state is already `reconnecting`, so nothing does. Measured with three 429s and Max Retries
  2: the wire says 1 while the connection has failed twice; it catches up only at the give-up.
- **Duplicates Suppressed.** A replayed id is dropped and counted silently. The count reaches the wire only at the next
  error.

The inspect panel reads the live values, so it and a wired Text node disagree.

**Plain words:** *"When the stream reconnects after an error, the 'Last Error' box still shows the old error, and the
retry counter lags one behind while it keeps failing. Should those boxes update the moment the values change?"*

**Proposed:** send Last Error and Retry Count in `handleState` too, and Duplicates Suppressed when a duplicate is dropped
(the connection's `onDuplicate` hook already exists, conn :861). A behaviour change, so the spec would go to v2.

**Ruling:** R3 (a) — the runtime wins until Richard rules. The spec states the runtime's reading.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Send them when they change".** Last Error clears on reconnect, Retry Count is current, and Duplicates Suppressed counts as it goes. A small change in one node. Wires get a few more updates. The question as asked: *"Should these three outputs update the moment their values change?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed af96a5310 (P109 ISL-030, 2026-10-06), as ruled.** An open sends the Last Error it cleared; the connection reports a retry count that moved (`onRetry`, after the increment); the node passes the `onDuplicate` hook, so Duplicates Suppressed is sent as it counts. Server-Sent Events v2.
