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
