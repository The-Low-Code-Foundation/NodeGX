---
id: BETA-S9-WALKSEEN
title: Any MCP write counted every component in the project as read at that moment, so what_changed_since compared the person's Studio edits against a baseline taken after them and said nothing had changed
status: fixed
commit: 4df2370f8
severity: medium
area: mcp / `packages/noodl-mcp/src/project/ProjectStore.ts` `readComponent` (snapshot + `remember`), called by the write path's project walks (`validate.ts` `authoredProjectViews` and the visual predicate, `project/nodeIds.ts` `idsInUseElsewhere`, `project/pageRegistration.ts`, `tools/author.ts` `projectVisualPredicate`) and nine read-only walks
kit: mcp
regression: packages/noodl-mcp/tests/betaS9WalkSeen.test.ts "🔴 a write to another component between the edit and the question still lets it be named"
found: the Beta sweep s9, 2026-10-25, profiling BETA-S8-SEE001TIMEOUT (82 `componentRevision` hashes and `structuredClone`s inside one `update_component`)
evidence: get_component Card → the person edits Card on disk → update_component Pages/Home → what_changed_since answered `changed: []` (and counted 3 components read); with no write between, it answered `changed: ["Card"]`
---

`update_component` checks a write against the whole project, and those walks read every other component through
`ProjectStore.readComponent`, the read-before-write door: it takes a drift snapshot, hashes the files and records them
as SEEN for `what_changed_since` (P125 CCN-002). So any write moved every component's "last read" to that moment.
The person edits a page in Studio, Claude writes somewhere else, Claude asks what the person changed: nothing.

**When a person meets it:** working beside Claude in Studio (P125), the agent is told to call `what_changed_since`
after a hold or a refused write. After any write of its own in between, the answer leaves out what the person did.

**Fixed (s9).** `ProjectStore.peekComponent`: the files, resolved and refused exactly as a read is, with no snapshot,
no revision hash and nothing remembered. The 13 walks that check against the project rather than read for the agent
use it (validation views and visual predicate, id deconfliction, page registration's scan, the skeleton-page checks,
`get_project_info`'s root search, `search_nodes`, the review graph, the mini editor's two counts, Studio's burst scan,
the project-settings lookup). `read_graph` keeps `readComponent`: it shows the agent every component, which is a read.
Page registration still reads App before it writes App's router, which is a real write.

Graded: `tests/betaS9WalkSeen.test.ts` red 2 of 3 on HEAD's `src` (the control green both ways) → 3/3. Side effect,
measured: `update_component` on the training template 2.5 s → 0.66 s with the CatalogIndex memo
(BETA-S8-SEE001TIMEOUT), `create_component` 1.57 s → 0.16 s.

**Plain words:** *"After Claude saved anything, asking it what you had changed in Studio could come back empty."*
