---
id: P112-OWN008-AUDIT
title: "Installing the kit reports six npm audit advisories (three high), through `chokidar` in `@nodegx/preview` and `fast-xml-parser` in `@nodegx/node-spec`"
status: open
phase: P112
task: OWN-008
severity: low
area: "`@nodegx/preview` (`chokidar@^3`, which pulls `braces`), `@nodegx/node-spec` (`fast-xml-parser@^4`)"
found: P112 OWN-008, 2026-10-18 (the strangers' reports)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/blocks/REPORT.md (question 16)
kit: preview
---

`npm audit` in the blocks stranger's editor folder, with the kit from the registry: 6 advisories (3 moderate, 3
high), all through the kit's dependencies. The editors bind to 127.0.0.1, so none is reachable from outside here. A
person's `npm install` prints them all the same.

**Fix shape:** move `chokidar` to 4 (no `braces`) and `fast-xml-parser` to its current major. Re-run `npm audit` on a
fresh install of the four kit packages.
