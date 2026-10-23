---
id: P26-VMOPEN
title: An app shipped to a VM by OWN-016's scripts ran public with every access rule off (lingo.nodegx.io is, now)
status: open
severity: high
area: deploy / OWN-016 provision-app.sh (VM layout), nodegx-backend deploy/folder/start.js
found: P26 lane 5 session 3 (the VM push), 2026-10-23
evidence: dev-docs/tasks/phase-26-deployment/DEP-002-LOCAL-FULLSTACK-BUNDLE.md "Session 3"
regression: packages/nodegx-backend/tests/dep-002-full-stack-folder.test.ts
---

What a person sees: nothing, which is the problem. Their app works. Anyone on the internet who calls its
backend directly can list every record and every account (with email addresses), and create, change and
delete records, without signing in.

Where: the VM layout in `dev-docs/tasks/phase-112-your-own-nodegx/own-016/provision-app.sh` (before this
session) ran `cli.js serve … --host 127.0.0.1` with no `--enforce-rules`. The first start minted
`security.json` with `"devOpen": true` (the local-development default). The backend's deploy interlock
(BAK-003) refuses dev-open only on a NON-loopback bind, and this one binds 127.0.0.1 with Caddy in front,
so the interlock never fired and Caddy proxied `/classes`, `/users`, … to a backend with no rules.

Reproduce (measured 2026-10-23, throwaway VM container): provision with the committed old script, sign up
one account through Caddy, then as a visitor `GET https://<domain>/classes/_User` → 200 with the account's
email. Live: `GET https://lingo.nodegx.io/health` reports `"security":{"devOpen":true,"enforced":false}`;
`/classes/_User` 200 with 0 rows (no accounts there today), `/classes/Task` 200. Contents were not read.

Reach: every app shipped with OWN-016's scripts. Known: lingo.nodegx.io. The Docker stack is not affected
(it binds 0.0.0.0, so the interlock fires, and its entrypoint writes `devOpen: false` on first run).

Fix (this session): `start.js` refuses a data folder with `"devOpen": true`, in a sentence that says how
to switch the rules on, and the new `provision-app.sh` refuses before it writes anything, with the one
command to run. A new layout's first start mints `devOpen: false` (`--enforce-rules`).

**Still open: the live box.** Shipping lingo again is refused until its rules are on. lingo runs on nexus-1
(OWN-016 §8). From the Mac (the `sed -i` here is GNU sed on the box; run on macOS directly it fails with
"extra characters at the end of l command", measured 2026-10-23):

    ssh root@49.12.102.195 "sed -i 's/\"devOpen\": *true/\"devOpen\": false/' /var/lib/lingo/data/security.json && systemctl restart lingo-backend && grep devOpen /var/lib/lingo/data/security.json"

(SSH that changes a server is refused to an agent by the auto-mode classifier.) Then close this row.
