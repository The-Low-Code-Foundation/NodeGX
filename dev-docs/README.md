# NodeGX development docs

**Start here, every session:**

1. [DIRECTION.md](DIRECTION.md) §0: why NodeGX exists. Three pillars: the blueprint stays open (an editor for this
   app is a view over its files), the knowledge ships with the project (the seed), the off-ramp (React, then Swift).
2. [BOARD.md](BOARD.md): the seven lanes of 0.5.0, what waits on Richard, what is parked. Pick one lane; read its task
   file and its phase's `NEXT-SESSION-PROMPT.md`.
3. [bugs/](bugs/README.md): one file per bug; `node scripts/bugs.js` lists them.

The phases from earlier strategies (the editor revival, the alpha, the university, the site builder) are in
[tasks-archive/](tasks-archive/README.md). They are history, not work.

## What NodeGX is now

A framework a person's agent builds apps inside, installed from npm (`npm create nodegx`, `@nodegx/mcp`,
`@nodegx/preview`, `@nodegx/export`). The agent writes the app as a graph of specced nodes in plain files. The
Electron editor in `packages/noodl-editor` is optional: the reference client that opens the same files on the day the
person wants to see or change something themselves. Running it: `npm run dev` opens an Electron window; the webpack
server on `localhost:8080` is internal to Electron, not a page to open in a browser.

## The folders

```
dev-docs/
├── DIRECTION.md      why (§0), the reasons, the rulings
├── BOARD.md          what is open and agreed: the lanes
├── bugs/             the bug ledger, one file per bug
├── tasks/            the phases the board names
├── tasks-archive/    phases from earlier strategies (not read)
├── parked/           one page per idea not yet a phase
├── reviews/          point-in-time assessments (dated; older ones are history)
├── guidelines/       PHASE-EXECUTION.md (build the tasks, don't farm the defects), coding, testing, git
├── reference/        codebase map, node patterns, contracts, common issues
└── qa-fixtures/      fixtures some tests read
```

## Key resources

| | |
|---|---|
| 🔴 [Phase Execution](guidelines/PHASE-EXECUTION.md) | how a phase spends its sessions; read before writing a handoff |
| [Compatibility Policy](reference/COMPATIBILITY-POLICY.md) | NodeGX is a fresh start: legacy Noodl projects are not a design constraint |
| [Codebase Map](reference/CODEBASE-MAP.md) | the monorepo |
| [Node Patterns](reference/NODE-PATTERNS.md) | creating nodes |
| [Common Issues](reference/COMMON-ISSUES.md) | troubleshooting |
| [Task template](TASK-TEMPLATE.md) | the shape of a task file |

[archive/](archive/) holds the editor revival's loose documents (the Cline setup, the viability brief of 2026-07-22);
`sprints/`, `future-projects/` and the older `reviews/` date from that plan too, and stay where they are because
templates and code comments cite them.
