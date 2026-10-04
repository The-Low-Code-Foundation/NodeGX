---
id: P109-S13-FINDTOOLSPHRASE
title: find_tools matches a query as one phrase, so a model's multi-word search ("project settings home title") reveals nothing while each of its words would
status: open
severity: medium
area: mcp / find_tools query matching (src/tools/disclosure.ts, the DEF-006 (b) block)
found: P109 ISL-016 AC6 s13, 2026-10-04 (Claude Code over the stdio server)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-016-THE-DOOR-WRITES-THE-PROJECT-SETTINGS-AND-THE-HOME-PAGE.md §8 s13
---

The AC6 agent's first search was `find_tools({ query: "project settings home title" })` → `revealed: []`. Every word
of it is a keyword or the id of the `project` group, and `query: "settings"`, `"home"`, `"title"` each reveal
`set_project_settings` (`isl016ProjectSettings.test.ts` AC1). The match is
`haystack.includes(needle)` with the WHOLE trimmed query as the needle, against group id + title + keywords and
against tool names (`disclosure.ts`, the loop after the DEF-006 (b) note). So a query is found only when it is a
substring of one haystack: one word, or a phrase someone happened to put in `keywords` verbatim.

The agent recovered by browsing `group: "project"` and found the tool (18 turns, $0.55). A model that gives up
after an empty search does not.

Proposed (not built — the DEF-006 note's own constraint applies: a widening must not reveal everything): try the
phrase first; when it finds nothing, match each word of four letters or more, and reveal only groups/tools that a
word hits. The control arm in `kitTools.test.ts` ("zzzznotathing", "photoshop", "send a fax" → nothing) must stay
green, and a census of which multi-word queries reveal what belongs with the change.
