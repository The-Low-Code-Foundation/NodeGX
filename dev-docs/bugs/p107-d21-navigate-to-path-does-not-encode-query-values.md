---
id: P107-D21
title: Navigate To Path does not encode Query values — a value with & or # breaks the URL
status: fixed
commit: 9404f00c4
phase: P109
task: ISL-028
severity: medium
area: runtime / Navigate To Path (viewer)
found: P107 NSP-015 s17, 2026-10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/PageStackNavigateToPath.json "Query with the path type: … a null value is left out, a value with & is encoded (v2, D21)" and "Query with the hash type: … (v2, D21)"; the API twin: packages/noodl-viewer-react/tests/isl-028-navigate-to-path-api-query.test.ts
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1c, §6.2
---

Navigate To Path appends each Query value as `name=value` with no encoding: a value `a&b` becomes two
parameters (`?sort=a&b`), and with the default Hash URL type a value holding `#` moves the start of the
hash, so the router reads the wrong page (`?q=a#b#/list`). A `null` value is appended as `q=null` —
the description says only that a parameter "left unset is omitted".

Where: `navigate-to-path.ts` :183-184 (`q + '=' + internal.query[q]`); `api/navigation.ts` :70-73 does the same.

Reproduce: `scenarios/PageStackNavigateToPath.json`, "Query with the path type: … a null value is
appended as 'null', a value with & is not encoded" (the spec follows the runtime).

Proposed: `encodeURIComponent` both name and value (and read `null` as unset). A behaviour change to
every URL a project with Query values builds; ships alone, with the router's reading checked.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Encode, and skip null".** Any text travels safely and arrives unchanged, because the router already decodes what it reads. It changes every address with query values, and an author who encoded values by hand would see them encoded twice. The question as asked: *"Should Navigate To Path encode query names and values, and leave out a value that is null?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 9404f00c4 (P109 ISL-028, 2026-10-06), as ruled.**
