# Phase 116 — next session

**Written 2026-10-11, end of s16 (Opus 5.5).** ONT-000 ✅, ONT-002 ✅, ONT-003 ✅, ONT-007 ✅. ONT-001 🟡 (AC4 →
ONT-008), ONT-004 🟡 (AC2 → ONT-008), ONT-005 🟡 (16 of 38 pinned, unchanged), ONT-006 🟡 (the view is ONT-008's),
ONT-011 🟡 (step 1 ✅), **ONT-012 🟡 (both rules built and graded, reach review owed)**, ONT-013/014/015 📋 (opened by
a Fable chat, below). R1–R10 and R-a to R-g are all ruled (README §9). **No ruling is waiting on Richard.**

## Added 2026-10-10, later (Fable 5.1, a chat with Richard outside the numbered sessions)

**Three tasks opened, none built:** [ONT-013](ONT-013-THE-RULE-IS-A-SENTENCE.md) (a rule no kind asked for:
`docs/world/rules.json`, kept on both engines or shown as *not kept*; rulings R-d, R-e, R-f), [ONT-014](ONT-014-OLD-AND-NEW.md)
(`moves` / `frozen` / `delete: "never"` on ONT-012's seam; flips `setOnce`, `neverEdited`, `neverDeleted` to held;
*settled* projects onto it, so **it goes before ONT-011 step 4**), [ONT-015](ONT-015-A-NUMBER-NEVER-REUSED.md) (a
`series` field option; thin warrant; R-g). **R-d, R-e, R-f, R-g all ruled the same day, each the recommendation (README §9,
ruled table).** README §7 rows and the order line are updated. Nothing
in `packages/` moved. Richard's framing, in his words: "constraining Claude = good" — a rule is a sentence over a fixed
atom set, graded, never free code.

**s16 note on the block above:** those three task files, their README rows (§7, the order line) and the R-d to R-g
table are the chat's, and they were **still uncommitted** at the end of s16. s16 committed around them through a
temporary index (`c00e806eb`): the README in HEAD has s16's status line and ONT-012 row only. Whoever picks this up
should commit them, or ask, once the chat is clearly finished (mtime 23:55 on 2026-10-10). The three modified files
under `packages/nodegx-backend-contract/conformance/` were P109's ISL-039, committed at `f8574d6f7` right after s16's
commit. It also changed both adapters' save/delete/increment with no ACL. The three ONT-012 specs were re-run on that
HEAD: **60/60**.

## What s16 did (Opus 5.5)

1. **Asked R-a, R-b and R-c in plain words** (the representative and the health details; a sent bill; "settled").
   Richard ruled R-a **per-field read rules in the backend** and R-b **a backend rule**, both *against* the
   recommendation. R-c: **its own kind**. The s15 handoff said "R-b … still not asked": it was asked here.
2. **Opened ONT-012** for the two backend rules, from a census of the 23 doors a per-field rule must cover (§4).
3. **Built R-b, `onlyWhile`** (`90e65a999`, ONT-012 §6.1). The condition is ANDed into the write itself on both
   engines. A refused write is told apart from "not yours" by two counts under the caller's own ACL. It answers 409
   with the rule's `says` at PUT, the upsert, BYOB, the batch, DELETE, the relation-only PUT and the MCP update.
   **Found (measured red first):** the manager's own permissions save replaced the collection entry and dropped the
   rule.
4. **Built R-a, `fields.<f>.read`** (`c00e806eb`, §6.2). It is stripped at every facade read and write that carries
   the caller's ACL (an include is stripped by the target's rules) and refused with a 403 naming the field wherever
   a request names one. Realtime strips frames and refuses partial-reach or field-naming subscriptions. Two
   catch-alls had swallowed the 403 (search → 400, `classPut` → 404).
5. **Filed bug `P116-S16-INCLUDECLP` (high):** `include` embeds a record from a collection whose own `get` rule
   refuses the caller. This predates s16 and was found while counting the doors. `it.failing` spec.

## What s16 measured (2026-10-10 23:20 → 2026-10-11 00:10 CEST)

