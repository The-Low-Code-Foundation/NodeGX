---
id: P119-S2-WORLDPERLINK
title: validate_world asks a link's four questions once per link — 40 of a coaching app's 47 questions were the same four, ten times over
status: open
severity: medium
area: project-contract / world — `nextQuestions` (`packages/nodegx-project-contract/world`), served by the MCP's `validate_world`
found: P119 SRK-003 s2, 2026-10-12
evidence: dev-docs/tasks/phase-119-learn-with-simple-rick/README.md §1b (the world, measured)
kit: project-contract
---

A person describing a small app is asked the same question many times. Learn with Simple Rick has eight nouns and ten
`belongs-to` links. `validate_world` (limit 50) returned 47 questions; 40 of them were `several`, `required`,
`whenTargetGoes` and `moves`, asked once for each of the ten links ("Could a message ever be attached to several
conversations…", "…a coachNote…several learners…", and so on). The noun questions are already batched: `onlyOne`,
`calledBy`, `history`, `readAloud` and `secret` each come once, naming every noun ("The same for a conversation, a
message…").

Richard answered all 40 in two clicks, put to him as two plain questions ("never deleted, never moved"; "exactly one,
as listed"), because the per-link answers were the same. At the default budget of 5 a round, the tool would have
taken eight rounds to ask what two sentences answered.

Proposed fix: batch a link question across every link of the same kind that has not answered it, the way the noun
questions are batched, with the exceptions written per link ("required: yes, except a coach note's conversation and
message, and a session's review"). Size: `nextQuestions`' grouping plus its tests.
