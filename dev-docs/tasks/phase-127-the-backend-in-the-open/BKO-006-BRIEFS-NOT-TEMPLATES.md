# BKO-006 — Three full-stack briefs no template covers; then Richard's Desktop run

**Phase:** [127](README.md). **Depends on:** BKO-001 to BKO-005. **Method:** the stranger round
([a-stranger-agent-round-recipe] in memory; P124 `stranger/round.mjs`), headless Claude Code against the npm kit,
followed by Richard in Claude Desktop with the `.mcpb`.

> "I don't want to launch a Beta app that can only make a couple of template app types. I want people to be able to
> play with it to make whatever they want." — Richard, 2026-10-26

## The briefs (each has sign-in, data a person owns, a rule, and one automation)

1. **A book club:** people sign in, add books, rate them; each person sees only their own reading list, and everyone
   sees the club's top five. A weekly digest every Monday.
2. **A small repair shop's job board:** customers book a repair, staff move it through stages; a customer sees only
   their own jobs; a text-style notice row when a job is marked ready (row-change trigger).
3. **A team's shared expenses:** members log what they paid, the app works out who owes whom; only members of a group
   see it; a monthly reminder.

None of these may start from a template or an example's backend. The stranger gets only the brief.

## What is graded, per brief

- **It works:** sign-in, the rule refuses a stranger, the automation runs (fired by hand), and `render_report` is clean.
- **It is open:** every table, rule, function, workflow and trigger is in the project's files (`git status` after the
  run lists them).
- **It is drawn:** the map, Privacy, each function and each automation draw in Studio inside a conversation (fake
  host), with no training word.
- **It travels:** a ship to the throwaway VM carries all of it.
- **What the agent needed:** tool calls, time, cost, and every place it had to work around NodeGX. Each workaround is a
  row in `dev-docs/bugs/` or a task here.

## Then Richard

A fourth brief of Richard's own, in Claude Desktop, from the `.mcpb`. His findings are the Beta's list.

## Acceptance

All three briefs pass the four grades, or every failure is a filed row with an owner. Richard has done his run.

## Session log

### s6 (2026-10-27): the round built, the three briefs run and graded, the defects they met fixed

**The round** ([`briefs/`](briefs/)): `round.mjs <brief> <labRoot>` (P124's runner with no project handed over),
`briefs.json` (the three briefs in a person's words, one frame), `grade.mjs` (open and works), `travel.mjs` (a ship to
a fresh `nodegx-shiptest-vm` container by the published `deploy_to_vm`), and Studio's `editor/brief-check.mjs` (drawn:
any app's copy, its backend from Studio's Start a backend, the panel in the fake host at a foreign origin). The lab is
`npm create nodegx@0.2.7` (0.2.7 on npm carries BKO-001: measured in its tarball), Opus 5.5, HOME in the lab, sealed
from the repo and the other labs. Two runner fixes on the way: macOS `open` is shimmed (the first stranger's
`npx @nodegx/preview --open` put a browser on Richard's screen), and a stranger is ended five quiet minutes after a
turn ends (a preview it leaves running keeps `claude -p` up; a turn's end is not the end — a background wait wakes it).

| brief | agent | open | works | drawn | travels | its own automation |
|---|---|---|---|---|---|---|
| book club | 37.5 min, $5.84 | 5/7 | 8/8 | 16/16 | 8/10 (both misses the grader's path; the deploy log names both files installed) | a Monday schedule → a function |
| repair shop | 18.5 min, $5.85 | 5/7 | 7/7 | 14/14 (5/10 on Studio's old pin: STUDIOPIN) | 10/10 | none: the function that moves a job writes the notice |
| shared expenses | 18.5 min, $6.01 | 10/13 | 9/9 | 27/27 | 16/16 (15/16 before the grader read `workflow-defs/`) | the 1st of every month → a two-step workflow |

Every "open" miss is the same one: the app's tables were on the backend only (TABLESNOTINFILES, fixed in source after
the runs; the strangers ran the published 0.2.7). Every rule, function, trigger and workflow the three agents made was
in the files, drawn inside the conversation, and on the VM after a ship. What the grade does not yet check: a
group-only rule (the expenses brief's "only a group's members see it") is not driven; `works` drives the
creator-owned tables and a visitor's refusal.

**Filed and fixed this session** (each with its test and a mutant that turns it red):
- P127-BKO006-TABLESNOTINFILES — `provision_backend` writes the backend's tables into `metadata.dbCollections` and
  seeds a new backend from the project's declared ones (noodl-mcp `p127ProvisionTables` 2/2).
- P127-BKO006-TRIGGERNAME — a trigger's function name read against what is served; the short name resolved and said,
  two matches refused, none warned (`p127FunctionTarget` 5/5 + a wire line).
- P127-BKO006-SCHEDULEREASON — a refused fire keeps the function's reason (backend `p127-trigger-reason`).
- P127-BKO006-NOFIRE — `fire_backend_trigger` (backend group, write-gated; the budget gate unaffected).
- P127-BKO006-CRUDIDSOURCE — the CRUD example's `idSource`, and the example gate's context hole (115/115).
- P127-BKO006-OWNERCOLUMN (high) — a "creator" table failed every list until its first row; the narrowing is read
  against the table's columns (backend `p127-owner-column`, SQLite and PostgreSQL).
- P127-BKO006-EXPORTHASHES (high) — the HTTP export hid nothing; it leaves out every `_` field now (CLI unchanged).
- Studio's Privacy example said "staff" in every app (now "admins" or "members").
- P127-BKO006-STUDIOPIN (high) — Studio's 0.2.6 backend refused the 0.2.7 kit's "creator" rule: pins moved to
  `@nodegx/mcp` 0.2.7, `@nodegx/backend-map` 0.1.3, `@nodegx/preview` 0.2.7, vendor/ at NodeGX 2fde69490 (Studio
  668212a; every Studio gate green, data-check 79/80 once then 80/80: "Task's field due" for "Note's", a flake).
- P127-BKO006-WFRESULTPATH — the call-function step's words (412a19833).

**Filed, open:** SCHEDULEAUTH (2 of 3 briefs; needs Richard's ruling: a schedule runs as a visitor, so two agents
opened their scheduled function to anyone), RUNONCHANGEGUESS (2 of 3), EMPTYSTARTPAGE (2 of 3), CLOUDUSERNODE,
NOROLESFAILS, ROLESNOTINFILES, COMPVISIBLE and DRIVEHALFRUN (both reported, not yet re-measured).

**Gates:** backend (no Chrome drives) 3,191 passed, 2 failed (rel002b, isl040: both red in a clean worktree, isl040's
scan meets `actingSession.ts` from 98785a116); workflow suites 350/350 after WFRESULTPATH; noodl-mcp full suite 5,006 passed, 12 failed in 8 files; the same 8 tests fail in a clean worktree at HEAD
289d5a461 with and without this session's patch (def038 and tpl011 fail only in the shared checkout: peers' open
edits). Runtime adapters 341/341.

**Against the acceptance list:** the three briefs pass "works", "drawn" and "travels"; "open" fails only on the
tables, fixed in source (TABLESNOTINFILES, test and mutant) and live for a stranger with the next `@nodegx/mcp`; every
other failure is a filed row with an owner or "none". Not done: Richard's fourth brief in Claude Desktop (the second
half of the acceptance).
