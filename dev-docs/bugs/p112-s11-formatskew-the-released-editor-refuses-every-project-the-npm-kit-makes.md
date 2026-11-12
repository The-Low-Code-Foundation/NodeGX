---
id: P112-S11-FORMATSKEW
title: "The only released NodeGX editor (0.3.0) refuses every project `@nodegx/mcp@0.1.0` makes: the kit writes project format 5, the editor opens at most 4"
status: fixed
severity: high
area: release / project format version (`packages/nodegx-project-contract/run-on-value-change-migration.ts` `RUN_ON_VALUE_CHANGE_FORMAT_VERSION`; `packages/noodl-editor/src/editor/src/models/projectmodel.editor.ts` `supportedProjectVersion`; `packages/create-nodegx` closing lines)
kit: mcp
found: P112 OWN-011 s11, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §9
commit: b2ba0320a
regression: packages/noodl-mcp/tests/p112FormatSkew.test.ts "the editor's ceiling is that same constant, not a number of its own"
---

**What a stranger hits.** `npm create nodegx@0.1.0 my-apps`, then the agent's `create_project` through
`npx -y @nodegx/mcp@0.1.0`, makes a project whose `nodegx.project.json` says `"version": "5"`. Opening that folder in
the NodeGX app a person can download today, **0.3.0** (tag `v0.3.0`, 2026-09-27, the newest tag on GitHub), shows:

- a modal, *"Error opening project — This project was saved with a newer version of Noodl. Click here to download"*,
- and, at the same time, a red toast, *"Couldn't load "Reading List" — Its project.json is missing or unreadable"*
  (P112-S11-REFUSALWORDS).

The project does not open. Nothing is written into the folder (checksums of all 15 files equal before and after).

**Why.** Format 5 arrived on 2026-10-02 with P109 ISL-018 (`b2ba0320a`: the run-on-value-change migration became a
one-time format step, 4 → 5). The editor's ceiling moves with that constant, so the editor in this repo opens 5; the
released 0.3.0 predates it and opens at most 4. The npm packages were built from `6b3910215` (2026-10-11), after the
change. Nothing checks that what the kit writes can be opened by the editor people can actually install.

**What it contradicts.** OWN-011 §1 (*"The editor can open the result whenever they want it"*) and AC2;
`create-nodegx`'s own last line, *"Any time you want the visual editor, open the same folder in NodeGX — nothing needs
converting."*

**Not a defect in the kit's files.** The project is valid (`validate_project` 0 errors); a fresh project has no
Function to migrate, so format 5 here only says "the migration is not owed". The gap is between two release trains.

**Ways out (a ruling, not a code choice):** release the editor (a 0.3.x carrying format 5) so the sentence becomes true;
or change `create-nodegx`'s line and the site until that release exists; or have the kit write the lowest format that
says what the project needs (a fresh project could say 4, but then a 0.3.x+ editor would run the migration on first open
and write files — a change on open, which AC2 forbids).

## Closed (2026-10-24): fixed by the release, re-measured

The editor's `supportedProjectVersion` is `Number(RUN_ON_VALUE_CHANGE_FORMAT_VERSION)` from the shared contract (5),
since `b2ba0320a` (P109 ISL-018, the 4 → 5 step), and every editor release from v0.4.0 to v0.4.3 contains it
(`git tag --contains`). The kit writes the same constant, so a released editor opens what the kit makes. The row was
about 0.3.0 being the only release; it no longer is.
