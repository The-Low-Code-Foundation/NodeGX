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
