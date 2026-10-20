# A trigger the export never runs is refused (P18 session 124, 2026-10-19)

The measurements behind EXP-011 §91 (P18-S122-DEADROW and P18-S123-UNDRAWNTRIGGER). Run the `.ts` from
`packages/nodegx-export` with `../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <script> <exportSrc>`,
`ROOTS=` as `../s119-fnchain-measure/dispdiff.ts` takes it. The shipped templates are primary's `templates/` (nightbook is
there and not committed) plus the two `*.content.json` written out by `../s119-fnchain-measure/materialize.ts`.

| script | what it reads |
|---|---|
| `census.ts` | every element that owns an attached chain and is never drawn, every Did Mount on an element a value mounts, every node collapsed into an undrawn element, every §4f row no printed chain writes (with the Function's disposition and its binding reads) |
| `tplbuild.ts` | every template under `ROOTS` emitted and typechecked as its own `tsc -b` would (`tests/helpers/typecheckApp`): errors per project, per TS code, per file (P18-S122-TPLBUILD) |
| `mutants.py` | the spec's mutant arms, each alone in a copy of the package (`packages/nx-mut-s124`, removed after) |
| `../s122-holdtheid/deadrow.py` | every printed §4f row whose setter the emitted file never calls (run over the emitted templates) |
| `../s119-fnchain-measure/dispdiff.ts` | every node's disposition, HEAD (`packages/.nx-ctl-s124`, `git archive HEAD` with the two ledgers beside `src`) against the tree |

## What was measured first (HEAD `e7e3e77db`)

`census.ts` over the 19 template projects: **186 elements own a chain and are never drawn, 151 nodes are collapsed into
one, 5 Did Mounts sit on an element a value mounts**. The bug files named 10 (the ones session 123 gained); the rest had
always been counted. `deadrow.py`: **19 printed rows, 11 never written** (members-area's Landing 8 reads, the Site
Builder's Site 2, its Messages and Admin, digital-bricks-training's AddALearner, the demo's TimelineRow, gram's Post and
Member, members-area's Chrome and Post, nightbook's Coming). No undrawn element in the templates is authored Mounted
false with nothing to mount it: each one has a wire into its Mounted the export does not carry (a refused Function, an
Inverter of a maybe-undefined operand, an instance output its component does not lift), so the running app draws it and
the export never does.

## What reading the diff found

- **The first rule refused a Function whose row a handler also reads, and lost a chain that worked.** The older Site
  Builder copies' "The slug to show" (a Did Mount) reads the URL's slug, and the never-written home slug only as a
  fallback: refusing the dead row's Function took it and its two Queries with it (15 corpus nodes, 3 in each of 5 copies). Now only a drawn
  element's read of a dead row is refused; a handler's or a Function input's read is kept, and the report says it reads
  nothing.
- **The refusal's own marker said "node goBtn renders".** An undrawn element's marker prints above the return; its
  header now says it is not drawn, and why.
- **A late marker line vanishes once a node is flushed** (rocket-school's "Fire the turbo"): pre-existing, filed as
  P18-S124-LATEMARKER, not fixed here.
- **A Page Inputs read only in a Did Mount reads "nothing reads any of its parameters"** (5 corpus copies; the dead
  row's render read had hidden it): pre-existing, filed as P18-S124-RUNINPUTS.

## The result

`dispdiff.ts`, HEAD against the tree: **templates 166 nodes leave the exported count, none join, 8 re-pointed to a drawn
trigger; corpus (220 projects) 73 leave, none join, 5 re-pointed.** Every node that leaves was collapsed at HEAD into an
element never drawn, or a Did Mount never run, or is a Query or Page Inputs only a never-written row read (EXP-011 §91.5
has the list). `deadrow.py` on the tree: **8 printed rows, 0 never written**.
