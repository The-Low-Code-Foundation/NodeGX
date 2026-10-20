# The pulse drive (P18 session 119, 2026-10-16)

EXP-011 §86: a Function run by an event, whose own signals (`Outputs.go()`) drive actions, was refused whole in the
export; its signals run their chains now, reading the Function's outputs as the runtime's targets do (C7 lockstep).
`EXPECTED.md` was written before the run.

## The run

| step | runtime | export-control (HEAD `8baf5a3fd`) | export-fixed |
|---|---|---|---|
| S0 load | three empty Texts | the same | the same |
| S1 Send, the field empty | **no problem text** | nothing | **no problem text** |
| S2 type "Ada", Send | Hello, Ada · 1 | nothing | Hello, Ada · 1 |
| S3 Send again | Hello, Ada · 2 | nothing | Hello, Ada · 2 |
| S4 clear, Send | Hello, Ada · 2 · **Type a name first** | nothing | Hello, Ada · 2 · **Type a name first** |
| S5 type "Grace", Send | Hello, Grace · 3 · Type a name first | nothing | Hello, Grace · 3 · Type a name first |

**The runtime and the fixed export agree in every step**; EXPECTED.md held in every cell. HEAD's export prints no
handler on Send (its run was refused: "consumed outside the Run chain by an unrendered sink"). No console errors or
warnings in any arm. S1 against S4 is P18-S119-FIRSTWRITE in a running app: the body resets `problem` to `''` before
writing the sentence, and the refused pulse reads the first value queued.

Read off the screenshots (`shot-*-s4.png`): the same three lines; the Button and the field look as BUTTONLOOK and
INPUTLOOK already say.

## Running it again

From this folder: `python3 -I gen-pulse-desk.py`. Emit the fixed arm from the working tree with
`(cd ../../../../packages/nodegx-export && ../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <here>/emit.ts $PWD/src <here>/pulse-desk <here>/out-fixed)`.
The control was emitted once the same way from a copy of the package's `src` at HEAD (`packages/.nx-ctl-s119`, made
with `git archive HEAD`, `node_modules` symlinked), removed after. Then `./build.sh` and `node drive.cjs`, which starts
`scripts/devtools/render-from-disk.js` (the runtime arm; its viewer bundle was built 2026-10-16 14:04, after the last
commit to the Function node and the drain, 2026-10-11) and Chrome (`--use-mock-keychain`, a free CDP port), and stops
both when it ends. `pulse-desk/`, `out-*/` and `drive.log` are generated and not committed.
