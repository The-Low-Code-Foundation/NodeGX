---
id: P112-S14-ENVSERVED
title: "The npm preview served every file in the project folder — `.env`, `.mcp.json`, `CLAUDE.md`, the project source — to anyone who asked, and with --host to the whole network"
status: fixed
severity: high
area: preview / static files (`packages/noodl-preview/src/server.ts`, the project-asset fallback)
found: P112 OWN-015 s14, 2026-10-12
commit: (this session's commit)
regression: packages/noodl-preview/tests/own015-env-not-served.test.ts
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §8
---

Before PERSONKEY's fix asked people to paste their API key into the project's `.env`, the preview was probed with a
canary `.env`: `GET /.env`, `/%2Eenv`, `/./.env` and `/assets/../.env` all answered **200 with the key**. The asset
fallback served any file under the project folder; the only guard was "inside the folder". A deploy already
excludes these files (`ignore.ts`: credential files, agent files, the v2 project source). The preview ignored those rules.

**Fix:** the fallback serves a file only if the deploy's own matcher (`buildIgnoreMatcher`: the defaults plus the
project's `.noodlignore`) would publish it, so the preview and the deploy now publish the same files. The new spec
gets 404 and no canary on 10 paths, `.env` included, and the control (an ordinary asset in the same folder) still
gets 200. The full preview suite is otherwise unchanged (the one red is P112-S14-KITROOTDEPLOY, P107's).
