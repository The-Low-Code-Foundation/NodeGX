# NSP-006 — the brief handed to the round-4 stranger (verbatim, P107 s49 2026-10-06, NSP-023 step 8 / AC5)

Round 3's brief, changed for a VISUAL node: one node (the Dropdown v4), drawn by the target on a page it is handed
(`tests/stranger-page.js`), with the person's acts raised as DOM events by that page and not by the target. The page model
(`tests/page-model.helper.ts`, NSP-023 §8.8) is not handed over: it is not part of the format, and the round asks whether
the spec alone is enough. The lab carries `nodegx-backend-contract/src` as round 3c's did.

# Brief: build one on-screen control from its spec and its suite alone, in plain JavaScript on a plain DOM page

You are implementing one small "node" (a stateful unit with input ports, output ports and signals) in **plain JavaScript**, from an executable specification you have never seen before, for a test suite that says when you are done. You know nothing about the product it comes from, and you must not go looking: the point of this exercise is to find out whether the spec files and the suite are enough on their own.

This node is different from anything a previous implementer was handed: it is a **control a person sees and uses** — a dropdown. Your target draws it into a real DOM document it is handed, and a person acts on it (hovers, presses, clicks, touches, tabs to it, picks an option). You draw it with the plain DOM API: no framework of any kind. What the person does arrives the way it does in a browser: as DOM events on the elements you drew, raised by the page you are handed, never by your own code.

Record the wall-clock time when you start (`date`) and when you finish.

## Where you work

Everything is under this one directory, and you must not read or write anything outside it:

    /private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/e4fecf4e-a9eb-4ab9-94ca-96aeb0cf1d1d/scratchpad/stranger-lab-4/packages/nodegx-node-spec

Use absolute paths in every command (the tool harness can lose a `cd` between calls). Do not use `git`, do not search the web, do not look at `node_modules`, and do not look at any parent directory.

## What you deliver

A directory `stranger-4/` inside that package (it exists, empty), holding a CommonJS module `stranger-4/target.js` that exports one function:

    module.exports = { strangerTarget };   // strangerTarget(page): TargetAdapter — a FRESH target each call

plus any other `.js` files you like under `stranger-4/`, and a `stranger-4/REPORT.md` (see below).

`page` is `{ window, document, act(root, act, value) }` — read `tests/stranger-page.js`, which makes it; its header is the contract between your target and the person. In short: you draw the node's elements into `page.document` and keep the node's outermost element (`root`) in the document while the node is on the page; your `act(h, act, value)` records the act, brings the page up to date, and calls `page.act(root, act, value)`; the node's answer to a person comes ONLY from listeners you put on your elements. The suite checks this: it makes each act deaf in turn (the page raises nothing for it), and your target must then disagree with the spec somewhere — an act your target answered without the page would not.

Rules for the code:

