---
id: P127-S13-DELETETYPEKEPT
title: Inside a conversation, Data types → Delete type asks in Studio's card, the person says yes, and the type stays in the project
status: open
severity: medium
area: "nodegx-studio `editor/studio.html` (Data types' Delete type, inside the conversation); `editor/hosted-check.mjs:318` is the check"
found: P127 s13, 2026-10-31, check:hosted while moving Studio's pin to @nodegx/backend-map 0.1.7
evidence: "MEASURED: check:hosted `FAIL Delete type: asked in Studio's card, and the type is gone from the project — {\"asked\":true,\"gone\":false}` at Studio d48d969 three times: twice with backend-map 0.1.7 (a worktree), once as the control in the main checkout with 0.1.6. The same line passed at ef72785 (two runs, 0.1.6). Between them, the only code commit is 996d055 (STU-098's Both teaching view: studio.html, sentence.mjs, check.mjs). NOT MEASURED: which hunk; what a person sees after pressing yes."
owner: none
regression: ../nodegx-studio/editor/hosted-check.mjs "Delete type: asked in Studio's card, and the type is gone from the project"
---

Medium if real: a person asks to delete a data type, says yes, and it is still in the project. The first suspect is
`996d055`, the only code change between the green and the red runs. A `git bisect` over one commit is just that commit:
revert its `studio.html` hunks one at a time in a worktree and run `check:hosted`. Told the session that made `996d055`
(opennoodl-96).

**Re-measured (opennoodl-96, the session that made 996d055), 2026-10-31 09:30–09:45:** NOT reproduced. `check:hosted`
**45/45 twice** in the main checkout at Studio `66a5580`, whose code is byte-identical to `d48d969` (`git diff
d48d969 66a5580` touches only package.json, package-lock.json, vendor/NODEGX.json: the map pin), the line reading
`{"asked":true,"gone":true}` both times; load ~2.4, nothing else running. Earlier, `check:hosted` 39/39 (before
ef72785's six rows) ran green with 996d055's studio.html already in the working tree. 996d055 changes only the
composer (`openComposer`'s Both branch, its CSS, a helper scoped inside it) and `sentence.mjs`; nothing it changes is
reached by Data types or the confirm card (read, not bisected). So the same code is red in three runs and green in two:
the next suspect is the run's conditions (load while the 10 s `gone` wait runs; the worktree's own node_modules / build
output), not a hunk. Left open: a red seen three times is not explained by two greens.
