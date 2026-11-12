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

## Bugs and the packages

Some of what this repo finds is a fact about a package other people will install: `@nodegx/node-spec` (what a node
does, P107) and the phase 112 kit (`@nodegx/project-contract`, the preview, the observe protocol, `@nodegx/canvas-look`,
the editor suite), and `@nodegx/core`. A bug found by any phase, in any template, is a lesson for that package, and two
header lines make sure the package learns it:

| field | values |
|---|---|
| `kit` | the package whose behaviour the bug is about: `node-spec` · `project-contract` · `preview` · `observe` · `canvas-look` · `editor-suite` · `core` · `mcp` |
| `regression` | the scenario, test or fixture that reproduces the bug **inside that package's own suite**, as a repo path, optionally followed by the scenario's name in quotes: `packages/nodegx-node-spec/scenarios/String Format.json "a placeholder used twice fills EVERY time — the port description says only the first (§6 row)"` |

## Bugs the Beta launch waits on

Until NodeGX Studio's Beta launch (BOARD.md: Richard building a simple app in Studio, editing workflows and the DB,
privacy rules, road testing it and deploying it to a VM), a row that would stop or spoil that walk carries
`launch: beta` in its header. `node scripts/bugs.js --launch beta` lists them, scheduled ones included. **When you file
a row that touches the walk, tag it** and add it to the session plan in `dev-docs/reviews/beta-bug-sweep-2026-10-24.md`
("Before the Beta launch"), where bug-list sessions take their work from.

**Before you file a bug about a node, run the node's spec.** If `packages/nodegx-node-spec/scenarios/<Type>.json`
exists, the node's behaviour is written down and graded against the runtime. Play your case through it (a scenario, or
`mount` / `set` / `settle` in a scratch script). If the spec already does what you saw, the bug is the runtime, the
export or the description disagreeing with it: say which. If the spec does something else, you may have read the code
wrong. 2026-10-02: `P109-S5-STRINGFORMAT` said String Format fills a repeated placeholder only once, from the comment
in `stringformat.ts`; the spec and the runtime both fill every one, and the real defect was the comment and the port
description (`P107-D2`), which a String Format scenario had pinned since 2026-09-30. The wrong bug had already become a
reason to write a Function instead of using the node.

**When a kit bug is fixed**, its `regression:` must exist (`node scripts/bugs.js check` fails a fixed kit bug without
one, or with a path that is not there). The regression ships with the package, so every later version is tested
against the bug. If the fix changes what a specced node does, P107 NSP-010's rule applies too: the spec's `version`
goes up in the same commit with a `changes` entry, and that entry names the bug's id. That entry is what a package's
changelog is made from (P112 OWN-010).

```
node scripts/bugs.js --kit node-spec        # what one package still has to learn
node scripts/bugs.js kits                   # per package: found, fixed, with a regression; and how many are untagged
node scripts/bugs.js kits --suggest         # untagged bugs whose area names a specced node: where tagging starts
node scripts/bugs.js gate preview           # before a publish: exit 1 while the package has an unresolved blocker
```

**A blocker stops a publish** (P112 R6): `gate <kit>` exits 1 while one of the package's bugs is an open,
needs-ruling or scheduled `blocker`, and prints the lesser unresolved ones as the release's known issues.

## Building a bug-fixing phase

Run `node scripts/bugs.js`, choose the bugs (worst first, grouped by area), give each `status: scheduled` and
`phase: <the new phase>`, and write the phase's task files from them. Bugs marked `needs-ruling` need Richard's
decision first.
