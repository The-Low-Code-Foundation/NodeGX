---
id: P115-HST014-GITIGNOREDPUBLISHED
title: "`nodegx deploy` publishes a hidden file the project's `.gitignore` keeps private: Fixture C's `.accounts.json` (two passwords) landed in the site"
status: open
phase: P115
task: HST-014
severity: medium
area: "deploy default ignore rules (`packages/noodl-editor/src/editor/src/utils/compilation/build/ignore.ts` `DEFAULT_IGNORE_ENTRIES`, shared by the editor's Deploy and `nodegx deploy`); it reads `.noodlignore`, never `.gitignore`"
found: P115 HST-014 s12, 2026-11-06 (the Cloudflare deploy's first dry run of Fixture C)
evidence: "MEASURED: `node packages/nodegx-export/dist/cli.mjs deploy fixtures/c-campus <out> --allow-development-engine` (through `packages/nodegx-backend/cloudflare/deploy.mjs --dry-run`) wrote `<out>/.accounts.json` (236 bytes, the owner's and the second account's passwords) and `MUST.md`; the project's `.gitignore` lists `.accounts.json` as 'kept on this machine only'."
kit: preview
---

The site folder `nodegx deploy` says is ready to upload held `.accounts.json`. The spike's `site.mjs` had removed it
(and `MUST.md`) by hand and searched the site for the passwords. That is why sessions 7–11 never published it, and why
the product command found it on its first run.

Same family as P112-S13-AGENTFILES (`.mcp.json`, `CLAUDE.md`) and P112-OWN036-DEPLOYPREVIEWS (`.previews/`). Each fix
added names to the default list. This one is a hidden file the person had already marked private in `.gitignore`,
which the deploy never reads. A name list cannot know every private file a person keeps. The project's own
`.gitignore` already says which ones they are.

**Contained for the Cloudflare route (HST-014):** `cloudflare/deployCloudflare.ts` leaves every hidden file and folder
out of the site and names them in its output (*"left out (hidden files are never published): .accounts.json"*).
An app never needs a hidden file served.

**Left for the deploy's owner:** either honour the project's `.gitignore` in the default rules, or leave hidden files
out as the Cloudflare route does. Both change what `nodegx deploy` writes for every project, so one ruling covers both
deploy routes.
