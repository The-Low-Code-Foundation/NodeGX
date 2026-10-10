---
id: P109-S12-CAMELROOTS
title: create_component drops a misnamed argument (visualRoots for visual_roots, a stringified array) without a word
status: fixed
commit: aefa23791
phase: P109
task: ISL-034
severity: medium
area: mcp / tool argument parsing (zod strips unknown keys), create_component
found: P109 ISL-015 AC5 s12, 2026-10-03 (the stranger round)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md §8 s12; ISL-034 §8 s39
regression: packages/noodl-mcp/tests/unknownArguments.test.ts
---

The stranger round's agent sent `"visualRoots": "[\"pad\"]"` to `create_component`: the camelCase key the
`set_visual_roots` op uses, holding a JSON string. The tool's key is `visual_roots`; zod's default strips unknown
keys, so the argument vanished and the write succeeded with no roots (the type was unknown, so none were derived)
and 0 errors. Reproduced on the plain fixture with no kit. The two spellings in one surface (`visual_roots` on the
tool, `visualRoots` on the op) invite it. Proposed: name any argument the schema dropped in the result
(`ignoredArguments`), or accept the op's spelling as an alias. Not built: it touches every tool's schema handling.

**Fixed 2026-10-10 (P109 s39, ISL-034, `aefa23791`): refused, as ISL-034 §4 orders ("refuse unknown keys with the right
name").** Re-measured first: still stripped (no `.strict()`, no report). The door now refuses a key no tool declares,
before the handler runs. One override of the SDK's `validateToolInput` covers all 123 tools and leaves the advertised
schemas unchanged. The refusal names the key and the declared key it most likely meant ("did you mean "visual_roots"?"),
and nothing is written. Neither proposal was built as written: `ignoredArguments` would have let a half-applied write
stand, and an alias would only have fixed this one spelling. The full noodl-mcp suite with a log in the refusal path
logged no refusal outside the new spec. Agents over the stdio door see it once `packages/noodl-mcp/dist` is rebuilt.
