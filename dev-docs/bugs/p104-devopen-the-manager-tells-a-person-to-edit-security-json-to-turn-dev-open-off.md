---
id: P104-DEVOPEN
title: The backend manager tells a person to set "devOpen": false in security.json, and no page offers the switch
status: fixed
commit: PENDING
phase: P109
task: ISL-040
severity: medium
area: backend / manager (security, API keys, permissions)
found: P104 s18 (measured before Richard's BMG-013 drive), 2026-09-26; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-104-the-backend-manager/NEXT-SESSION-PROMPT.md "Do this, in order", s18 paragraph
regression: packages/nodegx-backend/tests/admin-app/permissions-view.test.tsx "ISL-040 DEVOPEN"
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

**Built, P109 s42 (2026-10-11).** Re-measured at `84396782b`: no control in `src/admin/app` wrote `devOpen`, and the
three sentences still sent a person to `security.json`. **The proposal's server half was already there:**
`PUT /admin/permissions` takes `devOpen` in the whole config, refuses it on a public bind ("devOpen cannot be enabled
while the service is bound beyond localhost"), audits it, and `devOpenActive` reads the live config on the next
request. No reload route was needed. `GET /admin/permissions` already said `loopback`.
- The Permissions page draws **Enforce my rules on this machine** under its notice on a backend bound to this
  machine, and nowhere else. It writes through the page's If-Match'd whole-config save and reloads. It waits while
  the rules have unsaved changes, because the save moves the etag and a new etag reloads the draft.
- The three sentences (`App.tsx` `DevOpenNotice`, `views/keys.tsx`, `views/permissions.tsx` `EnforcementNotice`)
  point at the switch, not the file.
- Spec: red 3 of 4 on the old page; the fourth (no switch on a public bind) is the absence arm beside them.
