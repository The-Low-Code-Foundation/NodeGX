---
id: P109-S19-SCRIPTSUNBOUND
title: "An exported Function that uses a script file does not build: its wrapper reads `Scripts`, which nothing binds"
status: fixed
commit: a6193856c (+ b9a17871a, the same read compiling under the editor's TypeScript)
severity: medium
area: export / Function re-host (`packages/nodegx-export/src/analyze/plan.ts` `jsFunDefOf`, `src/emit/component.ts` `jsWrapperLines`)
found: P109 ISL-005 build session 4, 2026-10-05 (AC7's red, recorded before slice 4)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Build session 4"
regression: packages/nodegx-export/tests/isl-005-script-files.test.ts (and the `scripts-desk` row of tests/typecheck-emitted.test.ts)
---

Since ISL-005 slice 1 a Function's body can read `Scripts.<file>` for each script file listed under its Uses. The exporter
did not know about Uses or `scripts/`. Its purity gate compiles a body with `Inputs`, `Outputs`, `Noodl` and `Component`
only, so `Scripts` was just an unknown name, and the body passed every check. The body was re-hosted as it is, with
`Scripts` bound to nothing.

Measured on the `scripts-desk` fixture (two pages, a Function on each using `scripts/engine/greet.js`): the typecheck of the
exported app read `TS2304 src/pages/Home.tsx:10: Cannot find name 'Scripts'` and two more on About. The export report said
nothing about either Function. So a person exporting such a project got an app that does not build, with no reason given.

Fixed by slice 4. Each script file is emitted once under `src/project-scripts/`. A loader that copies the runtime's
`ScriptFiles` comes with them, and one registry holds every file. Each wrapper binds `Scripts` to the files its Function
lists. A file that cannot be carried (missing, does not compile, compiles only in sloppy mode, reads the clock, and so on)
holds back the Function, and the report names the file.
