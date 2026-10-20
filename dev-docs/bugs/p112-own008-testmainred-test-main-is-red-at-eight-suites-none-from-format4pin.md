---
id: P112-OWN008-TESTMAINRED
title: "`npm run test:main` is red at 8 suites (19 tests of 9,575) on 2026-10-18; none read the FORMAT4PIN change, and each needs its own row when it is taken"
status: open
severity: medium
area: "editor / `tests-unit` gates (`test:main`, a PR CI gate nothing watches locally)"
found: P112 OWN-008 s4, 2026-10-18 (the sweep the FORMAT4PIN handoff asked for before claiming it)
evidence: "the run's log, read here; `npm run test:main` at HEAD `0378f70f8` plus the shared checkout's open piles: 598 suites, 590 pass, 9,556 tests pass"
---

An inventory, not one defect. FORMAT4PIN's sweep found `test:main` red, and none of the eight suites imports
`@nodegx/project-contract`, the editor suite or the run-on-change pins (grep over the eight files: no match). The
first reading of each follows. Whoever takes one files it as its own row, measured again first: some sit on a
sibling's open edit and may already be gone.

| suite | what it says | first reading |
|---|---|---|
| `def007-project-load-seam.test.ts` (DEF-007 AC4 + HLS-003) | `ProjectModel.fromJSON` is called in `noodl-preview/src/projectExport.ts` and no longer in `loader.ts`. No scanned file holds the literal `'nodes.json'` in `noodl-mcp/src/project/ProjectStore.ts` any more. `noodl-mcp/src/tools/scriptTools.ts` and `noodl-preview/src/readProject.ts` read it unregistered. | Registries gone stale behind committed moves (OWN-001 took the format's file names into `@nodegx/project-contract/format`). Re-point the rows. |
| `exp-013/exportBadge.test.tsx`, `exp-013/codeExportModal.test.tsx` | "Deferred" population is 0. The alpha notice says "All 130 nodes you can place export today", not "N of M (P%)". The "Not exportable" badge draws nothing. | EXP-011 reached 130 / 130 (lane 6). The tests grade a population that no longer exists. That needs a ruling on what the notice and badge say now, not a revert. |
| `hlt-012/portTokenRules.test.ts` | The catalog has 169 numeric ports, not 167. | Likely the upload-file / shrink-photo pile in `noodl-viewer-react` (uncommitted, P121 / OWN-021). Re-count once that pile lands. |
| `hlt-013/libraryDocs.test.ts` | `prefabs/ask-a-local-model` is not listed. | P107-S77-LIBRARYDOCS is marked fixed. It has regressed or its page moved. |
| `hls009RecentProjectsCardinality.test.ts` | The one writer moved from `LocalProjectsModel.ts:114` to `:115`. | A line-number pin. A one-line edit above it moved it. |
| `el-009/kit-renders-on-page-three.test.ts` | Desktop text elements: 1, expected 2 (both arms). | Not read further. A render test. Run it alone first. |
| `vfn-011/drift-gate.spec.ts` | Bench and runtime disagree on whether a signal errors. | Not read further. |
