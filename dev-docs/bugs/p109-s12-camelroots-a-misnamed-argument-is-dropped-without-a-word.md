---
id: P109-S12-CAMELROOTS
title: create_component drops a misnamed argument (visualRoots for visual_roots, a stringified array) without a word
status: open
severity: medium
area: mcp / tool argument parsing (zod strips unknown keys), create_component
found: P109 ISL-015 AC5 s12, 2026-10-03 (the stranger round)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md §8 s12
---

The stranger round's agent sent `"visualRoots": "[\"pad\"]"` to `create_component`: the camelCase key the
`set_visual_roots` op uses, holding a JSON string. The tool's key is `visual_roots`; zod's default strips unknown
keys, so the argument vanished and the write succeeded with no roots (the type was unknown, so none were derived)
and 0 errors. Reproduced on the plain fixture with no kit. The two spellings in one surface (`visual_roots` on the
tool, `visualRoots` on the op) invite it. Proposed: name any argument the schema dropped in the result
(`ignoredArguments`), or accept the op's spelling as an alias. Not built: it touches every tool's schema handling.
