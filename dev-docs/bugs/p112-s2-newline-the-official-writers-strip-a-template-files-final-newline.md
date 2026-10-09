---
id: P112-S2-NEWLINE
title: The editor and the MCP rewrite a component file without its final newline, so every template file they touch shows a whitespace change in git
status: open
severity: low
area: mcp / ProjectStore.writeJsonAtomic · editor / ComponentSaver
found: P112 OWN-001 s2, 2026-10-09 — measuring how the template files are serialized before moving the write rule
evidence: all 243 JSON files of templates/todo-list are two-space JSON ending in "\n"; JSON.stringify(JSON.parse(t), null, 2) on `templates/planning/components/Week/Spark bar/nodes.json` equals the file only with "\n" appended. Writers: packages/noodl-mcp/src/project/ProjectStore.ts:93, packages/noodl-editor/src/editor/src/services/ProjectStructure/ComponentSaver.ts:248 and :359
kit: project-contract
regression: packages/nodegx-project-contract/tests/format.test.ts "serializing a parsed file gives back its text, final newline included, for every JSON file"
---

Every template file ends with a newline. Both official writers serialize with `JSON.stringify(value, null, 2)` and
nothing after it, so when an agent or a person changes one node in a template component, git shows the change and also
"\ No newline at end of file" on each of the three files. It does not affect what the app does. It adds noise to every
template diff, and a rebuild that should leave git clean leaves the last line of each file changed (the same complaint
P109 ISL-019 fixed for unchanged writes).

`@nodegx/project-contract/format`'s `serializeV2File(value, previous)` keeps the final newline of the file it replaces
and writes a new file the way the official writers do. **Fix:** OWN-001 slice 2 moves the MCP onto that store, which
fixes the MCP. The editor's `ComponentSaver` needs the same one-line change (pass the text it replaces, or always end
with "\n" if a ruling prefers one convention).

**Plain words:** *"When the editor or the AI saves a template file, it drops the blank line at the end, so git shows a
change on every file it touched even when nothing meaningful changed there."*
