---
id: P107-D28
title: Cloud Function — Error carries an object when the backend's error field is one
status: fixed
commit: 68e0cd9a7
phase: P109
task: ISL-030
severity: low
area: viewer / Cloud Function (`cloudfunction2.ts` :324-327 — `(e && e.error) || …`)
found: P107 (the node says what it does) s32, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/CloudFunction2.json "an error object with a message: Error is the message (v2, D28)" (and "… an object in the error field becomes text — its message, or the object as JSON (v2, D28)")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.34–§6.36 (row D28); scenario "a JSON string body on a failure is Error as it is; an object in the error field stays an object (D28)" (packages/nodegx-node-spec/scenarios/CloudFunction2.json)
---

On a failure, Error is the body's `error` field whenever it is truthy (:324-327). The port is typed `string` and
described as "Why the last call failed", but a backend that answers `{ "code": 141, "error": { "reason": "…" } }`
puts the OBJECT on Error — a Text node wired to it shows `[object Object]`.

Upload File has the same shape (its Error is the envelope itself when the envelope has no `error`, NSP-014 §6.28) — a
family habit, not a one-off.

The spec states the runtime's reading (v1: Error is what the runtime puts there), so this is a description/type row, not
a divergence.

**Plain words:** *"When a cloud function fails with a structured error, the Cloud Function's Error output can be an
object instead of a sentence, so it shows as `[object Object]`. Should Error always be text (the object's message, or
its JSON)?"*

**Proposed:** Error is `typeof e.error === 'string' ? e.error : JSON.stringify(e.error)` (or the object's `message`
when it has one). A spec v2.

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Always text".** Error is the object's message when it has one, or the object written out as text. A small change. A graph that read fields off the Error object would lose them. The question as asked: *"Should Error always be text?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 68e0cd9a7 (P109 ISL-030, 2026-10-06), as ruled.** Error is always text: an object's `message` when it has one, else the object as JSON (`errorText`). Cloud Function v2.
