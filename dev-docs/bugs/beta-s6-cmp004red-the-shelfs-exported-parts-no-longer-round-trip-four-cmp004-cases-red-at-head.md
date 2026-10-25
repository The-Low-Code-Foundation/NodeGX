---
id: BETA-S6-CMP004RED
title: The shelf's exported parts no longer round-trip — four CMP-004 cases are red at HEAD (an icon missing from the re-export, install_prefab refusing, a part's port gone)
status: fixed
commit: (this session, the Beta sweep s6)
severity: medium
area: mcp / the parts shelf (`packages/noodl-mcp/tests/cmp004Parts.test.ts`, `cmp004RoundTrip.test.ts`; `install_prefab`)
found: the Beta sweep s6, 2026-10-25 — running the agent server's specs that read projects, after P112-S13-DEPLOYBADJSON; red the same with that change undone (HEAD's `readProject.ts`)
regression: packages/noodl-mcp/tests/cmp004Parts.test.ts "🔴 re-exporting from the committed source reproduces the shipped entry byte for byte"
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

**Cause, measured (the same session).** Three things had moved under the cases, none of them in the cases:

1. **1fad0cad7 (2026-09-11)** drew the three parts' icons by hand (`npm run library:icons`), because
   `library:verify-dist` hard-fails an entry with no icon. `export_to_library` still wrote none, so a fresh export
   lacked `icon.png`; the re-export arm stopped at the file list, and the install arm then found two of three entries
   missing from its shelf (the `install_prefab` refusal was that, not an install defect).
2. **P112-S7-LOGICTYPE (2026-10)** made the project reader keep a logic component's `type`, so a fresh export now
   writes `"componentType": "logic"` in each part's `project.json`; the shipped entries predate it.
3. **8f9f82629 (P100 UPG-003 §6, 2026-09-23)** ruled that an installed entry's text styles arrive as the project's
   typography tokens. It updated `libraryTools.test.ts` and not this round trip, which still asserted the merge.

**Fixed.** (1) a product fix: `libraryExport.ts` `monogramIcon` draws the placeholder with the checkout's own generator
(`scripts/library/make-monogram-icon.js`, now requirable; `main()` only when run directly) and writes `"icon"` last,
where the generator puts it; with no checkout around the server, no icon (unchanged). The drawn icons are byte for
byte the shipped ones. (2) the three entries' `project.json` re-shipped from a fresh export (one line each:
`componentType: logic`). (3) the round trip asserts the ruled shape: `stylesMerged.textStyles` `[]`,
`textStylesConverted` `['Card Label']`, `tokensAdded` `['--card-label-size']`, the text node wearing
`fontSize: var(--card-label-size)` and no `textStyle`.

**Graded.** CMP-004 parts 21/21, round trip + `libraryTools` 50/50 together, `library:icons:check` 84/84, noodl-mcp tsc
clean. `library:verify-dist` after `library:build`: every prefab check passes; it is red on the modules index alone,
which the build never wrote because an untracked `library/modules/nightbook-kit` (dated 26 Sep, no `library.json`) on
this machine stops the modules build. Not this change.
