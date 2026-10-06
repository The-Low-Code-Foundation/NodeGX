# ISL-035 — An exported app loads what the deployed one loads

**Status: ⬜ not started. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 2 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 1 high · 1 low. **Side:** nodegx-export (kit bridge, scaffold, Array Filter plan)

## 1. The person sentence

**An app exported to React loads its kits' dependencies and filters its lists the way the deployed app does.**

## 2. Why these belong together

Two places where the export quietly differs from the deployed runtime. A kit's `manifest.dependencies` are copied
into the export and never referenced, so an exported 3D kit draws nothing (S17-EXPORTKITDEPS, **high**). The export reads
an Array Filter key like `owner.id` as one field name, while the runtime reads it as a path (S15-ARRAYFILTERPATHEXPORT).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P109-S17-EXPORTKITDEPS](../../bugs/p109-s17-exportkitdeps-an-exported-app-never-loads-a-kits-dependencies.md) | high | open | An exported app never loads a kit's `manifest.dependencies` — the files are copied, nothing references them |
| [P109-S15-ARRAYFILTERPATHEXPORT](../../bugs/p109-s15-arrayfilterpathexport-the-export-filters-a-dotted-key-as-one-field-name.md) | low | open | The React export filters an Array Filter key like `owner.id` as one field name, while the running app reads the field inside `owner` |

## 4. Order of work

S17-EXPORTKITDEPS first.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line. Re-run its
  reproduction at HEAD before building. A row that no longer reproduces is closed in the ledger with the commit that
  fixed it, not fixed again.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:` if it has a `kit:`).

## 6. Related work and collisions

- 🔴 **Phase 18 owns the export** and has a pile of uncommitted work in `packages/nodegx-export` (see `git status`).
  Hand these two to P18's next session as E-rows, or build them here only after checking P18's NEXT-SESSION-PROMPT and
  the working tree. Do not edit a file P18 has dirty.
- Sweep rule: this task was made from the ledger, **not re-measured** when it was written (2026-10-05). The first session
  re-measures each row (§5) and closes the ones already fixed before it asks or builds anything.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled. A row ruled "keep it" becomes `wontfix` with the
  ruling as its `reason:`, or moves to [ISL-033](ISL-033-A-NODES-DESCRIPTION-SAYS-WHAT-IT-DOES.md) when the ruling is
  "describe it, don't change it".
- **AC3** — every row ruled "fix it" is fixed, one commit each (or one per shared mechanism), with its regression
  (`regression:` in the ledger) green and its known row dropped in the same commit.
- **AC4** — `node scripts/bugs.js --from P107` and `--from P109` list none of this task's rows as `open` or `needs-ruling`.
