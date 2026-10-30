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

## 2026-10-27 23:20: the first release carries both, by hand (Richard's yes)

nodegx-studio `v0.1.0` (tag at `fcdd55e`, the commit `@nodegx/studio` 0.1.0 was packed from) is published and
*latest*: CI run 40591777931 green on all three systems (the DMG notarised), then
`nodegx-0.2.9-darwin-{arm64,x64}.mcpb` built here with `--mcp-tarball` on the PUBLISHED 0.2.9 tarball (sha1
`5549d6f7…`; Studio's own pin, 0.2.8, lacks HELPERNODE) and attached with `gh release upload`. All five
`releases/latest/download/…` links /start and /studio name answer 200; the arm64 file downloaded back has the built
sha1 `bcd7997e83deecfe57f1fd437d27d246296a383d` (x64 `8680d91a131c1372b218fb93e47fb276b5b62673`). Both bundles driven
with `s3/drive-mcpb.mjs`: arm64 under `as-desktop.cjs` (initialize `nodegx` 0.2.9, 123 tools, `open_studio` 200,
`render_report` DONE, `provision_backend` ok); x64 on its own bundled node under `arch -x86_64` (the same, except
`render_report`: "Chrome never opened a debugging port", and Chrome started `arch -x86_64` alone opens no port in 25 s
here either, so that is this Mac's Rosetta, not the bundle; a real Intel Mac is still unmeasured).
**Still open:** items 1 and 2 above. CI does not attach the `.mcpb`, and the next release built on another
`@nodegx/mcp` changes the names /start links to.

## 2026-10-30: items 1 and 2 built (nodegx-studio be3a9c5, not pushed)

- `scripts/mcpb.mjs` writes the bundle twice: `nodegx-<mcp version>-darwin-<arch>.mcpb` and the same file as
  `nodegx-darwin-<arch>.mcpb`. Packed here on the published 0.2.9 tarball: both files 62,192,234 bytes, the same sha1.
- `.github/workflows/package.yml`: the macOS leg builds both bundles (`npm run mcpb`, `npm run mcpb -- --node
  darwin-x64`) and uploads them with the installers; the release job requires `nodegx-darwin-arm64.mcpb` and
  `nodegx-darwin-x64.mcpb` and attaches them, plus the versioned ones.
- `scripts/mcpb.mjs` refuses a server older than 0.2.9 (P128-S3-HELPERNODE: its children never start in Desktop). Studio
  pins `@nodegx/mcp` 0.2.8, so **the next tag's macOS leg fails** until the pin moves: on purpose, a bundle on 0.2.8
  would install and do nothing.

Still open: the workflow has not run (it runs on a pushed tag); v0.1.0 carries only the versioned names, so /start keeps
its 0.2.9 links until a release (or a `gh release upload` of the two copies, Richard's yes) carries the version-free
ones; then /start's two hrefs drop the version. Item 3 (the Intel bundle on a real Intel Mac) is unchanged.

## 2026-10-30: v0.1.0 carries the version-free names (Richard's yes)

`gh release upload v0.1.0` of the two published bundles, unchanged, as `nodegx-darwin-arm64.mcpb` and
`nodegx-darwin-x64.mcpb`. From outside: `releases/latest/download/nodegx-darwin-{arm64,x64}.mcpb` answer 200 and
download as sha1 `bcd7997e…` and `8680d91a…`, the same bytes as the versioned files. Left: /start's two hrefs
(nodegx-web `site/start/`, drop `0.2.9-`) — not edited here, the folder holds another session's uncommitted changes;
Studio's `@nodegx/mcp` pin (0.2.8), which the CI leg now refuses; item 3, a real Intel Mac.
