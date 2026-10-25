---
id: P112-OWN024-DEPLOYNOSHARP
title: The self-host backend image ships cli.js alone, so a deployed marketplace's photos would draw broken too
status: open
severity: medium
area: deploy / `packages/nodegx-backend/deploy/Dockerfile.backend`, `scripts/package-deploy.js` (copies `dist/cli.js` only)
found: P112 OWN-024 s1, 2026-10-20, tracing every caller of the backend build while fixing P112-OWN021-NOSHARP
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
