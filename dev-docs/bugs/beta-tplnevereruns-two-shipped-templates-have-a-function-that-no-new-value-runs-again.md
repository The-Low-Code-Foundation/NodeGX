---
id: BETA-TPLNEVERERUNS
title: "Two shipped templates have a Function whose only wired input is set not to run on change, with Run unwired, so a new value never runs it again"
status: open
severity: low
area: templates (`templates/members-area` `/Members/AnnouncementRow` node `firstLine`; `templates/digital-bricks-training-demo` `/Lesson/Section row` node `sr_fail`)
found: the Beta sweep, 2026-10-25 — the first corpus run of the new `function-never-reruns` rule (bug P121-TWO005-NEVERRUNS)
evidence: `npx ts-node -P ./scripts/tsconfig.json ./scripts/validate-project.ts templates/* --only function-never-reruns` → 2 warnings over ~14,000 nodes in 19 templates, these two
kit: core
---

`firstLine` ("The first line of the body, and only the first") takes `body` from the row's Component Inputs with
`runOnChange-in-body: false` and no Run wire; its script starts `if (Inputs.body === undefined) return;`. `sr_fail`
("Not saved: the kit says so, words kept") takes `token` from `sr_save.out-token` with `runOnChange-in-token: false` and
no Run wire, and sets `status = 'failed:' + token`.

Each runs once at load and never again. Whether that is visible depends on timing: a repeated row's input is often
there by the load run, so `firstLine` may draw right and only miss a later edit of the body; `sr_fail` reads as a
handler meant to run when a save fails, and nothing starts it then. NOT driven: neither template was rendered to see
what a person gets. Likely fix: tick the box (`firstLine`), or wire the save's failure into Run (`sr_fail`), after
reading each template's intent.
