# Phase 111 — next session

**Written 2026-10-01 at scoping, HEAD `22303a534`.** Nothing is built. This file is the board until a session builds.

## The board (re-derived from the task files, 2026-10-01)

| task | state |
|---|---|
| SEE-000 the census | ⬜ never built |
| SEE-001 the honesty number | ⬜ never built |
| SEE-002 the text form | ⬜ never built |
| SEE-003 the picture follows the app | ⬜ never built |
| SEE-004 the script becomes nodes | ⬜ never built |
| SEE-005 the nodes as a code library | ⬜ never built |
| SEE-006 arrive with your code | ⬜ never built |
| SEE-007 the entrance moves | ⬜ never built |
| SEE-008 the companion door | ⬜ never built |
| SEE-009 the words on the tin | ⬜ never built |
| SEE-010 Richard's verdict | ⬜ never built |

## The next task to build

**SEE-000, the census.** First step: `scripts/see/census.js` over `templates/`, counting what the runtime instantiates
(reuse `scripts/node-spec/census.js`'s rule), reproducing README §1's two rows and explaining the wrapper over-count.
Then SEE-001 and SEE-002 in parallel; neither waits on a ruling to start (R1 only decides where the text form lives on
disk, and the recommendation keeps the JSON as the file).

## Rulings owed by Richard (README §8, plain words there)

R1 text form as file or as view · R2 show the number always · R3 Functions count as script until NSP-017 · R4 import as
fixture first · R5 one entrance for everyone · R6 publish `@nodegx/nodes-react` · R7 the slice, not the whole app.
Recommendations are in the table; none blocks SEE-000.

## The phase's end condition

README §7, eight criteria; the last is Richard's verdict on the training slice built through the door (SEE-010). Zero of
eight are met.

## What scoping settled

- Not an experiment phase. Richard declined the two measuring experiments (token factor; hand import of one screen) as
  preconditions. They survive only as acceptance criteria inside SEE-002 and SEE-006, measured once the thing exists.
- RISE read in full and ruled out as a mechanism, kept as an instinct (README §3).
- The training template measured: 147 Functions, 7,796 lines of script, in 1,037 nodes (README §1). That number is the
  phase's starting line.

## Product findings

None yet; nothing was built.
