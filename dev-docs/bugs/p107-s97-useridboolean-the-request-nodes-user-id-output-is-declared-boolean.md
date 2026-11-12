---
id: P107-S97-USERIDBOOLEAN
title: The cloud Request node's User Id output is declared `boolean` but carries the caller's id (a string, or whatever objectId the backend gave)
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: cloud runtime / Request (`packages/noodl-viewer-cloud/src/nodes/cloud/request.ts` :129-137); the catalog the editor and the agent read
found: P107 s97, 2026-10-12 — writing the Request node's spec (NSP-022)
regression: packages/noodl-viewer-cloud/tests/p107-s97-userid-string.test.ts "both catalogs the editor and the agent read say string"
evidence: request.ts :131 `type: 'boolean'` beside :133 "Id of the user the session token resolved to"; measured through `CloudRunner.run`: User Id `u1`, `7` (a numeric objectId), or a random 10-character id; `nodegx-project-contract/typecasts.ts` :38-40 lets a boolean output wire into `number`, `string` and `signal` inputs
kit: node-spec
---

The port's type says it is a flag. The editor colours and casts it as one. An agent reading the catalog (`get_node_type`) is
told it is a boolean. A wire from it into a Number input carries the id as `NaN`. A wire into a signal input is allowed and
fires on the id's first truthy value. The spec (`cloud-request.ts`) keeps the runtime's declaration, R3 (a).

Not fixed: changing the type to `string` changes which saved wires are valid. R22 refuses a dead wire at both doors, so a
saved `userId → <signal>` wire would become refused. Count the saved wires from `noodl.cloud.request.userId` over the corpus
before changing it.

**Census first (the Beta sweep s6, 2026-10-25).** Every saved wire from `noodl.cloud.request` `userId` in `templates/`,
`NodeGX test projects/`, the MCP examples and the node-spec package (13,839 JSON files, 234 Request nodes, both
project formats): **106 wires, none into a signal input**. 57 + 9 + 4 into script inputs (`in-userId`, `in-callerId`,
`in-by`, …: the runtime declares every `in-` port `*`), 20 into Add User To Role's `userId`, 13 into component inputs
typed `string` (`shared/Caller learner`, `shared/Notice`), 2 into DbModel2's `modelId` (`string`), 1 into a record
field (`prop-owner`). A `string` output reaches every one of those (the cast table refuses it only a signal), so R22
refuses no saved wire.

**Fixed.** `request.ts` `userId` is `type: 'string'`; the spec `noodl.cloud.request` v3 says so with its `changes` entry
(migration none, the census in it); both catalogs regenerated (`catalog:generate`, `catalog:merge`: one line each);
golden rewritten — only its `version` moved, every trace identical (read in the file, as `--diff` says nothing for a
port type).

**Graded.** `p107-s97-userid-string.test.ts` 3/3 (the node, both catalogs, the casts): red 2/3 on HEAD's files.
`golden.js --check --type noodl.cloud.request` fresh, version rule held; node-spec golden, catalog parity, spec ledger,
ports 478/478 (the honesty-ledger control is red with or without this change: four templates' numbers rose under an
uncommitted edit of `honesty-ledger.json` that is not this session's); runtime conformance `NSP_ONLY=noodl.cloud.request`
green on the cloud target; cloud request suites 102/102; `catalog:check`, `catalog:merge:check` up to date; `catalog:examples`
114/114; editor specs naming the node 13 suites 178/178, MCP 2 suites 23/23; spec and cloud tsc clean.
