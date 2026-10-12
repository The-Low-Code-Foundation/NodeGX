# ISL-047 — The repository installs, and the dev stack leaves other people's work running

**Status: ✅ s42 (2026-10-11): closed — 2 of 2 fixed, plus one found beside them: LOCKFILE `61694bc27`, DEVSWEEP + P109-S42-SHELLSEED `d20dd013f`. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 2 bugs
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

## 8. Record

### s42 (2026-10-11) — 2 of 2, and one found

**AC1:** both re-measured at HEAD and both still fired.
- **LOCKFILE:** in a scratch copy holding only HEAD's manifests and lockfile, `npm ci --dry-run --ignore-scripts` →
  exit 1, *"Missing: @nodegx/canvas-look@0.1.0 from lock file"*.
- **DEVSWEEP:** on the live process table, a standalone sleeper whose command line reads like
  `bin/nodegx-backend.js serve` was in `findDevProcesses()`'s list.

| row | commit | what changed | graded by |
|---|---|---|---|
| LOCKFILE (high) | `61694bc27` | the two `@nodegx/canvas-look` workspace entries, added by hand to HEAD's lockfile (no Mac regeneration); `npm run lockfile:check` | `npm ci --dry-run` exit 1 → 0 in the scratch copy; `lockfile:check` exit 1 on the old lock, 0 on the new |
| DEVSWEEP (medium) | `d20dd013f` | `isSeedCommand`: the `bin/` backend a person types is not a seed (the editor and the door spawn `dist/cli.js`) | `tests-unit/dev-tools/a-sweep-spares-a-hand-started-backend.test.ts`, red on its arm with HEAD's sweep |
| P109-S42-SHELLSEED (found) | `d20dd013f` | the immediate parent of a protected suite is shielded with it | same spec, the shell arm, red with HEAD's sweep |

**Found while measuring:** `dev:stop -- --list` named the zsh wrapping this session's own full backend run. An agent's
shell `cd`s into `packages/nodegx-backend`, so it seeded; the suite was shielded and its shell was not.

**Left for someone else:**
- 🔴 **The working copy's `package-lock.json` is a stale 2026-09-24 file**, older than `a9c10ff8c`. It shows as
  "modified" by removing `@nodegx/node-spec`'s entries. Committing it would undo them and break `npm ci` on Windows
  again. Nobody's live edit: nothing has touched it since 24 September. It should be restored to HEAD by whoever owns
  it, or by Richard's say-so (this session did not touch it).
- DBT's START-HERE still tells a person to start the backend through a symlink outside the checkout. That workaround is
  no longer needed (P78 owns the template's docs).
