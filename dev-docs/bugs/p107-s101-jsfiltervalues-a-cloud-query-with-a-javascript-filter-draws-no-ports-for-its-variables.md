---
id: P107-S101-JSFILTERVALUES
title: A Query Records or Aggregate Records placed in a cloud function with a Javascript filter draws no input for the filter's variables ($name, Inputs.name), so they cannot be wired
status: open
severity: low
area: node spec / the Javascript filter (`packages/nodegx-node-spec/src/nodes/query-records.ts` :503-505, `aggregate-records.ts` derived.inputs — not drawn, "the Javascript filter is not in this spec"); runtime `dbcollectionnode2.ts` :1460-1487 and `aggregatenode.js` :634-660 draw `storageFilterValue-<name>`
found: P107 s101, 2026-10-13 — while building R37 (the editor draws a cloud node's settings from its spec), measured on lepetitpicnic_local_backend's saved cloud nodes
evidence: of 113 spec-drawn cloud nodes in that project, one wired port is not drawn by its spec — `/#__cloud__/Records and Objects/Relations` Query Records `efe0ef88`, `storageFilterValue-ParentRecordId`, wired. Kept by `cloudSpecPorts.ts keepWiredSavedPorts` (a saved port a wire uses survives the redraw), so that project is unharmed; a NEW node with a Javascript filter gets no variable ports to wire
kit: node-spec
phase: P107 (NSP-020, R37)
---

The runtime hook reads the Javascript filter's script and draws one `storageFilterValue-<name>` input per `$name` and per
`Inputs.name` (connections only, group Filter Values). The two specs leave the Javascript filter out (NSP-017's escape hatch),
so R37's editor draw has no such ports. Not a regression: before R37 no cloud node's hook ran in the editor at all
(P107-S100-CLOUDSETUPPORTS), so a new node never had them either; an old node's saved, wired one is kept.

The fix is a draw-only addition to both specs' `derived.inputs` (the script parsed as `JavascriptNodeParser.parseAndAddPortsFromScript`
and the `$name` match read it), graded by an oracle (a) case with a script that names both forms. Filter Records' Javascript
filter is the same question.
