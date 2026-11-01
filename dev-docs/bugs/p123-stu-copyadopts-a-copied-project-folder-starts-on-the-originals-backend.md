---
id: P123-STU-COPYADOPTS
title: A copied project folder with its binding removed still starts on the original's backend: Studio's Start a backend adopts it
status: open
severity: high
area: nodegx-studio / Data → Start a backend (lib/backend.mjs provisionFor) over NodeGX provision (noodl-mcp backend/provision.ts findReusableBackend)
found: STU-092 drive, 2026-10-30 (a copy of Greenhouse, `metadata.cloudservices` deleted, POST /api/backend-provision)
evidence: the answer was {"phase":"adopted","id":"backend_mvv1hrdnfftkg","name":"Greenhouse backend","pid":45379}, the running backend of ~/vscode_projects/NodeGX test projects/Greenhouse, and the copy's nodegx.project.json was bound to it
phase: P123
kit: mcp
regression: packages/noodl-mcp/tests/p123CopyAdopts.test.ts
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

## 2026-11-01 — fixed in NodeGX's provision; Studio receives it on its next vendor

Decided for Richard by the orchestrating overnight session: a folder that is not the folder a backend was made for never
takes that backend while that other folder still exists and still carries the same id. The copy is made its own app.

Built (`packages/noodl-mcp`):

- **The folder is recorded.** A backend's `config.json` recorded no project folder (only the running process's
  `runtime.json → owner.projectDir` named one, while it runs). It now carries `projectDirs: { <projectId>: <absolute
  folder> }`, stamped by `createBackendDir` at creation (`provisionBackend` passes the folder), and moved when a project
  was moved. It is never backfilled onto an older backend: which of two folders with one id is the original cannot be
  read off the folders.
- **`judgeProjectFolder`** (`src/backend/provision.ts`): the recorded folder is `config.json → projectDirs[id]`, else
  the running process's `owner.projectDir`. Same folder → `same-folder`; recorded folder gone, or no longer carrying
  the id → `moved` (adopt, and the record moves); recorded folder exists with the same id → `copy`; nothing recorded →
  `unrecorded` (adopt as before). The runtime record is the weaker witness (a copy that kept its binding could have
  started the process), so it never makes a `copy` of a folder already bound to that backend.
- **`provisionBackend`**, on `copy`: does not reuse or adopt; writes a fresh id into the copy's `nodegx.project.json`
  (`replaceProjectId`, `src/backend/projectIdentity.ts`: only `id` changes, in place, `modified` not bumped), creates
  and starts a new backend owned by that id and recorded against the copy, and answers `reuseVerdict:
  'copy-of-another-folder'`, `projectId` (the new id), `copyOf: { projectDir, backendId, backendName,
  previousProjectId, note }`, the note also in `warnings` (which Studio's `provisionFor` already passes on): *"This
  folder is a copy of <folder>. It got its own backend, so it cannot change that app's data: …"*. If the id cannot be
  written it refuses (`conflict`) and starts nothing. Re-minting happens only here, at provision, only for a copy —
  never on open (P112-S11-IDREPLACE).
- `provision_backend` (MCP tool) reports `copyOf` and the new `projectId` (`projectIdentity: 'reminted-for-copy'`).

Measured: `nice -n 19 npx jest tests/p123CopyAdopts.test.ts --runInBand` in `packages/noodl-mcp` — 8/8 green (6 pure
verdicts on temp folders; 2 against a real `nodegx-backend` in a temp backends root: the copy with its binding removed
gets a new backend and id while the original keeps its id and is still adopted by its own folder; a moved project keeps
its backend and the record follows). Red without the fix: with `provision.ts` at HEAD 8/8 fail (the end-to-end copy
case fails on `backendId` equal to the original's, the reported adoption); with only the copy branch disabled, exactly
the copy case fails (`Expected: not "backend_…"`). Neighbours green, each run alone: `provision` 13/13,
`own026ProvisionEnforces` 2/2, `p127ProvisionTables` 4/4, `sb015ProvisionAppliesPolicy` 3/3, `projectIdentity` 11/11,
`projectOwnsBackend` 12/12.

**Still open (why `status: open`):**

1. **Studio does not have it yet.** `nodegx-studio/lib/backend.mjs` loads `vendor/backend.cjs`, vendored from NodeGX
   `dfdc9e2` (2026-10-27), which has no `judgeProjectFolder`. Once this fix is committed, Studio needs
   `NODEGX_REPO=../OpenNoodl npm run vendor` (it builds from the checkout's HEAD) and its gates. A Studio session run
   with `NODEGX_REPO` set gets it at once.
2. **Backends made before this fix are not protected unless running.** Greenhouse's backend (made before) has no
   recorded folder; a copy of Greenhouse is told apart only while Greenhouse's backend runs with a runtime record
   naming Greenhouse's folder. Stopped, it is `unrecorded` and a copy still adopts it, as before. Recording it needs
   the original folder to say so (a deliberate claim, e.g. a `provision` from the bound original), which is not built.
3. Studio's `attachNewBackend` (a new project from a template) calls `createBackendDir(name, id)` without the folder,
   so that backend is unrecorded; the proposed Studio change passes `dir` as the 4th argument.
4. The editor's own `provisionBackend.ts` (noodl-editor) carries its copy of the reuse rule and is not changed here.

