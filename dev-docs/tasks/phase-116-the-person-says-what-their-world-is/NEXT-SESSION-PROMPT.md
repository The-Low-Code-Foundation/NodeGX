# Phase 116 — next session

**Written 2026-10-09, end of s10 (Opus 5.5).** ONT-000 ✅. R1–R7 ruled (README §9). ONT-001 🟡 (AC4 → ONT-008). ONT-003 ✅.
ONT-004 🟡 (AC2 → ONT-008). ONT-005 🟡 (18 of 38 pinned). ONT-002 🟡 ("through what?" owed). **ONT-007 🟡 — AC1 ✅ s10,
AC2 ✅, AC3 ✅**; only the route is owed, and it waits on the executor-home ruling. **ONT-006 🟡 — AC1–AC3 ✅**; the view is
ONT-008's.

## What s10 built (Opus 5.5) — `333ffbc65` (task 1) and the s10 commit after it

- **The MCP's world tools read the fourth file** (ONT-006 §6.7): `validate_world` reads `docs/world/verbs.json` when it is
  there, grades it with the three, and returns `verbs` (`outside`, each verb's words and the functions it calls);
  `write_world` takes optional `verbs`; unreadable ⇒ `partial`. The brief has "What the person does".
- **Found and fixed — the write rule** (`planWorldWrite`): a write that left the verbs out validated only the three files,
  so a relation or noun a verb names could be taken out under it. The kept verbs are now graded against the world written.
- **The runner takes an arm's answer** (ONT-006 §6.7): an unanswered question a failure arm `answers` is on the record
  (`said` = the arm's `sees`, `by: {verb, step, arm}`), not asked. An arm may answer only a `words` question — **a
  decision s10 took; Fable/Richard may revisit it** (ONT-006 §6.7).
- **`verbReach()`** (ONT-007 §6.10): the verbs a plan reaches, read off each step's `on`, with `fields` by what the step
  does and `rebind` when the step's `on` must be re-said. The bombshell fixture grew `verbs.json` ("A company joins").
  **ONT-007 AC1 ✅.**
- ONT-008 §5 lists what ONT-006/007 hand the view (the handoff's old task 4).

## What s10 measured (2026-10-09 ~18:50–19:30 CEST, in band; a peer's single-file `stranger.test -w 1` ran alongside)

- `nodegx-project-contract` `npx jest` **192 / 192**; `tsc -p tsconfig.json` and `tsc -p tsconfig.tests.json` clean (the
  latter was red at `d53e5f283` on two lines of s9's specs; fixed).
- `noodl-mcp` `npx jest tests/ont002WorldTools tests/toolDisclosure` **30 / 30**, `[surface] 8261 tokens / 20 resident
  tools — 19 under` (unchanged). `noodl-mcp` `tsc --noEmit` is red only in other phases' specs (cg001/cg002/cg003/ig007/
  iw007/p108s8), none of P116's.
- `nodegx-backend` `npx jest --runInBand tests/ont-006-verbs tests/ont-007-migration tests/ont-005-mutants
  tests/ont-003-claims tests/ont-003-write` **122 / 122**, exit 0 (both engines).
- `npm run ontology-census:check` fresh. Every new spec mutant-checked: 4 on `verbReach`, 3 on the runner/validator, 1 on
  the write rule (red in the contract and through the MCP) — each red on its own spec only.

**Where the s9 handoff was wrong or short:** "`write_world` takes `verbs`" was the whole of task 1 in its words; the
defect was beside it — a write *without* verbs never graded the verbs on disk. And `tsc -p tsconfig.json` clean did not
mean the specs typechecked: `tsconfig.tests.json` was red.

## Before anything

0. **Model check.** The route and ONT-008 want **Opus 5.5**. On the wrong model, stop and say so in one line.
1. **One heavy job on this box.** `pgrep -fl bin/jest` first.
2. Green check: `npx jest` in `packages/nodegx-project-contract` (192); `npx jest --runInBand tests/ont-006-verbs
   tests/ont-007-migration` in `packages/nodegx-backend` (71).
3. Edit in the foreground; background only the run (a backgrounded Bash gets no heredoc).

## Ask Richard (none of these has moved since s9 — they gate the next build)

- **Where the migration executor lives** (gates the route): `runMigration` is in `@noodl/backend-contract/conformance`,
  which the deployed backend never imports. Recommend: move it to the contract's `src/` — production runs it.
- **R8** (README §9): keep a person's word SQL reserves (`plan`, `on`) as the field's name (built), or rename?
- **Bug `P116-ONT-003-links`** (needs-ruling): a foreign key in the contract, or a read-through claim step.
- For the record: bugs `P116-ONT-007-junctions` (blocker), `-renamecolumn`, `-required`, `P116-ONT-003-two-systems`.

## The next tasks, in order

1. **ONT-007, the route** (Opus) — after the executor ruling: the plan as the body (admin-only), dry run → words → yes →
   `POST /admin/backups` → steps → move the `mustMove` rules and re-say the `mustRewrite` hops in `security.json` (BMG-016)
   → answer. With it, `describeTable` on the surface and the route, and its step (turns §6.9 #5's `it.failing` green — flip
   it to `it` then). **Can start before the ruling:** `describeTable` on `IStorageSchema` + both engines + the
   `SCHEMA_COVERAGE` entry does not depend on where the executor lives.
2. **ONT-008** (Opus) — depends on P112 OWN-007 (the brief), 📋 not started: check P112 before starting. Its §5 lists every
   input ONT-006/007 hand it.
3. Smaller, unowned: `rebindVerbs()` (re-say a renamed noun's id in the verbs, the rows already say what); a spec for
   `verbReach`'s `end` arm (needs a fixture with a dated end the plan reaches); bug `-two-systems` (rename the field after
   the relation, regenerate two `projected.json`); ONT-002's "through what?".

## Found in s10, owned elsewhere

- `noodl-mcp` `tsc --noEmit` red in cg001/cg002/cg003/ig007/iw007/p108s8 specs (not P116's).
- Still from s7: `a()` in `world/project.ts` and `article` in `world/mutants.ts` say "an user"; untracked `.d.ts` emits in
  `packages/nodegx-backend-contract/src/` (not P116's).

## Not yet

The "mandatory project-docs folder" rule is a DIRECTION.md candidate only (R1). Do not read the lessons backend's live
schema without its admin token. The brief is read only through `validate_world` (R5).

## Memory

`ontology-is-the-spec.md` (s10 paragraph added); its pointer is on the Phases line of `MEMORY.md`. Size-check the index
(17,510 UTF-16 units).
