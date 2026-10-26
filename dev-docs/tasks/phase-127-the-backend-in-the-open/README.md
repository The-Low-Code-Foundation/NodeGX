# Phase 127 — The backend in the open

**Opened:** 2026-10-26, by Richard, before the full-stack run and the Beta. **Lane:** 9 on the [board](../../BOARD.md),
first in line (it carries lanes 2, 3 and 6 for the backend half of the walk).

> "Why can't we draw stuff inside the chat? Remember, the whole point of NodeGX is leaving all parts of the app open
> with the node spec so you can turn any part, front, backend DB or backend workflows into a node graph or some kind of
> visual representation. Is that not the case anymore? … We need to focus on this before the launch. Can we sort out
> the backend and workflows question before doing the full stack run? I don't want to launch a Beta app that can only
> make a couple of template app types. I want people to be able to play with it to make whatever they want."
> — Richard, 2026-10-26

> "Love it, let's scope it up on the board and start working through" — Richard, 2026-10-26, on the order below

## The claim this phase makes true

Every part of a full-stack NodeGX app, front end, data, privacy, server logic and automations, **is in the project's
files and can be drawn**, in Studio and in Studio inside the conversation, **for any app the agent builds**, not only
the templates. That is pillar one (DIRECTION §0: *the blueprint stays open*) applied to the backend.

## Where it stood on 2026-10-26 (read from the code, nothing driven; updated as tasks land)

| part | in the project's files? | drawn in Studio? |
|---|---|---|
| tables and fields | ✅ `dbCollections` | ✅ Data types, App data |
| privacy rules | ✅ `nodegx.security.json` (seeds a backend on first start; Studio writes both; the agent's tool too since BKO-001) | ✅ in a window; in the conversation **was broken** (measured, P127-BKO002-HOSTEDPRIVACY), fixed in the fake host s2 |
| cloud functions | ✅ `__cloud__/` node graphs | ❌ a step says "Runs on the backend"; the graph is never opened |
| backend workflows (WF-001) | ✅ `nodegx.automations.json` since BKO-001 (drift reported, AC6) | ❌ |
| triggers: schedule, webhook, row change (WF-005) | ✅ `nodegx.automations.json` since BKO-001 | ❌ (the map fetches `/admin/triggers` and never draws it) |
| the map | n/a | ⚠️ draws a small app, but a dozen places assume the training app (BKO-003); in the conversation it draws since BKO-002 s2 (fake host; Desktop unrun) |

Where those facts come from:
- **Workflows and triggers.** The agent writes them over `/admin/workflow-defs` and `/admin/triggers`
  (`packages/noodl-mcp/src/tools/backendTools.ts` `create_backend_workflow`, `create_backend_trigger`). The backend
  keeps them under its own data dir (`packages/nodegx-backend/src/service.ts` §2.2, §2.6).
- **The VM ship.** `deploy_to_vm` describes its folder as the app, the backend, cloud functions and access rules
  (`deployToVm.ts:8`), with no mention of workflows or triggers.
- **The map.** It is a full page (`index.html` + a top-level `app.js` on a whole-window canvas). Studio frames it at
  `/backend-map/`. Desktop allows a panel no `frameDomains`, so `hosted.js:269-290` draws "Open the map ↗" instead.
  The app preview works in the same panel because `mountPreview` fills a src-less frame with `document.write`, and that
  frame inherits the panel's origin.

## The tasks, in order

| id | task | why first |
|---|---|---|
| [BKO-001](BKO-001-WORKFLOWS-AND-TRIGGERS-LIVE-IN-THE-PROJECT.md) | Workflows and triggers live in the project's files, and a backend is a copy of them | the pillar fix; everything drawn later reads the files |
| [BKO-002](BKO-002-THE-MAP-DRAWS-IN-THE-CONVERSATION.md) | The map, and Privacy, draw inside the conversation | the "why can't we draw in the chat" answer |
| [BKO-003](BKO-003-THE-MAP-READS-ANY-APP.md) | The map reads any app, not the training app | "make whatever they want" |
| [BKO-004](BKO-004-A-CLOUD-FUNCTION-OPENS-AS-ITS-GRAPH.md) | A cloud function opens as its graph | the server logic, drawn |
| [BKO-005](BKO-005-WORKFLOWS-AND-TRIGGERS-DRAWN.md) | Backend workflows and triggers drawn, on the Workflow tab and the map | the automations, drawn |
| [BKO-006](BKO-006-BRIEFS-NOT-TEMPLATES.md) | Three full-stack briefs no template covers, by a stranger agent; then Richard's Desktop run | the proof, and the Beta's real list |

BKO-002 and BKO-003 can run beside BKO-001 (different files: Studio's `hosted.js` / the map's package versus the
backend and the MCP server). BKO-004 and BKO-005 wait for BKO-001's file shape. BKO-006 is last.

## Rulings

| id | question | state |
|---|---|---|
| R1 | Source of truth for workflows and triggers: the project's files, the backend a copy loaded from them (the rule `nodegx.security.json` already follows) | **taken 2026-10-26** ("Love it" on the plan that said so) |

## Not in it

- Editing a workflow's steps by hand in Studio. BKO-005 draws them and allows *on / off* and a schedule's time. Full
  step editing is a Studio row after the Beta, unless BKO-006 shows people need it.
- Files, auth providers, email templates and backups in Studio (SCOPE "Not in it", unchanged).
- A second backend product. One backend, `@nodegx/backend`, as today.
