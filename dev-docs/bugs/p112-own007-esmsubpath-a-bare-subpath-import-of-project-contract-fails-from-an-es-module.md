---
id: P112-OWN007-ESMSUBPATH
title: "A bare subpath import of @nodegx/project-contract (`…/editor-suite`, `…/format`) fails from an ES module with ERR_UNSUPPORTED_DIR_IMPORT; require() of the same path works"
status: open
phase: P112
task: OWN-007
severity: low
area: packaging / `@nodegx/project-contract` published manifest (`packages/nodegx-project-contract/build-publish.mjs` writes it with no `exports` map; README "Shape")
found: P112 OWN-007, 2026-10-14 (the brief's control pair, run from the registry at 0.1.0)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-007-THE-BRIEF.md §6
kit: project-contract
---

Measured in an empty folder with `@nodegx/project-contract@0.1.0` from the registry. An adapter written as `.mjs`:

```
import { referenceAdapter } from '@nodegx/project-contract/editor-suite';
→ Directory import '…/node_modules/@nodegx/project-contract/editor-suite' is not supported resolving ES modules
  Did you mean to import "@nodegx/project-contract/editor-suite.js"?
```

`import('@nodegx/project-contract/format')` fails the same way (`ERR_UNSUPPORTED_DIR_IMPORT`);
`require('@nodegx/project-contract/editor-suite')` resolves (CommonJS probes for `.js`). The package's flat shape with no
`exports` map is deliberate for in-repo resolution (README "Shape": classic and bundler resolution), but Node's ESM
loader does neither, and the published `package.json` is a separate file (`build-publish.mjs`) that could carry an
`exports` map the in-repo one does not.

A stranger's first editor module is as likely to be `.mjs` as `.cjs` (OWN-017's was ESM). The brief names the `.js`
form as the rule until this is fixed.

**Fix shape:** an `exports` map in the published manifest only (`"./format": "./format.js"`, `"./format-node"`,
`"./editor-suite"`, `"./editor-suite-node"`, `"./tokens"`, `"./world"`, `"./*": "./*.js"` or the explicit list), with the
regression a test in `build-publish`'s output: `node --input-type=module -e "import('@nodegx/project-contract/format')"`
against the staged package.
