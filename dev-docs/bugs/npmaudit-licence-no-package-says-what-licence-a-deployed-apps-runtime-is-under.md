---
id: NPMAUDIT-LICENCE
title: No package says what licence a deployed apps runtime is under
status: needs-ruling
severity: medium
area: packaging / licences
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

Tools are GPL-3.0-only, node-spec/canvas-look/core MIT, nodegx.io says 'GPL-3.0'. A static export (`nodegx-deploy`) ships `noodl.deploy.js` out of the GPL `@nodegx/preview` with only a third-party LICENSE.txt beside it; the backend is called MIT in the repo README but ships only inside GPL `@nodegx/mcp`; `@nodegx/export`'s generated app has no stated licence while its README says 'It is yours now'. A commercial user cannot tell whether their app is GPL. Ruling: the runtime's licence, stated in the shipped app.
