# ISL-051 — An Expression says what it last did

**Status: ⬜ scoped s32 (2026-10-09) at `bd849bf0c`, nothing built.** **Source:** 2 bugs P107 NSP-017 s64 filed on the Expression
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
| [P107-C144](../../bugs/p107-c144-an-expression-s-error-keeps-the-last-failure-after-it-works-again.md) | Expression | low | scheduled | as ruled for D25 | An Expression's Error keeps the last failure after the expression works again — a wire on Error still shows "The expression threw …" beside a good Result |
| [P107-C145](../../bugs/p107-c145-an-expression-that-reads-run-expression-or-evaluateatload-always-throws.md) | Expression | low | needs-ruling | ask | An Expression that reads a name called run, expression or evaluateAtLoad never gets an input for it and always throws "run is not defined" |

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
