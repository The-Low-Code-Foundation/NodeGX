---
id: P112-OWN024-DEPLOYNOSHARP
title: The self-host backend image ships cli.js alone, so a deployed marketplace's photos would draw broken too
status: fixed
commit: (this session, the Beta sweep s4)
severity: medium
area: deploy / `packages/nodegx-backend/deploy/Dockerfile.backend`, `scripts/package-deploy.js` (copies `dist/cli.js` only)
found: P112 OWN-024 s1, 2026-10-20, tracing every caller of the backend build while fixing P112-OWN021-NOSHARP
regression: packages/nodegx-backend/tests/p112-own024-deploy-sharp.test.ts
evidence: Dockerfile.backend (`FROM node:22.23-alpine`, `COPY artifact/backend/cli.js /app/cli.js`, no `npm install`); package-deploy.js:324
---

The same defect as P112-OWN021-NOSHARP, on the other road out. `package-deploy.js` copies `dist/cli.js` into the
artifact and nothing else; `Dockerfile.backend` copies that one file into `node:22.23-alpine` and installs nothing. So
a backend deployed this way answers every `?thumb=` with BAK-006's 501, and the marketplace template (which asks for
`?thumb=sm|md|lg` in 10 components) would draw every photo broken on it.

Not measured by a deploy: read from the two files. Not fixed with NOSHARP because the editor's fix stages the build
machine's prebuild, and this image is Linux **musl** (Alpine), so it needs `@img/sharp-linuxmusl-<arch>` — an install
inside the image (`npm install --omit=dev sharp@0.33.5` in the Dockerfile, or a staged linuxmusl tree), plus a smoke
like `thumb-smoke.js` against the built image.

Not urgent while putting an app on the internet isn't covered (TWO-011); it belongs to that story's ACs.

**Read 2026-10-25 (the Beta sweep): the VM road has the same gap, and it is the Beta's road.** `deploy_to_vm` ships
the full-stack folder `noodl-preview/src/fullStack.ts` writes: `backend/cli.js` (+ LICENSE), `start.js`, `app/`, a
`package.json` with no dependencies. `deploy/vm/provision-app.sh` runs `node /opt/<app>/start.js` and installs
nothing. So on a VM every `?thumb=` answers 501, as in the Docker image. Not driven on a VM. Needs a ruling before
building: (a) the provision script installs `sharp@0.33.5` into `/opt/<app>/backend/` on the box at each ship (needs
npm and network there; one pinned line), or (b) the folder carries Linux prebuilds for x64 and arm64 (no network on
the box; 16.5 MB per architecture unpacked, 33 MB for both, in every folder for every app, thumbnails or not; measured
with `npm view @img/sharp-libvips-linux-x64@1.0.4 dist.unpackedSize` and the three like it). The Docker image is the same
choice with musl.

**Ruled (Richard, 2026-10-25): the server fetches it once.** Asked in plain words: the first ship to a server
downloads sharp from npm (16 MB, about 10 seconds) into one shared place every app there uses, later ships keep it,
and a server with no npm or no internet still ships and says small photos stay broken; the Docker image installs it
at build time. Against: every folder carries both Linux prebuilds (33 MB more per ship).

**Fixed (2026-10-25, the Beta sweep s4), not released.**
- `deploy/vm/provision-app.sh`: after the folder is copied, sharp `0.33.5` (the lockfile's) is fetched with npm into
  `/opt/nodegx-native/sharp-0.33.5/` unless one there already loads; fetched into a temp folder and moved in only
  once it loads, npm's cache removed. The unit gets `Environment=NODE_PATH=<that>/node_modules`. A fetch that fails
  (no npm, offline, does not load) leaves nothing behind and prints `photos: NOT AVAILABLE: … <npm's reason>. The
  app runs; …`; the ship carries on. Every line goes back in `deploy_to_vm`'s `provision`.
- `deploy/Dockerfile.backend`: `npm install --prefix /app … sharp@0.33.5` (musl, the image's own platform).
- `docs/runtime/BACKEND-FILES.md`: where each road gets sharp.

**Graded.** `tests/p112-own024-deploy-sharp.test.ts` 7/7: the pins equal the lockfile's version on both roads; the
unit's NODE_PATH is where the fetch puts it, after the copy; the script's own sharp block, run under its
`set -euo pipefail` with a stand-in npm: fetched once then "already", offline (npm's reason, not its log path), a
silent npm failure, no npm, and a fetch that does not load (not kept). Five mutants, all red (no `|| true`, no
NODE_PATH, a failed fetch kept, no load check, the log line quoted). Neighbours: `deploy-assets` +
`dep-002-full-stack-folder` 38/38, `noodl-mcp` `dep002DeployToVm` 20/20, backend tsc clean.

**Driven** in the DEP-002 throwaway VM (`nodegx-shiptest-vm`: Ubuntu 24.04, systemd, Node 22.13.1 + npm 10.9.2,
arm64), a full-stack folder of this source's backend, `provision-app.sh` as root, a probe that signs up, uploads a
PNG of a fresh size each time (thumbnails are cached by content hash, so a repeated image proves nothing) and asks
`?thumb=md`: HEAD's script 501 `Cannot find module 'sharp'`, even with sharp already on the server; the new one 200,
a 256 px PNG, ship 6.5 s with the fetch, 1.8 s for a reship and 1.6 s for a second app (no fetch); offline (network
cut) and no npm both exit 0 with the line and answer 501; back online the next ship fetched it. A second app left
untouched across those ships, restarted, 200. The image built (29 s, 187 MB, `@img/sharp-linuxmusl-arm64`): 200 at
256 px; with `/app/node_modules` hidden, 501. Not driven: x64, a real provider, the MCP tool end to end (it pipes
this same file over ssh; its fake suite is green).

