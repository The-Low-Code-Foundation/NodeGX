# ONT-010 — The claim and its gate

**Opened 2026-10-08.** **Depends on ONT-003, ONT-008 and R7.** **Status: 📋 not started.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Opus 5.5 is sufficient** — words bound to checks and a site gate. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Opus 5.5; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **When nodegx.io says NodeGX is a framework-independent, open-source, full-stack app system, every word of that
> sentence has a check behind it that anyone can run, and the sentence appeared the day the last check went green.**

## 2. Why

Richard's sentence (README top) and DIRECTION.md §3: a reason may be advertised only once the thing that makes it true
exists and can be checked by anyone; P111 SEE-009 binds each sentence on nodegx.io to its gate. README §10 takes the
claim apart and says what is true at scoping. This task makes the gate and writes the comparison.

## 3. What to build

1. **The checks.** One per word, as README §10's table: *full stack* = screens, logic, data model, verbs and permissions
   all in the project format and each graded (ONT-001, ONT-003, ONT-006, SEE-012); *framework independent* = the
   definition layer names no framework (ONT-001 AC2 for engines; a sibling grep for UI frameworks over the format
   package) and at least one target beyond the runtime conforms to the node specs (P107, already true for the export
   inside its reach and the strangers' targets); *open source* = the licence check and a named caveat for the agent;
   *one of the only* = the comparison document with sources, dated.
2. **The gate.** A script in `scripts/` that runs the checks and prints a table; SEE-009's binding carries it so the
   sentence cannot be on the site while the table has a red row.
3. **The comparison.** `COMPARISON.md`: Directus, Supabase, PocketBase, Hasura, Bubble, Anvil, Wasp, Redwood, LinkML
   and OWL, each read from its own documentation on a given date, with what it has and has not of: a person-readable
   spec of the world; engines graded beneath it; a kit for your own view; plain files; an exit to code. A row is a
   reading, not a verdict, and says when it was read.
4. **The sentence.** The form of words the gate allows, settled with Richard; the honest form at scoping is in README
   §10 and may change as rows go green.

## 4. Acceptance criteria

1. The gate script exists, runs in `test:main`, and is red at the time this task is built, with each red row naming its
   task.
2. `COMPARISON.md` cites a source and a date for every cell.
3. nodegx.io carries the sentence only through SEE-009's binding, and the binding names this gate.

## 5. Watch for

- **A claim written into a doc can grade the code it describes** (memory). The README's sentence is the thing the phase
  is for; it is not evidence, and the site must not quote it until the gate says so.
- **Rank by the product surface, not by a corpus** (memory). The comparison ranks what a person meets, not feature
  counts.

## 6. Built

*(empty)*
