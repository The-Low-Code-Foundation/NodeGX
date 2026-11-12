# P128 S1 (CCN-009): the agent reads the canon, measured

2026-10-27. The server is this checkout's rebuilt `packages/noodl-mcp/dist`; the agent is a fresh `claude -p` on
Sonnet 5.5 (Claude Code 2.1.251) in a lab made by the local `create-nodegx`, HOME moved into the lab, sealed from the
repo (`round.mjs`). Brief: `NodeGX test projects/Muddy Paws Shelter/docs/decisions/000-initial-scope.md`, copied in as
`brief.md`. Turn 1 is `prompt-1.txt` (make the project, build Home with its header and the English/French switch, no
questions); turn 2 is `prompt-2.txt`, the same session resumed: *"Where does the headline's wording come from?"*

`claude -p` is not an MCP Apps host, so the panel is not drawn: these rounds grade the agent's choices and words, not
the fake host's frame (P125's `tools-fake-host.mjs` draws a panel for a CDP drive; it runs no model).

## AC1: `get_project_info` on Muddy Paws Shelter (built dist, `ac1.mjs` on a copy)

`surfacesDoctrine` 4,220 characters; the `[surfaces]` MUST_KNOW line present; `readFirst.sections` lists six;
`get_project_info({section:"surfaces"})` is one part (under the 6,000-character part size) equal to the field; the
offer sentence and `Option sets/<Name>` in it; the bound briefing names the section. **Met.**

## The rounds

| round | the `[surfaces]` line reached the agent | built | Set Variable step | turn 2 | cost |
|---|---|---|---|---|---|
| 1 (`/private/tmp/p128-s1-lab`) | no: the result was cut to a 2 KB preview, and the round's own fence refused the agent's read of the saved file (P128-S1-FENCEDRESULTS) | `Option sets/Languages` (Static Data → Component Outputs `items`, `count`), repeated by `LanguageSwitch` | `value` ← the row's `id` | "I wrote the headline's wording myself … an `Expression` node named `tHeadline`": names the part; nothing about Studio, no offer | $4.60 + $0.20 |
| 2 (`…-lab2`, fence fixed) | no: the 2 KB preview again, and the agent did not open the file (P128-S1-PREVIEWCUT) | no option set: a boolean `isFrench` and `/Components/Translate` per string (Muddy Paws' own pattern) | `setWith: boolean` | not asked | $3.92 |
| 3 (`…-lab3`, the line moved second) | yes, in the preview | `Option sets/Languages` (same shape), repeated by `LanguageSwitch` | `value` ← the row's `code` | "I wrote it … the `en` and `fr` parameters of the `tr_head` Tr node": names the part; nothing about Studio, no offer | $4.21 + $0.50 |

No round fetched `get_project_info({section:"surfaces"})`, and no agent's turn-1 summary said a part it built is one
Studio does not edit (canon rule 4). No round reached the hand-over: a scope of fourteen pages, one built.

## Readings against the ACs

- **AC2: met in round 3** (the round that could read the line) and in round 1; not in round 2 (could not).
- **AC3: not met (0 of 2).** Both agents read "where does it come from" as "who wrote it", named the node exactly, and
  said nothing of Studio or the two ways. The text was in `surfacesDoctrine`; no agent fetched it. What the plan has
  for this is S2's write note (CCN-010: a write that places a node Studio does not edit, while Studio is open, says so
  in its result), the push at the moment of the write. Re-run turn 2 on round 3's lab after S2 lands: `node round.mjs
  <a fresh lab> ` then `--again prompt-2.txt`.
- **AC4: met by the spec** (`tests/p128CanonPin.test.ts`): the apply that builds the scope's last page carries
  `handover`, once; none before; none without a recorded scope.
- Also seen: resumed, the server is a new unbound process (the project is in a subfolder of the lab), and round 3's
  agent took the seven tools for a disconnected server.
