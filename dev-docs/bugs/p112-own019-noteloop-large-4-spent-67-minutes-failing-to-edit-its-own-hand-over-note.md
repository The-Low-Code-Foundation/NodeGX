---
id: P112-OWN019-NOTELOOP
title: "Large 4 spent 67 minutes failing to edit its own hand-over note — 23 `edit` calls on docs/NEXT.md, 18 refused as not matching, probe files written to calibrate the tool — after the app was finished; nothing in the kit caps work on the notes"
status: fixed
commit: 3153bb4fc
phase: P112
task: OWN-019
severity: medium
area: kit — the Vibe AGENTS.md process and skills (`packages/create-nodegx/profiles/vibe/`), the hand-over hook (`hooks/hand-over.mjs`); Vibe's `edit` tool (search/replace) on markdown it rewraps
found: P112 OWN-019 s4, 2026-10-14 (round E1, Mistral Large 4, the "your own editor" brief, tgz29)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
regression: packages/create-nodegx/test/create.test.js "P112-OWN019-NOTELOOP: after this session writes NEXT.md, three more writes to the notes pass and the fourth is refused"
---

E1's first session built and proved the editor and handed over at the 100-call line. The second session's last
NodeGX call was at 12:24; from 12:28 to 13:36 it edited notes only: NEXT.md 15 times, CHECKLIST.md 5, PLAN.md 1, and
`escape-test.txt`, `edit-cal.txt`, `grep-probe.txt` — 18 of 23 edits failed to match ("the file was re-wrapped
again"). Stopped by the lab (an intervention). The app it left grades 13/13 (`own-019/grade-editor.mjs`).

The kit's "two tries, then hand over" (nodegx-when-stuck) is about a checklist line; the hook closes everything but
the notes once NEXT.md is written — so the one thing still open is the thing it looped on.

**Proposed:** AGENTS.md: write NEXT.md whole with `write_file` (never patch it); and the hook counts note edits after
NEXT.md exists and, past a few, answers "the notes are done — stop". Measure on the next session-crossing round.

**Fixed (s5, 2026-10-14):** the Vibe AGENTS.md says write `NEXT.md` whole in one `write_file`, never patch it with
`edit`. The hand-over hook counts this session's writes to `docs/*.md` after its first write to a NEXT.md; once
this session's NEXT.md exists and three more have passed, the fourth is refused ("The notes are done: … Tell me
what this session did and what is next … and stop"). An earlier session's NEXT.md closes nothing (control in the
same test). Replayed on E1's session 2: its NEXT.md write was call 53; 65, 79 and 90 would have passed and 92 been
refused — about an hour before the lab stop. The regression fails on HEAD's hook and, separately, on HEAD's
AGENTS.md. Still to measure on a session-crossing round on tgz30.
