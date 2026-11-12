# FIX-03 — after t1-nodegx-3: the safe way must be the short way

**Written 2026-10-23 ~00:40 CEST by the lab session.** Read `README.md` here first. **Gates:** Richard decides whether
test 2's first NodeGX change waits for it (see the lab's message); test 1 is finished.

## Where it stands

NodeGX in test 1: **16 → 17 → 18** of 22 over FIX-01 and FIX-02; the plain-code arm scored 21 every time (`../PLAN.md`
§8, the test 1 table). FIX-02 arrived and worked (`LEARNINGS.md` #3): the guidance is read by section, reloads keep
the record, buttons are 44 px, script fell to 4 Function nodes / 106 lines.

## What's left, and why advice won't fix it

Two traps remain, T3 and T5, and **the lessons for both now reach the model**. DeepSeek read them and argued them away
(t1-nodegx-3, `sittings/1/agent.jsonl`, timeline lines 224–240 and 805–807 in the lab's extract):

- *"The doctrine explicitly warns … contention is negligible … Simpler and defensible: compute the whole new state"*:
  one whole-record `Noodl.Records.update` per answer, from the page's copy, so two tabs overwrite each other (T5).
- *"double presses are a minor risk … after a check, the UI moves to feedback state where the Check button is
  hidden"*: true for a click, but Enter in the answer field still answers twice, so fuel goes +2 (T3; t1-nodegx-2 had
  passed it).

The plain-code arms got both right unprompted, because an endpoint per action (`POST /answer` → `UPDATE … SET fuel = fuel + 1`)
is the shortest code to write and is safe. In the graph today the shortest path (a Function that writes the whole
state, a Button and a Text Input's Enter both wired to it) is the unsafe one, and the safe one (an increment in a
Function, a busy flag wired back to `enabled`) is longer. A cheap model takes the short path and calls the warning
"negligible".

## A. A change by an amount is one node, no script (candidate; measure first)

Find the smallest graph-level way for "add N to this field of this record" that needs no Function node: for example
an Update Record (or a Set Record Properties) whose field can be set as an *increment* (`+1`) and is sent to the
backend as one, or a dedicated node. Then make it what the guidance, `get_node_type` and the examples show first for
a counter or score. Check what the backend and the exporter already support before adding anything (FIX-01 found
`Increment` and fixed `-INCREMENTNEWFIELD`).

## B. An action that saves runs once until it has answered (candidate; measure first)

Today "taken once" is advice that needs a flag and a wire per control. Find the kit-level version: e.g. a Button's and
a Text Input's submit (Enter) do nothing while the action they trigger is still running (an opt-out, not an opt-in),
or the record-writing nodes refuse a second write for the same item while one is in flight and say so. Whatever you
choose, it must cover the keyboard path (Enter), which is the one DeepSeek forgot.

## C. Say it where the decision is made, as a result, not a rule (small)

When a write puts a whole record back from page state into a field the graph also reads, or when two controls trigger
the same saving action, say so in the write's result, as an `info` naming the safe node from A or B. FIX-02 judged
"a value several devices change" untestable. These two shapes are testable.

## Not now

- T6 (a page unlocked for a moment stays unlocked) fails in 7 of 9 rounds, every arm: a reading of the request, not a
  kit defect. F6 (the Moon as start or stop) likewise.
- `P112-OWN026-EXPORTBINDREAD`, `-NESTEDCHROME`, `-SBR009HOME`: open from earlier FIX files.

## Done

**2026-10-23, fixer session opennoodl-26.** Commit `cb7e0d6e4` (A + B + C, the kit's teaching, tests), then the
ledger/Done commit after it. **Kit:** `/Users/Shared/nodegx-lab/kits/FIX-03-cb7e0d6e4/`, packed under HEAVY.lock in the
clean worktree `OpenNoodl-worktrees/own026-fix03-pack` at `cb7e0d6e4` (runtime `build:types` first; the worktree's
links to primary's `dist` unlinked before building; `git status` empty after):

| tarball | sha1 |
|---|---|
| `nodegx-mcp-0.2.5.tgz` | `0ebb6459a3cb5b85eb194e200e5ce0c7180ef06a` |
| `nodegx-preview-0.2.4.tgz` | `95932ec27cae5ca593a087417137ce58e0e5626a` (carries A and B: **the graded app needs it**, via the lab's npx shim) |
| `create-nodegx-0.2.5.tgz` | `cee60bdc412884eb655e2816f80973293f3eeb6d` (the registry's; nothing in it changed) |

**🔴 For the lab: A and B live in the runtime and the viewer.** The agent's `render_report` / `drive_page` get them from
the kit's MCP; the app the grader starts gets them only from this folder's `nodegx-preview-0.2.4.tgz` (`kitnpx.sh`).

**A — a change by an amount is one node (`P112-OWN026-SHORTPATHUNSAFE`, fixed).** Update Record has **Add To**
(property names, comma-separated). Those properties' values are amounts sent as `cloudstore.increment` (atomic on the
NodeGX backend) AFTER the other properties' save, so Only If Unchanged still guards them and a refused save adds
nothing; the record shows the backend's total. A value that is not a number fails the Do and says so; `All` never
sends an amount's field as a value; Local only adds to the record held. Chosen over a new node: no new type to
register, picker, export or teach; the port sits beside Only If Unchanged and parses the same way. Node spec v5, 9 new
scenarios; conformance on seeds 3, 7, 99, 20748: 41/41, 0 divergences, 85/85 mutants. The React export refuses it by
name (`-EXPORTADDTO`) rather than writing the amount as the value. What it does not do: express "add 1, and at 10 wrap
to 0 and move on one" atomically. That is still a read in the page; a graph that wants it safe stores the count and
derives the rest, or uses a cloud function.

**B — a press that saves is taken once (`P112-OWN026-DOUBLEPRESS`, fixed), on by default.** `pressguard.ts` in the
runtime: a Button's Click or a Text Input's On Enter (the viewer routes both through `guardedPressHandler`) makes the
next update its cause; any backend write that starts in that update (the six `cloudstore.js` write methods: every
Record node, and a `Noodl.Records` call made before its first `await`) holds the press's keys until the backend answers
and for at least 500 ms (a localhost backend answers inside a double-click). The keys are the nodes the press is
wired to, so a Check button and its field's Enter wired to the same node share one guard; that is the shape the
measured app had. A press that starts no save is never held. Two presses before the update both fire: an Update
Record's Do twice in one pass is already one request. Opt-out: **Repeat While Saving** on both controls. A first
version also held a press until its update had run; the Text Input's node spec plays two Enters in one frame and
expects both, so it was wrong and was removed.

**C — said in the write (`P112-OWN026-WRITESILENT`, fixed).** Two infos in every write's answer, never blocking
(`sharedValueWrites.ts`): `shared-value-written-back-whole` (an Update Record's `prop-X` worked out, through at least
one node, from a same-class Record's `prop-X`, the field in neither Add To nor Only If Unchanged; suggestion
`"addTo": "X"`, example attached) and `two-controls-start-one-save` (two press controls reach one save through
different first nodes, the case B's shared guard does not cover).

**Taught where it is read.** `cloud-shared-counter` is now Button + Record + Update Record with Add To, no script.
`readFirst` rules 7–8, the backend doctrine, the enforced-rules note and the Update Record / Button / Text Input
enrichments lead with Add To and the built-in guard. Measured on the kit: in `get_project_info` (54,855 characters)
`addTo` is at character 1,305 and "taken once" at 1,498; in `get_node_type SetDbModelProperties` at 832 and 1,180. All
survive Cline's 8,000-character middle cut. `list_examples "a count several devices change"` answers
`cloud-shared-counter` first.

**Proof from the tarballs** (empty HOME, the server over stdio exactly as the Cline kit runs it, a scratch project, a
local backend, Score `s1`):
- **B, guard on.** A page with "Add one" and a field whose Enter goes to the same Update Record (Add To `points`, 1).
  Each phase is read back after a reload:
  - two taps 130 ms apart: +1;
  - Enter twice: +1;
  - a scripted same-frame double click: +1;
  - one tap after a pause: +1.

  That held in 5 of 6 drives. The very first drive added 2 for the two taps and has not recurred in five since.
- **B, control.** The same page with Repeat While Saving on adds +2, +2, +2, +1 (two drives), so the guard is what
  holds.
- **C.** Through the same server, the measured shape (Record `points` → Function → Update Record `points`, Check and
  the field's Enter into the Function) answers `shared-value-written-back-whole` with `"addTo": "points"`. Rewired so
  the Enter goes straight to the Do, it adds `two-controls-start-one-save`. The safe page above answers neither.
- **A** is in every B row (increments only; the backend's total read back after each reload).

**Not done / not changed, and why:**
- **T5's "add, then wrap and move on" stays a page read** (see A). The info says so at the write; the doctrine names
  Only If Unchanged for a value that is not a count.
- **A write a script starts after its first `await` is not attributed** to the press (B). The first write's hold
  still covers the double-click.
- **The Swift export** was not touched for Add To. The React export refuses it.
- **Found on the way, not FIX-03's.** Each reads the same at `328f1dd1d` on today's seed:
  - conformance on seed 20749: Checkbox, Video, States and `noodl.cloud.createuser`, plus a known row C96 that no
    longer fires;
  - `fed-001-feed` (a message reads "K characters", the test wants "KB").

  In noodl-mcp:
  - SBR009HOME, FLD-013 and CMP-001, as FIX-02 noted;
  - `own020CallToolStrip`, whose message FIX-02 changed;
  - the CMP-004 shelf tests;
  - the Nightbook template tests and `projectBinding`, both a peer's work in progress (`tools/openStudio.ts`);
  - the DEF-018 drive.

  In node-spec: the honesty, census and ledger numbers, which moved with templates in peers' uncommitted piles.
- **Unmeasured:** the older examples wire Record ports by bare names (`title`), and the runtime registers only
  `prop-` names. The examples validator accepts both, so this needs a drive before it is a bug.
- **Run:**
  - the runtime suite (204 of 206 files green; the two reds above);
  - viewer-react (1905/1905);
  - node-spec (37 of 41 files; the four reds are the template numbers and the drawer table, regenerated);
  - noodl-mcp (16 reds, none mine, listed above);
  - the editor's validation tests (198/198) and its typecheck;
  - the exporter's refusal suite;
  - `catalog:check`, `catalog:merge:check`, `catalog:examples` (112/112).
