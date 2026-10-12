---
id: P109-S36-STALEMCPDIST
title: Projects the dev editor opens point their agent at a door built before the fixes it was meant to carry
status: open
severity: high
area: mcp / build (packages/noodl-mcp/dist/noodl-mcp.cjs)
found: P109 ISL-018 AC5 s36, 2026-10-09
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-018-WHAT-THE-DOOR-WRITES-IS-WHAT-THE-EDITOR-SAVES.md §8 s36
---

Opening a project in the dev editor writes `.mcp.json` with `node <checkout>/packages/noodl-mcp/dist/noodl-mcp.cjs`.
That file was built on 2026-10-02 22:19. ISL-018's pin landed on 2026-10-05, so the door every such agent runs
does not have it: `pinAuthoredRunOnChange` appears 0 times in it and 3 times in a bundle built from today's
`src`. Every door fix since 2026-10-02 is missing in the same way. Eleven `noodl-mcp.cjs` servers were running from
that file when it was measured.

Nothing rebuilds it. `dist/kit-extract.cjs` rebuilds itself when one of its inputs is newer
(`build-kit-extract.mjs`, ISL-014), but the server bundle has no such check. Each session that fixes the door
grades it in-process (ts-jest on `src`), so its spec is green while the people's door stays old.

Fix, short term: `npm run build` in `packages/noodl-mcp` from a clean tree. Proposed lasting fix (about the
size of ISL-014's): the server compares its own build time with its `src` inputs at start-up, and says so in
`get_project_info` when it is older, as the kit reader does.

**Rebuilt 2026-10-09 19:35 (s36), the short-term fix; the lasting one is still open.** `dist/noodl-mcp.cjs` was built at `08d62276b`
from a clean worktree. A worktree's `dist/noodl-mcp.cjs`, `cloud-bundle.cjs`, `node-catalog.json` and `nodegx-observe.cjs` are
symlinks into the primary's `dist/`, so `npm run build` there writes the primary's files. 🔴 That also rebuilt `cloud-bundle.cjs`
from the worktree's `src/cloud/bundleEntry.js`, which lacks the primary's uncommitted P78 D84 lines (logs to stderr, so the
bundler's stdout stays one JSON document). It was rebuilt again from the primary's sources at once. Smoke test: on a format-4
copy whose load logs `[NDA-017] migrated …`, the line went to stderr and stdout parsed as JSON. Running servers keep the old
bundle until their sessions restart.
