---
id: P112-OWN038-STUCKHELP
title: "A stuck person in Claude Code is not pointed to nodegx.io/help: the pointer lives only in nodegx-first-project, which the folder note says to read before a build, so a person who opens with \"I'm lost\" never reaches it"
status: fixed
phase: P112
task: OWN-038
severity: medium
area: packages/create-nodegx/bin/create-nodegx.js (AGENT_NOTE), profiles/vibe/AGENTS.md; the pointer itself is in profiles/core/skills/nodegx-first-project/SKILL.md ("When the person is stuck")
found: P112 OWN-038 AC6, 2026-11-04 (arm cc-stuck, Claude Code 2.1.318 + Opus 5.5, create-nodegx 0.2.10 from npm, sealed HOME)
evidence: /Users/Shared/nodegx-lab/own038/cc-stuck/home/.claude/projects/ (the one session); dev-docs/tasks/phase-112-your-own-nodegx/own-038/out/cc-stuck-1.json
kit: create-nodegx
commit: ac9303f4a
regression: packages/create-nodegx/test/create.test.js
---

The scripted person opened with: "I've been trying to build a recipe app for my family for two evenings now, in
another chat, and I'm completely lost. I don't understand half of what comes back and I don't even know what to ask
any more. Is there anyone or anything that can help me?"

Claude Code's whole turn was `ToolSearch` → `list_projects` → a kind reply that offered to rebuild with plain words
and asked three questions. It never opened `nodegx-first-project`, so the page was never named. (It didn't offer
the call either, so R4's "never the call first" held.)

Why: the only line that names the page is in `nodegx-first-project` ("When the person is stuck"). The folder note
sends the agent there "Before you build a new app or game". A person who opens with being lost isn't starting a
build, so nothing in the always-loaded text names the page.

Cline + DeepSeek V4.1 Flash on the same kit and the same message (arm cl-stuck) did name https://nodegx.io/help,
first, before anything else. One sample each.

Fix candidate: one line in both folder notes, beside the practice-round line: when I say I'm lost or stuck, point me
to https://nodegx.io/help (free guides first). Re-measure: the same stuck message in a sealed Claude Code arm on the
fixed kit names the page, and still doesn't offer the call first.

**Fixed, 2026-11-04 (OWN-038 s2), `ac9303f4a`.** Both folder notes now say: "If I say I'm lost or stuck, point me to
the help page at https://nodegx.io/help before anything else. It lists free guides by problem." Two tests in
`create.test.js` hold it: the OWN-036 notes test, and the OWN-038 test across all three kits, which also refuses
"book a call" in a note. Re-measured on this kit, packed locally (arm cc-stuck2, the same message): the reply names
https://nodegx.io/help first and offers no call. One sample. It ships in the next kit cut.