- `ont-012-only-while.test.ts` **32/32** and `ont-012-field-reads.test.ts` **26/26**, each on SQLite and PostgreSQL
  (`postgres:///nodegx_brg005` reachable), with 3 mutants caught. `realtime-hub.test.ts` 12/12 (+4).
  `p116-s16-include-clp.test.ts` 2/2: the control is a 403 and `it.failing` holds. The body was printed:
  `amount: 91000` is embedded.
- Neighbours in band after the R-a build: **32 specs, 490/490** (security, facade, search, realtime, aggregates,
  exports, MCP, permissions routes). After R-b: 166/166 and 183/183.
- `tsc --noEmit`: `nodegx-backend` src, `typecheck:backend-tests`, the admin app, and `nodegx-backend-contract`, all
  clean. The full backend suite was **not** run by s16. A peer ran `jest -w 3` over the whole package 23:34–00:04,
  with s16's R-b commit on disk. Its result was not visible here.

## Before anything

0. **Model check.** The bug and ONT-014's build want **Opus 5.5**. ONT-012's and ONT-014's reach reviews and ONT-011
   steps 2 and 4 want **Fable 5.1**.
1. **`node scripts/bugs.js --from P116`**: 4 open, worst first. P116-S16-INCLUDECLP is high.
2. **One heavy job on this box:** `pgrep -fl bin/jest`. Peers ran backend and node-spec suites all through s16.
3. Commit or settle the Fable chat's uncommitted P116 files (above) before editing README §7 or §9.

## The next tasks, in order

1. **Bug `P116-S16-INCLUDECLP`** (Opus, high). The fix is in the bug file. Carry "may not get" plus the target's
   `get` narrowing in the ACL option the way `hidden` rides. `toWire` degrades an unreadable target to a Pointer.
   `refuseHiddenNamed`'s path walk refuses a hop through a collection the caller may not `find`. Flip the
   `it.failing`.
2. **ONT-012's reach review** (Fable): "which door would let a hidden detail out, or a sent bill change, and when?"
   Start from §4 and §7. Candidates s16 did not grade: workflow steps and cloud functions run as admin (by design,
   said); `rawCreate` echoes what the creator sent; the unique-409 echo; a `$relatedTo` on a hidden Relation field.
3. **ONT-014, old and new** (Opus build, then a Fable review), on the `onlyWhile` seam. It goes before ONT-011 step
   4.
4. **ONT-011 step 2, the vocabulary** (Fable). *Settled* becomes the fifteenth kind (R-c), and its projection targets
   ONT-014/`onlyWhile` and `fields`.
5. **ONT-008** (Opus) once P112 **OWN-007** has started. It was still 📋 on 2026-10-11 (P112 s6 ruled R3: a skill in a
   public repo).
6. If all of that is blocked: bug `P116-ONT-007-required` (medium), and ONT-002 §6.7's two "not built" items.

## For Richard (not blocking; ask only when the work reaches them)

- **Who may change a field** (a per-field `update` rule) is not ruled. Today a caller with `update` can overwrite a
  detail they cannot read.
- **Search** is refused outright for a caller who has any hidden field on the collection. Refining it to "refused only
  when the index holds that field" needs the index's field list at the facade.

## Owned elsewhere

- `rel002b-fail-closed` red: bug `P116-S13-REL002B` (P82/TPL-001). `ac2-page-editor-drag-drive` hangs: bug
  `P116-S13-AC2STALL` (P77/SBR-007).
- `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user". The untracked `.d.ts` emits in
  `packages/nodegx-backend-contract/src/` are not P116's.

## Not yet

The "mandatory project-docs folder" rule is only a DIRECTION.md candidate (R1). Do not read the lessons backend's
live schema without its admin token. The brief is read only through `validate_world` (R5). A borrow candidate is
never a kind until step 2 says so. Adding one to `kinds` without `kinds.ts` turns `world.test.ts` red.

## Memory

`ontology-is-the-spec.md` (an s16 paragraph). Size-check the index (17,510 UTF-16 units; it is AT the budget).
