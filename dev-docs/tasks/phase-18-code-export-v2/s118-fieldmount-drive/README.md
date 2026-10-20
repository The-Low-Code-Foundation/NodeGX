# The field-mount drive (P18 session 118, 2026-10-16)

P18-S116-FIELDMOUNT: an exported text input wrote its Value only when someone typed, so a Variable it writes held
nothing at load where the running app's held `""`. Fixed by announcing the field's Value from a mount effect that runs
its own change chain (EXP-011 §85). This re-runs s116's drive (the page, the backend, the ten contacts and the five
steps are s116's, unchanged), whose S0 found the defect. `EXPECTED.md` was written before the run.

## The run

| step | runtime | export-control (HEAD `73b1096a9`) | export-fixed |
|---|---|---|---|
| S0 load | **no rows**; `vip` only, then `city = ""` | all eight vips; `vip` only (twice: `<StrictMode>`) | **no rows**; `vip` only (twice: `<StrictMode>`), then `city = ""` once |
| S1 "Berlin" | Ada, Gus, Ivo | Ada, Gus, Ivo | Ada, Gus, Ivo |
| S2 "Paris" | Cleo | Cleo | Cleo |
| S3 cleared | no rows (`city = ""`) | no rows | no rows |
| S4 "Oslo" | Finn | Finn | Finn |

**The runtime and the fixed export agree in every step, S0 included**, row for row and `where` for `where`, in the
same order: the query asks once with `city` unset and its condition dropped, the City box mounts and announces `""`,
`city` takes it, and the query asks again with `city = ""`, which matches nobody. The announcement is guarded, so
StrictMode's second mount repeats the first query and not the second. The control is s116's fixed arm, unchanged
(all eight vips at load). The box reads `""` in every arm at S0. No console errors or warnings in any arm. EXPECTED.md
held in every cell.

Read off the screenshots: the runtime's City box is narrower than the exported one and its placeholder smaller
(**P18-S118-INPUTLOOK**, low, filed by eye; the cause is not read).

What this drive does not reach: the kit-field shape (a field whose Value is wired from a component input and whose
Value Changed sends the component's output signal: 33 of the 66 fields the fix reaches). Its value is graded against
the runtime's own field in `tests/the-field-announces-at-mount.test.ts` §A.

## Running it again

From this folder: `python3 -I gen-params-desk.py`. Emit the fixed arm from the working tree with
`(cd ../../../../packages/nodegx-export && ../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <here>/emit.ts $PWD/src <here>/params-desk <here>/out-fixed)`.
The control was emitted once the same way from a copy of the package (`packages/.nx-ctl-s118`, `node_modules`
symlinked) holding HEAD's `plan.ts` and `component.ts` (the only two sources the fix touches), removed straight after.
Then `./build.sh` and `node drive.cjs`, which starts the backend, `scripts/devtools/render-from-disk.js` (the runtime
arm; its viewer bundle `noodl.viewer.js` was built 14:04 today, newer than every commit to the Text Input) and
Chrome (`--use-mock-keychain`, a free CDP port), and stops all three when it ends. `params-desk/`, `out-*/`,
`seeded.txt` and `drive.log` are generated and not committed.
