---
id: P115-S10-MCPTSCRUNTIME
title: "noodl-mcp's typecheck is red on `@cloud-runtime` (TS2307 ×6 + 11 follow-on errors in nodegx-backend's execution files): a P128 test imports the step catalog, which now reaches WorkflowRunner, whose alias noodl-mcp's tsconfig does not map"
status: open
severity: low
area: "`packages/noodl-mcp/tests/p128PreviewCut.test.ts:18` imports `nodegx-backend/src/workflow/steps/kinds` → `steps/records.ts:26` (`import type { WorkflowRunner }`, from 24914b305 P132 BWF-005, 2026-11-03) → `WorkflowRunner.ts` / `execution/ExecutionStore.ts` / `BoundedExecutionLogger.ts`, which import `@cloud-runtime/...` (mapped in nodegx-backend's tsconfig, not in noodl-mcp's)"
found: P115 s10, 2026-11-05, `npx tsc --noEmit -p .` in noodl-mcp (its `typecheck` script) after adding `set_file_permissions`
evidence: "`tsc --explainFiles`: WorkflowRunner.ts 'Imported via ../WorkflowRunner from steps/records.ts'; records.ts 'Imported via ./records from steps/kinds.ts'; kinds.ts 'Imported via ../../nodegx-backend/src/workflow/steps/kinds from tests/p128PreviewCut.test.ts'. None of the errors is in a file s10 changed; s10 added no import."
owner: none (P132's import, P128's test)
kit: mcp
phase: P115
---

`npm run typecheck` in `packages/noodl-mcp` fails with `Cannot find module '@cloud-runtime'` (and
`.../execution-history/ExecutionLogger`, `/store`, `/types`) in three nodegx-backend files, plus the follow-on
"property does not exist" errors those cause in `BoundedExecutionLogger.ts`. The MCP never runs that code: it
reaches it through a TYPE import (`records.ts` names `WorkflowRunner` as a type) on a path a P128 test opened by
importing the step catalog. jest is unaffected (ts-jest compiles per file); the package's tsc gate is not.

Beside the already-filed P128-S2-OPTSETTSC (same gate, another cause), so the gate stays red for two reasons.

Fix options, cheapest first: map `@cloud-runtime` in noodl-mcp's tsconfig `paths` as nodegx-backend does; or have
`records.ts` take a structural type for the runner (`{ … }`) instead of importing the class's type.
