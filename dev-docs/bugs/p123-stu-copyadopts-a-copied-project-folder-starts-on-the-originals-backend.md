---
id: P123-STU-COPYADOPTS
title: A copied project folder with its binding removed still starts on the original's backend: Studio's Start a backend adopts it
status: open
severity: high
area: nodegx-studio / Data → Start a backend (lib/backend.mjs provisionFor) over NodeGX provision (noodl-mcp backend/provision.ts findReusableBackend)
found: STU-092 drive, 2026-10-30 (a copy of Greenhouse, `metadata.cloudservices` deleted, POST /api/backend-provision)
evidence: the answer was {"phase":"adopted","id":"backend_mvv1hrdnfftkg","name":"Greenhouse backend","pid":45379}, the running backend of ~/vscode_projects/NodeGX test projects/Greenhouse, and the copy's nodegx.project.json was bound to it
phase: P123
---

A person who duplicates an app's folder (Finder, `cp -R`, a zip) and opens the copy in Studio gets a copy that is bound to
nothing, which is right. But *Start a backend* then reuses the backend the ORIGINAL owns: `provisionFor` passes the
project's durable id (`ensureProjectId`, carried in the copied files), and NodeGX's `findReusableBackend` matches the
backend by that id and its name ("Greenhouse backend"); it is running, so it is adopted. From then on every write the
copy makes (App data, Privacy, a workflow) lands in the original app's database. Nothing tells the person: the answer
says "adopted" only in the API response, and the copy's file is bound as if the backend were its own.

Measured: the adopt itself wrote only `ensureCollection` (both tables existed, left as they were) and Studio's
`pushDeclaredRules` (`setChecks` with the copy's declared rules, identical to the original's because the file was copied
minutes before), so nothing changed on Greenhouse's backend this time. The session's own drive memory had said "delete
`metadata.cloudservices` in the copy, or it adopts Richard's live backend"; that is not enough — the id adopts it too.

Not decided here: whether a copy is the same app (the id says so) or a new one. Two ways out, each the owner's call: the
project id is re-minted when a folder's path differs from the one the id was minted at (P112-S11-IDREPLACE is the
opposite risk: an id replaced on open), or *Start a backend* refuses to adopt a backend whose recorded project folder is
another folder that still exists, and says so.
