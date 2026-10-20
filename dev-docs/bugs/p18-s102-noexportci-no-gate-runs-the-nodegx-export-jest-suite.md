---
id: P18-S102-NOEXPORTCI
title: Nothing runs the nodegx-export jest suite — four peer commits turned it red between 1 and 12 October and nobody saw
status: fixed
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

**Fixed 2026-10-14 (session 104). The premise above was wrong, and the measured cause is wider.** CI *does* run this
suite: root `test:packages` has scoped `@nodegx/export` (`"test": "jest"`, the whole package) since `b608bf746`
(2026-09-09). The grep above searched for the folder name, `nodegx-export`, not the package name. What hid the reds
was **Nx's bail**. In the PR run of 2026-10-14 18:15Z on cline-dev (run 38613607575, job "Test (runtime, backend,
viewer, mcp, preview)"), Nx ran `@nodegx/project-contract` first. It was red on P107-S101-VERBSPECCED, a low bug
filed the day before, and Nx then listed **all 19 other packages as "not run because … --nx-bail=true"**. The job
reads red either way, so a new red in any package behind the first one is invisible. The same trap is recorded in
`pr.yml` for 2026-08-07.

**The fix:** `test:packages` gains `--no-bail` (root `package.json`), with the reason commented in `pr.yml`. It was
measured locally: `lerna run test --stream --concurrency 1 --no-bail --scope @nodegx/project-contract --scope
@nodegx/node-kit-types` ran both packages past the first red and exited 1. That run found
`@nodegx/node-kit-types` red as well (`drift.test.js`, filed as P18-S104-KITTYPESDRIFT). That was a second
package-level red the bail had hidden.

⚠️ CI's job is still red after this (VERBSPECCED, KITTYPESDRIFT, and whatever the full run shows). The change means
each package's own result can be read in it.
