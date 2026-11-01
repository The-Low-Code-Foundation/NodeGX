---
id: P125-MUDDY-SURFACESUNSAID
title: No text the agent reads says what Studio can draw, when the mini editor is the surface, or that the NodeGX editor exists and where to download it, so asked "where is this wording?" it invents the product's limits ("NodeGX has no option-set type", "I haven't opened that node in the editor") and never offers the editor
status: fixed
commit: "CCN-009 + CCN-010 (P128 S1/S2; in @nodegx/mcp 0.2.9), measured 2026-11-02 (dev-docs/tasks/phase-128-the-canon-everywhere/s1/RESULTS-2026-11-02.md)"
severity: high
area: "noodl-mcp `src/instructions.ts` (both briefings), `src/guidance.ts` (five sections, none about surfaces), `src/tools/openStudio.ts:170–180`, `src/tools/miniEditor.ts:124–136`, `src/tools/openInEditor.ts:337–343` (assumes NodeGX is running; no download), the seeded `CLAUDE.md`; nodegx-studio says the editor's name once (`studio.html:3269`) and never the download"
found: Richard's Muddy Paws Shelter run in Claude Desktop, 2026-10-27 (his point 4 and the two agent replies he pasted)
evidence: dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md §1.4 (the table of what each text names) and §3 — READ: each surface tool's description names at most one other surface and none names the download; `grep -ri 'option set' packages/noodl-mcp/src` is empty; the seeded docs of Muddy Paws Shelter contain neither "Studio" nor "option set"
owner: "none since P128 S2 (its box ticked; it named the round as the next measurement and did not run it): the orchestrator assigns"
task: CCN-009 and CCN-010 (proposed in the audit §4)
launch: beta
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

## 2026-10-27 night, P128 Beta round Track B: the words and the note are shipped; the question is not re-asked

`dev-docs/tasks/phase-128-the-canon-everywhere/beta-round/muddy-rows.mjs` on a copy of `templates/todo-list`, the
same readings on both builds: HEAD's `packages/noodl-mcp/dist` (rebuilt 22:02, HEAD 9db1a9f6e) and the published
`@nodegx/mcp` 0.2.9 tarball (`npm-0.2.9-tarballs/nodegx-mcp-0.2.9.tgz`, sha1 5549d6f7…, unpacked). Identical on both: the bound briefing names
`surfaces`; `surfacesDoctrine` 4,281 characters and the MUST_KNOW line second; `open_studio`, `show_mini_editor` and
`open_in_editor` each name the other two, `open_studio` and `open_in_editor` the download; with Studio open (the spec's
stand-in, `NODEGX_STUDIO`), Muddy Paws' `/Components/Wording` create succeeds with `notDrawnInStudio` = `langvar`
Variable2, `wordStates` States, and `studioNote` ("The person is watching this app in NodeGX Studio, and Studio does
not edit these 2 nodes: …"); the same create with no Studio carries no note (the control). Specs at HEAD:
`p128OptionSet` + `p128CanonPin` 23/23. So everything this row's Fix names (CCN-009 and CCN-010) is in 0.2.9.

**Left, and why the row stays open:** the measurement the row was filed on, the agent's answer to "Where does the
headline's wording come from?", 0 of 2 at S1, has not been taken again. It is a Sonnet round, `s1/round.mjs` then
`--again s1/prompt-2.txt`, with `open_studio` called first so the note fires, on a dist that also carries
P128-S1-PREVIEWCUT's fix (0b4898515; 0.2.9 does not). No session owns it: S2 named it as the next measurement and
closed its box. Close this row with that round's count.

## 2026-11-02: the round re-run: the agent says the surfaces and invents no limit (1 run, substitute brief)

`s1/round.mjs` on noodl-mcp's `dist` rebuilt from HEAD (CCN-009, CCN-010, PREVIEWCUT), Sonnet 5.5. Turn 1 asked to open
Studio (`prompt-1-studio.txt`, so the write note fires). The brief is a labelled substitute (`brief-substitute.md`),
because the Muddy Paws project and its scope are no longer on disk. Results, verbatim:
`dev-docs/tasks/phase-128-the-canon-everywhere/s1/RESULTS-2026-11-02.md`.
- `open_studio` was called, and 5 write results carried `studioNote`.
- **Turn 1, unasked:** it named the Expression/Function nodes Studio shows but cannot edit, offered a mini editor, and
  offered the NodeGX editor download with the agent connected. That is the "never offers the editor" half of the
  title, now said.
- **Turn 2** ("Where does the headline's wording come from?"): "I wrote it", with the exact node and file. Read as "who
  wrote it", as both S1 agents did. **No product limit invented** (the other half of the title). Studio and the two
  ways were not repeated in turn 2.
- Count: turn 1 surfaces said **1 of 1**; turn 2 surfaces said **0 of 1** (S1: 0 of 2); invented limits **0 of 2 turns**.

Closed as fixed on what the row was filed for: the agent invented limits and never offered the editor, and in this run
it offered the editor and invented nothing. Caveats: one run, and on a substitute brief. Reopen if a Desktop run
(Richard's) invents a limit again.
