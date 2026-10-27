---
id: P127-S9-FNLIMITFILEONLY
title: A function's rate limit the agent writes into nodegx.security.json, as the server's warning tells it to, never reaches the backend the app is running on
status: open
severity: low
area: "noodl-editor validation/publicWriteDoor.ts (PublicWriteDoorUnlimited: \"Add … rateLimit … to the project's nodegx.security.json\"); noodl-mcp: no tool writes a function's rule (set_collection_permissions is tables only); a running backend's security.json is never overwritten from the file (provision.ts warns after the fact)"
found: P127 s9, 2026-10-27, re-grading BKO-006's three labs on the published 0.2.8 (provision_backend on a copy)
evidence: "MEASURED: provision_backend (0.2.8) on copies of the expenses and book club labs warns \"This project ships a security policy … but backend \\\"App backend\\\" is running a different one\". The only differences: the file has functions.<name>.rateLimit for Monthly Reminders (5/5), Send Reminder (120/60) and Weekly Digest (10/10); the backend's security.json has none. The files are as the strangers left them (cmp). Transcripts: expenses line 155/158 and book club line 466 are PublicWriteDoorUnlimited warnings saying to add it to the file; lines 163 and 475 are the agents' Edit of nodegx.security.json."
owner: none — P127 lane 9, after Richard's s9 answers
---

What a person sees: nothing, until it matters. Two of the three agents were warned that a function anyone can call
writes records with no rate limit. Each did what the warning said and wrote a limit into the project's rules file. The
backend the app runs on locally never loads it, so the function is still unlimited there, and the files say otherwise.
Nobody is told until a later `provision_backend` warns that the two policies differ. (A ship starts its backend from
the files, so the shipped copy may enforce it. That was not measured here.)

R1 (the project's files are the truth, a backend is a copy loaded from them) holds for rules, functions, triggers and
workflows set through the agent's tools, which write both (`writeBoth`). It does not hold for a function's rule:
there is no tool for it, and the two ways the warning offers each write one side only (the file, or
`PUT /admin/permissions/functions/<name>` on the backend).

To do, one of: a tool (or a `set_collection_permissions` sibling) that writes a function's rule to both, and the
warning names it; or the running backend reloads `nodegx.security.json` when it changes, as Studio's own rule edits
already land in both.
