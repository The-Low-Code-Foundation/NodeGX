# ISL-051 — An Expression says what it last did

**Status: ✅ s34 (2026-10-09): 6 of 6 fixed — took in the Visual Function's C149 (P107 `0d9b9b0e4`) and fixed it, `dde400937` (§9). s33 (2026-10-09): 5 of 5 fixed — C144 `99c61cede` (§7); C145 `5ee9edda4`, C147 `cb7ea0fab`, C148 `cf6b4b8f8`, C146 `2d765dac2` (§8). s33 took in the Function's C146–C147 (P107 `7c5b2a842`) and the Script's C148 (P107 `dfc25b3ce`): the same "say what it last did" — the script hosts' Error and their throws.** Scoped s32 at `bd849bf0c`. **Source:** 2 bugs P107 NSP-017 s64 filed on the Expression
and handed to P109 under R16 (`12728097b`): 2 low, **1 to ask** (C145). **Side:** noodl-runtime (`nodes/std-library/expression.ts`,
`expression-ports.ts`), the Expression spec (`packages/nodegx-node-spec`, v1), and the export's copy of the port rules (P18's).

## 1. The person sentence

**An Expression's Error says what is wrong now, and a name it cannot take is refused where it is written, not at run time.**

## 2. Why these belong together

Both are the Expression telling a person something false about itself: an Error that outlives the failure (C144), and an input port
the editor draws for a name the node can never read (C145).

## 3. The bugs

