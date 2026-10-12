---
id: P107-S77-LIBRARYDOCS
title: The ask-a-local-model prefab landed without its library docs page — hlt-013's "never leaves an entry authored in this repo without its page" is red at HEAD, and the editor draws no "Read docs" for it
status: open
phase: P109
task: ISL-010
severity: medium
area: docs-site / library docs, hlt-013 (`scripts/generate-library-docs.js`; `packages/noodl-editor/src/editor/src/models/libraryDocsPages.ts`, generated; `packages/noodl-editor/tests-unit/hlt-013/libraryDocs.test.ts`)
found: P107 NSP-018 s77 (docs lane), 2026-10-10
evidence: read 2026-10-10, not run (a peer's conformance suite was live, so the editor jest was not started beside it) — `library/prefabs/ask-a-local-model/README.md` exists (commit 1e5794beb, P109 ISL-010, 2026-10-05); `libraryDocsPages.ts` lists 45 `prefabs/*` keys (:43-87) and `prefabs/ask-a-local-model` is not among them; `docs-site/docs/library/prefabs/` has 46 entries and no `ask-a-local-model`; the test at libraryDocs.test.ts :102-110 walks `library/{modules,prefabs}/*/README.md` and expects `LIBRARY_DOCS_PAGES.has(key)` for each — one key fails. A shell sweep of every `library/*/*/README.md` against the manifest finds exactly this one missing
---

P109 ISL-010 (1e5794beb) added the prefab `library/prefabs/ask-a-local-model/` with its README, library.json, icon and
project, and did not run `npm run docs:library`. That script is the only writer of two generated artefacts: the page
under `docs-site/docs/library/prefabs/<slug>/` and the manifest `libraryDocsPages.ts` ("Generated. … Do not edit by hand"),
which the editor reads to decide whether an entry gets a "Read docs" button (the header explains why: the published
index writes a `docs` path for every entry whether a page exists or not, so the button went to a 404 on all 78 until this
list existed).

**What a person sees:** on the docs site there is no page for the prefab; in the editor's library the prefab has no
"Read docs" (`hasLibraryDocsPage('/library/prefabs/ask-a-local-model/')` is false), so the README that explains how to
point a running app at a model on its own computer — the whole point of the prefab — is reachable only in the repo.

**The gate:** `packages/noodl-editor/tests-unit/hlt-013/libraryDocs.test.ts` › "never leaves an entry authored in this
repo without its page" is red at HEAD for `{ key: 'prefabs/ask-a-local-model', listed: false }`. This is the gate built for
exactly this miss, and it did its job; it was not run by the commit that needed it (ISL-010's gate list is the runtime's
and noodl-mcp's, not the editor's tests-unit).

**Fix:** run `npm run docs:library` at the root and commit what it writes — the new page directory and the regenerated
`libraryDocsPages.ts` (a one-key addition; everything else should be byte-identical, and a larger diff means another entry
drifted too). Then `npm run docs:library:check` and the hlt-013 test file go green. The lesson for the task files: a
prefab or module with a README owes `docs:library` in the same commit — worth a line in the library-authoring checklist
beside `scripts/library/build.js`.
