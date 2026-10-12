---
id: P107-S89-NIGHTBOOK
title: The nightbook template places its eight data components inside Groups and the Page — 26 nodes open red in the editor ("This node cannot be a child in a hierarchy")
status: open
severity: medium
area: templates / nightbook (`templates/nightbook`, `/Data/*` instanced in `/Pages/*` and `/UI/Sections`)
found: P107 NSP-021 s89 (the allowAsChild census), 2026-10-12
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-THE-SECOND-EDITOR.md §6.3
---

`/Data/Day`, `/Envelopes`, `/Gate`, `/Keep`, `/Month`, `/Profile`, `/Recent` and `/Tonight` are logic-only: their roots
are Component Inputs / Outputs, DbCollection2, Function, Cloud Function and Navigate nodes, none of them visual. The
pages place their instances inside Groups (and `/Data/Gate` inside the Page). The editor marks each one twice
(`node-not-child` and `node-invalid-child`): read in the running editor on a copy, 2026-10-12, 26 + 26, among the 395
warnings the project opens with. Since R23 the agent's checker reports the same 26 (`invalid-hierarchy`, error; existing
errors do not block a write).

Not measured: what the runtime does differently with them as children rather than roots. The fix is the template
owner's (P78): make each `/Data/*` instance a root of its page, keeping its wires; then the 26 should read 0 in
`tests-unit/nsp-021/hierarchy.test.ts` (which pins 26 today and must be moved with the fix).

⚠️ Since R23 this also gates authoring: `noodl-mcp/tests/tpl011Template.test.ts` builds nightbook through the agent's
write door, and every misplaced instance there is a NEW error, so once that test's own red (a cloud component's
`unknown-function-port`, 2026-10-12) is fixed its page writes will be refused until this is. Predicted from the
template's tree, not run.
