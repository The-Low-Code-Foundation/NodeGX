---
id: P18-S115-DYNPROBE
title: EXP-008's per-parameter probe never varies a dynamic port, and never reads Query Records at all
status: open
severity: medium
area: export / EXP-008 per-parameter coverage (tests/helpers/parameter-probe.ts)
found: P18 session 115, 2026-10-16, while filing P18-S115-QUERYFILTER
evidence: tests/helpers/parameter-probe.ts (varies `CatalogNode.inputs`, the static ports, of `translated` types only); coverage-ledger.json (DbCollection2 `stubbed`); dev-docs/bugs/p18-s115-queryfilter-*.md
---

The per-parameter check (`tests/parameter-coverage.test.ts`, 1,234 / 1,396 reaching, "0 gap ports") varies each
static input port of each `translated` picker node and counts a port as reaching when the export moves. Two holes:

1. **A dynamic port is never varied.** 63 of the translated picker nodes declare `dynamicPorts` (runtime-discovered
   or editor-adapter ports: a filter's value ports, a Record's `prop-*`, a script's inputs…). The probe cannot see
   them, so "0 gap ports" is about static ports only.
2. **Query Records is outside the probe.** The coverage ledger lists `DbCollection2` as `stubbed` ("the backend seam,
   by design"), an exemption written before EXP-009 connected the query to the backend; the probe reads `translated`
   types only. Its Filter, Sort and Limit were silently dropped until session 115 (P18-S115-QUERYFILTER), and nothing
   measured it.

Proposed: re-status Query Records as `translated` (its query is real code now), and give the probe a dynamic-port
arm: for each translated node with `dynamicPorts`, the ports the runtime's own `updatePorts` / the editor adapter
declares for a corpus instance, varied the same way. Measure how many reach before claiming a number.
