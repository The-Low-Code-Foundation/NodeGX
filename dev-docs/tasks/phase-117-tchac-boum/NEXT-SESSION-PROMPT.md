# Phase 117 — next session

**Written 2026-10-11 at the end of session 1** (Fable 5.1). Session 1 scoped the phase from a conversation with Richard,
built the prototype on P112's kit the same morning, and gated it: `prototype/check.mjs` PASS ×3 (29 checks). The README
is the spec; this file is what to do next and what holds.

## The board (from the task files, 2026-10-11)

| task | built | gated | Model |
|---|---|---|---|
| TBM-000 the prototype, measured | 🟢 | `check.mjs` PASS ×3 | — |
| TBM-001 the browser backend | 📋 READY once R1 is ruled (recommended yes) | — | **Fable** |
| TBM-002 mission 4, la machine se souvient | 📋 after TBM-001 | — | either |
| TBM-003 the kids' sitting | 📋 Richard's | — | — |
| TBM-004 a public copy | 📋 (R4: after TBM-003) | — | either |
| TBM-005 an unwired output has a value (kit) | 📋 | — | **Opus** |
| TBM-006 the words | 📋 Richard's / a teacher's | — | — |
| TBM-007 the wall passes the editor suite | 📋 | — | either |

**Rulings open: R1–R4 (README §8), each with a recommendation.** Ask them with the page open, as P112 did.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch.**

1. **Play it with Richard** before anything: `node dev-docs/tasks/phase-117-tchac-boum/prototype/serve.mjs 47911`,
   `http://127.0.0.1:47911/` (s1 left one running on that port). Watch what he presses first. Ask R1–R4 then.
2. **TBM-001 (Fable), if R1 is yes:** measure first (`CloudStore` constructs the adapter at `cloudstore.js:61-84`; what
   `type: 'custom'` reaches today; whether the spec World's filter is exported), then the adapter, then the conformance
   suite in headless Chrome. The task file has the five steps.
3. **TBM-007 (either):** a `suite-adapter.mjs` copied from Orbit's; cheap, and it is P112's "done means done".
4. **TBM-005 (Opus):** the kit fix for the lone output; one assertion returns to the gate.

## Standing findings

- **The peer on P112 `real/` (10:13 on 2026-10-11)**: the two prototypes share no file on purpose. `serve.mjs`,
  `specs-entry.ts` and the page's plumbing are re-typed copies; a fix in one is carried by hand (README §10).
- **The gate waits for `__tchac.pending === 0`** before each real input; the page's own edits await the rebuild, a gate
  only polls the files. Without it, run 1 and run 2 failed on races (TBM-000 §5).
- **The trace carries wires, not nodes** (P117-S1-UNWIREDOUT). The gate asserts nothing the trace cannot say.
- **The Button's spec has 22 outputs**; the connect popup's "few connectors" rule (`FR` dictionary first, *Toutes les
  prises* on a press) is what makes a one-signal pre-pick possible.
- **`shots/` for the README** are in the session's scratchpad only; a public screenshot is TBM-004's.
- **Nothing in `dev-docs/README.md` indexes phases** (grep found none for 112–116); the memory's Phases line is the index.
