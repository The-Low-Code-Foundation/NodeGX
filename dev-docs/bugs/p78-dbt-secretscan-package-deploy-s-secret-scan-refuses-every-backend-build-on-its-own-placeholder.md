---
id: P78-DBT-SECRETSCAN
title: package-deploy's secret scan refuses every backend build because of the backend's own error-message placeholder
status: fixed
commit: ac78efb4b
phase: P109
task: ISL-042
severity: high
area: backend / package-deploy secret scan
found: P78 Digital Bricks Training template, TASK-L183, 2026-09-30
regression: packages/nodegx-backend/tests/isl042-secretscan.test.ts
evidence: commit 3516d5847 body ("Found: package-deploy's secret scan refuses every build of the current backend…"); templates/digital-bricks-training/docs/START-HERE.md (production setup)
---

Building the backend's deploy artifact (`packages/nodegx-backend/scripts/package-deploy.js`) fails its own secret
scan every time, so no self-host image can be packaged. The "secret" it finds is the example connection string in
one of the backend's own error messages.

**Where:** the scan pattern `connection string with password` at `packages/nodegx-backend/scripts/package-deploy.js:79`
(`/\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/"']+:[^\s:@/"']{6,}@/`) matches the text
`postgres://user:password@host:5432/database` in `packages/noodl-runtime/src/api/adapters/postgres/storageUrl.ts:64`.
That text has been bundled since BRG-005 (`4226a6c68`, 2026-09-19). Re-read at HEAD on 2026-10-01: neither file has
changed since, and no phase doc records the problem.

**Reproduce:** run `package-deploy.js` on the current backend. It exits with a finding for the bundled backend file.
Read from the DBT commit and confirmed by reading the regex against the string. The packaging was not re-run here.

**Proposed:** write the example so it does not match. Checked against the regex: `postgres://<user>:<password>@…`
still matches, and `postgres://USER:PASS@host:5432/database` does not, because the password is under 6 characters.
Add a spec saying the packaged backend scans clean, so the next example sentence cannot do this again. Small.

**Fixed, P109 s42 (2026-10-11).** Re-measured first: today's `dist/cli.js` gave one finding, "connection string with
password" at the `storageUrl.ts` example, and it was the only match in the bundle. The example now reads
`postgres://USER:PASS@host:5432/database`. `tests/isl042-secretscan.test.ts` bundles the service with `scripts/build.js`'s
own config (now exported; the script builds only when run directly) into a temp directory, so the shared `dist/` is not
touched, and runs the packager's own `scanForSecrets` over it. Red on the old text, green now, with a planted
connection string beside the bundle as the known-firing arm.
