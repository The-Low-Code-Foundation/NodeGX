---
id: P112-OWN026-GUIDANCECUT
title: The kit's guidance sits in the middle of 50,000-character answers, so a model whose harness keeps only the start and end of a tool result (Cline keeps ~8,000) never sees it
status: fixed
commit: pending
regression: packages/noodl-mcp/tests/own026GuidanceCut.test.ts
severity: high
area: kit / MCP (`get_project_info`, `get_node_type`; `packages/noodl-mcp/src/guidance.ts`)
found: P112 OWN-026 t1-nodegx-2, 2026-10-22; FIX-02 B
evidence: get_project_info was 51,834 characters and FIX-01's backend lesson sat at character 40,311; 26 nodegx results were over 8,000 characters that round
---

Measured on the fixture with a 4,000 + 4,000 middle cut, before: `authoringTraps` survived to trap 7;
`authoringDoctrine`, `interfaceDoctrine`, `designDoctrine` and nine-tenths of `backendDoctrine` were lost. A
`get_node_type` of eight types (25,901 characters) lost the middle types whole, and each type's `antiPatterns` came
after its ports.

Fixed: `get_project_info` leads with `readFirst` (2,149 characters: the answer's length, the nine rules that cost a
rebuild, one line each, generic, and an index of the sections) and ends with `moreGuidance`; every field it had is
unchanged. `get_project_info({ section: "backend" })` returns one section alone, in parts of at most 6,000
characters (`"design/2"`); the resident surface went 8,274 → 8,266 (the description was shortened to pay for the
argument). `get_node_type` puts each entry's summary, antiPatterns and runtimeBehavior first and its ports last, and
an answer over 8,000 characters for several types says so first. After: every FIX-01 lesson (`visualFilter`,
`Noodl.Records.increment`, `cloud-shared-counter`, a press taken once) survives the cut.

Not done: a lesson as an `info` diagnostic on the write that adds an Update Record fed from page state (no reliable
test for "a value several devices change"); `get_style_vocabulary` (37,653) and `list_examples` (21,224) are still
long and cut, with no guidance in their middles that `readFirst` does not carry.
