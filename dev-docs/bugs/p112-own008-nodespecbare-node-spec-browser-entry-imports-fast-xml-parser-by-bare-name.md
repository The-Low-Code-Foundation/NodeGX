---
id: P112-OWN008-NODESPECBARE
title: "`@nodegx/node-spec`'s browser entry imports `fast-xml-parser` by bare name, so a page with no bundler can't load it"
status: open
phase: P112
task: OWN-008
severity: low
area: "`@nodegx/node-spec` build (`dist/index.mjs`, the `exports['.'].import` entry); the import comes from `src/nodes/xml.ts`"
found: P112 OWN-008, 2026-10-18 (the strangers' reports)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/blocks/REPORT.md (question 6)
kit: node-spec
---

Measured on the published 0.1.0: `dist/index.mjs` (1.9 MB) carries `import { XMLParser } from "fast-xml-parser"` (from
`src/nodes/xml.ts`). A page that loads it as an ES module with no bundler or import map fails on that import. The
blocks stranger worked out ports on its server instead. OWN-002 built this entry so the spec could run in a page.

**Fix shape:** bundle `fast-xml-parser` into the browser entry (it is small), or keep the XML node's spec free of it.
Regression: load `dist/index.mjs` in a page with no import map and call `specFor('Text')`.