- Plain JavaScript, CommonJS, no TypeScript, no framework, no npm packages, no Node built-ins. Your files may `require` only each other. Reach the DOM only through `page.window` and `page.document` (never a global `document` or `window`).
- **Never use the real clock, real timers or real randomness** (`Date.now`, `setTimeout`, `requestAnimationFrame`, `Math.random`, `performance`, `crypto`).
- **Do not import, require, copy, or read the reference implementation.** Specifically, do NOT open `src/interpreter.ts`, anything under `src/adapters/`, the bodies of the files under `src/runner/`, `src/registry.ts`, `tests/page-model.helper.ts`, any other test file not on the list below, `stranger/`, `stranger-2/` or `stranger-3/` (other implementers' targets), any spec under `src/nodes/` not on the list below, or anything under `packages/nodegx-backend-contract` (a sibling the lab carries only so the package compiles). A static check in the test fails if your code requires anything from `src/`.
- Do not modify anything outside `stranger-4/`. The spec, scenario, page and world files are hashed; a changed hash fails the run whatever the result.
- Every behaviour must be written by hand from your reading of the spec files. The spec contains the node's declaration (ports, types, defaults, coercions, initial state, the acts a person can do) AND reducer functions written in TypeScript. You read those reducers as documentation of the behaviour and re-implement it in your own JavaScript, in your own structure, on the DOM; you do not call them. Where the spec says a rule is the BROWSER's (what a disabled element or a hidden one does with the keyboard or the pointer, what a `<select>` selects), the page you are handed already behaves that way: you get it by drawing real elements, not by copying the rule.

## What you may read (the complete list)

The format:
- `src/spec.ts` — the spec format (a node declaration; what a reducer returns; the frame-end reducer; outcomes; world handlers, including the node being placed on the page; THE PERSON and its acts; `synced`; `init`)
- `src/coerce.ts`, `src/canonical.ts`, `src/trace.ts`, `src/adapter.ts` (the `TargetAdapter` interface you implement, including `install`, `advance` and `act`, and `play()`, which is how the runner drives you), `schema/trace.schema.json`, `scenarios/README.md`
- `src/world.ts` — its header is the rules every target shares, and its classes are the object your `install(world)` is handed. You may call that object's methods; you may not `require` the file
- `src/index.ts` and `src/runner/index.ts` — only to see the exported NAMES; do not read the runner's bodies

The node, the one module it imports, and its hand scenarios:
- `src/nodes/dropdown.ts` — the Dropdown (`net.noodl.controls.options`)
- `src/nodes/text-input.ts` — ONLY the two functions `dropdown.ts` imports (`dataAttributeInput`, `dataAttributeNames`) and whatever those two call or name; the rest of that file is another node's spec, and reading it is a breach to report
- `scenarios/net.noodl.controls.options.json`
- `src/nodes/index.ts` (the registry — names only)

The page and the runner command:
- `tests/stranger-page.js` — the page and the person
- `tests/stranger.test.ts` and `tests/stranger-suite-hashes.helper.js` — read them; together they are the whole contract of what "done" means

Nothing else. If you find yourself wanting another file, write down what you wanted and why (that is a finding), and do without.

Answered up front, from earlier implementers' questions, so you need not guess: the generator that produces the 200 sequences draws values from a fixed vocabulary — numbers (including `NaN`, `Infinity`, `-0`), strings, booleans, `null`, `undefined`, plain objects, arrays and `Date`s — so canonicalise defensively; a scenario marked `row` describes a defect of ANOTHER implementation of this node, and on yours it is expected to pass (the runner reports it as not reproducing); the many look-and-layout inputs (colours, sizes, margins, fonts and so on) are ports the suite may write, and what they draw is not graded.

## How you loop

    cd /private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/e4fecf4e-a9eb-4ab9-94ca-96aeb0cf1d1d/scratchpad/stranger-lab-4/packages/nodegx-node-spec && NSP_ONLY=net.noodl.controls.options npx jest tests/stranger.test.ts

The report printed for a failing test shows the first differing trace event, reference (the spec) on one line and yours on the next, plus the params, steps and world script that produced it. Iterate until every test passes. Count your iterations (one iteration = one jest run). Then run the whole file once without `NSP_ONLY` (the earlier rounds' targets are graded too; they should stay green).

When everything passes, run the deep budget once, and only once (it is the heaviest thing you will run; the machine is shared):

    NSP_DEEP=10000 NSP_ONLY=net.noodl.controls.options npx jest tests/stranger.test.ts -t deep

If the deep run finds a divergence, fix it and re-run the default suite, then the deep run again.

Do not run any other test file and do not run anything else heavy.

## The report — `stranger-4/REPORT.md`, and also your final message

Write it for the people who wrote the spec format. They want to know where their spec was not enough for someone drawing the control on a plain page. Sections, in this order:

1. **Ambiguities.** Every place where the spec, the format, the page, the world's rules, the adapter contract or the scenarios did not tell you what to do and you had to guess or experiment; what you guessed; whether the suite then corrected you (and what the correction was). Be concrete: name the file and the sentence. Say especially where the spec described a state of the PAGE (what the element shows, holds or is told) in words you could not turn into DOM without guessing. This is the most important section. "Nothing was ambiguous" is an acceptable answer only if it is true.
2. **Files opened.** The complete list of every file you read, in the order you first opened them. Be honest; this list is checked.
3. **Iterations.** How many jest runs it took to go green, and what each failing run's first difference was (one line each).
4. **Readings.** The summary lines the test prints at the default budget and at the deep budget, verbatim (the `CONFORMS` lines, the `mutants:` lines, the `mutants caught by the stranger's target` line, and jest's final `Tests:` line), for the narrowed run and the whole-file run.
5. **Time.** Start and end wall-clock time.
6. **What you would change** in the spec, the format, the page or the adapter contract so the next implementer needs fewer guesses.
7. **Design of your target** — three or four sentences on how it is structured: what elements you draw, when you write to them, and how a person's act reaches the node's outputs.
