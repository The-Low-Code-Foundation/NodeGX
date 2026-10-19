# The root is mounted when it says (P18 session 126, 2026-10-19)

The measurements behind EXP-011 §93: the Mounted wires the export did not carry, measured by what feeds them, and the
family a test can grade against the runtime's own nodes built. Run the `.ts` from `packages/nodegx-export` with
`../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <script> <exportSrc> …`, `ROOTS=` as
`../s119-fnchain-measure/dispdiff.ts` takes it (primary's `templates/` with nightbook, and the Site Builder and
landing-pages written out by `../s119-fnchain-measure/materialize.ts`). A control copy of the export at the base is
`git archive <base> packages/nodegx-export/src` unpacked as `packages/.nx-ctl-s126/src` (remove it before the whole suite:
`hls006-every-listener` reads every package folder).

| script | what it reads |
|---|---|
| `census.ts <src> <out.json>` | every node refused because its trigger is not drawn or not run (§91's sentences), with the element that gates it and what feeds that element's Mounted: the feeder's type and port, and why the wire is not carried |
| `roots.ts <src>` | every component whose root has a wire into its Mounted: the feeder, whether the root is authored Mounted false, how many instances place it |
| `emit.ts <src> <outDir>` | every project under `ROOTS` emitted to files with its notes (`ONLY=` some names), for `diff -r` of the base against the tree |
| `predict.ts <base src>` | the components the change should move, read off the base's plans (the hls001 prediction) |
| `arms.ts <src> [runtime]` | the Root Desk and four variants, emitted with `<src>`, read press by press by the export arm (and the runtime arm) |
| `mutants.py <copy> <src> <out.json>` | the spec's mutant arms, each alone in a copy of the package (`packages/nx-mut-s126`, removed after); `ONLY=` some arms |
| `EXPECTED.md` | the readings each arm should give, written before the variants ran |

## What was measured first (base `3476642d6`)

`census.ts` over the 19 templates: **157 nodes refused for an unreached trigger** (§91.5's 166 less the 9 whose sentence
is another wire's refusal). By what feeds the Mounted that hides them: a Function reading the Noodl API 64; an Expression
or Function fed by a source the export cannot read (a kit node, an instance output, a Filter) 33; an instance output its
component does not lift 18 and an output of a logic component 8 (both members-area's `/Members/Standing`, a logic
component); a Did Mount under an element a value mounts 16 (nightbook); a root mounted from a Component Input 7;
a Function fed by User's roles 4; a dead row's Function 3; an Expression fed by a refused Function 2; a Function output
into a Mounted with no binding 2.

`roots.ts`: **72 wires into a component root's Mounted, every one refused as "a router concern"**: from a Component
Input 38, an Expression 24, a States value 4, a Function 4, an instance output 2. 24 roots authored Mounted false were
never drawn in the export (todo-list's Note dialog and Money sheet, gram's Nav on four pages, bot-garden's Form, Pad and
Win card, rocket-school's Result and Teach card); 48 authored true were always drawn (planning's ten sheets and editors,
rocket-school's Choice row placed 19 times, its Countdown bar, Confirm, Setup and Play screens).

The Noodl API family is the largest, and needs a translation of `Noodl.Records`, `Noodl.CloudFunctions`, `Noodl.Users`
and `Component.Object` (EXP-003 Tier B), which no test here can grade against the runtime in one session. The root
family reaches 72 roots and 7 refused triggers directly, its Did Mount neighbour 16 more, and the viewer's own nodes
render it in jsdom: it was built.

## The result

`dispdiff.ts`, base against the tree: **templates 19 projects, 13,432 nodes, 54 gained, 0 lost; corpus 228 projects,
29,217 nodes, 14 gained, 0 lost.** `census.ts`: 157 → 132. `tplbuild.ts`: all 19 templates 1 error in 1 (nightbook,
P18-S125-STYLENULL), as at the base. The spec 19 / 19; 11 mutant arms, each killing rows (control 19 / 19).
