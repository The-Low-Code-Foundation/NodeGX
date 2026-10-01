---
id: P104-DEVOPEN
title: The backend manager tells a person to set "devOpen": false in security.json, and no page offers the switch
status: open
severity: medium
area: backend / manager (security, API keys, permissions)
found: P104 s18 (measured before Richard's BMG-013 drive), 2026-09-26; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-104-the-backend-manager/NEXT-SESSION-PROMPT.md "Do this, in order", s18 paragraph
---

On a local backend the manager shows *"dev-open is enabled in security.json … Set "devOpen": false to test real
enforcement."* The API keys page says the key's boxes *"take effect when dev-open is switched off"*, and
Permissions says its rules apply *"once it is off"*. No page has that switch. To test their own permissions or
keys, a person has to find and hand-edit a JSON file. That breaks the phase's own sentence: *"Nothing asks for
JSON"*.

**Where:** `packages/nodegx-backend/src/admin/app/App.tsx:315-322` (`DevOpenNotice`),
`views/keys.tsx:100-103`, `views/permissions.tsx:140` and `:452`. A grep finds no control that writes `devOpen`
anywhere in `src/admin/app`.

**Proposed:** a *Enforce my rules on this machine* switch on Permissions (or Server), backed by an admin route
that writes `devOpen` and reloads `SecurityState` the way BMG-016's restore reload does. Then the three
sentences point at it. A loopback-only backend may keep dev-open as the default. Small to medium (one route,
its tally/audit lines, one control).
