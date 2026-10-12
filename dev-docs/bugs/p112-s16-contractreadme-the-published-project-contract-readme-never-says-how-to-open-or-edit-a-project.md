---
id: P112-S16-CONTRACTREADME
title: "The published @nodegx/project-contract README never says how to open or edit a project — it describes three side modules and calls the package `private: true for now`"
status: open
severity: medium
area: packaging / docs (`packages/nodegx-project-contract/README.md`, shipped as-is in the 0.1.0 tarball)
kit: project-contract
found: P112 OWN-017 s16, 2026-10-12 (registry 0.1.0 installed in an empty folder before the stranger round)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-017-THE-LINGO-APP-IN-OUR-OWN-EDITOR.md §7 (s16)
---

The package is what someone who builds their own NodeGX editor installs to read and write a project (P112's
thesis, R3). The README they get from npm (46 lines) has a table of `tokens.ts`, `logic-builder-io.ts` and
`world.ts`, a section on a webpack invariant inside this repo, and a "Shape" section that ends:

> `private: true` for now: `@nodegx/export` bundles this package's source into its own `dist/` …

None of it is true for the npm reader. The package is published, and its main use is `format`/`format-node`:
`V2ProjectStore`, `diskFiles`, `validateSchema`, `SCHEMA_IDS`, the eight schemas and `editor-suite`. None of these
is named. An outsider finds the store only by listing the tarball and reading `format/store.d.ts`. The package also
has no `exports` map (deliberately, for classic resolution), so `import … from '@nodegx/project-contract'` gives the
root `index.js`, not the format.

Measured: with the README's help alone, the right import (`@nodegx/project-contract/format.js` plus
`/format-node.js`) and the schema ids (`SCHEMA_IDS.PROJECT`, not `'project-v2'`; a wrong id makes every file
"invalid" with no word on why) both had to be read off `.d.ts` files.

**Proposed:** a published README (kept apart from the repo-internal notes, as `dist/publish` already is) that
opens with five lines: open a folder (`new V2ProjectStore(diskFiles(dir))`), list components (`componentKeys`),
read one (`readComponent` → `files` + `revision`), write one (`writeComponent(key, files, {ifRevision})`), and
validate (`validateSchema(SCHEMA_IDS.NODES, files.nodes)`). Also a line on what the semantic validator needs that
the package doesn't carry (the node library).
