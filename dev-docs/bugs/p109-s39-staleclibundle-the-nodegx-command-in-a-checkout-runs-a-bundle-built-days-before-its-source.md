---
id: P109-S39-STALECLIBUNDLE
title: In a checkout, the `nodegx` command runs `nodegx-export/dist/cli.mjs`, a gitignored bundle that can be days older than its source
status: fixed
commit: 1411841fd
phase: P109
task: ISL-034
severity: medium
area: `nodegx` bin (`packages/nodegx-export/dist/cli.mjs`, esbuild, gitignored), every subcommand
found: P109 s39, 2026-10-10 (ISL-034, fixing P109-S5)
evidence: dev-docs/bugs/p109-s5-staledeploycli-nodegx-deploy-validates-against-a-catalog-bundled-weeks-ago.md (s39 paragraph)
regression: packages/nodegx-export/tests/p109-s39-stale-cli-bundle.test.ts
---

`node_modules/.bin/nodegx` is `packages/nodegx-export/dist/cli.mjs`. On 2026-10-10 it was dated 2026-10-05 22:32, so
none of the five days of `nodegx-export/src/cli` changes since ran when a drive called `nodegx deploy`. That includes
S5's own fix, which makes the deploy engine rebuild itself. The bundle also carries the exporter, so `nodegx export`
in a checkout runs whatever exporter was current when someone last ran `node build.mjs` in that package.

This is the S5 shape one layer up: S5 made the *engine* check itself, and the front door that does the checking is
stale the same way. Measured by running the CLI from source instead (`npx tsx packages/nodegx-export/src/cli/main.ts
deploy …`): the fix ran there, not from the bin.

**Plain words:** *"In a developer checkout, the `nodegx` command can be days behind the code in the same folder, so a fix
can be committed and still not run."*

**Proposed:** the same rule. `nodegx-export/build.mjs` writes the CLI bundle's input list beside it, and the bin checks
it. It cannot rebuild itself mid-run, so it says the bundle is older than `<file>` and names `npm run build --workspace
@nodegx/export`, or it re-executes from source through `tsx` when it is stale. Not built here: rebuilding the shared
bundle now would carry P18's uncommitted exporter pile into it.

**Fixed 2026-10-10 (P109 s39, `1411841fd`): warn, the first half of the proposal.** `build.mjs` writes `dist/cli.inputs.json`,
and the bin warns on start when a file on it is newer, naming it and the command. It does not re-execute from source:
`tsx` is a dev dependency an install does not have, and a silent switch of engine is the S5 shape again. The shared bin
gains the check at its next build. It was not rebuilt here, because that would carry P18's uncommitted exporter pile.
