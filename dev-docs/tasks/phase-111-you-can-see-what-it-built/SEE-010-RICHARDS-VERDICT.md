# SEE-010 — Richard's verdict: the training slice, built again through the door

**Opened 2026-10-01.** **Depends on everything before it.** R7 asked.
**Status: 📋 not started. The phase closes on this.**

## 1. The person sentence

> **Richard builds the slice of the training system he already built twice, a third time through the companion door,
> and can say with the numbers beside him whether NodeGX is now the companion he wanted or whether the code version
> still wins, and why.**

## 2. Why this is the closing task and not the opening one

Richard said on 2026-10-01 he did not want to run the two measuring experiments first; he wanted the advantages built so
they are the obvious reasons. So the comparison he felt is the **last** measurement, taken once the things that would
change its answer exist. It is written here now so every earlier task knows what it is for.

## 3. The control

README §1 reading 3: the code version is a far bigger app than the template. The comparison is **the slice** (R7):
the pages and behaviours Richard rebuilt in NodeGX, named by him in SEE-000 §3.4, with the code version's files and lines
for that slice as the control row.

## 4. What is measured, in one table

| | code version (control) | NodeGX, before this phase (SEE-000) | NodeGX, through the door |
|---|---|---|---|
| tokens spent to build the slice | from Richard's usage, where recorded; else "no record" | SEE-000's row | this build |
| wall-clock sessions | | | |
| defects met during the build, filed | | P78 register rows from that build | this build's rows |
| honesty number | n/a before SEE-006; after it, the slice imported | SEE-000 | this build |
| Richard's look (P81 protocol) | his words | his words | his words |
| what he could see of how it works, without reading code | | | |

## 5. What to do

1. Richard names the slice. SEE-000 §3.4 records the control row.
2. An agent builds the slice through the companion door from the template's `docs/BRIEF.md` with SEE-008's surface,
   recording tokens and tool calls, filing product findings as it goes (memory: *a template push files its product
   findings as it goes*).
3. Richard drives it, looks at it, and reads its honesty number and the list of what is script.
4. If SEE-006 landed, the code version's slice is imported and its number sits beside the others.
5. **His verdict in his words, verbatim, here.** The phase closes on whichever answer he gives, with the table filled.

## 6. Acceptance criteria

1. The table in §4 has no empty cell that could have been measured; "no record" is written where it is true.
2. The build filed its product findings in the P78 register the day it met them.
3. Richard's verdict is recorded verbatim, with the date.

## 7. Watch for

- Memory: *a wireframe is not the mockup.* The look column is Richard's, not a gate's.
- Memory: *measure the artefact before believing the task file.* The control row is counted from the code repo on the
  day, not copied from README §1.
