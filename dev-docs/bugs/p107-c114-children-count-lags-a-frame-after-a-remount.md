---
id: P107-C114
title: A Component Stack mounted again at a frame sends no Children Count in that frame — the page it builds is counted a frame late
status: fixed
commit: 4e2d846d5
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack and react-component-node.ts (`scheduleUpdateChildCountAndIndicies` :1670-1680): in a frame whose paint mounts the stack, the count update scheduled by that frame's `addChild` / `removeChild` runs a frame later
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; measured on the runtime target (probes V2, W1, W2: Stack Depth and Top Component Name in the frame, Children Count in the next); the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "a stack with no components, remounted with Components in the same frame: its start page lands at that frame's yield, Children Count 1 with it (v16, row C114)"
---

**What a person sees.** A Component Stack whose Mounted is turned back on rebuilds its start page; Top Component Name and Stack Depth
change in that frame, but Children Count only in the next, so anything wired to it is a frame behind (and in the frame between,
disagrees with Stack Depth).

**Where.** Not read to the line: measured. A stack mounted at the placing or at a person's act counts its pages in the frame they
land; one mounted at a frame's paint does not, for anything that frame did.

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** Read why the count update scheduled in the mounting frame waits (the stack's `scheduleAfterInputsHaveUpdated`
callbacks while its React component mounts), and run it in that frame.

**Fixed 2026-10-09 (P109 ISL-048 s33, `4e2d846d5`).** Why it waited: React mounts the stack as the frame commits, so its reset
finishes after the frame's last update; `addChild` queued the count (`scheduleAfterInputsHaveUpdated`), which ran at the node's next
update. The reset now counts its pages beside Stack Depth (`updateChildCountAndIndiciesNow`, on success and on every failing exit),
and the queued count runs only when a child changed since — one send, measured. Page Stack spec v16; three scenarios renamed, one
added (remounted with no Components: 0 with Stack Depth 0). Control red on exactly the four.
