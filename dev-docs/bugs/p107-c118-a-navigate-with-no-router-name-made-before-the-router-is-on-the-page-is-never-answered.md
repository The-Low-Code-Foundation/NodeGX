---
id: P107-C118
title: A Navigate with no Router name, pressed while no Page Router is on the page, waits for good — a router registering as Main never takes it
status: fixed
commit: d85e4e6d9
phase: P109
task: ISL-048
severity: low
area: runtime / Page Router (noodl-viewer-react/src/nodes/navigation/router-handler.ts `navigate` :64 queues the name as handed; `registerRouter` :70, :82 compares it with `name || 'Main'`)
found: P107 NSP-016 s57, 2026-10-08 (the asymmetry was read in NSP-015 s19 for the ROUTE seam, never filed)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.18; recorded on the runtime target (NSP-016 s57 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Router.json "unmounted: a navigate queued under its name; mounted, a Main one replays, and a blank one too — a blank name is Main (row C118, fixed in P109 ISL-048)"
---

**What a person sees.** A Navigate fires before the Page Router is on the page (at start-up, or while the router's Mounted is off),
and its Router is blank. When the router appears it shows its start page; the Navigate never fires Done or Failure, and the page it
asked for never comes.

**Where.** The handler queues the request under the name as handed (`undefined`) and replays it when a router registers under the
same name with `===`; a router registers under `name || 'Main'`. A Navigate the editor set up names the first named Router
(RouterNavigateAdapter), so this needs a project whose routers are unnamed — the same project P109-S18 describes — or a door-written
Navigate.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** Normalise both sides the same way (`name || 'Main'` at the queue), as the Component Stack's handler does. One line.
