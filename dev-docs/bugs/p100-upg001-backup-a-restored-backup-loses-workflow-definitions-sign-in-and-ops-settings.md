---
id: P100-UPG001-BACKUP
title: A restored backup loses the workflow definitions, sign-in, search, files and ops settings, and the run history
status: open
severity: blocker
area: backend / backups
found: P100 UPG-001 s3 (§3.6c), 2026-09-23; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6c
---

Someone backs up their backend, something goes wrong, and they restore. Their records and cloud functions
come back. Their workflow definitions do not, so a trigger survives but its webhook now answers 404 *"Trigger
target workflow not found"*. Their sign-in setup (GitHub provider, magic link, redirect allow-list), search,
file settings, ops settings (CORS, audit retention, idempotency TTL back to 24h) and the whole run history
are gone too. Nothing says so when they back up or when they restore.

**Where:** `packages/nodegx-backend/src/backup/BackupManager.ts:92`. `CONFIG_FILES` lists five files
(`security.json`, `triggers.json`, `email.json`, `config-params.json`, `backups.json`). The archive walks
`workflows/` (`:473-477`) but not `workflow-defs/`. `auth.json`, `search.json`, `files.json`, `ops.json` and
`executions.sqlite` are never archived. BMG-016 made a restore re-read the files it unpacks. It did not add
any file to the archive, and at HEAD the list is unchanged.

**How it was found:** P100 drove a 0.2.4 backend with live data: seeded it, backed it up, restored it, and
diffed the data directory before and after (`tar tzvf` of the archive). The same on HEAD. It is older than
0.3.0, so it is not an upgrade break.

**Proposed:** archive `workflow-defs/` and the five missing settings files, and restore them through the
same `reloadRestoredSettings()` path BMG-016 added. Say on the Backups page whether run history is kept.
Spec: back up, change each file, restore, and assert each one is back as it was. About half a session.
