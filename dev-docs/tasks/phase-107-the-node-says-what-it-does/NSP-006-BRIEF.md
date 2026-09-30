# NSP-006 — the brief handed to the stranger (verbatim, s5 2026-09-30)

# Brief: build a target for five node specs, from the spec and the suite alone

You are implementing five small "nodes" (stateful units with input ports, output ports and signals) in **plain JavaScript**, from executable specifications you have never seen before, for a test suite that says when you are done. You know nothing about the product these nodes come from, and you must not go looking: the whole point of this exercise is to find out whether the spec files and the suite are enough on their own.

Record the wall-clock time when you start (`date`) and when you finish.

## Where you work

Everything is under this one directory, and you must not read or write anything outside it:

    /private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/e64dcec7-6484-4571-baf4-9abafe7acc95/scratchpad/stranger-lab/packages/nodegx-node-spec

Use absolute paths in every command (the tool harness can lose a `cd` between calls). Do not use `git`, do not search the web, do not look at `node_modules`, and do not look at any parent directory.

## What you deliver

A directory `stranger/` inside that package (it exists, empty), holding a CommonJS module `stranger/target.js` that exports one function:

    module.exports = { strangerTarget };   // strangerTarget(): TargetAdapter — a FRESH target each call

plus any other `.js` files you like under `stranger/`, and a `stranger/REPORT.md` (see below).

Rules for the code:

- Plain JavaScript, CommonJS, no TypeScript, no framework, no npm packages, no Node built-ins. Your files may `require` only each other. Write your own tiny signal/state library if you want one — deliberately different from anything else.
- **Do not import, require, copy, or read the reference implementation.** Specifically, do NOT open `src/interpreter.ts`, anything under `src/adapters/`, or the bodies of the files under `src/runner/`. Those contain an implementation of the same thing; reading them would make the exercise worthless. A static check in the test fails if your code requires anything from `src/`.
- Do not modify anything outside `stranger/`. The spec and scenario files are hashed; a changed hash fails the run whatever the result.
- Every behaviour must be written by hand from your reading of the spec files. The spec files contain the node's declaration (ports, types, defaults, coercions, initial state) AND reducer functions written in TypeScript. You read those reducers as documentation of the behaviour and re-implement them in your own JavaScript in your own structure; you do not call them.

## What you may read (the complete list)

The format:
- `src/spec.ts` — the spec format (what a node declaration is; what a reducer returns; derived ports; the frame-end reducer; deferred outcomes)
- `src/coerce.ts` — the declared coercions a port applies to an arriving value
- `src/canonical.ts` — the canonical JSON form values take in a trace, and `revive`
- `src/trace.ts` — the trace event types and the grouping rule between two settles
- `src/adapter.ts` — the `TargetAdapter` interface you implement, and `play()`, which is how the runner drives you
- `schema/trace.schema.json` — the JSON schema of a trace
- `src/index.ts` and `src/runner/index.ts` — only to see the exported NAMES; do not read the runner's bodies

The five specs and their hand scenarios:
- `src/nodes/counter.ts`, `src/nodes/switch.ts`, `src/nodes/and.ts`, `src/nodes/condition.ts`, `src/nodes/string-format.ts`
- `scenarios/Counter.json`, `scenarios/Switch.json`, `scenarios/And.json`, `scenarios/Condition.json`, `scenarios/String Format.json`
- `src/nodes/index.ts` (the registry — names only)

The runner command:
- `tests/stranger.test.ts` — read it; it is the whole contract of what "done" means

Nothing else. If you find yourself wanting another file, write down what you wanted and why (that is a finding), and do without.

## How you loop

    cd /private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/e64dcec7-6484-4571-baf4-9abafe7acc95/scratchpad/stranger-lab/packages/nodegx-node-spec && npx jest tests/stranger.test.ts

One node at a time is faster: `NSP_ONLY=Counter npx jest tests/stranger.test.ts` (a comma-separated list works). The report printed for a failing node shows the first differing trace event, reference (the spec) on one line and yours on the next, plus the params and steps that produced it. Iterate until every test passes with no filter. Count your iterations (one iteration = one jest run).

When everything passes at the default budget, run the deep budget once, and only once (it is the heaviest thing you will run; the machine is shared):

    NSP_DEEP=10000 npx jest tests/stranger.test.ts -t deep

If the deep run finds a divergence, fix it and re-run the default suite, then the deep run again.

Do not run any other test file and do not run anything else heavy.

## The report — `stranger/REPORT.md`, and also your final message

Write it for the people who wrote the spec format. They want to know where their spec was not enough. Sections, in this order:

1. **Ambiguities.** Every place where the spec, the format, the adapter contract or the scenarios did not tell you what to do and you had to guess or experiment; what you guessed; whether the suite then corrected you (and what the correction was). Be concrete: name the file and the sentence. This is the most important section. "Nothing was ambiguous" is an acceptable answer only if it is true.
2. **Files opened.** The complete list of every file you read, in the order you first opened them. Be honest; this list is checked.
3. **Iterations.** How many jest runs it took to go green at the default budget, and what each failing run's first difference was (one line each).
4. **Readings.** The summary lines the test prints for each node at the default budget and at the deep budget, verbatim (the `CONFORMS` lines, the `mutants:` lines, the `mutants caught by the stranger's target` lines, and jest's final `Tests:` line).
5. **Time.** Start and end wall-clock time.
6. **What you would change** in the spec format or the adapter contract so the next stranger needs fewer guesses.
7. **Design of your target** — three or four sentences on how your implementation is structured, so a reader can see it is not a copy of anything.
