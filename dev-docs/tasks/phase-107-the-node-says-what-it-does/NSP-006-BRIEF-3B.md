# NSP-006 — the brief handed to the round-3b stranger (verbatim, s16 2026-10-01)

# Brief: one spec your target implements has a new version — bring the target up to it, from the spec and the suite alone

A previous implementer built, in plain JavaScript, a target for five small "nodes" (stateful units with input ports, output ports and signals) from executable specifications, for a test suite that says when it is done. That target is now yours. You know nothing about the product these nodes come from, and you must not go looking: the point of this exercise is to find out whether the spec files and the suite are enough on their own to carry a CHANGE to an implementer who did not make it.

Since the target was built, ONE of the five specs has gone up a version, and its hand scenarios have changed with it. The suite now fails on the target. Find what changed from the spec and the scenarios, change the target to match, and report.

Record the wall-clock time when you start (`date`) and when you finish.

## Where you work

Everything is under this one directory, and you must not read or write anything outside it:

    /private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/bda39e38-8a56-416c-9b8c-3e05745cec8b/scratchpad/stranger-lab-3b/packages/nodegx-node-spec

Use absolute paths in every command (the tool harness can lose a `cd` between calls). Do not use `git`, do not search the web, do not look at `node_modules`, and do not look at any parent directory.

## What you may read (the complete list)

The format:
- `src/spec.ts`, `src/coerce.ts`, `src/canonical.ts`, `src/trace.ts`, `src/adapter.ts`, `src/world.ts` (its header is the rules every target shares; you may not `require` it), `schema/trace.schema.json`, `scenarios/README.md`
- `src/index.ts` and `src/runner/index.ts` — only to see the exported NAMES; do not read the runner's bodies

The five specs, the one module a spec imports, and their hand scenarios:
- `src/nodes/delay.ts`, `src/nodes/repeat.ts`, `src/nodes/animate-to-value.ts` (and `src/nodes/ease-curves.ts`, which it imports), `src/nodes/uuid.ts`, `src/nodes/screen-resolution.ts`
- `scenarios/Timer.json`, `scenarios/Repeat.json`, `scenarios/net.noodl.animatetovalue.json`, `scenarios/net.noodl.UUID.json`, `scenarios/Screen Resolution.json`
- `src/nodes/index.ts` (the registry — names only)

The target you inherit:
- everything under `stranger-3/` (`target.js`, `nodes.js`, `canon.js`, `curves.js`, and `REPORT.md` — the previous implementer's report)

The runner command:
- `tests/stranger.test.ts` and `tests/stranger-suite-hashes.helper.js`

Nothing else. Specifically do NOT open `src/interpreter.ts`, anything under `src/adapters/`, the bodies of the files under `src/runner/`, `src/registry.ts`, `stranger/` or `stranger-2/` (other implementers' targets). If you find yourself wanting another file, write down what you wanted and why (that is a finding), and do without.

## Rules for the code

- Change only files under `stranger-3/`. Plain JavaScript, CommonJS, no npm packages, no Node built-ins; your files may `require` only each other. Never use the real clock, real timers or real randomness.
- The spec, scenario and world files are hashed; a changed hash fails the run whatever the result.
- Every behaviour must be written by hand from your reading of the spec files. You read the reducers as documentation and re-implement them; you do not call them.

## How you loop

    cd /private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/bda39e38-8a56-416c-9b8c-3e05745cec8b/scratchpad/stranger-lab-3b/packages/nodegx-node-spec && npx jest tests/stranger.test.ts

`NSP_ONLY=<node type>` (comma-separated) narrows it. The report printed for a failing node shows the first differing trace event, reference (the spec) on one line and yours on the next, plus the params, steps and world script. Iterate until every test passes with no filter. Count your iterations (one iteration = one jest run). When everything passes, run the deep budget once, for the changed node only (the machine is shared):

    NSP_DEEP=10000 NSP_ONLY=<the changed node's type> npx jest tests/stranger.test.ts -t deep

Do not run any other test file and do not run anything else heavy.

## The report — append a section "## Round 3b (NSP-013 s16)" to `stranger-3/REPORT.md`, and also your final message

Write it for the people who wrote the spec format. Sections, in this order:

1. **What changed, as read from the spec.** Which spec, which version, and the behaviour in your own words — and HOW you found it (a version note, a scenario name, comparing reducers with the code, a failing run).
2. **What you changed** in the target (the code, briefly).
3. **Readings.** Before your change and after: jest's `Tests:` line and exit status for the narrowed run and for the full run; the deep run's `CONFORMS` line for the changed node.
4. **Where the spec alone was thin.** Every place the spec, the version note, the scenarios or the format did not tell you what to do and you had to guess; what you guessed; whether the suite corrected you.
5. **Files opened**, in order. Be honest; this list is checked.
6. **Time.** Start and end wall-clock time.
