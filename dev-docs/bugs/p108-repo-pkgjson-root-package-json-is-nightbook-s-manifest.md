---
id: P108-REPO-PKGJSON
title: The checkout's root package.json is Nightbook's app manifest — every `npm run` script of the repo is gone
status: fixed
commit: none — the working-tree file restored to HEAD's (nothing to commit)
severity: high
area: repo / root package.json (working tree, not committed)
found: P108 IW-007 s6, 2026-10-01 (`npm run template:garden` had no script)
evidence: `git diff package.json` in the primary checkout — 172 lines removed, `"name": "nightbook"` added; mtime 2026-09-28 19:14
---

In the primary checkout (`cline-dev`) the root `package.json` is not the repo's: it holds `"name": "nightbook"`,
`"productName": "Nightbook"`, version 0.0.4 — the TPL-011 tablet app's manifest — and none of the repo's scripts or
workspaces. It has been like that, uncommitted, since 2026-09-28 19:14 (likely a packaging step that wrote the app's
package.json at the repo root). Anything that runs `npm run <script>` in this checkout fails: `template:garden`, so
`dev-docs/tasks/phase-108-the-island-works/drives/drive-all.sh`, and every other `npm run` a session relies on.
Worktrees made from a commit are not affected.

Not restored by P108 s6 (not its file; a peer may know why). The fix: `git show HEAD:package.json > package.json`
after checking nobody needs the Nightbook content there, and find the step that wrote it. Workaround used:
`TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS"}' npx ts-node -T -P ./scripts/tsconfig.json ./scripts/generate-garden-template.ts`.

**Fixed 2026-10-01 (P108 s7, Richard's ruling "Restore it"):** the Nightbook content copied to the session's scratchpad
first (`package.json.nightbook-<epoch>`), then `git show HEAD:package.json > package.json`; `npm run` lists the repo's
scripts again and `npm run template:garden` exits 0. The step that wrote it is still unknown — if it happens again,
look for a Nightbook packaging script that writes its app manifest at the repo root.
