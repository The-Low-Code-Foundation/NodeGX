# ISL-036 — The gates are green for the right reason

**Status: ⬜ not started. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 6 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 6 low. **Side:** tooling (typecheck:mcp, noodl-mcp specs, export tests, template byte gates)

## 1. The person sentence

**Every CI gate is either green because the thing it checks is true, or red with a name. None is red for a stale literal, and none is too weak to go red.**

## 2. Why these belong together

Six gates that lie in one direction or the other. `typecheck:mcp` is red in CI with eight type errors that no local run
sees (S10-TYPECHECKMCP). FLD-011's orphan test is reaped by a parallel suite (S15-FLD011ORPHANRACE). The doctrine's
"33%" literal reads 39 (S9-CMP001RATE). D54's mutant arm can no longer go red (S6-D54). HLS-006 reads `world.listen` as a
socket and is red at HEAD (S19-LISTENERREGEX). Rocket School's kit-types copies are stale (S6-TPL007). A red gate that
everyone ignores hides the next real failure (memory: *lone red = flake*).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P109-S6-D54](../../bugs/p109-s6-d54-theme-chip-mutant-row-red.md) | low | open | D54's mutant row reads the wrong colour — a chip publishing a bare name is not swallowed on the re-press |
| [P109-S6-TPL007](../../bugs/p109-s6-tpl007-kit-types-copies-stale.md) | low | open | Rocket School's checked-in kit type copies differ from what the generator writes (two node-kit.d.ts) |
| [P109-S9-CMP001RATE](../../bugs/p109-s9-cmp001rate-the-doctrines-corpus-publish-rate-reads-39-not-33.md) | low | open | The interface doctrine says the example corpus publishes outputs at 33%; the corpus reads 39%, and the gate is red |
| [P109-S10-TYPECHECKMCP](../../bugs/p109-s10-typecheckmcp-eight-spec-file-type-errors-keep-ci-red.md) | low | open | "`typecheck:mcp` (a CI step) is red with eight type errors in the island's spec files" |
| [P109-S15-FLD011ORPHANRACE](../../bugs/p109-s15-fld011orphanrace-a-parallel-render-suite-reaps-fld-011s-planted-orphan.md) | low | open | fld011ParallelTabs' "reaps an orphan" test fails in a full parallel run — another worker's render suite reaps its planted orphan before the precondition is read |
| [P109-S19-LISTENERREGEX](../../bugs/p109-s19-listenerregex-the-every-listener-gate-reads-an-event-subscription-as-a-socket.md) | low | open | "HLS-006's every-listener gate reads `world.listen('resize')` as a socket, and is red at HEAD" |

## 4. Order of work

S10-TYPECHECKMCP and S19-LISTENERREGEX first (red in CI now), then S15-FLD011ORPHANRACE, S9-CMP001RATE (use the constant, never bump the literal), S6-D54 and S6-TPL007.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line. Re-run its
  reproduction at HEAD before building. A row that no longer reproduces is closed in the ledger with the commit that
  fixed it, not fixed again.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:` if it has a `kit:`).

## 6. Related work and collisions

- S19-LISTENERREGEX is in P18's export tests. Coordinate as for ISL-035.
- S6-TPL007: a peer had the tpl007 files dirty when it was filed. Check `git status` first.
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
