# ISL-036 — The gates are green for the right reason

**Status: ✅ closed s39 (2026-10-10): all 6 re-measured (all six still fired; FLD-011's race made deterministic first), all 6 fixed, each with a control (§8).** Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F). **Source:** 6 bugs from
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
| [P109-S6-D54](../../bugs/p109-s6-d54-theme-chip-mutant-row-red.md) | low | fixed `d21517793` | D54's mutant row reads the wrong colour — a chip publishing a bare name is not swallowed on the re-press |
| [P109-S6-TPL007](../../bugs/p109-s6-tpl007-kit-types-copies-stale.md) | low | fixed `7ad544278` | Rocket School's checked-in kit type copies differ from what the generator writes (two node-kit.d.ts) |
| [P109-S9-CMP001RATE](../../bugs/p109-s9-cmp001rate-the-doctrines-corpus-publish-rate-reads-39-not-33.md) | low | fixed `5e5b19408` | The interface doctrine says the example corpus publishes outputs at 33%; the corpus reads 39%, and the gate is red |
| [P109-S10-TYPECHECKMCP](../../bugs/p109-s10-typecheckmcp-eight-spec-file-type-errors-keep-ci-red.md) | low | fixed `fa1dc081c` | "`typecheck:mcp` (a CI step) is red with eight type errors in the island's spec files" |
| [P109-S15-FLD011ORPHANRACE](../../bugs/p109-s15-fld011orphanrace-a-parallel-render-suite-reaps-fld-011s-planted-orphan.md) | low | fixed `4e4e04447` | fld011ParallelTabs' "reaps an orphan" test fails in a full parallel run — another worker's render suite reaps its planted orphan before the precondition is read |
| [P109-S19-LISTENERREGEX](../../bugs/p109-s19-listenerregex-the-every-listener-gate-reads-an-event-subscription-as-a-socket.md) | low | fixed `cd9d52e28` | "HLS-006's every-listener gate reads `world.listen('resize')` as a socket, and is red at HEAD" |

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

## 8. Sessions

### s39 (2026-10-10, P109 session 39, on `cline-dev`, primary tree) — closed

**AC1:** every row re-measured at the session's HEAD, and all six still fired. S10 read 10 errors where the row said
8. S15 was green in a full run, which proves nothing about a race, so it was made deterministic first: a foreign
reaper sweeping every 300 ms turns HEAD's test red. **AC2:** none needed a ruling. S19 offered two shapes and the
narrower was built. S9 was fixed as its row said ("move the doctrine sentence and the figure together"), with the
figure made a constant.

**AC3 — one commit each:**

| row | commit | the fix | control |
|---|---|---|---|
| S10-TYPECHECKMCP | `fa1dc081c` | ten spec type errors; cg003 D8's `children as string[]` could never go red and now compares ids | `typecheck:mcp` exit 0; a mutant on the D8 line red by name ("not plDrive") |
| S19-LISTENERREGEX | `cd9d52e28` | the node-spec World's `.listen(` skipped by receiver name, not enrolled by file | HEAD red on the three files; the prose test pins both directions |
| S15-FLD011ORPHANRACE | `4e4e04447` | wait for adoption (ppid 1), re-plant if a foreign sweep took it | foreign reaper every 300 ms: HEAD red, fix green twice |
| S9-CMP001RATE | `5e5b19408` | `CORPUS_PUBLISH_RATE` (39) / `SHELF_PUBLISH_RATE` (84) in `prompts/interfaces.ts`, interpolated by the doctrine, checked by the gate | HEAD: Expected 33, Received 39 |
| S6-D54 | `d21517793` | bisected to GAM-011 `85c640b6c`, which made the old mutant correct; the arm states that rule, and the mutant is the still-broken split shape | the same three presses read studio/night/**studio** on one shape and studio/night/**night** on the other |
| S6-TPL007 | `7ad544278` | four stale copies refreshed (rocket-school ×2 and the dbt-lesson pair GAM-015's gate never saw); the gate grades every committed copy via `git ls-files` | HEAD's four copies under the new gate: those four red by name |

**AC4:** `bugs.js --from P109` lists none of them.

**Learned:**
- **A mutant arm can go stale because the product got better.** D54's mutant was "wrong" from the day GAM-011 made its
  shape correct. Bisect the arm with a one-file probe (`git bisect run`, exit 125 when the test cannot run) before
  deciding whether the arm or the product moved.
- **A gate's copy list built from one layout misses the other layouts.** Two of GAM-015's four misses sat at
  `<kit>/types/`. List what is committed (`git ls-files`); never walk the disk, which reads a peer's untracked tree.
- **A cast in a test can make an assertion vacuous.** `x as string[]` over an array of nodes made
  `not.toContain('id')` always pass, and only the typechecker said so.

