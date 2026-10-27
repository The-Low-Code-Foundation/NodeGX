---
id: P128-S3B-MCPBNORELEASE
title: "No release carries the `.mcpb`, and its file name carries the `@nodegx/mcp` version: /start's two download links (`releases/latest/download/nodegx-0.2.9-darwin-{arm64,x64}.mcpb`) 404 until a person uploads both files to nodegx-studio's latest published release by hand, and stop working at the next Studio release that does not re-attach them under the same names"
status: open
severity: medium
area: "nodegx-studio `.github/workflows/package.yml` (the draft release step) and `scripts/mcpb.mjs` (the output name); nodegx-web `site/start/_page.html` path 1, step 2"
found: P128 Beta round, Track C (S3b step 7), 2026-10-27
evidence: "MEASURED: `curl -s https://api.github.com/repos/The-Low-Code-Foundation/nodegx-studio/releases` → `[]`; `curl -sL -o /dev/null -w %{http_code} …/releases/latest/download/nodegx-0.2.9-darwin-arm64.mcpb` → 404. `package.yml` step \"a draft release with the four installers\" uploads exactly `NodeGX-Studio-mac-arm64.dmg`, `…-mac-arm64.zip`, `…-win-x64.exe`, `…-linux-x86_64.AppImage`; `grep -n mcpb .github/workflows/*` finds nothing. `scripts/mcpb.mjs:124` writes `dist/nodegx-${mcpVersion}-${nodeTarget}.mcpb`, `mcpVersion` = the pinned `@nodegx/mcp` (0.2.8 in package.json today; the registry's latest is 0.2.9). The darwin-x64 bundle has been built in code but never run (S3b step 6)."
launch: beta
owner: none
task: CCN-006 AC6
---

The download a stranger finds (S3b step 7) now exists on /start (nodegx-web `d632286`, not deployed), and it links
the names the build writes. Three things stand between it and a working click:

1. **Nothing puts the `.mcpb` on a release.** The workflow's draft release takes the four Studio installers only.
   Until someone runs `npm run mcpb` (and `-- --node darwin-x64`) on a Mac and uploads both files to the release
   that GitHub calls *latest*, both links 404.
2. **The name moves with `@nodegx/mcp`.** A `latest/download/<name>` link is stable only if the name is. The day
   Studio pins 0.3.0, the bundle is `nodegx-0.3.0-…` and the 0.2.9 links 404 on the next release, unless the page
   is edited in the same hour (the editor's download block on /start has the same rule, with explicit tags).
3. **The Intel bundle has not been driven** (S3b step 6), so the second link offers a file nobody has opened.

**Proposed.** In `package.yml`, build both `.mcpb` on the macOS runner and attach them to the draft release, and
attach a copy under a version-free name too (`nodegx-darwin-arm64.mcpb`, `nodegx-darwin-x64.mcpb`) so /start can
link `latest/download/nodegx-darwin-arm64.mcpb` and never change. Then /start's two hrefs drop the version (one
line each). Drive the x64 bundle under Rosetta before the release is published. Richard rules whether the
download is hosted on GitHub (he leaned that way on 2026-10-27) before any of this.
