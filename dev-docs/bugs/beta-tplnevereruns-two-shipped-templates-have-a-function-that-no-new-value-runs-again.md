---
id: BETA-TPLNEVERERUNS
title: "Two shipped templates have a Function whose only wired input is set not to run on change, with Run unwired, so a new value never runs it again"
status: fixed
commit: (this session, the Beta sweep s4)
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

**Read before fixing (2026-10-25, the Beta sweep s4).** The two are different:
- `sr_fail` is not in the template. `templates/digital-bricks-training` wires `sr_call failure → sr_fail run`; the
  demo is GENERATED from it by `tools/build-demo.mjs`, whose stand-in for `capture` answers `done` only (the demo has
  no backend) and drops the `failure` wire, so `sr_fail` could never run there. The same is true of `Pages/Lesson`
  `ls_finish_failed` (not flagged, because its inputs re-run). The builder already removes the three "a refusal is
  nothing" nodes for the same reason.
- `firstLine` (members-area) is the template's own: an announcement whose body changes kept its old excerpt.

**Fixed.** `build-demo.mjs` `REMOVED_NODES` gains `Lesson/Section row: sr_fail` and `Pages/Lesson:
ls_finish_failed`, and the demo is regenerated (HEAD's builder was run first as a control and reproduced the
committed demo byte for byte; the new one drops those two nodes and their three wires, registry 451 → 449 nodes,
720 → 717 wires). `firstLine`'s `runOnChange-in-body` is `true` (the declared default, as the other templates write it).

**Graded.** `validate-project templates/* --only function-never-reruns`: 0 warnings (2 before). Whole-project
validation against HEAD's copies: the demo 68 → 67 warnings and members-area 3 → 2, the only one gone each time
the target; 0 errors both. `check-demo.mjs` OK. Not driven: neither template rendered.

