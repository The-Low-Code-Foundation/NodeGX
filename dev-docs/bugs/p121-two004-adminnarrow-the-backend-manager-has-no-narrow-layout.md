---
id: P121-TWO004-ADMINNARROW
title: The backend's admin app has no narrow layout — below 768 px every page runs off the right
status: open
severity: low
area: backend / admin app (`packages/nodegx-backend/src/admin/ui/styles.css`: no `@media` rule)
found: P121 TWO-004 s11, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-004-PAYSTACK.md §10
---

The admin app (`/_admin`) keeps its 208 px sidebar at every width and has no `@media` rule anywhere. Measured on
the Triggers page with the new trigger drawer open (`two-004-admin-hook-drive.test.ts`, 2026-10-15):

| width | runs off the right |
|---|---|
| 390 px | 308 px |
| 600 px | 98 px |
| 768 px | 0 |
| 900 px | 0 |

At 390 px a phone pans sideways: the drawer's left edge and its right column are cut off (screenshot
`shots/two004-hook-narrow-390-drawer.png`). A headless click on a radio there also missed, because the page had
panned.

Nobody has said the admin app must work on a phone. A builder sets up a backend on a computer, and the editor opens
the admin app in its own window. But a builder checking a refused payment from their phone would meet this. Ruling
wanted on whether the admin app owes a phone layout (P104's lane).
