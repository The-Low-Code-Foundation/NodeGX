---
id: P112-OWN019-SEEDDONE
title: "A seeded round (`round-kit --seed`) kept the seed app's own docs/NEXT.md (`# Done`, from the build that made the seed), so TE1's sitting, which ended without writing a note, read to the lab as the round finishing"
status: fixed
commit: (this commit)
phase: P112
task: OWN-019
severity: medium
area: the lab — `dev-docs/tasks/phase-112-your-own-nodegx/own-018/round-kit.mjs` (`--seed`)
found: P112 OWN-019 s7, 2026-10-15 10:06 (TE1, the editor brief seeded with q6, tgz33)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s7)
---

TE1's `docs/NEXT.md` at the end of the round was q6's, dated 2026-10-14 ("# Done — Proved in the final sitting…"):
the agent never wrote one. Its one sitting (22 min) was spent on a backend that would not start (NODE20: the server
ran on Node 20.11.1; the backend needs `node:sqlite`, Node ≥ 22.13), it refused the ephemeral fallback because the brief
needs the quiz kept until tomorrow, and the session ended. round-kit read `# Done` and stopped: `stop: done`. The grade
(0/13, no "Edit quiz") was true of the app and says nothing about Large 4 on this brief.

**Fixed:** `--seed` removes the seed copy's `docs/NEXT.md` (the seed itself is untouched); the round writes its own.
Checked on a dry seeded create: the copy's docs have no NEXT.md, the seed still has its own. s4's E1/SE1 were seeded
the same way and passed because their first sitting wrote a new note. TE1 re-run as TE1b under Node 22.