| bug | node | severity | status | build | what a person sees |
|---|---|---|---|---|---|
| [P107-C144](../../bugs/p107-c144-an-expression-s-error-keeps-the-last-failure-after-it-works-again.md) | Expression | low | **fixed** `99c61cede` | as ruled for D25 | An Expression's Error keeps the last failure after the expression works again — a wire on Error still shows "The expression threw …" beside a good Result |
| [P107-C145](../../bugs/p107-c145-an-expression-that-reads-run-expression-or-evaluateatload-always-throws.md) | Expression | low | **fixed** `5ee9edda4` | ruled 2026-10-09: "Block the three names" | An Expression that reads a name called run, expression or evaluateAtLoad never gets an input for it and always throws "run is not defined" |
| [P107-C146](../../bugs/p107-c146-a-function-s-error-keeps-the-last-failure-after-a-run-that-works.md) | Function | low | **fixed** `2d765dac2` | as ruled for D25 / C144 | A Function's Error keeps the last failure after a run that works, and a new Script empties it without sending it |
| [P107-C147](../../bugs/p107-c147-a-function-whose-code-throws-null-or-undefined-reports-nothing.md) | Function | medium | **fixed** `cb7ea0fab` | as proposed | A Function whose code throws null or undefined reports nothing — no Error, no Failure, a Run never answered |
| [P107-C148](../../bugs/p107-c148-a-script-whose-code-throws-null-or-undefined-never-runs-it-again.md) | Script | medium | **fixed** `cf6b4b8f8` | as proposed | A Script whose code throws null or undefined never runs that code again |
| [P107-C149](../../bugs/p107-c149-a-visual-function-that-sends-a-signal-named-like-its-own-reports-failure-and-success-for-one-run.md) | Visual Function | low | **fixed** `dde400937` | as proposed (the value side's answer) | A Visual Function whose blocks send a signal named like one of its own pulses Failure, then Success and Done, for the same Run — and Error is emptied in the same instant |

C144 follows the ruling D25 already has ("Clear it to blank text", Track F rulings page, 2026-10-05: a success sends blank text on
Error, once). C145's proposal offers two fixes that a person would see differently — **the question for Richard** (in plain words):

> *An Expression can't use a variable called `run`, `expression` or `evaluateAtLoad`, because those are the node's own settings. Today
> the editor still draws an input for it, and the Expression fails every time with "run is not defined". Should the editor (a)
> **refuse the name** — draw no input, and say on the node "`run` is a name this node uses; rename your variable", or (b) **make it
> work** — give the variable an input under another name, so `run * 2` just works?* Recommended: (a) — one rule in the three copies of
> the port list, and no renamed ports in saved projects.

## 4. Order of work

C144 first (ruled by precedent). C145 once asked and ruled.

## 5. Rules for every row

ISL-049 §5 holds: the Expression is MODELLED (the spec copies the runtime), so a fix is an Expression spec version (v2), every
scenario's interpreter trace diffed before and after, renamed where its name claims the old outcome, the interpreter's mutants at
two seeds, a control. The export's copy of the port rules (`expression-ports`, three copies) is P18's: tell them.

## 6. Acceptance criteria

- **AC1** — every row re-measured at the session's HEAD before it is built.
- **AC2** — C145 asked in plain words and ruled.
- **AC3** — every row fixed as ruled, one commit each, with a control red on exactly its scenarios and the mutants at two seeds.
- **AC4** — `node scripts/bugs.js --from P107` lists none of this task's rows as `open` or `needs-ruling`.

## 7. Session 32 (2026-10-09) — C144

**AC1:** C144's two scenarios played on the runtime at `642a533fe` conform to Expression v1 (Error left on the wire).

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C144 | `99c61cede` | a working evaluation that finds an error writes Error as blank text and sends it, once (D25's ruling). Expression spec v2; the two scenarios renamed | runtime 33 / 33 at seeds 13 and 20732; mutants 175 / 175 at both; control red on exactly the 2; noodl-runtime Expression tests 596 / 596 |

## 8. Session 33 (2026-10-09) — the reserved names, and a throw of nothing

**AC1:** C145 re-measured at `3ae833e54` (the C145 scenario still threw "run is not defined"); C146–C148 measured by P107 s65/s66 the
same day and re-read through each fix's control. **AC2:** C145 ruled by Richard 2026-10-09 (P107 s65), "Block the three names".

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C145 | `5ee9edda4` | the three names reserved in all three `expression-ports.ts` copies; `expression/reserved-name` before compiling, the editor's warning saying the same; the Expression description names them (catalogs, cloud library, docs page). Expression spec **v3** (one scenario renamed, two added) | 35 / 35 + 200 / 200 on the runtime at 13 and 20732; mutants 175 / 175 at both; control red on exactly the 3 C145 scenarios; editor test 5 / 5, red on 3 against the old files |
| C147 | `cb7ea0fab` | the logger safe for any value (signature unchanged); `thrownMessage`; the editor warning's `stack` read only off a value that has one. A `throw null` / `throw undefined` scenario | Function 28 / 28 + 200 / 200 at both seeds; control red on exactly the C147 scenario |
| C148 | `cf6b4b8f8` | the Script's four catches safe for any value (local helpers — see below); a `throw null` scenario in a run and a signal's function; P107's contract plant re-anchored | Script 17 / 17 + 200 / 200 at both seeds; mutants 32 / 32; control red on exactly the C148 scenario; contract tests 43 / 43 |
| C146 | `2d765dac2` | Error cleared to blank text and sent by a run that works and by a new Script. Function spec **v2**; three scenarios renamed; two runtime tests that pinned the `undefined` clear restated | Function 28 / 28 + 200 / 200 at both seeds; mutants 204 / 207 at both (0 survivors, the 3 declared); control red on exactly the 3 moved |

**Batch gates** (all four on `3ae833e54`): spec package 955 / 955, runtime suite green but for a load-timed graph.test (140 / 140
alone), viewer 1,837 / 1,837, runtime and viewer tsc 0, catalogs `--check` clean, noodl-mcp 3,692 / 3,706 (s32's same 11), export
expression/jsfun tests 1,095 / 1,100 (the 5 — date-family, navigate-to-path — identical with the old lexer: P18's).

**What s33 found.**
- **A new runtime export reaches the viewer through generated declarations.** `@noodl/runtime/src/utils` type-checks against
  `noodl-runtime/dist-types` (a worktree symlinks the primary's), and ts-jest checks the viewer's `javascript.ts` when the runtime
  target loads it — so a new export or parameter there failed every Script scenario with an empty message (a thrown TSError) until the
  declarations were rebuilt, in every checkout. The Script carries two small local helpers instead.
- **The bug file named one read; the catch had two.** The Function's editor warning read `e.stack` off the thrown value too — the
  runtime target has an editor connection, so that line alone kept C147 red.
- **No port changes when the load runs.** With `run` reserved, `run + 1` has no ports, so the load evaluates it and the node says the
  name is reserved at once — not only on a Run.

## 9. Session 34 (2026-10-09) — C149, a reserved signal sent

Handed over by P107 s67 under R16. The `send signal` block's refusal of a name the node owns (`done`, `failure`, …) called
`_fail` with no token: Failure pulsed alone, the code ran on, and the success path emptied Error and fired Success and Done —
three answers to one Run. A name WRITTEN as a value already failed the run; the fix gives the signal side that answer.

| Commit | What changed | Grade |
|---|---|---|
| `dde400937` | `logic-builder.ts`: while the code runs, the first reserved name sent is remembered; after the code the values land and the run fails through its token (Error keeps the reason, no Success, no Done). A send outside a run (a block's own timer) fails at once, as before; a throw clears the flag. Visual Function spec **v2**; the scenario renamed. Restated, each red on the pre-fix file: the contract's plant and logic-builder-warning-lifecycle's "SEPARATE PRE-EXISTING DEFECT" row (written to fail the day this was fixed) | 15/15 + 200/200 on the runtime at 13, 20732, 20735; mutants 0 survivors (118/118, 103/103); control red on exactly the C149 scenario and the signal-input one that ends with a reserved signal; contract 22/22; runtime suite at its baseline; spec package 963/963 |

Handed to P18: the export's Visual Function, if it carries the same wrapper.

