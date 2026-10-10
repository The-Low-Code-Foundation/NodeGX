---
id: P112-S6-SUITEIDS
title: "The editor suite handed an editor that mints its own ids the script's ids in later edits — no such editor could pass a fixture that names a node it adds and then uses it"
status: fixed
severity: medium
area: editor-suite / runSuite (`packages/nodegx-project-contract/editor-suite/suite.ts`)
kit: editor-suite
found: P112 OWN-006 / OWN-004 s6, 2026-10-10 — the suite's second adapter (the prototype page, `prototype/real/suite-adapter.mjs`) on the small fixture
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-006-THE-EDITOR-SUITE.md §6.2; the first run read `failed while applying the edits: there is no node "home-box" to put it in`
regression: packages/nodegx-project-contract/tests/editor-suite.test.ts "P112-S6-SUITEIDS: an editor that mints its own id even for a node the script names gets later edits in its ids" (red with the translation removed: `add_child: node "home-box" does not exist in Pages/Home`)
commit: 1a5561b79
fixed: P112 OWN-006 s6, 2026-10-10 — `inEditorIds`: before each edit reaches the adapter, every node the script named and the editor gave its own id is called by the editor's id
---

The suite's contract lets an editor mint its own ids: `apply` returns the id it gave an added node, and the
comparison matches nodes through that map. But the map was only used for the comparison. A script names the nodes
it adds (the small fixture adds `home-box`, then moves two nodes into it), and those later edits reached the editor
still saying `home-box` — a name the editor never gave anything. So any editor that mints every id, which is what
the official editor does, failed the small fixture before a single file was compared. The MCP passed only because
it keeps an id the request names; the existing "mints its own ids" test passed for the same reason (its wrapped
reference keeps a named id), so the test had a hole shaped like the defect.

Found by the second adapter ever written for the suite: the P112 prototype page, which mints ids the way a person's
editor does (`group1`, `counter2`). It would have stopped the Electron adapter (OWN-006 AC3's second half) the same way.

**Fix:** `runSuite` keeps the reverse map (script id → editor id) and translates `id`, `parent`, `from.node` and
`to.node` in each later edit through it (`inEditorIds`, exported). An `add_node`'s own `id` stays the script's request.

**Plain words:** *"The test told an editor 'put these two inside home-box', but the editor had named that box
something else, so it couldn't find it. The test now uses the editor's own names."*
