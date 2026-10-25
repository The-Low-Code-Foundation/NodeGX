---
id: BETA-S6-CMP004RED
title: The shelf's exported parts no longer round-trip — four CMP-004 cases are red at HEAD (an icon missing from the re-export, install_prefab refusing, a part's port gone)
status: open
severity: medium
area: mcp / the parts shelf (`packages/noodl-mcp/tests/cmp004Parts.test.ts`, `cmp004RoundTrip.test.ts`; `install_prefab`)
found: the Beta sweep s6, 2026-10-25 — running the agent server's specs that read projects, after P112-S13-DEPLOYBADJSON; red the same with that change undone (HEAD's `readProject.ts`)
evidence: at ad34964ab, `npx jest tests/cmp004Parts.test.ts tests/cmp004RoundTrip.test.ts` → 4 failed of 35
---

Measured, not investigated:

- "re-exporting from the committed source reproduces the shipped entry byte for byte": the re-export's file list lacks
  `icon.png` (expected `["icon.png", "library.json", "project/project.json", …]`).
- "and what was exported installs into a project that has never seen it": `install_prefab` answers `isError: true`.
- "project B sees the entry on the shelf and installs it", and "what arrives is the thing that left — the graph, the
  wire, and the reference between the two": a part's port list is `[]` where `["Card Label"]` was expected, and the
  value read back is `undefined` for `"Card Label"`.

The cases were last edited at 45929d94c (CMP-004/005, six weeks ago), so something under them moved since. Not on
this session's walk: the agent's parts shelf. A peer's uncommitted edits were in `packages/noodl-mcp/tests`
(`tpl013Edition`, `tpl011*`), none of them these files.
