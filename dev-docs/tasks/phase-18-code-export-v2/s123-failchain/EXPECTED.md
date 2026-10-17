# What the runtime shows, predicted (P18 session 123)

Written before `tests/the-failure-runs-its-chain.test.ts` first ran. The fixture's own two scenarios were measured
first, by one run of `helpers/runtime-failure-arm.js` while it was being written (below, "measured"); the four variants
were not run before this file.

A reading is the text of each mounted Text, in page order: `Fail Desk`, the refusal (`That could not be removed.`) when
mounted, then `Error`, the Error row, `Said`, the variable its Failure chain sets, `Gone`, the variable its Done chain sets.

S1 = Remove, the request fails ("Not allowed"), Remove, the request succeeds.
S2 = Remove, Remove, the first fails ("A"), the second fails ("B").

## The fixture (measured)

- S1: hidden at load; hidden after Remove (the request is out, the clear ran); **shown** with Error and Said "Not
  allowed" when it fails; hidden after the second Remove, Error still "Not allowed" (never cleared); Gone "gone" when it
  succeeds, the refusal still away.
- S2: hidden until the first answer; shown with "A", then with "B".

## The variants (predicted)

1. **The clear wired first.** The same as the fixture in every step: the clear runs before the request either way.
2. **No clear.** S1: shown from the failure on, through the second Remove and the success (Gone "gone" beside it).
   S2: as the fixture.
3. **The id from a Variable holding `n1`.** The same as the fixture.
4. **The id from an empty Variable.** No request is ever made. After each Remove: Error and Said "Missing Record Id",
   and the refusal **hidden**: the runtime's Delete fails inside its own after-update callback, which is queued before
   the clear's, so it is shown and then put away in the same update. Each `answer:` step answers nothing and changes
   nothing.

## The controls (predicted)

- HEAD's order (the call awaited in place): S1's failure step shows the refusal hidden: the clear ran after the catch.
- No Failure chain: S1's failure step shows Error "Not allowed", the refusal hidden and Said empty.

## Added after the first run (measured, not predicted)

5. **Two verbs' Failures run one Set Variable fed by both Errors** (planning's Sign in). Added once the shared-sink
   defect was found; not predicted here first. Measured: Said is the failing verb's own Error at every step
   (First, Second, Third; then Second, First), as each verb writes its Error just before it pulses Failure.

## The drive (predicted, before `drive.cjs` ran)

`fail-desk` in a real headless Chrome, no backend: the runtime (`render-from-disk.js`), the export built from the tree
(`out-fixed`) and from HEAD `06ea65ea3` (`out-control`). S0 load, S1 Remove, S2 Remove, 4 s after each click.

- **Runtime.** The delete's request goes to a backend that is not there and fails on the network, after the click's
  clear: after S1 and S2 the refusal is **shown**, Error and Said hold the same network message. (If instead the
  runtime refuses before any request, because no backend is configured, its Failure runs before the clear, and the
  refusal reads **hidden** with the message in Error and Said. Not expected: the viewer has a default endpoint.)
- **Export, fixed.** The api stub throws "deleteNote is not connected to a backend yet" from an async function, so the
  catch runs after the click's clear: the refusal **shown** after S1 and S2, Error and Said that sentence.
- **Export, HEAD.** Remove is not wired (the Delete was refused for its consumed Failure): nothing changes at any step.

### What run 1 showed, and run 2 (predicted, before it ran)

Run 1 took the branch noted in brackets: **the runtime refused before any request** ("This project has no backend
configured"), so its Failure ran before the clear and the refusal read hidden after each Remove, with the message in
Error and Said. The fixed export's no-backend stub throws from an `async` function, so its catch ran after the clear
and the refusal read shown. That compares two ways of not being connected, not a failed request: the stub is the
export's stand-in for a backend the project never declared.

Run 2 declares a backend at `http://localhost:8599`, where nothing listens (checked with `lsof -sTCP:LISTEN`), so both
arms send a real request and it fails on the network. Predicted: **runtime and fixed export alike**, the refusal shown
after S1 and S2, Error and Said a network message (the two clients word it differently); HEAD's export unchanged at
every step.
