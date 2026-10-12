---
id: P109-S19-LISTENERREGEX
title: "HLS-006's every-listener gate reads `world.listen('resize')` as a socket, and is red at HEAD"
status: fixed
commit: cd9d52e28
phase: P109
task: ISL-036
severity: low
area: export tests / HLS-006 (`packages/nodegx-export/tests/hls006-every-listener.test.ts:109`, `LISTENS`)
found: P109 ISL-005 build session 4, 2026-10-05 (attributing the whole nodegx-export run)
evidence: red in a clean worktree at `eac14b783` plus ISL-005 slice 4 only (slice 4 opens no socket); the three files below are committed P107 sources (`799e1c972` and earlier)
regression: packages/nodegx-export/tests/hls006-every-listener.test.ts "has no listener that is not enrolled"
---

The gate looks for code that opens a socket with `/(?:\.listen\s*\(|new\s+WebSocketServer\s*\(|new\s+WebSocket\.Server\s*\()/`.
P107's node-spec model has its own `listen`, an event subscription with nothing on the network:
`world.listen('resize')` (`nodegx-node-spec/src/nodes/screen-resolution.ts:37`), `world.viewport.listen(…)`
(`src/interpreter.ts:266`) and `viewport.listen(…)` / `location.listen(type, fn)` (`src/world.ts:2741, 2747`). The gate
lists all three files as "a new socket was opened" and tells the reader to enrol them in `ENROLLED`.

Enrolling them would record three sockets that do not exist. The fix belongs in the gate: match a server's `listen`
(a port or a path as the first argument, or a receiver that is a server), or exclude a model's own subscription API by
name. The ruling sits with HLS-006's owner (P18).

**Fixed 2026-10-10 (P109 s39, ISL-036, `cd9d52e28`).** Re-measured: red on the same three files. Fixed the narrower of the two proposed ways: the node-spec World's subscriptions (`world`/`viewport`/`location` `.listen(`) are skipped by receiver name, not enrolled by file, because a row keyed on `world.ts` would hide a real socket added there later. A server's `listen` on the same line still counts. 4/4. HLS-006 is P18's gate: they should know.
