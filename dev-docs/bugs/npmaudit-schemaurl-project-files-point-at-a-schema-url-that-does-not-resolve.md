---
id: NPMAUDIT-SCHEMAURL
title: Project files point at a schema url that does not resolve
status: open
severity: low
area: project-contract / $schema
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: project-contract
---

Project files carry `$schema: https://opennoodl.dev/schemas/project-v2.json`; curl returns 000 (no host). Editors that follow `$schema` get nothing. Fix: serve the schemas at a live URL (nodegx.io) or drop the field.
