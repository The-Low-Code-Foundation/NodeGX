# Hold the id (P18 session 122, 2026-10-17)

EXP-011 §89. members-area's Announcement and Meeting and the Site Builder's PageEditor hold the page's id in a Function
run at mount ("Hold the id"): its `ready` fetches the Record, and its id is read by nodes that are not drawn (a second
Function run from a button, a Set Record, a Query's parameter). HEAD refused the Function and the second Function, so
those pages fetched nothing. `EXPECTED.md` was written before either arm ran.

Each script names its usage in its first line. Run the `.ts` ones from `packages/nodegx-export` with
`../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <script> $PWD/src …`; the `.py` ones with `python3 -I`.

| file | what it is |
|---|---|
| `gen-held-desk.py` | writes the suite's fixture `packages/nodegx-export/tests/fixtures/held-desk`, or the directory given (`held-desk/` here) |
| `probe.ts` | the fixture and its variants through the runtime arm and one export arm per source given, side by side: how `EXPECTED.md` was checked, and how the same-click order was found |
| `readers.ts` | every exported Run-wired Function whose output an unrendered node reads, the reader's disposition, and whether it shares an event with the Run |
| `deadrow.py` | every §4f row an emitted app never writes, and its reads (P18-S122-DEADROW) |
| `tc.ts` | an emitted app's strict typecheck, as its own `tsc -b` runs it |
| `build.sh`, `drive.cjs` | the drive: the runtime (`render-from-disk.js`) and two exported builds in one headless Chrome |
| `readings.json`, `shot-*-s5.png` | what it read |

## The run

| step | runtime | export-fixed | export-control (HEAD `63ed6b0f6`) |
|---|---|---|---|
| S0 load | a · Text · Text | a · · | all blank |
| S1 Remove | a · removing a · a | the same | unchanged |
| S2 Pick b | b · removing a · a | the same | unchanged |
| S3 Remove | b · removing b · b | the same | unchanged |
| S4 Pick nothing | b · removing b · b | the same | unchanged |
| S5 Remove | b · removing b · b | the same | unchanged |

(Loaded · Saying · Removed.) The runtime and the fixed export agree in every step after load. At load the runtime shows
the Text node's default, "Text", in the two Texts nothing has written yet, and the export shows nothing:
P18-S122-TEXTDEFAULT (low, filed; every wired Text with no text of its own, 222 in the templates). No console errors
in any arm.

## What EXPECTED.md got wrong

- **"No Did Mount: the same table"**, for the export. Without a Run wire the Function is a reactive one, a different
  shape: the export refuses it by name ("its out-id feeds Set Variable, which is itself deferred"), and the page is
  blank. The runtime row was right.
- **"No ready": the predicted divergence happened** (the fixed export read "removing nothing" at the last step), and
  was fixed: a materialized run keeps its node (P18-S121-FRESHOUTPUTS, half).

## The same click (found with `probe.ts`)

Remove also fires a Set Variable that reads the second Function's output. **The runtime's Set Variable reads the run's
new value whichever wire comes first** (its Do waits until the update's inputs have arrived). The export runs a
click's actions in wire order: with the Set Variable's wire after the Run, it reads the kept node's `delivered` value
and agrees; before it, it read the previous run's. That order is refused by name.

## Running it again

`python3 -I gen-held-desk.py "$PWD/held-desk"` (and with no argument for the suite's fixture). Emit the fixed arm from
the working tree with `(cd ../../../../packages/nodegx-export && ../../node_modules/.bin/ts-node -P tsconfig.json
--transpile-only ../../dev-docs/tasks/phase-18-code-export-v2/s119-pulse-drive/emit.ts $PWD/src <here>/held-desk
<here>/out-fixed)`. The control was emitted the same way from a copy of the package at HEAD (`packages/.nx-ctl-s122`,
`git archive HEAD`), removed after. Then `zsh build.sh` and `node drive.cjs`.
