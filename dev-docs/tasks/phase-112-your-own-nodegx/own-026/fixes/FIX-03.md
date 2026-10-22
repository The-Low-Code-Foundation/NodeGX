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

(the fixer writes this)
