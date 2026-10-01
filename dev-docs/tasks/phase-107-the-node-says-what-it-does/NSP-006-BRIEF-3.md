# NSP-006 — the brief handed to the third stranger (verbatim, s13 2026-10-01)

# Brief: build a target for five node specs that live by a scripted world, from the spec and the suite alone

You are implementing five small "nodes" (stateful units with input ports, output ports and signals) in **plain JavaScript**, from executable specifications you have never seen before, for a test suite that says when you are done. You know nothing about the product these nodes come from, and you must not go looking: the whole point of this exercise is to find out whether the spec files and the suite are enough on their own.

These five are different from anything a previous implementer was handed: every one of them depends on a **world** — a scripted clock, a seeded random source, a browser viewport that may or may not exist — which the runner builds for each play and hands to your target. Your nodes must reach time, chance and the window ONLY through that world.

Record the wall-clock time when you start (`date`) and when you finish.

## Where you work

Everything is under this one directory, and you must not read or write anything outside it:

    /private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/0af132e9-7ad2-4da9-88f2-139e8df3915a/scratchpad/stranger-lab-3/packages/nodegx-node-spec

Use absolute paths in every command (the tool harness can lose a `cd` between calls). Do not use `git`, do not search the web, do not look at `node_modules`, and do not look at any parent directory.

## What you deliver

A directory `stranger-3/` inside that package (it exists, empty), holding a CommonJS module `stranger-3/target.js` that exports one function:

    module.exports = { strangerTarget };   // strangerTarget(): TargetAdapter — a FRESH target each call

plus any other `.js` files you like under `stranger-3/`, and a `stranger-3/REPORT.md` (see below).

Rules for the code:

- Plain JavaScript, CommonJS, no TypeScript, no framework, no npm packages, no Node built-ins. Your files may `require` only each other. Write your own tiny signal/state library if you want one — deliberately different from anything else.
- **Never use the real clock, real timers or real randomness** (`Date.now`, `setTimeout`, `Math.random`, `performance`, `crypto`): the world object your target is handed is the only source of time, timers, chance and the viewport. A node that reaches past it will not conform.
- **Do not import, require, copy, or read the reference implementation.** Specifically, do NOT open `src/interpreter.ts`, anything under `src/adapters/`, the bodies of the files under `src/runner/`, or `src/registry.ts`. Those contain an implementation of the same thing (or of a part of the world these nodes do not use); reading them would make the exercise worthless. A static check in the test fails if your code requires anything from `src/`.
- Do not modify anything outside `stranger-3/`. The spec, scenario and world files are hashed; a changed hash fails the run whatever the result.
- Every behaviour must be written by hand from your reading of the spec files. The spec files contain the node's declaration (ports, types, defaults, coercions, initial state, which parts of the world it needs) AND reducer functions written in TypeScript. You read those reducers as documentation of the behaviour and re-implement them in your own JavaScript in your own structure; you do not call them.

## What you may read (the complete list)

The format:
- `src/spec.ts` — the spec format (a node declaration; what a reducer returns; the frame-end reducer; outcomes, including `pending` ones settled later by the world; world effects such as timers; world handlers; `init`)
- `src/coerce.ts` — the declared coercions a port applies to an arriving value
- `src/canonical.ts` — the canonical JSON form values take in a trace, and `revive`
- `src/trace.ts` — the trace event types and the grouping rule between two settles
- `src/adapter.ts` — the `TargetAdapter` interface you implement (including `install(world)` and `advance`), and `play()`, which is how the runner drives you
- `src/world.ts` — **the world**: its header is the rules every target shares (the CLOCK, RANDOM and VIEWPORT rules are the ones these five use), and its classes are the object your `install(world)` is handed. You may call that object's methods; you may not `require` the file
- `schema/trace.schema.json` — the JSON schema of a trace
- `scenarios/README.md` — the shape of a scenario file, including its `world` field
- `src/index.ts` and `src/runner/index.ts` — only to see the exported NAMES; do not read the runner's bodies

The five specs, the one module a spec imports, and their hand scenarios:
- `src/nodes/delay.ts`, `src/nodes/repeat.ts`, `src/nodes/animate-to-value.ts` (and `src/nodes/ease-curves.ts`, which it imports), `src/nodes/uuid.ts`, `src/nodes/screen-resolution.ts`
- `scenarios/Timer.json`, `scenarios/Repeat.json`, `scenarios/net.noodl.animatetovalue.json`, `scenarios/net.noodl.UUID.json`, `scenarios/Screen Resolution.json`
- `src/nodes/index.ts` (the registry — names only)

The runner command:
- `tests/stranger.test.ts` and `tests/stranger-suite-hashes.helper.js` — read them; together they are the whole contract of what "done" means

Nothing else. If you find yourself wanting another file, write down what you wanted and why (that is a finding), and do without.

Answered up front, from earlier implementers' questions, so you need not guess: the generator that produces the 200 sequences draws values from a fixed vocabulary — numbers (including `NaN`, `Infinity`, `-0`), strings, booleans, `null`, `undefined`, plain objects, arrays and `Date`s — so canonicalise defensively; a scenario marked `row` describes a defect of ANOTHER implementation of these nodes, and on yours it is expected to pass (the runner reports it as not reproducing). The node a scenario file calls `Timer` is the one whose spec is `delay.ts`.

## How you loop

    cd /private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/0af132e9-7ad2-4da9-88f2-139e8df3915a/scratchpad/stranger-lab-3/packages/nodegx-node-spec && npx jest tests/stranger.test.ts

One node at a time is faster: `NSP_ONLY=Timer npx jest tests/stranger.test.ts` (a comma-separated list works). The report printed for a failing node shows the first differing trace event, reference (the spec) on one line and yours on the next, plus the params, steps and world script that produced it. Iterate until every test passes with no filter. Count your iterations (one iteration = one jest run).

When everything passes at the default budget, run the deep budget once, and only once (it is the heaviest thing you will run; the machine is shared):

    NSP_DEEP=10000 npx jest tests/stranger.test.ts -t deep

If the deep run finds a divergence, fix it and re-run the default suite, then the deep run again.

Do not run any other test file and do not run anything else heavy.

## The report — `stranger-3/REPORT.md`, and also your final message

Write it for the people who wrote the spec format. They want to know where their spec was not enough. Sections, in this order:

1. **Ambiguities.** Every place where the spec, the format, the world's rules, the adapter contract or the scenarios did not tell you what to do and you had to guess or experiment; what you guessed; whether the suite then corrected you (and what the correction was). Be concrete: name the file and the sentence. This is the most important section. "Nothing was ambiguous" is an acceptable answer only if it is true.
2. **Files opened.** The complete list of every file you read, in the order you first opened them. Be honest; this list is checked.
3. **Iterations.** How many jest runs it took to go green at the default budget, and what each failing run's first difference was (one line each).
4. **Readings.** The summary lines the test prints for each node at the default budget and at the deep budget, verbatim (the `CONFORMS` lines, the `mutants:` lines, the `mutants caught by the stranger's target` lines, and jest's final `Tests:` line).
5. **Time.** Start and end wall-clock time.
6. **What you would change** in the spec format, the world's rules or the adapter contract so the next stranger needs fewer guesses.
7. **Design of your target** — three or four sentences on how your implementation is structured (especially how your nodes reach the world), so a reader can see it is not a copy of anything.
