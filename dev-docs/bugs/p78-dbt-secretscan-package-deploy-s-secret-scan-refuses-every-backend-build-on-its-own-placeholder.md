---
id: P78-DBT-SECRETSCAN
title: package-deploy's secret scan refuses every backend build because of the backend's own error-message placeholder
status: open
severity: high
area: backend / package-deploy secret scan
found: P78 Digital Bricks Training template, TASK-L183, 2026-09-30
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
