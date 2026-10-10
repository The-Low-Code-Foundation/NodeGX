---
id: P112-S2-WORLDTYPECHECK
title: The editor's test typecheck is red with six errors in `@nodegx/project-contract/world`, which is written for `strict` and compiled there without it
status: fixed
severity: medium
area: project-contract / world (as compiled by packages/noodl-editor/tsconfig.tests.json)
found: P112 OWN-001 s2, 2026-10-09 — running the consumers' typechecks after moving the format into the same package
evidence: `npm run typecheck:editor-tests` → exit 2, 6 × TS2339/TS2322 in world/migrate.ts:299,301,305, world/mutants.ts:131, world/paths.ts:260, world/verb-project.ts:196. The program reaches world/ through packages/noodl-editor/tests/services/ProjectStructure/worldFilesSurviveSave.test.ts (758bf9b04, 2026-10-08)
kit: project-contract
regression: `npm run typecheck:editor-tests` (0 errors) and the editor's `test:ci` webpack, which compiles the same program and died with the same eight errors before any spec ran (2026-10-10, 67 s, no Jasmine line)
fixed: P112 OWN-001 s5, 2026-10-10 — the eight narrowings (`!x.ok`, `x.ok ? :`) written as `x.ok === false` / `x.ok === true`, which narrow a boolean-literal discriminant with or without strictNullChecks; paths.ts:260,306, mutants.ts:131, runner.ts:230, migrate.ts:309,311,315, verb-project.ts:196 (P116 had added two since s2's six). No behaviour change; the package's 197 world tests pass
commit: 6e88589d0
---

`world/` is checked by its own package with `"strict": true`, where `if (!pb.ok) return … pb.problems` narrows the
`WorldProjection` union. The editor's test program extends the root tsconfig, which has no `strict` and so no
`strictNullChecks`. Without it TypeScript does not narrow a union on `ok: true | false`, so every `.problems` read after
`!x.ok` is an error there. The package's own `typecheck` and its 219 tests are green. Only the editor's program is red,
and the editor's webpack test build type-checks the same program.

Not caused by P112: the errors are in files OWN-001 did not change. OWN-001 did check that its own code is not what
pulls `world/` in, and moved the shared hash into an import-free `hash.ts` so the format does not depend on `world/`.

**Fix (small, either):** write the six reads so they narrow without `strictNullChecks` (`if (pb.ok === false)` with the
union's members typed so the `false` member carries `problems`), or give the test that imports world its own program.
P116 owns `world/`.

**Plain words:** *"The new 'your world' code type-checks on its own but not inside the editor's test build, which uses
looser settings — so that check is failing."*
