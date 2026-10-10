---
id: P107-S80-HTTPANNOUNCE
title: The HTTP node's editor announcement drops URL's default and moves Error into Events — two ports drawn differently with a viewer running
status: open
severity: low
area: noodl-runtime/src/nodes/std-library/data/httpnode.ts `updatePorts` (:1075-1592) against the registration (:311-425)
found: P107 NSP-020 s80 (L4, the module table), 2026-10-11 — oracle (a) laid HTTP's announcement over its spec
evidence: packages/noodl-runtime/test/node-spec/nsp-020-module-table.ts (the `net.noodl.HTTP` row, `known`); dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md §6.3
---

The HTTP node has two sources for the same ports, and they disagree on two of them.

- The **registration** (what the catalog is generated from, and what the editor draws when no viewer is running)
  declares `url` with `default: ''` (httpnode.ts :313-322) and the `error` output in group **Error** (:418-425).
- The **editor announcement** (`updatePorts`, sent from `setup` whenever a viewer is running locally) re-declares every
  configuration port, `url` and `error` among them: `url` with **no default** (:1457-1465) and `error` in group
  **Events** (:1583-1590).

The editor lets an announced port REPLACE the static one of the same name and plug (`NodeGraphNode.ts getPorts` →
`replaceOrAppendPorts`), so with a viewer running the property panel shows Error under Events beside Failure, and URL
without its default; with no viewer, Error under Error and URL with `''`. The cached `dynamicports` in the project file
then carries the announcement's version (P107-S79-SILENTCACHE is the same seam).

**What a person sees:** the Error output moves between two groups depending on whether the preview is open. Small, but
it is exactly the "two editors disagree" case the P112 editor suite compares field by field.

**Why no gate saw it:** nothing compared the announcement with the registration until NSP-020's oracle (a), which
compares both with the spec (`http.ts` follows the registration: `url` default `''`, `error` group Error).

**Fix (small):** make `updatePorts` copy `default: ''` onto `url` and `group: 'Error'` onto `error` (or stop
re-announcing ports the registration already declares, and announce only the ones that move). Then delete the two
`P107-S80-HTTPANNOUNCE` pins in the module table — the stale-pin check turns red until they are removed.
