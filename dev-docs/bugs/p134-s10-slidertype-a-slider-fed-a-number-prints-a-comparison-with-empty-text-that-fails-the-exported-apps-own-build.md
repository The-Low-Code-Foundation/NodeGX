---
id: P134-S10-SLIDERTYPE
title: "React export: a Slider whose value is wired from a number prints `arrival === ''` on a number, TS2367, so the exported app's own build fails (game-menu's Settings)"
status: fixed
commit: 7aabd5acf
severity: high
area: the React printer's graph-path sync for a slider (`packages/nodegx-export/src/emit/component.ts`, `plan.syncEffects`, `coerce: 'slider'`)
found: P134 session 10, 2026-11-04, the whole nodegx-export suite in band (typecheck-emitted, game-menu)
evidence: typecheck-emitted "every fixture emits an app that typechecks › game-menu" — "TS2367 src/components/Settings.tsx:20: This comparison appears to be unintentional because the types 'number' and 'string' have no overlap."; red since 0a280a140 (HTX-006, session 9), which added the game-menu fixture and did not run the suite's typecheck rows; its corpus golden block was missing too (hls001, 64 projects where 65 exist)
regression: packages/nodegx-export/tests/typecheck-emitted.test.ts
---

The sync abstains on an empty arrival, as the runtime's slider does when a field hands it `''`. Printed against a
value typed `number`, TypeScript calls the comparison impossible and `tsc -b` stops the build: anyone exporting a menu
whose slider is fed a number got an app that would not build.

Fixed: the arrival is typed `unknown` (`const arrival: unknown = …`), the same three tests, the same clamp. The
corpus golden gained game-menu's block (19 lines in, none out) and then the one hash this fix moved.
