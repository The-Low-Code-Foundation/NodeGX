---
id: P112-S10-CLASSICTYPES
title: "A TypeScript project on classic `node` module resolution cannot type the kit: `@nodegx/node-spec/node` has no types, and `@nodegx/project-contract/format` demands `resolveJsonModule`"
status: fixed
severity: high
area: node-spec / package manifest (`exports` only); project-contract / its published `format.d.ts`
kit: node-spec
found: P112 OWN-011 s10, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §8
regression: scripts/own/stranger-kit.mjs
commit: see OWN-011 §8
---

The three kit packages installed from their tarballs in an empty folder, and a consumer file importing from each
typechecked with `tsc --moduleResolution node` (still the default under `module: commonjs`, and what several of this
repo's own tsconfigs use):

```
consumer.ts(2,36): error TS2307: Cannot find module '@nodegx/node-spec/node' or its corresponding type declarations.
  There are types at '…/node_modules/@nodegx/node-spec/dist/types/nodegx-node-spec/src/index.d.ts', but this result
  could not be resolved under your current 'moduleResolution' setting.
node_modules/@nodegx/project-contract/format.d.ts(18,44): error TS2732: Cannot find module
  './schemas/project-v2.schema.json'. Consider using '--resolveJsonModule' … (×8, one per schema)
```

node-spec names `./node` only in an `exports` map, which classic resolution ignores, so the `/node` entry had no types
for such a project, and neither had `@nodegx/project-contract/editor-suite-node`, whose declarations import it.
project-contract's `format.ts` re-exports its eight schemas straight from their JSON files, so its declarations carried
`export { default as … } from './schemas/….json'` and every consumer had to turn `resolveJsonModule` on. Under `bundler`
resolution both passed, which is why nothing in the repo noticed.

**Fixed:** node-spec's manifest maps `node` in `typesVersions` (read by classic resolution); project-contract's
`build-publish.mjs` declares the eight schema exports as JSON Schema objects in `format.d.ts` (the `.js` still hands
over the files). `node scripts/own/stranger-kit.mjs <tgz dir>` installs the three in an empty folder, loads all 18
entries and typechecks under `node`, `bundler` and `node16`: on the tarballs with both fixes taken out it fails with the
errors above and exits 1; with them, 0.
