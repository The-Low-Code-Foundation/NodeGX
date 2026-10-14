---
id: P119-S2-SECRETNOBODY
title: A field the person marks secret projects to `read: "nobody"` — hidden from the coach the secret was kept for, not only from the learner
status: open
severity: medium
area: project-contract / world — the projection of a noun's `secret` answer (`projectWorld`, `fields`)
found: P119 SRK-003 s2, 2026-10-12
evidence: dev-docs/tasks/phase-119-learn-with-simple-rick/README.md §1b (the world, measured)
kit: project-contract
---

The world asks "Is any detail on a learner not for everyone who can see the learner?" Richard's answer: his notes and
the alias table are hidden from the learner. Marked `"secret": true` on those two fields, the projection gives the
Learner collection `fields: { notes: { read: "nobody" }, aliases: { read: "nobody" } }`. `nobody` admits only the admin
credential, so a policy copied from the projection would hide Rick's own notes from Rick (role `staff`). The question
says "not for everyone", and the projection hears "for no one".

The template's `nodegx.security.json` writes `read: "role:staff"` by hand. Nothing measured yet writes the
projection's `fields` into a live policy, so the harm today is a wrong suggestion, not a lost note.

Proposed fix: ask who may read a secret detail (a role, or the owner through a path) and project that, or project no
`fields` rule at all and name the detail as `notHeld` until the person says who.
