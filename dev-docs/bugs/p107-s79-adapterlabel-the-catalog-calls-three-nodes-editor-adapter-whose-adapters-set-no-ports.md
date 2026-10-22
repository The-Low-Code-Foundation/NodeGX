---
id: P107-S79-ADAPTERLABEL
title: The catalog says Router, Query Records and Filter Records get their ports from an editor adapter — their adapters set no ports
status: open
severity: low
area: catalog / dynamicPorts.mechanisms (scripts/node-catalog/lib/dynamic-port-notes.js `EDITOR_ADAPTER_TYPES` :17-23; build-catalog.js :133, :178)
found: P107 NSP-020 s79, 2026-10-10 — measuring the six `editor-adapter` nodes before designing `ports(params, context)`
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md §3.1 "Rows found by the measurement"
---

The catalog (`packages/noodl-types/src/node-catalog.json`, generated) marks six nodes `editor-adapter` — "editor-side
code that knows the node's ports" — from a hand-kept table, `EDITOR_ADAPTER_TYPES` in
`scripts/node-catalog/lib/dynamic-port-notes.js` :17-23. Read against the adapters themselves
(`packages/noodl-editor/src/editor/src/models/NodeTypeAdapters/`), three of the six set **no ports**:

- **Router** (`RouterAdapter.ts`): renames and removes `pages` entries, names routers, answers `getPageInfoForComponents`.
- **Query Records** (`QueryRecordsAdapter.ts`, ~25 lines): clears `visualFilter` / `visualSort` when the class changes.
- **Filter Records** (`FilterRecordsAdapter.ts`, ~25 lines): the same.

Their dynamic ports come from the **runtime**, through the backend schema (`noodl-runtime/src/nodes/std-library/data/
schema-ports.ts` :482-502, reading `backendServices` / `dbCollections` metadata) — the `runtime-discovered` mechanism
they are also labelled with. The other three (Page Inputs, Navigate, Cloud Function) do set ports in their adapters, as
the label says. Four adapters that DO shape ports are not listed at all: `NamedPortsAdapter` (any `namedports/list`
type), and the cloud-component trio `CloudScriptPorts` / `CloudRecordPorts` / `CloudQueryPorts`
(`CloudDynamicPortsAdapter.ts`, inside cloud components only).

**What a person sees:** `get_node_type` over MCP carries the catalog's `dynamicPorts.description` — for Query Records it
says the ports come from an editor adapter, which sends an agent (or NSP-021's census) looking in the wrong package.

**Why no gate saw it:** the table is hand-kept and nothing reads the adapters (`catalog-parity` grades specs against the
catalog, not the catalog against the editor).

**Fix (small):** make `EDITOR_ADAPTER_TYPES` the adapters that call `setDynamicPorts` / return ports — generate it from
`registeradapters.ts` plus a grep for the port-setting call, or keep the table and add a test in `noodl-editor/
tests-unit` that fails when a listed adapter sets no ports or an unlisted one does. NSP-021's knowledge census is the
natural owner; NSP-020's oracle (c) (editor adapters vs `portsOf`) needs the true list first.

**s87 (P107 NSP-021, 2026-10-11) — no longer blocks oracle (c).** Oracle (c) read the adapters that DO set ports
directly (`RouterNavigateAdapter`, `CloudFunctionAdapter`; `noodl-editor/tests-unit/nsp-020/adapter-ports.test.ts`), and
both types now draw from the spec. What the wrong label still costs: the ledger counts **Router** "no view" (its only
dynamic ports are its data attributes, which its spec draws from the params; the extra `runtime-discovered` mechanism
comes from the source-text heuristic in `build-catalog.js` `hasRuntimeDiscoveredPorts` :68-76, not read further), and
`get_node_type`'s description for Query Records / Filter Records still names an adapter. Reach of fixing it: 1 ledger
row; 0 wires in Richard's projects reach a Router dynamic port.

**Partly fixed, P112 OWN-026 FIX-01 (2026-10-22, `0b9becca8`):** DbCollection2 (Query Records) is out of
`EDITOR_ADAPTER_TYPES` and its note names the parameters that draw its ports. FilterDBModels and Router are unchanged.

