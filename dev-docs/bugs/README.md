# The bug ledger

**Every defect any phase finds is logged here, one file per bug, the moment it is found.** A phase's own
`DEFECTS-*.md` or "rows for a ruling" table can keep the long evidence. This ledger is the one place to ask
*"what is still broken?"*, and the list a bug-fixing phase is built from.

```
node scripts/bugs.js                    # what needs picking up: open + needs-ruling, worst first
node scripts/bugs.js --all              # everything, including fixed / wontfix / duplicate
node scripts/bugs.js --area runtime     # filter: --area, --from <phase>, --status <s>, --severity <s>
node scripts/bugs.js check              # validate every file's header (exit 1 on a problem)
```

## Logging a bug

Create `dev-docs/bugs/<id-in-lowercase>-<short-slug>.md`. One bug per file: concurrent sessions never edit the
same file, so they never collide. There is no committed index for the same reason; the script reads the files.

```markdown
---
id: P107-C17
title: JSON Stream Parser freezes the app on a stray `}`
status: needs-ruling
severity: blocker
area: runtime / JSON Stream Parser
found: P107 NSP-013 s12, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2
---

What a person sees, in plain words. Then: where it is (file :line), how to reproduce it (a scenario, a test,
a drive), and the proposed fix with its size.
```

| field | values |
|---|---|
| `id` | `<phase>-<that phase's own id>` (`P107-C17`, `P109-IW-012`) or `<phase>-<slug>`. The phase prefix keeps two sessions from minting the same id. |
| `status` | `open` · `needs-ruling` (Richard decides whether, or which way, it is fixed) · `scheduled` (add `phase:`) · `fixed` (add `commit:`) · `wontfix` (add a reason) · `duplicate` (add `of:`) |
| `severity` | `blocker` (freezes, crashes, loses data, blocks a release) · `high` (a feature does not work) · `medium` (works wrongly in a case a person can reach) · `low` (wording, a description, cosmetic) |
| `area` | the package and the node or surface: `runtime / HTTP Request`, `editor / property panel`, `export / Repeater`, `backend / auth` |
| `found` | phase, task, session, date |
| `evidence` | the file and section that hold the measurement (a scenario, a test, a drive log) |

**Measure before you log.** A bug is something you saw happen, with the way to make it happen again. A
suspicion goes in your phase's notes until it is measured.

**When a bug is fixed**, change its `status` to `fixed`, add `commit:`, and keep the file. The ledger is also
the record of what was found and how it ended.

## Building a bug-fixing phase

Run `node scripts/bugs.js`, choose the bugs (worst first, grouped by area), give each `status: scheduled` and
`phase: <the new phase>`, and write the phase's task files from them. Bugs marked `needs-ruling` need Richard's
decision first.
