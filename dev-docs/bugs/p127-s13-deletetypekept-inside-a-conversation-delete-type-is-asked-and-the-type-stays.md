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

Medium if real: a person asks to delete a data type, says yes, and it is still in the project. ~~The first suspect is
`996d055`~~ (withdrawn: chosen only because it sat between the green and red runs, never read; the re-measure below
reads it and finds nothing that reaches Data types). A `git bisect` over one commit is just that commit:
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

**P127 s13 (the finder), on the re-measure:** agreed, the code is not shown to be the cause. One fact for the
conditions: the three reds were not all in a worktree. The control ran in the main checkout (d48d969, node_modules
with 0.1.6), so the worktree's install alone does not explain them. All three ran under `nice -n 19`, each straight
after another headless-Chrome run of mine (load not recorded). Next, if it is chased: the same check at
`nice -n 19` beside a second Chrome job, against an un-niced run, reading the `gone` wait's last disk state.
