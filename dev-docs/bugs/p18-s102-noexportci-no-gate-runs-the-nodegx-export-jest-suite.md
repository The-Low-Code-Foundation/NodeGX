---
id: P18-S102-NOEXPORTCI
title: Nothing runs the nodegx-export jest suite — four peer commits turned it red between 1 and 12 October and nobody saw
status: open
severity: medium
area: tooling / CI (nodegx-export)
found: P18 EXP-011 session 102, 2026-10-14 (the owed whole-package jest run)
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §76.5
---

`.github/workflows/*.yml` names `nodegx-export` only for the coverage ledger (`pr.yml:289`); the package's own 115 jest
files run only when an EXP session runs them by hand. Session 102's run found five reds at HEAD that are not P18's,
each from a commit in another package that the suite grades: P107-D21's runtime fix (P18-S102-NAVENCODE), P109
ISL-032 (P18-S102-DATEHARNESS), NSP-012's graph scenarios (P18-S102-GRAPHNOSPEC), ISL-034 (P18-S102-CATALOGNAME), and
P107 s92 `dccaa77e0`, whose Parse XML message rename moved `sheet-desk/src/lib/parse.ts` without moving the HLS-001
golden (folded into session 102's regenerate, attributed by a control).

**Proposed:** a CI job (or `test:main` step) that runs `cd packages/nodegx-export && npx jest` — about 400 s on this
machine — so a runtime change that the export transcribes goes red on the commit that makes it.
