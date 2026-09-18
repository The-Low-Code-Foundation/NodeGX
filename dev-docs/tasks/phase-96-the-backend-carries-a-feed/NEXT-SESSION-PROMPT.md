# Phase 96 — next session

Shaped per [PHASE-EXECUTION.md §3](../../guidelines/PHASE-EXECUTION.md): the board, the next task,
the end condition, the register.

## 1. The board (re-derived from the task FILES, 2026-09-18 after s2)

| task | state |
|---|---|
| FED-001 Parse XML / Parse Feed | ✅ **CLOSED (s1).** Six ACs green; bundle delta +14.8 KB gzipped vs a 50 KB budget |
| FED-002 Indexes a collection declares | ✅ **CLOSED (s2).** Seven ACs green; 40 specs across two suites; `EXPLAIN QUERY PLAN` names the index and 20k rows answer in 0.04 ms against a control's 8.92 ms |
| FED-003 A function calls a model | ⬜ never built |
| FED-004 A schedule does not trip over itself | ⬜ never built |
| FED-005 A backend speaks MCP | ⬜ never built |
| FED-006 The drive | ⬜ never built |

**All four rulings are in** (README §4): visible nodes + a proven library; one `Model Request` node
with a provider dropdown; MCP stays in this phase and is built last; this phase runs beside 94/95.
**Nothing is gated on a ruling.**

## 2. The next task to build

**FED-003 — a function calls a model.** Nothing is outstanding from FED-002 and no register entry
blocks an AC: build it.

⚠️ **One thing to settle first, because it is a ruling and it covers three node types at once:**
R4 below. FED-001's `Parse Feed` and `Parse XML` have no row in the export coverage ledger, which
reddens `noodl-mcp`'s `fld013ExportReach`, and `Model Request` will need one too. Put the question
to Richard in the same breath as anything else this session needs from him.

`Model Request` as a cloud node — key read through `Secret`, structured JSON out, usage counted, no
SDK (the cloud runtime is a single prebuilt bundle with no `node_modules`, so the call is `fetch`
against the provider's HTTP API and nothing else). R2 is ruled: **one node with a `provider`
dropdown**, `anthropic` implemented, anything else failing with `not_implemented`, so no graph built
now is ever rewired.

**Read first, in this order:**

1. 🔴 **README §7 rule 5 — `Model Request` is a NEW NODE TYPE, so it owes four regenerations, and a
   per-package test run sees NONE of them.** In order:
   `npm run catalog:generate` → `npm run catalog:merge` → `npm run docs:nodes` →
   `CHR007_WRITE_SNAPSHOT=1 npx jest tests-unit/chr-007/widgetDispatch.test.ts` (from
   `packages/noodl-editor`), then `npm run test:main` before committing. FED-002 only added a
   *port* to an existing node and still owed the first four; a new type also owes
   `tests-unit/alpha-006/nodeDocs.test.ts` a docs page on disk.
2. `packages/noodl-viewer-cloud/src/nodes/cloud/secret.ts` — how a cloud-only node reaches a
   process-global resolver (`_noodl_secret`), which is the exact idiom a model key must use, and
   README §7 rule 3: the key is never a port value, an inspector line, a log line or an execution
   record field.
3. FED-002 §5.2 decision 3 — the Record family's `Error` port is a `string`. If `Model Request`
   wants to hand back a structured refusal (rate limit vs. bad key vs. refused content) it needs
   its own output ports for it, decided up front rather than discovered.

## 3. The phase's end condition

README §8: FED-006 green on a fresh backend with one `nodegx-backend` process and nothing beside
it, and Richard has ruled the execution record legible. Distance: FED-003 through FED-006.

## 4. The register

| | finding | owner |
|---|---|---|
| R1 | **A feed graph that wires only the parser's `Failure` hangs for the full function timeout when the FETCH is what failed** (CWF-018). Found by FED-001's drive suite: 30 s, then 504. Not a FED-001 defect — CWF-018 owns the missing function timeout — but it is the shape every feed graph will be drawn in, so it is documented as a pattern on both nodes and wired in both worked examples. FED-002's drive hit it again and wired both Response nodes for the same reason. **Re-read when FED-004 touches polling.** | CWF-018 |
| R2 | The scoping session's `fast-xml-parser` figure ("MIT, no dependencies, ~40 KB") was wrong at every version and was repeated to Richard when R1 was put to him. Corrected in place in FED-001 §3.1 with the measured numbers. **No action** — recorded because the ruling was taken on the wrong number and still stands on the right one. | — |
| R4 | 🔴 **A new node type owes `packages/noodl-mcp` too, and nothing this phase has run could see it.** Re-measured at s2 (not relayed): `npx jest` in `packages/noodl-mcp` gives **8 failed suites, 9 failed tests, 121 passed**. One names this phase's work: `tests/fld013ExportReach.test.ts` — *"classifies all 143 of them"* now finds `net.noodl.ParseFeed` and `net.noodl.ParseXML` unclassified against `exportInfoOf`, whose ledger is `packages/nodegx-export/coverage-ledger.json` and whose gate (`export-ledger:check`) refuses an unclassified type. **The other seven** (`cmp004Parts`, `cn004`, `nodeDocBudget`, `nodeIdAllocation`, `cmp001InterfaceDoctrine`, `d54ThemePresetIdentity`, `def038SettledTemplates`) **I did not attribute** — a peer session relayed that they also fail with the in-flight style edits reverted, which is their measurement and not mine. 🔴 **The fix needs a RULING, not a copy-paste.** The ledger's two non-translated phrasings are *"scheduled — "* (a commitment with a tier) and *"deliberately out of scope — "* (a decision somebody made); the sibling `net.noodl.ParseCSV` carries the second, worded as **Richard's own ruling of 2026-09-03** ("CSV import — unlikely to be popular"). Extending that to feed and XML parsing is his call. **Ask it once and it covers three** — FED-003's `Model Request` will need a row too. | this phase (FED-001's debt), pending a ruling |
| R3 | 🔴 **`id` is a reserved property name at the adapter layer, in three places and nowhere written down.** (a) It is never AUTO-created as a column — `AdapterFacade.ensureImportShape` and `LocalSQLAdapter.create`'s auto-add loop both skip it, alongside `objectId`/`createdAt`/`updatedAt`/`ACL`; importing 20,000 feed-shaped rows into an undeclared collection rolled back entirely with `table Control has no column named id`. (b) It cannot be CHANGED — `QueryBuilder.buildUpdate` deletes `data.id` as a protected field, so a `PUT` with a new `id` answers **200 and writes nothing**. Both measured by FED-002's drive and both pinned as specs in `fed-002-indexes.test.ts`. Historical and defensible (`id` is the Model layer's alias for `objectId`) but undocumented, and it lands on this phase's path — `Parse Feed`'s identity output is called `id`. **Does not block FED-002 or FED-006:** a declared `id` column is written on create and matched on by the upsert, and an upsert never changes its own match key. **Re-measure before FED-006 writes items into a collection it created on the fly, or tries to correct an item's id.** | unowned — file against the adapter if FED-006 trips on it |
