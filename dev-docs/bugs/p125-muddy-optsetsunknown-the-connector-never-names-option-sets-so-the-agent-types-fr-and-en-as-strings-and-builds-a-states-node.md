---
id: P125-MUDDY-OPTSETSUNKNOWN
title: Nothing the agent reads names option sets (0 mentions in noodl-mcp's source, the briefing, the five guidance sections, the seeded docs), so a fixed list becomes typed strings (`language` set to 'fr' / 'en' in two steps, `sex` as text) and, asked for something no-code, a States node Studio cannot draw
status: fixed
commit: 0be3a25e9 (S1, the words), 5a74b841a (S2, the example and the hint)
severity: high
area: "noodl-mcp `src/guidance.ts` (SECTION_FIELDS, MUST_KNOW), `src/instructions.ts`, `src/tools/read.ts` (get_project_info), the seeded `CLAUDE.md` / `CONVENTIONS.md`; Studio's shape for a set is settled (SCOPE R6 2026-10-23: a logic component under `Option sets/<Name>`, one Static Data node, `metadata.optionSet.attributes`; `nodegx-studio/editor/studio.html:5428–5441`)"
found: Richard's Muddy Paws Shelter run in Claude Desktop, 2026-10-27 (his point 3; the video at 17:40 and 22:00)
evidence: dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md §1.3 — MEASURED: `grep -ri 'option set' packages/noodl-mcp/src` finds 0 files; `NodeGX test projects/Muddy Paws Shelter` has no `Option sets/` component, a `Variable2` named `language`, two `Set Variable` steps typing the literals, `/Components/T` with the Expression `lang === 'fr' && fr ? fr : en`, and a `States` node with 18 parameters in `/Components/Wording`; the agent's reply says "NodeGX has no option-set type"
owner: P128-S2
task: CCN-009 (proposed in the audit §4), OWN-027 for the example and the validator's suggestion
launch: beta
regression: packages/noodl-mcp/tests/p128OptionSet.test.ts (the example, the hint); p128CanonPin.test.ts (the section, the MUST_KNOW line)
---

Fix (words): a `surfaces` guidance section and one MUST_KNOW line in `get_project_info` that say what an option set
is, when it is the part (a language, a status, a sex, any fixed list), and its file shape; an example
`option-set`; `validate_component` suggesting one when two steps type the same literal into a Set Variable.

## 2026-10-27, P128 S1 (CCN-009): the agent is told; 2 of 3 rounds built the set

Landed: canon rule 5 (`Static Data` in `Option sets/<Name>` with `Component Outputs` items and count) in the
`surfaces` section and the seeded `CLAUDE.md`, and the MUST_KNOW line second in `readFirst` (inside the 2 KB Claude
Code shows of a long result: P128-S1-PREVIEWCUT). Measured on the Muddy Paws brief (s1/RESULTS.md): rounds 1 and 3
built `Option sets/Languages` repeated by the header's switch, the Set Variable fed from the row; round 2, which could
not see the line, built a boolean and a translate component. Open for the example and the validator's hint (OWN-027,
P128 S2).

## 2026-10-27 night, P128 Beta round Track B: re-measured on HEAD and on 0.2.9, closed

`dev-docs/tasks/phase-128-the-canon-everywhere/beta-round/muddy-rows.mjs` on a copy of `templates/todo-list`, the
same readings on both builds: HEAD's `packages/noodl-mcp/dist` (rebuilt 22:02, HEAD 9db1a9f6e) and the published
`@nodegx/mcp` 0.2.9 tarball (`npm-0.2.9-tarballs/nodegx-mcp-0.2.9.tgz`, sha1 5549d6f7…, unpacked). Identical on both:
`get_project_info` carries `surfacesDoctrine` (4,281 characters, names `Option sets/`) and the `[surfaces]` MUST_KNOW
line second; "option set" appears 3 times in the answer (0 before S1); `get_example('option-set')` returns `/Option
sets/Languages` and `/Pages/Language`; Muddy Paws' Header (two Set Variable steps typing `en` / `fr`) is written with
one `info` `fixed-list-as-literals`, suggestion "a fixed list is an option set, see get_example('option-set')".
Specs at HEAD: `p128OptionSet` + `p128CanonPin` 23/23. Every part of the Fix above is in the published package.
S1's round 2, the one that did not build the set, could not see the line: Claude Code showed it a 2 KB preview
(P128-S1-PREVIEWCUT, fixed 0b4898515 after 0.2.9, so it reaches a stranger with the next release).

