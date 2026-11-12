---
id: NPMAUDIT-EXPORTJARGON
title: Generated user code carries internal task ids
status: open
severity: low
area: export / codegen
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

Code `@nodegx/export@0.2.5` writes into the user's app cites internal ids: '// @nodegx:generated (visual — provenance markers complete in EXP-007)', '(§4c)', '(NDA-017 §2)', and in `src/api/client.ts` 'The §43 drive read the browser's through a Record's Error (D8)'. CLI output says 'deferred to EXP-003'. The npm description reads "EXP-002's pipeline; the IR is the shared contract with EXP-003/005 (dev-docs/tasks/…)". Also: no `.gitignore` generated though the README says 'commit it before you do'; 5 MB of starter assets copied to `public/` whether used or not; no LICENSE file in the export or core tarballs.
