# SEE-005 — The nodes as a code library: `@nodegx/nodes-react`

**Opened 2026-10-01.** **Depends on P107 NSP-011…015 (the logic batches).** R6 asked.
**Status: 📋 not started.**

## 1. The person sentence

> **A developer, or their agent, writing a plain React app can import a Counter, a Switch, a Query Records from one
> package and get exactly the behaviour NodeGX's spec says, graded by the same suite, so what they wrote can be read
> back into NodeGX and given its honesty number.**

## 2. Why

Three reasons, in order of weight.

1. **It makes the honesty number apply to code.** Most vibe-coded apps are written outside NodeGX. A React app built
   from the package is a graph with a different syntax (SEE-006).
2. **It shrinks `plan.ts`.** P18 carries node behaviour as 101 compiler special cases in 20,249 lines. If the export
   emits `import { Counter } from '@nodegx/nodes-react'`, the exporter translates graph shapes and nothing else, which is
   what NSP-005 found it already wants to do.
3. **It is the harness Richard described**: an agent can build in React and still be inside a framework whose every
   primitive is specced and tested, without deciding on NodeGX's canvas first.

## 3. What to build

1. **The package** `packages/nodegx-nodes-react/`: for each specced logic node, a hook or function whose shape is the
   spec's reducer; for each specced visual node (as NSP-016 lands), a component. No `this`, no frames; the P107 spec is
   the reference and the package is a target like any other.
2. **The adapter**: `TargetAdapter` for the package, so the P107 runner grades it with the same scenarios, sequences and
   mutants as the runtime and the export. The package's tests are the suite; it has no tests of its own.
3. **The exporter re-targets**: for each node the package owns, `plan.ts` emits an import instead of a special case;
   the P18 ledger stays green; the line count of `plan.ts` and the count of `type === '…'` comparisons are recorded
   before and after.
4. **The docs**: one page per node generated from the spec (NSP-018's rules in words), so the package's documentation
   cannot say something the node does not do.

## 4. Acceptance criteria

1. Every node in the package conforms under the P107 runner at the deep budget with every mutant killed.
2. The todo export builds and its drives stay green with the package as the target for every node the package owns.
3. `plan.ts` has fewer `type === '…'` comparisons than at scoping (101), by at least the number of nodes the package
   owns, and no exported template's picker coverage falls.
4. A stranger agent, given the package's docs and no runtime source, writes the todo's task row as React against the
   package and SEE-006 reads it back with an honesty number of 100% for the nodes it used.

## 5. Watch for

- Memory: *correct and usable were never the same criterion.* A hook that conforms but needs five arguments nobody would
  type is not a library. Richard's look applies to the API too; put three usage examples in the docs and ask.
- Memory: *interpreter and export hand scripts different row objects.* The package's record nodes must present the
  same row shape as the runtime's, or the honesty number hides a divergence.
