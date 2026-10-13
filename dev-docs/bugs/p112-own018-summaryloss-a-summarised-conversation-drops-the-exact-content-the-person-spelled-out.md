---
id: P112-OWN018-SUMMARYLOSS
title: "When a harness summarises the conversation, the exact content the person spelled out is lost (the quiz's answers and their order), and the agent rebuilds it from memory — the project's agent notes now point back to the verbatim quote"
status: fixed
severity: high
area: kit / the project's agent notes (`noodl-editor/src/editor/src/models/template/agentConfig.ts`, shared by the editor and `create_project`); the summariser itself is OpenCode's
found: P112 OWN-018 s2, 2026-10-13 (Mistral Large 4 in OpenCode, quiz run 7; tarballs tgz8 at e11082e5e)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §14
regression: packages/noodl-mcp/tests/own018VerbatimRequest.test.ts
---

Run 7 graded 10/12 and failed `order`: question 1 read Porto / Lisbon / **Madrid** (the brief: Lisbon / Porto / Coimbra),
Canada and Morocco were reordered. OpenCode's compaction summary (read from its database) kept *"5 fixed questions
(Portugal→Lisbon; Australia→Canberra; …), three answers in exact order"* and nothing else of the list, so after the
summary the agent had no record of the wrong answers or their order and wrote them from memory.

The person's words were on disk the whole time: `create_project` quotes the request verbatim in
`docs/decisions/000-initial-scope.md` ("What was asked for"). `docs/BRIEF.md`, the file the notes pointed at, is a
paraphrase.

**Fixed:** the project's `AGENTS.md` / `CLAUDE.md` (in the system prompt, which no summary rewrites) now say the request
is quoted word for word there, to build anything spelled out (names, lists, wording, order) from that quote, and to
read it again after the conversation has been summarised. Any agent on any harness that summarises benefits.
Not done: BRIEF.md carrying the quote too (it is rendered by the editor's scoping code and pinned by editor tests).
