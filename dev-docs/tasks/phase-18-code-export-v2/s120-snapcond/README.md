# The snapshot Condition (P18 session 120, 2026-10-16)

EXP-011 §87, P18-S120-SNAPCOND: a Condition with its box unticked, Evaluate wired, and Is True / Is False into a
Mounted or a Visible was refused in the export ("its value outputs are snapshots of the last Evaluate"), and with it
the call in front. It is now one boolean cell per element, false at first, written by each Evaluate.
`EXPECTED.md` was written before the drive ran.

| file | what it is |
|---|---|
| `condprobe.js` → `condprobe.out` | the runtime's own Condition: what the sink receives at load and per Evaluate, one sink or two |
| `census.ts` | every snapshot Condition under `ROOTS=`: its condition, what sends Evaluate, what reads it (`V=1` lists them) |
| `gen-gate-desk.py` | writes the export suite's fixture `packages/nodegx-export/tests/fixtures/gate-desk` |
| `build.sh`, `drive.cjs` | the drive: the runtime (`render-from-disk.js`) and two exported builds in one headless Chrome |
| `readings.json`, `drive.log`, `shot-*-s6.png` | what it read |

## The run

| step | runtime | export-control (HEAD `25592b3e2`) | export-fixed |
|---|---|---|---|
| S0 load | It went absent · Not yet hidden · switch absent | Not yet **shown** | the same as the runtime |
| S1 Show | It went shown | unchanged | the same |
| S2 Hide | It went absent | unchanged | the same |
| S3 Both | It went absent | unchanged | the same |
| S4 Show | It went shown | unchanged | the same |
| S5 Flip | switch still absent | unchanged | the same |
| S6 Check | switch shown | unchanged | the same |
| S7 Flip | switch still shown | unchanged | the same |
| S8 Check | switch absent | unchanged | the same |

**The runtime and the fixed export agree in every step**; EXPECTED.md held in every cell; no console errors or
warnings in any arm. HEAD's export prints no handler on Show, Hide, Both or Check.

## Running it again

`python3 -I gen-gate-desk.py`, then copy the fixture here as `gate-desk/`. Emit the fixed arm from the working tree
with `(cd ../../../../packages/nodegx-export && ../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only
../../dev-docs/tasks/phase-18-code-export-v2/s119-pulse-drive/emit.ts $PWD/src <here>/gate-desk <here>/out-fixed)`.
The control was emitted the same way from a copy of the package at HEAD (`packages/.nx-ctl-s120`, `git archive HEAD`,
the package's `node_modules` symlinked), removed after. Then `zsh build.sh` and `node drive.cjs`, which starts
`scripts/devtools/render-from-disk.js` (its viewer bundle built 2026-10-16 14:04, after the last change to the Condition,
the Switch and Visible on 2026-10-08) and Chrome (`--use-mock-keychain`, a free CDP port), and stops both when it ends.
`gate-desk/`, `out-*/` and `drive.log` are generated and not committed.
