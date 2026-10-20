# The Success Desk — what each arm should read (written before either arm ran)

P18 session 130, EXP-011 §98, P18-S129-FNSUCCESS. The desk is `packages/nodegx-export/tests/helpers/success-desk.ts`.
Each reading: said · echo · order · pulse · next · shown · doneAt, then the Editor's field `[draft]=…` and `focus=…`.
Steps: Say, Bob, Say, Show, Pick b, Pick b, Pick c and show, Edit.

## What the runtime does, read from `simplejavascript.ts` before measuring

- `runScript` is reached from Run (`valueChangedToTrue` → `scheduleRun(this.beginOutcome())`, a token), from a ticked input's
  new value (`setScriptInputValue` → `scheduleRun()`, no token) and, Run unwired, from the script setter at load. Each
  schedules the run in `scheduleAfterInputsHaveUpdated`; two schedules in one update are one run (the guard), and a
  Run's token rides it.
- The body is `await func.apply(…)`: a sync body still finishes a microtask later. After it, `reportOutputSilence`, the
  Error cleared if a run before failed, then **`sendSignalOnOutput('success')`, then `reportOutcomes(tokens, 'done')`**:
  Success first, Done after, Done only with a token (only on a Run). Success has no token: it fires on every run that
  finishes, a ticked arrival's included.
- A throw (or a rejected promise) goes to the catch: Error, the raise, Failure; **no Success, no Done**. A script that
  does not compile, or whose script files do not load: Failure, no Success. No script: Unchanged (with a token), no Success.
- `Outputs.go()` in the body publishes held writes and pulses at once; its targets act in the drain. Success is sent
  after the await, so after every own signal the body sent.

## Predictions, the runtime arm

| step | said | echo | order | pulse | next | shown | doneAt | field |
|---|---|---|---|---|---|---|---|---|
| load | said nothing | echo nothing | order nothing | pulse nothing | next nothing | **shown a** (the seed arrives at creation, a ticked run: Success, no Done) | done nothing | `[draft]=` |
| Say | hello Ann | hello Ann (the Set's Done chain on the Success chain reads what it wrote) | **done** (Success, then Done) | **success** (the own signal, then Success) | **success** (the click's second wire, then the run, scheduled after the update and finished after an await) | shown a | done nothing | `[draft]=` |
| Bob | unchanged (unticked) | | | | | | | |
| Say | hello Bob | hello Bob | done | success | success | shown a | done nothing | |
| Show | | | | | | shown a | **shown a** (a Run: Success and Done) | |
| Pick b | | | | | | **shown b** (an arrival: Success, no Done) | shown a | |
| Pick b | unchanged (the same value: no run, though the Set Variable sends it again) | | | | | | | |
| Pick c and show | | | | | | shown c | **shown c** (one run, the Run's, with Done) | |
| Edit | | | | | | | | `[draft]=edit Cleo` (fill runs the Function, Success sets draft, its Done sends the field's Set) |

`focus=none` throughout.

## Predictions, the export arm after the fix

The same, but for one cell I expect to differ: **next after Say reads "second"** in the export if the run's chains print
inline where the Run sits (as a Done chain does today), because the runtime finishes the run after the click's later
wires. If the runtime arm reads "success" there, the Done chain has the same divergence at the base, and it is not this
bug's (record it; file it if it is not filed).

## The control (base export, `72f013fec`)

The base refuses each of the three Functions whole ("its success output is consumed — only done continues a Run chain"),
so nothing they drive runs: Say writes only next ("second"); Show, Pick b and Pick c write only `pick`, which no Text
shows; Edit leaves the field empty. Every reading after load is the load's but for next.

## What the arms read (`probe.ts`, after the predictions above)

- **The runtime arm held every predicted cell**, the next cell included: after Say it reads "success", the run finishing
  after the click's second wire.
- **The base export read the control** as predicted (every reading after load the load's, next "second").
- **The fixed export, first build**, differed in two places, each then read in the emitted code:
  1. `next` after Say, "second": predicted above. The base's Done chain does the same (`EDIT=` every Success wire made a
     Done wire: runtime "success", base export "second"). P18-S121-ONEUPDATE's family; the spec pins it (A9) and moves the
     second wire into a variant.
  2. `shown` at load, "shown nothing": the seed of `shown` was stored again on StrictMode's second mount, over the
     ticked run's write (P18-S121-SEEDTWICE; the arrival is held, so the second ticked effect does not run). The desk
     leaves `shown` unseeded; the variants that never write it at load seed it.
- **A count of the pick's runs** (a Counter on Success) was added after reading the emitted Show handler: a Run of a
  Function that is neither pulsed nor materialized printed no statement, so it never recorded its ticked read, and a
  click that writes the value and sends Run ran it twice (predicted from the code: 5 for 4; measured 5 for 4). Before this
  session no such run had a ticked half (it needed an own signal or a row); a Success chain gives it one. Fixed: the
  Run prints its record.
- **A throw** (`EDIT=` the greeting throws for Bob, read with both arms' error check lifted, in a copy): the runtime
  sends neither Success nor Done and runs the click's later wire; the export's wrapper catches the throw and both chains
  run on the run's last values (order "done", said ""). The base's Done chain does the same: P18-S130-THROWCHAIN, filed.
