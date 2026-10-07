# ISL-047 — The repository installs, and the dev stack leaves other people's work running

**Status: ⬜ not started. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 2 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 1 high · 1 medium. **Side:** the root package-lock.json, scripts/dev-processes.js

## 1. The person sentence

**`npm ci` installs the checkout as committed, and starting the editor's dev stack stops only what it started.**

## 2. Why these belong together

Two ways the repository works against the people using it. The root lockfile has no entry for the `@nodegx/canvas-look` workspace, so `npm ci` refuses the tree and every CI job that installs fails before it builds (re-read 2026-10-07 at `088579843`: still no entry). Starting the dev stack kills a backend someone started by hand from the checkout.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P112-S1-LOCKFILE](../../bugs/p112-s1-lockfile-canvas-look-missing-npm-ci-refuses.md) | high | scheduled | The root package-lock.json has no entry for the new @nodegx/canvas-look workspace — `npm ci` refuses the tree, so every CI job that installs the monorepo fails before it builds |
| [P78-DBT-DEVSWEEP](../../bugs/p78-dbt-devsweep-starting-the-dev-stack-kills-a-backend-started-by-hand-from-the-checkout.md) | medium | scheduled | Starting the editor's dev stack kills a backend someone started by hand from the checkout |

## 4. Order of work

LOCKFILE first (every CI install).

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- 🔴 `package-lock.json` carries another session's uncommitted edit on 2026-10-07. Regenerate it only when that is committed, and on a lockfile made on a Mac check the other platforms' prebuilts (memory: *a lockfile made on a Mac drops other platforms' prebuilts*).
- Sibling: [ISL-036](ISL-036-THE-GATES-ARE-GREEN-FOR-THE-RIGHT-REASON.md).

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (none today).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.
