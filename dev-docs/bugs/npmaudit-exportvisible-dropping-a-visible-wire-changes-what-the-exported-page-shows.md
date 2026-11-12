---
id: NPMAUDIT-EXPORTVISIBLE
title: Dropping a visible wire changes what the exported page shows
status: open
severity: medium
area: export / visible
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

In the same export, the dropped `visible` wire makes 'You have clicked at least once.' show from the start: behaviour changed, while `EXPORT-REPORT.md` says 'Nothing here was translated wrongly — it was left out'. Fix: a refused `visible` binding should export hidden (or the report should say the default differs).
