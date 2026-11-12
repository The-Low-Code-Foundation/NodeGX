---
id: REL044-UBUNTU2604THUMB
title: On Ubuntu 26.04 the editor's packed backend, run by the app binary, drops the connection on a thumbnail request (`?thumb=md`)
status: open
severity: medium
area: Linux packaging / `packages/noodl-editor/build/check-packaged-backend.js` → `packages/nodegx-backend/scripts/thumb-smoke.js`; the packed backend's sharp under Electron 43.2.0 (`ELECTRON_RUN_AS_NODE`)
found: release 0.4.4, Release run 43185102432, linux-x64 leg, attempts 1 and 2 (2026-11-12)
evidence: "Both attempts: the upload answers 201, then `fetch(<url>?thumb=md)` throws `fetch failed` (thumb-smoke.js:132) — the connection to the same backend is gone. The runner image was ubuntu-26.04 (20261111.196.1); 0.4.3's leg passed the same smoke on ubuntu-24.04 (20261018.339.1) with the same Electron (43.2.0) and sharp (0.33.5). A control: the same smoke on Linux under plain Node 24 (node:24-bookworm-slim, the on-disk backend build of 2026-11-06, sharp 0.33.5) PASSES (200, 256 × 256). Not measured: the app binary on 26.04 outside CI, the backend's own output (the smoke does not print it on a fetch failure), the error's cause code"
---

What it may cost a person: someone running the Linux editor on Ubuntu 26.04 gets no thumbnails from the local backend, and if the
backend process died (the likeliest reading of a dropped connection), everything else it serves stops too. Unconfirmed outside CI.

Release 0.4.4 builds its Linux leg on ubuntu-24.04 (branch `release/0.4.4-linux24`, run 43232215798) to ship as 0.4.0–0.4.3 were.
That hides this in CI; it does not fix it for a 26.04 user, since the binaries are the same prebuilts either way.

Owed:
1. `thumb-smoke.js` prints the backend's output and `err.cause` when a fetch fails, so the next red names itself.
2. A run of the smoke on ubuntu-26.04 with that output (a dispatch with the leg unpinned), then the fix.
3. Unpin `release.yml` once it passes on the current image.
