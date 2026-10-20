# A ticked input runs the Function again (P18 session 121, 2026-10-17)

EXP-011 §88: P18-S119-TICKEDRUN (a Run-wired Function also runs when a ticked input gets a new value) and
P18-S121-DIDMOUNT (an element's Did Mount chain, compiled and then dropped as "no DOM event equivalent"), both fixed.
`EXPECTED.md` was written after the runtime arm and before the two export arms ran.

Each script names its usage in its first line. Run the `.ts` ones from `packages/nodegx-export` with
`../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <script> $PWD/src …`; the `.js` ones with `node`.

| file | what it is |
|---|---|
| `tickprobe.js` → `tickprobe.out` | the runtime's own Function, Run wired, a ticked input fed by a producer: when a value runs it, how many runs per update, whether such a run sends Done, a literal at load |
| `census.ts` | every Run-wired Function with a ticked input (wired or literal), what it sends, how its outputs are read, its disposition |
| `freshoutputs.ts` | Functions whose body reads one of its own outputs and that export without a node across runs (P18-S121-FRESHOUTPUTS's reach) |
| `gen-ticked-desk.py` | writes the export suite's fixture `packages/nodegx-export/tests/fixtures/ticked-desk`, or the directory given (`ticked-desk/` here) |
| `build.sh`, `drive.cjs` | the drive: the runtime (`render-from-disk.js`) and two exported builds in one headless Chrome |
| `readings.json`, `shot-*-s4.png` | what it read |

## The run

| step | runtime | export-fixed | export-control (HEAD `2419c0897`) |
|---|---|---|---|
| S0 load | a · 2 · 2 · 2 · 1 | the same | all blank |
| S1 Pick b | b · 3 · 3 · 2 · 1 | the same | unchanged |
| S2 Pick b again | unchanged | the same | unchanged |
| S3 Run | b · 4 · 4 · 4 · 1 | the same | unchanged |
| S4 Pick c and run | c · 5 · 5 · 5 · 1 | the same | unchanged |
| S5 Again | c · 5 · 5 · 5 · 2 | the same | Said 1, the rest blank |

(Holding · Runs · Ready at · Done at · Said.) The runtime and the fixed export agree in every step; no console errors.

## One update (P18-S121-ONEUPDATE)

Read on the runtime arm of the spec (`tests/helpers/runtime-ticked-arm.js`), the fixture with one edit each:

- **A child's Did Mount sends Run, its parent's writes the item** (`item` seeded `a`, the Page's Did Mount sets `p`): the
  runtime reads `p · 3 · 3 · 3` at load (its Done's chain reads the outputs after the arrival's run). The export reads
  `a · 2 · 2 · 2` in development (P18-S121-SEEDTWICE: the seed's second mount writes `a` back) and would read
  `p · 3 · 3 · 2` without StrictMode.
- **One click writes the item twice** (`q`, then `p`): the runtime runs twice (Runs 2 → 4). The export runs once.
- **Two Did Mounts write the item** (`q` from the Box, `p` from the Page, unseeded): the runtime reads `p · 2` (two
  arrivals), the export `p · 1`.

## Running it again

`python3 -I gen-ticked-desk.py "$PWD/ticked-desk"` (and with no argument for the suite's fixture). Emit the fixed arm from the working tree with
`(cd ../../../../packages/nodegx-export && ../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only
../../dev-docs/tasks/phase-18-code-export-v2/s119-pulse-drive/emit.ts $PWD/src <here>/ticked-desk <here>/out-fixed)`.
The control was emitted the same way from a copy of the package at HEAD (`packages/.nx-ctl-s121`, `git archive HEAD`,
the package's `node_modules` symlinked), removed after. Then `zsh build.sh` and `node drive.cjs` (`ARMS=runtime` for
the runtime alone).
