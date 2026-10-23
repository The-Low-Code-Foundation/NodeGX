---
id: NPMAUDIT-BACKENDMAPCHECK
title: Backend map says anonymous is denied while the backend lets it in
status: open
severity: high
area: backend-map / check
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

`@nodegx/backend-map@0.1.0` `/api/check?table=Task` answers 'Someone not signed in … find allowed:false (rule "authenticated")' while `/api/map` reports `enforced:false, devOpen:true`, and an anonymous `curl POST /classes/Task` created and read a row. The permissions view claims a protection that is not on. Fix: when not enforced, every check must say so first.
