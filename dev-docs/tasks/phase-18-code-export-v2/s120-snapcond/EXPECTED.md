# What the drive should read (written before the first run, 2026-10-16, session 120)

`gate-desk` (the export suite's fixture, `gen-gate-desk.py`): five buttons and three Texts. Show and Hide each send
Evaluate to a Condition with the box unticked (`true`, `false`); both Conditions' Is True go into "It went"'s Mounted
(authored false). Both sends Show's Condition, then Hide's. Show's Condition's Is False goes into "Not yet"'s Visible
(left unauthored). Flip turns a Switch; Check sends Evaluate to a Condition whose condition is the Switch, its Is True
into "The switch was on"'s Mounted (authored false).

Each Text is read as **absent** (no element holds its text), **hidden** (`visibility: hidden`) or **shown**.

Predicted from the runtime's own Condition (`condprobe.out`: `null` at load over anything authored, every Evaluate sent
again, the last pulse wins) and from HEAD's report for gate-desk (every snapshot wire dropped, Show / Hide / Both /
Check with no handler), before any arm ran:

| step | what is done | runtime | export-fixed | export-control (HEAD `25592b3e2`) |
|---|---|---|---|---|
| S0 | load | It went absent · Not yet **hidden** · switch absent | the same | It went absent · Not yet **shown** · switch absent |
| S1 | Show | It went **shown** · Not yet hidden · switch absent | the same | unchanged from S0 |
| S2 | Hide | It went absent | the same | unchanged |
| S3 | Both | It went **absent** (shown then put away in one press) | the same | unchanged |
| S4 | Show | It went shown | the same | unchanged |
| S5 | Flip | switch **still absent** (nothing has evaluated it) | the same | unchanged |
| S6 | Check | switch **shown** | the same | unchanged |
| S7 | Flip | switch **still shown** (a snapshot, not followed) | the same | unchanged |
| S8 | Check | switch absent | the same | unchanged |

Also read in each arm: the console (no errors or warnings).

What would be the defect if the fixed arm differs: S0 (the cell's first value: "Not yet" shows), S3 (the order of the
two writes in one handler), S5 or S7 (a live comparator in place of the snapshot), S2 (Hide's literal false).
