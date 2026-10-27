---
id: P125-MUDDY-SURFACESUNSAID
title: No text the agent reads says what Studio can draw, when the mini editor is the surface, or that the NodeGX editor exists and where to download it, so asked "where is this wording?" it invents the product's limits ("NodeGX has no option-set type", "I haven't opened that node in the editor") and never offers the editor
status: open
severity: high
area: "noodl-mcp `src/instructions.ts` (both briefings), `src/guidance.ts` (five sections, none about surfaces), `src/tools/openStudio.ts:170–180`, `src/tools/miniEditor.ts:124–136`, `src/tools/openInEditor.ts:337–343` (assumes NodeGX is running; no download), the seeded `CLAUDE.md`; nodegx-studio says the editor's name once (`studio.html:3269`) and never the download"
found: Richard's Muddy Paws Shelter run in Claude Desktop, 2026-10-27 (his point 4 and the two agent replies he pasted)
evidence: dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md §1.4 (the table of what each text names) and §3 — READ: each surface tool's description names at most one other surface and none names the download; `grep -ri 'option set' packages/noodl-mcp/src` is empty; the seeded docs of Muddy Paws Shelter contain neither "Studio" nor "option set"
owner: P128-S2
task: CCN-009 and CCN-010 (proposed in the audit §4)
---

The ethos at stake (Richard): a person who meets a part they cannot see concludes "another tool where parts of the
inner workings are closed off to me". The product has the open rung (the NodeGX editor); the agent does not know to
point at it. Fix in words: a `surfaces` section the agent reads with the project, the three tools naming each other
and the download, and a note on every write that places a node outside Studio's vocabulary while Studio is open.

## 2026-10-27, P128 S1 (CCN-009): the words landed; the agent still does not say them

Landed: `get_project_info`'s `surfacesDoctrine` (section `surfaces`: the canon's "Which AI coder", "Three ways to touch
your app", "The wiring underneath" with the offer sentence, "Get the tools", the five rules), a MUST_KNOW line, the
bound briefing's pointer, the three surface tools naming each other and the download, `open_in_editor`'s refusals
naming the download and Connect Claude, and the seeded `CLAUDE.md` / `AGENTS.md` paragraph. Measured
(`dev-docs/tasks/phase-128-the-canon-everywhere/s1/RESULTS.md`): asked "Where does the headline's wording come from?",
two Sonnet 5.5 agents named the node exactly and said nothing of Studio or the two ways (0 of 2); neither fetched the
section. Open for the write note (CCN-010, P128 S2), then the same question again.
