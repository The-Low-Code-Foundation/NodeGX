# P128 S2 (OWN-027, CCN-010): the option-set example, the validator's hint, the write note, measured

2026-10-27. Every reading below is the **rebuilt** `packages/noodl-mcp/dist` (14:21) bound over stdio to a copy of
`NodeGX test projects/Muddy Paws Shelter`, with the real NodeGX Studio started by `open_studio`
(`NODEGX_STUDIO_NO_OPEN=1`): `node s2/ac.mjs <copy>`, sandbox off (Chrome). The package spec is
`packages/noodl-mcp/tests/p128OptionSet.test.ts` (14/14).

## The ACs

| AC | reading | |
|---|---|---|
| the example renders | `get_example('option-set')` written into the copy (`/Option sets/Languages`, `/Pages/Language`, registered on the router): `render_report` **DONE** ("nothing is broken", the default-template warnings only); `drive_page` 4/4: the dropdown's options read `English\|Français`, `language` is `null` before a pick, a pick of `fr` stores `fr` | met |
| the Wording write returns the note with `States` named | Muddy Paws' own create of `/Components/Wording` replayed (read, force-delete, create) with Studio open: success, `notDrawnInStudio` = `langvar-3` Variable2, `wordStates` **States**, and `studioNote` carrying canon rule 4 and the offer sentence verbatim; the same create with no Studio (a fresh server): no field | met |
| the two-literals case returns the suggestion | `validate_component` on `/Components/Header` (`Set language to English` / `… French`): one `info`, `fixed-list-as-literals`, suggestion `a fixed list is an option set, see get_example('option-set')`; 0 errors | met |
| gates green, dist rebuilt | spec 14/14; catalog:examples 115/115; noodl-mcp 5044 pass, 12 fail in 8 files: S1's 5 HEAD reds, 2 peer TPL-011 files, and `ui-empty-state`, refused by the instance-port error S2's code does not emit (not re-run without S2), the rule `79cbc4674` added: P128-S2-EMPTYSTATEREFUSED; dist rebuilt | met |

## What the render caught

The first version of the example had a "Chosen language" Text reading the variable; `render_report` said **NOT DONE,
dead-placeholder-text**: nothing sets `language` at load, so the Text drew its node default ("Text"). Removed; the
Variable now only preselects the dropdown. The render gate graded the example before an agent copied it.

## Not done here

- AC3 of S1 (the agent's answer to "where does the headline's wording come from?") is **not re-measured**: it needs a
  Sonnet round (`s1/round.mjs` then `--again s1/prompt-2.txt`), and the note only fires once the agent has called
  `open_studio` in that session. The note now exists; the round is the next measurement.
- `session_status` does not list the notes (the audit's CCN-010 row says it should; the S2 plan did not).
- The authoring doctrine's "Rows are data" MUST_KNOW line is unchanged: S1's `[surfaces]` line already says a fixed
  list is a Static Data node under `Option sets/`, and MUST_KNOW sits inside Claude Code's 2 KB preview.
- Defects met: P128-S2-OPTSETSHAPE (Studio's `display` rows vs the Dropdown's `Label`/`Value`), P128-S2-ACTIONNAMES
  (three of Studio's Actions are display names; read, not measured).
