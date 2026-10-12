---
id: P107-C57
title: Server-Sent Events — Event Types or Method wired a value that is not text throws when the stream connects
status: fixed
commit: dc72bb806
phase: P109
task: ISL-026
severity: low
area: runtime / Server-Sent Events (`agent/sse.ts` :172-174, :217-219 keep `value || …`; :626-631 `.split`; `agent/sse-connection.ts` :419 `.toUpperCase`)
found: P107 (the node says what it does) s34, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.SSE.json "Event Types wired a number: read as text (C57)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.40–§6.42 (row C57); scenarios "Event Types wired a number…" and "Method wired a number…" (packages/nodegx-node-spec/scenarios/net.noodl.SSE.json, `row`), known on the runtime; 16–22 of 200 generated sequences per seed
---

Two setters keep whatever they are handed when it is truthy: Event Types stores `value || ''`, Method stores
`value || 'GET'`. Connecting then treats both as text: `eventTypes.split(',')` and `method.toUpperCase()`. A number (or an
object) wired into either makes the Connect THROW a TypeError — out of the Connect signal, or out of the frame end when Auto
Connect is on, or out of a reconnect timer for the method.

Measured on the runtime: `internal.eventTypes.split is not a function` and `(options.method || "GET").toUpperCase is not a
function`.

**Plain words:** *"If something wires a number into the SSE node's Event Types or Method, the node crashes when it
connects instead of ignoring it. Should it just turn the value into text, like the URL input already does?"*

**Proposed:** `String(value)` in both setters (the URL setter already does this, sse :134). The spec reads both as text.

**Ruling:** R3 (a) — the runtime wins until Richard rules; the throw is a known row (conformance.test.ts `sseNonText`).

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Turn them into text".** The node connects as it does for URL. A wrong value then fails as a normal connection error instead of a crash. Two one-line changes. The question as asked: *"Should Event Types and Method turn what they receive into text, as URL already does?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), as ruled.** Event Types and Method keep `String(value)`, as URL does. Runtime 200: conforms 71 / 71. Control: both C57 scenarios fail on HEAD's file.
