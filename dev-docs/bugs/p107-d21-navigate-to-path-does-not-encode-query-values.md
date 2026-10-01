---
id: P107-D21
title: Navigate To Path does not encode Query values — a value with & or # breaks the URL
status: needs-ruling
severity: medium
area: runtime / Navigate To Path (viewer)
found: P107 NSP-015 s17, 2026-10-01
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
