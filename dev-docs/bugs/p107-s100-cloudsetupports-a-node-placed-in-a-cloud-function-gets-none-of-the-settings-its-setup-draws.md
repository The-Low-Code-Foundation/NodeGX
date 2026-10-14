---
id: P107-S100-CLOUDSETUPPORTS
title: A node placed in a cloud function in the editor gets none of the settings its module's setup() draws — a new Aggregate Records has no Class, Property, Filter or Do; a new Query Records has no Class or Filter
status: fixed
severity: high
area: editor / cloud components' ports (`noodl-editor` `models/nodelibrary/NodeLibraryImporter.ts` WFA-001 — the cloud library is a static snapshot, `cloud-node-library.json`; `models/nodelibrary/cloudDynamicPorts.ts` derives only the wire families SB-017 needed: `in-`/`out-`, `prop-`/`acl-`, `qp-` + Do on Query Records)
found: P107 s100, 2026-10-13 — driven in the dev editor while fixing P107-S99-AGGCOLUMNS / -AGGFILTERPREFIX, whose editor halves live in `aggregatenode.js updatePorts`
evidence: on a copy of lepetitpicnic_local_backend's test project (`s100-aggdrive`), in `/#__cloud__/Records and Objects/Aggregate`, nodes made with `NodeGraphNode.fromJSON` + `addRoot`, read with `getPorts()` and the property panel (screenshots in the s100 scratchpad). A new Aggregate Records (`collectionName: TestQuery`, `aggregates: Total`): ports `fetched, failure, error, aggregates` only; the panel shows the Aggregates list and nothing else. A new Query Records in the same cloud function: outputs, `storageFetch`, `qp-min` (SB-017's derivation fires) — no `collectionName`, no `visualFilter`. CONTROL: the same new Query Records in the front-end component `/Tests - Records`: `collectionName, storageFilterType, search, storageEnableLimit, storageFetch, runOnChange-*, realtime, storageEnableCount, visualFilter, visualSort`. And the project's three saved Aggregate nodes keep their 10 / 7 / 10 SAVED dynamic ports, but writing `aggregates: 'AvgAge,Names,Extra'` on one drew no `aggprop-Extra` (4 s): nothing recomputes them
regression: packages/noodl-editor/tests-unit/nsp-020/cloud-spec-ports.test.ts
kit: node-spec
commit: b9d251edc
phase: P107 (NSP-020, R37)
---

Since WF-007 deleted the hidden cloud-runtime window there is no runtime client for cloud components, so no cloud node's
`setup()` hook ever runs in the editor (`NodeLibraryImporter.ts` says so; `cloud-node-library.json` is declared ports only).
SB-017 (`0236a696`) restored the families a WIRE needs, so a deploy stopped dropping connections — not the settings a person
picks from: Class, Filter, Sort, an aggregate's Property and Operation, and the rest. An old project keeps the ports it saved
while the cloud runtime still ran; a node placed today, or a setting changed today, draws nothing.

Reach, by code: 15 types in the cloud library carry a `setup()` that calls `sendDynamicPorts` with a literal name (RunTasks,
REST2, Expression, JavaScriptFunction, Logic Builder, Model2, Filter Collection, Set Variable, Component Object, String Format,
User, cloud Request, cloud Response, Aggregate Records, HTTP); Query Records and the Record family are on top of those (their
names are not literals). Some may be covered by `dynamicPortRules.ts` — not checked per type. Measured on two: Aggregate
Records and Query Records.

Why it is P107's: NSP-020's sentence is "an editor can draw every port of every node from the spec alone, without a viewer
running", and a cloud function is the one place the editor has no viewer at all. Every spec already draws its ports
(`portsOf` / `drawnPorts`, oracle (a) graded against the runtime's hooks). A ruling picks the route: the editor draws a cloud
node's ports from its spec, or runs the cloud modules' `setup()` hooks against a fake connection (as
`tests-unit/sb-017/cloud-ports-agree-with-the-runtime.test.ts` does), or extends `cloudDynamicPorts.ts` type by type.

The P107-S99-AGGCOLUMNS and -AGGFILTERPREFIX editor halves were fixed in `aggregatenode.js updatePorts` (s100), and that code
runs nowhere in the editor today: it reaches a person only through this.

**Ruled R37 (s100): "From the node specs."** The editor draws a cloud node's settings from its spec; measure the build first.

**Fixed s101 (R37 built, NSP-020 §6.13).** `models/nodelibrary/cloudSpecPorts.ts` draws 24 cloud types' settings from
`drawnPorts(spec, params, context)` in the editor's port shape; merged into `CloudDynamicPortsAdapter` (one writer per node:
the spec's ports, then SB-017's family ports, then any SAVED port a wire uses). Graded: oracle (a) fires each type's hook and
lays it over the spec's draw, enums and panel fields included (350 / 350); the editor's draw equals the hook's announcement
port by port for Aggregate, Query Records and Update Record (17 / 17). Driven on a copy of this project: a new Aggregate
Records shows Class, Filter, the Aggregates list, the Filter builder and each aggregate's Property and Operation; a new Query
Records draws the front-end control's 13 inputs; `aggregates: 'AvgAge,Names,Extra'` on a saved node draws `aggprop-Extra`.
Left, named: a type with no spec or an ungraded draw (Component Inputs / Outputs, RunTasks, REST2, Component Object and its
setter, On App Error; HTTP Request), and the Javascript filter's variable ports (P107-S101-JSFILTERVALUES).
