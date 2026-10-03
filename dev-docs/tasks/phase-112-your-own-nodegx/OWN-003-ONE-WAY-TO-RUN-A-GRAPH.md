# OWN-003 — One way to run a graph

**Opened 2026-10-02.** **Depends on OWN-002 and on R1** (README §8).
**Status: 📋 not started. Step 1 is a measurement and needs no ruling.**

## 1. The person sentence

> **When a home-made editor shows a value moving down a wire, it is the value the real app would send, and there is a
> test that says so.**

## 2. Why

README §1 readings 3 and 6. `graph.ts` deliberately ships no graph interpreter. The prototype therefore wrote one
(`prototype/src/graphrun.ts`, 139 lines): every node settles, every recorded value or signal is carried down its wires,
repeat until a wave carries nothing. It has never been run against the 76 graph scenarios, it is known to differ on C7
(lockstep: the runtime delivers per setter inside one pass), and it gives every node its own `World`, so two nodes that
share a store (an Array and an Insert, a Variable and a Set Variable) cannot see each other. That last choice is most of
why only 19 of the todo template's 531 nodes could run.

## 3. What to build

1. **Measure the real engine in a page (no ruling needed).** Can `@noodl/runtime` mount a component headless in a
   browser, with no viewer, and run its logic? The P107 runtime target (`noodl-runtime/test/helpers/node-spec-target.ts`)
   already runs nodes headless in Node; try the same in a page. Record: does it load, how large is it minified, which
   node types fail without a viewer, and how long a frame takes on the todo template's biggest logic component. Put the
   numbers in §6, then ask R1 with them.
2. **If R1 rules the tested runner:** add `runGraph` to `@nodegx/node-spec` that implements the package's own
   `GraphTarget` (`mountGraph`, `connect`, `settle`, `trace`), with **one `World` per graph**, so the registry, the
   backend script and the clock are shared the way the scenarios already play them ("one store per play"). Grade it
   with the 76 scenarios through the existing runner. Live edits (`addNode`, `removeNode`, `addWire`, `removeWire`)
   come from the prototype's runner, with C11's rule kept: a new wire hands the receiver the source's current value.
3. **If R1 rules the real engine:** wrap it in the same `GraphTarget` so the suite (OWN-006) grades it the same way, and
   so an editor can swap one for the other.
4. **Either way, the suite grades an editor's own runner** through `graphTarget()` on its adapter (OWN-006). Writing
   your own is allowed; passing is required.

## 4. Acceptance criteria

1. Step 1's numbers are in §6, with the date and commit, and R1 has been asked with them in plain words.
2. The chosen runner passes 76 / 76 graph scenarios, or every scenario it does not pass is listed with the clause, the
   runner's own sentence for why, and a row in P107's §6 if it is a runtime question.
3. The prototype runs on the chosen runner; its `#selftest` still fails all three missions and its `#demo` still passes
   all three.
4. Rerun OWN-000's census with "runnable in a page" meaning "runnable on the chosen runner". Record how far the 19 of
   531 moved.

## 5. Watch for

- P107 G1: C6's sentence ("never computes from a half-updated upstream") is false for a per-setter node on the runtime.
  A runner that is atomic per frame will "fail" scenarios the runtime itself fails its claims on. Read each scenario's
  `row` and `divergence` fields before calling a red a defect.
- Memory: *a settle that only drains is not a frame*. The runtime target needed two holes fixed to pass the graph
  scenarios. Expect the same here.

## 6. Built

*(empty)*
