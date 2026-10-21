---
id: P124-S3-LENSBYNAMING
title: "The backend map's 'look as a real person' lit every table that a function they may run NAMES in its code, so every learner seemed to reach every table; what reaches a person is the rows that come back to them"
status: fixed
severity: high
area: P124 backend map (prototype editor) / the person lens
found: P124 s3, 2026-10-21, by Richard using the s2 map ("no matter who you click … the tables all light up. Surely every user doesn't have access to every table? That would freak people the fuck out")
evidence: dev-docs/tasks/phase-124-the-mystery-of-the-backend/LOOK.md §s3; editor/test/people.test.mjs (34/34 on a fresh copy, 2026-10-21)
---

What a person saw: pick any learner and 23 of the 27 tables lit up, the same for all twelve people. The lens
(`lensOf` in `editor/public/app.js`, s2) said a table was reachable when the person may run any function whose code
names the table. `course`, open to every signed-in learner, names 23 tables, so every learner "reached" them.

What is true, measured on a copy of the training backend: running every read-only function as each person and
finding every row of every table in the answers, a new learner reaches 2 of 289 rows, Marie 37, the staff member
261, someone not signed in 0. A function naming a table says nothing about whose rows it hands back; its own code
decides that.

**Fixed (s3):** `editor/lib/reach.mjs` measures a person's reach row by row (runs as them through a key bound to
them on the MCP door, follows what they were shown the way the app's next click would, matches rows by objectId,
one-column keys, several-column keys read with their parents, and one-row-per-person tables). The lens, the pink
wires and the table bars come only from rows that came back. The static touch analysis is kept, relabelled "Which
functions name it in their code", with a line saying naming is not handing over.

**Still a lower bound:** a function that changes data is never run, and a function with many possible arguments is
asked at most 16 ways (the panel says which and says "at least").
